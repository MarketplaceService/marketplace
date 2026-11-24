import { ProviderBookingsView } from "@/components/provider/booking/provider-bookings-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý đơn đặt lịch | Servigo Đối tác",
  description: "Nhận đơn, bắt đầu công việc và theo dõi lịch hẹn của nhà cung cấp",
};

export default function ProviderBookingsPage() {
  return <ProviderBookingsView />;
}
