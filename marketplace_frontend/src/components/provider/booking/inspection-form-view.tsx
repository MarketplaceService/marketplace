"use client";

import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBookingDetail } from "@/hooks/use-bookings";
import {
  useSubmitInspection,
  useUploadInspectionImage,
} from "@/hooks/use-provider-bookings";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { formatVnd } from "@/lib/travel-fee";
import { formatVnDateTime } from "@/lib/vn-time";
import type {
  BookingDetail,
  ExtraMaterialItem,
  InspectionPhoto,
  TechnicalSpecItem,
} from "@/types/booking.types";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Camera,
  CheckCircle2,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

const MAX_PHOTOS_PER_SIDE = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

interface MaterialDraft {
  name: string;
  quantity: string;
  unitPrice: string;
  reason: string;
}

export function InspectionFormView({ bookingId }: { bookingId: string }) {
  const {
    data: booking,
    isLoading,
    isError,
    error,
    refetch,
  } = useBookingDetail(bookingId);

  if (isLoading) {
    return (
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-80 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="max-w-3xl w-full mx-auto px-4 sm:px-8 py-12">
        <div className="rounded-2xl border border-destructive/30 bg-card p-8 text-center space-y-4">
          <AlertCircle className="mx-auto size-10 text-destructive" />
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-foreground">
              Không tải được thông tin đơn đặt lịch
            </h1>
            <p className="text-sm text-muted-foreground">
              {getApiErrorMessage(
                error,
                "Đơn đặt lịch không tồn tại hoặc không thuộc quyền quản lý của bạn.",
              )}
            </p>
          </div>
          <div className="flex justify-center gap-3">
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
              href="/provider/inspections"
              className="inline-flex min-h-[44px] items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Về danh sách nghiệm thu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (booking.status !== "IN_PROGRESS") {
    return (
      <div className="max-w-3xl w-full mx-auto px-4 sm:px-8 py-12">
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4 shadow-xs">
          <AlertCircle className="mx-auto size-10 text-warning" />
          <div className="space-y-1">
            <div className="flex justify-center">
              <BookingStatusBadge status={booking.status} />
            </div>
            <h1 className="text-lg font-bold text-foreground">
              Đơn #{booking.bookingCode} hiện không ở trạng thái Đang thực hiện
            </h1>
            <p className="text-sm text-muted-foreground">
              Chỉ các đơn ở trạng thái Đang thực hiện mới có thể tải ảnh và nộp biên bản nghiệm thu.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/provider/bookings"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <ArrowLeft className="size-4" />
              Quay lại đơn hàng
            </Link>
            <Link
              href={`/provider/bookings/${booking.id}`}
              className="inline-flex min-h-[44px] items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Xem chi tiết đơn
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <InspectionFormEditor key={booking.updatedAt} booking={booking} />;
}

function InspectionFormEditor({ booking }: { booking: BookingDetail }) {
  const router = useRouter();
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const [beforePhotos, setBeforePhotos] = useState<InspectionPhoto[]>(
    () => booking.inspectionImages?.before ?? [],
  );
  const [afterPhotos, setAfterPhotos] = useState<InspectionPhoto[]>(
    () => booking.inspectionImages?.after ?? [],
  );
  const [technicalSpecs, setTechnicalSpecs] = useState<TechnicalSpecItem[]>(
    () => booking.inspectionImages?.technicalSpecs ?? [],
  );
  const [extraMaterials, setExtraMaterials] = useState<MaterialDraft[]>(() =>
    (booking.inspectionImages?.extraMaterials ?? []).map((item) => ({
      name: item.name,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
      reason: item.reason,
    })),
  );
  const [fieldNote, setFieldNote] = useState(
    () => booking.inspectionImages?.fieldNote ?? "",
  );
  const [uploadingSide, setUploadingSide] = useState<"before" | "after" | null>(
    null,
  );

  const { mutateAsync: uploadImage } = useUploadInspectionImage();
  const { mutate: submitInspection, isPending: isSubmitting } =
    useSubmitInspection();

  const initialPhotos = booking.inspectionImages?.initial ?? [];

  const handleUploadSide = async (
    kind: "before" | "after",
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const currentList = kind === "before" ? beforePhotos : afterPhotos;
    const remaining = MAX_PHOTOS_PER_SIDE - currentList.length;
    if (remaining <= 0) {
      toast.error(`Mỗi bên chỉ tải tối đa ${MAX_PHOTOS_PER_SIDE} ảnh`);
      return;
    }

    const candidates = files.slice(0, remaining);
    for (const file of candidates) {
      if (!ALLOWED_MIME.has(file.type)) {
        toast.error("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP");
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`Ảnh "${file.name}" vượt quá dung lượng 5MB`);
        return;
      }
    }

    setUploadingSide(kind);
    try {
      const uploaded: InspectionPhoto[] = [];
      for (const file of candidates) {
        const photo = await uploadImage({
          bookingId: booking.id,
          kind,
          file,
        });
        uploaded.push(photo);
      }

      if (kind === "before") {
        setBeforePhotos((prev) => [...prev, ...uploaded]);
      } else {
        setAfterPhotos((prev) => [...prev, ...uploaded]);
      }
      toast.success(`Đã tải lên ${uploaded.length} ảnh`);
    } catch {
      // Lỗi đã được mutationErrorToast xử lý
    } finally {
      setUploadingSide(null);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (beforePhotos.length < 1 || afterPhotos.length < 1) {
      toast.error(
        "Cần tải tối thiểu 1 ảnh Trước khi sửa và 1 ảnh Sau khi sửa",
      );
      return;
    }

    const cleanedSpecs: TechnicalSpecItem[] = [];
    for (const spec of technicalSpecs) {
      const label = spec.label.trim();
      const value = spec.value.trim();
      const status = spec.status?.trim();
      if (!label && !value && !status) continue;
      if (!label || !value) {
        toast.error(
          "Mỗi dòng thông số kỹ thuật cần nhập đủ Tên thông số và Giá trị",
        );
        return;
      }
      cleanedSpecs.push({
        label,
        value,
        ...(status ? { status } : {}),
      });
    }

    const cleanedMaterials: ExtraMaterialItem[] = [];
    for (const item of extraMaterials) {
      const name = item.name.trim();
      const reason = item.reason.trim();
      if (!name && !reason) continue;
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      if (!name || !reason || Number.isNaN(quantity) || quantity <= 0 || Number.isNaN(unitPrice) || unitPrice < 0) {
        toast.error(
          "Mỗi dòng vật tư tham khảo cần đủ Tên vật tư, SL > 0, Đơn giá ≥ 0 và Lý do",
        );
        return;
      }
      cleanedMaterials.push({ name, quantity, unitPrice, reason });
    }

    submitInspection(
      {
        bookingId: booking.id,
        payload: {
          before: beforePhotos,
          after: afterPhotos,
          technicalSpecs: cleanedSpecs.length > 0 ? cleanedSpecs : undefined,
          extraMaterials:
            cleanedMaterials.length > 0 ? cleanedMaterials : undefined,
          fieldNote: fieldNote.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          router.push(`/provider/bookings/${booking.id}`);
        },
      },
    );
  };

  const canSubmit =
    beforePhotos.length >= 1 &&
    afterPhotos.length >= 1 &&
    !uploadingSide &&
    !isSubmitting;

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6"
    >
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/provider/inspections"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Quay lại danh sách nghiệm thu
        </Link>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Biên bản nghiệm thu #{booking.bookingCode}
          </h1>
          <BookingStatusBadge status={booking.status} />
        </div>
      </div>

      {/* Tóm tắt thông tin đơn & giá niêm yết */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-foreground">
              {booking.serviceTitleSnapshot}
            </h2>
            <p className="text-sm text-muted-foreground">
              Khách hàng:{" "}
              <strong className="text-foreground">
                {booking.customer.name}
              </strong>{" "}
              • {booking.serviceAddressSnapshot.phone}
            </p>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5 text-primary" />
              {formatVnDateTime(booking.scheduledStartAt)}
            </p>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span>
                {booking.serviceAddressSnapshot.addressLine1},{" "}
                {booking.serviceAddressSnapshot.ward},{" "}
                {booking.serviceAddressSnapshot.city}
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-left sm:text-right">
            <p className="text-xs font-medium text-muted-foreground">
              Giá chốt cố định trên sàn
            </p>
            <p className="text-2xl font-bold text-primary">
              {formatVnd(booking.totalPrice)}
            </p>
          </div>
        </div>

        {initialPhotos.length > 0 && (
          <div className="border-t border-border pt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ảnh hiện trạng ban đầu khách hàng đã gửi
            </p>
            <div className="flex flex-wrap gap-3">
              {initialPhotos.map((img, idx) => (
                <a
                  key={img.url}
                  href={img.url}
                  target="_blank"
                  rel="noreferrer"
                  className="size-20 overflow-hidden rounded-xl border border-border bg-muted block"
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

      {/* 2 vùng upload ảnh Before / After */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <PhotoUploadSideCard
          title="Ảnh TRƯỚC KHI SỬA (Before)"
          subtitle="Chụp rõ tình trạng thiết bị/vị trí hỏng trước khi thao tác"
          badgeCount={beforePhotos.length}
          photos={beforePhotos}
          inputRef={beforeInputRef}
          isUploading={uploadingSide === "before"}
          onSelectFiles={(e) => void handleUploadSide("before", e)}
          onRemove={(url) =>
            setBeforePhotos((prev) => prev.filter((item) => item.url !== url))
          }
        />

        <PhotoUploadSideCard
          title="Ảnh SAU KHI SỬA (After)"
          subtitle="Chụp rõ kết quả đã hoàn thiện, sạch sẽ và vận hành ổn định"
          badgeCount={afterPhotos.length}
          photos={afterPhotos}
          inputRef={afterInputRef}
          isUploading={uploadingSide === "after"}
          onSelectFiles={(e) => void handleUploadSide("after", e)}
          onRemove={(url) =>
            setAfterPhotos((prev) => prev.filter((item) => item.url !== url))
          }
        />
      </div>

      {/* Thông số kiểm tra kỹ thuật */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Thông số kiểm tra kỹ thuật (tùy chọn)
            </h2>
            <p className="text-xs text-muted-foreground">
              Ví dụ: Áp suất gas, nhiệt độ cửa gió, điện trở cách điện...
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setTechnicalSpecs((prev) => [
                ...prev,
                { label: "", value: "", status: "Đạt chuẩn" },
              ])
            }
            className="min-h-[44px]"
          >
            <Plus className="size-4" />
            Thêm thông số
          </Button>
        </div>

        {technicalSpecs.length > 0 && (
          <div className="space-y-3">
            {technicalSpecs.map((spec, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-background p-3 sm:grid-cols-12 items-center"
              >
                <Input
                  value={spec.label}
                  onChange={(e) =>
                    setTechnicalSpecs((prev) =>
                      prev.map((item, i) =>
                        i === idx ? { ...item, label: e.target.value } : item,
                      ),
                    )
                  }
                  placeholder="Tên thông số (VD: Nhiệt độ cửa gió)"
                  className="sm:col-span-5 h-11"
                />
                <Input
                  value={spec.value}
                  onChange={(e) =>
                    setTechnicalSpecs((prev) =>
                      prev.map((item, i) =>
                        i === idx ? { ...item, value: e.target.value } : item,
                      ),
                    )
                  }
                  placeholder="Giá trị đo (VD: 11°C)"
                  className="sm:col-span-3 h-11"
                />
                <Input
                  value={spec.status ?? ""}
                  onChange={(e) =>
                    setTechnicalSpecs((prev) =>
                      prev.map((item, i) =>
                        i === idx ? { ...item, status: e.target.value } : item,
                      ),
                    )
                  }
                  placeholder="Đánh giá (VD: Đạt chuẩn)"
                  className="sm:col-span-3 h-11"
                />
                <div className="sm:col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Xóa thông số ${idx + 1}`}
                    onClick={() =>
                      setTechnicalSpecs((prev) =>
                        prev.filter((_, i) => i !== idx),
                      )
                    }
                    className="min-h-[44px] min-w-[44px] text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Vật tư phát sinh tham khảo */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Vật tư phát sinh tham khảo (tùy chọn)
            </h2>
            <p className="text-xs text-muted-foreground">
              Ghi nhận minh bạch nếu có linh kiện cần thay thế ngoài phạm vi dịch vụ chuẩn.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setExtraMaterials((prev) => [
                ...prev,
                { name: "", quantity: "1", unitPrice: "0", reason: "" },
              ])
            }
            className="min-h-[44px]"
          >
            <Plus className="size-4" />
            Thêm vật tư
          </Button>
        </div>

        <div
          role="note"
          className="flex items-start gap-2.5 rounded-xl border border-amber-300/70 bg-amber-50/80 p-3.5 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Chỉ thực hiện khi khách đồng ý trực tiếp tại chỗ —{" "}
            <strong>
              tổng tiền thanh toán qua sàn giữ nguyên{" "}
              {formatVnd(booking.totalPrice)}
            </strong>{" "}
            và không tự động cộng thêm.
          </span>
        </div>

        {extraMaterials.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <div className="hidden sm:grid sm:grid-cols-12 gap-2 border-b border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
              <span className="sm:col-span-4">Tên vật tư</span>
              <span className="sm:col-span-2">SL</span>
              <span className="sm:col-span-2">Đơn giá</span>
              <span className="sm:col-span-3">Lý do</span>
              <span className="sm:col-span-1" aria-hidden="true" />
            </div>
            <div className="divide-y divide-border">
              {extraMaterials.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-12 sm:items-center"
                >
                  <div className="sm:col-span-4 space-y-1 sm:space-y-0">
                    <Label
                      htmlFor={`material-name-${idx}`}
                      className="text-xs text-muted-foreground sm:sr-only"
                    >
                      Tên vật tư
                    </Label>
                    <Input
                      id={`material-name-${idx}`}
                      value={item.name}
                      onChange={(e) =>
                        setExtraMaterials((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, name: e.target.value } : row,
                          ),
                        )
                      }
                      placeholder="Tên vật tư"
                      className="h-11"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1 sm:space-y-0">
                    <Label
                      htmlFor={`material-qty-${idx}`}
                      className="text-xs text-muted-foreground sm:sr-only"
                    >
                      SL
                    </Label>
                    <Input
                      id={`material-qty-${idx}`}
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.quantity}
                      onChange={(e) =>
                        setExtraMaterials((prev) =>
                          prev.map((row, i) =>
                            i === idx
                              ? { ...row, quantity: e.target.value }
                              : row,
                          ),
                        )
                      }
                      placeholder="SL"
                      className="h-11"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1 sm:space-y-0">
                    <Label
                      htmlFor={`material-price-${idx}`}
                      className="text-xs text-muted-foreground sm:sr-only"
                    >
                      Đơn giá
                    </Label>
                    <Input
                      id={`material-price-${idx}`}
                      type="number"
                      min="0"
                      step="1000"
                      value={item.unitPrice}
                      onChange={(e) =>
                        setExtraMaterials((prev) =>
                          prev.map((row, i) =>
                            i === idx
                              ? { ...row, unitPrice: e.target.value }
                              : row,
                          ),
                        )
                      }
                      placeholder="Đơn giá (đ)"
                      className="h-11"
                    />
                  </div>
                  <div className="sm:col-span-3 space-y-1 sm:space-y-0">
                    <Label
                      htmlFor={`material-reason-${idx}`}
                      className="text-xs text-muted-foreground sm:sr-only"
                    >
                      Lý do
                    </Label>
                    <Input
                      id={`material-reason-${idx}`}
                      value={item.reason}
                      onChange={(e) =>
                        setExtraMaterials((prev) =>
                          prev.map((row, i) =>
                            i === idx
                              ? { ...row, reason: e.target.value }
                              : row,
                          ),
                        )
                      }
                      placeholder="Nhập lý do"
                      className="h-11"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Xóa vật tư ${idx + 1}`}
                      onClick={() =>
                        setExtraMaterials((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                      className="min-h-[44px] min-w-[44px] text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Ghi chú bàn giao & Nút gửi */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="space-y-2">
          <Label htmlFor="inspection-field-note">
            Ghi chú bàn giao &amp; hướng dẫn bảo dưỡng (tùy chọn)
          </Label>
          <textarea
            id="inspection-field-note"
            rows={3}
            maxLength={2000}
            value={fieldNote}
            onChange={(e) => setFieldNote(e.target.value)}
            placeholder="Ví dụ: Đã vệ sinh dàn lạnh/dàn nóng, thông đường thoát nước và kiểm tra chạy thử ổn định 15 phút..."
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {beforePhotos.length >= 1 && afterPhotos.length >= 1 ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-primary">
                <CheckCircle2 className="size-4" />
                Đã đủ ảnh Trước ({beforePhotos.length}) &amp; Sau ({afterPhotos.length}) để gửi nghiệm thu
              </span>
            ) : (
              <span>
                Bắt buộc tải ít nhất 1 ảnh TRƯỚC và 1 ảnh SAU khi sửa để gửi cho khách hàng.
              </span>
            )}
          </p>

          <Button
            type="submit"
            size="lg"
            disabled={!canSubmit}
            className="min-h-[48px] px-6 rounded-xl text-sm font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Đang gửi biên bản...
              </>
            ) : (
              <>
                <Send className="size-4" />
                Gửi biên bản nghiệm thu cho Khách hàng
              </>
            )}
          </Button>
        </div>
      </section>
    </form>
  );
}

function PhotoUploadSideCard({
  title,
  subtitle,
  badgeCount,
  photos,
  inputRef,
  isUploading,
  onSelectFiles,
  onRemove,
}: {
  title: string;
  subtitle: string;
  badgeCount: number;
  photos: InspectionPhoto[];
  inputRef: React.RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  onSelectFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (url: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <span
          className={
            badgeCount >= 1
              ? "rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary shrink-0"
              : "rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 shrink-0"
          }
        >
          {badgeCount} ảnh
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={onSelectFiles}
        className="hidden"
      />

      <Button
        type="button"
        variant="outline"
        disabled={isUploading || photos.length >= MAX_PHOTOS_PER_SIDE}
        onClick={() => inputRef.current?.click()}
        className="w-full min-h-[44px] border-dashed"
      >
        {isUploading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Camera className="size-4" />
        )}
        {isUploading ? "Đang tải ảnh lên..." : "Chọn ảnh tải lên (JPG/PNG/WebP)"}
      </Button>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5">
          {photos.map((photo, index) => (
            <div
              key={`${photo.url}-${index}`}
              className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={`${title} ${index + 1}`}
                className="size-full object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(photo.url)}
                aria-label={`Xóa ảnh ${index + 1}`}
                className="absolute top-1.5 right-1.5 flex size-8 items-center justify-center rounded-full bg-slate-900/75 text-white hover:bg-destructive transition-colors cursor-pointer"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
