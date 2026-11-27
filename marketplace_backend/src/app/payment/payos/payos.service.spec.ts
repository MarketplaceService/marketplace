import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import {
  buildPayosCreateLinkSignaturePayload,
  buildPayosDataSignaturePayload,
  PayosApiError,
  PayosService,
} from './payos.service';

const CHECKSUM_KEY = 'test-checksum-key';

const makeService = (keys: { checksumKey?: string | null } = {}) =>
  new PayosService(
    {
      getOrThrow: () => ({
        clientId: 'client-id',
        apiKey: 'api-key',
        checksumKey:
          keys.checksumKey === undefined ? CHECKSUM_KEY : keys.checksumKey,
        baseUrl: 'https://api-merchant.payos.vn',
        returnUrl: 'http://localhost:3000/payments/result',
        cancelUrl: 'http://localhost:3000/payments/result',
        linkTtlMinutes: 15,
      }),
    } as never,
    { setContext: jest.fn(), error: jest.fn(), warn: jest.fn() } as never,
  );

const hmac = (payload: string) =>
  createHmac('sha256', CHECKSUM_KEY).update(payload).digest('hex');

// Payload mẫu theo tài liệu webhook của PayOS
const sampleData = {
  orderCode: 123,
  amount: 3000,
  description: 'VQRIO123',
  accountNumber: '12345678',
  reference: 'TF230204212323',
  transactionDateTime: '2023-02-04 18:25:00',
  currency: 'VND',
  paymentLinkId: '124c33293c43417ab7879e14c8d9eb18',
  code: '00',
  desc: 'Thành công',
  counterAccountBankId: '',
  counterAccountBankName: '',
  counterAccountName: null,
  counterAccountNumber: null,
  virtualAccountName: '',
  virtualAccountNumber: '',
};

// Viết tay theo thuật toán của PayOS: key xếp alphabet, null thành chuỗi rỗng, không encode
const sampleSignedString =
  'accountNumber=12345678&amount=3000&code=00&counterAccountBankId=&counterAccountBankName=' +
  '&counterAccountName=&counterAccountNumber=&currency=VND&desc=Thành công&description=VQRIO123' +
  '&orderCode=123&paymentLinkId=124c33293c43417ab7879e14c8d9eb18&reference=TF230204212323' +
  '&transactionDateTime=2023-02-04 18:25:00&virtualAccountName=&virtualAccountNumber=';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('PayosService', () => {
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  describe('chuỗi ký', () => {
    it('ghép data webhook theo key alphabet, null thành chuỗi rỗng', () => {
      expect(buildPayosDataSignaturePayload(sampleData)).toBe(
        sampleSignedString,
      );
    });

    it('mảng được JSON hóa với key đã sắp, key undefined bị bỏ', () => {
      expect(
        buildPayosDataSignaturePayload({
          b: [{ y: 1, x: 2 }],
          a: 1,
          c: undefined,
        }),
      ).toBe('a=1&b=[{"x":2,"y":1}]');
    });

    it('chuỗi ký khi tạo link gồm đúng năm trường theo alphabet', () => {
      expect(
        buildPayosCreateLinkSignaturePayload({
          amount: 2000,
          cancelUrl: 'http://localhost:3000/payments/result/p1',
          description: 'SVA1B2C3',
          orderCode: 1795777480086123,
          returnUrl: 'http://localhost:3000/payments/result/p1',
        }),
      ).toBe(
        'amount=2000&cancelUrl=http://localhost:3000/payments/result/p1&description=SVA1B2C3' +
          '&orderCode=1795777480086123&returnUrl=http://localhost:3000/payments/result/p1',
      );
    });
  });

  describe('verifyWebhook', () => {
    it('nhận payload có chữ ký đúng và trả dữ liệu đã chuẩn hóa', () => {
      const result = makeService().verifyWebhook({
        code: '00',
        desc: 'success',
        success: true,
        data: sampleData,
        signature: hmac(sampleSignedString),
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        orderCode: 123,
        amount: 3000,
        reference: 'TF230204212323',
        transactionDateTime: '2023-02-04 18:25:00',
        paymentLinkId: '124c33293c43417ab7879e14c8d9eb18',
        code: '00',
      });
    });

    it('từ chối 400 khi số tiền bị sửa sau khi ký', () => {
      expect(() =>
        makeService().verifyWebhook({
          code: '00',
          desc: 'success',
          data: { ...sampleData, amount: 1 },
          signature: hmac(sampleSignedString),
        }),
      ).toThrow(BadRequestException);
    });

    it('từ chối 400 khi thiếu data hoặc signature', () => {
      const service = makeService();
      expect(() => service.verifyWebhook({ code: '00' })).toThrow(
        BadRequestException,
      );
      expect(() => service.verifyWebhook('not-an-object')).toThrow(
        BadRequestException,
      );
    });

    it('success là false khi PayOS báo giao dịch không thành công', () => {
      const data = { ...sampleData, code: '01' };
      const result = makeService().verifyWebhook({
        code: '00',
        desc: 'success',
        data,
        signature: hmac(buildPayosDataSignaturePayload(data)),
      });
      expect(result.success).toBe(false);
    });

    it('trả 503 khi chưa cấu hình khóa', () => {
      expect(() =>
        makeService({ checksumKey: null }).verifyWebhook({
          data: sampleData,
          signature: 'x',
        }),
      ).toThrow(ServiceUnavailableException);
    });
  });

  describe('gọi API', () => {
    it('tạo link kèm chữ ký và header của kênh', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          code: '00',
          desc: 'success',
          data: {
            paymentLinkId: 'link-1',
            checkoutUrl: 'https://pay.payos.vn/web/link-1',
            qrCode: '000201010212...',
            accountNumber: '123',
            accountName: 'NGUYEN VAN A',
            bin: '970422',
            description: 'SVA1B2C3',
            amount: 2000,
            orderCode: 1,
            status: 'PENDING',
          },
        }),
      );

      const input = {
        orderCode: 1,
        amount: 2000,
        description: 'SVA1B2C3',
        returnUrl: 'http://localhost:3000/payments/result/p1',
        cancelUrl: 'http://localhost:3000/payments/result/p1',
        expiredAt: 1_795_800_000,
      };
      const link = await makeService().createPaymentLink(input);

      expect(link.checkoutUrl).toBe('https://pay.payos.vn/web/link-1');
      // Service luôn gọi fetch với một đối tượng URL và body là chuỗi JSON
      const [url, init] = fetchMock.mock.calls[0];
      expect((url as URL).href).toBe(
        'https://api-merchant.payos.vn/v2/payment-requests',
      );
      expect(init?.method).toBe('POST');
      expect(init?.headers).toMatchObject({
        'x-client-id': 'client-id',
        'x-api-key': 'api-key',
      });
      expect(JSON.parse(init?.body as string)).toEqual({
        ...input,
        signature: hmac(buildPayosCreateLinkSignaturePayload(input)),
      });
    });

    it('ném PayosApiError khi PayOS trả code khác "00"', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ code: '231', desc: 'Đơn thanh toán đã tồn tại' }),
      );

      const error = await makeService()
        .getPaymentLink(1)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(PayosApiError);
      expect(error).toMatchObject({
        code: '231',
        httpStatus: 200,
        message: 'Đơn thanh toán đã tồn tại',
      });
    });

    it('ném PayosApiError không có mã HTTP khi mạng lỗi hoặc quá thời gian', async () => {
      fetchMock.mockRejectedValue(new DOMException('timeout', 'TimeoutError'));

      const error = await makeService()
        .cancelPaymentLink(1, 'Đơn đã hủy')
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(PayosApiError);
      expect(error).toMatchObject({ httpStatus: null });
    });

    it('nối id giao dịch vào đường dẫn trang kết quả', () => {
      expect(makeService().buildResultUrls('pay-1')).toEqual({
        returnUrl: 'http://localhost:3000/payments/result/pay-1',
        cancelUrl: 'http://localhost:3000/payments/result/pay-1',
      });
    });
  });
});
