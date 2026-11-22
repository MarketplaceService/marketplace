import { InspectionListView } from "@/components/provider/booking/inspection-list-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nghiệm thu công việc | Servigo Đối tác",
  description: "Danh sách công việc đang thực hiện cần lập biên bản nghiệm thu Before/After",
};

export default function ProviderInspectionsPage() {
  return <InspectionListView />;
}
