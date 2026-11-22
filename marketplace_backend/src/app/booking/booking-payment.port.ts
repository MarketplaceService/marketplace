import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

export interface BookingPaymentSummary {
  id: string;
  bookingId: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  status: string;
  transactionId: string | null;
  paymentLinkUrl: string | null;
  paymentDetails: Record<string, unknown> | null;
  expiresAt: string | null;
  paidAt: string | null;
  refundedAt: string | null;
}

/**
 * Cổng nối trừu tượng giữa BookingModule (#133) và PaymentModule (#150).
 * Toàn bộ thao tác ghi nhận EntityManager của transaction hiện hành để đảm bảo atomic.
 */
export abstract class BookingPaymentPort {
  abstract initPayment(
    manager: EntityManager,
    input: {
      bookingId: string;
      bookingCode: string;
      amount: number;
      paymentMethod?: string;
      description: string;
    },
  ): Promise<BookingPaymentSummary | null>;

  abstract markCompletedOnAcceptance(
    manager: EntityManager,
    bookingId: string,
  ): Promise<BookingPaymentSummary | null>;

  abstract cancelOrRefund(
    manager: EntityManager,
    bookingId: string,
    reason: string,
  ): Promise<BookingPaymentSummary | null>;

  abstract findByBookingId(bookingId: string): Promise<BookingPaymentSummary[]>;

  abstract findLatestByBookingIds(
    bookingIds: string[],
  ): Promise<Map<string, BookingPaymentSummary>>;
}

/** Bản mặc định khi chưa tích hợp bảng payment */
@Injectable()
export class NoopPaymentPort extends BookingPaymentPort {
  initPayment(): Promise<BookingPaymentSummary | null> {
    return Promise.resolve(null);
  }

  markCompletedOnAcceptance(): Promise<BookingPaymentSummary | null> {
    return Promise.resolve(null);
  }

  cancelOrRefund(): Promise<BookingPaymentSummary | null> {
    return Promise.resolve(null);
  }

  findByBookingId(): Promise<BookingPaymentSummary[]> {
    return Promise.resolve<BookingPaymentSummary[]>([]);
  }

  findLatestByBookingIds(): Promise<Map<string, BookingPaymentSummary>> {
    return Promise.resolve(new Map<string, BookingPaymentSummary>());
  }
}
