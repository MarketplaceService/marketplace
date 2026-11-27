"use client";

import { Button } from "@/components/ui/button";
import {
  usePaymentStatus,
  useRetryPayment,
  useSyncPayment,
} from "@/hooks/use-payment";
import { redirectToPayos } from "@/lib/payment";
import { formatVnd } from "@/lib/travel-fee";
import type { BookingPaymentSummary } from "@/types/booking.types";
import {
  Banknote,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Timer,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Mã BIN theo NAPAS của các ngân hàng thường gặp, chỉ để hiển thị tên
const BANK_NAMES: Record<string, string> = {
  "970422": "MB Bank",
  "970436": "Vietcombank",
  "970415": "VietinBank",
  "970418": "BIDV",
  "970405": "Agribank",
  "970407": "Techcombank",
  "970416": "ACB",
  "970432": "VPBank",
  "970423": "TPBank",
  "970403": "Sacombank",
  "970452": "KienlongBank",
};

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}`);
  } catch {
    // Trình duyệt chặn clipboard khi trang không chạy trên https hoặc localhost
    toast.error("Trình duyệt không cho sao chép, bạn hãy chép thủ công");
  }
}

function CopyRow({
  label,
  value,
  copyValue,
  mono,
}: {
  label: string;
  value: string;
  copyValue?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
        {label}
      </span>
      <span className="flex min-w-0 items-center gap-1">
        {/* Xuống dòng thay vì cắt bớt: khách cần đọc đủ số tài khoản và nội dung chuyển khoản */}
        <span
          className={`break-all text-right text-sm font-semibold text-foreground ${mono ? "font-mono" : ""}`}
        >
          {value}
        </span>
        {copyValue !== undefined && (
          <button
            type="button"
            onClick={() => void copyToClipboard(copyValue, label.toLowerCase())}
            aria-label={`Sao chép ${label.toLowerCase()}`}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-primary hover:bg-primary/10"
          >
            <Copy className="size-3.5" />
          </button>
        )}
      </span>
    </div>
  );
}

/** Nút tạo lần thanh toán mới: tạo link PayOS mới hoặc đổi sang tiền mặt */
export function PaymentRetryButtons({
  bookingId,
  offerPayos,
  offerCod,
  payosLabel = "Tạo link thanh toán mới",
  redirect = false,
}: {
  bookingId: string;
  offerPayos: boolean;
  offerCod: boolean;
  payosLabel?: string;
  redirect?: boolean;
}) {
  const { mutate: retry, isPending, variables } = useRetryPayment();

  if (!offerPayos && !offerCod) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {offerPayos && (
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() => retry({ bookingId, method: "payos", redirect })}
          className="min-h-[40px]"
        >
          {isPending && variables?.method === "payos" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {payosLabel}
        </Button>
      )}
      {offerCod && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => retry({ bookingId, method: "cod" })}
          className="min-h-[40px]"
        >
          {isPending && variables?.method === "cod" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Banknote className="size-4" />
          )}
          Đổi sang tiền mặt
        </Button>
      )}
    </div>
  );
}

/**
 * Khung thanh toán PayOS đang chờ: mã VietQR, thông tin chuyển khoản, đồng hồ hết hạn.
 * Hỏi trạng thái mỗi 3 giây; khi mở thì đồng bộ với PayOS một lần để bắt webhook bị lỡ.
 */
export function PayosPaymentPanel({
  bookingId,
  payment,
  payosEnabled,
}: {
  bookingId: string;
  payment: BookingPaymentSummary;
  payosEnabled: boolean;
}) {
  const { data } = usePaymentStatus(payment.id, { poll: true });
  const current = data?.payment ?? payment;
  const { mutate: syncSilently } = useSyncPayment({ silent: true });
  const { mutate: syncNow, isPending: isSyncing } = useSyncPayment();
  const syncedForRef = useRef<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (syncedForRef.current === payment.id) return;
    syncedForRef.current = payment.id;
    syncSilently(payment.id);
  }, [payment.id, syncSilently]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (current.status === "completed") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-300/70 bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300">
        <CheckCircle2 className="size-4 shrink-0" />
        Đã nhận được thanh toán, đang cập nhật đơn...
      </div>
    );
  }

  const details = current.paymentDetails ?? {};
  const expiresAtMs = current.expiresAt
    ? new Date(current.expiresAt).getTime()
    : null;
  const remainingMs = expiresAtMs === null ? null : expiresAtMs - now;
  const isExpired = remainingMs !== null && remainingMs <= 0;
  const isProcessing = current.status === "processing";

  if (isExpired && !isProcessing) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
        <p className="text-sm text-foreground">
          Link thanh toán đã hết hạn. Nếu bạn vừa chuyển khoản, bấm kiểm tra lại trước khi tạo
          link mới.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isSyncing}
            onClick={() => syncNow(current.id)}
            className="min-h-[40px]"
          >
            {isSyncing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Kiểm tra lại
          </Button>
        </div>
        <PaymentRetryButtons
          bookingId={bookingId}
          offerPayos={payosEnabled}
          offerCod
        />
      </div>
    );
  }

  const bankName = details.bin
    ? (BANK_NAMES[details.bin] ?? `Ngân hàng (BIN ${details.bin})`)
    : null;

  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">
          {isProcessing
            ? "Ngân hàng đang xử lý giao dịch"
            : "Quét mã VietQR để thanh toán"}
        </span>
        {remainingMs !== null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
            <Timer className="size-3.5" />
            {formatRemaining(remainingMs)}
          </span>
        )}
      </div>

      {/* Luôn xếp dọc: thẻ nằm ở cột hẹp bên phải nên QR và thông tin đặt cạnh nhau sẽ bị chật */}
      <div className="flex flex-col items-center gap-4">
        {details.qrCode && (
          // QR luôn để nền trắng, chữ đen để app ngân hàng quét được ở cả giao diện tối
          <div className="shrink-0 rounded-xl border border-border bg-white p-2.5">
            <QRCodeSVG
              value={details.qrCode}
              size={168}
              level="M"
              title="Mã VietQR thanh toán đơn đặt lịch"
            />
          </div>
        )}

        <div className="w-full min-w-0 divide-y divide-border">
          {bankName && <CopyRow label="Ngân hàng" value={bankName} />}
          {details.accountNumber && (
            <CopyRow
              label="Số tài khoản"
              value={details.accountNumber}
              copyValue={details.accountNumber}
              mono
            />
          )}
          {details.accountName && (
            <CopyRow label="Chủ tài khoản" value={details.accountName} />
          )}
          <CopyRow
            label="Số tiền"
            value={formatVnd(current.amount)}
            copyValue={String(Math.round(current.amount))}
          />
          {details.description && (
            <CopyRow
              label="Nội dung"
              value={details.description}
              copyValue={details.description}
              mono
            />
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {current.paymentLinkUrl && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (!redirectToPayos(current.paymentLinkUrl)) {
                toast.error("Link thanh toán không hợp lệ");
              }
            }}
            className="min-h-[40px]"
          >
            <ExternalLink className="size-4" />
            Mở trang thanh toán PayOS
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isSyncing}
          onClick={() => syncNow(current.id)}
          className="min-h-[40px]"
        >
          {isSyncing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Tôi đã chuyển khoản, kiểm tra lại
        </Button>
      </div>

      {!isProcessing && (
        <PaymentRetryButtons
          bookingId={bookingId}
          offerPayos={false}
          offerCod
        />
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Trang tự cập nhật khi PayOS báo đã nhận tiền. Chuyển đúng số tiền và nội dung để giao dịch
        được nhận diện tự động.
      </p>
    </div>
  );
}
