"use client";

import { useCategories, useServices } from "@/hooks/use-discovery";
import type {
  ServiceDetailItem,
  ServiceListItem,
} from "@/types/discovery.types";
import {
  AirVent,
  Armchair,
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  ChevronsLeftRight,
  Compass,
  Droplets,
  Handshake,
  KeyRound,
  LocateFixed,
  Lock,
  LucideIcon,
  Map as MapIcon,
  MapPin,
  Menu,
  PaintRoller,
  Pipette,
  PlayCircle,
  Refrigerator,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
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
  basePrice: number;
  minPrice: string;
  providerCount: number;
}

const DEFAULT_CATEGORIES: CategoryPreset[] = [
  {
    slug: "sua-dien-lanh",
    name: "Sửa điện lạnh",
    description: "Máy lạnh, tủ lạnh, máy giặt, vệ sinh & bảo dưỡng nạp gas định kỳ.",
    icon: AirVent,
    basePrice: 150000,
    minPrice: "150.000đ",
    providerCount: 42,
  },
  {
    slug: "sua-dien-nuoc",
    name: "Sửa điện nước",
    description: "Xử lý rò rỉ ống nước âm tường, chập cháy điện, thay aptomat an toàn.",
    icon: Droplets,
    basePrice: 120000,
    minPrice: "120.000đ",
    providerCount: 58,
  },
  {
    slug: "sua-khoa-cua-cuon",
    name: "Sửa khóa & Cửa cuốn",
    description: "Mở khóa cấp tốc, thay ổ khóa cơ & điện tử thông minh, cân chỉnh cửa cuốn.",
    icon: KeyRound,
    basePrice: 100000,
    minPrice: "100.000đ",
    providerCount: 25,
  },
  {
    slug: "thong-tac-ve-sinh",
    name: "Thông tắc vệ sinh",
    description: "Thông tắc bồn cầu, chậu rửa, đường cống sàn bằng máy lò xo không đục phá.",
    icon: Pipette,
    basePrice: 150000,
    minPrice: "150.000đ",
    providerCount: 31,
  },
  {
    slug: "ve-sinh-nha-cua",
    name: "Vệ sinh nhà cửa",
    description: "Tổng vệ sinh theo giờ, giặt sofa, đệm sâu, hút bụi căn hộ chuyên nghiệp.",
    icon: Sparkles,
    basePrice: 200000,
    minPrice: "200.000đ",
    providerCount: 36,
  },
  {
    slug: "thiet-bi-gia-dung",
    name: "Thiết bị gia dụng",
    description: "Bếp từ, máy hút mùi, lò vi sóng, máy lọc nước, nồi chiên không dầu.",
    icon: Refrigerator,
    basePrice: 180000,
    minPrice: "180.000đ",
    providerCount: 19,
  },
  {
    slug: "son-sua-chong-tham",
    name: "Sơn sửa & Chống thấm",
    description: "Chống thấm trần sàn, ban công, thạch cao, sơn dặm vá tường nhà nứt nẻ.",
    icon: PaintRoller,
    basePrice: 350000,
    minPrice: "350.000đ",
    providerCount: 15,
  },
  {
    slug: "do-go-noi-that",
    name: "Đồ gỗ & Nội thất",
    description: "Lắp ráp đồ gỗ, sửa chữa bàn ghế, giường tủ, thay ray trượt bản lề tủ bếp.",
    icon: Armchair,
    basePrice: 150000,
    minPrice: "150.000đ",
    providerCount: 22,
  },
];

// Fallback hiển thị cho khu vực Nhà cung cấp tiêu biểu khi API tạm thời không phản hồi hoặc rỗng
const DEFAULT_SHOWCASE_SERVICES: ServiceListItem[] = [
  {
    id: "default-svc-1",
    title: "Bảo dưỡng & Vệ sinh điều hòa treo tường",
    description:
      "Vệ sinh chuyên sâu dàn nóng, dàn lạnh bằng máy bơm áp lực cao, kiểm tra áp suất gas và bổ sung ga R32/R410A miễn phí.",
    basePrice: 250000,
    priceUnit: "FIXED",
    durationMinutes: 60,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    category: {
      id: "default-cat-1",
      name: "Sửa điện lạnh",
      slug: "sua-dien-lanh",
    },
    provider: {
      id: "default-prov-1",
      userId: "default-user-1",
      displayName: "Lê Văn Minh",
      experienceYears: 6,
      avatar:
        "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=400&q=80",
      phone: null,
      areaName: "Trạm Hiệp Phú - Lê Văn Việt, Quận 9",
      isOnline: true,
      ratingAverage: 0,
      reviewCount: 0,
    },
  },
  {
    id: "default-svc-2",
    title: "Sửa chữa chập điện & Thay aptomat tại nhà",
    description:
      "Xử lý triệt để sự cố mất điện cục bộ, nhảy át liên tục, rò rỉ điện âm tường bằng thiết bị đo chuyên dụng an toàn tuyệt đối.",
    basePrice: 200000,
    priceUnit: "FIXED",
    durationMinutes: 45,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    category: {
      id: "default-cat-2",
      name: "Sửa điện nước",
      slug: "sua-dien-nuoc",
    },
    provider: {
      id: "default-prov-2",
      userId: "default-user-2",
      displayName: "Nguyễn Tiến Đạt",
      experienceYears: 8,
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
      phone: null,
      areaName: "Trạm Tăng Nhơn Phú A - Man Thiện, Quận 9",
      isOnline: true,
      ratingAverage: 0,
      reviewCount: 0,
    },
  },
  {
    id: "default-svc-3",
    title: "Mở khóa cửa tay gạt & Đánh chìa khóa cơ tại chỗ",
    description:
      "Mở khóa nhanh không hỏng ổ, sửa kẹt chìa, thay ruột khóa mới bảo mật cao trong 15 phút.",
    basePrice: 150000,
    priceUnit: "FIXED",
    durationMinutes: 30,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    category: {
      id: "default-cat-3",
      name: "Sửa khóa & Cửa cuốn",
      slug: "sua-khoa-cua-cuon",
    },
    provider: {
      id: "default-prov-3",
      userId: "default-user-3",
      displayName: "Trần Hoàng Sơn",
      experienceYears: 5,
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80",
      phone: null,
      areaName: "Trạm Phước Long B - Đỗ Xuân Hợp, Quận 9",
      isOnline: true,
      ratingAverage: 0,
      reviewCount: 0,
    },
  },
  {
    id: "default-svc-4",
    title: "Dọn dẹp vệ sinh nhà ở chuyên sâu theo giờ",
    description:
      "Lau dọn sàn nhà, hút bụi thảm, làm sạch bếp, toilet bằng dung dịch sinh học an toàn cho trẻ nhỏ và thú cưng.",
    basePrice: 160000,
    priceUnit: "HOURLY",
    durationMinutes: 120,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    category: {
      id: "default-cat-4",
      name: "Vệ sinh nhà cửa",
      slug: "ve-sinh-nha-cua",
    },
    provider: {
      id: "default-prov-4",
      userId: "default-user-4",
      displayName: "Hoàng Thị Mai",
      experienceYears: 4,
      avatar:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80",
      phone: null,
      areaName: "Trạm Tăng Nhơn Phú B - Dương Đình Hội, Quận 9",
      isOnline: true,
      ratingAverage: 0,
      reviewCount: 0,
    },
  },
  {
    id: "default-svc-5",
    title: "Thông tắc bồn cầu & Đường ống cống bằng máy lò xo",
    description:
      "Sử dụng máy thông lò xo công nghiệp không đục phá, loại bỏ hoàn toàn cặn dầu mỡ và rác thải, khử mùi hôi hiệu quả.",
    basePrice: 350000,
    priceUnit: "FIXED",
    durationMinutes: 60,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    category: {
      id: "default-cat-5",
      name: "Thông tắc vệ sinh",
      slug: "thong-tac-ve-sinh",
    },
    provider: {
      id: "default-prov-5",
      userId: "default-user-5",
      displayName: "Phạm Văn Hùng",
      experienceYears: 7,
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80",
      phone: null,
      areaName: "Trạm Long Thạnh Mỹ - Khu Công Nghệ Cao, Quận 9",
      isOnline: true,
      ratingAverage: 0,
      reviewCount: 0,
    },
  },
  {
    id: "default-svc-6",
    title: "Chống thấm sân thượng, tường nhà & Sơn dặm vá thẩm mỹ",
    description:
      "Xử lý triệt để vết nứt chân chim, chống thấm ngược bằng vật liệu Sika/Kova chuẩn hãng, sơn phủ 2 lớp bền màu.",
    basePrice: 350000,
    priceUnit: "FROM",
    durationMinutes: 120,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    category: {
      id: "default-cat-6",
      name: "Sơn sửa & Chống thấm",
      slug: "son-sua-chong-tham",
    },
    provider: {
      id: "default-prov-6",
      userId: "default-user-6",
      displayName: "Đặng Tuấn Kiệt",
      experienceYears: 7,
      avatar:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80",
      phone: null,
      areaName: "Trạm Tân Phú - Suối Tiên, Quận 9",
      isOnline: true,
      ratingAverage: 0,
      reviewCount: 0,
    },
  },
];

function toFallbackServiceDetail(item: ServiceListItem): ServiceDetailItem {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    basePrice: item.basePrice,
    priceUnit: item.priceUnit,
    durationMinutes: item.durationMinutes,
    status: item.status,
    createdAt: item.createdAt,
    category: item.category,
    provider: {
      id: item.provider.id,
      userId: item.provider.userId,
      displayName: item.provider.displayName,
      bio: null,
      experienceYears: item.provider.experienceYears,
      phone: item.provider.phone,
      avatar: item.provider.avatar,
      verificationStatus: "APPROVED",
      ratingAverage: item.provider.ratingAverage,
      reviewCount: item.provider.reviewCount,
      serviceAreas: item.provider.areaName
        ? [
            {
              id: `${item.provider.id}-area`,
              areaName: item.provider.areaName,
              centerLatitude: 10.8456,
              centerLongitude: 106.7719,
              radiusKm: 15,
            },
          ]
        : [],
    },
  };
}

const NAV_SECTIONS = [
  { id: "danh-muc", label: "Danh mục", mobileLabel: "Danh mục dịch vụ" },
  { id: "minh-bach", label: "Minh bạch", mobileLabel: "Cơ chế bảo vệ" },
  { id: "du-toan", label: "Dự toán", mobileLabel: "Dự toán tức thì" },
  { id: "nha-cung-cap", label: "Nhà cung cấp", mobileLabel: "Nhà cung cấp" },
  { id: "quy-trinh", label: "Quy trình", mobileLabel: "Quy trình đặt lịch" },
  { id: "faq", label: "Hỏi đáp", mobileLabel: "Câu hỏi thường gặp" },
] as const;

const PILLAR_CRITERIA = [
  { label: "Đúng giờ", score: "4.9 ★", fullWidth: false },
  { label: "Chuyên môn", score: "4.8 ★", fullWidth: false },
  { label: "Thái độ", score: "5.0 ★", fullWidth: false },
  { label: "Giá rõ ràng", score: "5.0 ★", fullWidth: false },
  { label: "Chất lượng dịch vụ hoàn tất", score: "4.9 / 5.0 ★", fullWidth: true },
] as const;

const BOOKING_STEPS = [
  {
    step: "01",
    title: "Quét bản đồ & Chọn dịch vụ",
    description:
      "Chọn dịch vụ cần hỗ trợ, hệ thống định vị GPS tự động gợi ý danh sách nhà cung cấp gần bạn nhất kèm bảng giá niêm yết rõ ràng.",
    footerIcon: MapPin,
    footerText: "Định vị GPS chính xác theo bán kính",
  },
  {
    step: "02",
    title: "Chọn khung giờ & Tạm giữ 3 phút",
    description:
      "Xem lịch rảnh thực tế của nhà cung cấp, tạm giữ khung giờ 3 phút để chống trùng ca làm việc trước khi hoàn tất đặt hẹn.",
    footerIcon: Lock,
    footerText: "Giữ khung giờ 3 phút chống trùng lịch",
  },
  {
    step: "03",
    title: "Nghiệm thu ảnh & Đánh giá",
    description:
      "Đối chiếu biên bản ảnh chụp trước và sau khi hoàn thành, kiểm tra chất lượng thực tế rồi mới thanh toán và gửi đánh giá.",
    footerIcon: BadgeCheck,
    footerText: "Đối soát có căn cứ bằng hình ảnh",
  },
] as const;

type FaqGroup = "all" | "pricing" | "booking" | "warranty" | "partner";

const FAQ_TABS: Array<{ id: FaqGroup; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "pricing", label: "Chi phí & Di chuyển" },
  { id: "booking", label: "Đặt lịch & Giữ chỗ" },
  { id: "warranty", label: "Nghiệm thu & Bảo hành" },
  { id: "partner", label: "Dành cho Nhà cung cấp" },
];

const BEFORE_IMAGE_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAKPFduVmFWHYcwWZuLC05jUoxVb7yw5EEwJRYEmlXIyxEqi9aFnBG3WcnOEyqPI9Se1m6yzwUy8fSnU13gfnIdO7q_NoJ4aP3jvv55Oh-5ddU37cb2OVMDxou3Z8uuUsEXrdN3sGXxL1yd3YZHdAn2huBa_jdURsg5LWWWabdhdEHw5u2W_5YfTP1_Yj9koCvxOMwfA3aiQZD-xOigEiLw6XDtKQT8ul_pr_Vl8NmEHc6Ag6CM4H_998UG26Tdm_QiCj6iM23jWxml";
const AFTER_IMAGE_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCO_aSsOTZ52kYPa3nP3IHzwvBPpPlgrPciTyiRf0oKDBbJGOhqG6zOHn7nW5EUBCiPGxHq2M54-oWzsOjhbvngqpyfBP_waav9KWioLjuGw5rJtsv2Bvv_oPg3hZ5EfUEE9ShT0RFW8y9viXHs6CKUzZSS-4Iob8UoLJVsUrOXc5ALLmuFIhWbTtfBy8lphTf0IJPgglszVCZlm5YDcSVdayyPWCn9zZOJkmwCVnj9guL8fs8qOo2SXWrrfOJ1n1p7b2DjOcG4Q7xr";

function getCategoryPreset(slug: string): CategoryPreset {
  const exact = DEFAULT_CATEGORIES.find((c) => c.slug === slug);
  if (exact) return exact;
  if (slug.includes("lanh")) return DEFAULT_CATEGORIES[0];
  if (slug.includes("nuoc")) return DEFAULT_CATEGORIES[1];
  if (slug.includes("khoa")) return DEFAULT_CATEGORIES[2];
  if (slug.includes("thong")) return DEFAULT_CATEGORIES[3];
  if (slug.includes("ve-sinh")) return DEFAULT_CATEGORIES[4];
  if (slug.includes("gia-dung")) return DEFAULT_CATEGORIES[5];
  if (slug.includes("son")) return DEFAULT_CATEGORIES[6];
  if (slug.includes("go") || slug.includes("that")) return DEFAULT_CATEGORIES[7];
  return DEFAULT_CATEGORIES[1];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

function formatVndSpaced(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
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

function TiltCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const clearTiltDelay = (card: HTMLDivElement) => {
    card.classList.remove("delay-100", "delay-200", "delay-300", "delay-400");
    card.classList.add("reveal-done");
  };

  const handleMouseEnter = () => {
    const card = cardRef.current;
    if (!card) return;
    clearTiltDelay(card);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !window.matchMedia("(pointer: fine)").matches
    ) {
      return;
    }
    const card = cardRef.current;
    if (!card) return;
    clearTiltDelay(card);
    card.classList.add("is-tilting");
    const clientX = e.clientX;
    const clientY = e.clientY;
    if (rafRef.current !== null) return;

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px) scale3d(1.012, 1.012, 1.012)`;
    });
  };

  const handleMouseLeave = () => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const card = cardRef.current;
    if (!card) return;
    card.classList.remove("is-tilting");
    card.style.transform =
      "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) scale3d(1, 1, 1)";
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </div>
  );
}

function BeforeAfterSlider() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [percent, setPercent] = useState(50);
  const [containerWidth, setContainerWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [beforeError, setBeforeError] = useState(false);
  const [afterError, setAfterError] = useState(false);

  useEffect(() => {
    const syncWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    syncWidth();
    window.addEventListener("resize", syncWidth);
    return () => window.removeEventListener("resize", syncWidth);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const updateFromClientX = (clientX: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width) return;
      const clamped = Math.max(0, Math.min(rect.width, clientX - rect.left));
      setPercent((clamped / rect.width) * 100);
    };

    const onPointerMove = (e: PointerEvent) => updateFromClientX(e.clientX);
    const onPointerUp = () => setDragging(false);

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragging]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width) {
      const clamped = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      setPercent((clamped / rect.width) * 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPercent((p) => Math.max(0, p - 5));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPercent((p) => Math.min(100, p + 5));
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      role="slider"
      tabIndex={0}
      aria-label="Thanh trượt so sánh ảnh trước và sau khi sửa"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      className="before-after-container relative w-full h-56 rounded-2xl border border-[#E2E8F0] overflow-hidden cursor-ew-resize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006948]"
    >
      {/* Ảnh SAU KHI SỬA */}
      {!afterError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          alt="Sau khi sửa chữa"
          src={AFTER_IMAGE_URL}
          onError={() => setAfterError(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-[#ECFDF5] flex flex-col items-center justify-center text-center p-4">
          <CheckCircle2 className="w-8 h-8 text-[#006948] mb-1.5" />
          <span className="text-xs font-semibold text-[#006948]">
            Đã vệ sinh, thay linh kiện &amp; kiểm tra vận hành
          </span>
        </div>
      )}
      <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[#10B981] text-white font-semibold text-[10px] z-10 shadow-xs">
        SAU KHI SỬA
      </span>

      {/* Ảnh TRƯỚC KHI SỬA (clipped) */}
      <div
        className="absolute inset-y-0 left-0 overflow-hidden z-20"
        style={{ width: `${percent}%` }}
      >
        {!beforeError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="absolute inset-0 h-full object-cover max-w-none pointer-events-none"
            style={{
              width: containerWidth > 0 ? `${containerWidth}px` : "100%",
              height: "100%",
            }}
            alt="Trước khi sửa chữa"
            src={BEFORE_IMAGE_URL}
            onError={() => setBeforeError(true)}
          />
        ) : (
          <div
            className="h-full bg-slate-200 flex flex-col items-center justify-center text-center p-4"
            style={{
              width: containerWidth > 0 ? `${containerWidth}px` : "100%",
            }}
          >
            <Wrench className="w-8 h-8 text-slate-500 mb-1.5" />
            <span className="text-xs font-semibold text-slate-600">
              Hiện trạng rò rỉ / bám bẩn ban đầu
            </span>
          </div>
        )}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#EF4444] text-white font-semibold text-[10px] z-10 shadow-xs">
          TRƯỚC KHI SỬA
        </span>
      </div>

      {/* Thanh kéo */}
      <div className="before-after-handle" style={{ left: `${percent}%` }}>
        <div className="before-after-button">
          <ChevronsLeftRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

export function GuestLandingView() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const heroRafRef = useRef<number | null>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const [activeNavTarget, setActiveNavTarget] = useState<string>("");

  const [slotSeconds, setSlotSeconds] = useState(165); // 02:45
  const [calcDist, setCalcDist] = useState(3);
  const [estCategorySlug, setEstCategorySlug] = useState("sua-dien-lanh");
  const [estDist, setEstDist] = useState(2.5);

  const [faqGroup, setFaqGroup] = useState<FaqGroup>("all");
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

  const [detailServiceId, setDetailServiceId] = useState<string | null>(null);
  const [detailFallbackService, setDetailFallbackService] =
    useState<ServiceDetailItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: apiCategories } = useCategories();
  const { data: servicesData, isLoading: isServicesLoading } = useServices({
    page: 1,
    limit: 6,
    sort: "newest",
  });

  const showcaseItems =
    servicesData?.items && servicesData.items.length > 0
      ? servicesData.items
      : DEFAULT_SHOWCASE_SERVICES;

  const hasApiCategories = Boolean(apiCategories && apiCategories.length > 0);
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

  // 1. Scroll progress bar + Sticky header blur + Scroll-Spy pill nav
  useEffect(() => {
    const spyIds = NAV_SECTIONS.map((s) => s.id);
    const onScroll = () => {
      const winScroll =
        document.documentElement.scrollTop || document.body.scrollTop;
      const height =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      setScrollPercent(height > 0 ? (winScroll / height) * 100 : 0);
      setIsHeaderScrolled(winScroll > 30);

      let active = "";
      if (window.scrollY > 240) {
        for (const id of spyIds) {
          const sec = document.getElementById(id);
          if (sec && sec.getBoundingClientRect().top <= 160) {
            active = id;
          }
        }
      }
      setActiveNavTarget(active);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 2. Scroll Reveal Observer (chờ paint frame đầu tiên rồi mới observe để hero và card trượt lên 0.8s mượt như bản HTML gốc)
  useEffect(() => {
    const container = rootRef.current;
    if (!container) return;

    const REVEAL_DELAY_CLASSES = [
      "delay-100",
      "delay-200",
      "delay-300",
      "delay-400",
    ];
    const clearRevealDelay = (el: HTMLElement) => {
      el.classList.remove(...REVEAL_DELAY_CLASSES);
      el.classList.add("reveal-done");
    };

    const elements = Array.from(
      container.querySelectorAll<HTMLElement>(".reveal-elem:not(.revealed)"),
    );
    if (elements.length === 0) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((el) => {
        el.classList.add("revealed");
        clearRevealDelay(el);
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          el.classList.add("revealed");

          // Xóa delay-* sau khi scroll-reveal xong để hover kế tiếp phản hồi 0ms
          const onRevealEnd = (ev: TransitionEvent) => {
            if (ev.target !== el || ev.propertyName !== "opacity") return;
            clearRevealDelay(el);
            el.removeEventListener("transitionend", onRevealEnd);
          };
          el.addEventListener("transitionend", onRevealEnd);
          window.setTimeout(() => {
            el.removeEventListener("transitionend", onRevealEnd);
            clearRevealDelay(el);
          }, 1350);

          observer.unobserve(el);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );

    let rafInner = 0;
    // Double rAF đảm bảo browser đã paint ít nhất 1 frame ở opacity: 0 trước khi thêm .revealed
    const rafOuter = window.requestAnimationFrame(() => {
      rafInner = window.requestAnimationFrame(() => {
        elements.forEach((el) => {
          if (!el.dataset.revealBound) {
            el.dataset.revealBound = "1";
            el.addEventListener("mouseenter", () => clearRevealDelay(el), {
              once: true,
              passive: true,
            });
          }
          observer.observe(el);
        });
      });
    });

    return () => {
      window.cancelAnimationFrame(rafOuter);
      if (rafInner) window.cancelAnimationFrame(rafInner);
      observer.disconnect();
    };
  }, [isServicesLoading, servicesData, displayCategories.length]);

  // 3. Ambient canvas particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    let animId = 0;

    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 105, 72, ${p.alpha})`;
        ctx.fill();
      }
      animId = window.requestAnimationFrame(draw);
    };

    draw();

    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // 4. Live 3-minute slot countdown timer
  useEffect(() => {
    const interval = window.setInterval(() => {
      setSlotSeconds((prev) => (prev > 0 ? prev - 1 : 180));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Cleanup Hero parallax rAF on unmount
  useEffect(() => {
    return () => {
      if (heroRafRef.current !== null) {
        window.cancelAnimationFrame(heroRafRef.current);
      }
    };
  }, []);

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !window.matchMedia("(pointer: fine)").matches
    ) {
      return;
    }
    const heroEl = heroRef.current;
    if (!heroEl) return;
    heroEl.classList.add("is-parallax-active");
    const clientX = e.clientX;
    const clientY = e.clientY;
    if (heroRafRef.current !== null) return;

    heroRafRef.current = window.requestAnimationFrame(() => {
      heroRafRef.current = null;
      const rect = heroEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = (clientX - rect.left) / rect.width - 0.5;
      const ny = (clientY - rect.top) / rect.height - 0.5;
      heroEl.style.setProperty("--px", `${(nx * 24).toFixed(1)}px`);
      heroEl.style.setProperty("--py", `${(ny * 20).toFixed(1)}px`);
    });
  };

  const handleHeroMouseLeave = () => {
    if (heroRafRef.current !== null) {
      window.cancelAnimationFrame(heroRafRef.current);
      heroRafRef.current = null;
    }
    const heroEl = heroRef.current;
    if (!heroEl) return;
    heroEl.classList.remove("is-parallax-active");
    heroEl.style.setProperty("--px", "0px");
    heroEl.style.setProperty("--py", "0px");
  };

  const handleOpenDetail = (item: ServiceListItem) => {
    if (item.id.startsWith("default-svc-")) {
      setDetailServiceId(null);
      setDetailFallbackService(toFallbackServiceDetail(item));
    } else {
      setDetailFallbackService(null);
      setDetailServiceId(item.id);
    }
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setDetailServiceId(null);
    setDetailFallbackService(null);
  };

  // Tính toán đồng hồ giữ chỗ 3 phút
  const slotMinutesText = String(Math.floor(slotSeconds / 60)).padStart(2, "0");
  const slotSecondsText = String(slotSeconds % 60).padStart(2, "0");

  // Tính phụ phí di chuyển ở Trụ cột 3
  const calcExtraKm = Math.max(0, calcDist - 3);
  const calcFee = calcExtraKm * 5000;

  // Tính dự toán tức thì ở Section 4
  const estPreset = getCategoryPreset(estCategorySlug);
  const estDistanceFee = estDist > 3 ? (estDist - 3) * 5000 : 0;
  const estTotal = Math.round((estPreset.basePrice + estDistanceFee) / 1000) * 1000;

  const faqItems: Array<{
    group: Exclude<FaqGroup, "all">;
    question: string;
    answer: ReactNode;
  }> = [
    {
      group: "pricing",
      question:
        "1. Cách tính phí di chuyển của Nhà cung cấp trên Servigo như thế nào?",
      answer: (
        <>
          Hệ thống đo khoảng cách thực tế từ vị trí bạn chọn tới trạm phục vụ của
          Nhà cung cấp. Trong bán kính <strong>≤ 3 km đầu tiên</strong>, phí di
          chuyển là <strong>0đ (hoàn toàn miễn phí)</strong>. Nếu khoảng cách
          vượt quá 3 km, hệ thống cộng phụ thu cố định{" "}
          <strong>5.000đ/km</strong> cho phần chênh lệch (ví dụ: 4,2 km sẽ tính
          1,2 km vượt × 5.000đ = +6.000đ) và hiển thị ngay trước khi bạn xác
          nhận.
        </>
      ),
    },
    {
      group: "pricing",
      question:
        "2. Giá hiển thị trên web là giá cố định hay có phát sinh thêm không?",
      answer: (
        <>
          Mỗi dịch vụ trên hệ thống đều gắn một trong 3 đơn vị giá rõ ràng:{" "}
          <strong>Giá cố định</strong> cho hạng mục tiêu chuẩn như bảo dưỡng
          điều hòa, thông tắc; <strong>Theo giờ</strong> như dọn dẹp vệ sinh theo
          giờ; và <strong>Giá từ</strong> cho hạng mục phụ thuộc mức độ hư hỏng
          thực tế (như sửa máy giặt, chống thấm). Với nhóm <em>Giá từ</em> hoặc
          trường hợp cần thay linh kiện, Nhà cung cấp bắt buộc khảo sát và báo
          giá để bạn đồng ý trước khi sửa.
        </>
      ),
    },
    {
      group: "booking",
      question:
        "3. Tại sao khi chọn giờ đặt lịch lại có đồng hồ đếm ngược 3 phút?",
      answer: (
        <>
          Đây là cơ chế <strong>tạm giữ khung giờ trong 3 phút</strong> khi bạn
          đang điền ghi chú địa chỉ hoặc kiểm tra lại đơn đặt. Trong khoảng thời
          gian này, hệ thống ngăn không cho khách hàng khác đặt trùng vào đúng ca
          làm việc đó của Nhà cung cấp. Nếu bạn không hoàn tất sau 3 phút, suất
          hẹn sẽ tự động mở lại cho người khác.
        </>
      ),
    },
    {
      group: "warranty",
      question: "4. Biên bản hình ảnh Trước và Sau khi sửa dùng để làm gì?",
      answer: (
        <>
          Nhà cung cấp tải lên hình ảnh tình trạng ban đầu trước khi thao tác và
          hình ảnh kết quả sau khi hoàn thiện ngay trên đơn hàng. Biên bản này
          giúp bạn dễ dàng đối chiếu chất lượng công việc (ngay cả khi người nhà
          trông coi hộ) và là căn cứ xử lý khách quan nếu phát sinh bảo hành hoặc
          khiếu nại.
        </>
      ),
    },
    {
      group: "booking",
      question:
        "5. Nếu tôi cần dịch vụ ngoài các danh mục có sẵn hoặc muốn hủy lịch thì sao?",
      answer: (
        <>
          Bạn có thể tìm kiếm trực tiếp theo từ khóa trên trang Bản đồ khám phá
          hoặc liên hệ hỗ trợ để ghi nhận nhu cầu thực tế. Khi cần thay đổi kế
          hoạch, bạn có thể hủy lịch miễn phí trước 30 phút trong trang quản lý
          đơn hàng trước khi Nhà cung cấp xuất phát.
        </>
      ),
    },
    {
      group: "partner",
      question: "6. Nhà cung cấp trên Servigo được kiểm duyệt hồ sơ như thế nào?",
      answer: (
        <>
          Mỗi đối tác phải vượt qua quy trình kiểm duyệt hồ sơ xác thực (căn
          cước định danh, ảnh chân dung, thông tin chuyên môn hoặc chứng chỉ nghề
          và vị trí trạm hoạt động thực tế) cùng phạm vi phục vụ tùy chỉnh từ{" "}
          <strong>2 km đến 20 km</strong> trước khi hồ sơ chuyển sang trạng thái
          hoạt động công khai trên bản đồ.
        </>
      ),
    },
    {
      group: "partner",
      question:
        "7. Tôi là thợ lành nghề, làm sao để đăng ký trở thành Nhà cung cấp?",
      answer: (
        <>
          Bạn bấm vào nút{" "}
          <Link
            href="/provider/register"
            className="text-[#006948] font-semibold hover:underline"
          >
            Trở thành nhà cung cấp
          </Link>{" "}
          trên thanh điều hướng, chọn lĩnh vực chuyên môn, thiết lập tọa độ trạm
          phục vụ và bán kính nhận việc mong muốn (2 km – 20 km), sau đó tải bộ
          hồ sơ xác thực để ban quản trị xét duyệt và mở nhận đơn tại khu vực của
          bạn.
        </>
      ),
    },
  ];

  return (
    <div
      ref={rootRef}
      id="top"
      className="landing-v2 mesh-gradient-bg text-[#0F172A] antialiased selection:bg-[#ECFDF5] selection:text-[#006948] min-h-screen flex flex-col relative overflow-x-hidden"
    >
      {/* Top Scroll Progress HUD */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 h-[3px] z-50 transition-[width] duration-100 ease-out"
        style={{
          width: `${scrollPercent}%`,
          background: "linear-gradient(90deg, #006948, #10B981, #D97706)",
        }}
      />

      {/* Background Ambient Canvas Particles */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 opacity-40"
      />

      {/* ========================================== */}
      {/* 1. GUEST TOPBAR (Custom Pill Glass Header) */}
      {/* ========================================== */}
      <header
        id="main-header"
        className={`sticky top-0 w-full z-40 backdrop-blur-xl border-b border-[#E2E8F0]/80 transition-all duration-300 ${
          isHeaderScrolled
            ? "bg-white/95 shadow-md"
            : "bg-white/85"
        }`}
      >
        <div className="flex justify-between items-center max-w-7xl mx-auto px-4 sm:px-6 h-[68px] gap-4">
          {/* Cánh trái: Logo Servigo */}
          <div className="flex items-center shrink-0">
            <a
              href="#top"
              className="flex items-center gap-2.5 group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#006948] flex items-center justify-center text-white shadow-glow transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex items-baseline tracking-tight">
                <span className="font-headline-card text-[22px] font-bold text-[#0F172A]">
                  Servi
                </span>
                <span className="font-headline-card text-[22px] font-bold text-[#006948]">
                  go
                </span>
              </div>
            </a>
          </div>

          {/* Menu ngang giữa: Thanh Pill Kính Mờ + Scroll-Spy */}
          <nav
            aria-label="Điều hướng chính"
            className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-[#F1F5F9]/80 border border-[#E2E8F0]/80 backdrop-blur-md"
          >
            {NAV_SECTIONS.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className={`nav-pill-link whitespace-nowrap px-3.5 py-1.5 rounded-full text-[13px] font-medium text-[#64748B] hover:text-[#0F172A] transition-all duration-150 ${
                  activeNavTarget === sec.id ? "is-active" : ""
                }`}
              >
                {sec.label}
              </a>
            ))}
          </nav>

          {/* Cánh phải: Đối tác, Tài khoản & Menu Mobile */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/provider/register"
              className="hidden xl:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#006948]/25 bg-[#ECFDF5]/70 text-[#006948] hover:bg-[#ECFDF5] font-semibold text-xs transition duration-150 active:scale-95 whitespace-nowrap"
            >
              <Handshake className="w-3.5 h-3.5" />
              <span>Trở thành nhà cung cấp</span>
            </Link>

            <div className="hidden sm:block h-5 w-px bg-[#E2E8F0] mx-0.5" />

            <Link
              href="/auth/signin"
              className="hidden sm:inline-flex px-3.5 py-2 rounded-full text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] font-semibold text-xs transition duration-150 whitespace-nowrap"
            >
              Đăng nhập
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#006948] text-white font-semibold text-xs hover:bg-[#047857] shadow-glow transition duration-150 active:scale-95 whitespace-nowrap"
            >
              Đăng ký
            </Link>

            {/* Mobile Drawer Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden w-10 h-10 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-[#0F172A] hover:border-[#006948]/40 transition cursor-pointer"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-drawer"
              aria-label={mobileMenuOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            id="mobile-nav-drawer"
            className="lg:hidden border-t border-[#E2E8F0] bg-white/95 backdrop-blur-xl px-4 py-4 space-y-3 shadow-lg"
          >
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-[#64748B]">
              {NAV_SECTIONS.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-xl bg-[#F1F5F9]/70 hover:bg-[#ECFDF5] hover:text-[#006948] transition"
                >
                  {sec.mobileLabel}
                </a>
              ))}
            </div>
            <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
              <Link
                href="/provider/register"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#006948]/25 bg-[#ECFDF5] text-[#006948] font-semibold text-xs"
              >
                <Handshake className="w-3.5 h-3.5" />
                <span>Trở thành nhà cung cấp</span>
              </Link>
              <Link
                href="/auth/signin"
                onClick={() => setMobileMenuOpen(false)}
                className="sm:hidden inline-flex items-center px-3.5 py-2 rounded-xl bg-[#F1F5F9] text-[#0F172A] font-semibold text-xs"
              >
                Đăng nhập
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ========================================== */}
      {/* 2. SECTION 1: HERO (Motion + 8 Chips)      */}
      {/* ========================================== */}
      <section
        ref={heroRef}
        id="hero"
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
        className="relative overflow-hidden min-h-[calc(100vh-68px)] flex items-center py-12 sm:py-16 lg:py-20 z-10"
      >
        {/* Nền động: Dot Matrix + Radial Spotlight + Vòng quỹ đạo + Node Parallax */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none overflow-hidden"
        >
          <div className="hero-dot-matrix absolute inset-0 opacity-75" />
          <div
            className="absolute inset-x-0 -top-24 h-[520px]"
            style={{
              background:
                "radial-gradient(ellipse 68% 58% at 50% 42%, rgba(0, 105, 72, 0.09) 0%, rgba(16, 185, 129, 0.05) 45%, transparent 75%)",
            }}
          />

          {/* Subtle Concentric Orbital Rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[540px] h-[540px] sm:w-[760px] sm:h-[760px] rounded-full border border-dashed border-[#006948]/15 hero-orbital-spin flex items-center justify-center">
              <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#006948]/30" />
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[360px] h-[360px] sm:w-[540px] sm:h-[540px] rounded-full border border-[#006948]/10 hero-orbital-spin-reverse" />
          </div>

          {/* 4 Ambient Floating Nodes (Desktop >= xl) */}
          <div className="hidden xl:block max-w-7xl mx-auto relative h-full">
            <div
              className="hero-parallax-node absolute top-[10%] left-4"
              style={{ "--depth": "1.1" } as React.CSSProperties}
            >
              <div className="animate-float flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/85 backdrop-blur-md border border-[#E2E8F0]/90 shadow-sm text-xs font-semibold text-[#64748B]">
                <span className="w-7 h-7 rounded-xl bg-[#ECFDF5] text-[#006948] flex items-center justify-center">
                  <AirVent className="w-4 h-4" />
                </span>
                <span>Sửa điện lạnh</span>
              </div>
            </div>
            <div
              className="hero-parallax-node absolute top-[12%] right-4"
              style={{ "--depth": "-1.3" } as React.CSSProperties}
            >
              <div
                className="animate-float flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/85 backdrop-blur-md border border-[#E2E8F0]/90 shadow-sm text-xs font-semibold text-[#64748B]"
                style={{ animationDelay: "1.2s" }}
              >
                <span className="w-7 h-7 rounded-xl bg-[#ECFDF5] text-[#006948] flex items-center justify-center">
                  <Droplets className="w-4 h-4" />
                </span>
                <span>Sửa điện nước</span>
              </div>
            </div>
            <div
              className="hero-parallax-node absolute bottom-[8%] left-6"
              style={{ "--depth": "-1.0" } as React.CSSProperties}
            >
              <div
                className="animate-float flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/85 backdrop-blur-md border border-[#E2E8F0]/90 shadow-sm text-xs font-semibold text-[#64748B]"
                style={{ animationDelay: "2.1s" }}
              >
                <span className="w-7 h-7 rounded-xl bg-[#ECFDF5] text-[#006948] flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </span>
                <span>Khóa &amp; Cửa cuốn</span>
              </div>
            </div>
            <div
              className="hero-parallax-node absolute bottom-[8%] right-6"
              style={{ "--depth": "1.2" } as React.CSSProperties}
            >
              <div
                className="animate-float flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/85 backdrop-blur-md border border-[#E2E8F0]/90 shadow-sm text-xs font-semibold text-[#64748B]"
                style={{ animationDelay: "0.7s" }}
              >
                <span className="w-7 h-7 rounded-xl bg-[#ECFDF5] text-[#006948] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </span>
                <span>Vệ sinh nhà cửa</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-[820px] mx-auto reveal-elem">
            {/* Headline Mixed Sans + Lora Italic */}
            <h1 className="font-sans-ui text-3xl sm:text-5xl lg:text-[56px] font-semibold tracking-tight text-[#0F172A] leading-[1.14]">
              Đặt lịch dịch vụ gia đình{" "}
              <em className="font-serif italic font-normal text-[#006948]">
                nhanh chóng, an tâm
              </em>{" "}
              ngay quanh bạn.
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base lg:text-lg text-[#64748B] max-w-2xl mx-auto mt-5 leading-relaxed">
              Kết nối nhà cung cấp uy tín theo định vị thực tế trong bán kính
              2km – 20km, miễn phí di chuyển dưới 3km và đối soát bằng hình ảnh
              nghiệm thu trước – sau.
            </p>

            {/* Dual CTA */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link
                href="/map"
                className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-[#006948] text-white font-semibold text-sm hover:bg-[#047857] shadow-glow transition-all duration-200 hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006948] focus-visible:ring-offset-2 group"
              >
                <Compass className="w-[18px] h-[18px]" />
                <span>Khám phá quanh bạn</span>
                <ArrowRight className="w-[18px] h-[18px] transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <a
                href="#quy-trinh"
                className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/90 backdrop-blur-md border border-[#E2E8F0] text-[#0F172A] hover:border-[#006948]/50 hover:text-[#006948] font-semibold text-sm shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006948] focus-visible:ring-offset-2"
              >
                <PlayCircle className="w-[18px] h-[18px] text-[#006948]" />
                <span>Xem cách hoạt động</span>
              </a>
            </div>
          </div>

          {/* Hàng chip 8 lĩnh vực thật */}
          <div className="mt-10 sm:mt-12 max-w-3xl mx-auto text-center reveal-elem delay-100">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3.5">
              8 Lĩnh vực dân sinh sẵn sàng đặt lịch
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {displayCategories.map((cat) => {
                const preset = getCategoryPreset(cat.slug);
                const IconComp = preset.icon;
                return (
                  <div
                    key={cat.slug}
                    className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-md border border-[#E2E8F0] text-xs sm:text-[13px] font-semibold text-[#0F172A] shadow-xs select-none cursor-default"
                  >
                    <IconComp className="w-[18px] h-[18px] text-[#006948]" />
                    <span>{cat.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 3. SECTION 2: 8 DANH MỤC DỊCH VỤ CHUẨN     */}
      {/* ========================================== */}
      <section
        id="danh-muc"
        className="py-20 bg-white/80 backdrop-blur-md border-y border-[#E2E8F0] relative z-10 scroll-mt-16"
      >
        <div className="max-w-7xl mx-auto px-6">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4 reveal-elem">
            <div>
              <h2 className="font-headline-section text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0F172A] mt-3">
                8 Danh mục dịch vụ dân sinh phổ biến
              </h2>
              <p className="text-base text-[#64748B] mt-1 max-w-xl">
                Chi tiết hạng mục công việc và giá khởi điểm cho từng nhóm dịch
                vụ gia đình
              </p>
            </div>
            <Link
              href="/map"
              className="inline-flex items-center gap-1 text-[#006948] hover:text-[#047857] font-semibold text-sm transition-colors group"
            >
              <span>Xem bản đồ dịch vụ toàn khu vực</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* 8-Card Responsive Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayCategories.map((cat, idx) => {
              const preset = getCategoryPreset(cat.slug);
              const IconComp = preset.icon;
              const delayClass =
                [
                  "delay-100",
                  "delay-100",
                  "delay-200",
                  "delay-200",
                  "delay-300",
                  "delay-300",
                  "delay-400",
                  "delay-400",
                ][idx] ?? "delay-100";
              const badgeText = hasApiCategories
                ? cat.activeServicesCount > 0
                  ? `${cat.activeServicesCount} dịch vụ`
                  : "Sẵn sàng"
                : `${preset.providerCount} nhà cung cấp`;

              return (
                <div
                  key={cat.slug}
                  className={`group bg-white rounded-2xl border border-[#E2E8F0] p-5 hover:border-[#006948] shadow-xs hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between reveal-elem ${delayClass} select-none`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] text-[#006948] flex items-center justify-center group-hover:bg-[#006948] group-hover:text-white transition-all duration-300 shadow-xs group-hover:scale-110">
                        <IconComp className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
                        {badgeText}
                      </span>
                    </div>
                    <h3 className="font-headline-card text-lg font-bold text-[#0F172A] group-hover:text-[#006948] transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                      {preset.description}
                    </p>
                  </div>
                  <div className="mt-5 pt-3.5 border-t border-[#E2E8F0] flex items-center justify-between">
                    <span className="text-xs text-[#64748B]">
                      Từ{" "}
                      <strong className="text-[#0F172A] font-bold tabular-nums text-sm">
                        {preset.minPrice}
                      </strong>
                    </span>
                    <span className="text-[11px] font-medium text-[#006948]">
                      Niêm yết giá
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 4. SECTION 3: 3 TRỤ CỘT BẢO VỆ THỰC TẾ    */}
      {/* ========================================== */}
      <section
        id="minh-bach"
        className="py-20 bg-[#F8FAFC] relative z-10 scroll-mt-16"
      >
        <div className="max-w-7xl mx-auto px-6">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 reveal-elem">
            <h2 className="font-headline-section text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0F172A] mt-3">
              3 Trụ cột minh bạch cốt lõi bảo vệ quyền lợi người dùng
            </h2>
            <p className="text-base sm:text-lg text-[#64748B] mt-2">
              Giải quyết triệt để tình trạng hét giá, tay nghề mập mờ và trễ hẹn
              bằng cơ chế dữ liệu và biên bản ảnh thực tế.
            </p>
          </div>

          {/* 3 Trụ Cột Interactive Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Trụ cột 1: Hồ sơ xác thực & Interactive Radar Chart */}
            <TiltCard className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-7 shadow-xs hover:shadow-card-hover transition-[box-shadow,border-color] duration-300 flex flex-col justify-between card-3d-tilt reveal-elem delay-100">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-9 h-9 rounded-xl bg-[#ECFDF5] text-[#006948] flex items-center justify-center font-bold text-sm shadow-xs">
                    01
                  </span>
                  <h3 className="font-headline-card text-lg font-bold text-[#0F172A]">
                    Hồ sơ xác thực &amp; 5 Tiêu chí
                  </h3>
                </div>
                <p className="text-xs text-[#64748B] mb-5 leading-relaxed">
                  Thẩm định giấy tờ định danh và chứng chỉ nghề nghiệp; đánh giá
                  công khai thang 5.0 sao theo 5 tiêu chí độc lập từ khách hàng
                  đã nghiệm thu.
                </p>

                {/* Dynamic SVG Radar Chart */}
                <div className="relative w-full h-56 flex items-center justify-center bg-[#F1F5F9]/60 rounded-2xl p-3 border border-[#E2E8F0]/80">
                  <svg
                    className="w-full h-full max-w-[210px] drop-shadow-sm"
                    viewBox="0 0 200 200"
                    aria-label="Biểu đồ đánh giá 5 tiêu chí"
                  >
                    <polygon
                      fill="none"
                      points="100,20 176,75 147,165 53,165 24,75"
                      stroke="#CBD5E1"
                      strokeWidth="1"
                    />
                    <polygon
                      fill="none"
                      points="100,45 152,82 132,143 68,143 48,82"
                      stroke="#E2E8F0"
                      strokeWidth="1"
                    />
                    <polygon
                      fill="none"
                      points="100,70 126,89 116,120 84,120 74,89"
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
                      fill="rgba(0, 105, 72, 0.22)"
                      points="100,24 170,78 143,158 59,160 28,78"
                      stroke="#006948"
                      strokeWidth="2.5"
                    />
                    <circle cx="100" cy="24" fill="#006948" r="4" />
                    <circle cx="170" cy="78" fill="#006948" r="4" />
                    <circle cx="143" cy="158" fill="#006948" r="4" />
                    <circle cx="59" cy="160" fill="#006948" r="4" />
                    <circle cx="28" cy="78" fill="#006948" r="4" />
                  </svg>
                </div>

                {/* 5 Tiêu chí thực tế */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-medium">
                  {PILLAR_CRITERIA.map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center justify-between p-2 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0]/60 ${
                        item.fullWidth ? "col-span-2" : ""
                      }`}
                    >
                      <span className="text-[#64748B]">{item.label}</span>
                      <span className="text-[#006948] font-bold font-mono">
                        {item.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TiltCard>

            {/* Trụ cột 2: Interactive Before & After Image Slider */}
            <TiltCard className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-7 shadow-xs hover:shadow-card-hover transition-[box-shadow,border-color] duration-300 flex flex-col justify-between card-3d-tilt reveal-elem delay-200">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-9 h-9 rounded-xl bg-[#ECFDF5] text-[#006948] flex items-center justify-center font-bold text-sm shadow-xs">
                    02
                  </span>
                  <h3 className="font-headline-card text-lg font-bold text-[#0F172A]">
                    Biên bản ảnh Trước &amp; Sau
                  </h3>
                </div>
                <p className="text-xs text-[#64748B] mb-5 leading-relaxed">
                  Kéo thanh trượt để so sánh trực quan ảnh hiện trạng TRƯỚC KHI
                  SỬA và kết quả SAU KHI SỬA được lưu trữ bất biến trên biên bản
                  điện tử.
                </p>

                <BeforeAfterSlider />

                {/* GPS Verification Watermark Box */}
                <div className="mt-4 p-3 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[#64748B]">
                    <span>Tọa độ GPS đối soát:</span>
                    <span className="font-mono font-medium text-[#0F172A]">
                      10.8456° N, 106.7719° E
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#64748B]">
                    <span>Nghiệm thu điện tử:</span>
                    <span className="font-medium text-[#10B981] flex items-center gap-1">
                      <BadgeCheck className="w-3.5 h-3.5" /> Khớp 100% linh kiện
                      đã thay thế
                    </span>
                  </div>
                </div>
              </div>
            </TiltCard>

            {/* Trụ cột 3: Live 3-Minute Slot Hold & Dynamic Distance Fee Calculator */}
            <TiltCard className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-7 shadow-xs hover:shadow-card-hover transition-[box-shadow,border-color] duration-300 flex flex-col justify-between card-3d-tilt reveal-elem delay-300">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-9 h-9 rounded-xl bg-[#ECFDF5] text-[#006948] flex items-center justify-center font-bold text-sm shadow-xs">
                    03
                  </span>
                  <h3 className="font-headline-card text-lg font-bold text-[#0F172A]">
                    Giữ khung giờ 3 phút &amp; Biểu giá
                  </h3>
                </div>
                <p className="text-xs text-[#64748B] mb-5 leading-relaxed">
                  Tạm giữ lịch hẹn 3 phút chống trùng lịch ca làm việc, công
                  khai chính sách cước di chuyển rõ ràng theo khoảng cách thực
                  tế.
                </p>

                {/* Slot Widget Card */}
                <div className="p-4 rounded-2xl bg-[#F1F5F9]/80 border border-[#E2E8F0] space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#64748B]">
                      Khung giờ chọn mẫu:
                    </span>
                    <span className="text-xs font-bold text-[#0F172A] px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] shadow-xs">
                      14:00 - 15:30 Hôm nay
                    </span>
                  </div>

                  {/* Live Countdown Timer */}
                  <div className="p-3 rounded-xl bg-[#ECFDF5] border border-[#006948]/20 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2 text-[#006948]">
                      <Timer className="w-4 h-4 animate-pulse" />
                      <span className="text-xs font-semibold">
                        Tạm giữ khung giờ hẹn:
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[#006948] text-base tabular-nums">
                      {slotMinutesText}:{slotSecondsText}
                    </span>
                  </div>

                  {/* Dynamic Distance Fee Calculator */}
                  <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label
                        htmlFor="calc-dist-slider"
                        className="font-semibold text-[#0F172A]"
                      >
                        Khoảng cách khách - NCC:
                      </label>
                      <span className="font-mono font-bold text-[#006948]">
                        {calcDist <= 3
                          ? `${calcDist.toFixed(1)} km (Miễn phí)`
                          : `${calcDist.toFixed(1)} km`}
                      </span>
                    </div>
                    <input
                      id="calc-dist-slider"
                      type="range"
                      min={1}
                      max={15}
                      step={0.5}
                      value={calcDist}
                      onChange={(e) => setCalcDist(parseFloat(e.target.value))}
                      className="w-full accent-[#006948] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                      <span>Phí di chuyển tính thêm:</span>
                      <strong className="text-[#0F172A] font-mono text-xs tabular-nums">
                        {calcDist <= 3
                          ? "0 đ (≤ 3km)"
                          : `+${formatVndSpaced(calcFee)} (+${calcExtraKm.toFixed(1)}km)`}
                      </strong>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0]/70 text-[11px] text-[#64748B] leading-tight">
                    💡 <strong>Quy chuẩn:</strong> ≤ 3km: Miễn phí (0đ). Khi
                    &gt; 3km: phụ thu cố định +5.000đ/km vào hóa đơn.
                  </div>
                </div>
              </div>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 5. INTERACTIVE INSTANT ESTIMATOR WIDGET    */}
      {/* ========================================== */}
      <section
        id="du-toan"
        className="py-16 bg-[#F1F5F9]/40 border-b border-[#E2E8F0] relative z-10 scroll-mt-16"
      >
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xl p-6 sm:p-10 reveal-elem">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-[#E2E8F0]">
              <div>
                <span className="px-3 py-1 rounded-full bg-[#ECFDF5] text-[#006948] font-semibold text-xs uppercase tracking-wider">
                  CÔNG CỤ DỰ TOÁN
                </span>
                <h3 className="font-headline-section text-2xl sm:text-3xl font-bold text-[#0F172A] mt-2">
                  Dự toán chi phí dịch vụ tức thì
                </h3>
                <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                  Ước lượng chi phí cơ bản theo danh mục dịch vụ và phụ thu
                  khoảng cách GPS thực tế
                </p>
              </div>
              <div className="text-right flex md:flex-col items-center md:items-end justify-between bg-[#006948]/5 p-4 rounded-2xl border border-[#006948]/20">
                <span className="text-xs text-[#64748B] font-medium">
                  Chi phí ước tính:
                </span>
                <span className="font-mono text-2xl sm:text-3xl font-bold text-[#006948] tabular-nums">
                  {formatVndSpaced(estTotal)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              {/* Bước 1: Chọn dịch vụ */}
              <div>
                <label
                  htmlFor="est-service-category"
                  className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-2"
                >
                  1. Dịch vụ cần làm
                </label>
                <select
                  id="est-service-category"
                  value={estCategorySlug}
                  onChange={(e) => setEstCategorySlug(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9]/50 px-3 text-xs sm:text-sm font-medium text-[#0F172A] focus:ring-2 focus:ring-[#006948] focus:border-[#006948] focus:outline-none py-2.5 cursor-pointer"
                >
                  {displayCategories.map((cat) => {
                    const preset = getCategoryPreset(cat.slug);
                    return (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.name} (Từ {Math.round(preset.basePrice / 1000)}k)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Bước 2: Khoảng cách GPS */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="est-dist-range"
                    className="text-xs font-bold text-[#0F172A] uppercase tracking-wider"
                  >
                    2. Khoảng cách GPS
                  </label>
                  <span className="font-mono text-xs font-bold text-[#006948]">
                    {estDist.toFixed(1)} km
                  </span>
                </div>
                <input
                  id="est-dist-range"
                  type="range"
                  min={1}
                  max={15}
                  step={0.5}
                  value={estDist}
                  onChange={(e) => setEstDist(parseFloat(e.target.value))}
                  className="w-full accent-[#006948] h-2 bg-slate-200 rounded-lg cursor-pointer mt-2"
                />
                <div className="flex items-center justify-between text-[11px] text-[#64748B] mt-1">
                  <span>≤ 3km: Miễn phí di chuyển</span>
                  <span>&gt;3km: +5k/km</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#64748B]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                <span>
                  Tính đúng theo giá khởi điểm niêm yết &amp; miễn phí di
                  chuyển ≤ 3km
                </span>
              </div>
              <span className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#ECFDF5] border border-[#006948]/20 text-[#006948] font-semibold text-xs shrink-0">
                Miễn phí ≤ 3km • Phụ thu +5.000đ/km vượt
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 6. SECTION 4: NHÀ CUNG CẤP & DỊCH VỤ MẪU   */}
      {/* ========================================== */}
      <section
        id="nha-cung-cap"
        className="py-20 bg-[#F8FAFC] relative z-10 scroll-mt-16"
      >
        <div className="max-w-7xl mx-auto px-6">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4 reveal-elem">
            <div>
              <h2 className="font-headline-section text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0F172A] mt-3">
                Hồ sơ Nhà cung cấp tiêu biểu đã xác thực quanh bạn
              </h2>
              <p className="text-base text-[#64748B] mt-1 max-w-xl">
                Lý lịch và năng lực đã được kiểm duyệt giấy tờ chứng nhận, đánh
                giá trung thực từ các đơn hàng trước đó.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/map"
                className="inline-flex items-center gap-1.5 text-[#006948] hover:text-[#047857] font-semibold text-sm transition-colors group"
              >
                <span>Xem tất cả trên bản đồ quét</span>
                <MapIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Service & Provider Showcase Grid */}
          {isServicesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-3xl border border-[#E2E8F0] p-6 space-y-5 animate-pulse"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-[#F1F5F9] rounded" />
                      <div className="h-3 w-24 bg-[#F1F5F9] rounded" />
                    </div>
                  </div>
                  <div className="h-5 w-4/5 bg-[#F1F5F9] rounded" />
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#E2E8F0]">
                    <div className="h-8 bg-[#F1F5F9] rounded" />
                    <div className="h-8 bg-[#F1F5F9] rounded" />
                    <div className="h-8 bg-[#F1F5F9] rounded" />
                  </div>
                  <div className="h-10 bg-[#F1F5F9] rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {showcaseItems.map((item: ServiceListItem, idx: number) => {
                const delayClass =
                  (["delay-100", "delay-200", "delay-300"] as const)[idx % 3] ??
                  "delay-100";
                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between reveal-elem ${delayClass}`}
                  >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="relative shrink-0">
                          <Avatar className="w-14 h-14 rounded-2xl border border-[#E2E8F0]">
                            <AvatarImage
                              src={item.provider?.avatar ?? undefined}
                              alt={item.provider?.displayName}
                              className="object-cover"
                            />
                            <AvatarFallback className="rounded-2xl bg-[#ECFDF5] text-[#006948] font-bold text-base">
                              {item.provider?.displayName?.charAt(0) || "T"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#10B981] border-2 border-white flex items-center justify-center text-white text-[9px] font-bold">
                            ✓
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-headline-card text-base font-bold text-[#0F172A] truncate">
                              {item.provider?.displayName}
                            </span>
                            <BadgeCheck className="w-4 h-4 text-[#006948] shrink-0" />
                          </div>
                          <p className="text-xs text-[#64748B] truncate">
                            Chuyên {item.category?.name || "Dịch vụ gia đình"}
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#006948] font-semibold text-[11px] flex items-center gap-1 shadow-xs shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> Đã xác thực
                      </span>
                    </div>

                    {/* Tên dịch vụ & Khu vực */}
                    <div className="mt-4">
                      <h3 className="font-headline-card text-[17px] font-bold text-[#0F172A] leading-snug line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs text-[#64748B] flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#006948] shrink-0" />
                        <span className="truncate">
                          {item.provider?.areaName || "Quận 9, TP. Hồ Chí Minh"}
                        </span>
                      </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="mt-4 grid grid-cols-3 gap-2 py-3 border-y border-[#E2E8F0] text-center">
                      <div>
                        {item.provider.reviewCount > 0 ? (
                          <>
                            <span className="text-sm font-bold text-[#0F172A] flex items-center justify-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-[#D97706] text-[#D97706]" />{" "}
                              {item.provider.ratingAverage.toFixed(1)}
                            </span>
                            <span className="block text-[11px] text-[#64748B]">
                              {item.provider.reviewCount} đánh giá
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs font-semibold text-[#64748B] flex items-center justify-center gap-1">
                              <Star className="w-3.5 h-3.5 text-[#94A3B8]" /> Mới
                            </span>
                            <span className="block text-[11px] text-[#64748B]">
                              Chưa có đánh giá
                            </span>
                          </>
                        )}
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-[#0F172A] font-mono">
                          {item.durationMinutes} phút
                        </span>
                        <span className="block text-[11px] text-[#64748B]">
                          Thời lượng
                        </span>
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-[#006948] font-mono">
                          {item.provider?.experienceYears || 0} năm
                        </span>
                        <span className="block text-[11px] text-[#64748B]">
                          Kinh nghiệm
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-[#64748B]">
                      <span>
                        Giá:{" "}
                        <strong className="text-[#0F172A] font-bold tabular-nums">
                          {formatCurrency(item.basePrice)}
                        </strong>{" "}
                        <span className="text-[11px]">
                          / {getPriceUnitLabel(item.priceUnit)}
                        </span>
                      </span>
                      {item.provider?.isOnline !== false ? (
                        <span className="text-[#10B981] font-medium flex items-center gap-1.5 shrink-0">
                          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />{" "}
                          <span>Sẵn sàng nhận việc</span>
                        </span>
                      ) : (
                        <span className="text-[#64748B] font-medium flex items-center gap-1.5 shrink-0">
                          <span className="w-2 h-2 rounded-full bg-[#94A3B8]" />{" "}
                          <span>Tạm nghỉ</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Nút xem chi tiết dịch vụ tại chỗ */}
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(item)}
                      className="w-full py-2.5 px-4 rounded-xl border border-[#006948] text-[#006948] hover:bg-[#006948] hover:text-white font-semibold text-xs transition-colors flex items-center justify-center shadow-xs cursor-pointer"
                    >
                      Chi tiết dịch vụ
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ========================================== */}
      {/* 7. SECTION 5: QUY TRÌNH 3 BƯỚC ĐẶT LỊCH    */}
      {/* ========================================== */}
      <section
        id="quy-trinh"
        className="py-20 bg-white/90 backdrop-blur-md relative z-10 scroll-mt-16"
      >
        <div className="max-w-7xl mx-auto px-6">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-16 reveal-elem">
            <h2 className="font-headline-section text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0F172A] mt-3">
              Quy trình 3 bước đặt lịch nhanh chóng &amp; tin cậy
            </h2>
            <p className="text-base sm:text-lg text-[#64748B] mt-2">
              Chủ động thời gian, biết trước chi phí và nghiệm thu có căn cứ
              trước khi thanh toán.
            </p>
          </div>

          {/* 3-Step Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {BOOKING_STEPS.map((item, idx) => {
              const FooterIcon = item.footerIcon;
              const delayClass =
                (["delay-100", "delay-200", "delay-300"] as const)[idx % 3] ??
                "delay-100";
              return (
                <div
                  key={item.step}
                  className={`relative bg-white rounded-3xl border border-[#E2E8F0] p-7 shadow-xs hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between reveal-elem ${delayClass}`}
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-[#006948] text-white flex items-center justify-center font-bold text-lg mb-6 shadow-glow">
                      {item.step}
                    </div>
                    <h3 className="font-headline-card text-lg font-bold text-[#0F172A]">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[#64748B] mt-2.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center gap-2 text-xs text-[#006948] font-medium">
                    <FooterIcon className="w-4 h-4 shrink-0" />
                    <span>{item.footerText}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 8. SECTION 6: DUAL CTA CHỐT ĐẶT LỊCH       */}
      {/* ========================================== */}
      <section
        id="bat-dau"
        className="py-16 sm:py-20 bg-white/85 backdrop-blur-md border-t border-[#E2E8F0] relative z-10 scroll-mt-16"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 reveal-elem">
            {/* Panel trái: Customer CTA */}
            <div className="bg-gradient-to-br from-[#006948] to-[#064e3b] rounded-3xl p-8 lg:p-12 text-white flex flex-col justify-between shadow-xl relative overflow-hidden hover:-translate-y-0.5 transition-all duration-200">
              <div className="absolute -right-10 -bottom-10 opacity-15 pointer-events-none">
                <Wrench className="w-56 h-56" />
              </div>
              <div className="relative z-10">
                <span className="px-3.5 py-1 rounded-full bg-white/20 text-white font-semibold text-xs uppercase tracking-wider backdrop-blur-sm">
                  Dành Cho Khách Hàng
                </span>
                <h3 className="font-headline-section text-2xl lg:text-3xl font-bold mt-4 leading-tight">
                  Cần đặt dịch vụ dân sinh ngay hôm nay?
                </h3>
                <p className="text-sm text-white/90 mt-2 max-w-md leading-relaxed">
                  Kết nối nhanh chóng với mạng lưới nhà cung cấp đã xác thực,
                  công khai giá cả và có đối soát chất lượng quanh khu vực của
                  bạn.
                </p>
                <ul className="mt-6 space-y-2.5 text-xs font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#F59E0B] shrink-0" />
                    <span>
                      Quét tìm nhà cung cấp gần nhất theo tọa độ GPS thực tế
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#F59E0B] shrink-0" />
                    <span>
                      Miễn phí di chuyển trong 3km đầu, niêm yết giá cơ bản rõ
                      ràng
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#F59E0B] shrink-0" />
                    <span>
                      Đối chiếu hình ảnh trước và sau khi thực hiện có căn cứ
                    </span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 relative z-10">
                <Link
                  href="/map"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-[#006948] hover:bg-[#F1F5F9] font-bold text-xs shadow-lg transition active:scale-95 group"
                >
                  <LocateFixed className="w-4 h-4 transition-transform group-hover:scale-110" />
                  <span>Tìm nhà cung cấp quanh đây</span>
                </Link>
              </div>
            </div>

            {/* Panel phải: Provider Partner CTA */}
            <div className="bg-white rounded-3xl border border-[#E2E8F0] p-8 lg:p-12 text-[#0F172A] flex flex-col justify-between shadow-lg relative overflow-hidden hover:-translate-y-0.5 transition-all duration-200">
              <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
                <Handshake className="w-56 h-56" />
              </div>
              <div className="relative z-10">
                <span className="px-3.5 py-1 rounded-full bg-[#ECFDF5] text-[#006948] font-semibold text-xs uppercase tracking-wider">
                  Gia Nhập Đối Tác
                </span>
                <h3 className="font-headline-section text-2xl lg:text-3xl font-bold mt-4 leading-tight">
                  Bạn muốn mở rộng khách hàng và tăng thu nhập?
                </h3>
                <p className="text-sm text-[#64748B] mt-2 max-w-md leading-relaxed">
                  Đăng ký hồ sơ nhà cung cấp trên Servigo để nhận lịch hẹn quanh
                  bán kính hoạt động của bạn với quy trình quản lý rõ ràng.
                </p>
                <ul className="mt-6 space-y-2.5 text-xs font-medium text-[#64748B]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#006948] shrink-0" />
                    <span>
                      Nhận lịch hẹn chủ động theo khung giờ rảnh tự thiết lập
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#006948] shrink-0" />
                    <span>
                      Bán kính phục vụ linh hoạt 2km – 20km từ vị trí làm việc
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#006948] shrink-0" />
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
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#006948] text-white hover:bg-[#047857] font-bold text-xs shadow-glow transition active:scale-95 group"
                >
                  <Handshake className="w-4 h-4 transition-transform group-hover:scale-110" />
                  <span>Trở thành nhà cung cấp</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 9. SECTION 7: CÂU HỎI THƯỜNG GẶP (FAQ)     */}
      {/* ========================================== */}
      <section
        id="faq"
        className="py-20 bg-[#F8FAFC] border-t border-[#E2E8F0] relative z-10 scroll-mt-16"
      >
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10 reveal-elem">
            <h2 className="font-headline-section text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0F172A]">
              Câu hỏi thường gặp
            </h2>
            <p className="text-sm sm:text-base text-[#64748B] mt-2">
              Thông tin rõ ràng về cách tính phí di chuyển, quy ước đơn giá, giữ
              chỗ 3 phút và quy trình đối tác trên Servigo.
            </p>
          </div>

          {/* FAQ Filter Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8 reveal-elem">
            {FAQ_TABS.map((tab) => {
              const active = faqGroup === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFaqGroup(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    active
                      ? "bg-[#006948] text-white shadow-xs"
                      : "bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Smooth CSS Grid Accordion List */}
          <div className="space-y-3 reveal-elem delay-100">
            {faqItems.map((item, idx) => {
              const matches = faqGroup === "all" || item.group === faqGroup;
              if (!matches) return null;
              const isOpen = openFaqIdx === idx;
              return (
                <div
                  key={item.question}
                  data-open={isOpen ? "true" : "false"}
                  className="faq-item bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-[#F1F5F9]/40 transition cursor-pointer"
                  >
                    <span className="text-sm sm:text-base font-bold text-[#0F172A]">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`faq-chevron w-5 h-5 shrink-0 ${
                        isOpen ? "text-[#006948]" : "text-[#64748B]"
                      }`}
                    />
                  </button>
                  <div className="faq-body">
                    <div className="faq-inner">
                      <div className="px-5 pb-4 pt-2 text-xs sm:text-sm text-[#64748B] leading-relaxed border-t border-[#E2E8F0]/60">
                        {item.answer}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 10. FOOTER (Chỉ chứa mục & liên kết thật)  */}
      {/* ========================================== */}
      <footer className="bg-white border-t border-[#E2E8F0] relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-12 lg:py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
            {/* Cột 1: Servigo */}
            <div className="lg:col-span-5 space-y-4">
              <a
                href="#top"
                className="inline-flex items-center gap-2.5 group"
              >
                <div className="w-9 h-9 rounded-xl bg-[#006948] flex items-center justify-center text-white shadow-xs transition-transform duration-200 group-hover:scale-105">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex items-baseline tracking-tight">
                  <span className="font-headline-card text-[22px] font-bold text-[#0F172A]">
                    Servi
                  </span>
                  <span className="font-headline-card text-[22px] font-bold text-[#006948]">
                    go
                  </span>
                </div>
              </a>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed max-w-sm">
                Nền tảng kết nối khách hàng với nhà cung cấp dịch vụ gia đình
                theo tọa độ GPS thực tế và báo giá công khai.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-medium text-[#0F172A]">
                <MapPin className="w-4 h-4 text-[#006948]" />
                <span>Khu vực phục vụ: Quận 9, TP. Hồ Chí Minh</span>
              </div>
            </div>

            {/* Cột 2: Khám phá */}
            <div className="lg:col-span-2">
              <h3 className="font-sans-ui text-xs font-bold uppercase tracking-wider text-[#0F172A] mb-4">
                Khám phá
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#64748B]">
                <li>
                  <Link
                    href="/map"
                    className="hover:text-[#006948] transition-colors"
                  >
                    Bản đồ dịch vụ
                  </Link>
                </li>
                <li>
                  <a
                    href="#quy-trinh"
                    className="hover:text-[#006948] transition-colors"
                  >
                    Quy trình đặt lịch
                  </a>
                </li>
                <li>
                  <a
                    href="#nha-cung-cap"
                    className="hover:text-[#006948] transition-colors"
                  >
                    Nhà cung cấp
                  </a>
                </li>
                <li>
                  <a
                    href="#faq"
                    className="hover:text-[#006948] transition-colors"
                  >
                    Câu hỏi thường gặp
                  </a>
                </li>
              </ul>
            </div>

            {/* Cột 3: Lĩnh vực */}
            <div className="lg:col-span-2">
              <h3 className="font-sans-ui text-xs font-bold uppercase tracking-wider text-[#0F172A] mb-4">
                Lĩnh vực
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#64748B]">
                <li>
                  <a
                    href="#danh-muc"
                    className="hover:text-[#006948] transition-colors"
                  >
                    Sửa điện lạnh
                  </a>
                </li>
                <li>
                  <a
                    href="#danh-muc"
                    className="hover:text-[#006948] transition-colors"
                  >
                    Sửa điện nước
                  </a>
                </li>
                <li>
                  <a
                    href="#danh-muc"
                    className="hover:text-[#006948] transition-colors"
                  >
                    Sửa khóa &amp; Cửa cuốn
                  </a>
                </li>
                <li>
                  <a
                    href="#danh-muc"
                    className="hover:text-[#006948] transition-colors"
                  >
                    Vệ sinh nhà cửa
                  </a>
                </li>
              </ul>
            </div>

            {/* Cột 4: Tài khoản */}
            <div className="lg:col-span-3">
              <h3 className="font-sans-ui text-xs font-bold uppercase tracking-wider text-[#0F172A] mb-4">
                Tài khoản
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#64748B]">
                <li>
                  <Link
                    href="/auth/signin"
                    className="hover:text-[#006948] transition-colors"
                  >
                    Đăng nhập
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/signup"
                    className="hover:text-[#006948] transition-colors"
                  >
                    Đăng ký khách hàng
                  </Link>
                </li>
                <li>
                  <Link
                    href="/provider/register"
                    className="hover:text-[#006948] transition-colors"
                  >
                    Trở thành nhà cung cấp
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Dòng cuối */}
          <div className="mt-10 pt-6 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748B]">
            <p>© 2026 Servigo</p>
            <a
              href="#top"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] hover:border-[#006948]/50 hover:text-[#006948] font-semibold transition-colors"
            >
              <span>Lên đầu trang</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </footer>

      {/* Modal Xem chi tiết dịch vụ */}
      <ServiceDetailDialog
        serviceId={detailServiceId}
        fallbackService={detailFallbackService}
        hideBookingAction
        open={detailOpen}
        onClose={handleCloseDetail}
      />
    </div>
  );
}
