"use client";

import { Button } from "@/components/ui/button";
import { useCreateBookingReview } from "@/hooks/use-bookings";
import { cn } from "@/lib/utils";
import { formatVnDateTime } from "@/lib/vn-time";
import type { BookingDetail } from "@/types/booking.types";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Send,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useState } from "react";

const RATING_LABELS: Record<number, string> = {
  1: "1 sao — Rất không hài lòng",
  2: "2 sao — Chưa hài lòng",
  3: "3 sao — Bình thường",
  4: "4 sao — Hài lòng",
  5: "5 sao — Rất hài lòng",
};

const QUICK_COMMENTS = [
  "Đúng giờ hẹn",
  "Làm việc sạch sẽ",
  "Chi phí đúng niêm yết",
  "Tư vấn nhiệt tình",
];

export function BookingReviewSection({
  booking,
  providerDisplayName,
}: {
  booking: BookingDetail;
  providerDisplayName?: string;
}) {
  const { mutate: submitReview, isPending } = useCreateBookingReview();
  const [rating, setRating] = useState<number>(5);
  const [priceMatched, setPriceMatched] = useState<boolean | null>(null);
  const [comment, setComment] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  if (booking.status !== "COMPLETED") {
    return null;
  }

  // Không hiển thị gì nếu không phải khách hàng và chưa có đánh giá
  if (!booking.review && !booking.canReview) {
    return null;
  }

  const handleAddQuickComment = (snippet: string) => {
    setComment((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return snippet;
      if (trimmed.includes(snippet)) return prev;
      return `${trimmed}, ${snippet}`;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (priceMatched === null) {
      setFormError("Vui lòng xác nhận chi phí thực tế có đúng giá niêm yết không.");
      return;
    }
    setFormError(null);
    submitReview({
      bookingId: booking.id,
      payload: {
        rating,
        priceMatched,
        comment: comment.trim() || undefined,
      },
    });
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
      <div className="border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Star className="size-5 fill-amber-500 text-amber-500" />
          <h2 className="font-display text-lg font-bold text-foreground">
            Đánh giá chất lượng dịch vụ
          </h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Đánh giá chỉ thực hiện 1 lần duy nhất cho mỗi đơn hàng để đảm bảo tính khách quan và minh bạch.
        </p>
      </div>

      {booking.review ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-950 dark:border-emerald-800/70 dark:bg-emerald-950/30 dark:text-emerald-100 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300 text-sm">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>Đã hoàn thành đánh giá cho đơn hàng này</span>
              </div>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                {formatVnDateTime(booking.review.createdAt)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 py-0.5">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "size-4",
                      star <= booking.review!.rating
                        ? "fill-amber-500 text-amber-500"
                        : "text-muted-foreground/30",
                    )}
                  />
                ))}
                <span className="ml-1.5 font-bold text-foreground">
                  {booking.review.rating}/5 sao
                </span>
              </div>

              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                  booking.review.priceMatched
                    ? "border-emerald-300 bg-white/80 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
                )}
              >
                <ShieldCheck className="size-3.5" />
                {booking.review.priceMatched
                  ? "Đúng giá niêm yết"
                  : "Có chênh lệch chi phí"}
              </span>
            </div>

            {booking.review.comment && (
              <p className="rounded-lg border border-emerald-200/80 bg-white/80 p-3 text-xs leading-relaxed text-foreground italic dark:border-emerald-800/60 dark:bg-background/60">
                “{booking.review.comment}”
              </p>
            )}
          </div>

          <p className="text-center text-[11px] text-muted-foreground italic">
            * Theo quy định hệ thống Servigo, mỗi đơn hàng chỉ được gửi đánh giá một lần duy nhất.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 5 ngôi sao */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mức độ hài lòng của bạn
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((value) => {
                const active = value <= rating;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={isPending}
                    onClick={() => setRating(value)}
                    aria-label={`${value} sao`}
                    className="cursor-pointer rounded-lg p-1 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <Star
                      className={cn(
                        "size-7 transition-colors",
                        active
                          ? "fill-amber-500 text-amber-500"
                          : "text-muted-foreground/30",
                      )}
                    />
                  </button>
                );
              })}
              <span className="ml-2 text-sm font-bold text-foreground">
                {RATING_LABELS[rating]}
              </span>
            </div>
          </div>

          {/* Minh bạch giá niêm yết (priceMatched) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Chi phí thực tế có đúng với giá niêm yết không? *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setPriceMatched(true);
                  if (formError) setFormError(null);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-3 text-left text-xs font-semibold transition-all cursor-pointer",
                  priceMatched === true
                    ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                    : "border-border bg-background text-foreground hover:bg-muted/60",
                )}
              >
                <CheckCircle2 className="size-4 shrink-0" />
                <span>Đúng giá niêm yết</span>
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setPriceMatched(false);
                  if (formError) setFormError(null);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-3 text-left text-xs font-semibold transition-all cursor-pointer",
                  priceMatched === false
                    ? "border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20 dark:bg-amber-950/40 dark:text-amber-200"
                    : "border-border bg-background text-foreground hover:bg-muted/60",
                )}
              >
                <AlertCircle className="size-4 shrink-0" />
                <span>Có chênh lệch / phát sinh</span>
              </button>
            </div>
            {formError && (
              <p className="text-xs font-medium text-destructive">{formError}</p>
            )}
          </div>

          {/* Gợi ý nhận xét nhanh */}
          <div className="space-y-1.5">
            <span className="block text-xs text-muted-foreground">
              Gợi ý nhận xét nhanh:
            </span>
            <div className="flex flex-wrap gap-2">
              {QUICK_COMMENTS.map((snippet) => (
                <button
                  key={snippet}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleAddQuickComment(snippet)}
                  className="cursor-pointer rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                  + {snippet}
                </button>
              ))}
            </div>
          </div>

          {/* Nhập nhận xét */}
          <div>
            <textarea
              rows={3}
              maxLength={2000}
              disabled={isPending}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={`Chia sẻ thêm cảm nhận của bạn về chất lượng phục vụ của ${providerDisplayName || "nhà cung cấp"}...`}
              className="w-full rounded-xl border border-input bg-muted/40 p-3 text-sm leading-relaxed text-foreground transition focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isPending}
              className="min-h-[44px] rounded-xl px-5 font-semibold"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Gửi đánh giá
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
