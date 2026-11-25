import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BookingInspectionData,
  InspectionPhoto,
} from 'src/app/booking/booking.types';
import { BookingStatusHistory } from 'src/app/booking/entities/booking-status-history.entity';
import { Booking } from 'src/app/booking/entities/booking.entity';
import { ProviderProfile } from 'src/app/provider/entities/provider-profile.entity';
import {
  apiBadRequest,
  apiConflict,
  apiForbidden,
  apiNotFound,
} from 'src/shared/helpers/api-i18n';
import { BookingStatus } from 'src/shared/types/booking-status.enum';
import { VerificationStatus } from 'src/shared/types/verification-status.enum';
import { toVnIsoString } from 'src/shared/utils/vn-time';
import { DataSource, Repository } from 'typeorm';
import { CreateReviewDto } from './dto/create-review.dto';
import { GetProviderReviewsQueryDto } from './dto/query-reviews.dto';
import { Review } from './entities/review.entity';
import {
  calculateAcceptanceSpeedScore,
  calculateCompletionRateScore,
  calculatePriceAdherenceScore,
  calculatePunctualityScore,
  calculateSkillQualityScore,
  roundRadarScore,
} from './review-radar';

export interface ProviderRatingSummary {
  ratingAverage: number;
  reviewCount: number;
}

export interface SerializedReview {
  id: string;
  bookingId: string;
  rating: number;
  priceMatched: boolean;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

function getPgDriverErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const err = error as { code?: unknown; driverError?: { code?: unknown } };
  if (typeof err.driverError?.code === 'string') return err.driverError.code;
  if (typeof err.code === 'string') return err.code;
  return undefined;
}

function extractBeforeAfterImages(
  inspectionImages: BookingInspectionData | null | undefined,
): { before: InspectionPhoto[]; after: InspectionPhoto[] } | null {
  if (!inspectionImages) return null;

  const before = Array.isArray(inspectionImages.before)
    ? inspectionImages.before.map((photo) => ({
        url: photo.url,
        ...(photo.caption ? { caption: photo.caption } : {}),
        capturedAt: photo.capturedAt,
      }))
    : [];

  const after = Array.isArray(inspectionImages.after)
    ? inspectionImages.after.map((photo) => ({
        url: photo.url,
        ...(photo.caption ? { caption: photo.caption } : {}),
        capturedAt: photo.capturedAt,
      }))
    : [];

  if (before.length === 0 && after.length === 0) {
    return null;
  }

  return { before, after };
}

@Injectable()
export class ReviewService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingStatusHistory)
    private readonly historyRepo: Repository<BookingStatusHistory>,
    @InjectRepository(ProviderProfile)
    private readonly profileRepo: Repository<ProviderProfile>,
  ) {}

  serializeReview(review: Review): SerializedReview {
    return {
      id: review.id,
      bookingId: review.bookingId,
      rating: review.rating,
      priceMatched: review.priceMatched,
      comment: review.comment,
      createdAt: toVnIsoString(review.createdAt),
      updatedAt: toVnIsoString(review.updatedAt),
    };
  }

  async createReview(
    customerUserId: string,
    bookingId: string,
    dto: CreateReviewDto,
  ): Promise<SerializedReview> {
    let savedReview!: Review;

    try {
      await this.dataSource.transaction(async (manager) => {
        const booking = await manager.getRepository(Booking).findOne({
          where: { id: bookingId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!booking) {
          apiNotFound('errors.booking.notFound');
        }

        if (booking.customerId !== customerUserId) {
          apiForbidden('errors.review.forbidden');
        }

        if (booking.status !== BookingStatus.COMPLETED) {
          apiConflict('errors.review.bookingNotCompleted');
        }

        const reviewRepo = manager.getRepository(Review);
        const existing = await reviewRepo.findOne({
          where: { bookingId },
          select: { id: true },
        });

        if (existing) {
          apiConflict('errors.review.alreadyReviewed');
        }

        const cleanComment = dto.comment?.trim() || null;
        savedReview = await reviewRepo.save(
          reviewRepo.create({
            bookingId,
            rating: dto.rating,
            priceMatched: dto.priceMatched,
            comment: cleanComment,
          }),
        );
      });
    } catch (error) {
      const pgCode = getPgDriverErrorCode(error);
      if (pgCode === '23505') {
        apiConflict('errors.review.alreadyReviewed');
      }
      if (pgCode === '23514') {
        apiBadRequest('errors.review.invalidRating');
      }
      throw error;
    }

    return this.serializeReview(savedReview);
  }

  async getProviderRatingSummary(
    providerId: string,
  ): Promise<ProviderRatingSummary> {
    const map = await this.getProviderRatingSummaryMap([providerId]);
    return map.get(providerId) ?? { ratingAverage: 0, reviewCount: 0 };
  }

  async getProviderRatingSummaryMap(
    providerIds: string[],
  ): Promise<Map<string, ProviderRatingSummary>> {
    const result = new Map<string, ProviderRatingSummary>();
    const uniqueIds = Array.from(new Set(providerIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return result;
    }

    const rows = await this.reviewRepo
      .createQueryBuilder('review')
      .innerJoin('review.booking', 'booking')
      .select('booking.providerId', 'providerId')
      .addSelect('COUNT(review.id)', 'reviewCount')
      .addSelect('COALESCE(AVG(review.rating), 0)', 'ratingAverage')
      .where('booking.providerId IN (:...providerIds)', {
        providerIds: uniqueIds,
      })
      .groupBy('booking.providerId')
      .getRawMany<{
        providerId: string;
        reviewCount: string;
        ratingAverage: string;
      }>();

    for (const row of rows) {
      const reviewCount = Number(row.reviewCount) || 0;
      const ratingAverage =
        reviewCount > 0 ? roundRadarScore(Number(row.ratingAverage) || 0) : 0;
      result.set(row.providerId, {
        ratingAverage,
        reviewCount,
      });
    }

    return result;
  }

  async getProviderReviews(
    providerId: string,
    query: GetProviderReviewsQueryDto,
  ) {
    await this.assertApprovedProvider(providerId);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const [summary, [reviews, total]] = await Promise.all([
      this.getProviderRatingSummary(providerId),
      this.reviewRepo
        .createQueryBuilder('review')
        .innerJoinAndSelect('review.booking', 'booking')
        .leftJoinAndSelect('booking.customer', 'customer')
        .where('booking.providerId = :providerId', { providerId })
        .orderBy('review.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getManyAndCount(),
    ]);

    return {
      ratingAverage: summary.ratingAverage,
      reviewCount: summary.reviewCount,
      items: reviews.map((review) => ({
        id: review.id,
        bookingId: review.bookingId,
        rating: review.rating,
        priceMatched: review.priceMatched,
        comment: review.comment,
        createdAt: toVnIsoString(review.createdAt),
        serviceTitle: review.booking.serviceTitleSnapshot,
        customer: {
          name:
            review.booking.customer?.name ??
            review.booking.serviceAddressSnapshot?.fullName ??
            'Khách hàng',
          ward: review.booking.serviceAddressSnapshot?.ward ?? null,
          avatarUrl: review.booking.customer?.image ?? null,
        },
        inspectionImages: extractBeforeAfterImages(
          review.booking.inspectionImages,
        ),
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getProviderRadar(providerId: string) {
    const provider = await this.assertApprovedProvider(providerId);

    const [reviewAgg, startedRows, statusCounts, acceptanceRows] =
      await Promise.all([
        this.reviewRepo
          .createQueryBuilder('review')
          .innerJoin('review.booking', 'booking')
          .select('COUNT(review.id)', 'reviewCount')
          .addSelect(
            'COALESCE(SUM(CASE WHEN review.price_matched = true THEN 1 ELSE 0 END), 0)',
            'matchedCount',
          )
          .addSelect('COALESCE(AVG(review.rating), 0)', 'averageRating')
          .where('booking.providerId = :providerId', { providerId })
          .getRawOne<{
            reviewCount: string;
            matchedCount: string;
            averageRating: string;
          }>(),

        this.historyRepo
          .createQueryBuilder('history')
          .innerJoin('history.booking', 'booking')
          .select('booking.id', 'bookingId')
          .addSelect('booking.scheduledStartAt', 'scheduledStartAt')
          .addSelect('MIN(history.createdAt)', 'startedAt')
          .where('booking.providerId = :providerId', { providerId })
          .andWhere('history.newStatus = :status', {
            status: BookingStatus.IN_PROGRESS,
          })
          .groupBy('booking.id')
          .addGroupBy('booking.scheduledStartAt')
          .getRawMany<{
            bookingId: string;
            scheduledStartAt: Date | string;
            startedAt: Date | string;
          }>(),

        this.bookingRepo
          .createQueryBuilder('booking')
          .select('booking.status', 'status')
          .addSelect('booking.cancelledBy', 'cancelledBy')
          .addSelect('COUNT(*)', 'count')
          .where('booking.providerId = :providerId', { providerId })
          .groupBy('booking.status')
          .addGroupBy('booking.cancelledBy')
          .getRawMany<{
            status: BookingStatus;
            cancelledBy: string | null;
            count: string;
          }>(),

        this.historyRepo
          .createQueryBuilder('history')
          .innerJoin('history.booking', 'booking')
          .select('booking.id', 'bookingId')
          .addSelect('booking.createdAt', 'bookingCreatedAt')
          .addSelect(
            "MIN(CASE WHEN history.new_status = 'PENDING' THEN history.created_at END)",
            'pendingAt',
          )
          .addSelect(
            "MIN(CASE WHEN history.new_status IN ('CONFIRMED', 'REJECTED') THEN history.created_at END)",
            'respondedAt',
          )
          .where('booking.providerId = :providerId', { providerId })
          .groupBy('booking.id')
          .addGroupBy('booking.createdAt')
          .getRawMany<{
            bookingId: string;
            bookingCreatedAt: Date | string;
            pendingAt: Date | string | null;
            respondedAt: Date | string | null;
          }>(),
      ]);

    const reviewCount = Number(reviewAgg?.reviewCount) || 0;
    const matchedCount = Number(reviewAgg?.matchedCount) || 0;
    const averageRating =
      reviewCount > 0
        ? roundRadarScore(Number(reviewAgg?.averageRating) || 0)
        : 0;

    const punctualityResult = calculatePunctualityScore(
      startedRows.map((row) => ({
        scheduledStartAt: new Date(row.scheduledStartAt),
        startedAt: new Date(row.startedAt),
      })),
    );

    const priceAdherence = calculatePriceAdherenceScore(
      matchedCount,
      reviewCount,
    );
    const skillQuality = calculateSkillQualityScore(averageRating, reviewCount);

    let completedCount = 0;
    let confirmedCount = 0;
    let inProgressCount = 0;
    let providerCancelledCount = 0;

    for (const row of statusCounts) {
      const count = Number(row.count) || 0;
      if (row.status === BookingStatus.COMPLETED) {
        completedCount += count;
      } else if (row.status === BookingStatus.CONFIRMED) {
        confirmedCount += count;
      } else if (row.status === BookingStatus.IN_PROGRESS) {
        inProgressCount += count;
      } else if (
        row.status === BookingStatus.CANCELLED &&
        row.cancelledBy === provider.userId
      ) {
        providerCancelledCount += count;
      }
    }

    const completionDenominator =
      completedCount +
      confirmedCount +
      inProgressCount +
      providerCancelledCount;
    const completionRate = calculateCompletionRateScore(
      completedCount,
      completionDenominator,
    );

    const responseMinutesList: number[] = [];
    for (const row of acceptanceRows) {
      if (!row.respondedAt) continue;
      const startTime = new Date(
        row.pendingAt ?? row.bookingCreatedAt,
      ).getTime();
      const endTime = new Date(row.respondedAt).getTime();
      responseMinutesList.push(Math.max(0, (endTime - startTime) / 60_000));
    }
    const acceptanceResult = calculateAcceptanceSpeedScore(responseMinutesList);

    return {
      providerId,
      reviewCount,
      ratingAverage: averageRating,
      punctuality: punctualityResult.score,
      priceAdherence,
      skillQuality,
      completionRate,
      acceptanceSpeed: acceptanceResult.score,
      metrics: {
        punctuality: punctualityResult,
        priceAdherence: {
          score: priceAdherence,
          matchedCount,
          totalReviewCount: reviewCount,
        },
        skillQuality: {
          score: skillQuality,
          averageRating,
          totalReviewCount: reviewCount,
        },
        completionRate: {
          score: completionRate,
          completedCount,
          denominatorCount: completionDenominator,
        },
        acceptanceSpeed: acceptanceResult,
      },
    };
  }

  private async assertApprovedProvider(providerId: string) {
    const profile = await this.profileRepo.findOne({
      where: {
        id: providerId,
        verificationStatus: VerificationStatus.APPROVED,
      },
      relations: { user: true },
      select: {
        id: true,
        userId: true,
        verificationStatus: true,
        user: {
          id: true,
          deletedAt: true,
        },
      },
    });

    if (!profile?.user || profile.user.deletedAt) {
      apiNotFound('errors.provider.notFound');
    }

    return profile;
  }
}
