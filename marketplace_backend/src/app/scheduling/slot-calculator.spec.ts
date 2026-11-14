import { BusyInterval } from './booking-calendar';
import { AvailabilityWindow, buildDaySlots } from './slot-calculator';

const MONDAY = '2026-11-16';
const SUNDAY = '2026-11-15';
const DAY_BEFORE = new Date('2026-11-15T00:00:00+07:00');

const at = (date: string, time: string) => new Date(`${date}T${time}:00+07:00`);

const officeHours: AvailabilityWindow = {
  dayOfWeek: 1,
  startTime: '08:00:00',
  endTime: '17:30:00',
  isActive: true,
};

const build = (overrides: Partial<Parameters<typeof buildDaySlots>[0]> = {}) =>
  buildDaySlots({
    date: MONDAY,
    durationMinutes: 60,
    windows: [officeHours],
    timeOffs: [],
    busy: [],
    now: DAY_BEFORE,
    ...overrides,
  });

const starts = (slots: ReturnType<typeof buildDaySlots>) =>
  slots.map((slot) => slot.startTime);

describe('buildDaySlots', () => {
  it('chia ca 08:00–17:30 thành 9 slot 60 phút và bỏ phần lẻ cuối ca', () => {
    const slots = build();

    expect(slots).toHaveLength(9);
    expect(slots[0]).toMatchObject({ startTime: '08:00', endTime: '09:00' });
    expect(slots[8]).toMatchObject({ startTime: '16:00', endTime: '17:00' });
    expect(slots.every((slot) => slot.status === 'AVAILABLE')).toBe(true);
  });

  it('trả mốc thời gian theo giờ Việt Nam', () => {
    const [first] = build();

    expect(first.startAt.toISOString()).toBe('2026-11-16T01:00:00.000Z');
    expect(first.endAt.toISOString()).toBe('2026-11-16T02:00:00.000Z');
  });

  it('chia slot 90 phút nối tiếp nhau', () => {
    expect(starts(build({ durationMinutes: 90 }))).toEqual([
      '08:00',
      '09:30',
      '11:00',
      '12:30',
      '14:00',
      '15:30',
    ]);
  });

  it('chỉ lấy ca đang bật của đúng thứ trong tuần', () => {
    expect(build({ windows: [{ ...officeHours, isActive: false }] })).toEqual(
      [],
    );
    expect(build({ windows: [{ ...officeHours, dayOfWeek: 2 }] })).toEqual([]);
  });

  it('xác định thứ theo ngày lịch: 2026-11-15 là Chủ Nhật (0)', () => {
    const slots = build({
      date: SUNDAY,
      windows: [{ ...officeHours, dayOfWeek: 0 }],
      now: new Date('2026-11-14T00:00:00+07:00'),
    });

    expect(slots).toHaveLength(9);
  });

  it('bỏ slot giao với khoảng nghỉ, giữ slot chỉ chạm mép khoảng nghỉ', () => {
    const slots = build({
      timeOffs: [{ startAt: at(MONDAY, '10:30'), endAt: at(MONDAY, '12:00') }],
    });

    expect(starts(slots)).toEqual([
      '08:00',
      '09:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
    ]);
  });

  it('khoảng nghỉ kéo dài qua nhiều ngày thì bỏ hết slot của ngày đó', () => {
    const slots = build({
      timeOffs: [
        {
          startAt: at(SUNDAY, '18:00'),
          endAt: new Date('2026-11-17T08:00:00+07:00'),
        },
      ],
    });

    expect(slots).toEqual([]);
  });

  it('bỏ các slot đã bắt đầu khi xem lịch hôm nay', () => {
    const slots = build({ now: at(MONDAY, '10:15') });

    expect(starts(slots)[0]).toBe('11:00');
    expect(slots).toHaveLength(6);
  });

  it('gắn trạng thái theo đơn giao với slot, BOOKED được ưu tiên hơn HELD', () => {
    const busy: BusyInterval[] = [
      {
        startAt: at(MONDAY, '09:00'),
        endAt: at(MONDAY, '10:00'),
        status: 'HELD',
      },
      {
        startAt: at(MONDAY, '13:30'),
        endAt: at(MONDAY, '14:30'),
        status: 'BOOKED',
      },
      {
        startAt: at(MONDAY, '16:00'),
        endAt: at(MONDAY, '16:30'),
        status: 'HELD',
      },
      {
        startAt: at(MONDAY, '16:15'),
        endAt: at(MONDAY, '17:00'),
        status: 'BOOKED',
      },
    ];

    const statuses = Object.fromEntries(
      build({ busy }).map((slot) => [slot.startTime, slot.status]),
    );

    expect(statuses).toMatchObject({
      '08:00': 'AVAILABLE',
      '09:00': 'HELD',
      '10:00': 'AVAILABLE',
      '13:00': 'BOOKED',
      '14:00': 'BOOKED',
      '15:00': 'AVAILABLE',
      '16:00': 'BOOKED',
    });
  });

  it('ghép nhiều ca trong một ngày theo thứ tự giờ', () => {
    const slots = build({
      windows: [
        { ...officeHours, startTime: '13:30', endTime: '15:30' },
        { ...officeHours, startTime: '08:00', endTime: '10:00' },
      ],
    });

    expect(starts(slots)).toEqual(['08:00', '09:00', '13:30', '14:30']);
  });
});
