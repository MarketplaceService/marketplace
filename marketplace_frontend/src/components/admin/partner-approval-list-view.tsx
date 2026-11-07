"use client";

import { useAdminProviders } from "@/hooks/use-provider";
import type { ProviderProfileData } from "@/services/provider.services";
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  Filter,
  FolderCheck,
  FolderOpen,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  User,
  Wrench,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PartnerApprovalDetailView } from "./partner-approval-detail-view";

const CATEGORIES = [
  "Sửa điện lạnh",
  "Sửa điện dân dụng",
  "Cấp thoát nước",
  "Sửa máy tính - điện thoại",
  "Vệ sinh nhà cửa",
  "Cải tạo & Sơn sửa",
  "Lắp đặt thiết bị",
  "Sửa khóa & Cửa cuốn",
];

export function PartnerApprovalListView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null,
  );

  const { data, isLoading, refetch } = useAdminProviders({
    search: searchTerm || undefined,
    category: selectedCategory || undefined,
    status: selectedStatus || undefined,
  });

  const stats = data?.stats ?? {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  const items = data?.items ?? [];

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedStatus("ALL");
  };

  return (
    <main className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
      {/* 1. Page Title */}
      <div className="mb-7">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          Danh Sách Hồ Sơ Nhà Cung Cấp
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Theo dõi hàng đợi xét duyệt, lọc trạng thái Chờ duyệt / Đã duyệt / Đã từ chối và mở thẩm định chi tiết.
        </p>
      </div>

      {/* 2. STAT CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {/* Card 1: Tổng */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Tổng hồ sơ đăng ký</span>
            <FolderOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-3xl font-display font-bold text-foreground tabular-nums">
              {stats.total}
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              Tất cả
            </span>
          </div>
        </div>

        {/* Card 2: Chờ duyệt */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/20 p-5 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
            <span>Chờ xét duyệt</span>
            <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-3xl font-display font-bold text-amber-900 tabular-nums">
              {stats.pending}
            </div>
            <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              Cần thẩm định
            </span>
          </div>
        </div>

        {/* Card 3: Đã phê duyệt */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/20 p-5 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
            <span>Đã phê duyệt</span>
            <BadgeCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-3xl font-display font-bold text-emerald-950 tabular-nums">
              {stats.approved}
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
              Đã cấp quyền
            </span>
          </div>
        </div>

        {/* Card 4: Đã từ chối */}
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-destructive text-xs font-semibold">
            <span>Đã từ chối</span>
            <XCircle className="h-5 w-5 text-destructive" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-3xl font-display font-bold text-destructive tabular-nums">
              {stats.rejected}
            </div>
            <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
              Yêu cầu bổ sung
            </span>
          </div>
        </div>
      </section>

      {/* 3. FILTERS BAR */}
      <section className="rounded-xl border border-border bg-card p-4 mb-6 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên hiển thị, họ tên, email, SĐT, mã #TF-PRO..."
              className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Category dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 min-w-[200px] rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none cursor-pointer"
            >
              <option value="">Ngành nghề: Tất cả</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Reset button */}
            <button
              type="button"
              onClick={handleResetFilters}
              title="Đặt lại bộ lọc"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto border-t border-border pt-3">
          <span className="mr-2 text-xs font-semibold text-muted-foreground shrink-0">
            Trạng thái:
          </span>
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "PENDING", label: "Chờ duyệt" },
            { id: "APPROVED", label: "Đã duyệt" },
            { id: "REJECTED", label: "Đã từ chối" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setSelectedStatus(pill.id)}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition shrink-0 ${
                selectedStatus === pill.id
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </section>

      {/* 4. TABLE */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5">Nhà cung cấp</th>
                <th className="px-5 py-3.5">Số điện thoại & Kinh nghiệm</th>
                <th className="px-5 py-3.5">Ngành nghề & Vùng phục vụ</th>
                <th className="px-5 py-3.5">Tài liệu xác minh</th>
                <th className="px-5 py-3.5">Ngày đăng ký</th>
                <th className="px-5 py-3.5">Trạng thái</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                    <p className="mt-2 text-xs">Đang tải danh sách hồ sơ...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    Không có hồ sơ nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const area = item.serviceAreas?.[0];
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Cột 1: Nhà cung cấp */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm ring-1 ring-border">
                            {item.displayName ? item.displayName[0].toUpperCase() : "P"}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">
                              {item.displayName}
                            </p>
                            <p className="text-muted-foreground text-[11px]">
                              {item.user?.name || "Kỹ thuật viên"} • {item.user?.email}
                            </p>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              #{item.id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: SĐT & Kinh nghiệm */}
                      <td className="px-5 py-4">
                        <p className="font-semibold text-foreground tabular-nums">
                          {item.phone || "—"}
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          {item.experienceYears ?? 0} năm kinh nghiệm
                        </p>
                      </td>

                      {/* Cột 3: Ngành nghề & Vùng */}
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground">
                          {item.categoryId || "Sửa điện lạnh"}
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          Bán kính: {area?.radiusKm ? `${area.radiusKm} km` : "5.0 km"}
                        </p>
                      </td>

                      {/* Cột 4: Tài liệu KYC */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                          <FileCheck className="h-3.5 w-3.5" />
                          <span>{item.documents?.length || 4}/4 tài liệu</span>
                        </span>
                      </td>

                      {/* Cột 5: Ngày đăng ký */}
                      <td className="px-5 py-4 text-muted-foreground tabular-nums">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString("vi-VN") : "Hôm nay"}
                      </td>

                      {/* Cột 6: Trạng thái */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                            item.verificationStatus === "APPROVED"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : item.verificationStatus === "REJECTED"
                              ? "border-destructive/30 bg-destructive/10 text-destructive"
                              : "border-amber-200 bg-amber-50 text-amber-800"
                          }`}
                        >
                          {item.verificationStatus === "APPROVED"
                            ? "Đã duyệt"
                            : item.verificationStatus === "REJECTED"
                            ? "Đã từ chối"
                            : "Chờ duyệt"}
                        </span>
                      </td>

                      {/* Cột 7: Thao tác */}
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedProviderId(item.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors shadow-2xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Xem & xét duyệt</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. APPRAISAL MODAL (SCREEN 10) */}
      {selectedProviderId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedProviderId(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl bg-card border border-border shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <PartnerApprovalDetailView
              providerId={selectedProviderId}
              isModal
              onClose={() => {
                setSelectedProviderId(null);
                refetch();
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
