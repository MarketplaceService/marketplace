import { ProviderWalletView } from "@/components/provider/wallet/provider-wallet-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ví & Thu nhập | Servigo Đối tác",
  description: "Thống kê doanh thu theo tháng và sao kê giao dịch hoàn thành",
};

export default function ProviderWalletPage() {
  return <ProviderWalletView />;
}
