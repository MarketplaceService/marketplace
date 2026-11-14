"use client";

import { notifyComingSoon } from "@/components/header/header-nav-link";
import { Button } from "@/components/ui/button";
import { useAvailableSlots } from "@/hooks/use-schedule";
import { cn } from "@/lib/utils";
import {
  addDays,
  DAY_NAMES,
  DAY_SHORT_NAMES,
  dayOfWeekOf,
  formatDateOnly,
  todayInVietnam,
} from "@/lib/vn-time";
import type { AvailableSlot, SlotStatus } from "@/services/schedule.services";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Clock,
  LockKeyhole,
} from "lucide-react";
import { useState } from "react";

// Backend chỉ trả khung giờ trong 30 ngày tới
const MAX_DAYS_AHEAD = 30;
const DAYS_PER_PAGE = 7;
// Chưa có module dịch vụ nên dùng slot 60 phút; sau này lấy theo thời lượng của dịch vụ đã chọn
const SLOT_MINUTES = 60;

const STATUS_LEGEND: { status: SlotStatus; label: string; dotClass: string }[] = [
  { status: "AVAILABLE", label: "Còn trống", dotClass: "bg-primary" },
  { status: "HELD", label: "Tạm giữ", dotClass: "bg-warning" },
  { status: "BOOKED", label: "Đã kín", dotClass: "bg-muted-foreground/50" },
];

export function SlotPicker({ providerId }: { providerId: string }) {
  const [today] = useState(() => todayInVietnam());
  const lastDay = addDays(today, MAX_DAYS_AHEAD);
  const [pageStart, setPageStart] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  const days = Array.from({ length: DAYS_PER_PAGE }, (_, index) => addDays(pageStart, index)).filter(
    (date) => date <= lastDay,
  );

  const { data, isLoading, isError } = useAvailableSlots(providerId, selectedDate, SLOT_MINUTES);
  const slots = data?.slots ?? [];

  const selectDate = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const movePage = (direction: 1 | -1) => {
    const nextStart = addDays(pageStart, direction * DAYS_PER_PAGE);
    setPageStart(nextStart);
    selectDate(nextStart);
  };

  const selectedDayLabel = `${DAY_NAMES[dayOfWeekOf(selectedDate)]}, ${formatDateOnly(selectedDate)}`;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Chọn ngày &amp; khung giờ phục vụ</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Khung giờ trống được tính theo lịch làm việc và ngày nghỉ của thợ
          </p>
        </div>
        <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {STATUS_LEGEND.map((item) => (
            <li
              key={item.status}
              className="flex items-center gap-1.5"
            >
              <span className={cn("size-2.5 rounded-full", item.dotClass)} />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Chọn ngày phục vụ (tháng {selectedDate.slice(5, 7)}/{selectedDate.slice(0, 4)})
          </p>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={pageStart <= today}
              onClick={() => movePage(-1)}
              aria-label="Tuần trước"
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={addDays(pageStart, DAYS_PER_PAGE) > lastDay}
              onClick={() => movePage(1)}
              aria-label="Tuần sau"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {days.map((date) => {
            const isSelected = date === selectedDate;
            return (
              <button
                key={date}
                type="button"
                onClick={() => selectDate(date)}
                aria-pressed={isSelected}
                className={cn(
                  "cursor-pointer rounded-xl border px-1 py-2.5 text-center transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20"
                    : "border-border hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "block text-[11px] font-medium",
                    isSelected ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {DAY_SHORT_NAMES[dayOfWeekOf(date)]}
                </span>
                <span className="block text-base font-bold">{date.slice(8, 10)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Khung giờ khả dụng • {selectedDayLabel}
          </p>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            Thời lượng: {SLOT_MINUTES} phút
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        ) : isError ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Không tải được khung giờ, bạn hãy thử lại sau.
          </p>
        ) : slots.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Thợ không nhận lịch vào ngày này hoặc đã hết khung giờ trống. Bạn hãy chọn ngày khác.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map((slot) => (
              <SlotCard
                key={slot.startAt}
                slot={slot}
                isSelected={selectedSlot?.startAt === slot.startAt}
                onSelect={() => setSelectedSlot(slot)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarCheck className="size-4 text-primary" />
          {selectedSlot ? (
            <span>
              Đã chọn{" "}
              <strong className="text-foreground">
                {selectedSlot.startTime} - {selectedSlot.endTime}
              </strong>{" "}
              • {selectedDayLabel}
            </span>
          ) : (
            <span>Chọn một khung giờ còn trống để tiếp tục</span>
          )}
        </p>
        <Button
          type="button"
          size="lg"
          disabled={!selectedSlot}
          onClick={notifyComingSoon}
          className="px-4"
        >
          Tiếp tục đặt lịch
        </Button>
      </div>
    </section>
  );
}

function SlotCard({
  slot,
  isSelected,
  onSelect,
}: {
  slot: AvailableSlot;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const range = `${slot.startTime} - ${slot.endTime}`;

  if (slot.status === "BOOKED") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/50 p-3 text-muted-foreground">
        <div>
          <p className="text-sm font-semibold line-through">{range}</p>
          <p className="text-xs">Đã kín lịch</p>
        </div>
      </div>
    );
  }

  if (slot.status === "HELD") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-warning/40 bg-warning/10 p-3 text-warning">
        <div>
          <p className="text-sm font-semibold">{range}</p>
          <p className="text-xs">Đang tạm giữ</p>
        </div>
        <LockKeyhole className="size-4" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={cn(
        "flex cursor-pointer items-center justify-between rounded-xl p-3 text-left text-primary transition-colors",
        isSelected
          ? "border-2 border-primary bg-primary/10 ring-2 ring-primary/20"
          : "border border-primary/30 bg-primary/5 hover:bg-primary/10",
      )}
    >
      <div>
        <p className="text-sm font-semibold">{range}</p>
        <p className="text-xs">{isSelected ? "Đang chọn" : "Sẵn sàng phục vụ"}</p>
      </div>
      <CirclePlus className="size-4" />
    </button>
  );
}
