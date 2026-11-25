import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { PinoLogger } from 'nestjs-pino';
import { Server, Socket } from 'socket.io';
import { SessionAuthService } from 'src/app/auth/session-auth/session-auth.service';
import { parseEnvOrigins } from 'src/shared/utils/parse-env-origins';
import {
  getNotificationUserRoom,
  NOTIFICATION_SOCKET_EVENT_NEW,
  NOTIFICATION_SOCKET_EVENT_UNREAD_COUNT,
  NOTIFICATION_SOCKET_NAMESPACE,
} from './notification.constants';
import { SerializedNotification } from './notification.types';

@Injectable()
@WebSocketGateway({
  namespace: NOTIFICATION_SOCKET_NAMESPACE,
  cors: {
    origin: (
      requestOrigin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const allowList = parseEnvOrigins(
        process.env.CLIENT_URL,
        process.env.CORS_OTHER_URL,
      );
      if (!requestOrigin || allowList.includes(requestOrigin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server?: Server;

  private readonly fallbackLogger = new Logger(NotificationGateway.name);

  constructor(
    private readonly sessionAuthService: SessionAuthService,
    @Optional() private readonly pinoLogger?: PinoLogger,
  ) {
    this.pinoLogger?.setContext(NotificationGateway.name);
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const headers = client.handshake.headers as Record<
        string,
        string | string[] | undefined
      >;
      const user =
        await this.sessionAuthService.resolveAuthenticatedUser(headers);

      if (!user) {
        this.logWarn(
          'Rejected unauthenticated notification socket connection',
          {
            socketId: client.id,
          },
        );
        client.disconnect(true);
        return;
      }

      const room = getNotificationUserRoom(user.id);
      (client.data as { userId?: string }).userId = user.id;
      await client.join(room);

      this.logDebug('Notification socket connected and joined room', {
        socketId: client.id,
        userId: user.id,
        room,
      });
    } catch (error) {
      this.logError('Error authenticating notification socket', error, {
        socketId: client.id,
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = (client.data as { userId?: string } | undefined)?.userId;
    this.logDebug('Notification socket disconnected', {
      socketId: client.id,
      userId,
    });
  }

  emitNewNotification(
    userId: string,
    payload: { notification: SerializedNotification; unreadCount: number },
  ): void {
    if (!this.server) return;
    this.server
      .to(getNotificationUserRoom(userId))
      .emit(NOTIFICATION_SOCKET_EVENT_NEW, payload);
  }

  emitUnreadCount(userId: string, payload: { unreadCount: number }): void {
    if (!this.server) return;
    this.server
      .to(getNotificationUserRoom(userId))
      .emit(NOTIFICATION_SOCKET_EVENT_UNREAD_COUNT, payload);
  }

  private logDebug(message: string, meta?: Record<string, unknown>) {
    if (this.pinoLogger) {
      this.pinoLogger.debug(meta ?? {}, message);
      return;
    }
    this.fallbackLogger.debug(message);
  }

  private logWarn(message: string, meta?: Record<string, unknown>) {
    if (this.pinoLogger) {
      this.pinoLogger.warn(meta ?? {}, message);
      return;
    }
    this.fallbackLogger.warn(message);
  }

  private logError(
    message: string,
    error: unknown,
    meta?: Record<string, unknown>,
  ) {
    if (this.pinoLogger) {
      this.pinoLogger.error({ err: error, ...(meta ?? {}) }, message);
      return;
    }
    this.fallbackLogger.error(
      message,
      error instanceof Error ? error.stack : '',
    );
  }
}
