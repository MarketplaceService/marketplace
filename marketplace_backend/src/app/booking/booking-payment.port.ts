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
  payosOrderCode: number | null;
  paymentLinkUrl: string | null;
  paymentDetails: Record<string, unknown> | null;
  expiresAt: string | null;
  paidAt: string | null;
  refundedAt: string | null;
}

/**
 * Cổng nối trừu tượng giữa BookingModule (#133) và PaymentModule (#150).
 * Các thao tác ghi nhận EntityManager của transaction hiện hành để đảm bảo atomic.
 * activatePayment và releaseGatewayLinks chạy sau khi transaction đã commit, vì chúng gọi cổng
 * thanh toán bên ngoài và không được giữ khóa hồ sơ thợ trong lúc chờ.
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

  /** Tạo link ở cổng thanh toán cho giao dịch vừa tạo. Không bao giờ ném lỗi */
  abstract activatePayment(
    bookingId: string,
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

  /** Hủy link ở cổng thanh toán của các giao dịch vừa bị hủy. Không bao giờ ném lỗi */
  abstract releaseGatewayLinks(bookingId: string): Promise<void>;

  abstract findByBookingId(bookingId: string): Promise<BookingPaymentSummary[]>;

  abstract findLatestByBookingIds(
    bookingIds: string[],
  ): Promise<Map<string, BookingPaymentSummary>>;
}

/** Bản rỗng, chỉ còn dùng trong test */
@Injectable()
export class NoopPaymentPort extends BookingPaymentPort {
  initPayment(): Promise<BookingPaymentSummary | null> {
    return Promise.resolve(null);
  }

  activatePayment(): Promise<BookingPaymentSummary | null> {
    return Promise.resolve(null);
  }

  markCompletedOnAcceptance(): Promise<BookingPaymentSummary | null> {
    return Promise.resolve(null);
  }

  cancelOrRefund(): Promise<BookingPaymentSummary | null> {
    return Promise.resolve(null);
  }

  releaseGatewayLinks(): Promise<void> {
    return Promise.resolve();
  }

  findByBookingId(): Promise<BookingPaymentSummary[]> {
    return Promise.resolve<BookingPaymentSummary[]>([]);
  }

  findLatestByBookingIds(): Promise<Map<string, BookingPaymentSummary>> {
    return Promise.resolve(new Map<string, BookingPaymentSummary>());
  }
}
