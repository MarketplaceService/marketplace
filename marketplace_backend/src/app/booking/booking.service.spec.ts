import { BadRequestException, ConflictException } from '@nestjs/common';
import { Address } from 'src/app/address/entities/address.entity';
import { ProviderProfile } from 'src/app/provider/entities/provider-profile.entity';
import { ProviderAvailability } from 'src/app/scheduling/entities/provider-availability.entity';
import { ProviderTimeOff } from 'src/app/scheduling/entities/provider-time-off.entity';
import { Service } from 'src/app/service/entities/service.entity';
import { BookingStatus } from 'src/shared/types/booking-status.enum';
import { PriceUnit } from 'src/shared/types/price-unit.enum';
import { ServiceStatus } from 'src/shared/types/service-status.enum';
import { UserRole } from 'src/shared/types/user-role.enum';
import { VerificationStatus } from 'src/shared/types/verification-status.enum';
import {
  addDays,
  dayOfWeekOf,
  todayInVietnam,
  vnDateTime,
} from 'src/shared/utils/vn-time';
import { BookingPaymentPort } from './booking-payment.port';
import { BookingService } from './booking.service';
import { BookingStatusHistory } from './entities/booking-status-history.entity';
import { Booking } from './entities/booking.entity';

describe('BookingService', () => {
  const CUSTOMER_ID = 'customer-user-1';
  const PROVIDER_USER_ID = 'provider-user-1';
  const PROVIDER_ID = 'provider-profile-1';
  const SERVICE_ID = 'service-1';
  const ADDRESS_ID = 'address-1';
  const BOOKING_ID = 'booking-1';

  const tomorrow = addDays(todayInVietnam(), 1);
  const startAt = vnDateTime(tomorrow, '09:00');
  const slotDow = dayOfWeekOf(tomorrow);

  let initPaymentMock: jest.Mock;
  let markCompletedMock: jest.Mock;
  let cancelOrRefundMock: jest.Mock;
  let mockPaymentPort: BookingPaymentPort;
  let bookingRepo: { findOne: jest.Mock; createQueryBuilder?: jest.Mock };
  let profileRepo: { findOne: jest.Mock };
  let serviceRepoInTx: { findOne: jest.Mock };
  let addressRepoInTx: { findOne: jest.Mock };
  let availabilityRepoInTx: { find: jest.Mock };
  let timeOffRepoInTx: { find: jest.Mock; findOne: jest.Mock };
  let bookingRepoInTx: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let historyRepoInTx: { create: jest.Mock; save: jest.Mock };
  let profileRepoInTx: { findOne: jest.Mock };
  let dataSource: { transaction: jest.Mock; manager: unknown };
  let service: BookingService;

  const baseService = {
    id: SERVICE_ID,
    title: 'Vệ sinh máy lạnh',
    basePrice: 200000,
    priceUnit: PriceUnit.FIXED,
    durationMinutes: 60,
    status: ServiceStatus.ACTIVE,
    provider: {
      id: PROVIDER_ID,
      userId: PROVIDER_USER_ID,
      displayName: 'Thợ Minh',
      isOnline: true,
      verificationStatus: VerificationStatus.APPROVED,
      user: { id: PROVIDER_USER_ID, deletedAt: null, image: null },
      serviceAreas: [
        {
          id: 'area-1',
          areaName: 'Quận 9',
          centerLatitude: 10.8456,
          centerLongitude: 106.7719,
          radiusKm: 10,
          isActive: true,
        },
      ],
    },
  };

  const baseAddress = {
    id: ADDRESS_ID,
    userId: CUSTOMER_ID,
    fullName: 'Nguyễn Văn A',
    phone: '0909123456',
    addressLine1: '123 Lê Văn Việt',
    addressLine2: null,
    ward: 'Hiệp Phú',
    district: 'TP. Thủ Đức',
    city: 'TP. Hồ Chí Minh',
    postalCode: null,
    latitude: 10.8456,
    longitude: 106.7719,
  };

  beforeEach(() => {
    initPaymentMock = jest.fn().mockResolvedValue(null);
    markCompletedMock = jest.fn().mockResolvedValue(null);
    cancelOrRefundMock = jest.fn().mockResolvedValue(null);
    mockPaymentPort = {
      initPayment: initPaymentMock,
      markCompletedOnAcceptance: markCompletedMock,
      cancelOrRefund: cancelOrRefundMock,
      findByBookingId: jest.fn().mockResolvedValue([]),
      findLatestByBookingIds: jest.fn().mockResolvedValue(new Map()),
    };

    serviceRepoInTx = {
      findOne: jest.fn().mockResolvedValue(baseService),
    };
    addressRepoInTx = {
      findOne: jest.fn().mockResolvedValue(baseAddress),
    };
    availabilityRepoInTx = {
      find: jest.fn().mockResolvedValue([
        {
          dayOfWeek: slotDow,
          startTime: '08:00:00',
          endTime: '17:00:00',
          isActive: true,
        },
      ]),
    };
    timeOffRepoInTx = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };
    bookingRepoInTx = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((v: object) => v),
      save: jest.fn((v: object) => Promise.resolve({ id: BOOKING_ID, ...v })),
    };
    historyRepoInTx = {
      create: jest.fn((v: object) => v),
      save: jest.fn((v: object) => Promise.resolve(v)),
    };
    profileRepoInTx = {
      findOne: jest.fn().mockResolvedValue({
        id: PROVIDER_ID,
        userId: PROVIDER_USER_ID,
      }),
    };

    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Service) return serviceRepoInTx;
        if (entity === Address) return addressRepoInTx;
        if (entity === ProviderAvailability) return availabilityRepoInTx;
        if (entity === ProviderTimeOff) return timeOffRepoInTx;
        if (entity === Booking) return bookingRepoInTx;
        if (entity === BookingStatusHistory) return historyRepoInTx;
        if (entity === ProviderProfile) return profileRepoInTx;
        return {};
      }),
    };

    dataSource = {
      transaction: jest.fn((cb: (m: typeof manager) => Promise<unknown>) =>
        cb(manager),
      ),
      manager,
    };

    bookingRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: BOOKING_ID,
        bookingCode: 'SV-20261122-AABBCC',
        customerId: CUSTOMER_ID,
        providerId: PROVIDER_ID,
        serviceId: SERVICE_ID,
        status: BookingStatus.PENDING,
        scheduledStartAt: startAt,
        scheduledEndAt: new Date(startAt.getTime() + 60 * 60_000),
        totalPrice: 200000,
        serviceTitleSnapshot: 'Vệ sinh máy lạnh',
        serviceAddressSnapshot: {
          ...baseAddress,
          addressId: ADDRESS_ID,
          distanceKm: 0,
          distanceFee: 0,
          basePriceSnapshot: 200000,
          priceUnitSnapshot: PriceUnit.FIXED,
          durationMinutesSnapshot: 60,
        },
        inspectionImages: null,
        customerNote: null,
        cancelReason: null,
        cancelledBy: null,
        cancelledByUser: null,
        provider: {
          id: PROVIDER_ID,
          userId: PROVIDER_USER_ID,
          displayName: 'Thợ Minh',
          phone: '0981111001',
          isOnline: true,
          user: { image: null },
        },
        customer: {
          id: CUSTOMER_ID,
          name: 'Nguyễn Văn A',
          phone: '0909123456',
          image: null,
        },
        service: { id: SERVICE_ID, title: 'Vệ sinh máy lạnh', category: null },
        statusHistories: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    profileRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: PROVIDER_ID,
        isOnline: true,
      }),
    };

    const storagePublicPrefix = 'https://storage.test/bucket/';
    const storageServiceMock = {
      upload: jest.fn(),
      getPathFromUrl: jest.fn((url: string | null) =>
        url?.startsWith(storagePublicPrefix)
          ? url.slice(storagePublicPrefix.length)
          : null,
      ),
    };

    service = new BookingService(
      dataSource as never,
      bookingRepo as never,
      {} as never,
      {} as never,
      profileRepo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      storageServiceMock as never,
      mockPaymentPort,
    );
  });

  it('gọi bookingPaymentPort.initPayment trong transaction khi createBooking thành công', async () => {
    const result = await service.createBooking(CUSTOMER_ID, {
      serviceId: SERVICE_ID,
      addressId: ADDRESS_ID,
      scheduledStartAt: startAt.toISOString(),
      paymentMethod: 'payos',
    });

    expect(result.id).toBe(BOOKING_ID);
    expect(initPaymentMock).toHaveBeenCalledTimes(1);
    expect(initPaymentMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        bookingId: BOOKING_ID,
        amount: 200000,
        paymentMethod: 'payos',
      }),
    );
  });

  it('chặn 409 Conflict khi thợ đang tắt trạng thái nhận việc (isOnline = false)', async () => {
    serviceRepoInTx.findOne.mockResolvedValue({
      ...baseService,
      provider: { ...baseService.provider, isOnline: false },
    });

    await expect(
      service.createBooking(CUSTOMER_ID, {
        serviceId: SERVICE_ID,
        addressId: ADDRESS_ID,
        scheduledStartAt: startAt.toISOString(),
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('chặn 400 BadRequest khi thợ tự đặt dịch vụ của chính mình', async () => {
    await expect(
      service.createBooking(PROVIDER_USER_ID, {
        serviceId: SERVICE_ID,
        addressId: ADDRESS_ID,
        scheduledStartAt: startAt.toISOString(),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('chuyển mã lỗi PostgreSQL 23P01 (exclusion_violation) thành 409 Conflict', async () => {
    bookingRepoInTx.save.mockRejectedValue({
      driverError: { code: '23P01' },
    });

    await expect(
      service.createBooking(CUSTOMER_ID, {
        serviceId: SERVICE_ID,
        addressId: ADDRESS_ID,
        scheduledStartAt: startAt.toISOString(),
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('gọi markCompletedOnAcceptance khi khách hoàn tất đơn có đủ ảnh Before/After', async () => {
    bookingRepoInTx.findOne.mockResolvedValue({
      id: BOOKING_ID,
      customerId: CUSTOMER_ID,
      providerId: PROVIDER_ID,
      status: BookingStatus.IN_PROGRESS,
      inspectionImages: {
        before: [
          { url: 'https://before.jpg', capturedAt: new Date().toISOString() },
        ],
        after: [
          { url: 'https://after.jpg', capturedAt: new Date().toISOString() },
        ],
      },
    });

    await service.completeBooking(CUSTOMER_ID, BOOKING_ID);

    expect(markCompletedMock).toHaveBeenCalledTimes(1);
    expect(markCompletedMock).toHaveBeenCalledWith(
      expect.anything(),
      BOOKING_ID,
    );
  });

  it('ném 400 nếu khách hoàn tất đơn khi chưa có ảnh Before/After', async () => {
    bookingRepoInTx.findOne.mockResolvedValue({
      id: BOOKING_ID,
      customerId: CUSTOMER_ID,
      providerId: PROVIDER_ID,
      status: BookingStatus.IN_PROGRESS,
      inspectionImages: null,
    });

    await expect(
      service.completeBooking(CUSTOMER_ID, BOOKING_ID),
    ).rejects.toThrow(BadRequestException);
    expect(markCompletedMock).not.toHaveBeenCalled();
  });

  it('gọi bookingPaymentPort.cancelOrRefund khi hủy hoặc từ chối đơn', async () => {
    bookingRepoInTx.findOne.mockResolvedValue({
      id: BOOKING_ID,
      customerId: CUSTOMER_ID,
      providerId: PROVIDER_ID,
      status: BookingStatus.CONFIRMED,
    });

    await service.cancelBooking(
      { id: CUSTOMER_ID, role: UserRole.CUSTOMER },
      BOOKING_ID,
      'Khách bận đột xuất',
    );

    expect(cancelOrRefundMock).toHaveBeenCalledWith(
      expect.anything(),
      BOOKING_ID,
      'Khách bận đột xuất',
    );

    bookingRepoInTx.findOne.mockResolvedValue({
      id: BOOKING_ID,
      customerId: CUSTOMER_ID,
      providerId: PROVIDER_ID,
      status: BookingStatus.PENDING,
    });

    await service.rejectBooking(PROVIDER_USER_ID, BOOKING_ID, 'Kín lịch');

    expect(cancelOrRefundMock).toHaveBeenCalledWith(
      expect.anything(),
      BOOKING_ID,
      'Kín lịch',
    );
  });

  it('H1: chặn 400 BadRequest khi lọc đơn thợ với ngày không có thật (2026-99-99, 2026-02-31)', async () => {
    const qbStub = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
    };
    bookingRepo.createQueryBuilder = jest.fn().mockReturnValue(qbStub);

    await expect(
      service.getProviderBookings(PROVIDER_USER_ID, { date: '2026-99-99' }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.getProviderBookings(PROVIDER_USER_ID, { date: '2026-02-31' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('H2: createBooking khóa provider_profile (pessimistic_write) và confirmBooking chặn 409 nếu trùng khoảng nghỉ', async () => {
    await service.createBooking(CUSTOMER_ID, {
      serviceId: SERVICE_ID,
      addressId: ADDRESS_ID,
      scheduledStartAt: startAt.toISOString(),
    });
    expect(profileRepoInTx.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PROVIDER_ID },
        lock: { mode: 'pessimistic_write' },
      }),
    );

    bookingRepoInTx.findOne.mockResolvedValue({
      id: BOOKING_ID,
      customerId: CUSTOMER_ID,
      providerId: PROVIDER_ID,
      status: BookingStatus.PENDING,
      scheduledStartAt: startAt,
      scheduledEndAt: new Date(startAt.getTime() + 60 * 60_000),
    });
    timeOffRepoInTx.findOne.mockResolvedValue({ id: 'time-off-conflict' });

    await expect(
      service.confirmBooking(PROVIDER_USER_ID, BOOKING_ID),
    ).rejects.toThrow(ConflictException);
  });

  it('H3: chặn 400 BadRequest với URL ngoài/nội bộ hoặc sai thư mục trong initialImages và submitInspection', async () => {
    await expect(
      service.createBooking(CUSTOMER_ID, {
        serviceId: SERVICE_ID,
        addressId: ADDRESS_ID,
        scheduledStartAt: startAt.toISOString(),
        initialImages: [
          {
            url: 'http://127.0.0.1:9999/ssrf-test.png',
            capturedAt: new Date().toISOString(),
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.createBooking(CUSTOMER_ID, {
        serviceId: SERVICE_ID,
        addressId: ADDRESS_ID,
        scheduledStartAt: startAt.toISOString(),
        initialImages: [
          {
            url: 'https://storage.test/bucket/bookings/initial/other-user/img.png',
            capturedAt: new Date().toISOString(),
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.createBooking(CUSTOMER_ID, {
        serviceId: SERVICE_ID,
        addressId: ADDRESS_ID,
        scheduledStartAt: startAt.toISOString(),
        initialImages: [
          {
            url: `https://storage.test/bucket/bookings/initial/${CUSTOMER_ID}/img.png`,
            capturedAt: new Date().toISOString(),
          },
        ],
      }),
    ).resolves.toMatchObject({ id: BOOKING_ID });

    bookingRepoInTx.findOne.mockResolvedValue({
      id: BOOKING_ID,
      customerId: CUSTOMER_ID,
      providerId: PROVIDER_ID,
      status: BookingStatus.IN_PROGRESS,
      inspectionImages: null,
    });

    await expect(
      service.submitInspection(PROVIDER_USER_ID, BOOKING_ID, {
        before: [
          {
            url: 'https://evil.example/fake-before.png',
            capturedAt: new Date().toISOString(),
          },
        ],
        after: [
          {
            url: `https://storage.test/bucket/bookings/inspections/${BOOKING_ID}/after/a.png`,
            capturedAt: new Date().toISOString(),
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.submitInspection(PROVIDER_USER_ID, BOOKING_ID, {
        before: [
          {
            url: `https://storage.test/bucket/bookings/inspections/${BOOKING_ID}/before/b.png`,
            capturedAt: new Date().toISOString(),
          },
        ],
        after: [
          {
            url: `https://storage.test/bucket/bookings/inspections/${BOOKING_ID}/after/a.png`,
            capturedAt: new Date().toISOString(),
          },
        ],
      }),
    ).resolves.toMatchObject({ id: BOOKING_ID });
  });
});
