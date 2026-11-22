import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { BookingStatus } from 'src/shared/types/booking-status.enum';
import {
  assertBookingTransition,
  hasRequiredInspectionPhotos,
} from './booking-state-machine';

describe('booking-state-machine', () => {
  describe('các chuyển đổi hợp lệ', () => {
    it('cho phép PROVIDER xác nhận và từ chối đơn PENDING', () => {
      expect(() =>
        assertBookingTransition({
          currentStatus: BookingStatus.PENDING,
          targetStatus: BookingStatus.CONFIRMED,
          actor: 'PROVIDER',
        }),
      ).not.toThrow();

      expect(() =>
        assertBookingTransition({
          currentStatus: BookingStatus.PENDING,
          targetStatus: BookingStatus.REJECTED,
          actor: 'PROVIDER',
        }),
      ).not.toThrow();
    });

    it('cho phép CUSTOMER, PROVIDER, ADMIN hủy đơn ở PENDING hoặc CONFIRMED', () => {
      for (const status of [BookingStatus.PENDING, BookingStatus.CONFIRMED]) {
        for (const actor of ['CUSTOMER', 'PROVIDER', 'ADMIN'] as const) {
          expect(() =>
            assertBookingTransition({
              currentStatus: status,
              targetStatus: BookingStatus.CANCELLED,
              actor,
            }),
          ).not.toThrow();
        }
      }
    });

    it('cho phép PROVIDER bắt đầu đơn CONFIRMED -> IN_PROGRESS', () => {
      expect(() =>
        assertBookingTransition({
          currentStatus: BookingStatus.CONFIRMED,
          targetStatus: BookingStatus.IN_PROGRESS,
          actor: 'PROVIDER',
        }),
      ).not.toThrow();
    });

    it('cho phép CUSTOMER hoàn tất IN_PROGRESS -> COMPLETED khi có đủ ảnh Before/After', () => {
      expect(() =>
        assertBookingTransition({
          currentStatus: BookingStatus.IN_PROGRESS,
          targetStatus: BookingStatus.COMPLETED,
          actor: 'CUSTOMER',
          hasInspectionImages: true,
        }),
      ).not.toThrow();
    });
  });

  describe('kiểm tra quyền actor (403 Forbidden)', () => {
    it('từ chối CUSTOMER xác nhận/từ chối/bắt đầu đơn', () => {
      expect(() =>
        assertBookingTransition({
          currentStatus: BookingStatus.PENDING,
          targetStatus: BookingStatus.CONFIRMED,
          actor: 'CUSTOMER',
        }),
      ).toThrow(ForbiddenException);

      expect(() =>
        assertBookingTransition({
          currentStatus: BookingStatus.PENDING,
          targetStatus: BookingStatus.REJECTED,
          actor: 'CUSTOMER',
        }),
      ).toThrow(ForbiddenException);

      expect(() =>
        assertBookingTransition({
          currentStatus: BookingStatus.CONFIRMED,
          targetStatus: BookingStatus.IN_PROGRESS,
          actor: 'CUSTOMER',
        }),
      ).toThrow(ForbiddenException);
    });

    it('từ chối PROVIDER hoặc ADMIN tự nghiệm thu hoàn tất thay CUSTOMER', () => {
      expect(() =>
        assertBookingTransition({
          currentStatus: BookingStatus.IN_PROGRESS,
          targetStatus: BookingStatus.COMPLETED,
          actor: 'PROVIDER',
          hasInspectionImages: true,
        }),
      ).toThrow(ForbiddenException);

      expect(() =>
        assertBookingTransition({
          currentStatus: BookingStatus.IN_PROGRESS,
          targetStatus: BookingStatus.COMPLETED,
          actor: 'ADMIN',
          hasInspectionImages: true,
        }),
      ).toThrow(ForbiddenException);
    });
  });

  describe('kiểm tra trạng thái bất hợp lệ & điều kiện (400 / 409)', () => {
    it('ném 400 nếu hoàn tất IN_PROGRESS -> COMPLETED nhưng thiếu ảnh Before/After', () => {
      expect(() =>
        assertBookingTransition({
          currentStatus: BookingStatus.IN_PROGRESS,
          targetStatus: BookingStatus.COMPLETED,
          actor: 'CUSTOMER',
          hasInspectionImages: false,
        }),
      ).toThrow(BadRequestException);
    });

    it('ném 409 cấm hủy đơn đang IN_PROGRESS', () => {
      expect(() =>
        assertBookingTransition({
          currentStatus: BookingStatus.IN_PROGRESS,
          targetStatus: BookingStatus.CANCELLED,
          actor: 'CUSTOMER',
        }),
      ).toThrow(ConflictException);
    });

    it('ném 409 khi nhảy cóc trạng thái (PENDING -> IN_PROGRESS hoặc PENDING -> COMPLETED)', () => {
      expect(() =>
        assertBookingTransition({
          currentStatus: BookingStatus.PENDING,
          targetStatus: BookingStatus.IN_PROGRESS,
          actor: 'PROVIDER',
        }),
      ).toThrow(ConflictException);

      expect(() =>
        assertBookingTransition({
          currentStatus: BookingStatus.PENDING,
          targetStatus: BookingStatus.COMPLETED,
          actor: 'CUSTOMER',
          hasInspectionImages: true,
        }),
      ).toThrow(ConflictException);
    });

    it('ném 409 khi thao tác trên terminal states (COMPLETED, CANCELLED, REJECTED)', () => {
      for (const terminal of [
        BookingStatus.COMPLETED,
        BookingStatus.CANCELLED,
        BookingStatus.REJECTED,
      ]) {
        expect(() =>
          assertBookingTransition({
            currentStatus: terminal,
            targetStatus: BookingStatus.CONFIRMED,
            actor: 'PROVIDER',
          }),
        ).toThrow(ConflictException);
      }
    });
  });

  describe('hasRequiredInspectionPhotos', () => {
    it('trả true chỉ khi có ít nhất 1 ảnh before và 1 ảnh after', () => {
      expect(hasRequiredInspectionPhotos(null)).toBe(false);
      expect(
        hasRequiredInspectionPhotos({
          before: [
            { url: 'https://a.jpg', capturedAt: '2026-11-21T10:00:00Z' },
          ],
          after: [],
        }),
      ).toBe(false);
      expect(
        hasRequiredInspectionPhotos({
          before: [
            { url: 'https://a.jpg', capturedAt: '2026-11-21T10:00:00Z' },
          ],
          after: [{ url: 'https://b.jpg', capturedAt: '2026-11-21T11:00:00Z' }],
        }),
      ).toBe(true);
    });
  });
});
