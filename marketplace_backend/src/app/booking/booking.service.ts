import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Address } from 'src/app/address/entities/address.entity';
import { ChatService } from 'src/app/chat/chat.service';
import { ProviderProfile } from 'src/app/provider/entities/provider-profile.entity';
import { ProviderServiceArea } from 'src/app/provider/entities/provider-service-area.entity';
import { ProviderAvailability } from 'src/app/scheduling/entities/provider-availability.entity';
import { ProviderTimeOff } from 'src/app/scheduling/entities/provider-time-off.entity';
import { buildDaySlots } from 'src/app/scheduling/slot-calculator';
import { MAX_DAYS_AHEAD } from 'src/app/scheduling/slot.service';
import { Service } from 'src/app/service/entities/service.entity';
import { calculateHaversineKm } from 'src/app/service/service.service';
import { StorageService } from 'src/app/storage/storage.service';
import {
  apiBadRequest,
  apiConflict,
  apiForbidden,
  apiNotFound,
  translateApiMessage,
} from 'src/shared/helpers/api-i18n';
import { BookingStatus } from 'src/shared/types/booking-status.enum';
import { ServiceStatus } from 'src/shared/types/service-status.enum';
import { UserRole } from 'src/shared/types/user-role.enum';
import { VerificationStatus } from 'src/shared/types/verification-status.enum';
import {
  addDays,
  dayOfWeekOf,
  isValidDateOnly,
  todayInVietnam,
  toVnIsoString,
  vnDateTime,
} from 'src/shared/utils/vn-time';
import {
  DataSource,
  EntityManager,
  In,
  LessThan,
  MoreThan,
  Repository,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import {
  BOOKING_IMAGE_EXTENSIONS,
  validateUploadedBookingImages,
} from './booking-image-upload';
import {
  BookingPaymentPort,
  BookingPaymentSummary,
} from './booking-payment.port';
import { calculateBookingPrice } from './booking-pricing';
import {
  assertBookingTransition,
  BookingActorRole,
  hasRequiredInspectionPhotos,
} from './booking-state-machine';
import {
  BookingAddressSnapshot,
  BookingInspectionData,
  InspectionPhoto,
} from './booking.types';
import { CreateBookingDto } from './dto/create-booking.dto';
import { PreviewBookingDto } from './dto/preview-booking.dto';
import {
  GetMyBookingsQueryDto,
  GetProviderBookingsQueryDto,
  GetProviderWalletQueryDto,
} from './dto/query-bookings.dto';
import { SubmitInspectionDto } from './dto/submit-inspection.dto';
import { BookingStatusHistory } from './entities/booking-status-history.entity';
import { Booking } from './entities/booking.entity';

const ACTIVE_BOOKING_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
];

// Mốc hoàn tất bất biến từ nhật ký trạng thái, tránh lệch tháng doanh thu khi booking.updated_at thay đổi sau này
const COMPLETED_AT_EXPR = `COALESCE((SELECT MIN(h.created_at) FROM booking_status_history h WHERE h.booking_id = booking.id AND h.new_status = 'COMPLETED'), booking.updated_at)`;

interface AreaEvaluation {
  inServiceArea: boolean;
  distanceKm: number | null;
  matchedAreaName: string | null;
  matchedRadiusKm: number | null;
}

function getPgDriverErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const err = error as { code?: unknown; driverError?: { code?: unknown } };
  if (typeof err.driverError?.code === 'string') return err.driverError.code;
  if (typeof err.code === 'string') return err.code;
  return undefined;
}

function buildMonthSequence(endMonth: string, count: number): string[] {
  const [yearStr, monthStr] = endMonth.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const result: string[] = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(year, monthIndex - i, 1));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    result.push(`${y}-${m}`);
  }

  return result;
}

function monthRangeInVn(month: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  const startDate = `${yearStr}-${monthStr}-01`;
  const nextDateObj = new Date(Date.UTC(year, monthNum, 1));
  const nextYear = nextDateObj.getUTCFullYear();
  const nextMonth = String(nextDateObj.getUTCMonth() + 1).padStart(2, '0');
  const endDate = `${nextYear}-${nextMonth}-01`;

  return {
    start: vnDateTime(startDate, '00:00'),
    end: vnDateTime(endDate, '00:00'),
  };
}

@Injectable()
export class BookingService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingStatusHistory)
    private readonly historyRepo: Repository<BookingStatusHistory>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
    @InjectRepository(ProviderProfile)
    private readonly profileRepo: Repository<ProviderProfile>,
    @InjectRepository(ProviderServiceArea)
    private readonly areaRepo: Repository<ProviderServiceArea>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    @InjectRepository(ProviderAvailability)
    private readonly availabilityRepo: Repository<ProviderAvailability>,
    @InjectRepository(ProviderTimeOff)
    private readonly timeOffRepo: Repository<ProviderTimeOff>,
    private readonly storageService: StorageService,
    private readonly bookingPaymentPort: BookingPaymentPort,
    @Optional() private readonly chatService?: ChatService,
  ) {}

  async previewBooking(userId: string, dto: PreviewBookingDto) {
    const now = new Date();
    const startAt = new Date(dto.scheduledStartAt);
    if (Number.isNaN(startAt.getTime())) {
      apiBadRequest('errors.booking.invalidScheduleTime');
    }

    const service = await this.serviceRepo.findOne({
      where: { id: dto.serviceId },
      relations: {
        category: true,
        provider: {
          user: true,
          serviceAreas: true,
        },
      },
    });

    if (!service) {
      apiNotFound('errors.booking.serviceInactive');
    }

    if (
      !service.provider?.user ||
      service.provider.user.deletedAt ||
      service.provider.verificationStatus !== VerificationStatus.APPROVED
    ) {
      apiNotFound('errors.provider.notFound');
    }

    if (service.status !== ServiceStatus.ACTIVE) {
      apiBadRequest('errors.booking.serviceInactive');
    }

    const address = await this.addressRepo.findOne({
      where: { id: dto.addressId },
    });
    if (!address) {
      apiNotFound('errors.booking.addressNotFound');
    }
    if (address.userId !== userId) {
      apiForbidden('errors.booking.forbidden');
    }

    const activeAreas = (service.provider.serviceAreas ?? []).filter(
      (area) => area.isActive,
    );
    const areaEval = this.evaluateServiceArea(
      activeAreas,
      Number(address.latitude),
      Number(address.longitude),
    );

    const slotStatus = await this.evaluateSlotStatus(
      this.dataSource.manager,
      service.provider.id,
      service.durationMinutes,
      startAt,
      now,
    );

    const pricing = calculateBookingPrice({
      basePrice: Number(service.basePrice),
      priceUnit: service.priceUnit,
      durationMinutes: service.durationMinutes,
      distanceKm: areaEval.distanceKm ?? 0,
    });

    const isSelfBooking = service.provider.userId === userId;
    const providerIsOnline = service.provider.isOnline ?? true;

    let unavailableReason: string | null = null;
    if (isSelfBooking) {
      unavailableReason = translateApiMessage('errors.booking.selfBooking');
    } else if (!providerIsOnline) {
      unavailableReason = translateApiMessage('errors.booking.providerOffline');
    } else if (!areaEval.inServiceArea) {
      unavailableReason = translateApiMessage(
        'errors.booking.outOfServiceArea',
      );
    } else if (slotStatus !== 'AVAILABLE') {
      unavailableReason =
        slotStatus === 'HELD' || slotStatus === 'BOOKED'
          ? translateApiMessage('errors.booking.slotConflict')
          : translateApiMessage('errors.booking.slotUnavailable');
    }

    const scheduledEndAt = new Date(
      startAt.getTime() + service.durationMinutes * 60_000,
    );

    return {
      canBook: unavailableReason === null,
      unavailableReason,
      isSelfBooking,
      providerIsOnline,
      inServiceArea: areaEval.inServiceArea,
      slotStatus,
      scheduledStartAt: toVnIsoString(startAt),
      scheduledEndAt: toVnIsoString(scheduledEndAt),
      service: {
        id: service.id,
        title: service.title,
        basePrice: Number(service.basePrice),
        priceUnit: service.priceUnit,
        durationMinutes: service.durationMinutes,
        categoryName: service.category?.name ?? null,
      },
      provider: {
        id: service.provider.id,
        displayName: service.provider.displayName,
        avatarUrl: service.provider.user.image,
        isOnline: providerIsOnline,
        areaName: areaEval.matchedAreaName,
        radiusKm: areaEval.matchedRadiusKm,
      },
      address: {
        id: address.id,
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        ward: address.ward,
        district: address.district,
        city: address.city,
        postalCode: address.postalCode,
        latitude: Number(address.latitude),
        longitude: Number(address.longitude),
      },
      pricing,
    };
  }

  async uploadInitialImages(
    userId: string,
    files: Express.Multer.File[] | undefined,
  ): Promise<{ images: InspectionPhoto[] }> {
    const validFiles = await validateUploadedBookingImages(files);
    const nowIso = new Date().toISOString();

    const images = await Promise.all(
      validFiles.map(async (file) => {
        const ext = BOOKING_IMAGE_EXTENSIONS.get(file.mimetype) ?? 'jpg';
        const path = `bookings/initial/${userId}/${uuidv7()}.${ext}`;
        const url = await this.storageService.upload(
          path,
          file.buffer,
          file.mimetype,
        );
        return {
          url,
          capturedAt: nowIso,
        };
      }),
    );

    return { images };
  }

  async createBooking(userId: string, dto: CreateBookingDto) {
    const now = new Date();
    const startAt = new Date(dto.scheduledStartAt);
    if (Number.isNaN(startAt.getTime()) || startAt <= now) {
      apiBadRequest('errors.booking.invalidScheduleTime');
    }

    let createdId = '';

    try {
      await this.dataSource.transaction(async (manager) => {
        const service = await manager.getRepository(Service).findOne({
          where: { id: dto.serviceId },
          relations: {
            provider: {
              user: true,
              serviceAreas: true,
            },
          },
        });

        if (!service || service.status !== ServiceStatus.ACTIVE) {
          apiBadRequest('errors.booking.serviceInactive');
        }

        if (
          !service.provider?.user ||
          service.provider.user.deletedAt ||
          service.provider.verificationStatus !== VerificationStatus.APPROVED
        ) {
          apiNotFound('errors.provider.notFound');
        }

        if (service.provider.userId === userId) {
          apiBadRequest('errors.booking.selfBooking');
        }

        if (!(service.provider.isOnline ?? true)) {
          apiConflict('errors.booking.providerOffline');
        }

        // Khóa hồ sơ thợ để đồng bộ với addTimeOff và updateMyStatus
        const lockedProvider = await manager
          .getRepository(ProviderProfile)
          .findOne({
            where: { id: service.provider.id },
            select: { id: true, isOnline: true, verificationStatus: true },
            lock: { mode: 'pessimistic_write' },
          });
        if (
          !lockedProvider ||
          (lockedProvider.verificationStatus &&
            lockedProvider.verificationStatus !== VerificationStatus.APPROVED)
        ) {
          apiNotFound('errors.provider.notFound');
        }
        if (!(lockedProvider.isOnline ?? true)) {
          apiConflict('errors.booking.providerOffline');
        }

        const address = await manager.getRepository(Address).findOne({
          where: { id: dto.addressId },
        });
        if (!address) {
          apiNotFound('errors.booking.addressNotFound');
        }
        if (address.userId !== userId) {
          apiForbidden('errors.booking.forbidden');
        }

        const activeAreas = (service.provider.serviceAreas ?? []).filter(
          (area) => area.isActive,
        );
        const areaEval = this.evaluateServiceArea(
          activeAreas,
          Number(address.latitude),
          Number(address.longitude),
        );
        if (!areaEval.inServiceArea || areaEval.distanceKm === null) {
          apiBadRequest('errors.booking.outOfServiceArea');
        }

        const slotStatus = await this.evaluateSlotStatus(
          manager,
          service.provider.id,
          service.durationMinutes,
          startAt,
          now,
        );
        if (slotStatus === 'HELD' || slotStatus === 'BOOKED') {
          apiConflict('errors.booking.slotConflict');
        }
        if (slotStatus !== 'AVAILABLE') {
          apiConflict('errors.booking.slotUnavailable');
        }

        const pricing = calculateBookingPrice({
          basePrice: Number(service.basePrice),
          priceUnit: service.priceUnit,
          durationMinutes: service.durationMinutes,
          distanceKm: areaEval.distanceKm,
        });

        const scheduledEndAt = new Date(
          startAt.getTime() + service.durationMinutes * 60_000,
        );

        const addressSnapshot: BookingAddressSnapshot = {
          addressId: address.id,
          fullName: address.fullName,
          phone: address.phone,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          ward: address.ward,
          district: address.district,
          city: address.city,
          postalCode: address.postalCode,
          latitude: Number(address.latitude),
          longitude: Number(address.longitude),
          distanceKm: pricing.distanceKm,
          distanceFee: pricing.distanceFee,
          basePriceSnapshot: pricing.basePrice,
          priceUnitSnapshot: pricing.priceUnit,
          durationMinutesSnapshot: pricing.durationMinutes,
        };

        const inspectionImages: BookingInspectionData | null =
          dto.initialImages && dto.initialImages.length > 0
            ? {
                initial: dto.initialImages.map((img) => {
                  this.assertManagedImageUrl(
                    img.url,
                    `bookings/initial/${userId}/`,
                  );
                  return {
                    url: img.url,
                    caption: img.caption,
                    capturedAt: img.capturedAt,
                  };
                }),
              }
            : null;

        const datePrefix = todayInVietnam(startAt).replace(/-/g, '');
        const randomSuffix = randomBytes(3).toString('hex').toUpperCase();
        const bookingCode = `SV-${datePrefix}-${randomSuffix}`;

        const bookingRepository = manager.getRepository(Booking);
        const savedBooking = await bookingRepository.save(
          bookingRepository.create({
            bookingCode,
            customerId: userId,
            providerId: service.provider.id,
            serviceId: service.id,
            addressId: address.id,
            scheduledStartAt: startAt,
            scheduledEndAt,
            totalPrice: pricing.totalPrice,
            serviceTitleSnapshot: service.title,
            serviceAddressSnapshot: addressSnapshot,
            inspectionImages,
            customerNote: dto.customerNote?.trim() || null,
            status: BookingStatus.PENDING,
            cancelledBy: null,
            cancelReason: null,
          }),
        );

        const historyRepository = manager.getRepository(BookingStatusHistory);
        await historyRepository.save(
          historyRepository.create({
            bookingId: savedBooking.id,
            oldStatus: null,
            newStatus: BookingStatus.PENDING,
            changedBy: userId,
            reason: 'Khách hàng tạo đơn đặt lịch',
          }),
        );

        await this.bookingPaymentPort.initPayment(manager, {
          bookingId: savedBooking.id,
          bookingCode: savedBooking.bookingCode,
          amount: savedBooking.totalPrice,
          paymentMethod: dto.paymentMethod,
          description: `Thanh toán đơn đặt lịch ${savedBooking.bookingCode}`,
        });

        createdId = savedBooking.id;
      });
    } catch (error) {
      const pgCode = getPgDriverErrorCode(error);
      if (pgCode === '23P01') {
        apiConflict('errors.booking.slotConflict');
      }
      if (pgCode === '23503') {
        apiBadRequest('errors.booking.serviceInactive');
      }
      throw error;
    }

    return this.getBookingDetail(
      { id: userId, role: UserRole.CUSTOMER },
      createdId,
    );
  }

  async confirmBooking(providerUserId: string, bookingId: string) {
    await this.transitionBooking({
      bookingId,
      targetStatus: BookingStatus.CONFIRMED,
      actorUser: { id: providerUserId, role: UserRole.PROVIDER },
      forcedActorRole: 'PROVIDER',
      historyReason: 'Nhà cung cấp đã xác nhận nhận đơn',
      onBeforeTransition: async (manager, booking) => {
        const overlappingTimeOff = await manager
          .getRepository(ProviderTimeOff)
          .findOne({
            where: {
              providerId: booking.providerId,
              startAt: LessThan(booking.scheduledEndAt),
              endAt: MoreThan(booking.scheduledStartAt),
            },
            select: { id: true },
          });
        if (overlappingTimeOff) {
          apiConflict('errors.booking.slotUnavailable');
        }
      },
    });

    return this.getBookingDetail(
      { id: providerUserId, role: UserRole.PROVIDER },
      bookingId,
    );
  }

  async rejectBooking(
    providerUserId: string,
    bookingId: string,
    reason: string,
  ) {
    const cleanReason = reason.trim();
    if (!cleanReason) {
      apiBadRequest('errors.booking.reasonRequired');
    }

    await this.transitionBooking({
      bookingId,
      targetStatus: BookingStatus.REJECTED,
      actorUser: { id: providerUserId, role: UserRole.PROVIDER },
      forcedActorRole: 'PROVIDER',
      historyReason: cleanReason,
      onAfterStatusUpdate: async (manager, booking) => {
        await this.bookingPaymentPort.cancelOrRefund(
          manager,
          booking.id,
          cleanReason,
        );
      },
    });

    return this.getBookingDetail(
      { id: providerUserId, role: UserRole.PROVIDER },
      bookingId,
    );
  }

  async startBooking(providerUserId: string, bookingId: string) {
    await this.transitionBooking({
      bookingId,
      targetStatus: BookingStatus.IN_PROGRESS,
      actorUser: { id: providerUserId, role: UserRole.PROVIDER },
      forcedActorRole: 'PROVIDER',
      historyReason: 'Nhà cung cấp đã bắt đầu thực hiện công việc',
    });

    return this.getBookingDetail(
      { id: providerUserId, role: UserRole.PROVIDER },
      bookingId,
    );
  }

  async uploadInspectionImage(
    providerUserId: string,
    bookingId: string,
    kind: 'before' | 'after',
    file: Express.Multer.File | undefined,
  ): Promise<InspectionPhoto> {
    if (!file) {
      apiBadRequest('errors.booking.invalidImage');
    }

    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: { provider: true },
    });

    if (!booking) {
      apiNotFound('errors.booking.notFound');
    }

    if (booking.provider?.userId !== providerUserId) {
      apiForbidden('errors.booking.forbidden');
    }

    if (booking.status !== BookingStatus.IN_PROGRESS) {
      apiConflict('errors.booking.invalidTransition');
    }

    const ext = BOOKING_IMAGE_EXTENSIONS.get(file.mimetype) ?? 'jpg';
    const path = `bookings/inspections/${bookingId}/${kind}/${uuidv7()}.${ext}`;
    const url = await this.storageService.upload(
      path,
      file.buffer,
      file.mimetype,
    );

    return {
      url,
      capturedAt: new Date().toISOString(),
    };
  }

  async submitInspection(
    providerUserId: string,
    bookingId: string,
    dto: SubmitInspectionDto,
  ) {
    await this.dataSource.transaction(async (manager) => {
      const booking = await manager.getRepository(Booking).findOne({
        where: { id: bookingId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!booking) {
        apiNotFound('errors.booking.notFound');
      }

      const provider = await manager.getRepository(ProviderProfile).findOne({
        where: { id: booking.providerId },
        select: { id: true, userId: true },
      });

      if (!provider || provider.userId !== providerUserId) {
        apiForbidden('errors.booking.forbidden');
      }

      if (booking.status !== BookingStatus.IN_PROGRESS) {
        apiConflict('errors.booking.invalidTransition');
      }

      if (!dto.before?.length || !dto.after?.length) {
        apiBadRequest('errors.booking.missingInspectionImages');
      }

      const nextInspection: BookingInspectionData = {
        ...(booking.inspectionImages?.initial?.length
          ? { initial: booking.inspectionImages.initial }
          : {}),
        before: dto.before.map((item) => {
          this.assertManagedImageUrl(
            item.url,
            `bookings/inspections/${bookingId}/before/`,
          );
          return {
            url: item.url,
            ...(item.caption ? { caption: item.caption } : {}),
            capturedAt: item.capturedAt,
          };
        }),
        after: dto.after.map((item) => {
          this.assertManagedImageUrl(
            item.url,
            `bookings/inspections/${bookingId}/after/`,
          );
          return {
            url: item.url,
            ...(item.caption ? { caption: item.caption } : {}),
            capturedAt: item.capturedAt,
          };
        }),
        ...(dto.technicalSpecs?.length
          ? {
              technicalSpecs: dto.technicalSpecs.map((spec) => ({
                label: spec.label,
                value: spec.value,
                ...(spec.status ? { status: spec.status } : {}),
              })),
            }
          : {}),
        ...(dto.extraMaterials?.length
          ? {
              extraMaterials: dto.extraMaterials.map((item) => ({
                name: item.name,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                reason: item.reason,
              })),
            }
          : {}),
        ...(dto.fieldNote ? { fieldNote: dto.fieldNote } : {}),
        submittedAt: new Date().toISOString(),
      };

      booking.inspectionImages = nextInspection;
      await manager.getRepository(Booking).save(booking);
    });

    return this.getBookingDetail(
      { id: providerUserId, role: UserRole.PROVIDER },
      bookingId,
    );
  }

  async completeBooking(customerUserId: string, bookingId: string) {
    await this.transitionBooking({
      bookingId,
      targetStatus: BookingStatus.COMPLETED,
      actorUser: { id: customerUserId, role: UserRole.CUSTOMER },
      forcedActorRole: 'CUSTOMER',
      historyReason: 'Khách hàng xác nhận nghiệm thu và hoàn tất đơn',
      onAfterStatusUpdate: async (manager, booking) => {
        await this.bookingPaymentPort.markCompletedOnAcceptance(
          manager,
          booking.id,
        );
      },
    });

    return this.getBookingDetail(
      { id: customerUserId, role: UserRole.CUSTOMER },
      bookingId,
    );
  }

  async cancelBooking(
    actorUser: { id: string; role: UserRole },
    bookingId: string,
    reason: string,
  ) {
    const cleanReason = reason.trim();
    if (!cleanReason) {
      apiBadRequest('errors.booking.reasonRequired');
    }

    await this.transitionBooking({
      bookingId,
      targetStatus: BookingStatus.CANCELLED,
      actorUser,
      historyReason: cleanReason,
      onBeforeSave: (booking) => {
        booking.cancelledBy = actorUser.id;
        booking.cancelReason = cleanReason;
      },
      onAfterStatusUpdate: async (manager, booking) => {
        await this.bookingPaymentPort.cancelOrRefund(
          manager,
          booking.id,
          cleanReason,
        );
      },
    });

    return this.getBookingDetail(actorUser, bookingId);
  }

  async getMyBookings(customerUserId: string, query: GetMyBookingsQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const qb = this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.provider', 'provider')
      .leftJoinAndSelect('provider.user', 'providerUser')
      .leftJoinAndSelect('booking.service', 'service')
      .leftJoinAndSelect('service.category', 'category')
      .leftJoinAndSelect('booking.review', 'review')
      .where('booking.customerId = :customerUserId', { customerUserId });

    if (query.status) {
      qb.andWhere('booking.status = :status', { status: query.status });
    } else if (query.tab && query.tab !== 'all') {
      if (query.tab === 'pending') {
        qb.andWhere('booking.status = :status', {
          status: BookingStatus.PENDING,
        });
      } else if (query.tab === 'active') {
        qb.andWhere('booking.status IN (:...statuses)', {
          statuses: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
        });
      } else if (query.tab === 'completed') {
        qb.andWhere('booking.status = :status', {
          status: BookingStatus.COMPLETED,
        });
      } else if (query.tab === 'cancelled') {
        qb.andWhere('booking.status IN (:...statuses)', {
          statuses: [BookingStatus.CANCELLED, BookingStatus.REJECTED],
        });
      } else if (query.tab === 'unreviewed') {
        qb.andWhere('booking.status = :status', {
          status: BookingStatus.COMPLETED,
        }).andWhere('review.id IS NULL');
      }
    }

    qb.orderBy('booking.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    const paymentMap = await this.bookingPaymentPort.findLatestByBookingIds(
      items.map((item) => item.id),
    );

    const [statusCountsRaw, unreviewedCount] = await Promise.all([
      this.bookingRepo
        .createQueryBuilder('booking')
        .select('booking.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('booking.customerId = :customerUserId', { customerUserId })
        .groupBy('booking.status')
        .getRawMany<{ status: BookingStatus; count: string }>(),
      this.bookingRepo
        .createQueryBuilder('booking')
        .leftJoin('booking.review', 'review')
        .where('booking.customerId = :customerUserId', { customerUserId })
        .andWhere('booking.status = :completedStatus', {
          completedStatus: BookingStatus.COMPLETED,
        })
        .andWhere('review.id IS NULL')
        .getCount(),
    ]);

    const countByStatus = new Map<BookingStatus, number>();
    for (const row of statusCountsRaw) {
      countByStatus.set(row.status, Number(row.count) || 0);
    }

    const pendingCount = countByStatus.get(BookingStatus.PENDING) ?? 0;
    const activeCount =
      (countByStatus.get(BookingStatus.CONFIRMED) ?? 0) +
      (countByStatus.get(BookingStatus.IN_PROGRESS) ?? 0);
    const completedCount = countByStatus.get(BookingStatus.COMPLETED) ?? 0;
    const cancelledCount =
      (countByStatus.get(BookingStatus.CANCELLED) ?? 0) +
      (countByStatus.get(BookingStatus.REJECTED) ?? 0);

    return {
      counts: {
        all: pendingCount + activeCount + completedCount + cancelledCount,
        pending: pendingCount,
        active: activeCount,
        completed: completedCount,
        cancelled: cancelledCount,
        unreviewed: unreviewedCount,
      },
      items: items.map((item) =>
        this.serializeBookingSummary(item, paymentMap.get(item.id) ?? null),
      ),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getBookingDetail(
    actorUser: { id: string; role: UserRole },
    bookingId: string,
  ) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: {
        customer: true,
        provider: {
          user: true,
        },
        service: {
          category: true,
        },
        cancelledByUser: true,
        review: true,
        statusHistories: {
          changedByUser: true,
        },
      },
      order: {
        statusHistories: {
          createdAt: 'ASC',
        },
      },
    });

    if (!booking) {
      apiNotFound('errors.booking.notFound');
    }

    const isCustomer = booking.customerId === actorUser.id;
    const isProvider = booking.provider?.userId === actorUser.id;
    const isAdmin = actorUser.role === UserRole.ADMIN;

    if (!isCustomer && !isProvider && !isAdmin) {
      apiForbidden('errors.booking.forbidden');
    }

    const payments = await this.bookingPaymentPort.findByBookingId(booking.id);
    const latestPayment = payments[0] ?? null;
    const existingReview = booking.review ?? null;
    const canReview =
      isCustomer &&
      booking.status === BookingStatus.COMPLETED &&
      !existingReview;

    return {
      ...this.serializeBookingSummary(booking, latestPayment),
      customerNote: booking.customerNote,
      cancelReason: booking.cancelReason,
      cancelledBy: booking.cancelledBy,
      cancelledByUser: booking.cancelledByUser
        ? {
            id: booking.cancelledByUser.id,
            name: booking.cancelledByUser.name,
            role: booking.cancelledByUser.role,
          }
        : null,
      serviceAddressSnapshot: booking.serviceAddressSnapshot,
      inspectionImages: booking.inspectionImages,
      hasRequiredInspection: hasRequiredInspectionPhotos(
        booking.inspectionImages,
      ),
      canReview,
      review: existingReview
        ? {
            id: existingReview.id,
            bookingId: existingReview.bookingId,
            rating: existingReview.rating,
            priceMatched: existingReview.priceMatched,
            comment: existingReview.comment,
            createdAt: toVnIsoString(existingReview.createdAt),
            updatedAt: toVnIsoString(
              existingReview.updatedAt ?? existingReview.createdAt,
            ),
          }
        : null,
      payments,
      statusHistories: (booking.statusHistories ?? []).map((history) => ({
        id: history.id,
        oldStatus: history.oldStatus,
        newStatus: history.newStatus,
        changedBy: history.changedBy,
        changedByName: history.changedByUser?.name ?? null,
        reason: history.reason,
        createdAt: toVnIsoString(history.createdAt),
      })),
    };
  }

  async getProviderBookings(
    providerUserId: string,
    query: GetProviderBookingsQueryDto,
  ) {
    const profile = await this.profileRepo.findOne({
      where: { userId: providerUserId },
      select: { id: true, isOnline: true },
    });

    if (!profile) {
      apiNotFound('errors.provider.profileNotFound');
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const today = todayInVietnam();
    const todayStart = vnDateTime(today, '00:00');
    const todayEnd = vnDateTime(addDays(today, 1), '00:00');

    const qb = this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('booking.provider', 'provider')
      .leftJoinAndSelect('provider.user', 'providerUser')
      .leftJoinAndSelect('booking.service', 'service')
      .leftJoinAndSelect('service.category', 'category')
      .where('booking.providerId = :providerId', { providerId: profile.id });

    if (query.date) {
      if (!isValidDateOnly(query.date)) {
        apiBadRequest('errors.slots.invalidDate');
      }
      const dayStart = vnDateTime(query.date, '00:00');
      const dayEnd = vnDateTime(addDays(query.date, 1), '00:00');
      qb.andWhere('booking.scheduledStartAt >= :dayStart', { dayStart });
      qb.andWhere('booking.scheduledStartAt < :dayEnd', { dayEnd });
    }

    if (query.status) {
      qb.andWhere('booking.status = :status', { status: query.status });
    } else if (query.tab && query.tab !== 'all') {
      if (query.tab === 'today') {
        qb.andWhere('booking.scheduledStartAt >= :todayStart', { todayStart });
        qb.andWhere('booking.scheduledStartAt < :todayEnd', { todayEnd });
        qb.andWhere('booking.status IN (:...todayStatuses)', {
          todayStatuses: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
        });
      } else if (query.tab === 'pending') {
        qb.andWhere('booking.status = :status', {
          status: BookingStatus.PENDING,
        });
      } else if (query.tab === 'confirmed') {
        qb.andWhere('booking.status = :status', {
          status: BookingStatus.CONFIRMED,
        });
      } else if (query.tab === 'in_progress') {
        qb.andWhere('booking.status = :status', {
          status: BookingStatus.IN_PROGRESS,
        });
      } else if (query.tab === 'active') {
        qb.andWhere('booking.status IN (:...statuses)', {
          statuses: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
        });
      } else if (query.tab === 'completed') {
        qb.andWhere('booking.status = :status', {
          status: BookingStatus.COMPLETED,
        });
      } else if (query.tab === 'cancelled') {
        qb.andWhere('booking.status IN (:...statuses)', {
          statuses: [BookingStatus.CANCELLED, BookingStatus.REJECTED],
        });
      }
    }

    if (query.tab === 'today' || query.date) {
      qb.orderBy('booking.scheduledStartAt', 'ASC');
    } else {
      qb.orderBy('booking.createdAt', 'DESC');
    }

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    const paymentMap = await this.bookingPaymentPort.findLatestByBookingIds(
      items.map((item) => item.id),
    );

    const [statusCountsRaw, todayCount] = await Promise.all([
      this.bookingRepo
        .createQueryBuilder('booking')
        .select('booking.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('booking.providerId = :providerId', { providerId: profile.id })
        .groupBy('booking.status')
        .getRawMany<{ status: BookingStatus; count: string }>(),
      this.bookingRepo
        .createQueryBuilder('booking')
        .where('booking.providerId = :providerId', { providerId: profile.id })
        .andWhere('booking.scheduledStartAt >= :todayStart', { todayStart })
        .andWhere('booking.scheduledStartAt < :todayEnd', { todayEnd })
        .andWhere('booking.status IN (:...todayStatuses)', {
          todayStatuses: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
        })
        .getCount(),
    ]);

    const countByStatus = new Map<BookingStatus, number>();
    for (const row of statusCountsRaw) {
      countByStatus.set(row.status, Number(row.count) || 0);
    }

    const pending = countByStatus.get(BookingStatus.PENDING) ?? 0;
    const confirmed = countByStatus.get(BookingStatus.CONFIRMED) ?? 0;
    const inProgress = countByStatus.get(BookingStatus.IN_PROGRESS) ?? 0;
    const completed = countByStatus.get(BookingStatus.COMPLETED) ?? 0;
    const cancelled =
      (countByStatus.get(BookingStatus.CANCELLED) ?? 0) +
      (countByStatus.get(BookingStatus.REJECTED) ?? 0);

    return {
      counts: {
        all: pending + confirmed + inProgress + completed + cancelled,
        today: todayCount,
        pending,
        confirmed,
        inProgress,
        active: confirmed + inProgress,
        completed,
        cancelled,
      },
      items: items.map((item) =>
        this.serializeBookingSummary(item, paymentMap.get(item.id) ?? null),
      ),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getProviderWallet(
    providerUserId: string,
    query: GetProviderWalletQueryDto,
  ) {
    const profile = await this.profileRepo.findOne({
      where: { userId: providerUserId },
      select: { id: true },
    });

    if (!profile) {
      apiNotFound('errors.provider.profileNotFound');
    }

    const currentMonth = todayInVietnam().slice(0, 7);
    const selectedMonth = query.month ?? currentMonth;
    const { start: monthStart, end: monthEnd } = monthRangeInVn(selectedMonth);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const months = buildMonthSequence(currentMonth, 6);
    const chartStart = monthRangeInVn(months[0]).start;
    const chartEnd = monthRangeInVn(currentMonth).end;

    const [monthAgg, inProgressAgg, lifetimeAgg, chartRows, txRawResult] =
      await Promise.all([
        this.bookingRepo
          .createQueryBuilder('booking')
          .select('COALESCE(SUM(booking.totalPrice), 0)', 'revenue')
          .addSelect('COUNT(*)', 'count')
          .where('booking.providerId = :providerId', {
            providerId: profile.id,
          })
          .andWhere('booking.status = :status', {
            status: BookingStatus.COMPLETED,
          })
          .andWhere(`${COMPLETED_AT_EXPR} >= :monthStart`, { monthStart })
          .andWhere(`${COMPLETED_AT_EXPR} < :monthEnd`, { monthEnd })
          .getRawOne<{ revenue: string; count: string }>(),

        this.bookingRepo
          .createQueryBuilder('booking')
          .select('COALESCE(SUM(booking.totalPrice), 0)', 'revenue')
          .addSelect('COUNT(*)', 'count')
          .where('booking.providerId = :providerId', {
            providerId: profile.id,
          })
          .andWhere('booking.status IN (:...statuses)', {
            statuses: ACTIVE_BOOKING_STATUSES,
          })
          .getRawOne<{ revenue: string; count: string }>(),

        this.bookingRepo
          .createQueryBuilder('booking')
          .select('COALESCE(SUM(booking.totalPrice), 0)', 'revenue')
          .addSelect('COUNT(*)', 'count')
          .where('booking.providerId = :providerId', {
            providerId: profile.id,
          })
          .andWhere('booking.status = :status', {
            status: BookingStatus.COMPLETED,
          })
          .getRawOne<{ revenue: string; count: string }>(),

        this.bookingRepo
          .createQueryBuilder('booking')
          .select(
            `to_char((${COMPLETED_AT_EXPR}) AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM')`,
            'month',
          )
          .addSelect('COALESCE(SUM(booking.totalPrice), 0)', 'revenue')
          .addSelect('COUNT(*)', 'count')
          .where('booking.providerId = :providerId', {
            providerId: profile.id,
          })
          .andWhere('booking.status = :status', {
            status: BookingStatus.COMPLETED,
          })
          .andWhere(`${COMPLETED_AT_EXPR} >= :chartStart`, { chartStart })
          .andWhere(`${COMPLETED_AT_EXPR} < :chartEnd`, { chartEnd })
          .groupBy(
            `to_char((${COMPLETED_AT_EXPR}) AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM')`,
          )
          .getRawMany<{ month: string; revenue: string; count: string }>(),

        this.bookingRepo
          .createQueryBuilder('booking')
          .leftJoinAndSelect('booking.customer', 'customer')
          .addSelect(COMPLETED_AT_EXPR, 'booking_completed_at')
          .where('booking.providerId = :providerId', {
            providerId: profile.id,
          })
          .andWhere('booking.status = :status', {
            status: BookingStatus.COMPLETED,
          })
          .andWhere(`${COMPLETED_AT_EXPR} >= :monthStart`, { monthStart })
          .andWhere(`${COMPLETED_AT_EXPR} < :monthEnd`, { monthEnd })
          .orderBy('booking_completed_at', 'DESC')
          .offset(skip)
          .limit(limit)
          .getRawAndEntities<{ booking_completed_at: Date | string }>(),
      ]);

    const chartMap = new Map<
      string,
      { revenue: number; completedCount: number }
    >();
    for (const row of chartRows) {
      chartMap.set(row.month, {
        revenue: Math.round(Number(row.revenue) || 0),
        completedCount: Number(row.count) || 0,
      });
    }

    const monthlyChart = months.map((month) => {
      const [y, m] = month.split('-');
      const data = chartMap.get(month) ?? { revenue: 0, completedCount: 0 };
      return {
        month,
        label: `T${Number(m)}/${y.slice(2)}`,
        revenue: data.revenue,
        completedCount: data.completedCount,
      };
    });

    const txItems = txRawResult.entities;
    const txRawRows = txRawResult.raw;
    const txTotal = Number(monthAgg?.count) || 0;
    const paymentMap = await this.bookingPaymentPort.findLatestByBookingIds(
      txItems.map((item) => item.id),
    );

    return {
      month: selectedMonth,
      summary: {
        completedThisMonth: Math.round(Number(monthAgg?.revenue) || 0),
        completedCountThisMonth: txTotal,
        inProgressRevenue: Math.round(Number(inProgressAgg?.revenue) || 0),
        inProgressCount: Number(inProgressAgg?.count) || 0,
        totalLifetimeRevenue: Math.round(Number(lifetimeAgg?.revenue) || 0),
        totalCompletedCount: Number(lifetimeAgg?.count) || 0,
      },
      monthlyChart,
      transactions: {
        items: txItems.map((item, idx) => {
          const payment = paymentMap.get(item.id) ?? null;
          const rawCompletedAt = txRawRows[idx]?.booking_completed_at;
          const completedAtDate = rawCompletedAt
            ? new Date(rawCompletedAt)
            : item.updatedAt;
          return {
            id: item.id,
            bookingCode: item.bookingCode,
            serviceTitle: item.serviceTitleSnapshot,
            customerName:
              item.customer?.name ?? item.serviceAddressSnapshot.fullName,
            scheduledStartAt: toVnIsoString(item.scheduledStartAt),
            completedAt: toVnIsoString(completedAtDate),
            totalPrice: Number(item.totalPrice),
            distanceFee: item.serviceAddressSnapshot?.distanceFee ?? 0,
            paymentMethod: payment?.paymentMethod ?? null,
            paymentStatus: payment?.status ?? null,
            latestPayment: payment,
          };
        }),
        total: txTotal,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(txTotal / limit)),
      },
    };
  }

  private assertManagedImageUrl(url: string, expectedPrefix: string): void {
    const storagePath = this.storageService.getPathFromUrl(url);
    if (
      !storagePath ||
      storagePath.includes('..') ||
      !storagePath.startsWith(expectedPrefix)
    ) {
      apiBadRequest('errors.booking.invalidImageUrl');
    }
  }

  private evaluateServiceArea(
    areas: ProviderServiceArea[],
    lat: number,
    lng: number,
  ): AreaEvaluation {
    if (areas.length === 0) {
      return {
        inServiceArea: false,
        distanceKm: null,
        matchedAreaName: null,
        matchedRadiusKm: null,
      };
    }

    let bestMatchedDist = Infinity;
    let bestMatchedArea: ProviderServiceArea | null = null;
    let closestDist = Infinity;
    let closestArea: ProviderServiceArea | null = null;

    for (const area of areas) {
      const dist = calculateHaversineKm(
        lat,
        lng,
        Number(area.centerLatitude),
        Number(area.centerLongitude),
      );
      const radiusKm = Number(area.radiusKm);

      if (dist <= radiusKm && dist < bestMatchedDist) {
        bestMatchedDist = dist;
        bestMatchedArea = area;
      }

      if (dist < closestDist) {
        closestDist = dist;
        closestArea = area;
      }
    }

    if (bestMatchedArea) {
      return {
        inServiceArea: true,
        distanceKm: Math.round(bestMatchedDist * 10) / 10,
        matchedAreaName: bestMatchedArea.areaName,
        matchedRadiusKm: Number(bestMatchedArea.radiusKm),
      };
    }

    return {
      inServiceArea: false,
      distanceKm: Math.round(closestDist * 10) / 10,
      matchedAreaName: closestArea?.areaName ?? null,
      matchedRadiusKm: closestArea ? Number(closestArea.radiusKm) : null,
    };
  }

  private async evaluateSlotStatus(
    manager: EntityManager,
    providerId: string,
    durationMinutes: number,
    startAt: Date,
    now: Date,
  ): Promise<'AVAILABLE' | 'HELD' | 'BOOKED' | 'UNAVAILABLE'> {
    if (startAt <= now) return 'UNAVAILABLE';

    const dateVn = todayInVietnam(startAt);
    const todayVn = todayInVietnam(now);
    if (dateVn < todayVn || dateVn > addDays(todayVn, MAX_DAYS_AHEAD)) {
      return 'UNAVAILABLE';
    }

    const dayStart = vnDateTime(dateVn, '00:00');
    const dayEnd = vnDateTime(addDays(dateVn, 1), '00:00');

    const [windows, timeOffs, busyBookings] = await Promise.all([
      manager.getRepository(ProviderAvailability).find({
        where: { providerId, dayOfWeek: dayOfWeekOf(dateVn), isActive: true },
      }),
      manager.getRepository(ProviderTimeOff).find({
        where: {
          providerId,
          startAt: LessThan(dayEnd),
          endAt: MoreThan(dayStart),
        },
      }),
      manager.getRepository(Booking).find({
        where: {
          providerId,
          status: In(ACTIVE_BOOKING_STATUSES),
          scheduledStartAt: LessThan(dayEnd),
          scheduledEndAt: MoreThan(dayStart),
        },
        select: {
          scheduledStartAt: true,
          scheduledEndAt: true,
          status: true,
          bookingCode: true,
        },
      }),
    ]);

    const busy = busyBookings.map((booking) => ({
      startAt: booking.scheduledStartAt,
      endAt: booking.scheduledEndAt,
      status:
        booking.status === BookingStatus.PENDING
          ? ('HELD' as const)
          : ('BOOKED' as const),
      bookingCode: booking.bookingCode,
    }));

    const slots = buildDaySlots({
      date: dateVn,
      durationMinutes,
      windows,
      timeOffs,
      busy,
      now,
    });

    const matched = slots.find(
      (slot) => slot.startAt.getTime() === startAt.getTime(),
    );

    return matched ? matched.status : 'UNAVAILABLE';
  }

  private async transitionBooking(input: {
    bookingId: string;
    targetStatus: BookingStatus;
    actorUser: { id: string; role: UserRole };
    forcedActorRole?: BookingActorRole;
    historyReason: string;
    onBeforeTransition?: (
      manager: EntityManager,
      booking: Booking,
    ) => Promise<void>;
    onBeforeSave?: (booking: Booking) => void;
    onAfterStatusUpdate?: (
      manager: EntityManager,
      booking: Booking,
    ) => Promise<void>;
  }) {
    let chatEvent: {
      bookingId: string;
      bookingCode: string;
      customerId: string;
      providerUserId: string;
      providerDisplayName: string;
    } | null = null;

    await this.dataSource.transaction(async (manager) => {
      const bookingRepo = manager.getRepository(Booking);
      const booking = await bookingRepo.findOne({
        where: { id: input.bookingId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!booking) {
        apiNotFound('errors.booking.notFound');
      }

      const provider = await manager.getRepository(ProviderProfile).findOne({
        where: { id: booking.providerId },
        select: { id: true, userId: true, displayName: true },
      });

      const isCustomerOwner = booking.customerId === input.actorUser.id;
      const isProviderOwner = provider?.userId === input.actorUser.id;
      const isAdmin = input.actorUser.role === UserRole.ADMIN;

      let actorRole: BookingActorRole;
      if (input.forcedActorRole === 'CUSTOMER') {
        if (!isCustomerOwner) apiForbidden('errors.booking.forbidden');
        actorRole = 'CUSTOMER';
      } else if (input.forcedActorRole === 'PROVIDER') {
        if (!isProviderOwner) apiForbidden('errors.booking.forbidden');
        actorRole = 'PROVIDER';
      } else if (isCustomerOwner) {
        actorRole = 'CUSTOMER';
      } else if (isProviderOwner) {
        actorRole = 'PROVIDER';
      } else if (isAdmin) {
        actorRole = 'ADMIN';
      } else {
        apiForbidden('errors.booking.forbidden');
      }

      const oldStatus = booking.status;

      assertBookingTransition({
        currentStatus: oldStatus,
        targetStatus: input.targetStatus,
        actor: actorRole,
        hasInspectionImages: hasRequiredInspectionPhotos(
          booking.inspectionImages,
        ),
      });

      if (input.onBeforeTransition) {
        await input.onBeforeTransition(manager, booking);
      }

      booking.status = input.targetStatus;
      input.onBeforeSave?.(booking);
      const savedBooking = await bookingRepo.save(booking);

      const historyRepo = manager.getRepository(BookingStatusHistory);
      await historyRepo.save(
        historyRepo.create({
          bookingId: savedBooking.id,
          oldStatus,
          newStatus: input.targetStatus,
          changedBy: input.actorUser.id,
          reason: input.historyReason,
        }),
      );

      if (input.onAfterStatusUpdate) {
        await input.onAfterStatusUpdate(manager, savedBooking);
      }

      if (provider?.userId) {
        chatEvent = {
          bookingId: savedBooking.id,
          bookingCode: savedBooking.bookingCode,
          customerId: savedBooking.customerId,
          providerUserId: provider.userId,
          providerDisplayName: provider.displayName ?? 'Nhà cung cấp',
        };
      }
    });

    if (chatEvent && this.chatService) {
      const ev = chatEvent;
      const content = this.buildBookingSystemMessage(
        ev.bookingCode,
        ev.providerDisplayName,
        input.targetStatus,
        input.historyReason,
      );
      if (content) {
        try {
          await this.chatService.createSystemMessageForBooking({
            bookingId: ev.bookingId,
            customerId: ev.customerId,
            providerUserId: ev.providerUserId,
            actorUserId: input.actorUser.id,
            content,
          });
        } catch {
          // Không làm gián đoạn giao dịch chuyển trạng thái đơn nếu đồng bộ tin nhắn hệ thống lỗi
        }
      }
    }
  }

  private buildBookingSystemMessage(
    bookingCode: string,
    providerDisplayName: string,
    targetStatus: BookingStatus,
    reason: string,
  ): string | null {
    switch (targetStatus) {
      case BookingStatus.CONFIRMED:
        return `Đơn đặt lịch #${bookingCode} đã được Nhà cung cấp ${providerDisplayName} xác nhận`;
      case BookingStatus.IN_PROGRESS:
        return `Nhà cung cấp ${providerDisplayName} đã bắt đầu thực hiện đơn #${bookingCode}`;
      case BookingStatus.COMPLETED:
        return `Đơn đặt lịch #${bookingCode} đã hoàn tất nghiệm thu thành công`;
      case BookingStatus.REJECTED:
        return `Đơn đặt lịch #${bookingCode} đã bị từ chối: ${reason}`;
      case BookingStatus.CANCELLED:
        return `Đơn đặt lịch #${bookingCode} đã bị hủy: ${reason}`;
      default:
        return null;
    }
  }

  private serializeBookingSummary(
    booking: Booking,
    latestPayment: BookingPaymentSummary | null,
  ) {
    return {
      id: booking.id,
      bookingCode: booking.bookingCode,
      status: booking.status,
      scheduledStartAt: toVnIsoString(booking.scheduledStartAt),
      scheduledEndAt: toVnIsoString(booking.scheduledEndAt),
      totalPrice: Number(booking.totalPrice),
      serviceTitleSnapshot: booking.serviceTitleSnapshot,
      addressSummary: {
        fullName: booking.serviceAddressSnapshot.fullName,
        phone: booking.serviceAddressSnapshot.phone,
        addressLine1: booking.serviceAddressSnapshot.addressLine1,
        ward: booking.serviceAddressSnapshot.ward,
        district: booking.serviceAddressSnapshot.district,
        city: booking.serviceAddressSnapshot.city,
        distanceKm: booking.serviceAddressSnapshot.distanceKm,
        distanceFee: booking.serviceAddressSnapshot.distanceFee,
        basePriceSnapshot: booking.serviceAddressSnapshot.basePriceSnapshot,
        priceUnitSnapshot: booking.serviceAddressSnapshot.priceUnitSnapshot,
        durationMinutesSnapshot:
          booking.serviceAddressSnapshot.durationMinutesSnapshot,
      },
      hasInspectionReport: Boolean(booking.inspectionImages?.submittedAt),
      inspectionSubmittedAt: booking.inspectionImages?.submittedAt ?? null,
      hasReview: Boolean(booking.review),
      service: booking.service
        ? {
            id: booking.service.id,
            title: booking.service.title,
            categoryName: booking.service.category?.name ?? null,
          }
        : {
            id: booking.serviceId,
            title: booking.serviceTitleSnapshot,
            categoryName: null,
          },
      provider: booking.provider
        ? {
            id: booking.provider.id,
            userId: booking.provider.userId,
            displayName: booking.provider.displayName,
            phone: booking.provider.phone,
            avatarUrl: booking.provider.user?.image ?? null,
            isOnline: booking.provider.isOnline ?? true,
          }
        : null,
      customer: booking.customer
        ? {
            id: booking.customer.id,
            name: booking.customer.name,
            phone: booking.customer.phone,
            avatarUrl: booking.customer.image,
          }
        : {
            id: booking.customerId,
            name: booking.serviceAddressSnapshot.fullName,
            phone: booking.serviceAddressSnapshot.phone,
            avatarUrl: null,
          },
      latestPayment,
      createdAt: toVnIsoString(booking.createdAt),
      updatedAt: toVnIsoString(booking.updatedAt),
    };
  }
}
