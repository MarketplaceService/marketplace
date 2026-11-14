"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { DAY_NAMES } from "@/lib/vn-time";
import {
  AlertCircle,
  BriefcaseBusiness,
  CalendarRange,
  CheckCheck,
  Sun,
  Sunset,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

export interface DayRow {
  /** 0 là Chủ Nhật */
  dayOfWeek: number;
  isActive: boolean;
  startTime: string;
  endTime: string;
}

// Thứ Hai lên đầu như lịch Việt Nam, Chủ Nhật xếp cuối
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Giờ dạng HH:mm so sánh chuỗi được. Ngày đang tắt thì không cần kiểm tra */
export const isRowInvalid = (row: DayRow) =>
  row.isActive && (!row.startTime || !row.endTime || row.endTime <= row.startTime);

const PRESETS: { label: string; icon: LucideIcon; apply: (row: DayRow) => DayRow }[] = [
  {
    label: "Ca hành chính (08:00 - 17:30)",
    icon: BriefcaseBusiness,
    apply: (row) => ({ ...row, startTime: "08:00", endTime: "17:30" }),
  },
  {
    label: "Ca sáng (08:00 - 12:00)",
    icon: Sun,
    apply: (row) => ({ ...row, startTime: "08:00", endTime: "12:00" }),
  },
  {
    label: "Ca chiều (13:30 - 18:00)",
    icon: Sunset,
    apply: (row) => ({ ...row, startTime: "13:30", endTime: "18:00" }),
  },
  {
    label: "Áp dụng Thứ 2 - Thứ 7",
    icon: CheckCheck,
    apply: (row) => ({ ...row, isActive: row.dayOfWeek !== 0 }),
  },
];

interface WeeklyScheduleCardProps {
  rows: DayRow[];
  onChange: (rows: DayRow[]) => void;
  isEmpty: boolean;
}

export function WeeklyScheduleCard({ rows, onChange, isEmpty }: WeeklyScheduleCardProps) {
  const activeCount = rows.filter((row) => row.isActive).length;

  const updateRow = (dayOfWeek: number, patch: Partial<DayRow>) =>
    onChange(rows.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row)));

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <CalendarRange className="size-5 text-primary" />
            Lịch làm việc lặp lại hàng tuần
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Khung giờ mở nhận đặt lịch theo từng ngày trong tuần
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <span className="size-1.5 rounded-full bg-primary" />
          {activeCount}/7 ngày đang nhận lịch
        </span>
      </div>

      {isEmpty && (
        <p className="mt-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
          Bạn chưa thiết lập lịch làm việc. Hãy chọn một mẫu ca hoặc bật từng ngày, rồi bấm lưu ở
          cuối trang.
        </p>
      )}

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Mẫu ca làm việc phổ biến
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                onChange(rows.map(preset.apply));
                toast.info(`Đã áp dụng mẫu ${preset.label}`);
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5"
            >
              <preset.icon className="size-3.5 text-primary" />
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-5 space-y-2">
        {WEEK_ORDER.map((dayOfWeek) => {
          const row = rows.find((item) => item.dayOfWeek === dayOfWeek);
          if (!row) return null;
          const invalid = isRowInvalid(row);

          return (
            <li
              key={dayOfWeek}
              id={`day-row-${dayOfWeek}`}
              className={cn(
                "rounded-xl border p-3 transition",
                row.isActive ? "border-border bg-background" : "border-border/60 bg-muted/40",
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex cursor-pointer items-center gap-3">
                  <Switch
                    checked={row.isActive}
                    onCheckedChange={(checked) => updateRow(dayOfWeek, { isActive: checked })}
                    aria-label={`Nhận lịch ${DAY_NAMES[dayOfWeek]}`}
                  />
                  <span
                    className={cn(
                      "w-20 text-sm font-semibold",
                      row.isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {DAY_NAMES[dayOfWeek]}
                  </span>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <TimeInput
                    label="Từ"
                    value={row.startTime}
                    disabled={!row.isActive}
                    invalid={invalid}
                    onChange={(value) => updateRow(dayOfWeek, { startTime: value })}
                  />
                  <span className="text-muted-foreground">—</span>
                  <TimeInput
                    label="Đến"
                    value={row.endTime}
                    disabled={!row.isActive}
                    invalid={invalid}
                    onChange={(value) => updateRow(dayOfWeek, { endTime: value })}
                  />
                  {!row.isActive && (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Nghỉ ngơi
                    </span>
                  )}
                </div>
              </div>

              {invalid && (
                <p className="mt-2 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3.5" />
                  Giờ kết thúc phải lớn hơn giờ bắt đầu
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TimeInput({
  label,
  value,
  disabled,
  invalid,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        disabled && "opacity-50",
      )}
    >
      {label}
      <input
        type="time"
        value={value}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed aria-invalid:border-destructive"
      />
    </label>
  );
}
