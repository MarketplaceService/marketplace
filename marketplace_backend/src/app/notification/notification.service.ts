import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { apiForbidden, apiNotFound } from 'src/shared/helpers/api-i18n';
import { toVnIsoString } from 'src/shared/utils/vn-time';
import { IsNull, Repository } from 'typeorm';
import { GetNotificationsQueryDto } from './dto/query-notifications.dto';
import { Notification } from './entities/notification.entity';
import { NotificationGateway } from './notification.gateway';
import type {
  CreateNotificationInput,
  SerializedNotification,
} from './notification.types';

@Injectable()
export class NotificationService {
  private readonly fallbackLogger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @Optional() private readonly notificationGateway?: NotificationGateway,
    @Optional() private readonly pinoLogger?: PinoLogger,
  ) {
    this.pinoLogger?.setContext(NotificationService.name);
  }

  serializeNotification(notification: Notification): SerializedNotification {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      referenceType: notification.referenceType ?? null,
      referenceId: notification.referenceId ?? null,
      readAt: notification.readAt ? toVnIsoString(notification.readAt) : null,
      createdAt: toVnIsoString(notification.createdAt),
      updatedAt: toVnIsoString(notification.updatedAt),
    };
  }

  /**
   * Tạo bản ghi thông báo và đẩy sự kiện realtime qua Socket.IO.
   * Bọc try/catch + log qua Pino để lỗi thông báo không bao giờ làm rollback transaction chính.
   */
  async createNotification(
    input: CreateNotificationInput,
  ): Promise<SerializedNotification | null> {
    try {
      const entity = this.notificationRepo.create({
        userId: input.userId,
        type: input.type,
        title: input.title.trim().slice(0, 200),
        body: input.body.trim(),
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        readAt: null,
      });

      const saved = await this.notificationRepo.save(entity);
      const serialized = this.serializeNotification(saved);
      const unreadCount = await this.getUnreadCount(input.userId);

      this.notificationGateway?.emitNewNotification(input.userId, {
        notification: serialized,
        unreadCount,
      });

      return serialized;
    } catch (error) {
      this.logError('Failed to create or emit notification', error, {
        userId: input.userId,
        type: input.type,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
      });
      return null;
    }
  }

  /**
   * Helper dùng cho module Chat (#135) phát sinh thông báo tin nhắn mới.
   */
  async notifyNewMessage(input: {
    recipientUserId: string;
    senderName: string;
    messagePreview: string;
    conversationId: string;
  }): Promise<SerializedNotification | null> {
    const cleanPreview = input.messagePreview.trim();
    const shortPreview =
      cleanPreview.length > 120
        ? `${cleanPreview.slice(0, 117)}...`
        : cleanPreview;

    return this.createNotification({
      userId: input.recipientUserId,
      type: 'MESSAGE',
      title: `Tin nhắn mới từ ${input.senderName}`,
      body: shortPreview || 'Bạn có một tin nhắn mới',
      referenceType: 'CONVERSATION',
      referenceId: input.conversationId,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: {
        userId,
        readAt: IsNull(),
      },
    });
  }

  async getMyNotifications(userId: string, query: GetNotificationsQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(query.limit) || 15));
    const skip = (page - 1) * limit;

    const where = query.unreadOnly ? { userId, readAt: IsNull() } : { userId };

    const [[items, total], unreadCount] = await Promise.all([
      this.notificationRepo.findAndCount({
        where,
        order: {
          createdAt: 'DESC',
          id: 'DESC',
        },
        skip,
        take: limit,
      }),
      this.getUnreadCount(userId),
    ]);

    return {
      items: items.map((item) => this.serializeNotification(item)),
      unreadCount,
      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 0,
    };
  }

  async markAllAsRead(userId: string) {
    const now = new Date();
    const result = await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: now })
      .where('user_id = :userId', { userId })
      .andWhere('read_at IS NULL')
      .execute();

    const unreadCount = 0;
    this.notificationGateway?.emitUnreadCount(userId, { unreadCount });

    return {
      updatedCount: result.affected ?? 0,
      unreadCount,
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      apiNotFound('errors.notification.notFound');
    }

    if (notification.userId !== userId) {
      apiForbidden('errors.notification.forbidden');
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notificationRepo.save(notification);
      const unreadCount = await this.getUnreadCount(userId);
      this.notificationGateway?.emitUnreadCount(userId, { unreadCount });

      return {
        notification: this.serializeNotification(notification),
        unreadCount,
      };
    }

    const unreadCount = await this.getUnreadCount(userId);
    return {
      notification: this.serializeNotification(notification),
      unreadCount,
    };
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
