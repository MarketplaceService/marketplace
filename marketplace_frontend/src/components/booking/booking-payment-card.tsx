"use client";

import { PaymentStatusBadge } from "@/components/booking/booking-status-badge";
import {
  PaymentRetryButtons,
  PayosPaymentPanel,
} from "@/components/booking/payos-payment-panel";
import { usePaymentMethods } from "@/hooks/use-payment";
import {
  getPaymentMethodLabel,
  isPaymentLinkExpired,
  isPaymentPending,
} from "@/lib/payment";
import { FREE_TRAVEL_KM, formatVnd } from "@/lib/travel-fee";
import { formatVnDateTime } from "@/lib/vn-time";
import type {
  BookingDetail,
  BookingPaymentSummary,
  BookingStatus,
} from "@/types/booking.types";
import { CheckCircle2, ReceiptText, ShieldCheck, Undo2 } from "lucide-react";

const OPEN_BOOKING_STATUSES: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
];

function PaidNote({ payment }: { payment: BookingPaymentSummary }) {
  return (
    <div className="space-y-1 rounded-xl border border-emerald-300/70 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-200">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <CheckCircle2 className="size-4" />
        {payment.paidAt
          ? `Đã thanh toán lúc ${formatVnDateTime(payment.paidAt)}`
          : "Đã thanh toán"}
      </p>
      {payment.transactionId && (
        <p className="font-mono">Mã giao dịch: {payment.transactionId}</p>
      )}
    </div>
  );
}

function RefundNote({ payment }: { payment: BookingPaymentSummary }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-sky-300/70 bg-sky-50 p-3 text-xs leading-relaxed text-sky-900 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-200">
      <Undo2 className="mt-0.5 size-4 shrink-0" />
      <span>
        Khoản thanh toán {formatVnd(payment.amount)} được ghi nhận hoàn tiền. Servigo sẽ chuyển lại
        tiền cho khách bằng chuyển khoản thủ công.
      </span>
    </div>
  );
}

function unpaidPayosMessage(payment: BookingPaymentSummary) {
  if (payment.status === "failed") return "Chưa tạo được link thanh toán PayOS.";
  if (payment.status === "cancelled") {
    return payment.paymentDetails?.cancellationReason
      ? `Giao dịch PayOS đã hủy: ${payment.paymentDetails.cancellationReason}.`
      : "Giao dịch PayOS đã bị hủy.";
  }
  if (payment.status === "expired" || isPaymentLinkExpired(payment)) {
    return "Link thanh toán PayOS đã hết hạn.";
  }
  return "Giao dịch PayOS chưa có link thanh toán.";
}

/**
 * Bảng kê giá và trạng thái thanh toán của đơn (screen4).
 * canManagePayment: người xem là khách của đơn, được thanh toán lại hoặc đổi phương thức.
 */
export function BookingPaymentCard({
  booking,
  canManagePayment,
}: {
  booking: BookingDetail;
  canManagePayment: boolean;
}) {
  const snapshot = booking.serviceAddressSnapshot;
  const serviceSubtotal =
    snapshot.priceUnitSnapshot === "HOURLY"
      ? Math.round(
          snapshot.basePriceSnapshot *
            (snapshot.durationMinutesSnapshot / 60),
        )
      : snapshot.basePriceSnapshot;

  const payment = booking.latestPayment;
  const canAct = canManagePayment && OPEN_BOOKING_STATUSES.includes(booking.status);
  const { data: methods } = usePaymentMethods({ enabled: canAct });
  const payosEnabled =
    methods?.some((item) => item.method === "payos" && item.enabled) ?? false;

  const renderPaymentState = (current: BookingPaymentSummary) => {
    if (current.status === "completed") return <PaidNote payment={current} />;
    if (current.status === "refunded") return <RefundNote payment={current} />;

    if (current.paymentMethod === "payos") {
      const linkUsable =
        isPaymentPending(current.status) &&
        Boolean(current.paymentLinkUrl) &&
        (current.status === "processing" || !isPaymentLinkExpired(current));

      if (linkUsable) {
        return canAct ? (
          <PayosPaymentPanel
            key={current.id}
            bookingId={booking.id}
            payment={current}
            payosEnabled={payosEnabled}
          />
        ) : (
          <p className="rounded-xl border border-amber-300/70 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
            {current.status === "processing"
              ? "Ngân hàng đang xử lý giao dịch PayOS của khách."
              : "Chưa thanh toán: khách đang được chờ thanh toán qua PayOS."}
          </p>
        );
      }

      return (
        <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-3">
          <p className="text-sm text-foreground">{unpaidPayosMessage(current)}</p>
          {canAct && (
            <PaymentRetryButtons
              bookingId={booking.id}
              offerPayos={payosEnabled}
              offerCod
            />
          )}
        </div>
      );
    }

    if (current.status === "pending") {
      return (
        <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-3">
          <p className="text-sm text-foreground">
            Trả <strong>{formatVnd(current.amount)}</strong> tiền mặt cho thợ sau khi nghiệm thu
            đạt yêu cầu.
          </p>
          {canAct && payosEnabled && (
            <PaymentRetryButtons
              bookingId={booking.id}
              offerPayos
              offerCod={false}
              payosLabel="Trả trước qua PayOS"
            />
          )}
        </div>
      );
    }

    return (
      <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-3">
        <p className="text-sm text-foreground">Giao dịch tiền mặt đã hủy.</p>
        {canAct && (
          <PaymentRetryButtons
            bookingId={booking.id}
            offerPayos={payosEnabled}
            offerCod
          />
        )}
      </div>
    );
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ReceiptText className="size-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">
            Chi tiết thanh toán
          </h2>
        </div>
        {payment ? (
          <PaymentStatusBadge status={payment.status} />
        ) : (
          <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Thanh toán khi nghiệm thu
          </span>
        )}
      </div>

      <div className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">
            Giá dịch vụ ({snapshot.durationMinutesSnapshot} phút)
          </span>
          <span className="font-medium text-foreground">
            {formatVnd(serviceSubtotal)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">
            Phí di chuyển ({snapshot.distanceKm} km, miễn phí ≤ {FREE_TRAVEL_KM} km)
          </span>
          <span className="font-medium text-foreground">
            {snapshot.distanceFee === 0
              ? "Miễn phí"
              : formatVnd(snapshot.distanceFee)}
          </span>
        </div>

        {payment && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Phương thức thanh toán</span>
            <span className="font-medium text-foreground text-right">
              {getPaymentMethodLabel(payment.paymentMethod)}
            </span>
          </div>
        )}

        <div className="border-t border-border pt-2.5 flex items-baseline justify-between">
          <span className="font-bold text-foreground">Tổng thanh toán</span>
          <span className="text-xl font-bold text-primary">
            {formatVnd(booking.totalPrice)}
          </span>
        </div>
      </div>

      {payment && renderPaymentState(payment)}

      <p className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>
          Số tiền này được giữ cố định từ lúc đặt lịch. Vật tư phát sinh (nếu có) chỉ thanh toán riêng khi hai bên đồng ý trực tiếp tại chỗ.
        </span>
      </p>
    </section>
  );
}
