import { PartnerApprovalDetailView } from "@/components/admin/partner-approval-detail-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thẩm định chi tiết hồ sơ đối tác | Quản trị TrustFix",
};

export default async function AdminProviderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PartnerApprovalDetailView providerId={id} />
    </div>
  );
}

