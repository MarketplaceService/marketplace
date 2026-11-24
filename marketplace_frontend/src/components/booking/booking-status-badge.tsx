import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/types/booking.types";

const STATUS_META: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Chờ xác nhận",
    className:
      "border-amber-300/70 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300",
  },
  CONFIRMED: {
    label: "Đã xác nhận",
    className:
      "border-sky-300/70 bg-sky-50 text-sky-800 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-300",
  },
  IN_PROGRESS: {
    label: "Đang thực hiện",
    className:
      "border-primary/30 bg-primary/10 text-primary",
  },
  COMPLETED: {
    label: "Hoàn thành",
    className:
      "border-emerald-300/70 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  REJECTED: {
    label: "Thợ từ chối",
    className:
      "border-destructive/30 bg-destructive/10 text-destructive",
  },
  CANCELLED: {
    label: "Đã hủy",
    className:
      "border-border bg-muted text-muted-foreground",
  },
};

const PAYMENT_STATUS_META: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Chờ thanh toán",
    className: "border-amber-300/70 bg-amber-50 text-amber-800",
  },
  processing: {
    label: "Đang xử lý",
    className: "border-sky-300/70 bg-sky-50 text-sky-800",
  },
  completed: {
    label: "Đã thanh toán",
    className: "border-emerald-300/70 bg-emerald-50 text-emerald-800",
  },
  failed: {
    label: "Thanh toán lỗi",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  cancelled: {
    label: "Đã hủy thanh toán",
    className: "border-border bg-muted text-muted-foreground",
  },
  expired: {
    label: "Hết hạn thanh toán",
    className: "border-border bg-muted text-muted-foreground",
  },
  refunded: {
    label: "Đã hoàn tiền",
    className: "border-sky-300/70 bg-sky-50 text-sky-800",
  },
};

export function BookingStatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const normalized = status.toLowerCase();
  const meta = PAYMENT_STATUS_META[normalized] ?? {
    label: status,
    className: "border-border bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

export function getBookingStatusLabel(status: BookingStatus): string {
  return STATUS_META[status]?.label ?? status;
}
