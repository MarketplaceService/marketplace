"use client";

import {
  BookingStatusBadge,
  PaymentStatusBadge,
} from "@/components/booking/booking-status-badge";
import { notifyComingSoon } from "@/components/header/header-nav-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useCancelBooking, useMyBookings } from "@/hooks/use-bookings";
import { formatVnd } from "@/lib/travel-fee";
import { cn } from "@/lib/utils";
import { formatVnDateTime } from "@/lib/vn-time";
import type {
  BookingSummaryItem,
  CustomerBookingTab,
} from "@/types/booking.types";
import {
  AlertTriangle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Star,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const TABS: { key: CustomerBookingTab; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ xác nhận" },
  { key: "active", label: "Đang thực hiện" },
  { key: "completed", label: "Hoàn thành" },
  { key: "cancelled", label: "Đã hủy / Từ chối" },
  { key: "unreviewed", label: "Chưa đánh giá" },
];

export function MyBookingsView() {
  const [tab, setTab] = useState<CustomerBookingTab>("all");
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<BookingSummaryItem | null>(
    null,
  );
  const [cancelReason, setCancelReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useMyBookings({
    tab,
    page,
    limit: 10,
  });
  const { mutate: cancelBooking, isPending: isCancelling } = useCancelBooking();

  const handleChangeTab = (nextTab: CustomerBookingTab) => {
    setTab(nextTab);
    setPage(1);
  };

  const openCancelDialog = (booking: BookingSummaryItem) => {
    setCancelTarget(booking);
    setCancelReason("");
    setReasonError(null);
  };

  const handleConfirmCancel = () => {
    if (!cancelTarget) return;
    const trimmed = cancelReason.trim();
    if (!trimmed) {
      setReasonError("Vui lòng nhập lý do hủy đơn đặt lịch");
      return;
    }

    cancelBooking(
      { id: cancelTarget.id, reason: trimmed },
      {
        onSuccess: () => {
          setCancelTarget(null);
          setCancelReason("");
          setReasonError(null);
        },
      },
    );
  };

  const counts = data?.counts;
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Đơn đặt lịch của tôi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi tiến độ thực hiện, đối chiếu ảnh nghiệm thu Before/After và quản lý lịch hẹn.
          </p>
        </div>
        <Link
          href="/map"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Search className="size-4" />
          Tìm thợ đặt lịch mới
        </Link>
      </div>

      {/* Bộ lọc tab */}
      <div
        role="tablist"
        aria-label="Lọc đơn đặt lịch theo trạng thái"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {TABS.map((item) => {
          const isActive = tab === item.key;
          const count = counts ? counts[item.key] : undefined;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleChangeTab(item.key)}
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

      {/* Nội dung danh sách */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, idx) => (
            <div
              key={idx}
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
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center space-y-4">
          <ClipboardList className="mx-auto size-10 text-muted-foreground" />
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              {tab === "unreviewed"
                ? "Không còn đơn nào chưa đánh giá"
                : "Chưa có đơn đặt lịch nào trong mục này"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {tab === "unreviewed"
                ? "Tất cả các đơn hoàn thành của bạn đều đã được đánh giá."
                : "Khám phá các thợ uy tín quanh khu vực của bạn để đặt lịch sửa chữa nhanh chóng."}
            </p>
          </div>
          <Link
            href="/map"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Tìm thợ ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((booking) => {
            const canCancel =
              booking.status === "PENDING" || booking.status === "CONFIRMED";
            const readyForAcceptance =
              booking.status === "IN_PROGRESS" && booking.hasInspectionReport;
            const needsReview =
              booking.status === "COMPLETED" && booking.hasReview === false;

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
                      {readyForAcceptance && (
                        <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          Đã có ảnh nghiệm thu — Chờ bạn xác nhận
                        </span>
                      )}
                      {needsReview && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          <Star className="size-3 fill-amber-500 text-amber-500" />
                          Chưa đánh giá
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {booking.serviceTitleSnapshot}
                    </h2>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-xs text-muted-foreground">Tổng thanh toán</p>
                    <p className="text-xl font-bold text-primary">
                      {formatVnd(booking.totalPrice)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10 border border-border shrink-0">
                      <AvatarImage
                        src={booking.provider?.avatarUrl ?? undefined}
                        alt={booking.provider?.displayName ?? "Thợ"}
                      />
                      <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                        {(
                          booking.provider?.displayName?.charAt(0) || "T"
                        ).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Thợ phụ trách</p>
                      <p className="truncate font-semibold text-foreground">
                        {booking.provider?.displayName ?? "Nhà cung cấp"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1 text-muted-foreground">
                    <p className="flex items-center gap-2 text-foreground font-medium">
                      <CalendarClock className="size-4 shrink-0 text-primary" />
                      <span>
                        {formatVnDateTime(booking.scheduledStartAt)}
                      </span>
                    </p>
                    <p className="flex items-start gap-2 text-xs">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" />
                      <span className="line-clamp-1">
                        {booking.addressSummary.addressLine1},{" "}
                        {booking.addressSummary.ward},{" "}
                        {booking.addressSummary.city}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={notifyComingSoon}
                    className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <AlertTriangle className="size-3.5" />
                    Báo cáo sự cố / Khiếu nại
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    {canCancel && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => openCancelDialog(booking)}
                        className="min-h-[44px] px-4"
                      >
                        <XCircle className="size-4" />
                        Hủy đơn
                      </Button>
                    )}

                    {needsReview && (
                      <Link
                        href={`/bookings/${booking.id}#review-section`}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
                      >
                        <Star className="size-4 fill-current" />
                        Đánh giá ngay
                      </Link>
                    )}

                    <Link
                      href={`/bookings/${booking.id}`}
                      className={cn(
                        "inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition-colors",
                        readyForAcceptance
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border border-border bg-background text-foreground hover:bg-muted",
                      )}
                    >
                      <Eye className="size-4" />
                      {readyForAcceptance
                        ? "Nghiệm thu & Hoàn tất"
                        : "Xem tiến độ & Nghiệm thu"}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Phân trang */}
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

      {/* Dialog hủy đơn */}
      <Dialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open && !isCancelling) setCancelTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hủy đơn đặt lịch #{cancelTarget?.bookingCode}</DialogTitle>
            <DialogDescription>
              Khung giờ của thợ sẽ được mở lại ngay sau khi hủy. Vui lòng cho biết lý do hủy đơn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="cancel-booking-reason">Lý do hủy đơn *</Label>
            <textarea
              id="cancel-booking-reason"
              rows={3}
              maxLength={500}
              value={cancelReason}
              onChange={(e) => {
                setCancelReason(e.target.value);
                if (reasonError) setReasonError(null);
              }}
              placeholder="Ví dụ: Thay đổi lịch trình cá nhân, đặt nhầm thời gian..."
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
              disabled={isCancelling}
              onClick={() => setCancelTarget(null)}
              className="min-h-[44px]"
            >
              Đóng
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isCancelling}
              onClick={handleConfirmCancel}
              className="min-h-[44px]"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Đang hủy...
                </>
              ) : (
                "Xác nhận hủy đơn"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
