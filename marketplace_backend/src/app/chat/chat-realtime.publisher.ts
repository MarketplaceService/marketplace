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

  attachServer(server: Server) {
    this.server = server;
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
