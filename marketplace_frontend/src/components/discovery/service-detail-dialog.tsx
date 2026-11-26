"use client";

import { useServiceDetail } from "@/hooks/use-discovery";
import type { ServiceDetailItem } from "@/types/discovery.types";
import {
  ArrowRight,
  Clock,
  Info,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

interface ServiceDetailDialogProps {
  serviceId: string | null;
  open: boolean;
  onClose: () => void;
  fallbackService?: ServiceDetailItem | null;
  hideBookingAction?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

function getPriceUnitLabel(unit: string): string {
  switch (unit) {
    case "FIXED":
      return "Cố định";
    case "HOURLY":
      return "Theo giờ";
    case "FROM":
      return "Giá từ";
    default:
      return unit;
  }
}

export function ServiceDetailDialog({
  serviceId,
  open,
  onClose,
  fallbackService = null,
  hideBookingAction = false,
}: ServiceDetailDialogProps) {
  const { data: service, isLoading, isError } = useServiceDetail(
    open && !fallbackService ? serviceId : null,
  );
  const activeService = fallbackService ?? service;
  const showLoading = !fallbackService && isLoading;
  const showError = !fallbackService && (isError || !service);

  // Đóng modal khi nhấn phím Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Khóa scroll khi mở modal
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="min-h-full flex items-center justify-center p-4">
        <div className="relative w-full max-w-xl rounded-2xl bg-card p-6 shadow-2xl border border-border text-left space-y-5 z-10 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Modal */}
          <div className="flex items-start justify-between pb-3 border-b border-border">
            <div className="flex-1 pr-3">
              {showLoading ? (
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-muted rounded-full animate-pulse" />
                  <div className="h-6 w-3/4 bg-muted rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 mb-1.5">
                    {activeService?.category?.name || "Dịch vụ dân sinh"}
                  </span>
                  <h3 className="font-serif text-xl font-bold text-foreground">
                    {activeService?.title || "Chi tiết dịch vụ"}
                  </h3>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
              title="Đóng modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {showLoading ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-muted/50 border border-border">
                <div className="w-12 h-12 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-48 bg-muted rounded animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-28 bg-muted rounded animate-pulse" />
                <div className="h-4 w-full bg-muted rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
              </div>
              <div className="grid grid-cols-3 gap-3 h-16 bg-muted/40 rounded-xl animate-pulse" />
            </div>
          ) : showError || !activeService ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm text-destructive font-medium">
                Không thể tải thông tin dịch vụ. Vui lòng thử lại sau.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-muted text-foreground text-xs font-semibold hover:bg-muted/80 transition"
              >
                Đóng
              </button>
            </div>
          ) : (
            <>
              {/* Thông tin Nhà cung cấp phụ trách */}
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="size-12 shrink-0 ring-1 ring-border">
                    <AvatarImage
                      src={activeService.provider?.avatar ?? undefined}
                      alt={activeService.provider?.displayName}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {activeService.provider?.displayName?.charAt(0) || "T"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground text-sm truncate">
                        {activeService.provider?.displayName}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-xs shrink-0 ${
                          activeService.provider?.reviewCount > 0
                            ? "text-amber-500 font-bold"
                            : "text-muted-foreground font-medium"
                        }`}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            activeService.provider?.reviewCount > 0
                              ? "fill-amber-500 text-amber-500"
                              : "text-muted-foreground/70"
                          }`}
                        />
                        <span>
                          {activeService.provider?.reviewCount > 0
                            ? `${activeService.provider.ratingAverage.toFixed(1)} (${activeService.provider.reviewCount})`
                            : "Chưa có đánh giá"}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                        <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        Đã xác minh
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {activeService.provider?.experienceYears || 0} năm kinh nghiệm
                      {activeService.provider?.serviceAreas?.[0]?.areaName && (
                        <> • {activeService.provider.serviceAreas[0].areaName}</>
                      )}
                    </p>
                  </div>
                </div>
                {!hideBookingAction && activeService.provider?.id && (
                  <Link
                    href={`/providers/${activeService.provider.id}?serviceId=${activeService.id}`}
                    onClick={onClose}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-primary/30 bg-background hover:bg-primary/5 text-primary text-xs font-semibold transition shrink-0"
                  >
                    <span>Xem hồ sơ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              {/* Mô tả công việc chi tiết */}
              <div className="space-y-1.5">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                  Mô tả công việc chi tiết
                </h4>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                  {activeService.description ||
                    "Nhà cung cấp chưa cập nhật mô tả chi tiết cho dịch vụ này."}
                </p>
              </div>

              {/* Bảng 3 thông số: Giá cơ bản, Hình thức tính giá, Thời lượng ước tính */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-border bg-card text-center">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    Giá cơ bản
                  </span>
                  <p className="font-bold text-primary text-sm">
                    {formatCurrency(activeService.basePrice)}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    Hình thức tính giá
                  </span>
                  <p className="font-semibold text-foreground text-sm">
                    {getPriceUnitLabel(activeService.priceUnit)}
                  </p>
                </div>
                <div className="space-y-0.5 col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-muted-foreground">
                    Thời lượng ước tính
                  </span>
                  <p className="font-semibold text-foreground text-sm flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{activeService.durationMinutes} phút</span>
                  </p>
                </div>
              </div>

              {/* Banner quy chuẩn phụ phí di chuyển S18.2 */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/70 text-xs text-muted-foreground space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
                  <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Quy tắc phụ phí di chuyển minh bạch:</span>
                </div>
                <p className="pl-5 text-foreground/80">
                  • Cự ly &le; 3km:{" "}
                  <strong className="text-foreground font-semibold">
                    Miễn phí (0đ)
                  </strong>
                  .
                </p>
                <p className="pl-5 text-foreground/80">
                  • Cự ly &gt; 3km:{" "}
                  <strong className="text-foreground font-semibold">
                    +5.000đ/km
                  </strong>{" "}
                  cho phần cự ly vượt, cộng trực tiếp vào tổng tiền khi xác nhận
                  đặt lịch.
                </p>
              </div>

              {/* Nút hành động Modal */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground text-sm font-medium transition cursor-pointer"
                >
                  Đóng
                </button>
                {!hideBookingAction && (
                  <Link
                    href={`/providers/${activeService.provider?.id}?serviceId=${activeService.id}`}
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold shadow-xs transition cursor-pointer"
                  >
                    <span>Chọn khung giờ đặt lịch</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
