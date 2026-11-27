import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BookingStatus } from 'src/shared/types/booking-status.enum';
import { PaymentMethod } from 'src/shared/types/payment-method.enum';
import { PaymentStatus } from 'src/shared/types/payment-status.enum';
import { UserRole } from 'src/shared/types/user-role.enum';
import { FindOperator } from 'typeorm';
import { Payment } from './entities/payment.entity';
import {
  parsePayosDateTime,
  PaymentService,
  toPayosDescription,
} from './payment.service';
import { PayosApiError } from './payos/payos.service';

const CUSTOMER = { id: 'customer-1', role: UserRole.CUSTOMER };
const PROVIDER = { id: 'provider-user-1', role: UserRole.PROVIDER };
const STRANGER = { id: 'someone-else', role: UserRole.CUSTOMER };
const BOOKING_ID = 'booking-1';

type Where = Record<string, unknown>;

function matches(row: Record<string, unknown>, where: Where = {}): boolean {
  return Object.entries(where).every(([key, condition]) => {
    const value = row[key];
    if (condition instanceof FindOperator) {
      const operand = condition.value as unknown;
      switch (condition.type) {
        case 'in':
          return (operand as unknown[]).includes(value);
        case 'not':
          return value !== operand;
        case 'isNull':
          return value === null || value === undefined;
        default:
          throw new Error(`Operator chưa hỗ trợ: ${condition.type}`);
      }
    }
    return value === condition;
  });
}

const copyPayment = (row: Payment): Payment =>
  Object.assign(new Payment(), {
    ...row,
    paymentDetails: row.paymentDetails ? { ...row.paymentDetails } : null,
  });

/** Repository giả lưu trong bộ nhớ, trả bản sao để service phải gọi save mới thay đổi được dữ liệu */
class FakePaymentRepo {
  rows: Payment[] = [];
  private seq = 0;
  readonly save = jest.fn((input: Payment | Payment[]) => {
    const list = Array.isArray(input) ? input : [input];
    for (const item of list) {
      if (!item.id) {
        this.seq += 1;
        item.id = `pay-${this.seq}`;
        item.createdAt = new Date(Date.UTC(2026, 10, 27, 0, 0, this.seq));
      }
      item.updatedAt = new Date();
      const index = this.rows.findIndex((row) => row.id === item.id);
      if (index >= 0) this.rows[index] = copyPayment(item);
      else this.rows.push(copyPayment(item));
    }
    return Promise.resolve(input);
  });

  create(values: Partial<Payment>): Payment {
    return Object.assign(new Payment(), values);
  }

  find(options: { where?: Where } = {}): Promise<Payment[]> {
    return Promise.resolve(
      this.rows
        .filter((row) => matches(row as never, options.where))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map(copyPayment),
    );
  }

  async findOne(options: { where?: Where } = {}): Promise<Payment | null> {
    const [first] = await this.find(options);
    return first ?? null;
  }

  exists(options: { where?: Where } = {}): Promise<boolean> {
    return Promise.resolve(
      this.rows.some((row) => matches(row as never, options.where)),
    );
  }

  update(criteria: Where, patch: Partial<Payment>) {
    const targets = this.rows.filter((row) => matches(row as never, criteria));
    for (const row of targets) Object.assign(row, patch);
    return Promise.resolve({ affected: targets.length });
  }

  get(id: string): Payment {
    const row = this.rows.find((item) => item.id === id);
    if (!row) throw new Error(`Không có payment ${id}`);
    return row;
  }

  seed(values: Partial<Payment>): Payment {
    this.seq += 1;
    const row = Object.assign(new Payment(), {
      id: `pay-${this.seq}`,
      bookingId: BOOKING_ID,
      paymentMethod: PaymentMethod.COD,
      amount: 200000,
      currency: 'VND',
      status: PaymentStatus.PENDING,
      transactionId: null,
      payosOrderCode: null,
      paymentLinkId: null,
      paymentLinkUrl: null,
      paymentDetails: null,
      expiresAt: null,
      paidAt: null,
      refundedAt: null,
      createdAt: new Date(Date.UTC(2026, 10, 27, 0, 0, this.seq)),
      updatedAt: new Date(),
      ...values,
    });
    this.rows.push(row);
    return row;
  }
}

describe('PaymentService', () => {
  let paymentRepo: FakePaymentRepo;
  let booking: {
    id: string;
    bookingCode: string;
    status: BookingStatus;
    customerId: string;
    totalPrice: number;
    provider: { id: string; userId: string };
  };
  let payos: {
    isConfigured: jest.Mock;
    linkTtlMinutes: number;
    buildResultUrls: jest.Mock;
    createPaymentLink: jest.Mock;
    getPaymentLink: jest.Mock;
    cancelPaymentLink: jest.Mock;
    verifyWebhook: jest.Mock;
  };
  let manager: { getRepository: jest.Mock };
  let service: PaymentService;

  const payosRow = (values: Partial<Payment> = {}) =>
    paymentRepo.seed({
      paymentMethod: PaymentMethod.PAYOS,
      payosOrderCode: 1795777480086001,
      paymentLinkId: 'link-1',
      paymentLinkUrl: 'https://pay.payos.vn/web/link-1',
      expiresAt: new Date(Date.now() + 10 * 60_000),
      ...values,
    });

  const webhookOf = (data: Partial<Record<string, unknown>>) => ({
    success: true,
    data: {
      orderCode: 1795777480086001,
      amount: 200000,
      reference: 'FT-001',
      transactionDateTime: '2026-11-27 14:05:00',
      paymentLinkId: 'link-1',
      code: '00',
      ...data,
    },
  });

  beforeEach(() => {
    paymentRepo = new FakePaymentRepo();
    booking = {
      id: BOOKING_ID,
      bookingCode: 'SV-20261127-AABBCC',
      status: BookingStatus.PENDING,
      customerId: CUSTOMER.id,
      totalPrice: 200000,
      provider: { id: 'provider-1', userId: PROVIDER.id },
    };
    const bookingRepo = {
      findOne: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(where.id === booking.id ? { ...booking } : null),
      ),
    };
    payos = {
      isConfigured: jest.fn(() => true),
      linkTtlMinutes: 15,
      buildResultUrls: jest.fn((id: string) => ({
        returnUrl: `http://localhost:3000/payments/result/${id}`,
        cancelUrl: `http://localhost:3000/payments/result/${id}`,
      })),
      createPaymentLink: jest.fn((input: { orderCode: number }) =>
        Promise.resolve({
          paymentLinkId: `link-${input.orderCode}`,
          checkoutUrl: `https://pay.payos.vn/web/link-${input.orderCode}`,
          qrCode: '000201010212',
          accountNumber: '0123456789',
          accountName: 'NGUYEN VAN A',
          bin: '970422',
          description: 'SVAABBCC',
          amount: 200000,
          orderCode: input.orderCode,
          status: 'PENDING',
        }),
      ),
      getPaymentLink: jest.fn(),
      cancelPaymentLink: jest.fn().mockResolvedValue(undefined),
      verifyWebhook: jest.fn(),
    };
    manager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === Payment ? paymentRepo : bookingRepo,
      ),
    };
    const dataSource = {
      transaction: jest.fn((cb: (m: typeof manager) => Promise<unknown>) =>
        cb(manager),
      ),
    };
    service = new PaymentService(
      dataSource as never,
      paymentRepo as never,
      bookingRepo as never,
      payos as never,
      { setContext: jest.fn(), error: jest.fn(), warn: jest.fn() } as never,
    );
  });

  describe('hàm phụ', () => {
    it('nội dung chuyển khoản tối đa 9 ký tự, chỉ chữ và số', () => {
      expect(toPayosDescription('SV-20261127-AABBCC')).toBe('SVAABBCC');
      expect(toPayosDescription('SV-20261127-a1b2c3')).toHaveLength(8);
    });

    it('đọc giờ giao dịch PayOS theo giờ Việt Nam', () => {
      expect(parsePayosDateTime('2026-11-27 14:05:00')?.toISOString()).toBe(
        '2026-11-27T07:05:00.000Z',
      );
      expect(parsePayosDateTime('không phải ngày')).toBeNull();
      expect(parsePayosDateTime(null)).toBeNull();
    });
  });

  describe('tạo đơn', () => {
    it('không gửi phương thức thì tạo giao dịch tiền mặt đang chờ', async () => {
      const summary = await service.initPayment(manager as never, {
        bookingId: BOOKING_ID,
        amount: 200000,
      });

      expect(summary).toMatchObject({
        paymentMethod: PaymentMethod.COD,
        status: PaymentStatus.PENDING,
        amount: 200000,
        payosOrderCode: null,
      });
    });

    it('PayOS thì sinh orderCode 16 chữ số, chưa gọi PayOS trong transaction', async () => {
      const summary = await service.initPayment(manager as never, {
        bookingId: BOOKING_ID,
        amount: 200000,
        paymentMethod: PaymentMethod.PAYOS,
      });

      expect(String(summary?.payosOrderCode)).toMatch(/^\d{16}$/);
      expect(Number.isSafeInteger(summary?.payosOrderCode)).toBe(true);
      expect(payos.createPaymentLink).not.toHaveBeenCalled();
    });

    it('từ chối phương thức chưa hỗ trợ và PayOS chưa cấu hình', async () => {
      await expect(
        service.initPayment(manager as never, {
          bookingId: BOOKING_ID,
          amount: 200000,
          paymentMethod: PaymentMethod.VNPAY,
        }),
      ).rejects.toThrow(BadRequestException);

      payos.isConfigured.mockReturnValue(false);
      await expect(
        service.initPayment(manager as never, {
          bookingId: BOOKING_ID,
          amount: 200000,
          paymentMethod: PaymentMethod.PAYOS,
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('activatePayment tạo link PayOS và chỉ trả các trường công khai', async () => {
      const row = payosRow({
        paymentLinkId: null,
        paymentLinkUrl: null,
        expiresAt: null,
      });

      const summary = await service.activatePayment(BOOKING_ID);

      expect(payos.createPaymentLink).toHaveBeenCalledWith(
        expect.objectContaining({
          orderCode: row.payosOrderCode,
          amount: 200000,
          description: 'SVAABBCC',
          returnUrl: `http://localhost:3000/payments/result/${row.id}`,
        }),
      );
      const saved = paymentRepo.get(row.id);
      expect(saved.paymentLinkUrl).toContain('pay.payos.vn');
      expect(saved.expiresAt).toBeInstanceOf(Date);
      expect(summary?.paymentDetails).toMatchObject({
        qrCode: '000201010212',
        accountNumber: '0123456789',
      });
    });

    it('PayOS lỗi thì giao dịch thành failed và activatePayment không ném lỗi', async () => {
      const row = payosRow({ paymentLinkId: null, paymentLinkUrl: null });
      payos.createPaymentLink.mockRejectedValue(
        new PayosApiError('Đơn thanh toán đã tồn tại', '231', 200),
      );

      await expect(service.activatePayment(BOOKING_ID)).resolves.toMatchObject({
        status: PaymentStatus.FAILED,
      });
      expect(paymentRepo.get(row.id).status).toBe(PaymentStatus.FAILED);
    });
  });

  describe('webhook', () => {
    it('đủ tiền thì chốt giao dịch, gọi lặp không ghi thêm', async () => {
      const row = payosRow();
      payos.verifyWebhook.mockReturnValue(webhookOf({}));

      await expect(service.handlePayosWebhook({})).resolves.toEqual({
        success: true,
      });
      const saved = paymentRepo.get(row.id);
      expect(saved.status).toBe(PaymentStatus.COMPLETED);
      expect(saved.transactionId).toBe('FT-001');
      expect(saved.paidAt?.toISOString()).toBe('2026-11-27T07:05:00.000Z');

      const savesAfterFirst = paymentRepo.save.mock.calls.length;
      await service.handlePayosWebhook({});
      expect(paymentRepo.save.mock.calls.length).toBe(savesAfterFirst);
    });

    it('orderCode không có trong DB vẫn trả 200 (payload mẫu khi xác nhận webhook)', async () => {
      payos.verifyWebhook.mockReturnValue(webhookOf({ orderCode: 123 }));

      await expect(service.handlePayosWebhook({})).resolves.toEqual({
        success: true,
      });
      expect(paymentRepo.save).not.toHaveBeenCalled();
    });

    it('chuyển thiếu thì processing, chuyển nốt phần còn lại thì completed', async () => {
      const row = payosRow();
      payos.verifyWebhook.mockReturnValue(
        webhookOf({ amount: 50000, reference: 'FT-A' }),
      );
      await service.handlePayosWebhook({});
      expect(paymentRepo.get(row.id).status).toBe(PaymentStatus.PROCESSING);

      payos.verifyWebhook.mockReturnValue(
        webhookOf({ amount: 150000, reference: 'FT-B' }),
      );
      await service.handlePayosWebhook({});
      expect(paymentRepo.get(row.id).status).toBe(PaymentStatus.COMPLETED);
      expect(paymentRepo.get(row.id).paymentDetails?.amountPaid).toBe(200000);
    });

    it('trả tiền sau khi đơn đã hủy thì ghi refunded để hoàn tiền thủ công', async () => {
      booking.status = BookingStatus.CANCELLED;
      const row = payosRow({ status: PaymentStatus.CANCELLED });
      payos.verifyWebhook.mockReturnValue(webhookOf({}));

      await service.handlePayosWebhook({});

      const saved = paymentRepo.get(row.id);
      expect(saved.status).toBe(PaymentStatus.REFUNDED);
      expect(saved.refundedAt).toBeInstanceOf(Date);
      expect(saved.paymentDetails?.refundNote).toEqual(expect.any(String));
    });

    it('trả bằng link cũ thì hủy giao dịch đang chờ còn lại và link PayOS của nó', async () => {
      const oldRow = payosRow({ status: PaymentStatus.EXPIRED });
      const newRow = payosRow({
        payosOrderCode: 1795777480086002,
        paymentLinkId: 'link-2',
      });
      payos.verifyWebhook.mockReturnValue(webhookOf({}));

      await service.handlePayosWebhook({});

      expect(paymentRepo.get(oldRow.id).status).toBe(PaymentStatus.COMPLETED);
      expect(paymentRepo.get(newRow.id).status).toBe(PaymentStatus.CANCELLED);
      expect(payos.cancelPaymentLink).toHaveBeenCalledWith(
        1795777480086002,
        expect.any(String),
      );
      expect(
        paymentRepo.get(newRow.id).paymentDetails?.gatewayCancelPending,
      ).toBeUndefined();
    });

    it('PayOS báo không thành công thì không đổi gì', async () => {
      const row = payosRow();
      payos.verifyWebhook.mockReturnValue({
        ...webhookOf({ code: '01' }),
        success: false,
      });

      await service.handlePayosWebhook({});
      expect(paymentRepo.get(row.id).status).toBe(PaymentStatus.PENDING);
    });
  });

  describe('đồng bộ và trạng thái', () => {
    it('PAID thì chốt giao dịch; gọi lại trong 5 giây không hỏi PayOS lần nữa', async () => {
      const row = payosRow();
      payos.getPaymentLink.mockResolvedValue({
        status: 'PAID',
        amount: 200000,
        amountPaid: 200000,
        transactions: [
          { reference: 'FT-SYNC', transactionDateTime: '2026-11-27 14:10:00' },
        ],
      });

      const result = await service.syncPayment(row.id, CUSTOMER);
      expect(result.payment.status).toBe(PaymentStatus.COMPLETED);
      expect(result.payment.transactionId).toBe('FT-SYNC');
      expect(result.booking).toEqual({
        id: BOOKING_ID,
        bookingCode: booking.bookingCode,
        status: BookingStatus.PENDING,
      });

      const pending = payosRow({
        payosOrderCode: 1795777480086009,
        paymentLinkId: 'link-9',
        bookingId: BOOKING_ID,
      });
      payos.getPaymentLink.mockResolvedValue({ status: 'PENDING' });
      await service.syncPayment(pending.id, CUSTOMER);
      await service.syncPayment(pending.id, CUSTOMER);
      expect(payos.getPaymentLink).toHaveBeenCalledTimes(2);
    });

    it('CANCELLED và EXPIRED trên PayOS được ghi lại', async () => {
      const cancelled = payosRow();
      payos.getPaymentLink.mockResolvedValue({
        status: 'CANCELLED',
        cancellationReason: 'Khách hủy',
      });
      await service.syncPayment(cancelled.id, CUSTOMER);
      expect(paymentRepo.get(cancelled.id).status).toBe(
        PaymentStatus.CANCELLED,
      );

      const expired = payosRow({
        payosOrderCode: 1795777480086003,
        paymentLinkId: 'link-3',
      });
      payos.getPaymentLink.mockResolvedValue({ status: 'EXPIRED' });
      await service.syncPayment(expired.id, CUSTOMER);
      expect(paymentRepo.get(expired.id).status).toBe(PaymentStatus.EXPIRED);
    });

    it('thợ của đơn xem được trạng thái nhưng không được đồng bộ; người lạ bị chặn', async () => {
      const row = payosRow();

      await expect(
        service.getPaymentStatus(row.id, PROVIDER),
      ).resolves.toMatchObject({ payment: { id: row.id } });
      await expect(service.syncPayment(row.id, PROVIDER)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.getPaymentStatus(row.id, STRANGER)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('thanh toán lại', () => {
    it('đã có giao dịch completed hoặc processing thì trả 409', async () => {
      const paid = payosRow({ status: PaymentStatus.COMPLETED });
      await expect(
        service.createBookingPayment(BOOKING_ID, CUSTOMER, PaymentMethod.PAYOS),
      ).rejects.toThrow(ConflictException);

      paid.status = PaymentStatus.PROCESSING;
      await expect(
        service.createBookingPayment(BOOKING_ID, CUSTOMER, PaymentMethod.COD),
      ).rejects.toThrow(ConflictException);
    });

    it('đơn đã kết thúc trả 409, người không phải chủ đơn trả 403', async () => {
      booking.status = BookingStatus.COMPLETED;
      await expect(
        service.createBookingPayment(BOOKING_ID, CUSTOMER, PaymentMethod.COD),
      ).rejects.toThrow(ConflictException);

      booking.status = BookingStatus.PENDING;
      await expect(
        service.createBookingPayment(BOOKING_ID, STRANGER, PaymentMethod.COD),
      ).rejects.toThrow(ForbiddenException);
    });

    it('link PayOS còn hạn thì trả lại giao dịch cũ, không tạo link mới', async () => {
      const row = payosRow();

      const result = await service.createBookingPayment(
        BOOKING_ID,
        CUSTOMER,
        PaymentMethod.PAYOS,
      );

      expect(result.payment.id).toBe(row.id);
      expect(paymentRepo.rows).toHaveLength(1);
      expect(payos.createPaymentLink).not.toHaveBeenCalled();
    });

    it('link đã quá hạn thì ghi expired, hủy link cũ và tạo link mới', async () => {
      const row = payosRow({ expiresAt: new Date(Date.now() - 60_000) });

      const result = await service.createBookingPayment(
        BOOKING_ID,
        CUSTOMER,
        PaymentMethod.PAYOS,
      );

      expect(paymentRepo.get(row.id).status).toBe(PaymentStatus.EXPIRED);
      expect(payos.cancelPaymentLink).toHaveBeenCalledWith(
        row.payosOrderCode,
        expect.any(String),
      );
      expect(result.payment.id).not.toBe(row.id);
      expect(result.payment.paymentLinkUrl).toContain('pay.payos.vn');
    });

    it('đổi sang tiền mặt thì hủy giao dịch PayOS và link của nó', async () => {
      const row = payosRow();

      const result = await service.createBookingPayment(
        BOOKING_ID,
        CUSTOMER,
        PaymentMethod.COD,
      );

      expect(paymentRepo.get(row.id).status).toBe(PaymentStatus.CANCELLED);
      expect(payos.cancelPaymentLink).toHaveBeenCalledWith(
        row.payosOrderCode,
        expect.any(String),
      );
      expect(result.payment).toMatchObject({
        paymentMethod: PaymentMethod.COD,
        status: PaymentStatus.PENDING,
      });
      expect(payos.createPaymentLink).not.toHaveBeenCalled();
    });
  });

  describe('nghiệm thu, hủy và đọc', () => {
    it('tiền mặt đang chờ thì chốt khi nghiệm thu', async () => {
      const row = paymentRepo.seed({});

      const summary = await service.markCompletedOnAcceptance(
        manager as never,
        BOOKING_ID,
      );

      expect(summary?.status).toBe(PaymentStatus.COMPLETED);
      expect(paymentRepo.get(row.id).paidAt).toBeInstanceOf(Date);
    });

    it('PayOS chưa trả thì chặn nghiệm thu bằng 409; đơn cũ không có giao dịch thì cho qua', async () => {
      await expect(
        service.markCompletedOnAcceptance(manager as never, BOOKING_ID),
      ).resolves.toBeNull();

      payosRow();
      await expect(
        service.markCompletedOnAcceptance(manager as never, BOOKING_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('PayOS đã trả thì nghiệm thu giữ nguyên giao dịch', async () => {
      const row = payosRow({ status: PaymentStatus.COMPLETED });
      const summary = await service.markCompletedOnAcceptance(
        manager as never,
        BOOKING_ID,
      );
      expect(summary?.id).toBe(row.id);
      expect(paymentRepo.save).not.toHaveBeenCalled();
    });

    it('hủy đơn: completed thành refunded, đang chờ thành cancelled rồi hủy link PayOS', async () => {
      const paid = paymentRepo.seed({ status: PaymentStatus.COMPLETED });
      const pending = payosRow({ payosOrderCode: 1795777480086004 });

      await service.cancelOrRefund(manager as never, BOOKING_ID, 'Khách bận');
      expect(paymentRepo.get(paid.id).status).toBe(PaymentStatus.REFUNDED);
      expect(paymentRepo.get(paid.id).refundedAt).toBeInstanceOf(Date);
      expect(paymentRepo.get(pending.id).status).toBe(PaymentStatus.CANCELLED);

      await service.releaseGatewayLinks(BOOKING_ID);
      expect(payos.cancelPaymentLink).toHaveBeenCalledWith(
        1795777480086004,
        'Khách bận',
      );
      expect(
        paymentRepo.get(pending.id).paymentDetails?.gatewayCancelledAt,
      ).toEqual(expect.any(String));
    });

    it('giao dịch chính là giao dịch đã trả, kể cả khi có giao dịch mới hơn', async () => {
      const paid = payosRow({ status: PaymentStatus.COMPLETED });
      paymentRepo.seed({ status: PaymentStatus.CANCELLED });

      const latest = await service.findLatestByBookingIds([BOOKING_ID]);
      expect(latest.get(BOOKING_ID)?.id).toBe(paid.id);

      const list = await service.findByBookingId(BOOKING_ID);
      expect(list[0].id).toBe(paid.id);
      expect(list[0].paymentDetails).toBeNull();
    });
  });
});
