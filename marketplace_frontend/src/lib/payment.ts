import type {
  BookingPaymentSummary,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/types/booking.types";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: "Tiền mặt khi nghiệm thu",
  payos: "Chuyển khoản VietQR (PayOS)",
  bank_transfer: "Chuyển khoản ngân hàng",
  vnpay: "VNPAY",
  momo: "MoMo",
  zalopay: "ZaloPay",
};

export function getPaymentMethodLabel(method: string | null | undefined): string {
  if (!method) return "Chưa chọn";
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;
}

/** Còn chờ tiền về: polling tiếp */
export function isPaymentPending(status: PaymentStatus | undefined): boolean {
  return status === "pending" || status === "processing";
}

/** Link PayOS đã quá hạn dù database chưa kịp ghi expired */
export function isPaymentLinkExpired(
  payment: Pick<BookingPaymentSummary, "expiresAt">,
  now = Date.now(),
): boolean {
  return Boolean(payment.expiresAt && new Date(payment.expiresAt).getTime() <= now);
}

const OPEN_BOOKING_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "IN_PROGRESS"];

/** Khách được tạo lần thanh toán mới (thanh toán lại hoặc đổi phương thức) */
export function canRetryPayment(
  payment: BookingPaymentSummary | null,
  bookingStatus: BookingStatus,
): boolean {
  if (!OPEN_BOOKING_STATUSES.includes(bookingStatus)) return false;
  if (!payment) return true;
  if (payment.status === "completed" || payment.status === "refunded") return false;
  return payment.status !== "processing";
}

/** Đơn đã sẵn sàng nghiệm thu về mặt thanh toán: tiền mặt trả lúc nghiệm thu, PayOS phải trả xong */
export function isPaymentReadyForAcceptance(payment: BookingPaymentSummary | null): boolean {
  if (!payment) return true;
  if (payment.status === "completed") return true;
  return payment.paymentMethod === "cod" && payment.status === "pending";
}

/** Chỉ chuyển trang khi link thuộc PayOS, tránh mở một địa chỉ lạ nếu dữ liệu bị sửa */
export function redirectToPayos(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const trusted =
      parsed.protocol === "https:" &&
      (parsed.hostname === "payos.vn" || parsed.hostname.endsWith(".payos.vn"));
    if (!trusted) return false;
    window.location.assign(parsed.toString());
    return true;
  } catch {
    return false;
  }
}
