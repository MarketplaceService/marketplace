import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking } from 'src/app/booking/entities/booking.entity';
import { BookingStatus } from 'src/shared/types/booking-status.enum';
import { In, LessThan, MoreThan, Repository } from 'typeorm';
import { BusyInterval, ProviderBookingCalendar } from './booking-calendar';

const ACTIVE_BOOKING_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
];

@Injectable()
export class TypeOrmBookingCalendar extends ProviderBookingCalendar {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {
    super();
  }

  async findBusyIntervals(
    providerId: string,
    from: Date,
    to: Date,
  ): Promise<BusyInterval[]> {
    const bookings = await this.bookingRepository.find({
      where: {
        providerId,
        status: In(ACTIVE_BOOKING_STATUSES),
        scheduledStartAt: LessThan(to),
        scheduledEndAt: MoreThan(from),
      },
      select: {
        scheduledStartAt: true,
        scheduledEndAt: true,
        status: true,
        bookingCode: true,
      },
      order: { scheduledStartAt: 'ASC' },
    });

    return bookings.map((booking) => ({
      startAt: booking.scheduledStartAt,
      endAt: booking.scheduledEndAt,
      status: booking.status === BookingStatus.PENDING ? 'HELD' : 'BOOKED',
      bookingCode: booking.bookingCode,
    }));
  }
}
