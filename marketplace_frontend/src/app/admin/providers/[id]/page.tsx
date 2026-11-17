import { PartnerApprovalDetailView } from "@/components/admin/partner-approval-detail-view";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Thẩm định chi tiết hồ sơ đối tác | Quản trị Servigo",
};

export default async function AdminProviderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-4">
      <Link
        href="/admin/providers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Quay lại danh sách</span>
      </Link>
      <PartnerApprovalDetailView providerId={id} />
    </div>
  );
}

