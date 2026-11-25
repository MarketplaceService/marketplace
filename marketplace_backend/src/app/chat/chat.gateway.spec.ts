import { ForbiddenException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { SessionAuthService } from 'src/app/auth/session-auth/session-auth.service';
import { ProviderProfile } from 'src/app/provider/entities/provider-profile.entity';
import { User } from 'src/app/user/entities/user.entity';
import { UserRole } from 'src/shared/types/user-role.enum';
import { Repository } from 'typeorm';
import { ChatGateway } from './chat.gateway';
import { ChatRealtimePublisher } from './chat-realtime.publisher';
import { ChatService } from './chat.service';

const USER_A = '01950000-0000-7000-8000-000000000001';
const USER_B = '01950000-0000-7000-8000-000000000002';
const CONV_ID = '01950000-0000-7000-8000-000000000030';

function buildGateway() {
  const sessionAuthService = {
    resolveAuthenticatedUser: jest.fn(),
  } as unknown as jest.Mocked<SessionAuthService>;

  const createSystemMessageForConversation = jest.fn();
  const getChatPartnerUserIds = jest.fn().mockResolvedValue([USER_B]);
  const chatService = {
    assertMembership: jest.fn(),
    sendTextMessage: jest.fn(),
    markAsRead: jest.fn(),
    getPartnerUserId: jest.fn(),
    getChatPartnerUserIds,
    createSystemMessageForConversation,
  };

  const markUserSocketConnected = jest.fn(() => true);
  const markUserSocketDisconnected = jest.fn(() => true);
  const emitPresenceChange = jest.fn();
  const realtimePublisher = {
    attachServer: jest.fn(),
    markUserSocketConnected,
    markUserSocketDisconnected,
    emitPresenceChange,
  } as unknown as jest.Mocked<ChatRealtimePublisher>;

  const providerProfileRepo = {
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<ProviderProfile>>;

  const logger = {
    setContext: jest.fn(),
    warn: jest.fn(),
  } as unknown as jest.Mocked<PinoLogger>;

  const emitMock = jest.fn();
  const fetchSocketsMock = jest.fn();
  const serverMock = {
    to: jest.fn(() => ({ emit: emitMock })),
    in: jest.fn(() => ({ fetchSockets: fetchSocketsMock })),
  };

  const gateway = new ChatGateway(
    sessionAuthService,
    chatService as unknown as ChatService,
    realtimePublisher,
    providerProfileRepo,
    logger,
  );
  gateway.server = serverMock as never;

  return {
    gateway,
    sessionAuthService,
    chatService,
    createSystemMessageForConversation,
    getChatPartnerUserIds,
    markUserSocketConnected,
    markUserSocketDisconnected,
    emitPresenceChange,
    providerProfileRepo,
    serverMock,
    emitMock,
    fetchSocketsMock,
  };
}

describe('ChatGateway', () => {
  it('disconnects unauthenticated socket connections', async () => {
    const { gateway, sessionAuthService } = buildGateway();
    sessionAuthService.resolveAuthenticatedUser.mockResolvedValue(null);

    const socket = {
      handshake: { headers: {} },
      data: {},
      emit: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn(),
    };

    await gateway.handleConnection(socket as never);

    expect(socket.disconnect).toHaveBeenCalledWith(true);
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('authenticates valid user via session cookie, joins personal room, and emits online presence', async () => {
    const {
      gateway,
      sessionAuthService,
      markUserSocketConnected,
      emitPresenceChange,
    } = buildGateway();
    const user = {
      id: USER_A,
      role: UserRole.CUSTOMER,
      isAnonymous: false,
      name: 'Hoàng Nam',
    } as User;
    sessionAuthService.resolveAuthenticatedUser.mockResolvedValue(user);

    const socket = {
      id: 'sock-a-1',
      handshake: { headers: { cookie: 'better-auth.session_token=abc.sig' } },
      data: {},
      emit: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn(),
    };

    await gateway.handleConnection(socket as never);

    expect(socket.data.user).toBe(user);
    expect(socket.join).toHaveBeenCalledWith(`user_${USER_A}`);
    expect(markUserSocketConnected).toHaveBeenCalledWith(USER_A, 'sock-a-1');
    expect(emitPresenceChange).toHaveBeenCalledWith(USER_A, true, [USER_B]);

    await gateway.handleDisconnect(socket as never);
    expect(emitPresenceChange).toHaveBeenCalledWith(USER_A, false, [USER_B]);
  });

  it('rejects unauthorized room join without joining room', async () => {
    const { gateway, chatService } = buildGateway();
    chatService.assertMembership.mockRejectedValue(
      new ForbiddenException('Không có quyền'),
    );

    const socket = {
      data: { user: { id: USER_A, role: UserRole.CUSTOMER } },
      emit: jest.fn(),
      join: jest.fn(),
      disconnect: jest.fn(),
    };

    const res = await gateway.handleJoinConversation(socket as never, {
      conversationId: CONV_ID,
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(403);
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('handles WebRTC call invite, accept, signal forwarding, and end cleanly', async () => {
    const {
      gateway,
      chatService,
      createSystemMessageForConversation,
      providerProfileRepo,
      emitMock,
      fetchSocketsMock,
    } = buildGateway();

    chatService.getPartnerUserId.mockResolvedValue(USER_B);
    fetchSocketsMock.mockResolvedValue([{ id: 'sock-b' }]);
    providerProfileRepo.findOne.mockResolvedValue(null);

    const callerSocket = {
      data: { user: { id: USER_A, name: 'Nam', image: null } },
      disconnect: jest.fn(),
    };
    const calleeSocket = {
      data: { user: { id: USER_B, name: 'Minh', image: null } },
      disconnect: jest.fn(),
    };

    const inviteRes = await gateway.handleCallInvite(callerSocket as never, {
      conversationId: CONV_ID,
    });
    expect(inviteRes.ok).toBe(true);
    expect(emitMock).toHaveBeenCalledWith(
      'call:incoming',
      expect.objectContaining({ conversationId: CONV_ID }),
    );

    const acceptRes = gateway.handleCallAccept(calleeSocket as never, {
      conversationId: CONV_ID,
    });
    expect(acceptRes.ok).toBe(true);
    expect(emitMock).toHaveBeenCalledWith(
      'call:accepted',
      expect.objectContaining({ conversationId: CONV_ID }),
    );

    const sigRes = gateway.handleCallSignal(callerSocket as never, {
      conversationId: CONV_ID,
      type: 'offer',
      payload: { sdp: 'v=0...' },
    });
    expect(sigRes.ok).toBe(true);
    expect(emitMock).toHaveBeenCalledWith(
      'call:signal',
      expect.objectContaining({ type: 'offer' }),
    );

    const endRes = await gateway.handleCallEnd(callerSocket as never, {
      conversationId: CONV_ID,
    });
    expect(endRes.ok).toBe(true);
    expect(emitMock).toHaveBeenCalledWith(
      'call:ended',
      expect.objectContaining({ conversationId: CONV_ID }),
    );
    expect(createSystemMessageForConversation).toHaveBeenCalledWith(
      CONV_ID,
      USER_A,
      expect.stringContaining('Cuộc gọi thoại đã kết thúc'),
    );
  });
});
