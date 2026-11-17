import {
  dayOfWeekOf,
  minutesToTime,
  timeToMinutes,
  vnDateTime,
} from 'src/shared/utils/vn-time';
import { BusyInterval } from './booking-calendar';

export type SlotStatus = 'AVAILABLE' | 'HELD' | 'BOOKED';

export interface AvailabilityWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface TimeRange {
  startAt: Date;
  endAt: Date;
}

export interface DaySlot extends TimeRange {
  startTime: string;
  endTime: string;
  status: SlotStatus;
}

export interface BuildDaySlotsInput {
  /** Ngày cần xem, dạng YYYY-MM-DD theo giờ Việt Nam */
  date: string;
  durationMinutes: number;
  windows: AvailabilityWindow[];
  timeOffs: TimeRange[];
  busy: BusyInterval[];
  now: Date;
}

const overlaps = (a: TimeRange, b: TimeRange) =>
  a.startAt < b.endAt && b.startAt < a.endAt;

function statusOf(slot: TimeRange, busy: BusyInterval[]): SlotStatus {
  const hits = busy.filter((interval) => overlaps(slot, interval));
  if (hits.some((interval) => interval.status === 'BOOKED')) return 'BOOKED';
  return hits.length > 0 ? 'HELD' : 'AVAILABLE';
}

/**
 * Chia các ca đang bật của ngày `date` thành slot nối tiếp nhau.
 * Slot giao với khoảng nghỉ hoặc đã bắt đầu thì bị bỏ hẳn; slot giao với đơn đặt lịch
 * vẫn được trả về nhưng mang trạng thái HELD hoặc BOOKED.
 */
export function buildDaySlots({
  date,
  durationMinutes,
  windows,
  timeOffs,
  busy,
  now,
}: BuildDaySlotsInput): DaySlot[] {
  const dayOfWeek = dayOfWeekOf(date);
  const slots: DaySlot[] = [];

  const dayWindows = windows
    .filter((window) => window.isActive && window.dayOfWeek === dayOfWeek)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  for (const window of dayWindows) {
    const windowEnd = timeToMinutes(window.endTime);

    for (
      let start = timeToMinutes(window.startTime);
      start + durationMinutes <= windowEnd;
      start += durationMinutes
    ) {
      const startTime = minutesToTime(start);
      const endTime = minutesToTime(start + durationMinutes);
      const range = {
        startAt: vnDateTime(date, startTime),
        endAt: vnDateTime(date, endTime),
      };

      if (range.startAt <= now) continue;
      if (timeOffs.some((timeOff) => overlaps(range, timeOff))) continue;

      slots.push({
        ...range,
        startTime,
        endTime,
        status: statusOf(range, busy),
      });
    }
  }

  return slots;
}
