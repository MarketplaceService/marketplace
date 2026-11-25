import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import { MessageType } from 'src/shared/types/message-type.enum';

export interface SerializedChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  messageType: MessageType;
  content: string;
  createdAt: string;
}

export const conversationRoom = (conversationId: string) =>
  `conversation_${conversationId}`;

export const userRoom = (userId: string) => `user_${userId}`;

@Injectable()
export class ChatRealtimePublisher {
  private server: Server | null = null;
  private readonly onlineSocketsByUser = new Map<string, Set<string>>();

  attachServer(server: Server) {
    this.server = server;
  }

  markUserSocketConnected(userId: string, socketId: string): boolean {
    let sockets = this.onlineSocketsByUser.get(userId);
    const wasOffline = !sockets || sockets.size === 0;
    if (!sockets) {
      sockets = new Set<string>();
      this.onlineSocketsByUser.set(userId, sockets);
    }
    sockets.add(socketId);
    return wasOffline;
  }

  markUserSocketDisconnected(userId: string, socketId: string): boolean {
    const sockets = this.onlineSocketsByUser.get(userId);
    if (!sockets) return false;
    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.onlineSocketsByUser.delete(userId);
      return true;
    }
    return false;
  }

  isUserOnline(userId: string): boolean {
    const sockets = this.onlineSocketsByUser.get(userId);
    return Boolean(sockets && sockets.size > 0);
  }

  emitPresenceChange(
    userId: string,
    isOnline: boolean,
    recipientUserIds: string[],
  ) {
    if (!this.server) return;

    for (const uid of recipientUserIds) {
      if (uid === userId) continue;
      this.server.to(userRoom(uid)).emit('chat:presence', {
        userId,
        isOnline,
      });
    }
  }

  emitNewMessage(
    conversationId: string,
    participantUserIds: string[],
    message: SerializedChatMessage,
    clientTempId?: string,
  ) {
    if (!this.server) return;

    this.server.to(conversationRoom(conversationId)).emit('chat:new_message', {
      conversationId,
      message,
      ...(clientTempId ? { clientTempId } : {}),
    });

    for (const uid of participantUserIds) {
      this.server.to(userRoom(uid)).emit('chat:conversation_updated', {
        conversationId,
        lastMessage: message,
        senderId: message.senderId,
        updatedAt: message.createdAt,
      });
    }
  }

  emitReadReceipt(
    conversationId: string,
    participantUserIds: string[],
    userId: string,
    lastReadAt: string,
  ) {
    if (!this.server) return;

    this.server.to(conversationRoom(conversationId)).emit('chat:read_receipt', {
      conversationId,
      userId,
      lastReadAt,
    });

    for (const uid of participantUserIds) {
      this.server.to(userRoom(uid)).emit('chat:read_receipt', {
        conversationId,
        userId,
        lastReadAt,
      });
    }
  }
}
