import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../booking/entities/booking.entity';
import { ProviderProfile } from '../provider/entities/provider-profile.entity';
import { ProviderBookingCalendar } from './booking-calendar';
import { ProviderAvailability } from './entities/provider-availability.entity';
import { ProviderTimeOff } from './entities/provider-time-off.entity';
import { ProviderScheduleController } from './provider-schedule.controller';
import { ProviderSlotsController } from './provider-slots.controller';
import { ScheduleService } from './schedule.service';
import { SlotService } from './slot.service';
import { TypeOrmBookingCalendar } from './typeorm-booking-calendar';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProviderProfile,
      ProviderAvailability,
      ProviderTimeOff,
      Booking,
    ]),
  ],
  controllers: [ProviderScheduleController, ProviderSlotsController],
  providers: [
    ScheduleService,
    SlotService,
    { provide: ProviderBookingCalendar, useClass: TypeOrmBookingCalendar },
  ],
  exports: [SlotService, ProviderBookingCalendar],
})
export class SchedulingModule {}
