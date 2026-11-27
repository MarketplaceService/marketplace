"use client";

import { formatVnd } from "@/lib/travel-fee";
import { cn } from "@/lib/utils";
import type { PaymentMethod, PaymentMethodOption } from "@/types/booking.types";
import { Banknote, CheckCircle2, QrCode, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface BookingPaymentMethodSlotProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  /** Danh sách từ GET /payments/methods. undefined khi đang tải */
  options: PaymentMethodOption[] | undefined;
  isLoading?: boolean;
  totalPrice?: number;
}

const LIVE_METHODS: {
  method: Extract<PaymentMethod, "payos" | "cod">;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    method: "payos",
    title: "Chuyển khoản VietQR (PayOS)",
    description: "Quét mã bằng app ngân hàng bất kỳ",
    icon: QrCode,
  },
  {
    method: "cod",
    title: "Tiền mặt khi nghiệm thu",
    description: "Trả trực tiếp cho thợ sau khi hoàn tất",
    icon: Banknote,
  },
];

const WALLET_METHODS: PaymentMethod[] = ["vnpay", "momo", "zalopay"];

/** Bộ chọn phương thức thanh toán trên trang checkout (screen12) */
export function BookingPaymentMethodSlot({
  value,
  onChange,
  options,
  isLoading,
  totalPrice,
}: BookingPaymentMethodSlotProps) {
  const optionOf = (method: PaymentMethod) =>
    options?.find((item) => item.method === method);
  const walletsComingSoon = WALLET_METHODS.every(
    (method) => !optionOf(method)?.enabled,
  );

  return (
    <div className="space-y-3">
      <span
        id="booking-payment-method-label"
        className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Chọn phương thức thanh toán
      </span>

      {isLoading || !options ? (
        <div className="space-y-2">
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : (
        <div
          role="radiogroup"
          aria-labelledby="booking-payment-method-label"
          className="space-y-2"
        >
          {LIVE_METHODS.map(({ method, title, description, icon: Icon }) => {
            const option = optionOf(method);
            const enabled = option?.enabled ?? false;
            const selected = value === method;
            return (
              <label
                key={method}
                className={cn(
                  "flex min-h-[56px] items-center gap-3 rounded-xl border p-3 transition-colors",
                  enabled ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                  selected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border",
                  enabled && !selected && "hover:bg-muted/50",
                )}
              >
                <input
                  type="radio"
                  name="booking-payment-method"
                  value={method}
                  checked={selected}
                  disabled={!enabled}
                  onChange={() => onChange(method)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                    selected
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-muted/40 text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    {title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {enabled ? description : (option?.reason ?? "Chưa khả dụng")}
                  </span>
                </span>
                {selected && (
                  <CheckCircle2 className="size-5 shrink-0 text-primary" />
                )}
              </label>
            );
          })}

          {walletsComingSoon && (
            <div className="flex min-h-[56px] items-center gap-3 rounded-xl border border-dashed border-border p-3 opacity-60">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
                <Wallet className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  Ví điện tử VNPAY / MoMo / ZaloPay
                </span>
                <span className="block text-xs text-muted-foreground">
                  Sắp ra mắt
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      {!isLoading && options && (
        <p className="rounded-xl border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
          {value === "payos" ? (
            <>
              Sau khi bấm xác nhận, bạn được chuyển tới trang PayOS để quét mã VietQR. Link có
              hiệu lực 15 phút; nếu chưa trả kịp, bạn có thể tạo link mới trong trang đơn hoặc đổi
              sang tiền mặt.
            </>
          ) : (
            <>
              Bạn trả{" "}
              <strong className="text-foreground">
                {totalPrice !== undefined ? formatVnd(totalPrice) : "số tiền của đơn"}
              </strong>{" "}
              tiền mặt cho thợ sau khi kiểm tra ảnh Before/After và xác nhận nghiệm thu.
            </>
          )}
        </p>
      )}
    </div>
  );
}
