import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingPaymentPort } from 'src/app/booking/booking-payment.port';
import { Booking } from 'src/app/booking/entities/booking.entity';
import { Payment } from './entities/payment.entity';
import {
  BookingPaymentController,
  PaymentController,
  PayosWebhookController,
} from './payment.controller';
import { PaymentService } from './payment.service';
import { PayosService } from './payos/payos.service';
import { TypeOrmPaymentPort } from './typeorm-payment.port';

// Không import BookingModule (BookingModule import module này), chỉ dùng repository Booking
@Module({
  imports: [TypeOrmModule.forFeature([Payment, Booking])],
  controllers: [
    PaymentController,
    PayosWebhookController,
    BookingPaymentController,
  ],
  providers: [
    PayosService,
    PaymentService,
    TypeOrmPaymentPort,
    { provide: BookingPaymentPort, useExisting: TypeOrmPaymentPort },
  ],
  exports: [BookingPaymentPort],
})
export class PaymentModule {}
