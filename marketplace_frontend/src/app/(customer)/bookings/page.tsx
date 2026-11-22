import { MyBookingsView } from "@/components/booking/my-bookings-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đơn đặt lịch của tôi | Servigo",
  description: "Quản lý lịch hẹn dịch vụ và nghiệm thu công việc Before/After",
};

export default function MyBookingsPage() {
  return <MyBookingsView />;
}
