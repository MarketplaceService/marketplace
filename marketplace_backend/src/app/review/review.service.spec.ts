import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { BookingStatusHistory } from 'src/app/booking/entities/booking-status-history.entity';
import { Booking } from 'src/app/booking/entities/booking.entity';
import { ProviderProfile } from 'src/app/provider/entities/provider-profile.entity';
import { BookingStatus } from 'src/shared/types/booking-status.enum';
import { VerificationStatus } from 'src/shared/types/verification-status.enum';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review } from './entities/review.entity';
import {
  calculateAcceptanceSpeedScore,
  calculateCompletionRateScore,
  calculatePriceAdherenceScore,
  calculatePunctualityScore,
  calculateSkillQualityScore,
} from './review-radar';
import { ReviewService } from './review.service';

describe('ReviewService & Radar Calculation', () => {
  const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
  const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';
  const PROVIDER_USER_ID = '33333333-3333-4333-8333-333333333333';
  const PROVIDER_ID = '44444444-4444-4444-8444-444444444444';
  const BOOKING_ID = '55555555-5555-4555-8555-555555555555';

  let bookingRepoInTx: { findOne: jest.Mock };
  let reviewRepoInTx: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let reviewRepo: { createQueryBuilder: jest.Mock };
  let bookingRepo: { createQueryBuilder: jest.Mock };
  let historyRepo: { createQueryBuilder: jest.Mock };
  let profileRepo: { findOne: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let service: ReviewService;

  beforeEach(() => {
    bookingRepoInTx = {
      findOne: jest.fn(),
    };
    reviewRepoInTx = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v: object) => v),
      save: jest.fn((v: object) =>
        Promise.resolve({
          id: 'review-1',
          createdAt: new Date('2026-11-25T10:00:00Z'),
          updatedAt: new Date('2026-11-25T10:00:00Z'),
          ...v,
        }),
      ),
    };

    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Booking) return bookingRepoInTx;
        if (entity === Review) return reviewRepoInTx;
        return {};
      }),
    };

    dataSource = {
      transaction: jest.fn((cb: (m: typeof manager) => Promise<unknown>) =>
        cb(manager),
      ),
    };

    reviewRepo = { createQueryBuilder: jest.fn() };
    bookingRepo = { createQueryBuilder: jest.fn() };
    historyRepo = { createQueryBuilder: jest.fn() };
    profileRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: PROVIDER_ID,
        userId: PROVIDER_USER_ID,
        verificationStatus: VerificationStatus.APPROVED,
        user: { id: PROVIDER_USER_ID, deletedAt: null },
      }),
    };

    service = new ReviewService(
      dataSource as never,
      reviewRepo as never,
      bookingRepo as never,
      historyRepo as never,
      profileRepo as never,
    );
  });

  describe('CreateReviewDto strict validation (S25.1)', () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    });

    it('chấp nhận rating 1..5 và priceMatched boolean hợp lệ', async () => {
      const dto = await pipe.transform(
        { rating: 5, priceMatched: false, comment: '  Rất tốt  ' },
        { type: 'body', metatype: CreateReviewDto },
      );
      expect(dto).toMatchObject({
        rating: 5,
        priceMatched: false,
        comment: 'Rất tốt',
      });
    });

    it('từ chối 400 nếu rating ngoài 1..5, không phải số nguyên, hoặc priceMatched không phải boolean thật', async () => {
      await expect(
        pipe.transform(
          { rating: 0, priceMatched: true },
          { type: 'body', metatype: CreateReviewDto },
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        pipe.transform(
          { rating: 6, priceMatched: true },
          { type: 'body', metatype: CreateReviewDto },
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        pipe.transform(
          { rating: 4.5, priceMatched: true },
          { type: 'body', metatype: CreateReviewDto },
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        pipe.transform(
          { rating: 5, priceMatched: 'false' },
          { type: 'body', metatype: CreateReviewDto },
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        pipe.transform(
          { rating: 5 },
          { type: 'body', metatype: CreateReviewDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createReview() (S25.1)', () => {
    it('ném 404 khi booking không tồn tại', async () => {
      bookingRepoInTx.findOne.mockResolvedValue(null);

      await expect(
        service.createReview(CUSTOMER_ID, BOOKING_ID, {
          rating: 5,
          priceMatched: true,
          comment: 'Tốt',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('ném 403 khi người dùng không sở hữu booking', async () => {
      bookingRepoInTx.findOne.mockResolvedValue({
        id: BOOKING_ID,
        customerId: CUSTOMER_ID,
        status: BookingStatus.COMPLETED,
      });

      await expect(
        service.createReview(OTHER_USER_ID, BOOKING_ID, {
          rating: 5,
          priceMatched: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ném 409 khi booking chưa ở trạng thái COMPLETED', async () => {
      bookingRepoInTx.findOne.mockResolvedValue({
        id: BOOKING_ID,
        customerId: CUSTOMER_ID,
        status: BookingStatus.IN_PROGRESS,
      });

      await expect(
        service.createReview(CUSTOMER_ID, BOOKING_ID, {
          rating: 5,
          priceMatched: true,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('ném 409 Conflict khi booking đã được đánh giá trước đó hoặc đụng unique constraint 23505', async () => {
      bookingRepoInTx.findOne.mockResolvedValue({
        id: BOOKING_ID,
        customerId: CUSTOMER_ID,
        status: BookingStatus.COMPLETED,
      });
      reviewRepoInTx.findOne.mockResolvedValueOnce({ id: 'existing-review' });

      await expect(
        service.createReview(CUSTOMER_ID, BOOKING_ID, {
          rating: 5,
          priceMatched: true,
        }),
      ).rejects.toThrow(ConflictException);

      reviewRepoInTx.findOne.mockResolvedValueOnce(null);
      reviewRepoInTx.save.mockRejectedValueOnce({
        driverError: { code: '23505' },
      });

      await expect(
        service.createReview(CUSTOMER_ID, BOOKING_ID, {
          rating: 5,
          priceMatched: true,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('tạo đánh giá thành công cho booking COMPLETED thuộc về khách hàng', async () => {
      bookingRepoInTx.findOne.mockResolvedValue({
        id: BOOKING_ID,
        customerId: CUSTOMER_ID,
        status: BookingStatus.COMPLETED,
      });

      const created = await service.createReview(CUSTOMER_ID, BOOKING_ID, {
        rating: 4,
        priceMatched: true,
        comment: 'Đúng giờ, sạch sẽ',
      });

      expect(created).toMatchObject({
        id: 'review-1',
        bookingId: BOOKING_ID,
        rating: 4,
        priceMatched: true,
        comment: 'Đúng giờ, sạch sẽ',
      });
    });
  });

  describe('getProviderReviews() (S25.2)', () => {
    it('ném 404 khi thợ không tồn tại hoặc chưa được duyệt', async () => {
      profileRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getProviderReviews(PROVIDER_ID, { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('chỉ trích xuất before và after từ inspectionImages, tuyệt đối không lộ initial, extraMaterials, fieldNote', async () => {
      const summaryQb = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([
            { providerId: PROVIDER_ID, reviewCount: '1', ratingAverage: '5' },
          ]),
      };

      const listQb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: 'rev-1',
              bookingId: BOOKING_ID,
              rating: 5,
              priceMatched: true,
              comment: 'Rất hài lòng',
              createdAt: new Date('2026-11-25T10:00:00Z'),
              booking: {
                serviceTitleSnapshot: 'Vệ sinh máy lạnh',
                serviceAddressSnapshot: {
                  fullName: 'Anh Tuấn',
                  ward: 'P. Hiệp Phú',
                  phone: '0909000111',
                  addressLine1: '123 Bí mật',
                },
                customer: { name: 'Anh Tuấn', image: null },
                inspectionImages: {
                  initial: [
                    { url: 'https://secret-initial.jpg', capturedAt: '2026' },
                  ],
                  before: [{ url: 'https://before.jpg', capturedAt: '2026' }],
                  after: [{ url: 'https://after.jpg', capturedAt: '2026' }],
                  extraMaterials: [
                    {
                      name: 'Ống đồng',
                      quantity: 2,
                      unitPrice: 100000,
                      reason: 'Rỉ',
                    },
                  ],
                  fieldNote: 'Ghi chú nội bộ hiện trường',
                  technicalSpecs: [{ label: 'Gas', value: '135 PSI' }],
                },
              },
            },
          ],
          1,
        ]),
      };

      reviewRepo.createQueryBuilder
        .mockReturnValueOnce(summaryQb)
        .mockReturnValueOnce(listQb);

      const res = await service.getProviderReviews(PROVIDER_ID, {
        page: 1,
        limit: 10,
      });

      expect(res.ratingAverage).toBe(5);
      expect(res.reviewCount).toBe(1);
      expect(res.items).toHaveLength(1);
      expect(res.items[0].inspectionImages).toEqual({
        before: [{ url: 'https://before.jpg', capturedAt: '2026' }],
        after: [{ url: 'https://after.jpg', capturedAt: '2026' }],
      });
      expect(res.items[0].inspectionImages).not.toHaveProperty('initial');
      expect(res.items[0].inspectionImages).not.toHaveProperty(
        'extraMaterials',
      );
      expect(res.items[0].inspectionImages).not.toHaveProperty('fieldNote');
      expect(res.items[0].inspectionImages).not.toHaveProperty(
        'technicalSpecs',
      );
      expect(res.items[0].customer).not.toHaveProperty('phone');
    });
  });

  describe('Radar pure calculation & getProviderRadar() (S25.2)', () => {
    it('trả 0 cho tất cả 5 trục khi mẫu số = 0', () => {
      expect(calculatePunctualityScore([])).toEqual({
        score: 0,
        onTimeCount: 0,
        totalStartedCount: 0,
      });
      expect(calculatePriceAdherenceScore(0, 0)).toBe(0);
      expect(calculateSkillQualityScore(0, 0)).toBe(0);
      expect(calculateCompletionRateScore(0, 0)).toBe(0);
      expect(calculateAcceptanceSpeedScore([])).toEqual({
        score: 0,
        avgResponseMinutes: null,
        respondedCount: 0,
      });
    });

    it('tính chính xác 5 trục Radar khi có dữ liệu', () => {
      const t0 = new Date('2026-11-25T09:00:00Z');
      // 1 đúng giờ (+15p), 1 trễ (+16p) => 2.5
      const punctuality = calculatePunctualityScore([
        {
          scheduledStartAt: t0,
          startedAt: new Date(t0.getTime() + 15 * 60_000),
        },
        {
          scheduledStartAt: t0,
          startedAt: new Date(t0.getTime() + 16 * 60_000),
        },
      ]);
      expect(punctuality.score).toBe(2.5);
      expect(punctuality.onTimeCount).toBe(1);

      // 3/4 đúng giá => 3.8 (3.75 rounded 1 decimal)
      expect(calculatePriceAdherenceScore(3, 4)).toBe(3.8);

      // AVG rating 4.75 => 4.8
      expect(calculateSkillQualityScore(4.75, 4)).toBe(4.8);

      // 4 completed / (1 confirmed + 1 in_progress + 4 completed + 2 provider cancelled) = 4/8 * 5 = 2.5
      expect(calculateCompletionRateScore(4, 8)).toBe(2.5);

      // <= 15p => 5.0; >= 120p => 1.0; midpoint 67.5p => 3.0
      expect(calculateAcceptanceSpeedScore([10, 15]).score).toBe(5);
      expect(calculateAcceptanceSpeedScore([120, 180]).score).toBe(1);
      expect(calculateAcceptanceSpeedScore([67.5]).score).toBe(3);
    });

    it('getProviderRadar() loại trừ đơn khách hủy và đơn REJECTED khỏi mẫu số tỉ lệ hoàn thành, bỏ qua PENDING->CANCELLED ở tốc độ nhận đơn', async () => {
      const reviewAggQb = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          reviewCount: '2',
          matchedCount: '2',
          averageRating: '4.5',
        }),
      };
      reviewRepo.createQueryBuilder.mockReturnValue(reviewAggQb);

      const tStart = new Date('2026-11-25T09:00:00Z');
      const startedQb = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            bookingId: 'b1',
            scheduledStartAt: tStart,
            startedAt: new Date(tStart.getTime() + 5 * 60_000),
          },
        ]),
      };

      const acceptanceQb = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            bookingId: 'b1',
            bookingCreatedAt: '2026-11-25T08:00:00Z',
            pendingAt: '2026-11-25T08:00:00Z',
            respondedAt: '2026-11-25T08:10:00Z', // 10 phút -> 5.0
          },
          {
            bookingId: 'b-cancelled-pending',
            bookingCreatedAt: '2026-11-25T08:00:00Z',
            pendingAt: '2026-11-25T08:00:00Z',
            respondedAt: null, // PENDING -> CANCELLED phải bị bỏ qua
          },
        ]),
      };

      historyRepo.createQueryBuilder
        .mockReturnValueOnce(startedQb)
        .mockReturnValueOnce(acceptanceQb);

      const statusQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: BookingStatus.COMPLETED, cancelledBy: null, count: '3' },
          {
            status: BookingStatus.CANCELLED,
            cancelledBy: PROVIDER_USER_ID,
            count: '1',
          },
          {
            status: BookingStatus.CANCELLED,
            cancelledBy: CUSTOMER_ID,
            count: '5', // Khách hủy không bị trừ vào tỷ lệ hoàn thành
          },
          { status: BookingStatus.REJECTED, cancelledBy: null, count: '2' }, // REJECTED không bị trừ
        ]),
      };
      bookingRepo.createQueryBuilder.mockReturnValue(statusQb);

      const radar = await service.getProviderRadar(PROVIDER_ID);

      expect(radar.reviewCount).toBe(2);
      expect(radar.ratingAverage).toBe(4.5);
      expect(radar.punctuality).toBe(5);
      expect(radar.priceAdherence).toBe(5);
      expect(radar.skillQuality).toBe(4.5);
      // 3 / (3 + 1) * 5 = 3.75 -> 3.8
      expect(radar.completionRate).toBe(3.8);
      expect(radar.acceptanceSpeed).toBe(5);
      expect(radar.metrics.acceptanceSpeed.respondedCount).toBe(1);
    });
  });
});
