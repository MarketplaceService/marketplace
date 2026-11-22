import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Address } from '../address/entities/address.entity';
import { ProviderProfile } from '../provider/entities/provider-profile.entity';
import { ProviderServiceArea } from '../provider/entities/provider-service-area.entity';
import { ProviderAvailability } from '../scheduling/entities/provider-availability.entity';
import { ProviderTimeOff } from '../scheduling/entities/provider-time-off.entity';
import { Service } from '../service/entities/service.entity';
import { StorageModule } from '../storage/storage.module';
import { BookingPaymentPort, NoopPaymentPort } from './booking-payment.port';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingStatusHistory } from './entities/booking-status-history.entity';
import { Booking } from './entities/booking.entity';
import { ProviderBookingController } from './provider-booking.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingStatusHistory,
      Service,
      ProviderProfile,
      ProviderServiceArea,
      Address,
      ProviderAvailability,
      ProviderTimeOff,
    ]),
    StorageModule,
  ],
  controllers: [BookingController, ProviderBookingController],
  providers: [
    BookingService,
    { provide: BookingPaymentPort, useClass: NoopPaymentPort },
  ],
  exports: [BookingService, BookingPaymentPort],
})
export class BookingModule {}
