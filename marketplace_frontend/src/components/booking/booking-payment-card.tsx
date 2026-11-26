"use client";

import { PaymentStatusBadge } from "@/components/booking/booking-status-badge";
import { FREE_TRAVEL_KM, formatVnd } from "@/lib/travel-fee";
import type { BookingDetail } from "@/types/booking.types";
import { ReceiptText, ShieldCheck } from "lucide-react";

/**
 * Thẻ hiển thị bảng kê giá cố định và trạng thái thanh toán của đơn đặt lịch (screen4).
 * Issue #150 (Module Payment) sẽ mở rộng khu vực dưới cùng để hiển thị QR VietQR / link PayOS.
 */
export function BookingPaymentCard({ booking }: { booking: BookingDetail }) {
  const snapshot = booking.serviceAddressSnapshot;
  const basePrice = Number(snapshot?.basePriceSnapshot ?? booking.totalPrice ?? 0);
  const durationMinutes = Number(snapshot?.durationMinutesSnapshot ?? 60);
  const distanceKm = Number(snapshot?.distanceKm ?? 0);
  const distanceFee = Number(snapshot?.distanceFee ?? 0);
  const serviceSubtotal =
    snapshot?.priceUnitSnapshot === "HOURLY"
      ? Math.round(basePrice * (durationMinutes / 60))
      : basePrice;

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ReceiptText className="size-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">
            Chi tiết thanh toán
          </h2>
        </div>
        {booking.latestPayment ? (
          <PaymentStatusBadge status={booking.latestPayment.status} />
        ) : (
          <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Thanh toán khi nghiệm thu
          </span>
        )}
      </div>

      <div className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">
            Giá dịch vụ ({durationMinutes} phút)
          </span>
          <span className="font-medium text-foreground">
            {formatVnd(serviceSubtotal)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">
            Phí di chuyển ({distanceKm} km, miễn phí ≤ {FREE_TRAVEL_KM} km)
          </span>
          <span className="font-medium text-foreground">
            {distanceFee === 0 ? "Miễn phí" : formatVnd(distanceFee)}
          </span>
        </div>

        <div className="border-t border-border pt-2.5 flex items-baseline justify-between">
          <span className="font-bold text-foreground">Tổng thanh toán sàn</span>
          <span className="text-xl font-bold text-primary">
            {formatVnd(booking.totalPrice)}
          </span>
        </div>
      </div>

      {booking.latestPayment && (
        <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
          <p>
            Phương thức:{" "}
            <strong className="uppercase text-foreground">
              {booking.latestPayment.paymentMethod}
            </strong>
          </p>
          {booking.latestPayment.transactionId && (
            <p className="font-mono">
              Mã giao dịch: {booking.latestPayment.transactionId}
            </p>
          )}
        </div>
      )}

      <p className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>
          Số tiền này được giữ cố định từ lúc đặt lịch. Vật tư phát sinh (nếu có) chỉ thanh toán riêng khi hai bên đồng ý trực tiếp tại chỗ.
        </span>
      </p>
    </section>
  );
}
