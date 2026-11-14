import { Injectable } from '@nestjs/common';

export type BusyIntervalStatus = 'HELD' | 'BOOKED';

export interface BusyInterval {
  startAt: Date;
  endAt: Date;
  /** HELD: đơn PENDING còn trong thời gian giữ chỗ. BOOKED: đơn CONFIRMED hoặc IN_PROGRESS */
  status: BusyIntervalStatus;
  bookingCode?: string;
}

/**
 * Chỗ nối giữa lịch làm việc và module đặt lịch (#133).
 * Lịch dùng nó để đánh dấu slot "Tạm giữ", "Đã kín" và chặn khoảng nghỉ trùng đơn đã nhận.
 * Module booking cần cung cấp bản cài đặt đọc bảng booking cho token này.
 */
export abstract class ProviderBookingCalendar {
  abstract findBusyIntervals(
    providerId: string,
    from: Date,
    to: Date,
  ): Promise<BusyInterval[]>;
}

/** Dùng tạm khi chưa có bảng booking: thợ chưa có đơn nào chiếm lịch */
@Injectable()
export class EmptyBookingCalendar extends ProviderBookingCalendar {
  findBusyIntervals(): Promise<BusyInterval[]> {
    return Promise.resolve<BusyInterval[]>([]);
  }
}
