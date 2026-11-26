"use client";

import { useCategories, useSearchServices } from "@/hooks/use-discovery";
import type { ServiceListItem } from "@/types/discovery.types";
import {
  AirVent,
  Armchair,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  KeyRound,
  LucideIcon,
  MapPin,
  PaintRoller,
  Pipette,
  Refrigerator,
  RotateCcw,
  Search,
  SearchX,
  Sparkles,
  Star,
  Truck,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { ServiceDetailDialog } from "./service-detail-dialog";

interface CustomerDashboardViewProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

// 8 danh mục chuẩn
const DEFAULT_CATEGORIES = [
  { slug: "sua-dien-lanh", name: "Sửa điện lạnh", icon: AirVent },
  { slug: "sua-dien-nuoc", name: "Sửa điện nước", icon: Wrench },
  { slug: "sua-khoa-cua-cuon", name: "Sửa khóa & Cửa cuốn", icon: KeyRound },
  { slug: "thong-tac-ve-sinh", name: "Thông tắc vệ sinh", icon: Pipette },
  { slug: "ve-sinh-nha-cua", name: "Vệ sinh nhà cửa", icon: Sparkles },
  { slug: "thiet-bi-gia-dung", name: "Thiết bị gia dụng", icon: Refrigerator },
  { slug: "son-sua-chong-tham", name: "Sơn sửa & Chống thấm", icon: PaintRoller },
  { slug: "do-go-noi-that", name: "Đồ gỗ & Nội thất", icon: Armchair },
];

function getCategoryIcon(slug: string): LucideIcon {
  const match = DEFAULT_CATEGORIES.find((c) => c.slug === slug);
  if (match) return match.icon;
  if (slug.includes("lanh")) return AirVent;
  if (slug.includes("nuoc")) return Wrench;
  if (slug.includes("khoa")) return KeyRound;
  if (slug.includes("thong")) return Pipette;
  if (slug.includes("ve-sinh")) return Sparkles;
  if (slug.includes("gia-dung")) return Refrigerator;
  if (slug.includes("son")) return PaintRoller;
  if (slug.includes("go") || slug.includes("that")) return Armchair;
  return Wrench;
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

type PriceRange = "all" | "under_200" | "200_500" | "over_500";
type SortOption = "newest" | "price_asc" | "price_desc" | "rating";

export function CustomerDashboardView({ user }: CustomerDashboardViewProps) {
  // Bộ lọc
  const [keywordInput, setKeywordInput] = useState<string>("");
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>("");
  const [category, setCategory] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const [minExperienceYears, setMinExperienceYears] = useState<number>(0);
  const [sort, setSort] = useState<SortOption>("newest");
  const [page, setPage] = useState<number>(1);

  // Modal Chi tiết S17.3
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = useState<boolean>(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keywordInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  // Chuyển đổi khoảng giá
  const { minPrice, maxPrice } = useMemo(() => {
    switch (priceRange) {
      case "under_200":
        return { minPrice: undefined, maxPrice: 200000 };
      case "200_500":
        return { minPrice: 200000, maxPrice: 500000 };
      case "over_500":
        return { minPrice: 500000, maxPrice: undefined };
      default:
        return { minPrice: undefined, maxPrice: undefined };
    }
  }, [priceRange]);

  // API calls
  const { data: apiCategories } = useCategories();
  const { data: servicesData, isLoading } = useSearchServices({
    keyword: debouncedKeyword || undefined,
    category: category !== "all" ? category : undefined,
    minPrice,
    maxPrice,
    minExperienceYears: minExperienceYears > 0 ? minExperienceYears : undefined,
    sort,
    page,
    limit: 9,
  });

  const categoriesList =
    apiCategories && apiCategories.length > 0
      ? apiCategories.slice(0, 8)
      : DEFAULT_CATEGORIES.map((c, i) => ({
          id: `default-${i}`,
          name: c.name,
          slug: c.slug,
          icon: null,
          activeServicesCount: 0,
        }));

  const handleCategorySelect = (selectedSlug: string) => {
    setCategory((prev) => (prev === selectedSlug ? "all" : selectedSlug));
    setPage(1);
  };

  const handleResetFilters = () => {
    setKeywordInput("");
    setDebouncedKeyword("");
    setCategory("all");
    setPriceRange("all");
    setMinExperienceYears(0);
    setSort("newest");
    setPage(1);
  };

  const handleOpenDetail = (id: string) => {
    setSelectedServiceId(id);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedServiceId(null);
  };

  const displayName = user.name || user.email?.split("@")[0] || "bạn";
  const items = servicesData?.items || [];
  const totalPages = servicesData?.totalPages || 1;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* ========================================================================= */}
        {/* KHU VỰC 1: CHÀO MỪNG & BỘ LỌC TÌM KIẾM DỊCH VỤ (S17.2)                    */}
        {/* ========================================================================= */}
        <section className="space-y-5">
          <div className="max-w-3xl space-y-2">
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-[32px] font-bold text-foreground leading-tight">
              Xin chào {displayName}, hôm nay bạn cần hỗ trợ dịch vụ gì?
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Kết nối nhà cung cấp dịch vụ gia đình tận tâm, báo giá niêm yết rõ
              ràng, nghiệm thu hình ảnh trước và sau khi thực hiện.
            </p>
          </div>

          {/* Khung tìm kiếm & bộ lọc đa điều kiện chuẩn S17.2 */}
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-xs space-y-4">
            {/* Hàng 1: Từ khóa (tự động lọc theo debounce) */}
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="Tìm theo tên dịch vụ, sự cố hoặc tên nhà cung cấp..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition"
              />
              {keywordInput && (
                <button
                  type="button"
                  onClick={() => {
                    setKeywordInput("");
                    setDebouncedKeyword("");
                    setPage(1);
                  }}
                  aria-label="Xóa từ khóa"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Hàng 2: Dropdown Danh mục, Khoảng giá, Kinh nghiệm & Sắp xếp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-border/70">
              {/* Dropdown Danh mục */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Danh mục ngành nghề
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition cursor-pointer"
                >
                  <option value="all">Tất cả danh mục</option>
                  {categoriesList.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown Khoảng giá */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Khoảng giá dịch vụ
                </label>
                <select
                  value={priceRange}
                  onChange={(e) => {
                    setPriceRange(e.target.value as PriceRange);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition cursor-pointer"
                >
                  <option value="all">Tất cả mức giá</option>
                  <option value="under_200">Dưới 200.000đ</option>
                  <option value="200_500">200.000đ - 500.000đ</option>
                  <option value="over_500">Trên 500.000đ</option>
                </select>
              </div>

              {/* Dropdown Kinh nghiệm tối thiểu */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Kinh nghiệm nhà cung cấp
                </label>
                <select
                  value={minExperienceYears}
                  onChange={(e) => {
                    setMinExperienceYears(parseInt(e.target.value, 10) || 0);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition cursor-pointer"
                >
                  <option value="0">Mọi kinh nghiệm</option>
                  <option value="3">Từ 3 năm kinh nghiệm</option>
                  <option value="5">Từ 5 năm kinh nghiệm trở lên</option>
                </select>
              </div>

              {/* Dropdown Sắp xếp */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Sắp xếp kết quả
                </label>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value as SortOption);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition cursor-pointer"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="price_asc">Giá: Thấp đến cao</option>
                  <option value="price_desc">Giá: Cao đến thấp</option>
                  <option value="rating">Đánh giá cao nhất</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* KHU VỰC 2: LƯỚI 8 DANH MỤC GỐC CHUẨN DB-03 / S13.1                        */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-foreground">
                Danh mục dịch vụ chuẩn
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bấm vào từng danh mục để lọc nhanh các dịch vụ tương ứng
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCategory("all");
                setPage(1);
              }}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Tất cả danh mục</span>
            </button>
          </div>

          {/* Grid 8 danh mục */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {categoriesList.map((cat) => {
              const IconComp = getCategoryIcon(cat.slug);
              const isActive = category === cat.slug;

              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => handleCategorySelect(cat.slug)}
                  className={`p-3.5 rounded-xl border transition flex flex-col items-center text-center group cursor-pointer ${
                    isActive
                      ? "border-primary bg-emerald-50/70 dark:bg-emerald-950/40 text-primary ring-1 ring-primary shadow-xs"
                      : "border-border bg-card hover:border-primary/50 hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-105 ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-emerald-50 dark:bg-emerald-950/50 text-primary"
                    }`}
                  >
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold leading-snug">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* KHU VỰC 3: DANH SÁCH DỊCH VỤ ĐANG HOẠT ĐỘNG (S17.1, S17.2, S17.3)         */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-foreground">
                Dịch vụ đang hoạt động
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isLoading
                  ? "Đang tải dữ liệu dịch vụ..."
                  : `Hiển thị ${items.length} dịch vụ phù hợp`}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>{" "}
                Nhà cung cấp đã xác minh
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-primary" /> &le; 3km miễn phí
                di chuyển
              </span>
            </div>
          </div>

          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-card rounded-2xl border border-border p-5 space-y-4 animate-pulse"
                >
                  <div className="h-5 w-24 bg-muted rounded-full" />
                  <div className="h-6 w-3/4 bg-muted rounded" />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-28 bg-muted rounded" />
                      <div className="h-3 w-40 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="h-10 bg-muted rounded-xl" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            /* Empty State */
            <div className="py-12 text-center bg-card rounded-2xl border border-dashed border-border space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                <SearchX className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-foreground">
                Không tìm thấy dịch vụ phù hợp
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                Vui lòng điều chỉnh lại từ khóa hoặc hạ bớt tiêu chí lọc để xem
                thêm các dịch vụ khác.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition cursor-pointer"
              >
                Xóa toàn bộ bộ lọc
              </button>
            </div>
          ) : (
            /* Service Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item: ServiceListItem) => (
                <div
                  key={item.id}
                  className="bg-card rounded-2xl border border-border p-5 shadow-xs hover:border-primary/40 hover:shadow-sm transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Badge danh mục & Vị trí */}
                    <div className="flex items-center justify-between">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-primary">
                        {item.category?.name || "Dịch vụ"}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        {item.provider?.areaName || "Khu vực lân cận"}
                      </span>
                    </div>

                    {/* Tên dịch vụ */}
                    <h3 className="font-serif text-[17px] font-bold text-foreground leading-snug line-clamp-2">
                      {item.title}
                    </h3>

                    {/* Thông tin Thợ */}
                    <div className="flex items-center gap-3 pt-1 border-t border-border/60">
                      <Avatar className="size-10 shrink-0 ring-1 ring-border">
                        <AvatarImage
                          src={item.provider?.avatar ?? undefined}
                          alt={item.provider?.displayName}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {item.provider?.displayName?.charAt(0) || "T"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {item.provider?.displayName}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-xs shrink-0 ${
                              item.provider.reviewCount > 0
                                ? "text-amber-500 font-bold"
                                : "text-muted-foreground font-medium"
                            }`}
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                item.provider.reviewCount > 0
                                  ? "fill-amber-500 text-amber-500"
                                  : "text-muted-foreground/70"
                              }`}
                            />
                            {item.provider.reviewCount > 0
                              ? `${item.provider.ratingAverage.toFixed(1)} (${item.provider.reviewCount})`
                              : "Chưa có đánh giá"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.provider?.experienceYears || 0} năm kinh nghiệm
                        </p>
                      </div>
                    </div>

                    {/* Giá & Thời lượng */}
                    <div className="flex items-baseline justify-between pt-2 border-t border-border/60">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">
                          Giá niêm yết
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-bold text-primary">
                            {formatCurrency(item.basePrice)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            / {getPriceUnitLabel(item.priceUnit)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-muted-foreground block">
                          Thời lượng
                        </span>
                        <span className="text-xs font-semibold text-foreground flex items-center justify-end gap-1">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          {item.durationMinutes} phút
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2 Nút hành động */}
                  <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(item.id)}
                      className="w-full py-2 px-2 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold text-center transition cursor-pointer"
                    >
                      Chi tiết dịch vụ
                    </button>
                    <Link
                      href={`/providers/${item.provider.id}?serviceId=${item.id}`}
                      className="w-full py-2 px-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold text-center shadow-xs transition inline-flex items-center justify-center gap-1"
                    >
                      <span>Xem hồ sơ</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Phân trang Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-6">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Trước</span>
              </button>
              <span className="text-xs font-medium text-muted-foreground">
                Trang {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <span>Sau</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Modal Xem chi tiết dịch vụ S17.3 */}
      <ServiceDetailDialog
        serviceId={selectedServiceId}
        open={detailOpen}
        onClose={handleCloseDetail}
      />
    </div>
  );
}
