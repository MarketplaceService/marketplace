import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PinoLogger } from 'nestjs-pino';
import {
  SUPABASE_CONFIG,
  SupabaseConfig,
} from 'src/config/supabase/supabase.config';
import { apiBadGateway } from 'src/shared/helpers/api-i18n';
import { SUPABASE_CLIENT } from './storage.service';

/** URL có chữ ký hết hạn sau 1 giờ */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

const hasScheme = (value: string) => /^[a-z][a-z0-9+.-]*:/i.test(value);

/**
 * Bucket riêng tư chứa ảnh booking và giấy tờ KYC.
 * Database lưu path của file; API thay path bằng URL có chữ ký mỗi lần trả dữ liệu.
 */
@Injectable()
export class PrivateStorageService {
  private readonly bucket: string;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient,
    config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PrivateStorageService.name);
    this.bucket =
      config.getOrThrow<SupabaseConfig>(SUPABASE_CONFIG).privateBucket;
  }

  private get files() {
    return this.client.storage.from(this.bucket);
  }

  // Lấy từ getPublicUrl để khớp đúng host mà supabase-js dùng khi ký URL
  private get signedUrlPrefix() {
    return this.files
      .getPublicUrl('')
      .data.publicUrl.replace('/object/public/', '/object/sign/');
  }

  async upload(path: string, file: Buffer, contentType: string) {
    const { error } = await this.files.upload(path, file, { contentType });

    if (error) {
      this.logger.error({
        msg: 'privateStorage.upload.failed',
        path,
        error: error.message,
      });
      apiBadGateway('errors.storage.uploadFailed');
    }

    const signed = await this.signPaths([path]);
    const signedUrl = signed.get(path);
    if (!signedUrl) {
      apiBadGateway('errors.storage.signFailed');
    }

    return { path, signedUrl };
  }

  /**
   * Đổi giá trị client gửi lên về path trong bucket.
   * Nhận path trần hoặc URL có chữ ký của bucket này (kể cả đã hết hạn), vì form gửi lại
   * đúng URL nhận được lúc tải lên hoặc lúc xem. Giá trị khác trả về null.
   */
  toPath(ref: string | null | undefined): string | null {
    if (!ref) return null;

    let path: string;
    const prefix = this.signedUrlPrefix;

    if (ref.startsWith(prefix)) {
      try {
        path = decodeURI(ref.slice(prefix.length).split('?')[0]);
      } catch {
        return null;
      }
    } else if (!hasScheme(ref)) {
      path = ref;
    } else {
      return null;
    }

    if (!path || path.startsWith('/') || path.includes('..')) return null;

    return path;
  }

  /**
   * Ký một lần cho cả nhóm path, trả Map từ giá trị gốc sang URL xem được.
   * Giá trị đã là URL (URL công khai cũ trên máy chưa chạy storage:move-private) được giữ nguyên.
   * File không còn trong bucket thì không có trong Map.
   */
  async signPaths(refs: Array<string | null | undefined>) {
    const result = new Map<string, string>();
    const paths = new Set<string>();

    for (const ref of refs) {
      if (!ref) continue;
      if (hasScheme(ref)) result.set(ref, ref);
      else paths.add(ref);
    }

    if (paths.size === 0) return result;

    const { data, error } = await this.files.createSignedUrls(
      [...paths],
      SIGNED_URL_TTL_SECONDS,
    );

    if (error || !data) {
      this.logger.error({
        msg: 'privateStorage.sign.failed',
        count: paths.size,
        error: error?.message,
      });
      apiBadGateway('errors.storage.signFailed');
    }

    for (const item of data) {
      if (item.path && item.signedUrl) {
        result.set(item.path, item.signedUrl);
      } else {
        this.logger.warn({
          msg: 'privateStorage.sign.missing',
          path: item.path,
          error: item.error,
        });
      }
    }

    return result;
  }

  // Dọn file cũ thất bại không nên làm hỏng thao tác của người dùng
  async remove(path: string) {
    await this.removeMany([path]);
  }

  async removeMany(paths: string[]) {
    if (paths.length === 0) return;

    const { error } = await this.files.remove(paths);

    if (error) {
      this.logger.warn({
        msg: 'privateStorage.remove.failed',
        paths,
        error: error.message,
      });
    }
  }

  /**
   * Path đầy đủ của các file nằm trực tiếp trong thư mục `folder` (kết thúc bằng `/`).
   * Lỗi thì ghi log và trả null để caller bỏ qua bước dọn dẹp.
   */
  async listFiles(folder: string): Promise<string[] | null> {
    const { data, error } = await this.files.list(folder.replace(/\/$/, ''), {
      limit: 1000,
    });

    if (error || !data) {
      this.logger.warn({
        msg: 'privateStorage.list.failed',
        folder,
        error: error?.message,
      });
      return null;
    }

    // Thư mục con trả về với id null
    return data
      .filter((item) => item.id !== null)
      .map((item) => `${folder}${item.name}`);
  }
}
