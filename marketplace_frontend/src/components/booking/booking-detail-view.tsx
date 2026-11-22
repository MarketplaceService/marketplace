"use client";

import { BeforeAfterSlider } from "@/components/booking/before-after-slider";
import { BookingPaymentCard } from "@/components/booking/booking-payment-card";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
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
import { useCurrentUser } from "@/hooks/use-auth";
import {
  useBookingDetail,
  useCancelBooking,
  useCompleteBooking,
} from "@/hooks/use-bookings";
import {
  useConfirmBooking,
  useRejectBooking,
  useStartBooking,
} from "@/hooks/use-provider-bookings";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { formatVnd } from "@/lib/travel-fee";
import { cn } from "@/lib/utils";
import { formatVnDateTime } from "@/lib/vn-time";
import type { BookingStatus } from "@/types/booking.types";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Play,
  RefreshCw,
  Star,
  Wrench,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const PROGRESS_STEPS: { status: BookingStatus; label: string }[] = [
  { status: "PENDING", label: "Chờ xác nhận" },
  { status: "CONFIRMED", label: "Đã xác nhận" },
  { status: "IN_PROGRESS", label: "Đang thực hiện" },
  { status: "COMPLETED", label: "Hoàn thành" },
];

const STEP_INDEX: Record<BookingStatus, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  REJECTED: -1,
  CANCELLED: -1,
};

export function BookingDetailView({
  bookingId,
  portal = "customer",
}: {
  bookingId: string;
  portal?: "customer" | "provider";
}) {
  const isProviderPortal = portal === "provider";
  const Wrapper = isProviderPortal ? "div" : "main";
  const { data: currentUser } = useCurrentUser();
  const {
    data: booking,
    isLoading,
    isError,
    error,
    refetch,
  } = useBookingDetail(bookingId);

  const { mutate: completeBooking, isPending: isCompleting } =
    useCompleteBooking();
  const { mutate: cancelBooking, isPending: isCancelling } = useCancelBooking();
  const { mutate: confirmBooking, isPending: isConfirming } =
    useConfirmBooking();
  const { mutate: rejectBooking, isPending: isRejecting } = useRejectBooking();
  const { mutate: startBooking, isPending: isStarting } = useStartBooking();

  const [confirmAcceptOpen, setConfirmAcceptOpen] = useState(false);
  const [reasonDialogMode, setReasonDialogMode] = useState<
    "cancel" | "reject" | null
  >(null);
  const [actionReason, setActionReason] = useState("");
  const [actionReasonError, setActionReasonError] = useState<string | null>(
    null,
  );

  const isReasonSubmitting = isCancelling || isRejecting;

  if (isLoading) {
    return (
      <Wrapper className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 space-y-6">
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="h-96 animate-pulse rounded-2xl bg-muted lg:col-span-7" />
          <div className="h-96 animate-pulse rounded-2xl bg-muted lg:col-span-5" />
        </div>
      </Wrapper>
    );
  }

  if (isError || !booking) {
    return (
      <Wrapper className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-8">
        <div className="rounded-2xl border border-destructive/30 bg-card p-8 text-center space-y-4">
          <AlertCircle className="mx-auto size-10 text-destructive" />
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-foreground">
              Không tải được thông tin đơn đặt lịch
            </h1>
            <p className="text-sm text-muted-foreground">
              {getApiErrorMessage(
                error,
                "Đơn đặt lịch không tồn tại hoặc bạn không có quyền xem.",
              )}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void refetch()}
              className="min-h-[44px]"
            >
              <RefreshCw className="size-4" />
              Thử lại
            </Button>
            <Link
              href={isProviderPortal ? "/provider/bookings" : "/bookings"}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Về danh sách đơn
            </Link>
          </div>
        </div>
      </Wrapper>
    );
  }

  const isCustomerOwner = currentUser?.id === booking.customer.id;
  const isProviderOwner = currentUser?.id === booking.provider?.userId;
  const isAdmin = currentUser?.role === "admin";
  const isProviderView = isProviderPortal || isProviderOwner;
  const currentStepIdx = STEP_INDEX[booking.status];
  const isTerminalNegative =
    booking.status === "CANCELLED" || booking.status === "REJECTED";
  const canProviderConfirmOrReject =
    isProviderOwner && booking.status === "PENDING";
  const canProviderStart = isProviderOwner && booking.status === "CONFIRMED";
  const canCancel =
    (booking.status === "PENDING" && (isCustomerOwner || isAdmin)) ||
    (booking.status === "CONFIRMED" &&
      (isCustomerOwner || isProviderOwner || isAdmin));
  const canAcceptAndComplete =
    isCustomerOwner &&
    booking.status === "IN_PROGRESS" &&
    booking.hasRequiredInspection;
  const hasActions =
    canAcceptAndComplete ||
    canProviderConfirmOrReject ||
    canProviderStart ||
    canCancel;

  const inspection = booking.inspectionImages;
  const beforePhotos = inspection?.before ?? [];
  const afterPhotos = inspection?.after ?? [];
  const initialPhotos = inspection?.initial ?? [];
  const technicalSpecs = inspection?.technicalSpecs ?? [];
  const extraMaterials = inspection?.extraMaterials ?? [];

  const handleConfirmComplete = () => {
    completeBooking(booking.id, {
      onSuccess: () => setConfirmAcceptOpen(false),
    });
  };

  const openReasonDialog = (mode: "cancel" | "reject") => {
    setReasonDialogMode(mode);
    setActionReason("");
    setActionReasonError(null);
  };

  const handleConfirmReasonAction = () => {
    if (!reasonDialogMode) return;
    const trimmed = actionReason.trim();
    if (!trimmed) {
      setActionReasonError(
        reasonDialogMode === "reject"
          ? "Vui lòng nhập lý do từ chối đơn"
          : "Vui lòng nhập lý do hủy đơn",
      );
      return;
    }

    const onSuccess = () => {
      setReasonDialogMode(null);
      setActionReason("");
      setActionReasonError(null);
    };

    if (reasonDialogMode === "reject") {
      rejectBooking({ id: booking.id, reason: trimmed }, { onSuccess });
    } else {
      cancelBooking({ id: booking.id, reason: trimmed }, { onSuccess });
    }
  };

  return (
    <Wrapper className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 space-y-6">
      {/* Header đơn hàng */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href={isProviderView ? "/provider/bookings" : "/bookings"}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            {isProviderView ? "Quay lại đơn của thợ" : "Đơn đặt lịch của tôi"}
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Đơn #{booking.bookingCode}
            </h1>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {booking.serviceTitleSnapshot} • Hẹn lúc{" "}
            <strong className="text-foreground">
              {formatVnDateTime(booking.scheduledStartAt)}
            </strong>
          </p>
        </div>

        {isProviderOwner && booking.status === "IN_PROGRESS" && (
          <Link
            href={`/provider/inspections/${booking.id}`}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ClipboardCheck className="size-4" />
            {booking.hasInspectionReport
              ? "Cập nhật biên bản nghiệm thu"
              : "Nộp biên bản nghiệm thu"}
          </Link>
        )}
      </div>

      {/* Stepper 4 bước hoặc Banner hủy/từ chối */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        {isTerminalNegative ? (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <XCircle className="mt-0.5 size-5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">
                {booking.status === "REJECTED"
                  ? "Đơn đặt lịch đã bị nhà cung cấp từ chối"
                  : "Đơn đặt lịch đã được hủy"}
              </p>
              {booking.cancelReason && (
                <p className="text-sm opacity-90">
                  Lý do: {booking.cancelReason}
                </p>
              )}
              {!booking.cancelReason &&
                booking.status === "REJECTED" &&
                booking.statusHistories[booking.statusHistories.length - 1]
                  ?.reason && (
                  <p className="text-sm opacity-90">
                    Lý do:{" "}
                    {
                      booking.statusHistories[
                        booking.statusHistories.length - 1
                      ]?.reason
                    }
                  </p>
                )}
            </div>
          </div>
        ) : (
          <ol className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {PROGRESS_STEPS.map((step, index) => {
              const isDone = index <= currentStepIdx;
              const isCurrent = index === currentStepIdx;
              return (
                <li
                  key={step.status}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                    isCurrent
                      ? "border-primary bg-primary/5"
                      : isDone
                        ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
                        : "border-border bg-muted/30 text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      isDone
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isDone ? <CheckCircle2 className="size-4" /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      "text-xs sm:text-sm font-semibold",
                      isDone ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Cột trái: Biên bản Before/After, Thông số & Địa chỉ */}
        <div className="space-y-6 lg:col-span-7">
          {/* Khối đối chiếu ảnh Before / After */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wrench className="size-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">
                  Nghiệm thu Before / After
                </h2>
              </div>
              {inspection?.submittedAt && (
                <span className="text-xs text-muted-foreground">
                  Cập nhật lúc {formatVnDateTime(inspection.submittedAt)}
                </span>
              )}
            </div>

            {beforePhotos.length > 0 && afterPhotos.length > 0 ? (
              <BeforeAfterSlider before={beforePhotos} after={afterPhotos} />
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-2">
                <Clock className="mx-auto size-8 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">
                  {booking.status === "IN_PROGRESS"
                    ? isProviderView
                      ? "Bạn chưa gửi biên bản nghiệm thu cho đơn này"
                      : "Thợ đang thực hiện công việc và chưa gửi biên bản nghiệm thu"
                    : "Chưa có biên bản nghiệm thu Before/After"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isProviderView
                    ? "Sau khi bắt đầu làm và hoàn thiện công việc, hãy tải ảnh Trước & Sau lên biên bản nghiệm thu để khách hàng đối chiếu xác nhận hoàn tất."
                    : "Sau khi sửa xong, thợ sẽ tải ảnh Trước & Sau lên tại đây để bạn đối chiếu trước khi xác nhận hoàn tất."}
                </p>
              </div>
            )}

            {/* Thông số kiểm tra kỹ thuật */}
            {technicalSpecs.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground">
                  Thông số kiểm tra kỹ thuật
                </h3>
                <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                  {technicalSpecs.map((spec, index) => (
                    <div
                      key={`${spec.label}-${index}`}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm bg-background"
                    >
                      <span className="text-muted-foreground">{spec.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {spec.value}
                        </span>
                        {spec.status && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {spec.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ghi chú hiện trường của thợ */}
            {inspection?.fieldNote && (
              <div className="space-y-1.5 pt-2 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground">
                  Ghi chú bàn giao của thợ
                </h3>
                <p className="rounded-xl border border-border bg-muted/40 p-3.5 text-sm leading-relaxed text-foreground whitespace-pre-line">
                  {inspection.fieldNote}
                </p>
              </div>
            )}

            {/* Vật tư phát sinh tham khảo */}
            {extraMaterials.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/70 bg-amber-50/80 p-3.5 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    <strong>Vật tư phát sinh tham khảo:</strong> Chỉ thực hiện khi khách hàng đồng ý trực tiếp tại chỗ — <strong>không tự động cộng vào tổng thanh toán qua sàn</strong>.
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/60 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Tên vật tư</th>
                        <th className="px-3 py-2 font-semibold text-right">SL</th>
                        <th className="px-3 py-2 font-semibold text-right">
                          Đơn giá
                        </th>
                        <th className="px-3 py-2 font-semibold">Lý do</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {extraMaterials.map((item, idx) => (
                        <tr key={`${item.name}-${idx}`}>
                          <td className="px-3 py-2.5 font-medium text-foreground">
                            {item.name}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {formatVnd(item.unitPrice)}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">
                            {item.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Ảnh hiện trạng ban đầu khách đính kèm */}
            {initialPhotos.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground">
                  {isProviderView
                    ? "Ảnh hiện trạng ban đầu khách hàng đã gửi"
                    : "Ảnh hiện trạng ban đầu bạn đã gửi"}
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {initialPhotos.map((img, idx) => (
                    <a
                      key={img.url}
                      href={img.url}
                      target="_blank"
                      rel="noreferrer"
                      className="aspect-square overflow-hidden rounded-xl border border-border bg-muted block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={`Hiện trạng ban đầu ${idx + 1}`}
                        className="size-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Địa chỉ & ghi chú đơn hàng */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              Thông tin địa điểm &amp; lịch hẹn
            </h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2 text-foreground">
                <CalendarClock className="size-4 shrink-0 text-primary" />
                <span>
                  {formatVnDateTime(booking.scheduledStartAt)} –{" "}
                  {formatVnDateTime(booking.scheduledEndAt)}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">
                    {booking.serviceAddressSnapshot.fullName}
                  </strong>{" "}
                  ({booking.serviceAddressSnapshot.phone}) —{" "}
                  {booking.serviceAddressSnapshot.addressLine1}
                  {booking.serviceAddressSnapshot.addressLine2
                    ? `, ${booking.serviceAddressSnapshot.addressLine2}`
                    : ""}
                  , {booking.serviceAddressSnapshot.ward}
                  {booking.serviceAddressSnapshot.district
                    ? `, ${booking.serviceAddressSnapshot.district}`
                    : ""}
                  , {booking.serviceAddressSnapshot.city}
                </span>
              </p>
              {booking.customerNote && (
                <div className="rounded-xl border border-border bg-muted/40 p-3 text-foreground">
                  <span className="text-xs font-semibold text-muted-foreground block mb-1">
                    Ghi chú của khách hàng
                  </span>
                  {booking.customerNote}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Cột phải: Thông tin Thợ, Thanh toán, Hành động & Nhật ký */}
        <aside className="space-y-6 lg:col-span-5">
          {/* Thẻ Thợ */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <h2 className="text-base font-semibold text-foreground">
              {isProviderOwner ? "Thông tin khách hàng" : "Nhà cung cấp phụ trách"}
            </h2>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="size-12 border border-border shrink-0">
                  <AvatarImage
                    src={
                      isProviderOwner
                        ? (booking.customer.avatarUrl ?? undefined)
                        : (booking.provider?.avatarUrl ?? undefined)
                    }
                    alt={
                      isProviderOwner
                        ? booking.customer.name
                        : (booking.provider?.displayName ?? "Thợ")
                    }
                  />
                  <AvatarFallback className="bg-primary/10 font-bold text-primary">
                    {(isProviderOwner
                      ? booking.customer.name
                      : (booking.provider?.displayName ?? "T")
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {isProviderOwner
                      ? booking.customer.name
                      : (booking.provider?.displayName ?? "Nhà cung cấp")}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="size-3.5" />
                    <span>
                      {(isProviderOwner
                        ? booking.serviceAddressSnapshot.phone
                        : booking.provider?.phone) || "Chưa cập nhật"}
                    </span>
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={notifyComingSoon}
                className="min-h-[44px] shrink-0"
              >
                <MessageSquare className="size-4" />
                Nhắn tin
              </Button>
            </div>
          </section>

          {/* Thanh toán */}
          <BookingPaymentCard booking={booking} />

          {/* Thẻ Hành động chính */}
          {hasActions && (
            <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-3">
              <h2 className="text-base font-semibold text-foreground">
                Thao tác đơn hàng
              </h2>

              {canProviderConfirmOrReject && (
                <>
                  <Button
                    type="button"
                    size="lg"
                    disabled={isConfirming || isRejecting}
                    onClick={() => confirmBooking(booking.id)}
                    className="w-full min-h-[48px] rounded-xl text-sm font-semibold"
                  >
                    {isConfirming ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    Nhận đơn
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="lg"
                    disabled={isConfirming || isRejecting}
                    onClick={() => openReasonDialog("reject")}
                    className="w-full min-h-[44px] rounded-xl"
                  >
                    <XCircle className="size-4" />
                    Từ chối đơn
                  </Button>
                </>
              )}

              {canProviderStart && (
                <Button
                  type="button"
                  size="lg"
                  disabled={isStarting || isCancelling}
                  onClick={() => startBooking(booking.id)}
                  className="w-full min-h-[48px] rounded-xl text-sm font-semibold"
                >
                  {isStarting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  Bắt đầu làm
                </Button>
              )}

              {canAcceptAndComplete && (
                <Button
                  type="button"
                  size="lg"
                  onClick={() => setConfirmAcceptOpen(true)}
                  className="w-full min-h-[48px] rounded-xl text-sm font-semibold"
                >
                  <CheckCircle2 className="size-4" />
                  Xác nhận nghiệm thu &amp; Hoàn tất đơn
                </Button>
              )}

              {canCancel && (
                <Button
                  type="button"
                  variant={canProviderStart ? "outline" : "destructive"}
                  size="lg"
                  disabled={isStarting || isCancelling}
                  onClick={() => openReasonDialog("cancel")}
                  className={cn(
                    "w-full min-h-[44px] rounded-xl",
                    canProviderStart &&
                      "text-destructive hover:text-destructive",
                  )}
                >
                  <XCircle className="size-4" />
                  Hủy đơn đặt lịch
                </Button>
              )}
            </section>
          )}

          {/* Khối Đánh giá dịch vụ placeholder cho #134 */}
          {booking.status === "COMPLETED" && isCustomerOwner && (
            <section className="rounded-2xl border border-dashed border-border bg-card p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Star className="size-4 text-amber-500" />
                <h2 className="text-base font-semibold text-foreground">
                  Đánh giá chất lượng dịch vụ
                </h2>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Tính năng đánh giá 5 sao &amp; minh bạch chi phí cho thợ đang được tích hợp ở phân hệ Đánh giá &amp; Uy tín (#134).
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={notifyComingSoon}
                className="min-h-[44px]"
              >
                Gửi đánh giá (Sắp ra mắt)
              </Button>
            </section>
          )}

          {/* Nhật ký trạng thái */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <h2 className="text-base font-semibold text-foreground">
              Nhật ký trạng thái đơn hàng
            </h2>
            <ol className="space-y-3">
              {booking.statusHistories.map((history) => (
                <li
                  key={history.id}
                  className="relative pl-5 before:absolute before:top-2 before:left-1 before:size-2 before:rounded-full before:bg-primary"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <BookingStatusBadge status={history.newStatus} />
                    <span className="text-xs text-muted-foreground">
                      {formatVnDateTime(history.createdAt)}
                    </span>
                  </div>
                  {history.reason && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {history.reason}
                      {history.changedByName ? ` — ${history.changedByName}` : ""}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      {/* Dialog xác nhận nghiệm thu hoàn tất */}
      <Dialog
        open={confirmAcceptOpen}
        onOpenChange={(open) => {
          if (!open && !isCompleting) setConfirmAcceptOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận nghiệm thu &amp; Hoàn tất đơn</DialogTitle>
            <DialogDescription>
              Bạn xác nhận đã kiểm tra đối chiếu ảnh Before/After và hài lòng với kết quả sửa chữa? Sau khi hoàn tất, đơn sẽ chốt doanh thu {formatVnd(booking.totalPrice)} cho nhà cung cấp.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isCompleting}
              onClick={() => setConfirmAcceptOpen(false)}
              className="min-h-[44px]"
            >
              Xem lại ảnh
            </Button>
            <Button
              type="button"
              disabled={isCompleting}
              onClick={handleConfirmComplete}
              className="min-h-[44px]"
            >
              {isCompleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Đang hoàn tất...
                </>
              ) : (
                "Xác nhận hoàn tất"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog hủy / từ chối đơn */}
      <Dialog
        open={Boolean(reasonDialogMode)}
        onOpenChange={(open) => {
          if (!open && !isReasonSubmitting) setReasonDialogMode(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reasonDialogMode === "reject"
                ? `Từ chối đơn #${booking.bookingCode}`
                : `Hủy đơn #${booking.bookingCode}`}
            </DialogTitle>
            <DialogDescription>
              {reasonDialogMode === "reject"
                ? "Vui lòng nhập lý do từ chối rõ ràng để khách hàng nắm được. Khung giờ hẹn sẽ được giải phóng ngay lập tức."
                : "Vui lòng nhập lý do hủy đơn. Khung giờ hẹn sẽ được giải phóng ngay lập tức."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="detail-action-reason">
              {reasonDialogMode === "reject"
                ? "Lý do từ chối *"
                : "Lý do hủy đơn *"}
            </Label>
            <textarea
              id="detail-action-reason"
              rows={3}
              maxLength={500}
              value={actionReason}
              onChange={(e) => {
                setActionReason(e.target.value);
                if (actionReasonError) setActionReasonError(null);
              }}
              placeholder="Nhập lý do cụ thể..."
              className={cn(
                "w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                actionReasonError ? "border-destructive" : "border-input",
              )}
            />
            {actionReasonError && (
              <p className="text-xs font-medium text-destructive">
                {actionReasonError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isReasonSubmitting}
              onClick={() => setReasonDialogMode(null)}
              className="min-h-[44px]"
            >
              Đóng
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isReasonSubmitting}
              onClick={handleConfirmReasonAction}
              className="min-h-[44px]"
            >
              {isReasonSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : reasonDialogMode === "reject" ? (
                "Xác nhận từ chối"
              ) : (
                "Xác nhận hủy"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Wrapper>
  );
}
