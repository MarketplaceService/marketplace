import { registerAs } from '@nestjs/config';

export const SUPABASE_CONFIG = 'supabase';

export type SupabaseConfig = {
  url: string;
  secretKey: string;
  bucket: string;
};

export default registerAs(SUPABASE_CONFIG, (): SupabaseConfig => ({
  url: process.env.SUPABASE_URL ?? '',
  secretKey: process.env.SUPABASE_SECRET_KEY ?? '',
  bucket: process.env.SUPABASE_BUCKET_NAME ?? '',
}));
