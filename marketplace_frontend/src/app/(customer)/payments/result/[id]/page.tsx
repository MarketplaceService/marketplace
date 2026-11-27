import { PaymentResultView } from "@/components/payment/payment-result-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kết quả thanh toán | Servigo",
  description: "Kết quả thanh toán đơn đặt lịch qua PayOS",
};

// PayOS gắn thêm ?code=…&id=…&cancel=…&status=…&orderCode=…; id trên query là paymentLinkId của PayOS,
// khác với [id] trên đường dẫn là id giao dịch của Servigo
export default async function PaymentResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cancel?: string }>;
}) {
  const [{ id }, { cancel }] = await Promise.all([params, searchParams]);
  return <PaymentResultView paymentId={id} cancelledHint={cancel === "true"} />;
}
