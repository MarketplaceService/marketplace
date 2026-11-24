import { BookingDetailView } from "@/components/booking/booking-detail-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tiến độ & Nghiệm thu đơn hàng | Servigo",
  description: "Theo dõi trạng thái đơn đặt lịch và đối chiếu ảnh Before/After",
};

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BookingDetailView bookingId={id} />;
}
