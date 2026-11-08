"use client";

import { useCurrentUser } from "@/hooks/use-auth";
import {
  useCheckServiceArea,
  useMyProviderProfile,
  useRegisterProvider,
} from "@/hooks/use-provider";
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  FileCheck2,
  FileText,
  Handshake,
  HelpCircle,
  Home,
  ImageIcon,
  Info,
  Loader2,
  LocateFixed,
  MapPin,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  Wrench,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

// Import dynamic map component with SSR disabled
const ServiceAreaMapPicker = dynamic(
  () => import("./service-area-map-picker"),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 w-full animate-pulse rounded-xl bg-muted" />
    ),
  },
);

export const STANDARD_CATEGORIES = [
  { id: "cat-dien-lanh", name: "1. Điện lạnh (Điều hòa, máy giặt, tủ lạnh)" },
  { id: "cat-dien-nuoc", name: "2. Điện nước (Ống nước, máy bơm, chập điện)" },
  { id: "cat-khoa-cua", name: "3. Sửa khóa & Cửa (Smart lock, cửa cuốn, bản lề)" },
  { id: "cat-bep-giadung", name: "4. Thiết bị bếp & Gia dụng (Bếp từ, lò vi sóng)" },
  { id: "cat-chieu-sang", name: "5. Điện dân dụng & Chiếu sáng (Đèn LED, aptomat)" },
  { id: "cat-it-mang", name: "6. Máy tính & Mạng (PC, Wifi, Camera an ninh)" },
  { id: "cat-thong-tac", name: "7. Thông tắc & Chống thấm (Cống nghẹt, chống thấm)" },
  { id: "cat-ve-sinh", name: "8. Vệ sinh công nghiệp (Sofa, nệm, văn phòng)" },
  { id: "cat-khac", name: "9. Khác (Tự nhập ngành nghề...)" },
];

export interface UploadedDoc {
  name: string;
  url: string;
  size?: string;
  type?: string;
}

export function PartnerRegisterView() {
  const { data: user } = useCurrentUser();
  const { data: providerData, isLoading } = useMyProviderProfile();
  const registerMutation = useRegisterProvider();
  const checkAreaMutation = useCheckServiceArea();

  const [isEditingAfterReject, setIsEditingAfterReject] = useState(false);

  // Form states - để trống hoàn toàn cho khách hàng tự nhập
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [experienceYears, setExperienceYears] = useState<number | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [bio, setBio] = useState("");

  // Initial service info
  const [serviceTitle, setServiceTitle] = useState("");
  const [basePrice, setBasePrice] = useState<number | "">("");
  const [priceUnit, setPriceUnit] = useState("FIXED");
  const [durationMinutes, setDurationMinutes] = useState<number | "">(60);

  // 4 KYC documents - để trống cho khách hàng tự tải lên
  const [doc1, setDoc1] = useState<UploadedDoc | null>(null);
  const [doc2, setDoc2] = useState<UploadedDoc | null>(null);
  const [doc3, setDoc3] = useState<UploadedDoc | null>(null);
  const [doc4, setDoc4] = useState<UploadedDoc | null>(null);

  // Service Area states
  const [areaName, setAreaName] = useState("");
  const [centerLat, setCenterLat] = useState(10.776889);
  const [centerLng, setCenterLng] = useState(106.700897);
  const [radiusKm, setRadiusKm] = useState(5.0);
  const [isActive, setIsActive] = useState(true);

  // Haversine check result
  const [checkResult, setCheckResult] = useState<{
    tested: boolean;
    eligible?: boolean;
    message?: string;
  }>({ tested: false });

  // Geolocation
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Trình duyệt không hỗ trợ định vị");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setCenterLat(lat);
        setCenterLng(lng);
        toast.success(`Đã lấy vị trí hiện tại: ${lat}, ${lng}`);
      },
      () => toast.error("Không thể lấy vị trí hiện tại của bạn"),
    );
  };

  // Helper upload file (Data URL preview)
  const handleFileChange = (
    file: File | undefined,
    setDoc: (doc: UploadedDoc | null) => void,
  ) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Dung lượng tệp vượt quá giới hạn 10MB");
      return;
    }

    const sizeFormatted =
      file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(0)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    const reader = new FileReader();
    reader.onloadend = () => {
      setDoc({
        name: file.name,
        url: reader.result as string,
        size: sizeFormatted,
        type: file.type,
      });
      toast.success(`Đã chọn: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  // Check sample addresses
  const handleCheckSample = (lat: number, lng: number, sampleLabel: string) => {
    checkAreaMutation.mutate(
      { latitude: lat, longitude: lng },
      {
        onSuccess: (res) => {
          setCheckResult({
            tested: true,
            eligible: res.eligible,
            message: `${sampleLabel} → ${res.message}`,
          });
        },
        onError: () => {
          // Local fallback check
          const toRad = (v: number) => (v * Math.PI) / 180;
          const R = 6371;
          const dLat = toRad(lat - centerLat);
          const dLon = toRad(lng - centerLng);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(centerLat)) *
              Math.cos(toRad(lat)) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const isEligible = d <= radiusKm;
          setCheckResult({
            tested: true,
            eligible: isEligible,
            message: `${sampleLabel} → Cách tâm ${d.toFixed(2)} km: ${
              isEligible
                ? "HỢP LỆ (trong vùng phục vụ)"
                : "NGOÀI VÙNG PHỤC VỤ"
            }`,
          });
        },
      },
    );
  };

  // Submit Registration
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      toast.error("Vui lòng nhập tên hiển thị Nhà cung cấp");
      return;
    }

    const phoneClean = phone.trim();
    if (!phoneClean) {
      toast.error("Vui lòng nhập số điện thoại nhận việc");
      return;
    }

    if (!/^[0-9]{10,11}$/.test(phoneClean)) {
      toast.error("Số điện thoại không hợp lệ (phải từ 10 - 11 chữ số)");
      return;
    }

    if (experienceYears === "" || Number(experienceYears) < 0) {
      toast.error("Vui lòng nhập số năm kinh nghiệm hợp lệ");
      return;
    }

    if (!categoryId) {
      toast.error("Vui lòng chọn ngành nghề dịch vụ chính");
      return;
    }

    if (categoryId === "cat-khac" && !customCategory.trim()) {
      toast.error("Vui lòng nhập ngành nghề dịch vụ khác của bạn");
      return;
    }

    if (!doc1 || !doc2 || !doc3 || !doc4) {
      toast.error(
        "Vui lòng tải lên đầy đủ 4 tài liệu xác minh (CCCD 2 mặt, chứng chỉ nghề, ảnh chân dung / đồ nghề)",
      );
      return;
    }

    const finalCategory =
      categoryId === "cat-khac"
        ? customCategory.trim()
        : STANDARD_CATEGORIES.find((c) => c.id === categoryId)?.name ||
          categoryId;

    registerMutation.mutate({
      displayName: displayName.trim(),
      phone: phoneClean,
      experienceYears: Number(experienceYears),
      categoryId: finalCategory,
      bio: bio.trim(),
      documents: [
        { documentType: "ID_CARD_FRONT", fileUrl: doc1.url },
        { documentType: "ID_CARD_BACK", fileUrl: doc2.url },
        { documentType: "CERTIFICATE", fileUrl: doc3.url },
        { documentType: "TOOLKIT_PHOTO", fileUrl: doc4.url },
      ],
      serviceArea: {
        areaName: areaName.trim() || "Vùng phục vụ chính",
        centerLatitude: centerLat,
        centerLongitude: centerLng,
        radiusKm,
        isActive,
      },
    });
    setIsEditingAfterReject(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-32 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Verification status logic
  const actualStatus = providerData?.status ?? "UNREGISTERED";
  const profile = providerData?.profile;

  // View state determination:
  const showPendingView = actualStatus === "PENDING" && !isEditingAfterReject;
  const showRejectedView = actualStatus === "REJECTED" && !isEditingAfterReject;
  const showApprovedView = actualStatus === "APPROVED";

  const uploadedCount = [doc1, doc2, doc3, doc4].filter(Boolean).length;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 font-sans">
      {/* Breadcrumb & Tiêu đề */}
      <div className="mb-6">
        <div className="mb-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">Hồ sơ đối tác</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Đăng Ký Nhà Cung Cấp
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cung cấp thông tin chuyên môn, tài liệu xác minh danh tính và thiết lập vùng nhận dịch vụ.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* VIEW STATE 2: PENDING (Chờ duyệt)                                         */}
      {/* ========================================================================= */}
      {showPendingView && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-amber-200 bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600">
                <Clock className="h-7 w-7 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">
                    Hồ sơ đăng ký đang chờ Admin xét duyệt
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    <span className="h-1.5 w-1.5 animate-ping rounded-full bg-amber-500" />
                    Đang chờ duyệt
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Hồ sơ của bạn đã được tiếp nhận vào hàng đợi kiểm duyệt của Ban Quản trị Servigo. Quá trình thẩm định thông tin và tài liệu thường diễn ra trong vòng{" "}
                  <strong className="text-foreground">24 – 48 giờ làm việc</strong>. Bạn sẽ nhận được thông báo ngay khi hồ sơ được phê duyệt.
                </p>
              </div>
            </div>

            {/* Summary card */}
            <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-muted/40 p-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Tên hiển thị Nhà cung cấp
                </span>
                <p className="mt-1 font-semibold text-foreground">
                  {profile?.displayName || "Chưa cập nhật"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Số điện thoại nhận việc
                </span>
                <p className="mt-1 font-semibold tabular-nums text-foreground">
                  {profile?.phone || "Chưa cập nhật"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Kinh nghiệm làm việc
                </span>
                <p className="mt-1 font-semibold text-foreground">
                  {profile?.experienceYears ?? 0} năm kinh nghiệm
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Vùng phục vụ ban đầu
                </span>
                <p className="mt-1 font-semibold text-foreground">
                  Bán kính {profile?.serviceAreas?.[0]?.radiusKm ?? 5} km
                </p>
              </div>
            </div>

            {/* 4 KYC documents status */}
            <div className="mt-6">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tài liệu đang chờ thẩm định (4/4 tài liệu)
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { title: "CCCD / CMND Mặt trước", type: "ID_CARD_FRONT" },
                  { title: "CCCD / CMND Mặt sau", type: "ID_CARD_BACK" },
                  { title: "Chứng chỉ nghề / Bằng cấp kỹ thuật", type: "CERTIFICATE" },
                  { title: "Ảnh chụp chân dung & Đồ nghề tác nghiệp", type: "TOOLKIT_PHOTO" },
                ].map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileCheck2 className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        {doc.title}
                      </span>
                    </div>
                    <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      Chờ duyệt
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
              <p className="text-xs text-muted-foreground">
                Mã hồ sơ:{" "}
                <span className="font-mono text-foreground">
                  #{profile?.id?.slice(0, 8) ?? "SG-KYC-PENDING"}
                </span>{" "}
                • Đã gửi hồ sơ thành công
              </p>
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  Về Trang chủ
                </Link>
                <Link
                  href="/account"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span>Về Trang tài khoản</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW STATE 3: REJECTED (Bị từ chối)                                       */}
      {/* ========================================================================= */}
      {showRejectedView && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-destructive/30 bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 text-destructive">
                <XCircle className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">
                    Hồ sơ đăng ký Nhà cung cấp đã bị từ chối
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                    Bị từ chối
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Ban Quản trị Servigo đã xem xét hồ sơ của bạn nhưng chưa thể phê duyệt do một số thông tin hoặc tài liệu chưa đạt yêu cầu theo quy chuẩn.
                </p>
              </div>
            </div>

            {/* Admin rejection reason */}
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:p-5">
              <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>Lý do từ chối từ Ban Quản trị:</span>
              </div>
              <p className="text-sm font-medium leading-relaxed text-foreground">
                "{profile?.rejectionReason || "Ảnh chụp giấy tờ chưa đủ độ nét, vui lòng cập nhật lại tài liệu và gửi lại hồ sơ để được phê duyệt."}"
              </p>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Người thẩm định: <strong>{profile?.approvedBy || "Ban Quản trị Servigo"}</strong>
                </span>
                <span>•</span>
                <span>
                  Thời gian: {profile?.approvedAt ? new Date(profile.approvedAt).toLocaleString("vi-VN") : "Gần đây"}
                </span>
              </div>
            </div>

            {/* Reopen editing action */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
              <Link
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Quay lại trang chủ khách hàng
              </Link>
              <button
                type="button"
                onClick={() => setIsEditingAfterReject(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-[0.99]"
              >
                <Edit3 className="h-4 w-4" />
                <span>Chỉnh sửa &amp; Gửi lại hồ sơ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW STATE 4: APPROVED (Đã được duyệt)                                    */}
      {/* ========================================================================= */}
      {showApprovedView && (
        <div className="rounded-2xl border border-emerald-200 bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <BadgeCheck className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-foreground">
            Chúc mừng! Bạn đã là Nhà cung cấp chính thức
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground leading-relaxed">
            Hồ sơ đối tác của bạn đã được Ban Quản trị phê duyệt. Tài khoản của bạn hiện đã được cấp quyền Nhà cung cấp trên sàn Servigo.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/account"
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              Hồ sơ của tôi
            </Link>
            <Link
              href="/provider"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              Bắt đầu nhận dịch vụ
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW STATE 1: UNREGISTERED OR RE-EDITING FORM                             */}
      {/* ========================================================================= */}
      {!showPendingView && !showRejectedView && !showApprovedView && (
        <div className="space-y-8">
          {/* Linked Customer Account Banner */}
          <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 text-primary font-bold text-lg shadow-2xs">
                  {user?.name ? user.name[0].toUpperCase() : "K"}
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-white ring-2 ring-white">
                  <User className="h-3 w-3" />
                </span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold text-foreground">
                    {user?.name || "Khách hàng"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {user?.email || "user@servigo.test"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Hồ sơ Nhà cung cấp sẽ được liên kết trực tiếp với tài khoản này. Sau khi Admin thẩm định và phê duyệt, vai trò sẽ được nâng thành{" "}
                  <strong className="text-primary font-semibold">Nhà cung cấp</strong>.
                </p>
              </div>
            </div>
          </section>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* ------------------------------------------------------------- */}
            {/* SECTION 1: THÔNG TIN NHÀ CUNG CẤP                             */}
            {/* ------------------------------------------------------------- */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex items-center justify-between border-b border-border pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    1
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      Thông Tin Nhà Cung Cấp
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Tên thương hiệu hoạt động, kinh nghiệm làm việc và ngành nghề chính
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  Bắt buộc
                </span>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-foreground">
                      Tên hiển thị Nhà cung cấp <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="VD: Điện Lạnh Hoàng Nam"
                      className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Tên này sẽ hiển thị công khai trên danh bạ và trang chi tiết dịch vụ.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-foreground">
                      Số điện thoại nhận việc <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={11}
                      required
                      value={phone}
                      onChange={(e) => {
                        const numericOnly = e.target.value.replace(/\D/g, "");
                        setPhone(numericOnly);
                      }}
                      placeholder="VD: 0912345882"
                      className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground tabular-nums"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Chỉ nhập chữ số liên hệ trực tiếp khi khách hàng đặt lịch dịch vụ.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-foreground">
                      Số năm kinh nghiệm <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={50}
                      value={experienceYears}
                      onChange={(e) =>
                        setExperienceYears(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      placeholder="VD: 5"
                      className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Số năm kinh nghiệm làm nghề thực tế (tối thiểu 0 năm).
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-foreground">
                      Ngành nghề dịch vụ chính <span className="text-destructive">*</span>
                    </label>
                    <select
                      required
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                      <option value="">-- Chọn ngành nghề dịch vụ --</option>
                      {STANDARD_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>

                    {categoryId === "cat-khac" && (
                      <div className="mt-2.5 animate-in fade-in zoom-in-95">
                        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                          Nhập ngành nghề khác của bạn <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          placeholder="VD: Sửa xe tận nơi, Giặt rèm nệm sofa, Cơ khí sắt..."
                          className="h-11 w-full rounded-xl border border-primary/40 bg-background px-3.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                        />
                      </div>
                    )}

                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {categoryId === "cat-khac"
                        ? "Vui lòng ghi rõ tên ngành nghề dịch vụ bạn cung cấp."
                        : "Chọn 1 trong các danh mục tiêu chuẩn hoặc chọn Khác để tự nhập."}
                    </p>
                  </div>
                </div>

                {/* Thiết lập dịch vụ khởi tạo */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                    <Wrench className="h-4 w-4 text-primary" />
                    <span>Thiết lập dịch vụ khởi tạo khi được phê duyệt</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                    <div className="sm:col-span-5">
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                        Tên dịch vụ ban đầu <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={serviceTitle}
                        onChange={(e) => setServiceTitle(e.target.value)}
                        placeholder="VD: Bảo trì & Vệ sinh điều hòa dân dụng"
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                        Giá cơ sở (VNĐ) <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        step={10000}
                        value={basePrice}
                        onChange={(e) =>
                          setBasePrice(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        placeholder="VD: 250000"
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                        Đơn vị tính <span className="text-destructive">*</span>
                      </label>
                      <select
                        value={priceUnit}
                        onChange={(e) => setPriceUnit(e.target.value)}
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none cursor-pointer"
                      >
                        <option value="FIXED">Trọn gói</option>
                        <option value="HOURLY">Theo giờ</option>
                        <option value="FROM">Từ mức giá</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                        Thời lượng (phút) <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={15}
                        step={15}
                        value={durationMinutes}
                        onChange={(e) =>
                          setDurationMinutes(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        placeholder="VD: 60"
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-foreground">
                    Giới thiệu tay nghề &amp; Kinh nghiệm làm việc
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Mô tả kỹ năng, cam kết chất lượng, các dòng máy hoặc thiết bị sở trường..."
                    className="w-full resize-none rounded-xl border border-border bg-background p-3.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </section>

            {/* ------------------------------------------------------------- */}
            {/* SECTION 2: TÀI LIỆU XÁC MINH KYC                             */}
            {/* ------------------------------------------------------------- */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex items-center justify-between border-b border-border pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    2
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      Tài Liệu Xác Minh (KYC)
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Tải lên tệp ảnh hoặc PDF rõ nét, dung lượng tối đa 10MB mỗi tệp
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold border ${
                    uploadedCount === 4
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-primary/20 bg-primary/10 text-primary"
                  }`}
                >
                  {uploadedCount} / 4 tài liệu đã chọn
                </span>
              </div>

              <div className="space-y-4">
                {[
                  {
                    title: "1. CCCD / CMND Mặt trước",
                    type: "ID_CARD_FRONT",
                    doc: doc1,
                    setDoc: setDoc1,
                  },
                  {
                    title: "2. CCCD / CMND Mặt sau",
                    type: "ID_CARD_BACK",
                    doc: doc2,
                    setDoc: setDoc2,
                  },
                  {
                    title: "3. Chứng chỉ nghề / Bằng cấp kỹ thuật",
                    type: "CERTIFICATE",
                    doc: doc3,
                    setDoc: setDoc3,
                  },
                  {
                    title: "4. Ảnh chụp chân dung & Bộ đồ nghề tác nghiệp",
                    type: "TOOLKIT_PHOTO",
                    doc: doc4,
                    setDoc: setDoc4,
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-start justify-between gap-4 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary overflow-hidden">
                        {item.doc?.url && item.doc.type?.startsWith("image/") ? (
                          <img
                            src={item.doc.url}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <FileText className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            {item.title}
                          </span>
                          <span className="text-destructive font-bold">*</span>
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                            {item.type}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.doc ? (
                            <span className="font-medium text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>{item.doc.name}</span>
                              {item.doc.size && (
                                <span className="text-muted-foreground">
                                  ({item.doc.size})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">
                              Chưa có tệp nào được chọn (JPG, PNG, PDF tối đa 10MB)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {item.doc && (
                        <button
                          type="button"
                          onClick={() => item.setDoc(null)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="Xóa tệp"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs">
                        <Upload className="h-3.5 w-3.5 text-primary" />
                        <span>{item.doc ? "Chọn tệp khác" : "Chọn tệp"}</span>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            handleFileChange(file, item.setDoc);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ------------------------------------------------------------- */}
            {/* SECTION 3: THIẾT LẬP KHU VỰC PHỤC VỤ (LEAFLET MAP)            */}
            {/* ------------------------------------------------------------- */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex items-center justify-between border-b border-border pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    3
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      Thiết Lập Khu Vực Phục Vụ
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Cấu hình tọa độ tâm và bán kính hoạt động từ 2.0 km đến 20.0 km
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  Leaflet Map
                </span>
              </div>

              {/* Map container */}
              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>Bấm trên bản đồ hoặc kéo marker để thay đổi tọa độ tâm</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer"
                  >
                    <LocateFixed className="h-4 w-4" />
                    <span>Lấy vị trí hiện tại</span>
                  </button>
                </div>

                <ServiceAreaMapPicker
                  latitude={centerLat}
                  longitude={centerLng}
                  radiusKm={radiusKm}
                  onChangeCenter={(lat, lng) => {
                    setCenterLat(lat);
                    setCenterLng(lng);
                  }}
                />
              </div>

              {/* Inputs & Slider */}
              <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">
                      Ghi chú / Tên gợi nhớ vùng <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={areaName}
                      onChange={(e) => setAreaName(e.target.value)}
                      placeholder="VD: Khu vực Quận 1 & lân cận"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">
                      Tọa độ Vĩ độ (Latitude) <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="number"
                      step={0.000001}
                      value={centerLat}
                      onChange={(e) => setCenterLat(parseFloat(e.target.value) || 0)}
                      className="h-10 w-full font-mono rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">
                      Tọa độ Kinh độ (Longitude) <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="number"
                      step={0.000001}
                      value={centerLng}
                      onChange={(e) => setCenterLng(parseFloat(e.target.value) || 0)}
                      className="h-10 w-full font-mono rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Radius Slider */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Bán kính phục vụ:{" "}
                      <span className="font-mono text-primary font-bold text-sm">
                        {radiusKm.toFixed(1)} km
                      </span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Giới hạn tiêu chuẩn: 2.0 km – 20.0 km
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                      2 km
                    </span>
                    <input
                      type="range"
                      min={2}
                      max={20}
                      step={0.5}
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
                    />
                    <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                      20 km
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 border-t border-border pt-3">
                  <input
                    type="checkbox"
                    id="area-active-checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                  />
                  <label
                    htmlFor="area-active-checkbox"
                    className="text-xs font-semibold text-foreground cursor-pointer"
                  >
                    Kích hoạt vùng phục vụ này ngay khi hồ sơ được duyệt
                  </label>
                </div>
              </div>

              {/* Haversine distance test tool - Đã bỏ badge POST /provider/service-areas/check */}
              <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Kiểm tra địa chỉ khách hàng nằm trong vùng phục vụ (Haversine Formula)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Công cụ tính khoảng cách thực tế từ tọa độ khách hàng đến tâm vùng phục vụ. Bấm thử các vị trí mẫu để kiểm tra tính hợp lệ:
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      handleCheckSample(
                        10.785,
                        106.695,
                        "Vị trí 1: Nguyễn Thị Minh Khai, Q.1 (~1.1 km)",
                      )
                    }
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary shadow-2xs transition-colors cursor-pointer"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Vị trí 1: Quận 1 (~1.1 km - Hợp lệ)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleCheckSample(
                        10.885,
                        106.595,
                        "Vị trí 2: Thị trấn Hóc Môn (~16.8 km)",
                      )
                    }
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-destructive shadow-2xs transition-colors cursor-pointer"
                  >
                    <span className="h-2 w-2 rounded-full bg-destructive" />
                    <span>Vị trí 2: Hóc Môn (~16.8 km - Ngoài vùng)</span>
                  </button>
                </div>

                {checkResult.tested && (
                  <div
                    className={`mt-2 rounded-lg p-3 text-xs leading-relaxed border ${
                      checkResult.eligible
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-destructive/30 bg-destructive/10 text-destructive"
                    }`}
                  >
                    {checkResult.message}
                  </div>
                )}
              </div>
            </section>

            {/* Terms commitment */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
              <label className="flex items-start gap-3.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  defaultChecked
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer shrink-0"
                />
                <div className="text-xs leading-relaxed text-muted-foreground">
                  <span className="font-bold text-foreground">
                    Cam kết tính chính xác của hồ sơ:
                  </span>{" "}
                  Tôi xác nhận các thông tin và tài liệu cung cấp ở trên là chính xác, đồng thời đồng ý tuân thủ quy định dành cho Nhà cung cấp trên nền tảng Servigo.
                </div>
              </label>
            </div>

            {/* Submit Button - Đã bỏ dòng Endpoint: POST /provider/register • */}
            <div className="pt-2 text-center">
              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="inline-flex min-w-[320px] items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Đang gửi hồ sơ...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    <span>Gửi hồ sơ đăng ký Nhà cung cấp</span>
                  </>
                )}
              </button>
              <p className="mt-2 text-xs text-muted-foreground">
                Sau khi gửi, hồ sơ sẽ tự động chuyển sang trạng thái chờ duyệt.
              </p>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
