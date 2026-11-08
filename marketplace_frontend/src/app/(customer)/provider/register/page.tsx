import type { Metadata } from "next";
import { PartnerRegisterView } from "@/components/provider/partner-register-view";

export const metadata: Metadata = {
  title: "Đăng ký trở thành Nhà cung cấp | TrustFix",
  description:
    "Gia nhập mạng lưới kỹ thuật viên và nhà cung cấp dịch vụ sửa chữa chuyên nghiệp TrustFix",
};

export default function PartnerRegisterPage() {
  return <PartnerRegisterView />;
}

