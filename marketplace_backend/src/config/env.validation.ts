import { z } from 'zod';

// .env.dev để trống nhiều biến chưa dùng (ví dụ PAYOS_CLIENT_ID=), nên chuỗi rỗng coi như chưa đặt
const emptyAsUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const envSchema = z.looseObject({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(8080),

  //* Cors
  CLIENT_URL: z.string().trim().min(1),
  CORS_OTHER_URL: z.string().trim().optional(),

  //* Database
  DB_HOST: z.string().trim().min(1), //localhost
  DB_PORT: z.coerce.number().int().min(1).max(65535), //5432
  DB_USERNAME: z.string().trim().min(1), //postgres
  DB_PASSWORD: z.string().min(1), //postgres
  DB_NAME: z.string().trim().min(1), //ecommerce
  DB_POOL_MAX: z.coerce.number().default(20),
  DB_POOL_MIN: z.coerce.number().default(2),
  DB_POOL_CONNECTION_TIMEOUT_MS: z.coerce.number().default(5000),
  DB_POOL_IDLE_TIMEOUT_MS: z.coerce.number().default(30000),

  //* Throttler
  THROTTLE_TTL_MS: z.coerce.number().default(1000),
  THROTTLE_LIMIT: z.coerce.number().default(60),

  //* Email (SMTP)
  SMTP_USER: z.email(),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.email(),

  BETTER_AUTH_SECRET: z.string().min(32),

  //* Internal API
  INTERNAL_API_SECRET: z.string().min(32),

  //* Supabase Storage
  SUPABASE_URL: z.url(), //https://<project-ref>.supabase.co, không kèm /rest/v1/
  SUPABASE_SECRET_KEY: z.string().trim().min(1),
  SUPABASE_BUCKET_NAME: z.string().trim().min(1),
  // Bucket riêng tư cho bookings/ và providers/. Bỏ trống thì dùng private-files
  SUPABASE_PRIVATE_BUCKET_NAME: z.string().trim().min(1).optional(),
  SUPABASE_ANON_KEY: z.string().trim().optional(),

  //* MapVina (REST API key cho tìm địa chỉ). Bỏ trống thì app vẫn chạy, chỉ không có gợi ý địa chỉ
  MAPVINA_API_KEY: z.string().trim().optional(),

  //* PayOS. Thiếu một trong ba khóa thì PayOS tắt, chỉ còn thanh toán tiền mặt
  PAYOS_CLIENT_ID: z.preprocess(emptyAsUndefined, z.string().trim().optional()),
  PAYOS_API_KEY: z.preprocess(emptyAsUndefined, z.string().trim().optional()),
  PAYOS_CHECKSUM_KEY: z.preprocess(
    emptyAsUndefined,
    z.string().trim().optional(),
  ),
  // Đường dẫn gốc trang kết quả trên frontend, ví dụ http://localhost:3000/payments/result.
  // Mỗi giao dịch nối thêm /<paymentId>, dấu / ở cuối bị bỏ. Bỏ trống thì dùng <CLIENT_URL>/payments/result
  PAYOS_RETURN_URL: z.preprocess(emptyAsUndefined, z.url().optional()),
  // Bỏ trống thì dùng PAYOS_RETURN_URL, vì cùng một trang xử lý cả trường hợp bị hủy
  PAYOS_CANCEL_URL: z.preprocess(emptyAsUndefined, z.url().optional()),
  // Hạn của link thanh toán, tính bằng phút
  PAYOS_LINK_TTL_MINUTES: z.preprocess(
    emptyAsUndefined,
    z.coerce.number().int().min(5).max(60).default(15),
  ),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => ` - ${i.path.join('.')} : ${i.message}`)
      .join('\n');

    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return parsed.data;
}
