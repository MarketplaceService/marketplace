import { BookingStatus } from 'src/shared/types/booking-status.enum';
import { TypeOrmBookingCalendar } from './typeorm-booking-calendar';

describe('TypeOrmBookingCalendar', () => {
  it('map PENDING -> HELD, CONFIRMED/IN_PROGRESS -> BOOKED và chỉ query trạng thái mở', async () => {
    const findMock = jest.fn().mockResolvedValue([
      {
        bookingCode: 'SV-20261122-AAA111',
        status: BookingStatus.PENDING,
        scheduledStartAt: new Date('2026-11-22T09:00:00+07:00'),
        scheduledEndAt: new Date('2026-11-22T10:00:00+07:00'),
      },
      {
        bookingCode: 'SV-20261122-BBB222',
        status: BookingStatus.CONFIRMED,
        scheduledStartAt: new Date('2026-11-22T11:00:00+07:00'),
        scheduledEndAt: new Date('2026-11-22T12:00:00+07:00'),
      },
      {
        bookingCode: 'SV-20261122-CCC333',
        status: BookingStatus.IN_PROGRESS,
        scheduledStartAt: new Date('2026-11-22T14:00:00+07:00'),
        scheduledEndAt: new Date('2026-11-22T15:00:00+07:00'),
      },
    ]);

    const calendar = new TypeOrmBookingCalendar({ find: findMock } as never);
    const from = new Date('2026-11-22T00:00:00+07:00');
    const to = new Date('2026-11-23T00:00:00+07:00');

    const intervals = await calendar.findBusyIntervals('provider-1', from, to);

    expect(findMock).toHaveBeenCalledTimes(1);
    const firstCall = findMock.mock.calls[0] as Array<{
      where: { status: { value: BookingStatus[] } };
    }>;
    const queryArg = firstCall[0];
    expect(queryArg.where.status.value).toEqual([
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.IN_PROGRESS,
    ]);

    expect(intervals).toEqual([
      {
        startAt: new Date('2026-11-22T09:00:00+07:00'),
        endAt: new Date('2026-11-22T10:00:00+07:00'),
        status: 'HELD',
        bookingCode: 'SV-20261122-AAA111',
      },
      {
        startAt: new Date('2026-11-22T11:00:00+07:00'),
        endAt: new Date('2026-11-22T12:00:00+07:00'),
        status: 'BOOKED',
        bookingCode: 'SV-20261122-BBB222',
      },
      {
        startAt: new Date('2026-11-22T14:00:00+07:00'),
        endAt: new Date('2026-11-22T15:00:00+07:00'),
        status: 'BOOKED',
        bookingCode: 'SV-20261122-CCC333',
      },
    ]);
  });
});
