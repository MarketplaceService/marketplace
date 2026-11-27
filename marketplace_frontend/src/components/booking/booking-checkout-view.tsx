"use client";

import { BookingPaymentMethodSlot } from "@/components/booking/booking-payment-method-slot";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAddresses } from "@/hooks/use-addresses";
import { useAuthSession } from "@/hooks/use-auth";
import {
  useBookingPreview,
  useCreateBooking,
  useUploadInitialBookingImages,
} from "@/hooks/use-bookings";
import { usePaymentMethods } from "@/hooks/use-payment";
import { usePublicProvider } from "@/hooks/use-provider";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { redirectToPayos } from "@/lib/payment";
import { FREE_TRAVEL_KM, formatVnd } from "@/lib/travel-fee";
import { cn } from "@/lib/utils";
import { formatVnDateTime } from "@/lib/vn-time";
import type { InspectionPhoto, PaymentMethod } from "@/types/booking.types";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  Camera,
  CheckCircle2,
  Loader2,
  LogIn,
  MapPin,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

const MAX_INITIAL_PHOTOS = 3;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

interface BookingCheckoutViewProps {
  providerId: string;
  serviceId?: string;
  startAt?: string;
}

/**
 * Vỏ của trang checkout: chặn guest và admin trước khi gọi API đặt lịch.
 * proxy.ts đã chuyển người chưa đăng nhập và phiên ẩn danh sang trang đăng nhập; lớp này bắt nốt
 * trường hợp phiên trong cache là guest hoặc vừa hết hạn.
 */
export function BookingCheckoutView(props: BookingCheckoutViewProps) {
  const { data: session, isLoading } = useAuthSession();

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 space-y-4">
        <div className="h-10 w-1/2 animate-pulse rounded-xl bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </main>
    );
  }

  if (!session?.isAuthenticated || session.isGuest || !session.user) {
    const query = new URLSearchParams();
    if (props.serviceId) query.set("serviceId", props.serviceId);
    if (props.startAt) query.set("startAt", props.startAt);
    const queryString = query.toString();
    const redirectTo = `/providers/${props.providerId}/book${queryString ? `?${queryString}` : ""}`;

    return (
      <CheckoutNotice
        icon={<LogIn className="mx-auto size-10 text-primary" />}
        title="Đăng nhập để đặt lịch"
        description="Bạn cần đăng nhập bằng tài khoản đã xác minh để đặt lịch và thanh toán. Khung giờ bạn chọn được giữ nguyên sau khi đăng nhập."
        href={`/auth/signin?redirect=${encodeURIComponent(redirectTo)}`}
        actionLabel="Đăng nhập"
      />
    );
  }

  if (session.user.role === "admin") {
    return (
      <CheckoutNotice
        icon={<ShieldAlert className="mx-auto size-10 text-warning" />}
        title="Tài khoản quản trị không đặt lịch được"
        description="Hãy dùng tài khoản khách hàng hoặc nhà cung cấp để đặt lịch dịch vụ."
        href={`/providers/${props.providerId}`}
        actionLabel="Quay lại hồ sơ thợ"
      />
    );
  }

  return <BookingCheckoutContent {...props} />;
}

function CheckoutNotice({
  icon,
  title,
  description,
  href,
  actionLabel,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-8">
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-xs space-y-4">
        {icon}
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Link
          href={href}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {actionLabel}
        </Link>
      </div>
    </main>
  );
}

function BookingCheckoutContent({
  providerId,
  serviceId,
  startAt,
}: BookingCheckoutViewProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Chặn bấm "Xác nhận" hai lần trước khi isPending kịp cập nhật
  const submittingRef = useRef(false);

  const [pickedAddressId, setPickedAddressId] = useState<string | null>(null);
  const [customerNote, setCustomerNote] = useState("");
  const [initialImages, setInitialImages] = useState<InspectionPhoto[]>([]);
  const [pickedMethod, setPickedMethod] = useState<PaymentMethod | null>(null);

  const { data: paymentMethods, isLoading: methodsLoading } = usePaymentMethods();
  const isMethodEnabled = (method: PaymentMethod) =>
    paymentMethods?.some((item) => item.method === method && item.enabled) ?? false;
  // PayOS được chọn sẵn khi đã bật; lựa chọn của khách chỉ được giữ nếu phương thức đó còn bật
  const paymentMethod: PaymentMethod =
    pickedMethod && isMethodEnabled(pickedMethod)
      ? pickedMethod
      : isMethodEnabled("payos")
        ? "payos"
        : "cod";

  const { data: provider, isLoading: providerLoading } = usePublicProvider(providerId);
  const {
    data: addresses = [],
    isLoading: addressesLoading,
    isError: addressesError,
    refetch: refetchAddresses,
  } = useAddresses();

  const effectiveAddressId =
    pickedAddressId && addresses.some((a) => a.id === pickedAddressId)
      ? pickedAddressId
      : (addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null);

  const previewPayload =
    serviceId && startAt && effectiveAddressId
      ? {
          serviceId,
          addressId: effectiveAddressId,
          scheduledStartAt: startAt,
        }
      : null;

  const {
    data: preview,
    isLoading: previewLoading,
    isError: previewError,
    error: previewErrorObj,
    refetch: refetchPreview,
  } = useBookingPreview(previewPayload);

  const { mutateAsync: uploadImages, isPending: isUploadingImages } =
    useUploadInitialBookingImages();
  const { mutate: createBooking, isPending: isCreating } = useCreateBooking();

  if (!serviceId || !startAt) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-8">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-xs space-y-4">
          <AlertCircle className="mx-auto size-10 text-warning" />
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-foreground">
              Thiếu thông tin dịch vụ hoặc khung giờ
            </h1>
            <p className="text-sm text-muted-foreground">
              Vui lòng chọn lại dịch vụ và khung giờ trống trên hồ sơ của thợ trước khi đặt lịch.
            </p>
          </div>
          <Link
            href={`/providers/${providerId}`}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Quay lại chọn khung giờ
          </Link>
        </div>
      </main>
    );
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length === 0) return;

    const remaining = MAX_INITIAL_PHOTOS - initialImages.length;
    if (remaining <= 0) {
      toast.error("Chỉ được đính kèm tối đa 3 ảnh hiện trạng ban đầu");
      return;
    }

    const candidates = selected.slice(0, remaining);
    if (selected.length > remaining) {
      toast.warning(`Chỉ tải thêm được ${remaining} ảnh nữa (tối đa 3 ảnh)`);
    }

    for (const file of candidates) {
      if (!ALLOWED_MIME.has(file.type)) {
        toast.error("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP");
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`Ảnh "${file.name}" vượt quá dung lượng tối đa 5MB`);
        return;
      }
    }

    try {
      const uploaded = await uploadImages(candidates);
      setInitialImages((prev) => [...prev, ...uploaded]);
      toast.success(`Đã tải lên ${uploaded.length} ảnh hiện trạng`);
    } catch {
      // Lỗi đã được mutationErrorToast hiển thị
    }
  };

  const handleRemoveImage = (url: string) => {
    setInitialImages((prev) => prev.filter((item) => item.url !== url));
  };

  const handleSubmit = () => {
    if (
      submittingRef.current ||
      !effectiveAddressId ||
      !preview?.canBook ||
      isCreating ||
      isUploadingImages ||
      methodsLoading
    ) {
      return;
    }
    submittingRef.current = true;

    createBooking(
      {
        serviceId,
        addressId: effectiveAddressId,
        scheduledStartAt: startAt,
        customerNote: customerNote.trim() || undefined,
        initialImages: initialImages.length > 0 ? initialImages : undefined,
        paymentMethod,
      },
      {
        onSuccess: (created) => {
          const payment = created.latestPayment;
          if (paymentMethod === "payos") {
            // Giữ submittingRef để không bấm lại trong lúc trình duyệt rời sang trang PayOS
            if (
              payment?.paymentMethod === "payos" &&
              payment.status === "pending" &&
              redirectToPayos(payment.paymentLinkUrl)
            ) {
              return;
            }
            toast.warning(
              "Đã tạo đơn nhưng chưa tạo được link thanh toán. Bạn có thể thử lại trong trang đơn.",
            );
          }
          router.push(`/bookings/${created.id}`);
        },
        onError: () => {
          submittingRef.current = false;
        },
      },
    );
  };

  const serviceInfo =
    preview?.service ??
    provider?.services.find((item) => item.id === serviceId) ??
    null;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href={`/providers/${providerId}?serviceId=${encodeURIComponent(serviceId)}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Đổi khung giờ hoặc dịch vụ
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Xác nhận đặt lịch dịch vụ
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Cột trái: Thông tin đặt lịch, Địa chỉ & Ảnh hiện trạng */}
        <div className="space-y-6 lg:col-span-7">
          {/* 1. Thông tin Thợ & Khung giờ */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <h2 className="text-base font-semibold text-foreground">
              Thông tin lịch hẹn
            </h2>

            {providerLoading ? (
              <div className="h-20 animate-pulse rounded-xl bg-muted" />
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="size-12 border border-border shrink-0">
                    <AvatarImage
                      src={provider?.avatarUrl ?? undefined}
                      alt={provider?.displayName ?? "Nhà cung cấp"}
                    />
                    <AvatarFallback className="bg-primary/10 font-bold text-primary">
                      {(provider?.displayName?.charAt(0) || "T").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {serviceInfo?.title ?? "Dịch vụ đã chọn"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      Thợ phụ trách: <span className="font-medium text-foreground">{provider?.displayName ?? "Đang tải..."}</span>
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm shrink-0">
                  <div className="flex items-center gap-2 font-semibold text-primary">
                    <CalendarClock className="size-4" />
                    <span>{formatVnDateTime(startAt)}</span>
                  </div>
                  {serviceInfo && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Thời lượng dự kiến: {serviceInfo.durationMinutes} phút
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* 2. Địa chỉ phục vụ */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">
                Địa chỉ thực hiện dịch vụ
              </h2>
              <Link
                href="/account"
                className="inline-flex min-h-[36px] items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Plus className="size-3.5" />
                Quản lý sổ địa chỉ
              </Link>
            </div>

            {addressesLoading ? (
              <div className="space-y-3">
                <div className="h-20 animate-pulse rounded-xl bg-muted" />
                <div className="h-20 animate-pulse rounded-xl bg-muted" />
              </div>
            ) : addressesError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-center justify-between gap-3">
                <p className="text-sm text-destructive">
                  Không tải được sổ địa chỉ của bạn.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void refetchAddresses()}
                >
                  <RefreshCw className="size-3.5" />
                  Thử lại
                </Button>
              </div>
            ) : addresses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3">
                <MapPin className="mx-auto size-8 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Bạn chưa có địa chỉ nhận dịch vụ nào
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hãy thêm ít nhất một địa chỉ có tọa độ để hệ thống tính chính xác cự ly và phí di chuyển.
                  </p>
                </div>
                <Link
                  href="/account"
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plus className="size-4" />
                  Thêm địa chỉ ngay
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr) => {
                  const isSelected = addr.id === effectiveAddressId;
                  return (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => setPickedAddressId(addr.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        "w-full min-h-[44px] cursor-pointer rounded-xl border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:bg-muted/50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">
                              {addr.fullName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              • {addr.phone}
                            </span>
                            {addr.isDefault && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                Mặc định
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {addr.addressLine1}
                            {addr.addressLine2 ? `, ${addr.addressLine2}` : ""},{" "}
                            {addr.ward}
                            {addr.district ? `, ${addr.district}` : ""}, {addr.city}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {preview && effectiveAddressId && (
              <div
                className={cn(
                  "rounded-xl border p-3.5 text-sm flex items-start gap-2.5",
                  preview.inServiceArea
                    ? "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                    : "border-destructive/40 bg-destructive/10 text-destructive",
                )}
              >
                <MapPin className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="font-semibold">
                    Khoảng cách ước tính: {preview.pricing.distanceKm} km
                    {preview.inServiceArea
                      ? preview.pricing.isFreeShipping
                        ? " — Miễn phí di chuyển"
                        : ` — Phụ phí di chuyển ${formatVnd(preview.pricing.distanceFee)}`
                      : " — Nằm ngoài vùng phục vụ của thợ"}
                  </p>
                  {preview.provider.areaName && preview.provider.radiusKm && (
                    <p className="mt-0.5 text-xs opacity-80">
                      Khu vực phục vụ của thợ: {preview.provider.areaName} (bán kính{" "}
                      {preview.provider.radiusKm} km)
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* 3. Ghi chú & Ảnh hiện trạng ban đầu */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Mô tả tình trạng &amp; ảnh hiện trạng ban đầu
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Giúp thợ chuẩn bị đúng dụng cụ, linh kiện trước khi di chuyển đến nhà bạn.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="booking-customer-note">
                Ghi chú cho thợ (tùy chọn)
              </Label>
              <textarea
                id="booking-customer-note"
                rows={3}
                maxLength={1000}
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="Ví dụ: Máy lạnh Daikin 1.5HP chảy nước dàn lạnh, nhà ở tầng 3, gọi trước khi đến 15 phút..."
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
              />
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  Ảnh hiện trạng ban đầu ({initialImages.length}/{MAX_INITIAL_PHOTOS})
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={
                    initialImages.length >= MAX_INITIAL_PHOTOS || isUploadingImages
                  }
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[44px]"
                >
                  {isUploadingImages ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Camera className="size-4" />
                  )}
                  {isUploadingImages ? "Đang tải ảnh..." : "Thêm ảnh hiện trạng"}
                </Button>
              </div>

              {initialImages.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {initialImages.map((img, index) => (
                    <div
                      key={img.url}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={`Hiện trạng ban đầu ${index + 1}`}
                        className="size-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img.url)}
                        aria-label={`Xóa ảnh hiện trạng ${index + 1}`}
                        className="absolute top-1.5 right-1.5 flex size-8 items-center justify-center rounded-full bg-slate-900/75 text-white hover:bg-destructive transition-colors cursor-pointer"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Cột phải: Bảng tính tổng tiền & Nút xác nhận */}
        <aside className="lg:col-span-5">
          <div className="sticky top-20 rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
            <h2 className="text-lg font-bold text-foreground">
              Tóm tắt chi phí dự kiến
            </h2>

            {!effectiveAddressId ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Hãy chọn hoặc thêm địa chỉ phục vụ ở cột bên trái để hệ thống tính tổng tiền chính xác.
              </p>
            ) : previewLoading ? (
              <div className="space-y-3">
                <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-5 w-full animate-pulse rounded bg-muted" />
                <div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
              </div>
            ) : previewError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <p className="text-sm font-medium text-destructive">
                  {getApiErrorMessage(
                    previewErrorObj,
                    "Không kiểm tra được báo giá cho khung giờ này",
                  )}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void refetchPreview()}
                >
                  <RefreshCw className="size-3.5" />
                  Thử lại
                </Button>
              </div>
            ) : preview ? (
              <>
                {!preview.canBook && preview.unavailableReason && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-sm text-destructive"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{preview.unavailableReason}</span>
                  </div>
                )}

                <div className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-muted-foreground">
                        Giá dịch vụ ({preview.pricing.durationMinutes} phút)
                      </p>
                      {preview.pricing.priceUnit === "HOURLY" && (
                        <p className="text-xs text-muted-foreground">
                          Tính theo giờ: {formatVnd(preview.pricing.basePrice)} ×{" "}
                          {preview.pricing.durationMinutes}/60 phút
                        </p>
                      )}
                      {preview.pricing.priceUnit === "FROM" && (
                        <p className="text-xs text-muted-foreground">
                          Đơn giá khởi điểm tối thiểu trên sàn
                        </p>
                      )}
                    </div>
                    <span className="font-semibold text-foreground shrink-0">
                      {formatVnd(preview.pricing.serviceSubtotal)}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-muted-foreground">
                        Phí di chuyển ({preview.pricing.distanceKm} km)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Miễn phí ≤ {FREE_TRAVEL_KM} km, vượt +5.000 đ/km
                      </p>
                    </div>
                    <span
                      className={cn(
                        "font-semibold shrink-0",
                        preview.pricing.isFreeShipping
                          ? "text-primary"
                          : "text-foreground",
                      )}
                    >
                      {preview.pricing.isFreeShipping
                        ? "Miễn phí"
                        : formatVnd(preview.pricing.distanceFee)}
                    </span>
                  </div>

                  <div className="border-t border-border pt-3 flex items-baseline justify-between">
                    <span className="text-base font-bold text-foreground">
                      Tổng tiền tạm giữ
                    </span>
                    <span className="text-2xl font-bold text-primary">
                      {formatVnd(preview.pricing.totalPrice)}
                    </span>
                  </div>
                </div>

                <BookingPaymentMethodSlot
                  value={paymentMethod}
                  onChange={setPickedMethod}
                  options={paymentMethods}
                  isLoading={methodsLoading}
                  totalPrice={preview.pricing.totalPrice}
                />

                <Button
                  type="button"
                  size="lg"
                  disabled={
                    !preview.canBook || isCreating || isUploadingImages || methodsLoading
                  }
                  onClick={handleSubmit}
                  className="w-full min-h-[48px] rounded-xl text-base font-semibold"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Đang tạo đơn đặt lịch...
                    </>
                  ) : paymentMethod === "payos" ? (
                    `Đặt lịch và thanh toán (${formatVnd(preview.pricing.totalPrice)})`
                  ) : (
                    "Xác nhận đặt lịch"
                  )}
                </Button>

                <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    Giá tổng trên sàn được khóa cố định theo đơn. Mọi vật tư phát sinh (nếu có) chỉ thực hiện khi bạn đồng ý trực tiếp tại chỗ.
                  </span>
                </p>
              </>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
