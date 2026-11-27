import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { PinoLogger } from 'nestjs-pino';
import { PAYOS_CONFIG, PayosConfig } from 'src/config/payos/payos.config';
import {
  apiBadRequest,
  apiServiceUnavailable,
} from 'src/shared/helpers/api-i18n';

const REQUEST_TIMEOUT_MS = 10_000;

export interface PayosCreateLinkInput {
  orderCode: number;
  amount: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  /** Unix timestamp tính bằng giây */
  expiredAt: number;
}

export interface PayosCreatedLink {
  paymentLinkId: string;
  checkoutUrl: string;
  qrCode: string;
  accountNumber: string;
  accountName: string;
  bin: string;
  description: string;
  amount: number;
  orderCode: number;
  status: string;
}

export interface PayosTransaction {
  reference?: string | null;
  amount?: number;
  transactionDateTime?: string | null;
}

export interface PayosPaymentLinkInfo {
  id: string;
  orderCode: number;
  amount: number;
  amountPaid: number;
  amountRemaining: number;
  /** PENDING, PROCESSING, PAID, CANCELLED, EXPIRED, UNDERPAID */
  status: string;
  transactions?: PayosTransaction[] | null;
  cancellationReason?: string | null;
}

export interface PayosWebhookData {
  orderCode: number;
  amount: number;
  reference: string | null;
  transactionDateTime: string | null;
  paymentLinkId: string | null;
  code: string | null;
}

export interface PayosVerifiedWebhook {
  /** true khi cả body.code và data.code đều là "00" (giao dịch thành công) */
  success: boolean;
  data: PayosWebhookData;
}

/** PayOS trả HTTP lỗi, trả code khác "00", hoặc không phản hồi */
export class PayosApiError extends Error {
  constructor(
    message: string,
    readonly code: string | null,
    readonly httpStatus: number | null,
  ) {
    super(message);
    this.name = 'PayosApiError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sortKeys(value: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = value[key];
      return acc;
    }, {});
}

function signatureValue(value: unknown): string {
  if (Array.isArray(value)) {
    return JSON.stringify(
      (value as unknown[]).map((item) =>
        isRecord(item) ? sortKeys(item) : item,
      ),
    );
  }
  if (
    value === null ||
    value === undefined ||
    value === 'null' ||
    value === 'undefined'
  ) {
    return '';
  }
  if (typeof value === 'string') return value;
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  // Mẫu của PayOS ghép bằng template literal, nên object lồng nhau thành "[object Object]"
  return '[object Object]';
}

/**
 * Chuỗi được ký của webhook và dữ liệu trả về, theo mẫu JS trong tài liệu PayOS:
 * key xếp theo alphabet, bỏ key undefined, null thành chuỗi rỗng, mảng thì JSON với key đã sắp.
 */
export function buildPayosDataSignaturePayload(
  data: Record<string, unknown>,
): string {
  return Object.keys(data)
    .sort()
    .filter((key) => data[key] !== undefined)
    .map((key) => `${key}=${signatureValue(data[key])}`)
    .join('&');
}

/** Chuỗi được ký khi tạo link: đúng năm trường, theo thứ tự alphabet */
export function buildPayosCreateLinkSignaturePayload(
  input: Pick<
    PayosCreateLinkInput,
    'amount' | 'cancelUrl' | 'description' | 'orderCode' | 'returnUrl'
  >,
): string {
  return `amount=${input.amount}&cancelUrl=${input.cancelUrl}&description=${input.description}&orderCode=${input.orderCode}&returnUrl=${input.returnUrl}`;
}

export function signPayosPayload(payload: string, checksumKey: string): string {
  return createHmac('sha256', checksumKey).update(payload).digest('hex');
}

function sameHex(expected: string, received: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received.trim().toLowerCase(), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

function toOptionalString(value: unknown): string | null {
  if (typeof value === 'string') return value === '' ? null : value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
}

/**
 * Wrapper gọi REST API của PayOS bằng ba khóa của kênh thanh toán nằm ở backend.
 * PayOS không có môi trường test, mọi lệnh gọi đều tới hệ thống thật.
 */
@Injectable()
export class PayosService {
  private readonly config: PayosConfig;

  constructor(
    config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PayosService.name);
    this.config = config.getOrThrow<PayosConfig>(PAYOS_CONFIG);
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.clientId && this.config.apiKey && this.config.checksumKey,
    );
  }

  get linkTtlMinutes(): number {
    return this.config.linkTtlMinutes;
  }

  /** PayOS gắn thêm ?code=…&id=…&cancel=…&status=…&orderCode=… vào hai địa chỉ này */
  buildResultUrls(paymentId: string): { returnUrl: string; cancelUrl: string } {
    return {
      returnUrl: `${this.config.returnUrl}/${paymentId}`,
      cancelUrl: `${this.config.cancelUrl}/${paymentId}`,
    };
  }

  createPaymentLink(input: PayosCreateLinkInput): Promise<PayosCreatedLink> {
    const { checksumKey } = this.requireKeys();
    const signature = signPayosPayload(
      buildPayosCreateLinkSignaturePayload(input),
      checksumKey,
    );
    return this.request<PayosCreatedLink>('POST', '/v2/payment-requests', {
      ...input,
      signature,
    });
  }

  getPaymentLink(orderCode: number): Promise<PayosPaymentLinkInfo> {
    return this.request<PayosPaymentLinkInfo>(
      'GET',
      `/v2/payment-requests/${orderCode}`,
    );
  }

  async cancelPaymentLink(orderCode: number, reason?: string): Promise<void> {
    await this.request(
      'POST',
      `/v2/payment-requests/${orderCode}/cancel`,
      reason ? { cancellationReason: reason.slice(0, 200) } : {},
    );
  }

  /**
   * Kiểm tra chữ ký webhook. Body phải giữ nguyên mọi field PayOS gửi (kể cả field lạ),
   * vì chữ ký được tính trên toàn bộ object data.
   */
  verifyWebhook(body: unknown): PayosVerifiedWebhook {
    const { checksumKey } = this.requireKeys();

    if (
      !isRecord(body) ||
      !isRecord(body.data) ||
      typeof body.signature !== 'string'
    ) {
      apiBadRequest('errors.payment.invalidWebhook');
    }

    const expected = signPayosPayload(
      buildPayosDataSignaturePayload(body.data),
      checksumKey,
    );
    if (!sameHex(expected, body.signature)) {
      apiBadRequest('errors.payment.invalidSignature');
    }

    const orderCode = Number(body.data.orderCode);
    const amount = Number(body.data.amount);
    if (!Number.isSafeInteger(orderCode) || !Number.isFinite(amount)) {
      apiBadRequest('errors.payment.invalidWebhook');
    }

    const dataCode = toOptionalString(body.data.code);
    return {
      success: body.code === '00' && (dataCode === null || dataCode === '00'),
      data: {
        orderCode,
        amount,
        reference: toOptionalString(body.data.reference),
        transactionDateTime: toOptionalString(body.data.transactionDateTime),
        paymentLinkId: toOptionalString(body.data.paymentLinkId),
        code: dataCode,
      },
    };
  }

  private requireKeys(): {
    clientId: string;
    apiKey: string;
    checksumKey: string;
  } {
    const { clientId, apiKey, checksumKey } = this.config;
    if (!clientId || !apiKey || !checksumKey) {
      apiServiceUnavailable('errors.payment.payosNotConfigured');
    }
    return { clientId, apiKey, checksumKey };
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const { clientId, apiKey } = this.requireKeys();

    let response: Response;
    try {
      response = await fetch(new URL(path, this.config.baseUrl), {
        method,
        headers: {
          'x-client-id': clientId,
          'x-api-key': apiKey,
          ...(body ? { 'content-type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error({
        msg: 'payos.request.failed',
        method,
        path,
        error: error instanceof Error ? error.message : 'unknown',
      });
      throw new PayosApiError('PayOS không phản hồi', null, null);
    }

    let payload: { code?: unknown; desc?: unknown; data?: unknown } | null =
      null;
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      payload = null;
    }

    const code = toOptionalString(payload?.code);
    const desc = toOptionalString(payload?.desc);
    if (!response.ok || code !== '00') {
      // Chỉ ghi mã và mô tả lỗi của PayOS, không ghi header (chứa khóa) hay body
      this.logger.error({
        msg: 'payos.request.rejected',
        method,
        path,
        status: response.status,
        code,
        desc,
      });
      throw new PayosApiError(
        desc ?? `HTTP ${response.status}`,
        code,
        response.status,
      );
    }

    return payload?.data as T;
  }
}
