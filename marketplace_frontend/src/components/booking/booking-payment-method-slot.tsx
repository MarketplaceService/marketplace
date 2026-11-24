"use client";

import { ShieldCheck, Wallet } from "lucide-react";

export interface BookingPaymentMethodSlotProps {
  value?: string;
  onChange?: (method: string) => void;
}

/**
 * Khe cắm chọn phương thức thanh toán trên trang Checkout (screen12).
 * Issue #150 (Module Payment) sẽ thay thế nội dung bên trong component này bằng bộ chọn 4 phương thức
 * mà không gây xung đột với logic đặt lịch của BookingCheckoutView.
 */
export function BookingPaymentMethodSlot({
  value: _value,
  onChange: _onChange,
}: BookingPaymentMethodSlotProps) {
  void _value;
  void _onChange;

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Hình thức thanh toán
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
          <ShieldCheck className="size-3" />
          Bảo vệ nghiệm thu
        </span>
      </div>
      <div className="flex items-start gap-3 pt-1">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <Wallet className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Thanh toán sau khi nghiệm thu
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Bạn kiểm tra ảnh Before/After và xác nhận hoàn tất công việc trên hệ thống trước khi chốt thanh toán.
          </p>
        </div>
      </div>
    </div>
  );
}
