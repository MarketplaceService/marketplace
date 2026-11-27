"use client";

import type { ServicePriceUnit } from "@/services/provider.services";
import { Plus, Trash2, Wrench } from "lucide-react";

/** Khớp MAX_REGISTER_SERVICES ở backend */
export const MAX_REGISTER_SERVICES = 5;

export interface ServiceDraft {
  /** Chỉ dùng làm key cho React, không gửi lên server */
  key: string;
  title: string;
  basePrice: number | "";
  priceUnit: ServicePriceUnit;
  durationMinutes: number | "";
}

// Bộ đếm thay cho crypto.randomUUID, vốn không có khi mở app bằng IP mạng LAN qua http
let nextDraftKey = 0;

export const createServiceDraft = (
  values: Partial<Omit<ServiceDraft, "key">> = {},
): ServiceDraft => ({
  key: `service-${nextDraftKey++}`,
  title: "",
  basePrice: "",
  priceUnit: "FIXED",
  durationMinutes: 60,
  ...values,
});

/** Trả lỗi đầu tiên của danh sách dịch vụ, hoặc null nếu hợp lệ */
export function validateServiceDrafts(items: ServiceDraft[]): string | null {
  if (items.length === 0) return "Vui lòng thêm ít nhất 1 dịch vụ";

  const seen = new Set<string>();
  for (const [index, item] of items.entries()) {
    const label = `Dịch vụ ${index + 1}`;
    const title = item.title.trim();

    if (!title) return `${label}: vui lòng nhập tên dịch vụ`;
    if (item.basePrice === "" || Number(item.basePrice) < 0) {
      return `${label}: vui lòng nhập giá cơ sở hợp lệ`;
    }
    if (item.durationMinutes === "" || Number(item.durationMinutes) < 15) {
      return `${label}: thời lượng tối thiểu 15 phút`;
    }

    const key = title.toLocaleLowerCase("vi");
    if (seen.has(key)) return "Hai dịch vụ không được trùng tên";
    seen.add(key);
  }
  return null;
}

interface RegisterServicesFieldsProps {
  items: ServiceDraft[];
  onChange: (items: ServiceDraft[]) => void;
  max?: number;
}

const inputClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none placeholder:text-muted-foreground";

export function RegisterServicesFields({
  items,
  onChange,
  max = MAX_REGISTER_SERVICES,
}: RegisterServicesFieldsProps) {
  const update = (key: string, patch: Partial<ServiceDraft>) =>
    onChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  const remove = (key: string) => onChange(items.filter((item) => item.key !== key));
  const add = () => {
    if (items.length < max) onChange([...items, createServiceDraft()]);
  };
  const isFull = items.length >= max;

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <Wrench className="h-4 w-4 text-primary" />
          <span>Dịch vụ cung cấp khi được phê duyệt</span>
        </div>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
          {items.length}/{max}
        </span>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Tất cả dịch vụ thuộc ngành nghề chính đã chọn ở trên.
      </p>

      <ol className="space-y-3">
        {items.map((item, index) => {
          const number = index + 1;
          return (
            <li
              key={item.key}
              className="rounded-lg border border-border bg-background/60 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-primary">Dịch vụ {number}</span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(item.key)}
                    aria-label={`Xóa dịch vụ ${number}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                <div className="sm:col-span-5">
                  <label
                    htmlFor={`service-title-${item.key}`}
                    className="mb-1 block text-xs font-semibold text-muted-foreground"
                  >
                    Tên dịch vụ <span className="text-destructive">*</span>
                  </label>
                  <input
                    id={`service-title-${item.key}`}
                    type="text"
                    required
                    maxLength={200}
                    value={item.title}
                    onChange={(e) => update(item.key, { title: e.target.value })}
                    placeholder="VD: Bảo trì & Vệ sinh điều hòa dân dụng"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label
                    htmlFor={`service-price-${item.key}`}
                    className="mb-1 block text-xs font-semibold text-muted-foreground"
                  >
                    Giá cơ sở (VNĐ) <span className="text-destructive">*</span>
                  </label>
                  <input
                    id={`service-price-${item.key}`}
                    type="number"
                    required
                    min={0}
                    step={10000}
                    value={item.basePrice}
                    onChange={(e) =>
                      update(item.key, {
                        basePrice: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                    placeholder="VD: 250000"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor={`service-unit-${item.key}`}
                    className="mb-1 block text-xs font-semibold text-muted-foreground"
                  >
                    Đơn vị tính <span className="text-destructive">*</span>
                  </label>
                  <select
                    id={`service-unit-${item.key}`}
                    value={item.priceUnit}
                    onChange={(e) =>
                      update(item.key, { priceUnit: e.target.value as ServicePriceUnit })
                    }
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option value="FIXED">Trọn gói</option>
                    <option value="HOURLY">Theo giờ</option>
                    <option value="FROM">Từ mức giá</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor={`service-duration-${item.key}`}
                    className="mb-1 block text-xs font-semibold text-muted-foreground"
                  >
                    Thời lượng (phút) <span className="text-destructive">*</span>
                  </label>
                  <input
                    id={`service-duration-${item.key}`}
                    type="number"
                    required
                    min={15}
                    step={15}
                    value={item.durationMinutes}
                    onChange={(e) =>
                      update(item.key, {
                        durationMinutes:
                          e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                    placeholder="VD: 60"
                    className={inputClass}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={add}
          disabled={isFull}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary/40 px-3.5 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground disabled:hover:bg-transparent"
        >
          <Plus className="h-4 w-4" />
          Thêm dịch vụ
        </button>
        {isFull && (
          <span className="text-xs text-muted-foreground">Tối đa {max} dịch vụ</span>
        )}
      </div>
    </div>
  );
}
