"use client";

import { useAddresses } from "@/hooks/use-addresses";
import { useCurrentUser } from "@/hooks/use-auth";
import { useCategories, useNearbyServices } from "@/hooks/use-discovery";
import type { NearbyServiceItem } from "@/types/discovery.types";
import {
  ArrowRight,
  Check,
  Loader2,
  LocateFixed,
  MapPinOff,
  Navigation,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ServiceDetailDialog } from "./service-detail-dialog";

// Import động component bản đồ với SSR false để tránh lỗi Leaflet chạy trên Node.js
const NearbyProvidersMap = dynamic(() => import("./nearby-providers-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted/30">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-medium">Đang tải bản đồ số...</p>
      </div>
    </div>
  ),
});

const DEFAULT_CENTER = {
  lat: 10.8456,
  lng: 106.7719,
  label: "Quận 9, TP. Hồ Chí Minh",
};

const DEFAULT_CATEGORIES = [
  { slug: "sua-dien-lanh", name: "Sửa điện lạnh (Điều hòa, Tủ lạnh)" },
  { slug: "sua-dien-nuoc", name: "Sửa điện nước (Ống nước, Chập điện)" },
  { slug: "sua-khoa-cua-cuon", name: "Sửa khóa & Cửa cuốn" },
  { slug: "thong-tac-ve-sinh", name: "Thông tắc vệ sinh" },
  { slug: "ve-sinh-nha-cua", name: "Vệ sinh nhà cửa" },
  { slug: "thiet-bi-gia-dung", name: "Thiết bị gia dụng (Máy giặt, Lò vi sóng)" },
  { slug: "son-sua-chong-tham", name: "Sơn sửa & Chống thấm" },
  { slug: "do-go-noi-that", name: "Đồ gỗ & Nội thất" },
];

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

export default function GeoMapView() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "";
  const initialKeyword = searchParams.get("keyword") || "";

  // 1. Quản lý trạng thái Vị trí tâm quét
  const [customCenter, setCustomCenter] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);

  // 2. Thông tin User & Địa chỉ mặc định (Ưu tiên 1)
  const { data: user } = useCurrentUser();
  const { data: addresses } = useAddresses(Boolean(user));

  const defaultAddress = useMemo(() => {
    if (!addresses || addresses.length === 0) return null;
    return (
      addresses.find(
        (a) =>
          a.isDefault &&
          Number.isFinite(a.latitude) &&
          Number.isFinite(a.longitude),
      ) ??
      addresses.find(
        (a) => Number.isFinite(a.latitude) && Number.isFinite(a.longitude),
      )
    );
  }, [addresses]);

  const centerLat = customCenter?.lat ?? defaultAddress?.latitude ?? DEFAULT_CENTER.lat;
  const centerLng = customCenter?.lng ?? defaultAddress?.longitude ?? DEFAULT_CENTER.lng;
  const centerLabel =
    customCenter?.label ??
    defaultAddress?.addressLine1 ??
    defaultAddress?.ward ??
    DEFAULT_CENTER.label;

  // Nút lấy GPS hiện tại (Ưu tiên 2)
  const handleRequestMyLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Trình duyệt không hỗ trợ xác định vị trí GPS.");
      return;
    }

    toast.info("Đang định vị vị trí hiện tại của bạn...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setCustomCenter({
          lat,
          lng,
          label: "Vị trí GPS của bạn",
        });
        toast.success("Đã cập nhật vị trí GPS thành công!");
      },
      (err) => {
        let msg = "Không thể lấy vị trí";
        if (err.code === 1) msg = "Bạn đã từ chối quyền truy cập vị trí";
        else if (err.code === 2) msg = "Không xác định được vị trí";
        else if (err.code === 3) msg = "Hết thời gian yêu cầu định vị";
        toast.error(msg);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }, []);

  // 3. Quản lý trạng thái bộ lọc
  const [radius, setRadius] = useState<number>(5);
  const [keyword, setKeyword] = useState<string>(initialKeyword);
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>(initialKeyword);
  const [category, setCategory] = useState<string>(initialCategory);
  const [priceRange, setPriceRange] = useState<
    "all" | "under_200" | "200_500" | "over_500"
  >("all");
  const [minExperienceYears, setMinExperienceYears] = useState<number>(0);
  const [sort, setSort] = useState<"distance" | "rating" | "price">("distance");
  const [selectedServiceIdState, setSelectedServiceIdState] = useState<string | null>(null);
  const [selectionTrigger, setSelectionTrigger] = useState<number>(0);
  const [detailServiceId, setDetailServiceId] = useState<string | null>(null);

  // Đồng bộ URL query params khi người dùng điều hướng lại sang /map
  useEffect(() => {
    setCategory(initialCategory);
    setKeyword(initialKeyword);
    setDebouncedKeyword(initialKeyword.trim());
  }, [initialCategory, initialKeyword]);

  // Debounce tìm kiếm từ khóa
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [keyword]);

  // Chuyển đổi mức giá sang minPrice & maxPrice (đồng bộ với CustomerDashboardView)
  const minPrice = useMemo(() => {
    if (priceRange === "200_500") return 200000;
    if (priceRange === "over_500") return 500000;
    return undefined;
  }, [priceRange]);

  const maxPrice = useMemo(() => {
    if (priceRange === "under_200") return 200000;
    if (priceRange === "200_500") return 500000;
    return undefined;
  }, [priceRange]);

  // Lấy danh sách danh mục
  const { data: categories = [] } = useCategories();
  const categoryOptions = categories.length > 0 ? categories : DEFAULT_CATEGORIES;

  // Lấy danh sách dịch vụ lân cận từ API
  const {
    data: items = [],
    isLoading,
    isError,
    refetch,
  } = useNearbyServices({
    lat: centerLat,
    lng: centerLng,
    radius,
    category: category || undefined,
    keyword: debouncedKeyword || undefined,
    minPrice,
    maxPrice,
    minExperienceYears: minExperienceYears || undefined,
    sort,
  });

  const selectedServiceId = useMemo(() => {
    if (
      selectedServiceIdState &&
      items.some((i) => i.service.id === selectedServiceIdState)
    ) {
      return selectedServiceIdState;
    }
    return items[0]?.service.id ?? null;
  }, [items, selectedServiceIdState]);

  // Xử lý chọn dịch vụ từ thẻ hoặc từ pin bản đồ
  const handleSelectService = (serviceId: string) => {
    setSelectedServiceIdState(serviceId);
    setSelectionTrigger((prev) => prev + 1);
    const cardEl = document.getElementById(`provider-card-${serviceId}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  // Đặt lại bộ lọc về mặc định
  const handleResetFilters = () => {
    setKeyword("");
    setCategory("");
    setPriceRange("all");
    setMinExperienceYears(0);
    setSort("distance");
    setRadius(10); // Nâng bán kính lên 10km để dễ tìm thấy
  };

  return (
    <main className="h-[calc(100vh-4rem)] w-full flex flex-col lg:flex-row overflow-hidden relative bg-background select-none">
      {/* ========================================================================= */}
      {/* CỘT TRÁI: BỘ LỌC ĐA TIÊU CHÍ (S17.2) & DANH SÁCH NHÀ CUNG CẤP            */}
      {/* ========================================================================= */}
      <aside className="w-full lg:w-[420px] h-[52%] lg:h-full order-2 lg:order-1 flex flex-col bg-card border-t lg:border-t-0 lg:border-r border-border shrink-0 z-20 shadow-sm overflow-hidden">
        {/* Khối Bộ lọc */}
        <div className="p-4 sm:p-5 border-b border-border space-y-3.5 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-semibold text-lg sm:text-xl text-foreground tracking-tight">
                Nhà cung cấp gần bạn
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <span className="truncate max-w-[200px]" title={centerLabel}>
                  {centerLabel}
                </span>
                <span>•</span>
                <button
                  type="button"
                  onClick={handleRequestMyLocation}
                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                >
                  <LocateFixed className="h-3 w-3" />
                  <span>Cập nhật GPS</span>
                </button>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
              {isLoading ? "Đang tải..." : `${items.length} kết quả`}
            </span>
          </div>

          {/* Ô tìm kiếm từ khóa S17.2 */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên thợ hoặc dịch vụ..."
              className="w-full pl-9 pr-8 py-2 text-xs border border-border rounded-lg bg-muted/30 text-foreground placeholder:text-muted-foreground focus:bg-card focus:outline-none focus:border-primary transition"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                title="Xóa tìm kiếm"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Dropdown: Danh mục dịch vụ */}
          <div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="">Tất cả danh mục (8 ngành nghề)</option>
              {categoryOptions.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Grid 2 Select: Mức giá & Kinh nghiệm */}
          <div className="grid grid-cols-2 gap-2">
            <select
              value={priceRange}
              onChange={(e) =>
                setPriceRange(
                  e.target.value as "all" | "under_200" | "200_500" | "over_500",
                )
              }
              className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 bg-card text-foreground focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="all">Mọi mức giá</option>
              <option value="under_200">Dưới 200.000đ</option>
              <option value="200_500">200.000đ - 500.000đ</option>
              <option value="over_500">Trên 500.000đ</option>
            </select>

            <select
              value={minExperienceYears}
              onChange={(e) => setMinExperienceYears(Number(e.target.value))}
              className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 bg-card text-foreground focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value={0}>Mọi kinh nghiệm</option>
              <option value={3}>≥ 3 năm KN</option>
              <option value={5}>≥ 5 năm KN</option>
            </select>
          </div>

          {/* Nút sắp xếp nhanh */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-medium text-muted-foreground">
              Sắp xếp:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSort("distance")}
                className={`rounded-full text-xs px-3 py-1 transition-all ${
                  sort === "distance"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-muted text-muted-foreground font-medium border border-border hover:border-foreground/30"
                }`}
              >
                Gần nhất
              </button>
              <button
                type="button"
                onClick={() => setSort("rating")}
                className={`rounded-full text-xs px-3 py-1 transition-all ${
                  sort === "rating"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-muted text-muted-foreground font-medium border border-border hover:border-foreground/30"
                }`}
              >
                Đánh giá cao
              </button>
              <button
                type="button"
                onClick={() => setSort("price")}
                className={`rounded-full text-xs px-3 py-1 transition-all ${
                  sort === "price"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-muted text-muted-foreground font-medium border border-border hover:border-foreground/30"
                }`}
              >
                Giá thấp nhất
              </button>
            </div>
          </div>
        </div>

        {/* Danh sách cuộn các Thẻ Dịch vụ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Đang quét tìm nhà cung cấp quanh đây...</p>
            </div>
          ) : isError ? (
            <div className="p-6 text-center text-muted-foreground bg-muted/40 rounded-xl border border-dashed border-border mt-2">
              <p className="text-sm font-semibold text-foreground">
                Đã xảy ra lỗi khi tải dữ liệu
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Vui lòng thử lại sau giây lát.
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-3 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-xs inline-flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground bg-muted/30 rounded-2xl border border-dashed border-border mt-2">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2 text-muted-foreground">
                <MapPinOff className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Không tìm thấy nhà cung cấp nào
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Hãy thử tăng bán kính quét trên bản đồ hoặc điều chỉnh lại các
                tiêu chí bộ lọc.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-xs transition"
              >
                Đặt lại bộ lọc &amp; Tăng bán kính
              </button>
            </div>
          ) : (
            items.map((item: NearbyServiceItem) => {
              const isSelected = item.service.id === selectedServiceId;
              const isFreeShipping = item.distance.isFreeShipping;
              const feeFormatted = formatVND(item.distance.distanceFee);

              return (
                <article
                  key={item.service.id}
                  id={`provider-card-${item.service.id}`}
                  onClick={() => handleSelectService(item.service.id)}
                  className={`group rounded-2xl p-4 cursor-pointer transition-all duration-200 border ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
                      : "bg-card border-border hover:border-primary/50 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar thợ */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-border bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className="w-full h-full object-cover"
                          src={
                            item.provider.avatar ||
                            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces"
                          }
                          alt={item.provider.displayName}
                        />
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-amber-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-xs">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                    </div>

                    {/* Nội dung thông tin thợ & dịch vụ */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="font-semibold text-foreground text-sm truncate">
                          {item.provider.displayName}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/70 font-semibold shrink-0">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          <span>5.0</span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {item.service.category?.name || "Dịch vụ"} • {item.service.title}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs">
                        <span className="inline-flex items-center gap-1 text-muted-foreground font-medium">
                          <Navigation className="h-3.5 w-3.5 text-primary" />
                          <span>Cách {item.distance.distanceKm} km</span>
                        </span>
                        <span className="text-muted-foreground/60">•</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isFreeShipping
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {isFreeShipping
                            ? "Miễn phí (≤ 3km)"
                            : `+${feeFormatted}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Phần giá & Nút đặt lịch */}
                  <div className="mt-3.5 pt-3 border-t border-border flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">
                        Giá gốc: {formatVND(item.service.basePrice)}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-muted-foreground">Tạm tính:</span>
                        <span className="font-bold text-foreground text-sm">
                          {formatVND(item.distance.estimatedTotal)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailServiceId(item.service.id);
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold transition cursor-pointer"
                      >
                        Chi tiết
                      </button>
                      <Link
                        href={`/providers/${item.provider.id}?serviceId=${item.service.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground text-xs font-semibold shadow-xs transition"
                      >
                        <span>Xem hồ sơ &amp; Đặt lịch</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Chân trang cột trái */}
        <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Thợ đã xác minh CCCD &amp; tay nghề</span>
          </div>
          <span className="font-medium text-primary">Minh bạch giá cả</span>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* CỘT PHẢI: BẢN ĐỒ VECTOR LEAFLET + MAPLIBRE & SLIDER BÁN KÍNH               */}
      {/* ========================================================================= */}
      <section className="w-full h-[48%] lg:h-full lg:flex-1 order-1 lg:order-2 relative overflow-hidden bg-muted/10">
        {/* Floating Radius Control Bar (Thanh trượt bán kính nổi phía trên) */}
        <div className="absolute top-4 left-4 right-4 sm:left-6 sm:right-6 max-w-xl mx-auto z-20 pointer-events-auto">
          <div className="bg-card/95 backdrop-blur-md rounded-2xl shadow-md border border-border px-4 sm:px-5 py-3 flex items-center justify-between gap-3 sm:gap-4">
            {/* Chỉ báo số lượng theo bán kính */}
            <div className="flex items-center gap-2 min-w-max">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
              </span>
              <span className="text-xs font-semibold text-foreground">
                {items.length} dịch vụ trong vùng
              </span>
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Thanh trượt bán kính 2km - 20km */}
            <div className="flex-1 flex items-center gap-2.5">
              <span className="text-[11px] text-muted-foreground font-medium">
                2km
              </span>
              <div className="flex-1 relative flex items-center">
                <input
                  type="range"
                  min={2}
                  max={20}
                  step={1}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
              <div className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-md px-2 py-0.5 min-w-[54px] text-center">
                {radius} km
              </div>
            </div>

            {/* Công thức tính phí di chuyển S18.2 */}
            <div className="hidden md:flex items-center text-[11px] text-muted-foreground bg-muted/50 rounded-full px-2.5 py-1 whitespace-nowrap font-medium border border-border">
              <span>≤ 3km: 0đ • Sau 3km: +5.000đ/km</span>
            </div>
          </div>
        </div>

        {/* Bản đồ tương tác Leaflet + MapLibre */}
        <NearbyProvidersMap
          centerLat={centerLat}
          centerLng={centerLng}
          centerLabel={centerLabel}
          radiusKm={radius}
          items={items}
          selectedServiceId={selectedServiceId}
          selectionTrigger={selectionTrigger}
          onSelectService={handleSelectService}
          onOpenDetail={(serviceId) => setDetailServiceId(serviceId)}
          onChangeCenter={(lat, lng) => {
            setCustomCenter({
              lat,
              lng,
              label: "Vị trí tùy chọn trên bản đồ",
            });
          }}
          onRequestMyLocation={handleRequestMyLocation}
        />
      </section>

      {/* Modal Xem chi tiết dịch vụ S17.3 từ bản đồ */}
      <ServiceDetailDialog
        serviceId={detailServiceId}
        open={Boolean(detailServiceId)}
        onClose={() => setDetailServiceId(null)}
      />
    </main>
  );
}
