import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PinoLogger } from 'nestjs-pino';
import {
  SUPABASE_CONFIG,
  SupabaseConfig,
} from 'src/config/supabase/supabase.config';
import { apiBadGateway } from 'src/shared/helpers/api-i18n';

export const SUPABASE_CLIENT = Symbol('SUPABASE_CLIENT');

@Injectable()
export class StorageService {
  private readonly bucket: string;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient,
    config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(StorageService.name);
    this.bucket = config.getOrThrow<SupabaseConfig>(SUPABASE_CONFIG).bucket;
  }

  private get files() {
    return this.client.storage.from(this.bucket);
  }

  async upload(path: string, file: Buffer, contentType: string) {
    const { error } = await this.files.upload(path, file, { contentType });

    if (error) {
      this.logger.error({
        msg: 'storage.upload.failed',
        path,
        error: error.message,
      });
      apiBadGateway('errors.storage.uploadFailed');
    }

    return this.files.getPublicUrl(path).data.publicUrl;
  }

  getPathFromUrl(url: string | null) {
    const prefix = this.files.getPublicUrl('').data.publicUrl;

    return url?.startsWith(prefix) ? url.slice(prefix.length) : null;
  }

  // Dọn file cũ thất bại không nên làm hỏng thao tác của người dùng
  async remove(path: string) {
    const { error } = await this.files.remove([path]);

    if (error) {
      this.logger.warn({
        msg: 'storage.remove.failed',
        path,
        error: error.message,
      });
    }
  }
}
