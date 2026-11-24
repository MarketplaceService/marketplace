import { BookingCheckoutView } from "@/components/booking/booking-checkout-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xác nhận đặt lịch | Servigo",
  description: "Kiểm tra địa chỉ, báo giá minh bạch và xác nhận đặt lịch dịch vụ",
};

export default async function ProviderBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ serviceId?: string; startAt?: string }>;
}) {
  const [{ id }, { serviceId, startAt }] = await Promise.all([params, searchParams]);
  return (
    <BookingCheckoutView
      providerId={id}
      serviceId={serviceId}
      startAt={startAt}
    />
  );
}
