import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingStatusHistory } from '../booking/entities/booking-status-history.entity';
import { Booking } from '../booking/entities/booking.entity';
import { ProviderProfile } from '../provider/entities/provider-profile.entity';
import { Review } from './entities/review.entity';
import { ReviewService } from './review.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Review,
      Booking,
      BookingStatusHistory,
      ProviderProfile,
    ]),
  ],
  providers: [ReviewService],
  exports: [ReviewService, TypeOrmModule],
})
export class ReviewModule {}
