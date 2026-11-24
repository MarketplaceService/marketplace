"use client";

import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { Button } from "@/components/ui/button";
import { useProviderBookings } from "@/hooks/use-provider-bookings";
import { formatVnd } from "@/lib/travel-fee";
import { formatVnDateTime } from "@/lib/vn-time";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

export function InspectionListView() {
  const { data, isLoading, isError, refetch } = useProviderBookings({
    tab: "in_progress",
    page: 1,
    limit: 50,
  });

  const items = data?.items ?? [];

  return (
    <div className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Nghiệm thu công việc
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Danh sách các đơn đang thực hiện cần tải ảnh Trước / Sau và gửi biên bản nghiệm thu cho khách hàng.
          </p>
        </div>
        <Link
          href="/provider/bookings"
          className="text-sm font-semibold text-primary hover:underline"
        >
          Xem toàn bộ đơn hàng
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, idx) => (
            <div
              key={idx}
              className="h-36 animate-pulse rounded-2xl border border-border bg-card"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-card p-8 text-center space-y-3">
          <p className="text-sm font-medium text-destructive">
            Không tải được danh sách công việc đang thực hiện.
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
          <CheckCircle2 className="mx-auto size-10 text-primary/70" />
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              Hiện chưa có công việc nào đang thực hiện
            </h2>
            <p className="text-sm text-muted-foreground">
              Hãy vào mục Đơn đặt lịch và bấm &quot;Bắt đầu làm&quot; với đơn đã xác nhận khi bạn có mặt tại nhà khách.
            </p>
          </div>
          <Link
            href="/provider/bookings"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Đi tới Đơn đặt lịch
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((booking) => (
            <article
              key={booking.id}
              className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-muted-foreground">
                    #{booking.bookingCode}
                  </span>
                  <BookingStatusBadge status={booking.status} />
                  {booking.hasInspectionReport ? (
                    <span className="inline-flex items-center rounded-full border border-emerald-300/70 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      Đã gửi biên bản — Chờ khách duyệt
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-amber-300/70 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      Chưa nộp biên bản
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-semibold text-foreground truncate">
                  {booking.serviceTitleSnapshot}
                </h2>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Khách:{" "}
                    <strong className="text-foreground">
                      {booking.customer.name}
                    </strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarClock className="size-3.5 text-primary" />
                    {formatVnDateTime(booking.scheduledStartAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5 text-primary" />
                    {booking.addressSummary.ward}, {booking.addressSummary.city}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-2 shrink-0">
                <span className="text-lg font-bold text-primary">
                  {formatVnd(booking.totalPrice)}
                </span>
                <Link
                  href={`/provider/inspections/${booking.id}`}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <ClipboardCheck className="size-4" />
                  {booking.hasInspectionReport
                    ? "Cập nhật biên bản"
                    : "Lập biên bản nghiệm thu"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
