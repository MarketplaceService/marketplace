import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import {
  SUPABASE_CONFIG,
  SupabaseConfig,
} from 'src/config/supabase/supabase.config';
import { StorageService, SUPABASE_CLIENT } from './storage.service';

@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const { url, secretKey } =
          config.getOrThrow<SupabaseConfig>(SUPABASE_CONFIG);

        return createClient(url, secretKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      },
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
