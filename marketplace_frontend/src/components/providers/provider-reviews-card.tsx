"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatVnDateTime } from "@/lib/vn-time";
import type { ProviderReviewsResponse } from "@/services/provider.services";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  ShieldCheck,
  Star,
} from "lucide-react";

export function ProviderReviewsCard({
  data,
  isLoading,
  page,
  onPageChange,
}: {
  data?: ProviderReviewsResponse;
  isLoading?: boolean;
  page: number;
  onPageChange: (nextPage: number) => void;
}) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="h-6 w-52 animate-pulse rounded bg-muted" />
        {[1, 2].map((i) => (
          <div key={i} className="space-y-2 border-t border-border pt-4">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  const items = data?.items ?? [];
  const reviewCount = data?.reviewCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">
            Đánh giá từ khách hàng
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Đối chiếu hình ảnh thực tế khi nghiệm thu
          </p>
        </div>
        <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {reviewCount} đánh giá thực tế
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-8 px-4 text-center space-y-2">
          <MessageSquareText className="mx-auto size-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">
            Chưa có đánh giá nào
          </p>
          <p className="text-xs text-muted-foreground">
            Nhà cung cấp chưa có nhận xét từ đơn hoàn thành. Hãy là người đầu tiên trải nghiệm và đánh giá!
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((review) => {
            const beforePhoto = review.inspectionImages?.before?.[0];
            const afterPhoto = review.inspectionImages?.after?.[0];
            return (
              <article key={review.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-9 border border-border">
                      {review.customer.avatarUrl && (
                        <AvatarImage
                          src={review.customer.avatarUrl}
                          alt={review.customer.name}
                        />
                      )}
                      <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                        {review.customer.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {review.customer.name}
                        {review.customer.ward && (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            • {review.customer.ward}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              "size-3.5",
                              star <= review.rating
                                ? "fill-amber-500 text-amber-500"
                                : "text-muted-foreground/30",
                            )}
                          />
                        ))}
                        <span className="ml-1.5 text-[11px] text-muted-foreground">
                          {formatVnDateTime(review.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {review.serviceTitle}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold",
                        review.priceMatched
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
                      )}
                    >
                      <ShieldCheck className="size-3" />
                      {review.priceMatched ? "Đúng giá" : "Chênh lệch giá"}
                    </span>
                  </div>
                </div>

                {review.comment && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    “{review.comment}”
                  </p>
                )}

                {(beforePhoto || afterPhoto) && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {beforePhoto && (
                      <a
                        href={beforePhoto.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative block overflow-hidden rounded-xl border border-border bg-muted"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={beforePhoto.url}
                          alt="Ảnh trước khi sửa"
                          className="h-24 w-full object-cover transition-transform group-hover:scale-105"
                        />
                        <span className="absolute bottom-1.5 left-1.5 rounded bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white">
                          TRƯỚC KHI SỬA
                        </span>
                      </a>
                    )}
                    {afterPhoto && (
                      <a
                        href={afterPhoto.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative block overflow-hidden rounded-xl border border-border bg-muted"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={afterPhoto.url}
                          alt="Ảnh sau khi sửa"
                          className="h-24 w-full object-cover transition-transform group-hover:scale-105"
                        />
                        <span className="absolute bottom-1.5 left-1.5 rounded bg-primary px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary-foreground">
                          SAU KHI SỬA
                        </span>
                      </a>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="size-3.5" />
            Trước
          </button>
          <span className="text-xs text-muted-foreground">
            Trang {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            Sau
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
