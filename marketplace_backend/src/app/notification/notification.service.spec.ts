import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  const USER_ID = '01950000-0000-7000-8000-000000000001';
  const OTHER_USER_ID = '01950000-0000-7000-8000-000000000002';
  const NOTIF_ID = '01950000-0000-7000-8000-000000000010';
  const BOOKING_ID = '01950000-0000-7000-8000-000000000020';

  let notificationRepo: {
    create: jest.Mock;
    save: jest.Mock;
    count: jest.Mock;
    findAndCount: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let gateway: {
    emitNewNotification: jest.Mock;
    emitUnreadCount: jest.Mock;
  };
  let pinoLogger: {
    setContext: jest.Mock;
    error: jest.Mock;
  };
  let service: NotificationService;

  const baseDate = new Date('2026-11-25T10:00:00Z');

  beforeEach(() => {
    notificationRepo = {
      create: jest.fn((v: object) => ({
        id: NOTIF_ID,
        createdAt: baseDate,
        updatedAt: baseDate,
        ...v,
      })),
      save: jest.fn((v: object) =>
        Promise.resolve({
          id: NOTIF_ID,
          createdAt: baseDate,
          updatedAt: baseDate,
          ...v,
        }),
      ),
      count: jest.fn().mockResolvedValue(2),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    gateway = {
      emitNewNotification: jest.fn(),
      emitUnreadCount: jest.fn(),
    };

    pinoLogger = {
      setContext: jest.fn(),
      error: jest.fn(),
    };

    service = new NotificationService(
      notificationRepo as never,
      gateway as never,
      pinoLogger as never,
    );
  });

  it('tạo thông báo và đẩy sự kiện realtime qua NotificationGateway', async () => {
    const result = await service.createNotification({
      userId: USER_ID,
      type: 'BOOKING',
      title: 'Bạn có đơn đặt lịch mới',
      body: 'Đơn SV-01 đang chờ xác nhận.',
      referenceType: 'BOOKING',
      referenceId: BOOKING_ID,
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: NOTIF_ID,
        userId: USER_ID,
        type: 'BOOKING',
        referenceType: 'BOOKING',
        referenceId: BOOKING_ID,
        readAt: null,
      }),
    );
    expect(notificationRepo.save).toHaveBeenCalledTimes(1);
    expect(gateway.emitNewNotification).toHaveBeenCalledWith(USER_ID, {
      notification: result,
      unreadCount: 2,
    });
  });

  it('bọc try/catch và log qua PinoLogger khi DB hoặc Socket gặp lỗi để không làm rollback transaction chính', async () => {
    notificationRepo.save.mockRejectedValueOnce(
      new Error('DB connection lost'),
    );

    const result = await service.createNotification({
      userId: USER_ID,
      type: 'SYSTEM',
      title: 'KYC Approved',
      body: 'Hồ sơ đã được duyệt',
      referenceType: 'PROVIDER_PROFILE',
      referenceId: BOOKING_ID,
    });

    expect(result).toBeNull();
    expect(pinoLogger.error).toHaveBeenCalledTimes(1);
    expect(gateway.emitNewNotification).not.toHaveBeenCalled();
  });

  it('notifyNewMessage tạo thông báo MESSAGE với referenceType CONVERSATION', async () => {
    const convId = '01950000-0000-7000-8000-000000000099';
    const result = await service.notifyNewMessage({
      recipientUserId: USER_ID,
      senderName: 'Lê Văn Minh',
      messagePreview: 'Anh ơi 10 phút nữa em tới nhà mình nhé!',
      conversationId: convId,
    });

    expect(result).toEqual(
      expect.objectContaining({
        type: 'MESSAGE',
        title: 'Tin nhắn mới từ Lê Văn Minh',
        referenceType: 'CONVERSATION',
        referenceId: convId,
      }),
    );
  });

  it('getMyNotifications trả về danh sách phân trang và unreadCount', async () => {
    const row = {
      id: NOTIF_ID,
      userId: USER_ID,
      type: 'BOOKING',
      title: 'Đơn đã xác nhận',
      body: 'Thợ đã nhận đơn',
      referenceType: 'BOOKING',
      referenceId: BOOKING_ID,
      readAt: null,
      createdAt: baseDate,
      updatedAt: baseDate,
    };
    notificationRepo.findAndCount.mockResolvedValueOnce([[row], 1]);
    notificationRepo.count.mockResolvedValueOnce(1);

    const res = await service.getMyNotifications(USER_ID, {
      page: 1,
      limit: 15,
    });

    expect(res.unreadCount).toBe(1);
    expect(res.total).toBe(1);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].id).toBe(NOTIF_ID);
  });

  it('markAllAsRead cập nhật các thông báo chưa đọc và phát unreadCount = 0', async () => {
    const execute = jest.fn().mockResolvedValue({ affected: 3 });
    const qb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute,
    };
    notificationRepo.createQueryBuilder.mockReturnValue(qb);

    const res = await service.markAllAsRead(USER_ID);

    expect(res).toEqual({ updatedCount: 3, unreadCount: 0 });
    expect(gateway.emitUnreadCount).toHaveBeenCalledWith(USER_ID, {
      unreadCount: 0,
    });
  });

  it('markAsRead từ chối 404 khi không tìm thấy và 403 khi không thuộc sở hữu', async () => {
    notificationRepo.findOne.mockResolvedValueOnce(null);
    await expect(service.markAsRead(USER_ID, NOTIF_ID)).rejects.toThrow(
      NotFoundException,
    );

    notificationRepo.findOne.mockResolvedValueOnce({
      id: NOTIF_ID,
      userId: OTHER_USER_ID,
      readAt: null,
    });
    await expect(service.markAsRead(USER_ID, NOTIF_ID)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('markAsRead có tính chất idempotent khi thông báo đã được đọc trước đó', async () => {
    const alreadyReadDate = new Date('2026-11-25T11:00:00Z');
    notificationRepo.findOne.mockResolvedValueOnce({
      id: NOTIF_ID,
      userId: USER_ID,
      type: 'BOOKING',
      title: 'Test',
      body: 'Body',
      referenceType: 'BOOKING',
      referenceId: BOOKING_ID,
      readAt: alreadyReadDate,
      createdAt: baseDate,
      updatedAt: baseDate,
    });
    notificationRepo.count.mockResolvedValueOnce(0);

    const res = await service.markAsRead(USER_ID, NOTIF_ID);

    expect(notificationRepo.save).not.toHaveBeenCalled();
    expect(res.unreadCount).toBe(0);
    expect(res.notification.readAt).toBeTruthy();
  });
});
