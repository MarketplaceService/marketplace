"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePublicProvider } from "@/hooks/use-provider";
import { BadgeCheck, ChevronRight, MapPin, ShieldCheck, Wrench } from "lucide-react";
import Link from "next/link";
import { formatKm } from "../provider/schedule/service-area-card";
import { SlotPicker } from "./slot-picker";

// Form đăng ký lưu tên ngành nghề kèm số thứ tự, ví dụ "1. Điện lạnh (Điều hòa, ...)"
const categoryLabel = (category: string | null) =>
  category?.replace(/^\d+\.\s*/, "").trim() || null;

export function ProviderPublicView({ providerId }: { providerId: string }) {
  const { data: provider, isLoading, isError } = usePublicProvider(providerId);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-8">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="h-96 animate-pulse rounded-2xl bg-muted" />
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
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-8">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
      >
        <Link
          href="/"
          className="hover:text-foreground"
        >
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

      <section className="grid grid-cols-1 gap-6 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6 lg:grid-cols-[1fr_320px]">
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

          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-foreground">
                {provider.displayName}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success-subtle px-2.5 py-0.5 text-xs font-semibold text-success">
                <BadgeCheck className="size-3.5" />
                Đã xác minh hồ sơ &amp; chứng chỉ
              </span>
            </div>

            <ul className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {category && (
                <li className="flex items-center gap-2">
                  <Wrench className="size-4 shrink-0 text-primary" />
                  {category}
                </li>
              )}
              {provider.experienceYears !== null && (
                <li className="flex items-center gap-2">
                  <BadgeCheck className="size-4 shrink-0 text-primary" />
                  {provider.experienceYears} năm kinh nghiệm
                </li>
              )}
              {area && (
                <li className="flex items-center gap-2 sm:col-span-2">
                  <MapPin className="size-4 shrink-0 text-primary" />
                  {area.areaName ? `${area.areaName} — ` : ""}Bán kính phục vụ{" "}
                  {formatKm(area.radiusKm)} km
                </li>
              )}
            </ul>

            {provider.bio && (
              <p className="text-sm leading-relaxed text-foreground/80">{provider.bio}</p>
            )}
          </div>
        </div>

        <div className="space-y-2 self-start rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="size-4 text-primary" />
            Cam kết minh bạch Servigo
          </p>
          <p className="text-sm text-muted-foreground">
            Báo giá niêm yết rõ ràng trước khi đặt lịch, đối chiếu hình ảnh Trước &amp; Sau sửa chữa
            khi nghiệm thu.
          </p>
        </div>
      </section>

      <SlotPicker providerId={provider.id} />
    </div>
  );
}
