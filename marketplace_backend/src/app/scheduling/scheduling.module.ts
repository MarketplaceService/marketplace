import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderProfile } from '../provider/entities/provider-profile.entity';
import {
  EmptyBookingCalendar,
  ProviderBookingCalendar,
} from './booking-calendar';
import { ProviderAvailability } from './entities/provider-availability.entity';
import { ProviderTimeOff } from './entities/provider-time-off.entity';
import { ProviderScheduleController } from './provider-schedule.controller';
import { ProviderSlotsController } from './provider-slots.controller';
import { ScheduleService } from './schedule.service';
import { SlotService } from './slot.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProviderProfile,
      ProviderAvailability,
      ProviderTimeOff,
    ]),
  ],
  controllers: [ProviderScheduleController, ProviderSlotsController],
  providers: [
    ScheduleService,
    SlotService,
    // #133: thay bằng bản đọc bảng booking khi module đặt lịch hoàn thành
    { provide: ProviderBookingCalendar, useClass: EmptyBookingCalendar },
  ],
})
export class SchedulingModule {}
