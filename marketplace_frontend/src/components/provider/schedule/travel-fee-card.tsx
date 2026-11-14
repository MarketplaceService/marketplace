import {
  calculateTravelFee,
  formatVnd,
  FREE_TRAVEL_KM,
  TRAVEL_FEE_PER_KM,
} from "@/lib/travel-fee";
import { Truck } from "lucide-react";
import { formatKm } from "./service-area-card";

const EXAMPLE_DISTANCE_KM = 5;

export function TravelFeeCard({ radiusKm }: { radiusKm: number }) {
  const feeAtRadius = calculateTravelFee(radiusKm);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
        <Truck className="size-5 text-primary" />
        Quy tắc tính phí di chuyển tự động
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Áp dụng thống nhất toàn sàn Servigo để hỗ trợ chi phí đi lại, tự động tính vào hóa đơn khi
        khách đặt lịch.
      </p>

      {/* Cột bên phải khá hẹp nên số tiền nằm dòng riêng để không bị ngắt giữa chừng */}
      <ol className="mt-4 space-y-2 text-sm">
        <li className="rounded-lg border border-border p-3">
          <span className="flex items-center gap-2 text-foreground">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              1
            </span>
            Khoảng cách từ {FREE_TRAVEL_KM}.0 km trở xuống
          </span>
          <p className="mt-1 pl-8 font-semibold text-success">0 đ (Miễn phí di chuyển)</p>
        </li>
        <li className="rounded-lg border border-border p-3">
          <span className="flex items-center gap-2 text-foreground">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              2
            </span>
            Từ km thứ {FREE_TRAVEL_KM + 1} trở đi (&gt; {FREE_TRAVEL_KM}.0 km)
          </span>
          <p className="mt-1 pl-8 font-semibold text-primary">
            +{formatVnd(TRAVEL_FEE_PER_KM)} / km vượt
          </p>
        </li>
      </ol>

      <div className="mt-4 space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
        <p className="flex items-start justify-between gap-3">
          <span className="text-muted-foreground">
            Ví dụ: khách cách <strong>{EXAMPLE_DISTANCE_KM}.0 km</strong> (vượt{" "}
            {EXAMPLE_DISTANCE_KM - FREE_TRAVEL_KM}.0 km)
          </span>
          <span className="shrink-0 font-semibold whitespace-nowrap text-foreground">
            +{formatVnd(calculateTravelFee(EXAMPLE_DISTANCE_KM))}
          </span>
        </p>
        <p className="flex items-start justify-between gap-3">
          <span className="text-muted-foreground">
            Tại bán kính tối đa hiện tại (<strong>{formatKm(radiusKm)} km</strong>):
          </span>
          <span
            className={`shrink-0 font-bold whitespace-nowrap ${feeAtRadius === 0 ? "text-success" : "text-primary"}`}
          >
            {feeAtRadius === 0 ? "Miễn phí" : `+${formatVnd(feeAtRadius)}`}
          </span>
        </p>
      </div>
    </section>
  );
}
