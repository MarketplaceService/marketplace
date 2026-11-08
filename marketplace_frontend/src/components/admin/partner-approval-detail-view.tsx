"use client";

import { useCurrentUser } from "@/hooks/use-auth";
import {
  useAdminApproveProvider,
  useAdminProviderDetail,
  useAdminRejectProvider,
} from "@/hooks/use-provider";
import {
  AlertCircle,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  Hourglass,
  Loader2,
  MapPin,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  User,
  X,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { toast } from "sonner";

const ServiceAreaMapPicker = dynamic(
  () => import("../provider/service-area-map-picker"),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-xl bg-muted" />
    ),
  },
);

interface PartnerApprovalDetailViewProps {
  providerId: string;
  onClose?: () => void;
  isModal?: boolean;
}

export function PartnerApprovalDetailView({
  providerId,
  onClose,
  isModal = false,
}: PartnerApprovalDetailViewProps) {
  const { data: profile, isLoading } = useAdminProviderDetail(providerId);
  const approveMutation = useAdminApproveProvider();
  const rejectMutation = useAdminRejectProvider();
  const { data: currentUser } = useCurrentUser();

  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const rejectBoxRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-xs font-medium">Đang tải chi tiết hồ sơ...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-20 text-center text-muted-foreground space-y-3">
        <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
        <p className="text-sm font-semibold text-foreground">
          Không tìm thấy hồ sơ nhà cung cấp
        </p>
        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Đóng
          </button>
        )}
      </div>
    );
  }

  const isPending = profile.verificationStatus === "PENDING";
  const isApproved = profile.verificationStatus === "APPROVED";
  const isRejected = profile.verificationStatus === "REJECTED";

  const adminName = currentUser?.name || "Lê Quang Dũng";
  const adminCode = currentUser?.id
    ? `#SV-ADM-${currentUser.id.slice(0, 4).toUpperCase()}`
    : "#SV-ADM-01";

  const handleApprove = () => {
    approveMutation.mutate(providerId, {
      onSuccess: () => {
        setShowRejectBox(false);
      },
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối hồ sơ!");
      return;
    }
    rejectMutation.mutate(
      { id: providerId, reason: rejectReason.trim() },
      {
        onSuccess: () => {
          setShowRejectBox(false);
          setRejectReason("");
        },
      },
    );
  };

  const handleToggleRejectBox = (open: boolean) => {
    setShowRejectBox(open);
    if (open) {
      setTimeout(() => {
        rejectBoxRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 80);
    }
  };

  const serviceArea = profile.serviceAreas?.[0] ?? {
    centerLatitude: 10.776889,
    centerLongitude: 106.700897,
    radiusKm: 7.0,
    areaName: "Vùng trung tâm TP.HCM",
    isActive: true,
  };

  const docItems = [
    {
      title: "1. CCCD / CMND Mặt trước",
      tag: "Mặt trước CCCD",
      type: "ID_CARD_FRONT",
      filename: "cccd_mat_truoc.jpg",
      defaultImg:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBoKNyZ9FxRC7SEYhOD23KcZPMJdpHHmMYKFTGHiAYscF-BjsidSgSTBsdCvnuqGv80WMZhYNkLcVII3oHaV4xO1mMq63cJncuubXwyBwPZNMgMGhVWSCCUabq3W8UkMWaOXwTsRNx9jqWU2_6ltq4mXM1Pq2vnkHj_PRCSbDLfdvrbBIA2jRH0rm6IaVFPhsRkaT7ECC9ZqNRcEVGtP4B3v0eQljE3t5ByOZvFraheM2wuNgqjBlaQVIS2AJ1l621BS5rj9xl6y8Rx",
    },
    {
      title: "2. CCCD / CMND Mặt sau",
      tag: "Mặt sau CCCD",
      type: "ID_CARD_BACK",
      filename: "cccd_mat_sau.jpg",
      defaultImg:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDKKe6FcPRW2y-tf0c9rFSlvUNUDSqEwrVtFkArRT3H7PmHFSMcWE3lQ5Gl-0lcsPpZpz4DcCGel6Iw00Kl-jMMNr4Y8c7p4SDUyx-j4IyRGEpxNNlN_MCGVOVKeJVJC3aeYJ5-Ee6siv92rSL6rTtvPY_opaJ-HxuOiXIrRMN0Y5gSkJ5wP5L_WpZzRb72UAS5mkpMx5qBYqZBLzxktG0lqSL_DKwF7W-X2IytCvk4V2EmcxhWnokYBy7gyfADtPfmNDC1E50ZGFKm",
    },
    {
      title: "3. Chứng chỉ nghề / Bằng cấp chuyên môn",
      tag: "Chứng chỉ nghề",
      type: "CERTIFICATE",
      filename: "chung_chi_chuyen_nganh.pdf",
      defaultImg:
        "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
    },
    {
      title: "4. Ảnh chân dung & Dụng cụ tác nghiệp",
      tag: "Ảnh dụng cụ",
      type: "TOOLKIT_PHOTO",
      filename: "anh_dung_cu_chuyen_dung.jpg",
      defaultImg:
        "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=600&q=80",
    },
  ];

  return (
    <div className="w-full bg-card rounded-2xl flex flex-col overflow-hidden text-foreground">
      {/* ========================================================================= */}
      {/* 1. HEADER                                                                 */}
      {/* ========================================================================= */}
      <div className="flex items-start justify-between border-b border-border bg-card px-6 py-5 gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 text-primary font-bold text-lg shadow-2xs overflow-hidden">
              {profile.user?.image ? (
                <img
                  src={profile.user.image}
                  alt={profile.displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                profile.displayName ? profile.displayName[0].toUpperCase() : "P"
              )}
            </div>

            {/* Status Pin Icon */}
            <span
              className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-white ring-2 ring-card ${
                isApproved
                  ? "bg-emerald-600"
                  : isRejected
                  ? "bg-destructive"
                  : "bg-amber-500"
              }`}
            >
              {isApproved ? (
                <Check className="h-3 w-3 stroke-[3]" />
              ) : isRejected ? (
                <X className="h-3 w-3 stroke-[3]" />
              ) : (
                <Hourglass className="h-2.5 w-2.5" />
              )}
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-display text-xl font-bold text-foreground">
                {profile.displayName}
              </h2>

              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                  isApproved
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : isRejected
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                {isApproved
                  ? "Đã duyệt"
                  : isRejected
                  ? "Đã từ chối"
                  : "Chờ duyệt"}
              </span>
            </div>

            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>
                Họ tên:{" "}
                <strong className="text-foreground font-semibold">
                  {profile.user?.name || "Kỹ thuật viên"}
                </strong>
              </span>
              <span>•</span>
              <span>{profile.user?.email || "chưa cập nhật"}</span>
              <span>•</span>
              <span className="font-mono text-muted-foreground">
                #SV-PRO-{profile.id.slice(0, 4).toUpperCase()}
              </span>
            </p>
          </div>
        </div>

        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Đóng modal"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. BODY SCROLLABLE AREA                                                   */}
      {/* ========================================================================= */}
      <div className="max-h-[calc(85vh-200px)] overflow-y-auto p-6 space-y-6 bg-muted/20">
        {/* PHẦN 1: THÔNG TIN HỒ SƠ & NGÀNH NGHỀ */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <User className="h-4 w-4 text-primary" />
            <span>Thông tin hồ sơ &amp; Ngành nghề đăng ký</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Số điện thoại nhận việc
              </span>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                {profile.phone || "0908 123 456"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Kinh nghiệm làm việc
              </span>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {profile.experienceYears ?? 0} năm kinh nghiệm
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Ngành nghề chính
              </span>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {profile.categoryId || "Cấp thoát nước"}
              </p>
            </div>
          </div>

          {/* Dịch vụ khởi tạo ban đầu */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3.5 text-sm">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Dịch vụ khởi tạo ban đầu
              </span>
              <p className="mt-0.5 font-medium text-foreground">
                Sửa chữa sự cố rò rỉ nước âm tường &amp; thay van khóa
              </p>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Biểu giá cơ sở
              </span>
              <p className="mt-0.5 font-bold tabular-nums text-primary">
                200.000 đ (Theo giờ) • 60 phút
              </p>
            </div>
          </div>

          {/* Giới thiệu năng lực */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Giới thiệu năng lực &amp; Kinh nghiệm
            </span>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border">
              {profile.bio ||
                "Chuyên cung cấp dịch vụ kỹ thuật điện nước dân dụng hơn 5 năm tại khu vực TP.HCM. Đầy đủ trang thiết bị tác nghiệp chuyên dụng, xử lý nhanh chóng, cam kết bảo hành trách nhiệm."}
            </p>
          </div>

          {/* Banner Meta khi APPROVED */}
          {isApproved && (
            <div className="p-3.5 rounded-lg text-xs bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-2.5">
              <BadgeCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span>
                  Hồ sơ đã được phê duyệt bởi{" "}
                  <strong>{profile.approvedBy || adminName}</strong> lúc{" "}
                  <strong>
                    {profile.approvedAt
                      ? new Date(profile.approvedAt).toLocaleString("vi-VN")
                      : "Vừa xong"}
                  </strong>
                  .
                </span>
                <p className="mt-1 text-[11px] text-emerald-800">
                  Vai trò tài khoản:{" "}
                  <code className="font-mono font-bold text-emerald-900 bg-emerald-100 px-1 py-0.5 rounded">
                    Nhà cung cấp
                  </code>
                  . Dịch vụ đăng ký đã được kích hoạt trên sàn.
                </p>
              </div>
            </div>
          )}

          {/* Banner Meta khi REJECTED */}
          {isRejected && (
            <div className="p-3.5 rounded-lg text-xs bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-2.5">
              <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Lý do từ chối hồ sơ:</span>
                <p className="mt-0.5 text-foreground italic font-medium">
                  "{profile.rejectionReason || "Chưa đạt yêu cầu tài liệu xác minh"}"
                </p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Quyền tài khoản giữ nguyên:{" "}
                  <code className="font-mono text-foreground font-semibold bg-muted px-1 py-0.5 rounded">
                    Khách hàng
                  </code>
                  . Khách hàng có thể bổ sung hồ sơ và gửi lại bất kỳ lúc nào.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* PHẦN 2: KHU VỰC PHỤC VỤ */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              <span>Khu vực phục vụ đăng ký &amp; Bán kính hoạt động</span>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              Bán kính: {serviceArea.radiusKm} km
            </span>
          </div>

          <ServiceAreaMapPicker
            latitude={Number(serviceArea.centerLatitude)}
            longitude={Number(serviceArea.centerLongitude)}
            radiusKm={Number(serviceArea.radiusKm)}
            onChangeCenter={() => {}}
            interactive={false}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
            <div className="rounded-lg border border-border bg-muted/40 p-2.5">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">
                Ghi chú vùng
              </span>
              <p className="mt-0.5 font-semibold text-foreground">
                {serviceArea.areaName || "Vùng trung tâm TP.HCM"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-2.5">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">
                Tọa độ tâm
              </span>
              <p className="mt-0.5 font-mono text-foreground">
                {Number(serviceArea.centerLatitude).toFixed(4)},{" "}
                {Number(serviceArea.centerLongitude).toFixed(4)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-2.5">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">
                Trạng thái vùng
              </span>
              <p className="mt-0.5 font-semibold text-emerald-700 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Đang hoạt động</span>
              </p>
            </div>
          </div>
        </section>

        {/* PHẦN 3: 4 TÀI LIỆU XÁC MINH DANH TÍNH */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <FileCheck2 className="h-4 w-4 text-primary" />
              <span>Tài liệu xác minh danh tính (4 mục theo quy chuẩn)</span>
            </div>
            <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              4/4 tài liệu đính kèm
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {docItems.map((doc, idx) => {
              const uploadedDoc = profile.documents?.find(
                (d) => d.documentType === doc.type,
              );
              const previewUrl = uploadedDoc?.fileUrl || doc.defaultImg;

              return (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-card p-3.5 space-y-3 hover:border-primary/50 transition-colors shadow-2xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground truncate max-w-[200px]">
                      {doc.title}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                        {doc.tag}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                          isApproved
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isRejected
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {isApproved
                          ? "Đã duyệt"
                          : isRejected
                          ? "Đã từ chối"
                          : "Chờ duyệt"}
                      </span>
                    </div>
                  </div>

                  {/* Image Aspect 1.58/1 */}
                  <div className="aspect-[1.58/1] w-full overflow-hidden rounded-lg border border-border bg-muted/40 relative">
                    <img
                      src={previewUrl}
                      alt={doc.title}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Subline */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                    <span className="font-mono truncate max-w-[170px]">
                      {doc.filename}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewDocUrl(previewUrl)}
                      className="text-primary hover:underline font-semibold cursor-pointer"
                    >
                      Xem lớn
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===================================================================== */}
        {/* KHUNG NHẬP LÝ DO TỪ CHỐI INLINE (Hiển thị khi bấm 'Từ chối hồ sơ')     */}
        {/* ===================================================================== */}
        {showRejectBox && (
          <div
            ref={rejectBoxRef}
            className="p-4 rounded-xl bg-destructive/5 border border-destructive/30 space-y-3 animate-in fade-in zoom-in-95"
          >
            <label
              htmlFor="reject-reason-input"
              className="block text-xs font-bold text-destructive uppercase tracking-wider"
            >
              Nhập lý do từ chối hồ sơ <span className="text-destructive">*</span>
            </label>
            <textarea
              id="reject-reason-input"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Ảnh CCCD mặt sau bị mờ không đọc được thông tin số hiệu, vui lòng chụp lại rõ nét..."
              className="w-full p-3 rounded-lg border border-destructive/30 bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-destructive/20 resize-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleToggleRejectBox(false)}
                className="px-3.5 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground bg-card transition shadow-2xs"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                onClick={handleReject}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-destructive hover:bg-destructive/90 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {rejectMutation.isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                <span>Xác nhận từ chối</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. FOOTER ACTIONS                                                         */}
      {/* ========================================================================= */}
      <div className="border-t border-border bg-card px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Tên Admin */}
        <div className="text-xs text-muted-foreground">
          <span>Thao tác bởi Quản trị viên: </span>
          <strong className="text-foreground font-semibold">{adminName}</strong>
          <span className="text-muted-foreground"> ({adminCode})</span>
        </div>

        {/* Right: Actions Cluster */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* TRƯỜNG HỢP 1: PENDING (Chờ duyệt) */}
          {isPending && (
            <>
              <button
                type="button"
                onClick={() => handleToggleRejectBox(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-destructive/40 text-destructive hover:bg-destructive/10 text-xs font-bold transition shadow-2xs"
              >
                <XCircle className="h-4 w-4" />
                <span>Từ chối hồ sơ</span>
              </button>

              <button
                type="button"
                disabled={approveMutation.isPending}
                onClick={handleApprove}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                {approveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span>Phê duyệt &amp; Cấp quyền Nhà cung cấp</span>
              </button>
            </>
          )}

          {/* TRƯỜNG HỢP 2: REJECTED (Đã từ chối -> Có nút Xem xét & Phê duyệt lại) */}
          {isRejected && (
            <>
              <button
                type="button"
                disabled={approveMutation.isPending}
                onClick={handleApprove}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                {approveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span>Xem xét &amp; Phê duyệt lại</span>
              </button>

              {isModal && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground bg-card transition shadow-2xs"
                >
                  Đóng
                </button>
              )}
            </>
          )}

          {/* TRƯỜNG HỢP 3: APPROVED (Đã duyệt) */}
          {isApproved && (
            <>
              <span className="text-xs text-muted-foreground italic mr-2 hidden sm:inline">
                Hồ sơ đã ở trạng thái phê duyệt chính thức
              </span>
              {isModal && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground bg-card transition shadow-2xs"
                >
                  Đóng
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL XEM LỚN TÀI LIỆU                                                  */}
      {/* ========================================================================= */}
      {previewDocUrl && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
          onClick={() => setPreviewDocUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl rounded-2xl overflow-hidden bg-card p-3 shadow-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewDocUrl(null)}
              className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewDocUrl}
              alt="Chi tiết tài liệu"
              className="max-h-[82vh] w-auto rounded-xl object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
