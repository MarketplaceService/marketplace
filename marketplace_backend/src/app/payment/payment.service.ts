import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import { PinoLogger } from 'nestjs-pino';
import type { BookingPaymentSummary } from 'src/app/booking/booking-payment.port';
import { Booking } from 'src/app/booking/entities/booking.entity';
import {
  apiBadGateway,
  apiBadRequest,
  apiConflict,
  apiForbidden,
  apiNotFound,
  apiServiceUnavailable,
} from 'src/shared/helpers/api-i18n';
import { BookingStatus } from 'src/shared/types/booking-status.enum';
import { PaymentMethod } from 'src/shared/types/payment-method.enum';
import { PaymentStatus } from 'src/shared/types/payment-status.enum';
import { UserRole } from 'src/shared/types/user-role.enum';
import { toVnIsoString } from 'src/shared/utils/vn-time';
import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  Not,
  Repository,
} from 'typeorm';
import { Payment } from './entities/payment.entity';
import {
  PayosApiError,
  PayosPaymentLinkInfo,
  PayosService,
  PayosTransaction,
} from './payos/payos.service';

/** Hai phương thức đang chạy thật. Các giá trị khác của enum chừa sẵn cho sau này */
export const ENABLED_PAYMENT_METHODS: ReadonlySet<string> = new Set<string>([
  PaymentMethod.COD,
  PaymentMethod.PAYOS,
]);

function isEnabledPaymentMethod(value: string): value is PaymentMethod {
  return ENABLED_PAYMENT_METHODS.has(value);
}

const ACTIVE_PAYMENT_STATUSES: ReadonlySet<PaymentStatus> = new Set([
  PaymentStatus.PENDING,
  PaymentStatus.PROCESSING,
]);

// Đơn còn chạy thì còn thanh toán được
const OPEN_BOOKING_STATUSES: ReadonlySet<BookingStatus> = new Set([
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
]);

const CLOSED_BOOKING_STATUSES: ReadonlySet<BookingStatus> = new Set([
  BookingStatus.CANCELLED,
  BookingStatus.REJECTED,
]);

// Mỗi giao dịch chỉ hỏi PayOS tối đa một lần trong khoảng này
const SYNC_MIN_INTERVAL_MS = 5_000;

// Các khóa trong payment_details được trả cho client. Cờ nội bộ và mã tham chiếu bị giữ lại
const PUBLIC_DETAIL_KEYS = [
  'qrCode',
  'bin',
  'accountNumber',
  'accountName',
  'description',
  'amountPaid',
  'cancellationReason',
  'refundNote',
] as const;

export interface PaymentActor {
  id: string;
  role: UserRole;
}

export interface PaymentMethodOption {
  method: PaymentMethod;
  enabled: boolean;
  reason: string | null;
}

export interface PaymentStatusResponse {
  payment: BookingPaymentSummary;
  booking: { id: string; bookingCode: string; status: BookingStatus };
}

type PaymentDetails = Record<string, unknown>;

type AccessBooking = Pick<
  Booking,
  'id' | 'bookingCode' | 'status' | 'customerId' | 'totalPrice'
> & { provider?: { userId: string } | null };

/** Nội dung chuyển khoản gửi PayOS: tối đa 9 ký tự với tài khoản không liên kết qua PayOS */
export function toPayosDescription(bookingCode: string): string {
  const suffix = bookingCode
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(-6)
    .toUpperCase();
  return `SV${suffix}`;
}

/**
 * Mã đơn PayOS: 16 chữ số theo thời gian, nhỏ hơn Number.MAX_SAFE_INTEGER để JSON không làm tròn.
 * Không dùng sequence vì nhiều máy dev có thể dùng chung một kênh PayOS.
 */
export function generatePayosOrderCode(): number {
  return Date.now() * 1000 + randomInt(1000);
}

/** PayOS gửi giờ giao dịch theo giờ Việt Nam, dạng "2026-11-27 14:05:00" */
export function parsePayosDateTime(value?: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?$/.exec(
    value.trim(),
  );
  const date = match
    ? new Date(`${match[1]}T${match[2]}${match[3] ?? ':00'}+07:00`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Giao dịch chính của đơn: giao dịch đã trả (hoặc đã hoàn) nếu có, nếu không thì giao dịch mới nhất */
export function pickPrimaryPayment<T extends { status: PaymentStatus }>(
  newestFirst: T[],
): T | null {
  return (
    newestFirst.find((p) => p.status === PaymentStatus.COMPLETED) ??
    newestFirst.find((p) => p.status === PaymentStatus.REFUNDED) ??
    newestFirst[0] ??
    null
  );
}

function orderPrimaryFirst<T extends { status: PaymentStatus }>(
  newestFirst: T[],
): T[] {
  const primary = pickPrimaryPayment(newestFirst);
  return primary
    ? [primary, ...newestFirst.filter((item) => item !== primary)]
    : newestFirst;
}

function mergeDetails(
  base: PaymentDetails | null,
  patch: PaymentDetails,
): PaymentDetails {
  return { ...(base ?? {}), ...patch };
}

function withoutKey(base: PaymentDetails | null, key: string): PaymentDetails {
  const copy = { ...(base ?? {}) };
  delete copy[key];
  return copy;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown';
}

function latestTransaction(
  transactions?: PayosTransaction[] | null,
): PayosTransaction | null {
  if (!transactions?.length) return null;
  return transactions[transactions.length - 1];
}

function toPublicDetails(
  details: PaymentDetails | null,
): PaymentDetails | null {
  if (!details) return null;
  const picked: PaymentDetails = {};
  for (const key of PUBLIC_DETAIL_KEYS) {
    if (details[key] !== undefined) picked[key] = details[key];
  }
  return Object.keys(picked).length > 0 ? picked : null;
}

export function toPaymentSummary(payment: Payment): BookingPaymentSummary {
  return {
    id: payment.id,
    bookingId: payment.bookingId,
    paymentMethod: payment.paymentMethod,
    amount: Number(payment.amount),
    currency: payment.currency,
    status: payment.status,
    transactionId: payment.transactionId,
    payosOrderCode: payment.payosOrderCode,
    paymentLinkUrl: payment.paymentLinkUrl,
    paymentDetails: toPublicDetails(payment.paymentDetails),
    expiresAt: payment.expiresAt ? toVnIsoString(payment.expiresAt) : null,
    paidAt: payment.paidAt ? toVnIsoString(payment.paidAt) : null,
    refundedAt: payment.refundedAt ? toVnIsoString(payment.refundedAt) : null,
  };
}

@Injectable()
export class PaymentService {
  private readonly lastSyncAt = new Map<string, number>();

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly payos: PayosService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PaymentService.name);
  }

  getAvailableMethods(): PaymentMethodOption[] {
    const payosReady = this.payos.isConfigured();
    return [
      {
        method: PaymentMethod.PAYOS,
        enabled: payosReady,
        reason: payosReady ? null : 'Chưa cấu hình cổng PayOS',
      },
      { method: PaymentMethod.COD, enabled: true, reason: null },
      { method: PaymentMethod.VNPAY, enabled: false, reason: 'Sắp ra mắt' },
      { method: PaymentMethod.MOMO, enabled: false, reason: 'Sắp ra mắt' },
      { method: PaymentMethod.ZALOPAY, enabled: false, reason: 'Sắp ra mắt' },
    ];
  }

  // ---------------------------------------------------------------------------
  // Các hàm BookingService gọi qua BookingPaymentPort
  // ---------------------------------------------------------------------------

  /** Chạy trong transaction tạo đơn. Không gọi PayOS ở đây vì hồ sơ thợ đang bị khóa */
  async initPayment(
    manager: EntityManager,
    input: { bookingId: string; amount: number; paymentMethod?: string },
  ): Promise<BookingPaymentSummary | null> {
    const method = this.resolveMethod(input.paymentMethod);
    const amount = Math.round(Number(input.amount));
    if (!(amount > 0)) return null;

    const payment = await this.insertPayment(
      manager,
      input.bookingId,
      method,
      amount,
    );
    return toPaymentSummary(payment);
  }

  /** Chạy sau commit: tạo link PayOS cho giao dịch vừa tạo. Lỗi chỉ ghi log */
  async activatePayment(
    bookingId: string,
  ): Promise<BookingPaymentSummary | null> {
    try {
      const payment = await this.paymentRepo.findOne({
        where: {
          bookingId,
          paymentMethod: PaymentMethod.PAYOS,
          status: PaymentStatus.PENDING,
          paymentLinkId: IsNull(),
        },
        order: { createdAt: 'DESC' },
      });
      if (payment) {
        await this.createGatewayLink(payment);
      }
      const payments = await this.findByBookingId(bookingId);
      return payments[0] ?? null;
    } catch (error) {
      this.logger.error({
        msg: 'payment.activate.failed',
        bookingId,
        error: errorMessage(error),
      });
      return null;
    }
  }

  /** Chạy trong transaction nghiệm thu. Ném 409 thì cả lượt nghiệm thu rollback */
  async markCompletedOnAcceptance(
    manager: EntityManager,
    bookingId: string,
  ): Promise<BookingPaymentSummary | null> {
    const repo = manager.getRepository(Payment);
    const payments = await repo.find({
      where: { bookingId },
      order: { createdAt: 'DESC' },
      lock: { mode: 'pessimistic_write' },
    });

    // Đơn tạo trước khi có module thanh toán: không có giao dịch nào, cho nghiệm thu như cũ
    if (payments.length === 0) return null;

    const completed = payments.find(
      (p) => p.status === PaymentStatus.COMPLETED,
    );
    if (completed) return toPaymentSummary(completed);

    const cod = payments.find(
      (p) =>
        p.paymentMethod === PaymentMethod.COD &&
        p.status === PaymentStatus.PENDING,
    );
    if (!cod) {
      apiConflict('errors.payment.unpaid');
    }

    cod.status = PaymentStatus.COMPLETED;
    cod.paidAt = cod.paidAt ?? new Date();
    await repo.save(cod);
    return toPaymentSummary(cod);
  }

  /** Chạy trong transaction hủy hoặc từ chối đơn */
  async cancelOrRefund(
    manager: EntityManager,
    bookingId: string,
    reason: string,
  ): Promise<BookingPaymentSummary | null> {
    const repo = manager.getRepository(Payment);
    const payments = await repo.find({
      where: { bookingId },
      order: { createdAt: 'DESC' },
      lock: { mode: 'pessimistic_write' },
    });

    const now = new Date();
    const changed: Payment[] = [];
    for (const payment of payments) {
      if (payment.status === PaymentStatus.COMPLETED) {
        // PayOS không có API hoàn tiền: chỉ ghi nhận, tiền được chuyển lại thủ công
        payment.status = PaymentStatus.REFUNDED;
        payment.refundedAt = now;
        payment.paymentDetails = mergeDetails(payment.paymentDetails, {
          refundNote: `Hoàn tiền thủ công: ${reason}`,
        });
        changed.push(payment);
      } else if (ACTIVE_PAYMENT_STATUSES.has(payment.status)) {
        this.markCancelled(payment, reason);
        changed.push(payment);
      }
    }

    if (changed.length > 0) {
      await repo.save(changed);
    }

    const primary = pickPrimaryPayment(payments);
    return primary ? toPaymentSummary(primary) : null;
  }

  /** Chạy sau commit: hủy trên PayOS các link vừa bị hủy trong DB. Lỗi chỉ ghi log */
  async releaseGatewayLinks(bookingId: string): Promise<void> {
    try {
      const payments = await this.paymentRepo.find({
        where: {
          bookingId,
          paymentMethod: PaymentMethod.PAYOS,
          status: In([PaymentStatus.CANCELLED, PaymentStatus.EXPIRED]),
        },
      });

      for (const payment of payments) {
        if (
          !payment.payosOrderCode ||
          payment.paymentDetails?.gatewayCancelPending !== true
        ) {
          continue;
        }

        const reason =
          typeof payment.paymentDetails.cancellationReason === 'string'
            ? payment.paymentDetails.cancellationReason
            : 'Giao dịch đã bị hủy';
        const done = await this.cancelLinkSafely(
          payment.payosOrderCode,
          reason,
        );
        if (done) {
          await this.paymentRepo.update(
            { id: payment.id },
            {
              paymentDetails: {
                ...withoutKey(payment.paymentDetails, 'gatewayCancelPending'),
                gatewayCancelledAt: new Date().toISOString(),
              },
            },
          );
        }
      }
    } catch (error) {
      this.logger.error({
        msg: 'payment.release.failed',
        bookingId,
        error: errorMessage(error),
      });
    }
  }

  async findByBookingId(bookingId: string): Promise<BookingPaymentSummary[]> {
    const payments = await this.paymentRepo.find({
      where: { bookingId },
      order: { createdAt: 'DESC' },
    });
    return orderPrimaryFirst(payments).map(toPaymentSummary);
  }

  async findLatestByBookingIds(
    bookingIds: string[],
  ): Promise<Map<string, BookingPaymentSummary>> {
    const result = new Map<string, BookingPaymentSummary>();
    if (bookingIds.length === 0) return result;

    const payments = await this.paymentRepo.find({
      where: { bookingId: In(bookingIds) },
      order: { createdAt: 'DESC' },
    });

    const grouped = new Map<string, Payment[]>();
    for (const payment of payments) {
      const list = grouped.get(payment.bookingId) ?? [];
      list.push(payment);
      grouped.set(payment.bookingId, list);
    }

    for (const [bookingId, list] of grouped) {
      const primary = pickPrimaryPayment(list);
      if (primary) result.set(bookingId, toPaymentSummary(primary));
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Endpoint thanh toán
  // ---------------------------------------------------------------------------

  async getPaymentStatus(
    paymentId: string,
    actor: PaymentActor,
  ): Promise<PaymentStatusResponse> {
    const { payment, booking } = await this.loadAccessible(paymentId, actor, {
      allowProvider: true,
    });
    return this.buildStatus(payment, booking);
  }

  /** Hỏi PayOS trạng thái thật, dùng khi webhook bị lỡ hoặc khi khách quay về từ trang PayOS */
  async syncPayment(
    paymentId: string,
    actor: PaymentActor,
  ): Promise<PaymentStatusResponse> {
    const { payment, booking } = await this.loadAccessible(paymentId, actor, {
      allowProvider: false,
    });

    if (!this.shouldAskGateway(payment) || this.syncedRecently(payment.id)) {
      return this.buildStatus(payment, booking);
    }

    let info: PayosPaymentLinkInfo;
    try {
      info = await this.payos.getPaymentLink(payment.payosOrderCode);
    } catch (error) {
      if (error instanceof PayosApiError) {
        apiBadGateway('errors.payment.gatewayFailed');
      }
      throw error;
    }

    await this.dataSource.transaction(async (manager) => {
      const locked = await manager.getRepository(Payment).findOne({
        where: { id: payment.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (locked) {
        await this.applyGatewayInfo(manager, locked, info);
      }
    });

    await this.releaseGatewayLinks(payment.bookingId);
    return this.getStatusById(payment.id);
  }

  /** Webhook của PayOS. Gọi lặp với cùng giao dịch không ghi thêm lần nào */
  async handlePayosWebhook(body: unknown): Promise<{ success: true }> {
    const { success, data } = this.payos.verifyWebhook(body);

    if (!success) {
      this.logger.warn({
        msg: 'payment.webhook.notSuccess',
        orderCode: data.orderCode,
        code: data.code,
      });
      return { success: true };
    }

    const bookingId = await this.dataSource.transaction(async (manager) => {
      const payment = await manager.getRepository(Payment).findOne({
        where: { payosOrderCode: data.orderCode },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment) return null;

      const references = toStringArray(payment.paymentDetails?.references);
      if (data.reference && references.includes(data.reference)) {
        return payment.bookingId;
      }

      const paidBefore = Number(payment.paymentDetails?.amountPaid) || 0;
      await this.applyPaidAmount(manager, payment, {
        totalPaid: paidBefore + data.amount,
        reference: data.reference,
        paidAt: parsePayosDateTime(data.transactionDateTime) ?? new Date(),
        references: data.reference
          ? [...references, data.reference]
          : references,
      });
      return payment.bookingId;
    });

    // Payload mẫu khi xác nhận URL webhook (orderCode 123) rơi vào đây: vẫn trả 200
    if (!bookingId) {
      this.logger.warn({
        msg: 'payment.webhook.unknownOrder',
        orderCode: data.orderCode,
      });
      return { success: true };
    }

    await this.releaseGatewayLinks(bookingId);
    return { success: true };
  }

  async listBookingPayments(
    bookingId: string,
    actor: PaymentActor,
  ): Promise<BookingPaymentSummary[]> {
    const booking = await this.loadBookingForAccess(bookingId);
    this.assertAccess(booking, actor, true);
    return this.findByBookingId(bookingId);
  }

  /** Thanh toán lại hoặc đổi phương thức (P02) */
  async createBookingPayment(
    bookingId: string,
    actor: PaymentActor,
    rawMethod: string,
  ): Promise<PaymentStatusResponse> {
    const method = this.resolveMethod(rawMethod);

    const result = await this.dataSource.transaction(async (manager) => {
      // Khóa đơn để hai lần bấm liên tiếp không tạo hai link
      const booking = await manager.getRepository(Booking).findOne({
        where: { id: bookingId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!booking) {
        apiNotFound('errors.booking.notFound');
      }
      if (booking.customerId !== actor.id) {
        apiForbidden('errors.payment.forbidden');
      }
      if (!OPEN_BOOKING_STATUSES.has(booking.status)) {
        apiConflict('errors.payment.bookingClosed');
      }

      const repo = manager.getRepository(Payment);
      const payments = await repo.find({
        where: { bookingId },
        order: { createdAt: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });
      if (payments.some((p) => p.status === PaymentStatus.COMPLETED)) {
        apiConflict('errors.payment.alreadyPaid');
      }
      if (payments.some((p) => p.status === PaymentStatus.PROCESSING)) {
        apiConflict('errors.payment.processing');
      }

      const now = new Date();
      const active = payments.find((p) => p.status === PaymentStatus.PENDING);
      if (active) {
        const linkStillValid =
          active.paymentLinkUrl !== null &&
          (active.expiresAt === null || active.expiresAt > now);
        if (
          active.paymentMethod === method &&
          (method === PaymentMethod.COD || linkStillValid)
        ) {
          return { paymentId: active.id, created: false };
        }

        if (active.expiresAt !== null && active.expiresAt <= now) {
          active.status = PaymentStatus.EXPIRED;
          if (active.paymentLinkId) {
            active.paymentDetails = mergeDetails(active.paymentDetails, {
              gatewayCancelPending: true,
            });
          }
        } else {
          this.markCancelled(
            active,
            'Khách đổi phương thức hoặc tạo giao dịch mới',
          );
        }
        await repo.save(active);
      }

      const created = await this.insertPayment(
        manager,
        bookingId,
        method,
        Math.round(Number(booking.totalPrice)),
      );
      return { paymentId: created.id, created: true };
    });

    await this.releaseGatewayLinks(bookingId);

    if (result.created && method === PaymentMethod.PAYOS) {
      const payment = await this.paymentRepo.findOne({
        where: { id: result.paymentId },
      });
      if (payment) {
        await this.createGatewayLink(payment);
      }
    }

    return this.getStatusById(result.paymentId);
  }

  // ---------------------------------------------------------------------------
  // Nội bộ
  // ---------------------------------------------------------------------------

  private resolveMethod(raw?: string): PaymentMethod {
    const method: string = raw ?? PaymentMethod.COD;
    if (!isEnabledPaymentMethod(method)) {
      apiBadRequest('errors.payment.methodUnsupported');
    }
    if (method === PaymentMethod.PAYOS && !this.payos.isConfigured()) {
      apiServiceUnavailable('errors.payment.payosNotConfigured');
    }
    return method;
  }

  private async insertPayment(
    manager: EntityManager,
    bookingId: string,
    method: PaymentMethod,
    amount: number,
  ): Promise<Payment> {
    const repo = manager.getRepository(Payment);

    let orderCode: number | null = null;
    if (method === PaymentMethod.PAYOS) {
      for (let attempt = 0; attempt < 3 && orderCode === null; attempt += 1) {
        const candidate = generatePayosOrderCode();
        const taken = await repo.exists({
          where: { payosOrderCode: candidate },
        });
        if (!taken) orderCode = candidate;
      }
      if (orderCode === null) {
        throw new Error('Không sinh được mã đơn PayOS chưa dùng');
      }
    }

    return repo.save(
      repo.create({
        bookingId,
        paymentMethod: method,
        amount,
        currency: 'VND',
        status: PaymentStatus.PENDING,
        transactionId: null,
        payosOrderCode: orderCode,
        paymentLinkId: null,
        paymentLinkUrl: null,
        paymentDetails: null,
        expiresAt: null,
        paidAt: null,
        refundedAt: null,
      }),
    );
  }

  private async createGatewayLink(payment: Payment): Promise<void> {
    if (!payment.payosOrderCode) return;

    const booking = await this.bookingRepo.findOne({
      where: { id: payment.bookingId },
      select: { id: true, bookingCode: true },
    });
    if (!booking) return;

    const { returnUrl, cancelUrl } = this.payos.buildResultUrls(payment.id);
    const expiredAt =
      Math.floor(Date.now() / 1000) + this.payos.linkTtlMinutes * 60;

    try {
      const link = await this.payos.createPaymentLink({
        orderCode: payment.payosOrderCode,
        amount: Math.round(Number(payment.amount)),
        description: toPayosDescription(booking.bookingCode),
        returnUrl,
        cancelUrl,
        expiredAt,
      });

      // Chỉ ghi khi giao dịch vẫn đang chờ: đơn có thể vừa bị hủy trong lúc gọi PayOS
      const result = await this.paymentRepo.update(
        { id: payment.id, status: PaymentStatus.PENDING },
        {
          paymentLinkId: link.paymentLinkId,
          paymentLinkUrl: link.checkoutUrl,
          expiresAt: new Date(expiredAt * 1000),
          paymentDetails: mergeDetails(payment.paymentDetails, {
            qrCode: link.qrCode,
            bin: link.bin,
            accountNumber: link.accountNumber,
            accountName: link.accountName,
            description: link.description,
          }),
        },
      );
      if (!result.affected) {
        await this.cancelLinkSafely(
          payment.payosOrderCode,
          'Giao dịch đã bị hủy',
        );
      }
    } catch (error) {
      if (!(error instanceof PayosApiError)) throw error;
      await this.paymentRepo.update(
        { id: payment.id, status: PaymentStatus.PENDING },
        {
          status: PaymentStatus.FAILED,
          paymentDetails: mergeDetails(payment.paymentDetails, {
            failureReason: error.message,
            failureCode: error.code,
          }),
        },
      );
    }
  }

  /**
   * Ghi nhận tiền đã về (từ webhook hoặc từ sync). Đủ tiền thì chốt giao dịch và hủy các giao dịch
   * còn chờ khác của đơn. Đơn đã đóng hoặc đã trả bằng giao dịch khác thì đánh dấu cần hoàn tiền.
   */
  private async applyPaidAmount(
    manager: EntityManager,
    payment: Payment,
    input: {
      totalPaid: number;
      reference: string | null;
      paidAt: Date;
      references?: string[];
    },
  ): Promise<void> {
    const repo = manager.getRepository(Payment);

    if (
      payment.status === PaymentStatus.COMPLETED ||
      payment.status === PaymentStatus.REFUNDED
    ) {
      this.logger.warn({
        msg: 'payment.paid.alreadySettled',
        paymentId: payment.id,
      });
      return;
    }

    const details = mergeDetails(payment.paymentDetails, {
      amountPaid: input.totalPaid,
      ...(input.references ? { references: input.references } : {}),
    });

    if (input.totalPaid < Number(payment.amount)) {
      payment.status = PaymentStatus.PROCESSING;
      payment.paymentDetails = details;
      await repo.save(payment);
      return;
    }

    const booking = await manager.getRepository(Booking).findOne({
      where: { id: payment.bookingId },
      select: { id: true, status: true },
    });
    const others = await repo.find({
      where: { bookingId: payment.bookingId, id: Not(payment.id) },
      lock: { mode: 'pessimistic_write' },
    });
    const paidElsewhere = others.some(
      (p) => p.status === PaymentStatus.COMPLETED,
    );

    payment.paidAt = input.paidAt;
    payment.transactionId = await this.availableTransactionId(
      manager,
      input.reference,
      payment.id,
    );

    if (
      !booking ||
      CLOSED_BOOKING_STATUSES.has(booking.status) ||
      paidElsewhere
    ) {
      payment.status = PaymentStatus.REFUNDED;
      payment.refundedAt = new Date();
      payment.paymentDetails = mergeDetails(details, {
        refundNote: paidElsewhere
          ? 'Khách trả trùng, đơn đã được thanh toán bằng giao dịch khác. Cần hoàn tiền thủ công'
          : 'Khách trả sau khi đơn đã đóng. Cần hoàn tiền thủ công',
      });
      this.logger.warn({
        msg: 'payment.paid.needsManualRefund',
        paymentId: payment.id,
        bookingId: payment.bookingId,
      });
      await repo.save(payment);
      return;
    }

    payment.status = PaymentStatus.COMPLETED;
    payment.paymentDetails = details;

    const stillOpen = others.filter((p) =>
      ACTIVE_PAYMENT_STATUSES.has(p.status),
    );
    for (const other of stillOpen) {
      this.markCancelled(other, 'Đơn đã được thanh toán bằng giao dịch khác');
    }
    await repo.save([payment, ...stillOpen]);
  }

  private async applyGatewayInfo(
    manager: EntityManager,
    payment: Payment,
    info: PayosPaymentLinkInfo,
  ): Promise<void> {
    const repo = manager.getRepository(Payment);
    const status = String(info.status ?? '').toUpperCase();

    switch (status) {
      case 'PAID': {
        const tx = latestTransaction(info.transactions);
        await this.applyPaidAmount(manager, payment, {
          // PayOS báo PAID nghĩa là đã đủ tiền, kể cả khi thiếu trường amountPaid
          totalPaid: Math.max(
            Number(info.amountPaid) || 0,
            Number(payment.amount),
          ),
          reference: tx?.reference ?? null,
          paidAt: parsePayosDateTime(tx?.transactionDateTime) ?? new Date(),
        });
        return;
      }
      case 'CANCELLED':
        if (ACTIVE_PAYMENT_STATUSES.has(payment.status)) {
          payment.status = PaymentStatus.CANCELLED;
          payment.paymentDetails = mergeDetails(payment.paymentDetails, {
            cancellationReason:
              info.cancellationReason || 'Đã hủy trên trang PayOS',
          });
          await repo.save(payment);
        }
        return;
      case 'EXPIRED':
        if (ACTIVE_PAYMENT_STATUSES.has(payment.status)) {
          payment.status = PaymentStatus.EXPIRED;
          await repo.save(payment);
        }
        return;
      case 'PROCESSING':
      case 'UNDERPAID':
        if (payment.status === PaymentStatus.PENDING) {
          payment.status = PaymentStatus.PROCESSING;
          payment.paymentDetails = mergeDetails(payment.paymentDetails, {
            amountPaid: Number(info.amountPaid) || 0,
          });
          await repo.save(payment);
        }
        return;
      default:
        return;
    }
  }

  private markCancelled(payment: Payment, reason: string): void {
    payment.status = PaymentStatus.CANCELLED;
    payment.paymentDetails = mergeDetails(payment.paymentDetails, {
      cancellationReason: reason,
      ...(payment.paymentMethod === PaymentMethod.PAYOS && payment.paymentLinkId
        ? { gatewayCancelPending: true }
        : {}),
    });
  }

  private async availableTransactionId(
    manager: EntityManager,
    reference: string | null,
    paymentId: string,
  ): Promise<string | null> {
    if (!reference) return null;
    const owner = await manager.getRepository(Payment).findOne({
      where: { transactionId: reference },
      select: { id: true },
    });
    if (owner && owner.id !== paymentId) {
      this.logger.warn({ msg: 'payment.reference.duplicated', paymentId });
      return null;
    }
    return reference.slice(0, 150);
  }

  /** true khi đã hủy xong hoặc PayOS từ chối hủy (link đã trả, đã hủy, đã hết hạn) */
  private async cancelLinkSafely(
    orderCode: number,
    reason: string,
  ): Promise<boolean> {
    try {
      await this.payos.cancelPaymentLink(orderCode, reason);
      return true;
    } catch (error) {
      if (error instanceof PayosApiError && error.httpStatus !== null) {
        this.logger.warn({
          msg: 'payment.cancelLink.rejected',
          orderCode,
          code: error.code,
        });
        return true;
      }
      this.logger.error({
        msg: 'payment.cancelLink.failed',
        orderCode,
        error: errorMessage(error),
      });
      return false;
    }
  }

  private shouldAskGateway(payment: Payment): boolean {
    return (
      payment.paymentMethod === PaymentMethod.PAYOS &&
      payment.payosOrderCode !== null &&
      payment.paymentLinkId !== null &&
      payment.status !== PaymentStatus.COMPLETED &&
      payment.status !== PaymentStatus.REFUNDED &&
      this.payos.isConfigured()
    );
  }

  private syncedRecently(paymentId: string): boolean {
    const now = Date.now();
    const last = this.lastSyncAt.get(paymentId) ?? 0;
    if (now - last < SYNC_MIN_INTERVAL_MS) return true;

    if (this.lastSyncAt.size > 1000) {
      for (const [id, at] of this.lastSyncAt) {
        if (now - at > SYNC_MIN_INTERVAL_MS) this.lastSyncAt.delete(id);
      }
    }
    this.lastSyncAt.set(paymentId, now);
    return false;
  }

  private async loadAccessible(
    paymentId: string,
    actor: PaymentActor,
    options: { allowProvider: boolean },
  ): Promise<{ payment: Payment; booking: AccessBooking }> {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
    });
    if (!payment) {
      apiNotFound('errors.payment.notFound');
    }
    const booking = await this.loadBookingForAccess(payment.bookingId);
    this.assertAccess(booking, actor, options.allowProvider);
    return { payment, booking };
  }

  private async loadBookingForAccess(
    bookingId: string,
  ): Promise<AccessBooking> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: { provider: true },
      select: {
        id: true,
        bookingCode: true,
        status: true,
        customerId: true,
        totalPrice: true,
        provider: { id: true, userId: true },
      },
    });
    if (!booking) {
      apiNotFound('errors.booking.notFound');
    }
    return booking;
  }

  private assertAccess(
    booking: AccessBooking,
    actor: PaymentActor,
    allowProvider: boolean,
  ): void {
    if (actor.role === UserRole.ADMIN) return;
    if (booking.customerId === actor.id) return;
    if (allowProvider && booking.provider?.userId === actor.id) return;
    apiForbidden('errors.payment.forbidden');
  }

  private async getStatusById(
    paymentId: string,
  ): Promise<PaymentStatusResponse> {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
    });
    if (!payment) {
      apiNotFound('errors.payment.notFound');
    }
    const booking = await this.loadBookingForAccess(payment.bookingId);
    return this.buildStatus(payment, booking);
  }

  private buildStatus(
    payment: Payment,
    booking: AccessBooking,
  ): PaymentStatusResponse {
    return {
      payment: toPaymentSummary(payment),
      booking: {
        id: booking.id,
        bookingCode: booking.bookingCode,
        status: booking.status,
      },
    };
  }
}
