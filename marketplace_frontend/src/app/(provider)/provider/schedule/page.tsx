import { ProviderScheduleView } from "@/components/provider/schedule/provider-schedule-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lịch & Vùng phục vụ | Servigo",
  description:
    "Thiết lập lịch làm việc hàng tuần, ngày nghỉ và bán kính phục vụ dành cho đối tác Servigo",
};

export default function ProviderSchedulePage() {
  return <ProviderScheduleView />;
}
