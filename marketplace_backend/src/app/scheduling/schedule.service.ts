import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProviderProfile } from 'src/app/provider/entities/provider-profile.entity';
import {
  apiBadRequest,
  apiConflict,
  apiNotFound,
} from 'src/shared/helpers/api-i18n';
import { timeToMinutes } from 'src/shared/utils/vn-time';
import { EntityManager, MoreThan, Repository } from 'typeorm';
import { ProviderBookingCalendar } from './booking-calendar';
import {
  AvailabilityBlockDto,
  UpdateAvailabilityDto,
} from './dto/availability.dto';
import { CreateTimeOffDto } from './dto/time-off.dto';
import { ProviderAvailability } from './entities/provider-availability.entity';
import { ProviderTimeOff } from './entities/provider-time-off.entity';

interface TimeWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const AVAILABILITY_ORDER = { dayOfWeek: 'ASC', startTime: 'ASC' } as const;

const windowsOverlap = (a: TimeWindow, b: TimeWindow) =>
  a.dayOfWeek === b.dayOfWeek &&
  timeToMinutes(a.startTime) < timeToMinutes(b.endTime) &&
  timeToMinutes(b.startTime) < timeToMinutes(a.endTime);

function assertValidRange({ startTime, endTime }: TimeWindow) {
  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    apiBadRequest('errors.schedule.invalidTimeRange');
  }
}

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(ProviderProfile)
    private readonly profileRepository: Repository<ProviderProfile>,
    @InjectRepository(ProviderAvailability)
    private readonly availabilityRepository: Repository<ProviderAvailability>,
    @InjectRepository(ProviderTimeOff)
    private readonly timeOffRepository: Repository<ProviderTimeOff>,
    private readonly bookingCalendar: ProviderBookingCalendar,
  ) {}

  async listAvailability(userId: string) {
    const providerId = await this.findProviderId(userId);
    return this.availabilityRepository.find({
      where: { providerId },
      order: AVAILABILITY_ORDER,
    });
  }

  async replaceAvailability(userId: string, blocks: AvailabilityBlockDto[]) {
    blocks.forEach(assertValidRange);
    blocks.forEach((block, index) => {
      if (
        blocks.slice(index + 1).some((other) => windowsOverlap(block, other))
      ) {
        apiConflict('errors.schedule.overlap');
      }
    });

    return this.availabilityRepository.manager.transaction(async (manager) => {
      const providerId = await this.lockProvider(manager, userId);
      const repository = manager.getRepository(ProviderAvailability);

      await repository.delete({ providerId });
      await repository.save(
        blocks.map((block) =>
          repository.create({
            ...block,
            isActive: block.isActive ?? true,
            providerId,
          }),
        ),
      );

      return repository.find({
        where: { providerId },
        order: AVAILABILITY_ORDER,
      });
    });
  }

  async addAvailability(userId: string, block: AvailabilityBlockDto) {
    assertValidRange(block);

    return this.availabilityRepository.manager.transaction(async (manager) => {
      const providerId = await this.lockProvider(manager, userId);
      const repository = manager.getRepository(ProviderAvailability);

      const sameDay = await repository.find({
        where: { providerId, dayOfWeek: block.dayOfWeek },
      });
      // Ca đang tắt vẫn tính, vì bật lại sẽ chồng lên ca mới
      if (sameDay.some((existing) => windowsOverlap(existing, block))) {
        apiConflict('errors.schedule.overlap');
      }

      return repository.save(
        repository.create({
          ...block,
          isActive: block.isActive ?? true,
          providerId,
        }),
      );
    });
  }

  updateAvailability(userId: string, id: string, dto: UpdateAvailabilityDto) {
    return this.availabilityRepository.manager.transaction(async (manager) => {
      const providerId = await this.lockProvider(manager, userId);
      const repository = manager.getRepository(ProviderAvailability);

      const block = await repository.findOne({ where: { id, providerId } });
      if (!block) {
        apiNotFound('errors.schedule.notFound');
      }

      const next: TimeWindow = {
        dayOfWeek: block.dayOfWeek,
        startTime: dto.startTime ?? block.startTime,
        endTime: dto.endTime ?? block.endTime,
      };

      if (dto.startTime !== undefined || dto.endTime !== undefined) {
        assertValidRange(next);
        const sameDay = await repository.find({
          where: { providerId, dayOfWeek: block.dayOfWeek },
        });
        if (
          sameDay.some(
            (other) => other.id !== block.id && windowsOverlap(other, next),
          )
        ) {
          apiConflict('errors.schedule.overlap');
        }
      }

      block.startTime = next.startTime;
      block.endTime = next.endTime;
      if (dto.isActive !== undefined) block.isActive = dto.isActive;

      return repository.save(block);
    });
  }

  async listTimeOffs(userId: string, now = new Date()) {
    const providerId = await this.findProviderId(userId);
    return this.timeOffRepository.find({
      where: { providerId, endAt: MoreThan(now) },
      order: { startAt: 'ASC' },
    });
  }

  async addTimeOff(userId: string, dto: CreateTimeOffDto, now = new Date()) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (endAt <= startAt) apiBadRequest('errors.timeOff.invalidRange');
    if (endAt <= now) apiBadRequest('errors.timeOff.ended');

    const providerId = await this.findProviderId(userId);

    // Đơn đã xác nhận có vòng đời riêng, nên báo xung đột thay vì tự hủy đơn
    const busy = await this.bookingCalendar.findBusyIntervals(
      providerId,
      startAt,
      endAt,
    );
    const conflicts = busy.filter(
      (interval) =>
        interval.status === 'BOOKED' &&
        interval.startAt < endAt &&
        startAt < interval.endAt,
    );
    if (conflicts.length > 0) {
      const codes = conflicts
        .map((interval) => interval.bookingCode)
        .filter(Boolean)
        .join(', ');
      apiConflict('errors.timeOff.bookingConflict', codes || undefined);
    }

    return this.timeOffRepository.save(
      this.timeOffRepository.create({
        providerId,
        startAt,
        endAt,
        reason: dto.reason,
      }),
    );
  }

  async removeTimeOff(userId: string, id: string) {
    const providerId = await this.findProviderId(userId);
    const result = await this.timeOffRepository.delete({ id, providerId });

    if (!result.affected) {
      apiNotFound('errors.timeOff.notFound');
    }

    return { id };
  }

  private async findProviderId(userId: string) {
    const profile = await this.profileRepository.findOne({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      apiNotFound('errors.provider.profileNotFound');
    }

    return profile.id;
  }

  // Khóa hồ sơ thợ để hai request sửa lịch cùng lúc không tạo ra ca chồng nhau
  private async lockProvider(manager: EntityManager, userId: string) {
    const profile = await manager.getRepository(ProviderProfile).findOne({
      where: { userId },
      select: { id: true },
      lock: { mode: 'pessimistic_write' },
    });

    if (!profile) {
      apiNotFound('errors.provider.profileNotFound');
    }

    return profile.id;
  }
}
