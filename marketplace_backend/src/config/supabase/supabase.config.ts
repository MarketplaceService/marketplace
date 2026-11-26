import { registerAs } from '@nestjs/config';

export const SUPABASE_CONFIG = 'supabase';

// Bucket riêng tư cho ảnh booking và giấy tờ KYC. Mặc định để máy chưa thêm biến vẫn khởi động được
export const DEFAULT_PRIVATE_BUCKET_NAME = 'private-files';

export type SupabaseConfig = {
  url: string;
  secretKey: string;
  /** Bucket công khai, chỉ chứa ảnh đại diện */
  bucket: string;
  /** Bucket riêng tư: bookings/ và providers/, chỉ xem qua URL có chữ ký */
  privateBucket: string;
};

export default registerAs(SUPABASE_CONFIG, (): SupabaseConfig => ({
  url: process.env.SUPABASE_URL ?? '',
  secretKey: process.env.SUPABASE_SECRET_KEY ?? '',
  bucket: process.env.SUPABASE_BUCKET_NAME ?? '',
  privateBucket:
    process.env.SUPABASE_PRIVATE_BUCKET_NAME?.trim() ||
    DEFAULT_PRIVATE_BUCKET_NAME,
}));
