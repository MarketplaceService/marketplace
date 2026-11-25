"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useProviderRadar,
  useProviderReviews,
  usePublicProvider,
} from "@/hooks/use-provider";
import { BadgeCheck, ChevronRight, MapPin, Star, Wrench } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatKm } from "../provider/schedule/service-area-card";
import { ProviderRadarCard } from "./provider-radar-card";
import { ProviderReviewsCard } from "./provider-reviews-card";
import { SlotPicker } from "./slot-picker";

// Form đăng ký lưu tên ngành nghề kèm số thứ tự, ví dụ "1. Điện lạnh (Điều hòa, ...)"
const categoryLabel = (category: string | null) =>
  category?.replace(/^\d+\.\s*/, "").trim() || null;

export function ProviderPublicView({
  providerId,
  serviceId,
}: {
  providerId: string;
  serviceId?: string;
}) {
  const [reviewsPage, setReviewsPage] = useState(1);
  const { data: provider, isLoading, isError } = usePublicProvider(providerId);
  const { data: radar, isLoading: radarLoading } = useProviderRadar(providerId);
  const { data: reviewsData, isLoading: reviewsLoading } = useProviderReviews(
    providerId,
    { page: reviewsPage, limit: 5 },
  );

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-8">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="h-96 animate-pulse rounded-2xl bg-muted lg:col-span-5" />
          <div className="h-96 animate-pulse rounded-2xl bg-muted lg:col-span-7" />
        </div>
      </div>
    );
  }

  if (isError || !provider) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-8">
        <p className="text-lg font-semibold text-foreground">Không tìm thấy thợ này</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Hồ sơ có thể chưa được duyệt hoặc đã ngừng hoạt động.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
        >
          Về trang chủ
        </Link>
      </div>
    );
  }

  const category = categoryLabel(provider.category);
  const area = provider.serviceArea;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-8">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
      >
        <Link href="/" className="hover:text-foreground">
          Trang chủ
        </Link>
        {category && (
          <>
            <ChevronRight className="size-3.5" />
            <span>{category}</span>
          </>
        )}
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-foreground">{provider.displayName}</span>
      </nav>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="relative shrink-0 self-start">
            <Avatar className="size-24 border-2 border-primary/30 shadow-xs">
              {provider.avatarUrl && (
                <AvatarImage
                  src={provider.avatarUrl}
                  alt={provider.displayName}
                />
              )}
              <AvatarFallback className="bg-primary/10 text-3xl font-bold text-primary">
                {provider.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span
              className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground"
              title="Đã đối chiếu chứng chỉ và hồ sơ lý lịch"
            >
              <BadgeCheck className="size-4" />
            </span>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-foreground">
                {provider.displayName}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success-subtle px-2.5 py-0.5 text-xs font-semibold text-success">
                <BadgeCheck className="size-3.5" />
                Đã xác minh hồ sơ &amp; chứng chỉ
              </span>
              <span
                className={
                  provider.isOnline
                    ? "inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
                    : "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                }
              >
                <span
                  className={
                    provider.isOnline
                      ? "size-2 rounded-full bg-primary"
                      : "size-2 rounded-full bg-muted-foreground"
                  }
                />
                {provider.isOnline ? "Sẵn sàng nhận việc" : "Đang tạm nghỉ"}
              </span>
            </div>

            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {category && (
                <li className="flex items-center gap-1.5">
                  <Wrench className="size-4 shrink-0 text-primary" />
                  <span>{category}</span>
                </li>
              )}
              {provider.experienceYears !== null && (
                <li className="flex items-center gap-1.5">
                  <BadgeCheck className="size-4 shrink-0 text-primary" />
                  <span>{provider.experienceYears} năm kinh nghiệm</span>
                </li>
              )}
              {area && (
                <li className="flex items-center gap-1.5">
                  <MapPin className="size-4 shrink-0 text-primary" />
                  <span>
                    {area.areaName ? `${area.areaName} — ` : ""}Bán kính phục vụ{" "}
                    {formatKm(area.radiusKm)} km
                  </span>
                </li>
              )}
              <li className="flex items-center gap-1.5">
                <Star className="size-4 shrink-0 fill-amber-500 text-amber-500" />
                {provider.reviewCount > 0 ? (
                  <span>
                    <strong className="text-foreground">
                      {provider.ratingAverage.toFixed(1)} / 5.0
                    </strong>{" "}
                    <span>({provider.reviewCount} đánh giá)</span>
                  </span>
                ) : (
                  <span>Chưa có đánh giá (0)</span>
                )}
              </li>
            </ul>

            {provider.bio && (
              <p className="text-sm leading-relaxed text-foreground/80">
                {provider.bio}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Cột trái 5 cột: Radar uy tín 5 chiều + Danh sách đánh giá */}
        <section className="space-y-6 lg:col-span-5">
          <ProviderRadarCard radar={radar} isLoading={radarLoading} />
          <ProviderReviewsCard
            data={reviewsData}
            isLoading={reviewsLoading}
            page={reviewsPage}
            onPageChange={setReviewsPage}
          />
        </section>

        {/* Cột phải 7 cột: Chọn dịch vụ & Khung giờ đặt lịch */}
        <section className="lg:col-span-7">
          <SlotPicker
            providerId={provider.id}
            serviceId={serviceId}
            isOnline={provider.isOnline}
            services={provider.services}
          />
        </section>
      </div>
    </div>
  );
}
