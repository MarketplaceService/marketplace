import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ProviderProfile } from '../provider/entities/provider-profile.entity';
import { BusyInterval } from './booking-calendar';
import { ScheduleService } from './schedule.service';

const USER_ID = 'user-1';
const PROVIDER_ID = 'provider-1';
const NOW = new Date('2026-11-16T09:00:00+07:00');

describe('ScheduleService', () => {
  let profileRepository: { findOne: jest.Mock };
  let availabilityRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    delete: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    manager: { transaction: jest.Mock };
  };
  let timeOffRepository: {
    find: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };
  let bookingCalendar: { findBusyIntervals: jest.Mock };
  let service: ScheduleService;

  beforeEach(() => {
    profileRepository = {
      findOne: jest.fn().mockResolvedValue({ id: PROVIDER_ID }),
    };
    availabilityRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
      save: jest.fn((value: unknown) => Promise.resolve(value)),
      create: jest.fn((value: unknown) => value),
      manager: { transaction: jest.fn() },
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === ProviderProfile ? profileRepository : availabilityRepository,
      ),
    };
    availabilityRepository.manager.transaction.mockImplementation(
      (work: (m: typeof manager) => unknown) => work(manager),
    );
    timeOffRepository = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn((value: object) =>
        Promise.resolve({ id: 'time-off-1', ...value }),
      ),
      create: jest.fn((value: unknown) => value),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    bookingCalendar = { findBusyIntervals: jest.fn().mockResolvedValue([]) };

    service = new ScheduleService(
      profileRepository as never,
      availabilityRepository as never,
      timeOffRepository as never,
      bookingCalendar,
    );
  });

  describe('lịch tuần', () => {
    it('trả 404 khi người dùng chưa có hồ sơ thợ', async () => {
      profileRepository.findOne.mockResolvedValue(null);

      await expect(service.listAvailability(USER_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('PUT trả 400 khi giờ kết thúc không sau giờ bắt đầu', async () => {
      await expect(
        service.replaceAvailability(USER_ID, [
          { dayOfWeek: 1, startTime: '10:00', endTime: '10:00' },
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(availabilityRepository.manager.transaction).not.toHaveBeenCalled();
    });

    it('PUT trả 409 khi hai ca cùng thứ chồng nhau, khác thứ thì vẫn lưu', async () => {
      await expect(
        service.replaceAvailability(USER_ID, [
          { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' },
          { dayOfWeek: 1, startTime: '11:30', endTime: '17:00' },
        ]),
      ).rejects.toBeInstanceOf(ConflictException);

      await expect(
        service.replaceAvailability(USER_ID, [
          { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' },
          { dayOfWeek: 2, startTime: '11:30', endTime: '17:00' },
        ]),
      ).resolves.toBeDefined();
    });

    it('PUT xóa lịch cũ rồi lưu lịch mới của đúng thợ trong transaction', async () => {
      await service.replaceAvailability(USER_ID, [
        { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' },
        { dayOfWeek: 0, startTime: '08:00', endTime: '12:00', isActive: false },
      ]);

      expect(availabilityRepository.delete).toHaveBeenCalledWith({
        providerId: PROVIDER_ID,
      });
      expect(availabilityRepository.save).toHaveBeenCalledWith([
        expect.objectContaining({
          dayOfWeek: 1,
          isActive: true,
          providerId: PROVIDER_ID,
        }),
        expect.objectContaining({
          dayOfWeek: 0,
          isActive: false,
          providerId: PROVIDER_ID,
        }),
      ]);
      expect(profileRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
    });

    it('POST trả 409 khi chồng lên ca đã có, kể cả ca đang tắt', async () => {
      availabilityRepository.find.mockResolvedValue([
        {
          id: 'a',
          dayOfWeek: 1,
          startTime: '08:00:00',
          endTime: '12:00:00',
          isActive: false,
        },
      ]);

      await expect(
        service.addAvailability(USER_ID, {
          dayOfWeek: 1,
          startTime: '11:00',
          endTime: '13:00',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('POST cho phép ca nối tiếp ngay sau ca cũ', async () => {
      availabilityRepository.find.mockResolvedValue([
        {
          id: 'a',
          dayOfWeek: 1,
          startTime: '08:00:00',
          endTime: '12:00:00',
          isActive: true,
        },
      ]);

      await expect(
        service.addAvailability(USER_ID, {
          dayOfWeek: 1,
          startTime: '12:00',
          endTime: '13:00',
        }),
      ).resolves.toMatchObject({ providerId: PROVIDER_ID, isActive: true });
    });

    it('PATCH trả 404 khi ca không thuộc thợ đang đăng nhập', async () => {
      availabilityRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateAvailability(USER_ID, 'other', { isActive: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(availabilityRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'other', providerId: PROVIDER_ID },
      });
    });

    it('PATCH chỉ đổi isActive thì không kiểm tra chồng ca', async () => {
      availabilityRepository.findOne.mockResolvedValue({
        id: 'a',
        dayOfWeek: 1,
        startTime: '08:00:00',
        endTime: '12:00:00',
        isActive: true,
      });

      await expect(
        service.updateAvailability(USER_ID, 'a', { isActive: false }),
      ).resolves.toMatchObject({ isActive: false });
      expect(availabilityRepository.find).not.toHaveBeenCalled();
    });

    it('PATCH đổi giờ chồng lên ca khác thì 409', async () => {
      availabilityRepository.findOne.mockResolvedValue({
        id: 'a',
        dayOfWeek: 1,
        startTime: '08:00:00',
        endTime: '10:00:00',
        isActive: true,
      });
      availabilityRepository.find.mockResolvedValue([
        {
          id: 'a',
          dayOfWeek: 1,
          startTime: '08:00:00',
          endTime: '10:00:00',
          isActive: true,
        },
        {
          id: 'b',
          dayOfWeek: 1,
          startTime: '13:00:00',
          endTime: '17:00:00',
          isActive: true,
        },
      ]);

      await expect(
        service.updateAvailability(USER_ID, 'a', { endTime: '14:00' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('khoảng nghỉ', () => {
    const timeOff = (startAt: string, endAt: string) => ({
      startAt,
      endAt,
      reason: 'Việc gia đình',
    });

    it('trả 400 khi kết thúc không sau bắt đầu', async () => {
      await expect(
        service.addTimeOff(
          USER_ID,
          timeOff('2026-11-20T10:00:00+07:00', '2026-11-20T10:00:00+07:00'),
          NOW,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('trả 400 khi khoảng nghỉ đã kết thúc', async () => {
      await expect(
        service.addTimeOff(
          USER_ID,
          timeOff('2026-11-16T06:00:00+07:00', '2026-11-16T08:00:00+07:00'),
          NOW,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('trả 409 kèm mã đơn khi trùng đơn đã xác nhận', async () => {
      const busy: BusyInterval[] = [
        {
          startAt: new Date('2026-11-20T14:00:00+07:00'),
          endAt: new Date('2026-11-20T15:00:00+07:00'),
          status: 'BOOKED',
          bookingCode: 'SV-2026-089',
        },
      ];
      bookingCalendar.findBusyIntervals.mockResolvedValue(busy);

      const attempt = service.addTimeOff(
        USER_ID,
        timeOff('2026-11-20T13:30:00+07:00', '2026-11-20T16:00:00+07:00'),
        NOW,
      );

      await expect(attempt).rejects.toBeInstanceOf(ConflictException);
      await expect(attempt).rejects.toThrow('SV-2026-089');
      expect(timeOffRepository.save).not.toHaveBeenCalled();
    });

    it('vẫn lưu khi chỉ trùng đơn đang tạm giữ', async () => {
      bookingCalendar.findBusyIntervals.mockResolvedValue([
        {
          startAt: new Date('2026-11-20T14:00:00+07:00'),
          endAt: new Date('2026-11-20T15:00:00+07:00'),
          status: 'HELD',
        },
      ]);

      await expect(
        service.addTimeOff(
          USER_ID,
          timeOff('2026-11-20T13:30:00+07:00', '2026-11-20T16:00:00+07:00'),
          NOW,
        ),
      ).resolves.toMatchObject({
        providerId: PROVIDER_ID,
        reason: 'Việc gia đình',
      });
    });

    it('trả 404 khi xóa khoảng nghỉ không thuộc thợ', async () => {
      timeOffRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(
        service.removeTimeOff(USER_ID, 'other'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(timeOffRepository.delete).toHaveBeenCalledWith({
        id: 'other',
        providerId: PROVIDER_ID,
      });
    });
  });
});
