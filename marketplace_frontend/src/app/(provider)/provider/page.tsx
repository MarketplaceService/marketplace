import type { Metadata } from "next";
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Radio,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Bảng điều khiển Nhà cung cấp | Servigo",
  description:
    "Quản lý lịch nhận việc, đơn đặt lịch và thu nhập dành cho đối tác Servigo",
};

export default function ProviderDashboardPage() {
  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Banner giới thiệu */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground mb-3">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Phân hệ 2: Giao diện Nhà cung cấp (Thanh danh mục bên trái + Thanh điều hướng trên)
        </span>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          Bố Cục Quản Trị Dành Cho Nhà Cung Cấp
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
          Theo quy chuẩn thiết kế, giao diện Nhà cung cấp tách biệt hoàn toàn thành một bố cục riêng có thanh danh mục bên trái 7 mục nghiệp vụ, giúp xử lý đơn hàng, xếp lịch và nghiệm thu mà không gây chồng chéo với trải nghiệm đặt dịch vụ của Khách hàng.
        </p>
      </div>

      {/* 3 Thẻ tóm tắt nhanh nghiệp vụ NCC */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Lịch nhận việc hôm nay
            </span>
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">4 đơn công việc</div>
          <p className="text-xs text-muted-foreground mt-1">
            2 đơn hoàn thành • 1 đang thực hiện • 1 chờ đến giờ
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Trạng thái nhận ca
            </span>
            <Radio className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">Đang trực tuyến</div>
          <p className="text-xs text-muted-foreground mt-1">
            Bán kính quét: 12 km xung quanh Quận Cầu Giấy
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Doanh thu tạm tính
            </span>
            <CircleDollarSign className="h-5 w-5 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">1.850.000 đ</div>
          <p className="text-xs text-muted-foreground mt-1">
            Tổng thu nhập từ các đơn đã hoàn thành
          </p>
        </div>
      </div>
    </div>
  );
}
