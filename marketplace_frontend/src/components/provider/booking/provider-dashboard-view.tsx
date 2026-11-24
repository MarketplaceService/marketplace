"use client";

import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
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
import { useMyProviderProfile } from "@/hooks/use-provider";
import {
  useConfirmBooking,
  useProviderBookings,
  useProviderWallet,
  useRejectBooking,
  useStartBooking,
} from "@/hooks/use-provider-bookings";
import { formatVnd } from "@/lib/travel-fee";
import { cn } from "@/lib/utils";
import { formatVnDateTime } from "@/lib/vn-time";
import type { BookingSummaryItem } from "@/types/booking.types";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Clock,
  Loader2,
  MapPin,
  Play,
  RefreshCw,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function ProviderDashboardView() {
  const { data: myProfile } = useMyProviderProfile();
  const isApproved = myProfile?.status === "APPROVED";

  const {
    data: pendingData,
    isLoading: pendingLoading,
    isError: pendingError,
    refetch: refetchPending,
  } = useProviderBookings({ tab: "pending", page: 1, limit: 10 }, isApproved);

  const {
    data: todayData,
    isLoading: todayLoading,
    isError: todayError,
    refetch: refetchToday,
  } = useProviderBookings({ tab: "today", page: 1, limit: 10 }, isApproved);

  const { data: walletData, isLoading: walletLoading } = useProviderWallet({
    page: 1,
    limit: 5,
  });

  const { mutate: confirmBooking, isPending: isConfirming } = useConfirmBooking();
  const { mutate: rejectBooking, isPending: isRejecting } = useRejectBooking();
  const { mutate: startBooking, isPending: isStarting } = useStartBooking();

  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<BookingSummaryItem | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

  const pendingItems = pendingData?.items ?? [];
  const todayItems = todayData?.items ?? [];
  const counts = pendingData?.counts ?? todayData?.counts;

  const handleConfirm = (id: string) => {
    setActiveActionId(id);
    confirmBooking(id, {
      onSettled: () => setActiveActionId(null),
    });
  };

  const handleStart = (id: string) => {
    setActiveActionId(id);
    startBooking(id, {
      onSettled: () => setActiveActionId(null),
    });
  };

  const handleRejectSubmit = () => {
    if (!rejectTarget) return;
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      setRejectError("Vui lòng nhập lý do từ chối đơn");
      return;
    }

    rejectBooking(
      { id: rejectTarget.id, reason: trimmed },
      {
        onSuccess: () => {
          setRejectTarget(null);
          setRejectReason("");
          setRejectError(null);
        },
      },
    );
  };

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Tiêu đề & điều hướng nhanh */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Bảng điều khiển Nhà cung cấp
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Phản hồi nhanh yêu cầu đặt lịch mới, theo dõi ca làm hôm nay và doanh thu thực nhận.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/provider/bookings"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            Tất cả đơn đặt lịch
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      {/* 3 KPI Cards có phân cấp trọng tâm */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div
          className={cn(
            "rounded-2xl border p-6 shadow-xs md:col-span-5 flex flex-col justify-between gap-3",
            (counts?.pending ?? 0) > 0
              ? "border-primary/40 bg-primary/5"
              : "border-border bg-card",
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Đơn chờ xác nhận
            </span>
            <Clock className="size-5 text-primary" />
          </div>
          <div>
            {pendingLoading ? (
              <div className="h-9 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-3xl font-bold text-foreground">
                {counts?.pending ?? 0} đơn
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Phản hồi sớm giúp giữ uy tín và không bỏ lỡ lịch hẹn của khách
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs md:col-span-3 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Lịch hẹn hôm nay
            </span>
            <CalendarDays className="size-5 text-primary" />
          </div>
          <div>
            {todayLoading ? (
              <div className="h-8 w-20 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-2xl font-bold text-foreground">
                {counts?.today ?? 0} ca
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {counts?.inProgress ?? 0} đang thực hiện
            </p>
          </div>
        </div>

        <Link
          href="/provider/wallet"
          className="rounded-2xl border border-border bg-card p-6 shadow-xs md:col-span-4 flex flex-col justify-between gap-3 hover:border-primary/40 transition-colors"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Doanh thu tháng này
            </span>
            <CircleDollarSign className="size-5 text-primary" />
          </div>
          <div>
            {walletLoading ? (
              <div className="h-8 w-36 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-2xl font-bold text-primary">
                {formatVnd(walletData?.summary.completedThisMonth ?? 0)}
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {walletData?.summary.completedCountThisMonth ?? 0} đơn đã nghiệm thu • Xem ví &amp; sao kê
            </p>
          </div>
        </Link>
      </div>

      {/* 2 khối công việc chính */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Khối 1: Yêu cầu mới cần phản hồi */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4 lg:col-span-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Yêu cầu mới cần phản hồi
              </h2>
              <p className="text-xs text-muted-foreground">
                Các đơn đang giữ chỗ tạm thời, chờ bạn xác nhận hoặc từ chối
              </p>
            </div>
            <Link
              href="/provider/bookings"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Xem tất cả
            </Link>
          </div>

          {pendingLoading ? (
            <div className="space-y-3">
              <div className="h-28 animate-pulse rounded-xl bg-muted" />
              <div className="h-28 animate-pulse rounded-xl bg-muted" />
            </div>
          ) : pendingError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-center justify-between gap-3">
              <p className="text-sm text-destructive">
                Không tải được yêu cầu đặt lịch mới.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetchPending()}
              >
                <RefreshCw className="size-3.5" />
                Thử lại
              </Button>
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
              <CheckCircle2 className="mx-auto size-8 text-primary/70" />
              <p className="text-sm font-semibold text-foreground">
                Không có yêu cầu nào đang chờ xác nhận
              </p>
              <p className="text-xs text-muted-foreground">
                Yêu cầu đặt lịch mới từ khách hàng sẽ xuất hiện tại đây ngay khi phát sinh.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingItems.map((item) => {
                const isRowBusy = activeActionId === item.id && isConfirming;
                return (
                  <article
                    key={item.id}
                    className="rounded-xl border border-border bg-background p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-muted-foreground">
                            #{item.bookingCode}
                          </span>
                          <BookingStatusBadge status={item.status} />
                        </div>
                        <h3 className="mt-1 font-semibold text-foreground truncate">
                          {item.serviceTitleSnapshot}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Khách hàng: <strong className="text-foreground">{item.customer.name}</strong>
                        </p>
                      </div>
                      <span className="text-base font-bold text-primary shrink-0">
                        {formatVnd(item.totalPrice)}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5 text-foreground font-medium">
                        <CalendarDays className="size-3.5 text-primary" />
                        {formatVnDateTime(item.scheduledStartAt)}
                      </p>
                      <p className="flex items-start gap-1.5">
                        <MapPin className="mt-0.5 size-3.5 shrink-0" />
                        <span className="line-clamp-1">
                          {item.addressSummary.addressLine1},{" "}
                          {item.addressSummary.ward},{" "}
                          {item.addressSummary.city} ({item.addressSummary.distanceKm} km)
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={isRowBusy}
                        onClick={() => {
                          setRejectTarget(item);
                          setRejectReason("");
                          setRejectError(null);
                        }}
                        className="min-h-[44px]"
                      >
                        <XCircle className="size-4" />
                        Từ chối
                      </Button>
                      <Button
                        type="button"
                        disabled={isRowBusy}
                        onClick={() => handleConfirm(item.id)}
                        className="min-h-[44px]"
                      >
                        {isRowBusy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-4" />
                        )}
                        Nhận đơn
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Khối 2: Lịch làm việc hôm nay */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4 lg:col-span-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Lịch làm việc hôm nay
              </h2>
              <p className="text-xs text-muted-foreground">
                Đơn đã nhận hoặc đang thực hiện trong ngày hôm nay (giờ Việt Nam)
              </p>
            </div>
            <Link
              href="/provider/inspections"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Chờ nghiệm thu
            </Link>
          </div>

          {todayLoading ? (
            <div className="space-y-3">
              <div className="h-28 animate-pulse rounded-xl bg-muted" />
              <div className="h-28 animate-pulse rounded-xl bg-muted" />
            </div>
          ) : todayError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-center justify-between gap-3">
              <p className="text-sm text-destructive">
                Không tải được lịch làm việc hôm nay.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetchToday()}
              >
                <RefreshCw className="size-3.5" />
                Thử lại
              </Button>
            </div>
          ) : todayItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
              <CalendarDays className="mx-auto size-8 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">
                Chưa có lịch hẹn nào trong hôm nay
              </p>
              <p className="text-xs text-muted-foreground">
                Các đơn bạn đã xác nhận với thời gian hẹn trong hôm nay sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayItems.map((item) => {
                const isRowBusy = activeActionId === item.id && isStarting;
                return (
                  <article
                    key={item.id}
                    className="rounded-xl border border-border bg-background p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-muted-foreground">
                            #{item.bookingCode}
                          </span>
                          <BookingStatusBadge status={item.status} />
                        </div>
                        <h3 className="mt-1 font-semibold text-foreground truncate">
                          {item.serviceTitleSnapshot}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Khách hàng: <strong className="text-foreground">{item.customer.name}</strong> •{" "}
                          {item.addressSummary.phone}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-primary shrink-0">
                        {formatVnd(item.totalPrice)}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5 text-foreground font-medium">
                        <Clock className="size-3.5 text-primary" />
                        {formatVnDateTime(item.scheduledStartAt)}
                      </p>
                      <p className="flex items-start gap-1.5">
                        <MapPin className="mt-0.5 size-3.5 shrink-0" />
                        <span className="line-clamp-1">
                          {item.addressSummary.addressLine1},{" "}
                          {item.addressSummary.ward},{" "}
                          {item.addressSummary.city}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
                      <Link
                        href={`/provider/bookings/${item.id}`}
                        className="inline-flex min-h-[44px] items-center rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                      >
                        Chi tiết
                      </Link>

                      {item.status === "CONFIRMED" && (
                        <Button
                          type="button"
                          disabled={isRowBusy}
                          onClick={() => handleStart(item.id)}
                          className="min-h-[44px]"
                        >
                          {isRowBusy ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Play className="size-4" />
                          )}
                          Bắt đầu làm
                        </Button>
                      )}

                      {item.status === "IN_PROGRESS" && (
                        <Link
                          href={`/provider/inspections/${item.id}`}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          <ClipboardCheck className="size-4" />
                          {item.hasInspectionReport
                            ? "Sửa biên bản nghiệm thu"
                            : "Biên bản nghiệm thu"}
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Dialog từ chối đơn */}
      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open && !isRejecting) setRejectTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Từ chối đơn #{rejectTarget?.bookingCode}
            </DialogTitle>
            <DialogDescription>
              Khung giờ sẽ tự động mở lại ngay sau khi bạn từ chối. Vui lòng nhập lý do rõ ràng cho khách hàng.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="dashboard-reject-reason">Lý do từ chối *</Label>
            <textarea
              id="dashboard-reject-reason"
              rows={3}
              maxLength={500}
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (rejectError) setRejectError(null);
              }}
              placeholder="Ví dụ: Đã có lịch sửa chữa đột xuất ngoài khu vực vào khung giờ này..."
              className={cn(
                "w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                rejectError ? "border-destructive" : "border-input",
              )}
            />
            {rejectError && (
              <p className="text-xs font-medium text-destructive">{rejectError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isRejecting}
              onClick={() => setRejectTarget(null)}
              className="min-h-[44px]"
            >
              Đóng
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isRejecting}
              onClick={handleRejectSubmit}
              className="min-h-[44px]"
            >
              {isRejecting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Đang từ chối...
                </>
              ) : (
                "Xác nhận từ chối"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
