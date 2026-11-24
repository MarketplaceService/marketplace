"use client";

import {
  BookingStatusBadge,
  PaymentStatusBadge,
} from "@/components/booking/booking-status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCancelBooking } from "@/hooks/use-bookings";
import {
  useConfirmBooking,
  useProviderBookings,
  useRejectBooking,
  useStartBooking,
} from "@/hooks/use-provider-bookings";
import { formatVnd } from "@/lib/travel-fee";
import { cn } from "@/lib/utils";
import { formatVnDateTime } from "@/lib/vn-time";
import type {
  BookingSummaryItem,
  ProviderBookingTab,
} from "@/types/booking.types";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Eye,
  Loader2,
  MapPin,
  Phone,
  Play,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const TABS: { key: ProviderBookingTab; label: string; countKey: keyof NonNullable<ReturnType<typeof useProviderBookings>["data"]>["counts"] }[] = [
  { key: "all", label: "Tất cả", countKey: "all" },
  { key: "pending", label: "Chờ xác nhận", countKey: "pending" },
  { key: "confirmed", label: "Đã xác nhận", countKey: "confirmed" },
  { key: "in_progress", label: "Đang làm", countKey: "inProgress" },
  { key: "today", label: "Hôm nay", countKey: "today" },
  { key: "completed", label: "Hoàn thành", countKey: "completed" },
  { key: "cancelled", label: "Đã hủy / Từ chối", countKey: "cancelled" },
];

export function ProviderBookingsView() {
  const [tab, setTab] = useState<ProviderBookingTab>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [reasonModal, setReasonModal] = useState<{
    mode: "reject" | "cancel";
    booking: BookingSummaryItem;
  } | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useProviderBookings({
    tab,
    date: dateFilter || undefined,
    page,
    limit: 10,
  });

  const { mutate: confirmBooking, isPending: isConfirming } = useConfirmBooking();
  const { mutate: rejectBooking, isPending: isRejecting } = useRejectBooking();
  const { mutate: startBooking, isPending: isStarting } = useStartBooking();
  const { mutate: cancelBooking, isPending: isCancelling } = useCancelBooking();

  const isReasonSubmitting = isRejecting || isCancelling;

  const handleConfirm = (id: string) => {
    setBusyId(id);
    confirmBooking(id, { onSettled: () => setBusyId(null) });
  };

  const handleStart = (id: string) => {
    setBusyId(id);
    startBooking(id, { onSettled: () => setBusyId(null) });
  };

  const openReasonModal = (
    mode: "reject" | "cancel",
    booking: BookingSummaryItem,
  ) => {
    setReasonModal({ mode, booking });
    setReasonText("");
    setReasonError(null);
  };

  const handleReasonSubmit = () => {
    if (!reasonModal) return;
    const trimmed = reasonText.trim();
    if (!trimmed) {
      setReasonError("Vui lòng nhập lý do thực hiện thao tác này");
      return;
    }

    const onSuccess = () => {
      setReasonModal(null);
      setReasonText("");
      setReasonError(null);
    };

    if (reasonModal.mode === "reject") {
      rejectBooking({ id: reasonModal.booking.id, reason: trimmed }, { onSuccess });
    } else {
      cancelBooking({ id: reasonModal.booking.id, reason: trimmed }, { onSuccess });
    }
  };

  const items = data?.items ?? [];
  const counts = data?.counts;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Quản lý đơn đặt lịch
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Xác nhận đơn mới, bắt đầu thực hiện tại chỗ và theo dõi toàn bộ lịch hẹn của bạn.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="provider-booking-date" className="text-xs text-muted-foreground whitespace-nowrap">
            Lọc ngày:
          </Label>
          <Input
            id="provider-booking-date"
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
            className="w-44 h-11"
          />
          {dateFilter && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setDateFilter("");
                setPage(1);
              }}
              aria-label="Xóa lọc ngày"
              className="min-h-[44px] min-w-[44px]"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs lọc */}
      <div
        role="tablist"
        aria-label="Bộ lọc trạng thái đơn đặt lịch"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {TABS.map((item) => {
          const isActive = tab === item.key;
          const count = counts ? counts[item.countKey] : undefined;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setTab(item.key);
                setPage(1);
              }}
              className={cn(
                "inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              <span>{item.label}</span>
              {count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Danh sách đơn */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl border border-border bg-card"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-card p-8 text-center space-y-3">
          <p className="text-sm font-medium text-destructive">
            Không tải được danh sách đơn đặt lịch.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetch()}
            className="min-h-[44px]"
          >
            <RefreshCw className="size-4" />
            Thử lại
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center space-y-3">
          <ClipboardList className="mx-auto size-10 text-muted-foreground" />
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              Không tìm thấy đơn đặt lịch nào
            </h2>
            <p className="text-sm text-muted-foreground">
              Thử chuyển sang tab khác hoặc xóa bộ lọc ngày để xem thêm đơn.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((booking) => {
            const isRowConfirming = busyId === booking.id && isConfirming;
            const isRowStarting = busyId === booking.id && isStarting;
            const canCancel =
              booking.status === "PENDING" || booking.status === "CONFIRMED";

            return (
              <article
                key={booking.id}
                className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-muted-foreground">
                        #{booking.bookingCode}
                      </span>
                      <BookingStatusBadge status={booking.status} />
                      {booking.latestPayment && (
                        <PaymentStatusBadge
                          status={booking.latestPayment.status}
                        />
                      )}
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {booking.serviceTitleSnapshot}
                    </h2>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-xs text-muted-foreground">Tổng tiền đơn</p>
                    <p className="text-xl font-bold text-primary">
                      {formatVnd(booking.totalPrice)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Khách hàng</p>
                    <p className="font-semibold text-foreground">
                      {booking.customer.name}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="size-3.5" />
                      {booking.addressSummary.phone}
                    </p>
                  </div>

                  <div className="space-y-1 text-muted-foreground">
                    <p className="flex items-center gap-2 font-medium text-foreground">
                      <CalendarClock className="size-4 shrink-0 text-primary" />
                      {formatVnDateTime(booking.scheduledStartAt)}
                    </p>
                    <p className="flex items-start gap-2 text-xs">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" />
                      <span>
                        {booking.addressSummary.addressLine1},{" "}
                        {booking.addressSummary.ward},{" "}
                        {booking.addressSummary.city} ({booking.addressSummary.distanceKm} km)
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
                  <Link
                    href={`/provider/bookings/${booking.id}`}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Eye className="size-4" />
                    Chi tiết
                  </Link>

                  {booking.status === "PENDING" && (
                    <>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => openReasonModal("reject", booking)}
                        className="min-h-[44px]"
                      >
                        <XCircle className="size-4" />
                        Từ chối
                      </Button>
                      <Button
                        type="button"
                        disabled={isRowConfirming}
                        onClick={() => handleConfirm(booking.id)}
                        className="min-h-[44px]"
                      >
                        {isRowConfirming ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-4" />
                        )}
                        Nhận đơn
                      </Button>
                    </>
                  )}

                  {booking.status === "CONFIRMED" && (
                    <>
                      {canCancel && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openReasonModal("cancel", booking)}
                          className="min-h-[44px] text-destructive hover:text-destructive"
                        >
                          <XCircle className="size-4" />
                          Hủy đơn
                        </Button>
                      )}
                      <Button
                        type="button"
                        disabled={isRowStarting}
                        onClick={() => handleStart(booking.id)}
                        className="min-h-[44px]"
                      >
                        {isRowStarting ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Play className="size-4" />
                        )}
                        Bắt đầu làm
                      </Button>
                    </>
                  )}

                  {booking.status === "IN_PROGRESS" && (
                    <Link
                      href={`/provider/inspections/${booking.id}`}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <ClipboardCheck className="size-4" />
                      {booking.hasInspectionReport
                        ? "Sửa biên bản nghiệm thu"
                        : "Nộp biên bản nghiệm thu"}
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            Trang <strong className="text-foreground">{page}</strong> / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="min-h-[44px]"
            >
              <ChevronLeft className="size-4" />
              Trước
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="min-h-[44px]"
            >
              Sau
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={Boolean(reasonModal)}
        onOpenChange={(open) => {
          if (!open && !isReasonSubmitting) setReasonModal(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reasonModal?.mode === "reject"
                ? `Từ chối đơn #${reasonModal.booking.bookingCode}`
                : `Hủy đơn #${reasonModal?.booking.bookingCode}`}
            </DialogTitle>
            <DialogDescription>
              Vui lòng nhập lý do rõ ràng để khách hàng nắm được và giải phóng khung giờ hẹn.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="provider-booking-reason">Lý do *</Label>
            <textarea
              id="provider-booking-reason"
              rows={3}
              maxLength={500}
              value={reasonText}
              onChange={(e) => {
                setReasonText(e.target.value);
                if (reasonError) setReasonError(null);
              }}
              placeholder="Nhập lý do cụ thể..."
              className={cn(
                "w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                reasonError ? "border-destructive" : "border-input",
              )}
            />
            {reasonError && (
              <p className="text-xs font-medium text-destructive">{reasonError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isReasonSubmitting}
              onClick={() => setReasonModal(null)}
              className="min-h-[44px]"
            >
              Đóng
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isReasonSubmitting}
              onClick={handleReasonSubmit}
              className="min-h-[44px]"
            >
              {isReasonSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : reasonModal?.mode === "reject" ? (
                "Xác nhận từ chối"
              ) : (
                "Xác nhận hủy đơn"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
