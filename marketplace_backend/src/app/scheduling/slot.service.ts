import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProviderProfile } from 'src/app/provider/entities/provider-profile.entity';
import { apiBadRequest, apiNotFound } from 'src/shared/helpers/api-i18n';
import { VerificationStatus } from 'src/shared/types/verification-status.enum';
import {
  addDays,
  dayOfWeekOf,
  isValidDateOnly,
  todayInVietnam,
  toVnIsoString,
  vnDateTime,
  VN_TIMEZONE,
} from 'src/shared/utils/vn-time';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { ProviderBookingCalendar } from './booking-calendar';
import { AvailableSlotsQueryDto } from './dto/available-slots.dto';
import { ProviderAvailability } from './entities/provider-availability.entity';
import { ProviderTimeOff } from './entities/provider-time-off.entity';
import { buildDaySlots } from './slot-calculator';

export const MAX_DAYS_AHEAD = 30;
export const DEFAULT_SLOT_MINUTES = 60;

@Injectable()
export class SlotService {
  constructor(
    @InjectRepository(ProviderProfile)
    private readonly profileRepository: Repository<ProviderProfile>,
    @InjectRepository(ProviderAvailability)
    private readonly availabilityRepository: Repository<ProviderAvailability>,
    @InjectRepository(ProviderTimeOff)
    private readonly timeOffRepository: Repository<ProviderTimeOff>,
    private readonly bookingCalendar: ProviderBookingCalendar,
  ) {}

  async getAvailableSlots(
    providerId: string,
    query: AvailableSlotsQueryDto,
    now = new Date(),
  ) {
    const { date } = query;
    const durationMinutes = query.durationMinutes ?? DEFAULT_SLOT_MINUTES;

    if (!isValidDateOnly(date)) apiBadRequest('errors.slots.invalidDate');

    const today = todayInVietnam(now);
    if (date < today) apiBadRequest('errors.slots.pastDate');
    if (date > addDays(today, MAX_DAYS_AHEAD)) {
      apiBadRequest('errors.slots.outOfRange');
    }

    const provider = await this.profileRepository.findOne({
      where: {
        id: providerId,
        verificationStatus: VerificationStatus.APPROVED,
      },
      relations: { user: true },
    });
    // Tài khoản đã xóa mềm thì không còn hồ sơ công khai
    if (!provider?.user || provider.user.deletedAt) {
      apiNotFound('errors.provider.notFound');
    }

    const dayStart = vnDateTime(date, '00:00');
    const dayEnd = vnDateTime(addDays(date, 1), '00:00');

    const [windows, timeOffs, busy] = await Promise.all([
      this.availabilityRepository.find({
        where: { providerId, dayOfWeek: dayOfWeekOf(date), isActive: true },
      }),
      this.timeOffRepository.find({
        where: {
          providerId,
          startAt: LessThan(dayEnd),
          endAt: MoreThan(dayStart),
        },
      }),
      this.bookingCalendar.findBusyIntervals(providerId, dayStart, dayEnd),
    ]);

    const slots = buildDaySlots({
      date,
      durationMinutes,
      windows,
      timeOffs,
      busy,
      now,
    });

    return {
      providerId,
      date,
      timezone: VN_TIMEZONE,
      durationMinutes,
      slots: slots.map((slot) => ({
        startAt: toVnIsoString(slot.startAt),
        endAt: toVnIsoString(slot.endAt),
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status,
      })),
    };
  }
}
