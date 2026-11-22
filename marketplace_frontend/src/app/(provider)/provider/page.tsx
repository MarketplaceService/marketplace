import { ProviderDashboardView } from "@/components/provider/booking/provider-dashboard-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bảng điều khiển Nhà cung cấp | Servigo",
  description:
    "Quản lý lịch nhận việc, đơn đặt lịch và thu nhập dành cho đối tác Servigo",
};

export default function ProviderDashboardPage() {
  return <ProviderDashboardView />;
}
