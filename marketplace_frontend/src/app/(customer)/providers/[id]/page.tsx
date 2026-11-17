import { ProviderPublicView } from "@/components/providers/provider-public-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hồ sơ thợ | Servigo",
  description: "Thông tin thợ đã xác minh và các khung giờ còn trống để đặt lịch",
};

// Trang công khai: proxy.ts chỉ chặn đường dẫn /provider/..., không chặn /providers/...
export default async function ProviderPublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ serviceId?: string }>;
}) {
  const [{ id }, { serviceId }] = await Promise.all([params, searchParams]);
  return <ProviderPublicView providerId={id} serviceId={serviceId} />;
}
