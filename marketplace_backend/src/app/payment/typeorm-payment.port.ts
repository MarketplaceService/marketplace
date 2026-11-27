import { Injectable } from '@nestjs/common';
import {
  BookingPaymentPort,
  BookingPaymentSummary,
} from 'src/app/booking/booking-payment.port';
import { EntityManager } from 'typeorm';
import { PaymentService } from './payment.service';

/** Bản thật của BookingPaymentPort, đọc và ghi bảng payment */
@Injectable()
export class TypeOrmPaymentPort extends BookingPaymentPort {
  constructor(private readonly payments: PaymentService) {
    super();
  }

  initPayment(
    manager: EntityManager,
    input: {
      bookingId: string;
      bookingCode: string;
      amount: number;
      paymentMethod?: string;
      description: string;
    },
  ): Promise<BookingPaymentSummary | null> {
    // description dài của booking không dùng được cho PayOS (tối đa 9 ký tự), PaymentService tự tạo
    return this.payments.initPayment(manager, {
      bookingId: input.bookingId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
    });
  }

  activatePayment(bookingId: string): Promise<BookingPaymentSummary | null> {
    return this.payments.activatePayment(bookingId);
  }

  markCompletedOnAcceptance(
    manager: EntityManager,
    bookingId: string,
  ): Promise<BookingPaymentSummary | null> {
    return this.payments.markCompletedOnAcceptance(manager, bookingId);
  }

  cancelOrRefund(
    manager: EntityManager,
    bookingId: string,
    reason: string,
  ): Promise<BookingPaymentSummary | null> {
    return this.payments.cancelOrRefund(manager, bookingId, reason);
  }

  releaseGatewayLinks(bookingId: string): Promise<void> {
    return this.payments.releaseGatewayLinks(bookingId);
  }

  findByBookingId(bookingId: string): Promise<BookingPaymentSummary[]> {
    return this.payments.findByBookingId(bookingId);
  }

  findLatestByBookingIds(
    bookingIds: string[],
  ): Promise<Map<string, BookingPaymentSummary>> {
    return this.payments.findLatestByBookingIds(bookingIds);
  }
}
