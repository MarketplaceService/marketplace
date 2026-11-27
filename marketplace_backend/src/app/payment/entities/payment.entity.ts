import { Booking } from 'src/app/booking/entities/booking.entity';
import { BaseUuidEntity } from 'src/config/database/base-uuid.entity';
import { PaymentMethod } from 'src/shared/types/payment-method.enum';
import { PaymentStatus } from 'src/shared/types/payment-status.enum';
import { decimalColumnTransformer } from 'src/shared/utils/decimal-column.transformer';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
  ValueTransformer,
} from 'typeorm';

// pg trả bigint dưới dạng string. orderCode luôn nhỏ hơn Number.MAX_SAFE_INTEGER nên đổi sang number an toàn
const bigintNumberTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | number | null) =>
    value === null || value === undefined ? null : Number(value),
};

// Cột payment_details là text theo thiết kế DB, nội dung là JSON
const jsonTextTransformer: ValueTransformer = {
  to: (value?: Record<string, unknown> | null) =>
    value === null || value === undefined ? null : JSON.stringify(value),
  from: (value?: string | null): Record<string, unknown> | null => {
    if (!value) return null;
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  },
};

/**
 * Một lần thử thanh toán của đơn đặt lịch. Một đơn có thể có nhiều dòng (thanh toán lại, đổi phương thức).
 * Số tiền luôn do backend lấy từ booking.total_price.
 */
@Entity('payment')
@Index('idx_payment_booking', ['bookingId', 'createdAt'])
@Index('idx_payment_status', ['status', 'createdAt'])
@Unique('uq_payment_transaction_id', ['transactionId'])
@Unique('uq_payment_payos_order_code', ['payosOrderCode'])
@Unique('uq_payment_link_id', ['paymentLinkId'])
@Check('chk_payment_amount_positive', 'amount > 0')
export class Payment extends BaseUuidEntity {
  @Column({ type: 'uuid' })
  bookingId: string;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    enumName: 'payment_method_enum',
  })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: decimalColumnTransformer,
  })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'VND' })
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'payment_status_detail_enum',
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  // Mã tham chiếu giao dịch ngân hàng (reference trong webhook PayOS)
  @Column({ type: 'varchar', length: 150, nullable: true })
  transactionId: string | null;

  @Column({
    type: 'bigint',
    nullable: true,
    transformer: bigintNumberTransformer,
  })
  payosOrderCode: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentLinkId: string | null;

  @Column({ type: 'text', nullable: true })
  paymentLinkUrl: string | null;

  @Column({ type: 'text', nullable: true, transformer: jsonTextTransformer })
  paymentDetails: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  refundedAt: Date | null;

  // Tên FK khớp migration CreatePaymentTable để migration:generate không đề xuất tạo lại
  @ManyToOne(() => Booking, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'booking_id',
    foreignKeyConstraintName: 'FK_payment_booking',
  })
  booking: Booking;
}
