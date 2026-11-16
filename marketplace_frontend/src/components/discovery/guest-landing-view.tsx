"use client";

import { useCategories, useServices } from "@/hooks/use-discovery";
import type { ServiceListItem } from "@/types/discovery.types";
import {
  AirVent,
  Armchair,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  Handshake,
  KeyRound,
  LucideIcon,
  MapPin,
  PaintRoller,
  Pipette,
  Radar,
  Refrigerator,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  Truck,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { ServiceDetailDialog } from "./service-detail-dialog";

// 8 Danh mục chuẩn làm fallback khi API chưa sẵn sàng hoặc rỗng
interface CategoryPreset {
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
  minPrice: string;
}

const DEFAULT_CATEGORIES: CategoryPreset[] = [
  {
    slug: "sua-dien-lanh",
    name: "Sửa điện lạnh",
    description: "Máy lạnh, tủ lạnh, máy giặt, vệ sinh & bảo dưỡng định kỳ.",
    icon: AirVent,
    minPrice: "150.000đ",
  },
  {
    slug: "sua-dien-nuoc",
    name: "Sửa điện nước",
    description: "Xử lý rò rỉ ống nước âm tường, chập cháy điện gia đình.",
    icon: Wrench,
    minPrice: "120.000đ",
  },
  {
    slug: "sua-khoa-cua-cuon",
    name: "Sửa khóa & Cửa cuốn",
    description: "Mở khóa cấp tốc, thay ổ khóa cơ và điện tử, sửa cửa cuốn.",
    icon: KeyRound,
    minPrice: "100.000đ",
  },
  {
    slug: "thong-tac-ve-sinh",
    name: "Thông tắc vệ sinh",
    description:
      "Thông tắc bồn cầu, chậu rửa, đường cống thoát sàn không đục phá.",
    icon: Pipette,
    minPrice: "150.000đ",
  },
  {
    slug: "ve-sinh-nha-cua",
    name: "Vệ sinh nhà cửa",
    description: "Tổng vệ sinh theo giờ, giặt sofa, nệm sâu, hút bụi căn hộ.",
    icon: Sparkles,
    minPrice: "200.000đ",
  },
  {
    slug: "thiet-bi-gia-dung",
    name: "Thiết bị gia dụng",
    description:
      "Bếp từ, máy hút mùi, lò vi sóng, máy lọc nước, nồi cơm điện tử.",
    icon: Refrigerator,
    minPrice: "180.000đ",
  },
  {
    slug: "son-sua-chong-tham",
    name: "Sơn sửa & Chống thấm",
    description: "Chống thấm trần sàn, ban công, thạch cao, sơn dặm vá tường.",
    icon: PaintRoller,
    minPrice: "350.000đ",
  },
  {
    slug: "do-go-noi-that",
    name: "Đồ gỗ & Nội thất",
    description:
      "Lắp ráp, sửa chữa bàn ghế, giường tủ, thay ray trượt bản lề.",
    icon: Armchair,
    minPrice: "150.000đ",
  },
];

function getCategoryIconBySlug(slug: string): LucideIcon {
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

export function GuestLandingView() {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [detailServiceId, setDetailServiceId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: apiCategories } = useCategories();
  const { data: servicesData, isLoading: isServicesLoading } = useServices({
    page: 1,
    limit: 6,
    sort: "newest",
  });

  const displayCategories =
    apiCategories && apiCategories.length > 0
      ? apiCategories.slice(0, 8)
      : DEFAULT_CATEGORIES.map((cat, idx) => ({
          id: `default-${idx}`,
          name: cat.name,
          slug: cat.slug,
          icon: null,
          activeServicesCount: 0,
        }));

  const handleOpenDetail = (id: string) => {
    setDetailServiceId(id);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setDetailServiceId(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* ========================================== */}
      {/* 1. HERO & TÌM KIẾM NHANH GPS               */}
      {/* ========================================== */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Cột trái: 7 cột */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Verification Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 w-fit">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                </span>
                <span className="font-semibold text-xs text-primary dark:text-emerald-300 tracking-wide">
                  Định vị GPS theo thời gian thực &amp; Kiểm duyệt hồ sơ nhà cung
                  cấp
                </span>
              </div>

              {/* Headline */}
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-[44px] text-foreground font-bold leading-tight">
                Đặt lịch Nhà cung cấp dịch vụ dân sinh uy tín,{" "}
                <span className="text-primary font-bold">
                  minh bạch quanh bạn
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
                Quét vị trí GPS theo bán kính 2km – 20km, niêm yết giá cơ bản rõ
                ràng, miễn phí di chuyển trong 3km đầu (&gt; 3km phụ thu
                +5.000đ/km), đối chiếu hình ảnh trước và sau khi thực hiện.
              </p>

              {/* Floating Interactive Search Box */}
              <div className="mt-2 bg-card rounded-2xl border border-border shadow-md p-3.5 lg:p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Location Field (4 cols) */}
                  <div className="md:col-span-4 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/60 border border-border">
                    <MapPin className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex flex-col text-left min-w-0">
                      <span className="text-foreground text-xs font-semibold truncate">
                        Quận 9, TP. Hồ Chí Minh
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                        <span className="text-muted-foreground text-[11px] truncate">
                          GPS Đã kích hoạt
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Service Category Dropdown (4 cols) */}
                  <div className="md:col-span-4 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-muted/60 border border-border">
                    <Wrench className="w-5 h-5 text-primary shrink-0" />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full bg-transparent border-0 p-0 text-foreground text-sm focus:ring-0 focus:outline-none cursor-pointer truncate"
                    >
                      <option value="" className="bg-card text-foreground">
                        Chọn danh mục dịch vụ...
                      </option>
                      {displayCategories.map((cat) => (
                        <option
                          key={cat.slug}
                          value={cat.slug}
                          className="bg-card text-foreground"
                        >
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* CTA Radar Search Button (4 cols) */}
                  <div className="md:col-span-4">
                    <Link
                      href={
                        selectedCategory
                          ? `/map?category=${selectedCategory}`
                          : "/map"
                      }
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-xs transition duration-150 active:scale-95 cursor-pointer"
                    >
                      <Radar className="w-4 h-4" />
                      <span>Mở bản đồ quét nhà cung cấp</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Micro Trust Stats */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-muted-foreground text-xs sm:text-sm">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    <strong className="text-foreground">10,000+</strong> Nhà
                    cung cấp đã xác thực
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    Nghiệm thu ảnh Trước/Sau{" "}
                    <strong className="text-foreground">100%</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-primary shrink-0" />
                  <span>Minh bạch biểu giá niêm yết</span>
                </div>
              </div>
            </div>

            {/* Cột phải: 5 cột (Radar Map Mockup) */}
            <div className="lg:col-span-5 relative">
              <div className="relative w-full h-[440px] rounded-2xl bg-card border border-border shadow-md overflow-hidden p-4 flex flex-col justify-between">
                {/* Background Grid Simulation */}
                <div
                  className="absolute inset-0 opacity-40 pointer-events-none"
                  style={{
                    backgroundImage:
                      "radial-gradient(#94A3B8 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />

                {/* Radar Sweep Circles */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-80 h-80 rounded-full border border-primary/20 relative flex items-center justify-center">
                    <div className="w-56 h-56 rounded-full border border-primary/30 flex items-center justify-center">
                      <div className="w-32 h-32 rounded-full border border-primary/40"></div>
                    </div>
                    {/* Radar cone */}
                    <div
                      className="absolute inset-0 rounded-full animate-spin"
                      style={{
                        animationDuration: "4s",
                        background:
                          "conic-gradient(from 0deg, rgba(5, 150, 105, 0.25) 0deg, transparent 60deg, transparent 360deg)",
                      }}
                    />
                  </div>
                </div>

                {/* GPS Top Bar HUD */}
                <div className="relative z-10 flex items-center justify-between bg-card/90 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-border">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-xs font-semibold text-foreground">
                      Bán kính quét: 5.0 km
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-primary">
                    34 nhà cung cấp trực tuyến
                  </span>
                </div>

                {/* Floating Distance Pins */}
                <div
                  className="absolute top-24 left-10 z-10 animate-bounce"
                  style={{ animationDuration: "3s" }}
                >
                  <div className="flex items-center gap-1.5 bg-card px-2.5 py-1 rounded-full border border-border shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-semibold text-foreground">
                      1.2 km
                    </span>
                  </div>
                </div>
                <div
                  className="absolute top-36 right-8 z-10 animate-bounce"
                  style={{ animationDuration: "2.4s" }}
                >
                  <div className="flex items-center gap-1.5 bg-card px-2.5 py-1 rounded-full border border-border shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    <span className="text-xs font-semibold text-foreground">
                      0.8 km
                    </span>
                  </div>
                </div>
                <div
                  className="absolute bottom-28 left-20 z-10 animate-bounce"
                  style={{ animationDuration: "3.6s" }}
                >
                  <div className="flex items-center gap-1.5 bg-card px-2.5 py-1 rounded-full border border-border shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-700"></span>
                    <span className="text-xs font-semibold text-foreground">
                      2.5 km
                    </span>
                  </div>
                </div>

                {/* Floating Verified Provider Card Mockup */}
                <div className="relative z-20 bg-card/95 backdrop-blur-md rounded-xl border border-border p-3.5 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center border border-border text-base">
                        H
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center text-white text-[9px] font-bold">
                        ✓
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-foreground truncate">
                          Nguyễn Văn Hưng
                        </h2>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />{" "}
                          4.9 (128 việc)
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        Nhà cung cấp Điện lạnh • Quận 9, TP.HCM
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-primary font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Sẵn sàng nhận việc - 8
                      phút tới nơi
                    </span>
                    <Link
                      href="/map?category=sua-dien-lanh"
                      className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors"
                    >
                      Xem trên map
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 2. 8 DANH MỤC DỊCH VỤ CHUẨN                */}
      {/* ========================================== */}
      <section
        className="py-16 bg-muted/40 border-y border-border"
        id="danh-muc"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-primary font-semibold text-xs uppercase tracking-wider">
                DANH MỤC TRỌNG TÂM
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mt-2">
                8 Danh mục dịch vụ dân sinh phổ biến
              </h2>
              <p className="text-base text-muted-foreground mt-1">
                Nhà cung cấp chuyên môn cao sẵn sàng nhận việc trong bán kính 2km
                – 20km quanh bạn
              </p>
            </div>
            <Link
              href="/map"
              className="inline-flex items-center gap-1 text-primary hover:text-primary/90 font-semibold text-sm transition-colors cursor-pointer"
            >
              <span>Xem bản đồ dịch vụ toàn khu vực</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 8-Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {displayCategories.map((cat) => {
              const IconComp = getCategoryIconBySlug(cat.slug);
              const fallback =
                DEFAULT_CATEGORIES.find((c) => c.slug === cat.slug) ??
                DEFAULT_CATEGORIES[0];
              const minPrice = fallback.minPrice;
              const desc = fallback.description;

              return (
                <Link
                  key={cat.slug}
                  href={`/map?category=${cat.slug}`}
                  className="group bg-card rounded-2xl border border-border p-5 hover:border-primary hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <IconComp className="w-6 h-6" />
                      </div>
                      {cat.activeServicesCount > 0 && (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                          {cat.activeServicesCount} dịch vụ
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {desc}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Từ{" "}
                      <strong className="text-foreground font-bold">
                        {minPrice}
                      </strong>
                    </span>
                    <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 3. 3 TRỤ CỘT MINH BẠCH THỰC TẾ             */}
      {/* ========================================== */}
      <section className="py-16 bg-card" id="minh-bach">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-primary font-semibold text-xs uppercase tracking-wider">
              MINH BẠCH &amp; AN TOÀN
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mt-3">
              3 Trụ cột minh bạch cốt lõi bảo vệ khách hàng của Servigo
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground mt-2">
              Giải quyết triệt để tình trạng mập mờ giá cả, tay nghề không rõ
              ràng và trễ hẹn bằng cơ chế dữ liệu thực.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Trụ cột 1: Hồ sơ xác thực & Radar 5 tiêu chí */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-primary flex items-center justify-center font-bold text-sm">
                    01
                  </span>
                  <h3 className="font-serif text-lg font-bold text-foreground">
                    Hồ sơ xác thực &amp; 5 tiêu chí
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                  Thẩm định giấy tờ xác minh danh tính và chứng chỉ nghề nghiệp;
                  đánh giá công khai thang 5.0 sao theo 5 tiêu chí thực tế từ
                  khách hàng.
                </p>

                {/* Radar SVG 5 chiều */}
                <div className="relative w-full h-48 flex items-center justify-center bg-muted/40 rounded-xl p-3 border border-border">
                  <svg
                    className="w-full h-full max-w-[190px]"
                    viewBox="0 0 200 200"
                  >
                    <polygon
                      fill="none"
                      points="100,20 176,75 147,165 53,165 24,75"
                      stroke="#CBD5E1"
                      strokeWidth="1"
                    />
                    <polygon
                      fill="none"
                      points="100,50 145,83 128,137 72,137 55,83"
                      stroke="#E2E8F0"
                      strokeWidth="1"
                    />
                    <line
                      stroke="#CBD5E1"
                      strokeWidth="1"
                      x1="100"
                      x2="100"
                      y1="100"
                      y2="20"
                    />
                    <line
                      stroke="#CBD5E1"
                      strokeWidth="1"
                      x1="100"
                      x2="176"
                      y1="100"
                      y2="75"
                    />
                    <line
                      stroke="#CBD5E1"
                      strokeWidth="1"
                      x1="100"
                      x2="147"
                      y1="100"
                      y2="165"
                    />
                    <line
                      stroke="#CBD5E1"
                      strokeWidth="1"
                      x1="100"
                      x2="53"
                      y1="100"
                      y2="165"
                    />
                    <line
                      stroke="#CBD5E1"
                      strokeWidth="1"
                      x1="100"
                      x2="24"
                      y1="100"
                      y2="75"
                    />
                    <polygon
                      fill="rgba(5, 150, 105, 0.25)"
                      points="100,25 170,78 142,160 58,162 28,78"
                      stroke="#059669"
                      strokeWidth="2"
                    />
                    <circle cx="100" cy="25" fill="#059669" r="3.5" />
                    <circle cx="170" cy="78" fill="#059669" r="3.5" />
                    <circle cx="142" cy="160" fill="#059669" r="3.5" />
                    <circle cx="58" cy="162" fill="#059669" r="3.5" />
                    <circle cx="28" cy="78" fill="#059669" r="3.5" />
                  </svg>
                </div>

                {/* 5 Tiêu chí thực tế */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-medium">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/60">
                    <span className="text-muted-foreground">Đúng giờ</span>
                    <span className="text-primary font-bold">4.9 ★</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/60">
                    <span className="text-muted-foreground">Chuyên môn</span>
                    <span className="text-primary font-bold">4.8 ★</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/60">
                    <span className="text-muted-foreground">Thái độ</span>
                    <span className="text-primary font-bold">5.0 ★</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/60">
                    <span className="text-muted-foreground">Minh bạch giá</span>
                    <span className="text-primary font-bold">5.0 ★</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/60 col-span-2">
                    <span className="text-muted-foreground">
                      Chất lượng dịch vụ
                    </span>
                    <span className="text-primary font-bold">4.9 / 5.0 ★</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trụ cột 2: Biên bản hình ảnh Trước & Sau */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-primary flex items-center justify-center font-bold text-sm">
                    02
                  </span>
                  <h3 className="font-serif text-lg font-bold text-foreground">
                    Biên bản ảnh Trước &amp; Sau
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                  Cập nhật trực quan ảnh chụp hiện trạng TRƯỚC KHI SỬA và kết quả
                  SAU KHI SỬA ngay trên chi tiết đơn hàng để khách hàng nghiệm
                  thu minh bạch.
                </p>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative rounded-xl overflow-hidden border border-border h-32 bg-muted flex items-center justify-center text-center p-2">
                      <div className="space-y-1">
                        <Camera className="w-6 h-6 text-muted-foreground mx-auto" />
                        <span className="text-[11px] text-muted-foreground block">
                          Hiện trạng rò rỉ / sự cố
                        </span>
                      </div>
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-red-600 text-white font-semibold text-[10px]">
                        TRƯỚC SỬA
                      </span>
                    </div>
                    <div className="relative rounded-xl overflow-hidden border border-border h-32 bg-emerald-50/50 dark:bg-emerald-950/30 flex items-center justify-center text-center p-2">
                      <div className="space-y-1">
                        <CheckCircle2 className="w-6 h-6 text-primary mx-auto" />
                        <span className="text-[11px] text-primary block font-medium">
                          Đã xử lý &amp; kiểm tra
                        </span>
                      </div>
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-emerald-600 text-white font-semibold text-[10px]">
                        SAU SỬA
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/50 border border-border text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Tọa độ GPS đối soát:</span>
                      <span className="font-mono font-medium text-foreground">
                        10.8456° N, 106.7719° E
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Nghiệm thu:</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Khớp 100% linh
                        kiện thay
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trụ cột 3: Giữ khung giờ 3 phút & Bảng giá rõ ràng */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-primary flex items-center justify-center font-bold text-sm">
                    03
                  </span>
                  <h3 className="font-serif text-lg font-bold text-foreground">
                    Giữ giờ 3 phút &amp; Giá rõ ràng
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                  Tạm giữ lịch hẹn 3 phút chống trùng ca làm việc, báo trước giá
                  cơ bản kèm phí di chuyển minh bạch theo km thực tế.
                </p>

                <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Khung giờ chọn:
                    </span>
                    <span className="text-xs font-bold text-foreground px-2.5 py-1 rounded bg-card border border-border">
                      14:00 - 15:30 Hôm nay
                    </span>
                  </div>
                  {/* Countdown Timer */}
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary">
                      <Timer className="w-4 h-4" />
                      <span className="text-xs font-semibold">
                        Tạm giữ khung giờ:
                      </span>
                    </div>
                    <span className="font-mono font-bold text-primary text-sm">
                      02:45
                    </span>
                  </div>
                  {/* Distance Fee Policy */}
                  <div className="pt-2 border-t border-border flex items-start gap-2">
                    <Truck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold text-foreground">
                        Chính sách phí di chuyển chuẩn
                      </p>
                      <p className="text-muted-foreground text-[11px] leading-tight mt-0.5">
                        Khoảng cách &le; 3km: Miễn phí (0đ). Khoảng cách &gt;
                        3km: Phụ thu cố định +5.000đ/km.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 4. DỊCH VỤ & NHÀ CUNG CẤP TIÊU BIỂU       */}
      {/* ========================================== */}
      <section
        className="py-16 bg-muted/40 border-t border-border"
        id="nha-cung-cap"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-primary font-semibold text-xs uppercase tracking-wider">
                ĐỐI TÁC TIÊU BIỂU
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mt-2">
                Dịch vụ &amp; Nhà cung cấp tiêu biểu quanh bạn
              </h2>
              <p className="text-base text-muted-foreground mt-1">
                Hồ sơ lý lịch đã được kiểm duyệt giấy tờ năng lực, phản hồi minh
                bạch từ khách hàng thực tế
              </p>
            </div>
            <Link
              href="/map"
              className="inline-flex items-center gap-1.5 text-primary hover:text-primary/90 font-semibold text-sm transition-colors cursor-pointer"
            >
              <Radar className="w-4 h-4" />
              <span>Xem tất cả trên bản đồ</span>
            </Link>
          </div>

          {/* Service Cards Grid */}
          {isServicesLoading ? (
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
          ) : servicesData && servicesData.items && servicesData.items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servicesData.items.map((item: ServiceListItem) => (
                <div
                  key={item.id}
                  className="bg-card rounded-2xl border border-border p-5 shadow-xs hover:border-primary/40 hover:shadow-sm transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Badge danh mục & Tọa độ */}
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
                          <span className="inline-flex items-center gap-0.5 text-xs text-amber-500 font-bold shrink-0">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            5.0
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
                      className="w-full py-2 px-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold text-center shadow-xs transition inline-flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Xem hồ sơ</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-card rounded-2xl border border-dashed border-border">
              <p className="text-sm text-muted-foreground">
                Chưa có dịch vụ nào đang hiển thị. Hãy mở bản đồ để quét theo vị
                trí GPS của bạn!
              </p>
              <Link
                href="/map"
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition"
              >
                <Radar className="w-4 h-4" />
                <span>Quét trên bản đồ</span>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ========================================== */}
      {/* 5. QUY TRÌNH & DUAL CTA KÉP                */}
      {/* ========================================== */}
      <section className="py-16 bg-card" id="quy-trinh">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-primary font-semibold text-xs uppercase tracking-wider">
              QUY TRÌNH MINH BẠCH
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mt-3">
              Quy trình 3 bước đặt lịch nhanh chóng &amp; tin cậy
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground mt-2">
              Chủ động thời gian, biết trước chi phí và nghiệm thu minh bạch
              trước khi thanh toán.
            </p>
          </div>

          {/* 3 Bước */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-card rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mb-6 shadow-xs">
                  01
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Quét bản đồ &amp; Chọn dịch vụ
                </h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Chọn dịch vụ cần hỗ trợ, hệ thống định vị GPS tự động gợi ý
                  danh sách nhà cung cấp gần bạn nhất kèm bảng giá niêm yết rõ
                  ràng.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border flex items-center gap-2 text-xs text-primary font-medium">
                <MapPin className="w-4 h-4" />
                <span>Định vị GPS chính xác theo bán kính</span>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mb-6 shadow-xs">
                  02
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Chọn khung giờ &amp; Xác nhận
                </h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Xem lịch rảnh thực tế của nhà cung cấp, tạm giữ khung giờ 3
                  phút để chống trùng lịch trước khi hoàn tất đặt hẹn.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border flex items-center gap-2 text-xs text-primary font-medium">
                <Timer className="w-4 h-4" />
                <span>Giữ khung giờ 3 phút chống trùng lịch</span>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mb-6 shadow-xs">
                  03
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Nghiệm thu ảnh &amp; Đánh giá
                </h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Đối chiếu biên bản ảnh chụp trước và sau khi hoàn thành, kiểm
                  tra chất lượng thực tế rồi mới thanh toán và gửi đánh giá.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border flex items-center gap-2 text-xs text-primary font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>Minh bạch đối soát 100% hình ảnh</span>
              </div>
            </div>
          </div>

          {/* Khối Dual CTA kép */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Panel Khách hàng */}
            <div className="bg-primary rounded-3xl p-8 lg:p-10 text-white flex flex-col justify-between shadow-md relative overflow-hidden">
              <div className="relative z-10">
                <span className="px-3 py-1 rounded-full bg-white/20 text-white font-semibold text-xs uppercase tracking-wider">
                  Dành Cho Khách Hàng
                </span>
                <h3 className="font-serif text-2xl lg:text-3xl font-bold mt-4 leading-tight">
                  Cần đặt dịch vụ dân sinh ngay hôm nay?
                </h3>
                <p className="text-sm text-white/90 mt-2 max-w-md leading-relaxed">
                  Kết nối nhanh chóng với mạng lưới nhà cung cấp uy tín, minh
                  bạch giá cả và có bảo chứng chất lượng quanh khu vực của bạn.
                </p>
                <ul className="mt-6 space-y-2.5 text-xs font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                    <span>
                      Quét tìm nhà cung cấp gần nhất theo tọa độ GPS thực tế
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                    <span>
                      Miễn phí di chuyển trong 3km đầu, niêm yết giá cơ bản rõ
                      ràng
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                    <span>
                      Đối chiếu hình ảnh trước và sau khi thực hiện minh bạch
                    </span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 relative z-10">
                <Link
                  href="/map"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-card text-primary hover:bg-muted font-semibold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Tìm nhà cung cấp quanh đây</span>
                </Link>
              </div>
            </div>

            {/* Panel Nhà cung cấp đối tác */}
            <div className="bg-card rounded-3xl border border-border p-8 lg:p-10 text-foreground flex flex-col justify-between shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-primary font-semibold text-xs uppercase tracking-wider">
                  Gia Nhập Đối Tác
                </span>
                <h3 className="font-serif text-2xl lg:text-3xl font-bold mt-4 leading-tight">
                  Bạn muốn mở rộng khách hàng và tăng thu nhập?
                </h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
                  Đăng ký hồ sơ nhà cung cấp trên Servigo để nhận lịch hẹn quanh
                  bán kính hoạt động của bạn với quy trình quản lý minh bạch.
                </p>
                <ul className="mt-6 space-y-2.5 text-xs font-medium text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      Nhận lịch hẹn chủ động theo khung giờ rảnh tự thiết lập
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      Bán kính phục vụ linh hoạt 2km – 20km từ vị trí làm việc
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      Cơ chế đối soát công bằng, xây dựng uy tín dựa trên đánh
                      giá thực
                    </span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 relative z-10">
                <Link
                  href="/provider/register"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Handshake className="w-4 h-4" />
                  <span>Trở thành nhà cung cấp</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Dòng bản quyền 1 dòng duy nhất */}
          <div className="mt-14 pt-8 border-t border-border text-center text-xs text-muted-foreground">
            <p>
              © 2026 Servigo. Nền tảng đặt lịch dịch vụ dân sinh minh bạch. Bản
              quyền thuộc về Servigo.
            </p>
          </div>
        </div>
      </section>

      {/* Modal Xem chi tiết dịch vụ S17.3 */}
      <ServiceDetailDialog
        serviceId={detailServiceId}
        open={detailOpen}
        onClose={handleCloseDetail}
      />
    </div>
  );
}
