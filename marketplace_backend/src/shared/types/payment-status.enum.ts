// Khớp kiểu payment_status_detail_enum trong Postgres. Trạng thái giao dịch độc lập với trạng thái đơn
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  REFUNDED = 'refunded',
}
