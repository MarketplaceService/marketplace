import { BookingDetailView } from "@/components/booking/booking-detail-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chi tiết đơn đặt lịch | Servigo Đối tác",
  description:
    "Xem chi tiết lịch hẹn, thao tác nhận đơn và đối chiếu biên bản nghiệm thu",
};

export default async function ProviderBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BookingDetailView bookingId={id} portal="provider" />;
}
