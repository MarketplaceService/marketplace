import { InspectionFormView } from "@/components/provider/booking/inspection-form-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lập biên bản nghiệm thu | Servigo Đối tác",
  description:
    "Tải ảnh Trước/Sau khi sửa và thông số kỹ thuật gửi khách nghiệm thu",
};

export default async function ProviderInspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InspectionFormView bookingId={id} />;
}
