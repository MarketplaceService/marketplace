import { registerAs } from '@nestjs/config';
import { parseEnvOrigins } from 'src/shared/utils/parse-env-origins';

export const PAYOS_CONFIG = 'payos';

export const DEFAULT_PAYOS_LINK_TTL_MINUTES = 15;

const DEFAULT_RESULT_PATH = '/payments/result';

export type PayosConfig = {
  // Ba khóa của kênh thanh toán. Thiếu một khóa thì PayOS coi như tắt
  clientId: string | null;
  apiKey: string | null;
  checksumKey: string | null;
  baseUrl: string;
  /** Đường dẫn gốc trang kết quả, không có / ở cuối. Mỗi giao dịch nối thêm /<paymentId> */
  returnUrl: string;
  cancelUrl: string;
  linkTtlMinutes: number;
};

function trimOrNull(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export default registerAs(PAYOS_CONFIG, (): PayosConfig => {
  const frontendOrigin =
    parseEnvOrigins(process.env.CLIENT_URL)[0] ?? 'http://localhost:3000';
  const returnUrl = stripTrailingSlash(
    trimOrNull(process.env.PAYOS_RETURN_URL) ??
      `${stripTrailingSlash(frontendOrigin)}${DEFAULT_RESULT_PATH}`,
  );
  const cancelUrl = stripTrailingSlash(
    trimOrNull(process.env.PAYOS_CANCEL_URL) ?? returnUrl,
  );
  const ttl = Number(process.env.PAYOS_LINK_TTL_MINUTES);

  return {
    clientId: trimOrNull(process.env.PAYOS_CLIENT_ID),
    apiKey: trimOrNull(process.env.PAYOS_API_KEY),
    checksumKey: trimOrNull(process.env.PAYOS_CHECKSUM_KEY),
    baseUrl: 'https://api-merchant.payos.vn',
    returnUrl,
    cancelUrl,
    linkTtlMinutes:
      Number.isInteger(ttl) && ttl >= 5 && ttl <= 60
        ? ttl
        : DEFAULT_PAYOS_LINK_TTL_MINUTES,
  };
});
