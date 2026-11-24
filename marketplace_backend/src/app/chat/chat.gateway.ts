import { HttpException, Injectable } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import type { Server, Socket } from 'socket.io';
import { SessionAuthService } from 'src/app/auth/session-auth/session-auth.service';
import { ProviderProfile } from 'src/app/provider/entities/provider-profile.entity';
import { User } from 'src/app/user/entities/user.entity';
import { UserRole } from 'src/shared/types/user-role.enum';
import { Repository } from 'typeorm';
import {
  ChatRealtimePublisher,
  conversationRoom,
  userRoom,
} from './chat-realtime.publisher';
import { ChatService } from './chat.service';

const ALLOWED_CHAT_ROLES = new Set<UserRole>([
  UserRole.CUSTOMER,
  UserRole.PROVIDER,
]);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface AuthenticatedSocket extends Socket {
  data: {
    user?: User;
  };
}

interface ActiveVoiceCall {
  conversationId: string;
  callerId: string;
  calleeId: string;
  connectedAt: Date | null;
}

function formatCallDuration(seconds: number): string {
  const safe = Math.max(1, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function toSocketError(error: unknown): { status: number; message: string } {
  if (error instanceof HttpException) {
    const res = error.getResponse();
    const msg =
      typeof res === 'string'
        ? res
        : typeof (res as { message?: unknown })?.message === 'string'
          ? (res as { message: string }).message
          : error.message;
    return { status: error.getStatus(), message: msg };
  }
  return { status: 500, message: 'Không thể xử lý yêu cầu tin nhắn' };
}

@Injectable()
@WebSocketGateway({ namespace: '/chat' })
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly activeCalls = new Map<string, ActiveVoiceCall>();
  private readonly userToCallId = new Map<string, string>();

  constructor(
    private readonly sessionAuthService: SessionAuthService,
    private readonly chatService: ChatService,
    private readonly realtimePublisher: ChatRealtimePublisher,
    @InjectRepository(ProviderProfile)
    private readonly providerProfileRepo: Repository<ProviderProfile>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ChatGateway.name);
  }

  afterInit(server: Server) {
    this.realtimePublisher.attachServer(server);
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const user = await this.sessionAuthService.resolveAuthenticatedUser(
        client.handshake.headers,
      );

      if (!user || user.isAnonymous || !ALLOWED_CHAT_ROLES.has(user.role)) {
        client.emit('chat:error', {
          status: 401,
          message: 'Bạn cần đăng nhập để sử dụng tính năng nhắn tin',
        });
        client.disconnect(true);
        return;
      }

      client.data.user = user;
      await client.join(userRoom(user.id));
    } catch (error: unknown) {
      this.logger.warn({
        msg: 'chat.socket.auth_failed',
        error:
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : 'Unknown error',
      });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data.user;
    if (!user) return;

    // Chỉ kết thúc cuộc gọi nếu user không còn socket nào khác đang mở
    const remainingSockets = await this.server
      ?.in(userRoom(user.id))
      .fetchSockets();
    if (remainingSockets && remainingSockets.length > 0) {
      return;
    }

    const callConversationId = this.userToCallId.get(user.id);
    if (!callConversationId) return;

    const call = this.activeCalls.get(callConversationId);
    if (!call) {
      this.userToCallId.delete(user.id);
      return;
    }

    await this.finishActiveCall(call, user.id, 'disconnected');
  }

  @SubscribeMessage('chat:join')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { conversationId?: string },
  ) {
    const user = client.data.user;
    if (!user) {
      client.disconnect(true);
      return { ok: false, status: 401, message: 'Chưa xác thực' };
    }

    const conversationId = body?.conversationId;
    if (!conversationId || !UUID_REGEX.test(conversationId)) {
      return {
        ok: false,
        status: 400,
        message: 'Mã cuộc trò chuyện không hợp lệ',
      };
    }

    try {
      await this.chatService.assertMembership(user.id, conversationId);
      await client.join(conversationRoom(conversationId));
      return { ok: true, conversationId };
    } catch (error) {
      const err = toSocketError(error);
      client.emit('chat:error', err);
      return { ok: false, ...err };
    }
  }

  @SubscribeMessage('chat:leave')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { conversationId?: string },
  ) {
    const conversationId = body?.conversationId;
    if (conversationId && UUID_REGEX.test(conversationId)) {
      await client.leave(conversationRoom(conversationId));
    }
    return { ok: true };
  }

  @SubscribeMessage('chat:send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    body: {
      conversationId?: string;
      content?: string;
      messageType?: string;
      clientTempId?: string;
    },
  ) {
    const user = client.data.user;
    if (!user) {
      client.disconnect(true);
      return { ok: false, status: 401, message: 'Chưa xác thực' };
    }

    const conversationId = body?.conversationId;
    if (!conversationId || !UUID_REGEX.test(conversationId)) {
      return {
        ok: false,
        status: 400,
        message: 'Mã cuộc trò chuyện không hợp lệ',
      };
    }

    try {
      const message = await this.chatService.sendTextMessage(
        user.id,
        conversationId,
        {
          content: body.content ?? '',
          messageType: body.messageType,
          clientTempId: body.clientTempId,
        },
      );
      return { ok: true, data: message };
    } catch (error) {
      const err = toSocketError(error);
      client.emit('chat:error', err);
      return { ok: false, ...err };
    }
  }

  @SubscribeMessage('chat:mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { conversationId?: string },
  ) {
    const user = client.data.user;
    if (!user) {
      client.disconnect(true);
      return { ok: false, status: 401, message: 'Chưa xác thực' };
    }

    const conversationId = body?.conversationId;
    if (!conversationId || !UUID_REGEX.test(conversationId)) {
      return {
        ok: false,
        status: 400,
        message: 'Mã cuộc trò chuyện không hợp lệ',
      };
    }

    try {
      const result = await this.chatService.markAsRead(user.id, conversationId);
      return { ok: true, data: result };
    } catch (error) {
      const err = toSocketError(error);
      return { ok: false, ...err };
    }
  }

  // =========================================================================
  // WebRTC Voice Call 1-1 Signaling (gọn nhẹ, tận dụng namespace /chat)
  // =========================================================================

  @SubscribeMessage('call:invite')
  async handleCallInvite(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { conversationId?: string },
  ) {
    const user = client.data.user;
    if (!user) {
      client.disconnect(true);
      return { ok: false, code: 'UNAUTHORIZED' };
    }

    const conversationId = body?.conversationId;
    if (!conversationId || !UUID_REGEX.test(conversationId)) {
      return { ok: false, code: 'INVALID_CONVERSATION' };
    }

    try {
      const partnerId = await this.chatService.getPartnerUserId(
        user.id,
        conversationId,
      );
      if (!partnerId) {
        return { ok: false, code: 'PARTNER_NOT_FOUND' };
      }

      if (
        this.userToCallId.has(user.id) ||
        this.userToCallId.has(partnerId) ||
        this.activeCalls.has(conversationId)
      ) {
        return {
          ok: false,
          code: 'BUSY',
          message: 'Đối phương đang có cuộc gọi khác, vui lòng thử lại sau',
        };
      }

      const partnerSockets = await this.server
        .in(userRoom(partnerId))
        .fetchSockets();
      if (partnerSockets.length === 0) {
        return {
          ok: false,
          code: 'OFFLINE',
          message:
            'Đối phương hiện không mở trang tin nhắn nên chưa thể nhận cuộc gọi trực tuyến',
        };
      }

      const providerProfile = await this.providerProfileRepo.findOne({
        where: { userId: user.id },
        select: { displayName: true },
      });

      const call: ActiveVoiceCall = {
        conversationId,
        callerId: user.id,
        calleeId: partnerId,
        connectedAt: null,
      };

      this.activeCalls.set(conversationId, call);
      this.userToCallId.set(user.id, conversationId);
      this.userToCallId.set(partnerId, conversationId);

      this.server.to(userRoom(partnerId)).emit('call:incoming', {
        conversationId,
        caller: {
          id: user.id,
          name: providerProfile?.displayName ?? user.name,
          avatarUrl: user.image,
        },
      });

      return { ok: true, conversationId };
    } catch (error) {
      const err = toSocketError(error);
      return { ok: false, code: 'FORBIDDEN', ...err };
    }
  }

  @SubscribeMessage('call:accept')
  handleCallAccept(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { conversationId?: string },
  ) {
    const user = client.data.user;
    const conversationId = body?.conversationId;
    if (!user || !conversationId) return { ok: false };

    const call = this.activeCalls.get(conversationId);
    if (!call || call.calleeId !== user.id) {
      return { ok: false, message: 'Cuộc gọi đã kết thúc hoặc không tồn tại' };
    }

    call.connectedAt = new Date();
    this.server.to(userRoom(call.callerId)).emit('call:accepted', {
      conversationId,
      calleeId: user.id,
    });

    return { ok: true };
  }

  @SubscribeMessage('call:reject')
  handleCallReject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { conversationId?: string; reason?: string },
  ) {
    const user = client.data.user;
    const conversationId = body?.conversationId;
    if (!user || !conversationId) return { ok: false };

    const call = this.activeCalls.get(conversationId);
    if (!call || (call.calleeId !== user.id && call.callerId !== user.id)) {
      return { ok: false };
    }

    this.clearCallState(call);

    const otherUserId =
      call.callerId === user.id ? call.calleeId : call.callerId;
    this.server.to(userRoom(otherUserId)).emit('call:rejected', {
      conversationId,
      byUserId: user.id,
      reason: body.reason ?? 'declined',
    });

    return { ok: true };
  }

  @SubscribeMessage('call:signal')
  handleCallSignal(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    body: {
      conversationId?: string;
      type?: 'offer' | 'answer' | 'ice';
      payload?: unknown;
    },
  ) {
    const user = client.data.user;
    const conversationId = body?.conversationId;
    if (!user || !conversationId || !body?.type) return { ok: false };

    const call = this.activeCalls.get(conversationId);
    if (!call || (call.callerId !== user.id && call.calleeId !== user.id)) {
      return { ok: false };
    }

    const targetUserId =
      call.callerId === user.id ? call.calleeId : call.callerId;
    this.server.to(userRoom(targetUserId)).emit('call:signal', {
      conversationId,
      fromUserId: user.id,
      type: body.type,
      payload: body.payload,
    });

    return { ok: true };
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { conversationId?: string },
  ) {
    const user = client.data.user;
    const conversationId = body?.conversationId;
    if (!user || !conversationId) return { ok: false };

    const call = this.activeCalls.get(conversationId);
    if (!call || (call.callerId !== user.id && call.calleeId !== user.id)) {
      return { ok: false };
    }

    await this.finishActiveCall(call, user.id, 'ended');
    return { ok: true };
  }

  private clearCallState(call: ActiveVoiceCall) {
    this.activeCalls.delete(call.conversationId);
    this.userToCallId.delete(call.callerId);
    this.userToCallId.delete(call.calleeId);
  }

  private async finishActiveCall(
    call: ActiveVoiceCall,
    endedByUserId: string,
    reason: 'ended' | 'disconnected',
  ) {
    this.clearCallState(call);

    const otherUserId =
      call.callerId === endedByUserId ? call.calleeId : call.callerId;
    this.server.to(userRoom(otherUserId)).emit('call:ended', {
      conversationId: call.conversationId,
      endedByUserId,
      reason,
    });

    if (call.connectedAt) {
      const durationSec = (Date.now() - call.connectedAt.getTime()) / 1000;
      const label = formatCallDuration(durationSec);
      try {
        await this.chatService.createSystemMessageForConversation(
          call.conversationId,
          endedByUserId,
          `Cuộc gọi thoại đã kết thúc (${label})`,
        );
      } catch (error: unknown) {
        this.logger.warn({
          msg: 'chat.call.system_log_failed',
          error:
            error instanceof Error
              ? error.message
              : typeof error === 'string'
                ? error
                : 'Unknown error',
        });
      }
    }
  }
}
