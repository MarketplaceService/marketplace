"use client";

import { Button } from "@/components/ui/button";
import {
  usePaymentMethods,
  usePaymentStatus,
  useRetryPayment,
  useSyncPayment,
} from "@/hooks/use-payment";
import { canRetryPayment, isPaymentPending } from "@/lib/payment";
import { formatVnd } from "@/lib/travel-fee";
import { formatVnDateTime } from "@/lib/vn-time";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Undo2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// Khách vừa từ PayOS quay về: hỏi lại PayOS định kỳ một lúc, phòng khi webhook không tới được máy local
const AUTO_SYNC_INTERVAL_MS = 6_000;
const AUTO_SYNC_WINDOW_MS = 2 * 60_000;

function ResultCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12 sm:px-8">
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-xs space-y-5">
        {icon}
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {children}
      </div>
    </main>
  );
}

/**
 * Trang PayOS chuyển khách về sau khi trả tiền hoặc bấm hủy (return URL và cancel URL).
 * Tham số trên URL không có chữ ký nên chỉ dùng để hiện tạm; kết quả thật lấy từ endpoint đồng bộ.
 */
export function PaymentResultView({
  paymentId,
  cancelledHint,
}: {
  paymentId: string;
  cancelledHint: boolean;
}) {
  const router = useRouter();
  const { data, isLoading, isError } = usePaymentStatus(paymentId, { poll: true });
  const {
    mutate: syncSilently,
    isPending: isFirstSyncPending,
    isIdle: isFirstSyncIdle,
  } = useSyncPayment({ silent: true });
  const { mutate: syncNow, isPending: isSyncing } = useSyncPayment();
  const { mutate: retry, isPending: isRetrying, variables } = useRetryPayment();
  const syncedForRef = useRef<string | null>(null);

  const bookingStatus = data?.booking.status;
  const canRetry = data ? canRetryPayment(data.payment, data.booking.status) : false;
  const { data: methods } = usePaymentMethods({ enabled: canRetry });
  const payosEnabled =
    methods?.some((item) => item.method === "payos" && item.enabled) ?? false;

  useEffect(() => {
    if (syncedForRef.current === paymentId) return;
    syncedForRef.current = paymentId;
    syncSilently(paymentId);
  }, [paymentId, syncSilently]);

  // Polling GET chỉ đọc database; khi chưa có webhook, chỉ lệnh sync mới đưa trạng thái PayOS về
  const shouldAutoSync =
    Boolean(data) && isPaymentPending(data?.payment.status) && !cancelledHint;
  useEffect(() => {
    if (!shouldAutoSync) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - startedAt > AUTO_SYNC_WINDOW_MS) {
        window.clearInterval(timer);
        return;
      }
      syncSilently(paymentId);
    }, AUTO_SYNC_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [shouldAutoSync, paymentId, syncSilently]);

  if (isError) {
    return (
      <ResultCard
        icon={<AlertCircle className="mx-auto size-12 text-warning" />}
        title="Không tìm thấy giao dịch"
      >
        <p className="text-sm text-muted-foreground">
          Giao dịch không tồn tại hoặc không thuộc tài khoản của bạn.
        </p>
        <Link
          href="/bookings"
          className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Về danh sách đơn
        </Link>
      </ResultCard>
    );
  }

  if (isLoading || !data) {
    return (
      <ResultCard
        icon={<Loader2 className="mx-auto size-12 animate-spin text-primary" />}
        title="Đang kiểm tra kết quả thanh toán"
      >
        <p className="text-sm text-muted-foreground">Vui lòng đợi trong giây lát...</p>
      </ResultCard>
    );
  }

  const { payment, booking } = data;
  const bookingHref = `/bookings/${booking.id}`;
  const firstSyncDone = !isFirstSyncIdle && !isFirstSyncPending;

  const backToBooking = (
    <Link
      href={bookingHref}
      className="inline-flex h-11 items-center rounded-xl border border-border px-5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
    >
      Về trang đơn {booking.bookingCode}
    </Link>
  );

  if (payment.status === "completed") {
    return (
      <ResultCard
        icon={<CheckCircle2 className="mx-auto size-12 text-primary" />}
        title="Thanh toán thành công"
      >
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            Đơn <strong className="text-foreground">{booking.bookingCode}</strong> đã được thanh
            toán <strong className="text-foreground">{formatVnd(payment.amount)}</strong>.
          </p>
          {payment.paidAt && <p>Thời gian: {formatVnDateTime(payment.paidAt)}</p>}
          {payment.transactionId && (
            <p className="font-mono text-xs">Mã giao dịch: {payment.transactionId}</p>
          )}
        </div>
        <Link
          href={bookingHref}
          className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Xem đơn đặt lịch
        </Link>
      </ResultCard>
    );
  }

  if (payment.status === "refunded") {
    return (
      <ResultCard
        icon={<Undo2 className="mx-auto size-12 text-sky-600" />}
        title="Khoản thanh toán được ghi nhận hoàn tiền"
      >
        <p className="text-sm text-muted-foreground">
          Đơn đã kết thúc hoặc đã được thanh toán bằng giao dịch khác. Servigo sẽ chuyển lại{" "}
          {formatVnd(payment.amount)} cho bạn bằng chuyển khoản thủ công.
        </p>
        {backToBooking}
      </ResultCard>
    );
  }

  // Khách quay về từ nút Hủy của PayOS (cancel=true): coi là đã hủy dù PayOS chưa kịp báo, để
  // khách thanh toán lại hoặc đổi phương thức thay vì chờ mãi. Tham số này chỉ đổi phần hiển thị
  const showCancelled =
    payment.status === "cancelled" ||
    (cancelledHint && isPaymentPending(payment.status));

  if (isPaymentPending(payment.status) && !showCancelled) {
    return (
      <ResultCard
        icon={<Loader2 className="mx-auto size-12 animate-spin text-primary" />}
        title={
          payment.status === "processing"
            ? "Ngân hàng đang xử lý giao dịch"
            : "Đang xác nhận thanh toán"
        }
      >
        <p className="text-sm text-muted-foreground">
          Trang tự cập nhật khi PayOS báo đã nhận tiền. Nếu bạn đã chuyển khoản mà lâu chưa thấy cập
          nhật, bấm kiểm tra lại.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSyncing}
            onClick={() => syncNow(payment.id)}
            className="min-h-[44px]"
          >
            {isSyncing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Kiểm tra lại
          </Button>
          {backToBooking}
        </div>
      </ResultCard>
    );
  }

  const title = showCancelled
    ? "Bạn đã hủy thanh toán"
    : payment.status === "expired"
      ? "Link thanh toán đã hết hạn"
      : "Thanh toán chưa hoàn tất";

  return (
    <ResultCard icon={<XCircle className="mx-auto size-12 text-muted-foreground" />} title={title}>
      <p className="text-sm text-muted-foreground">
        {canRetry
          ? "Đơn đặt lịch vẫn được giữ. Bạn có thể thanh toán lại qua PayOS hoặc đổi sang trả tiền mặt khi nghiệm thu."
          : bookingStatus === "CANCELLED" || bookingStatus === "REJECTED"
            ? "Đơn đặt lịch đã kết thúc nên không cần thanh toán nữa."
            : "Bạn có thể xem lại đơn đặt lịch để biết bước tiếp theo."}
      </p>
      {cancelledHint && !firstSyncDone && (
        <p className="text-xs text-muted-foreground">Đang xác nhận với PayOS...</p>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        {canRetry && payosEnabled && (
          <Button
            type="button"
            disabled={isRetrying}
            onClick={() =>
              retry({ bookingId: booking.id, method: "payos", redirect: true })
            }
            className="min-h-[44px]"
          >
            {isRetrying && variables?.method === "payos" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Thanh toán lại
          </Button>
        )}
        {canRetry && (
          <Button
            type="button"
            variant="outline"
            disabled={isRetrying}
            onClick={() =>
              retry(
                { bookingId: booking.id, method: "cod" },
                { onSuccess: () => router.push(bookingHref) },
              )
            }
            className="min-h-[44px]"
          >
            {isRetrying && variables?.method === "cod" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Banknote className="size-4" />
            )}
            Đổi sang tiền mặt
          </Button>
        )}
        {backToBooking}
      </div>
    </ResultCard>
  );
}
