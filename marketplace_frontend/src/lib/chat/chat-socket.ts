import { getPublicApiRoot } from "@/lib/api/api-url";
import { io, type Socket } from "socket.io-client";

let chatSocket: Socket | null = null;
let chatSocketUserId: string | null = null;

/**
 * Kết nối trực tiếp tới Socket.IO namespace `/chat` của NestJS kèm `withCredentials: true`
 * để trình duyệt tự đính kèm cookie phiên Better Auth (Next.js `/api/nest` không proxy WebSocket).
 * Khi đổi tài khoản (`userId` thay đổi), tự động ngắt kết nối cũ để handshake lại bằng cookie phiên mới.
 */
export function getChatSocket(userId?: string): Socket {
  if (userId && chatSocket && chatSocketUserId && chatSocketUserId !== userId) {
    chatSocket.removeAllListeners();
    chatSocket.disconnect();
    chatSocket = null;
    chatSocketUserId = null;
  }

  if (!chatSocket) {
    const apiRoot = getPublicApiRoot();
    chatSocket = io(`${apiRoot}/chat`, {
      withCredentials: true,
      autoConnect: false,
      forceNew: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });
  }

  if (userId) {
    chatSocketUserId = userId;
  }

  return chatSocket;
}

export function disconnectChatSocket() {
  if (chatSocket) {
    chatSocket.removeAllListeners();
    chatSocket.disconnect();
    chatSocket = null;
  }
  chatSocketUserId = null;
}
