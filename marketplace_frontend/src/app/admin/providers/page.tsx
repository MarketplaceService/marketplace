import type { Metadata } from "next";
import { PartnerApprovalListView } from "@/components/admin/partner-approval-list-view";

export const metadata: Metadata = {
  title: "Duyệt nhà cung cấp | Quản trị Servigo",
  description: "Thẩm định hồ sơ KYC và phê duyệt đối tác kỹ thuật viên",
};

export default function AdminProvidersPage() {
  return <PartnerApprovalListView />;
}

