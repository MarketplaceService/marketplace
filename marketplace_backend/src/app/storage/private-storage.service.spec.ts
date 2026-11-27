import { BadGatewayException } from '@nestjs/common';
import {
  PrivateStorageService,
  SIGNED_URL_TTL_SECONDS,
} from './private-storage.service';

const STORAGE_URL = 'https://project.supabase.co/storage/v1';
const SIGN_PREFIX = `${STORAGE_URL}/object/sign/private-files/`;
const PATH = 'providers/documents/user-1/doc.pdf';

describe('PrivateStorageService', () => {
  let service: PrivateStorageService;
  let from: jest.Mock;
  let bucket: {
    upload: jest.Mock;
    remove: jest.Mock;
    list: jest.Mock;
    getPublicUrl: jest.Mock;
    createSignedUrls: jest.Mock;
  };
  let logger: { setContext: jest.Mock; error: jest.Mock; warn: jest.Mock };

  const signedUrlOf = (path: string) => `${SIGN_PREFIX}${path}?token=t-${path}`;

  beforeEach(() => {
    bucket = {
      upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
      remove: jest.fn().mockResolvedValue({ data: [], error: null }),
      list: jest.fn().mockResolvedValue({ data: [], error: null }),
      getPublicUrl: jest.fn((path: string) => ({
        data: {
          publicUrl: `${STORAGE_URL}/object/public/private-files/${path}`,
        },
      })),
      createSignedUrls: jest.fn((paths: string[]) =>
        Promise.resolve({
          data: paths.map((path) => ({
            path,
            error: null,
            signedUrl: signedUrlOf(path),
          })),
          error: null,
        }),
      ),
    };
    from = jest.fn(() => bucket);
    logger = { setContext: jest.fn(), error: jest.fn(), warn: jest.fn() };

    service = new PrivateStorageService(
      { storage: { from } } as never,
      { getOrThrow: () => ({ privateBucket: 'private-files' }) } as never,
      logger as never,
    );
  });

  it('upload vào bucket riêng tư, trả path và URL có chữ ký', async () => {
    const file = Buffer.from('pdf');

    await expect(
      service.upload(PATH, file, 'application/pdf'),
    ).resolves.toEqual({ path: PATH, signedUrl: signedUrlOf(PATH) });

    expect(from).toHaveBeenCalledWith('private-files');
    expect(bucket.upload).toHaveBeenCalledWith(PATH, file, {
      contentType: 'application/pdf',
    });
    expect(bucket.createSignedUrls).toHaveBeenCalledWith(
      [PATH],
      SIGNED_URL_TTL_SECONDS,
    );
  });

  it('trả 502 khi Supabase báo lỗi upload', async () => {
    bucket.upload.mockResolvedValue({ data: null, error: new Error('down') });

    await expect(
      service.upload(PATH, Buffer.from('pdf'), 'application/pdf'),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  describe('toPath', () => {
    it('lấy path từ URL có chữ ký, bỏ token', () => {
      expect(service.toPath(signedUrlOf(PATH))).toBe(PATH);
    });

    it('nhận path trần', () => {
      expect(service.toPath(PATH)).toBe(PATH);
    });

    it.each([
      [
        'URL công khai của bucket khác',
        `${STORAGE_URL}/object/public/avatars/${PATH}`,
      ],
      [
        'URL công khai cũ của chính bucket',
        `${STORAGE_URL}/object/public/private-files/${PATH}`,
      ],
      [
        'URL của site khác',
        'https://evil.example/providers/documents/user-1/a.pdf',
      ],
      ['data URL', 'data:application/pdf;base64,AAAA'],
      ['path có ..', 'providers/documents/user-1/../user-2/a.pdf'],
      [
        'URL ký có ..',
        `${SIGN_PREFIX}providers/documents/user-1/../user-2/a.pdf?token=x`,
      ],
      ['path tuyệt đối', '/providers/documents/user-1/a.pdf'],
      ['rỗng', ''],
      ['null', null],
    ])('trả null với %s', (_, ref) => {
      expect(service.toPath(ref)).toBeNull();
    });
  });

  describe('signPaths', () => {
    it('ký một lần cho các path khác nhau, giữ nguyên URL cũ', async () => {
      const legacy = `${STORAGE_URL}/object/public/avatars/${PATH}`;
      const other = 'bookings/initial/user-1/a.png';

      const signed = await service.signPaths([PATH, other, PATH, legacy, null]);

      expect(bucket.createSignedUrls).toHaveBeenCalledTimes(1);
      expect(bucket.createSignedUrls).toHaveBeenCalledWith(
        [PATH, other],
        SIGNED_URL_TTL_SECONDS,
      );
      expect(signed.get(PATH)).toBe(signedUrlOf(PATH));
      expect(signed.get(other)).toBe(signedUrlOf(other));
      expect(signed.get(legacy)).toBe(legacy);
    });

    it('không gọi Supabase khi không có path nào', async () => {
      await expect(service.signPaths([])).resolves.toEqual(new Map());
      expect(bucket.createSignedUrls).not.toHaveBeenCalled();
    });

    it('bỏ qua file không còn trong bucket', async () => {
      bucket.createSignedUrls.mockResolvedValue({
        data: [{ path: PATH, error: 'Object not found', signedUrl: null }],
        error: null,
      });

      const signed = await service.signPaths([PATH]);

      expect(signed.has(PATH)).toBe(false);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('trả 502 khi Supabase không ký được', async () => {
      bucket.createSignedUrls.mockResolvedValue({
        data: null,
        error: new Error('down'),
      });

      await expect(service.signPaths([PATH])).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });
  });

  it('không ném lỗi khi xóa file thất bại', async () => {
    bucket.remove.mockResolvedValue({ data: null, error: new Error('down') });

    await expect(service.remove(PATH)).resolves.toBeUndefined();
    expect(bucket.remove).toHaveBeenCalledWith([PATH]);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('xóa nhiều file trong một lần gọi, danh sách rỗng thì không gọi', async () => {
    await service.removeMany([PATH, 'providers/documents/user-1/b.png']);
    await service.removeMany([]);

    expect(bucket.remove).toHaveBeenCalledTimes(1);
    expect(bucket.remove).toHaveBeenCalledWith([
      PATH,
      'providers/documents/user-1/b.png',
    ]);
  });

  it('liệt kê file trong thư mục, bỏ thư mục con', async () => {
    bucket.list.mockResolvedValue({
      data: [
        { id: 'a', name: 'doc.pdf' },
        { id: null, name: 'nested' },
        { id: 'b', name: 'b.png' },
      ],
      error: null,
    });

    await expect(
      service.listFiles('providers/documents/user-1/'),
    ).resolves.toEqual([
      'providers/documents/user-1/doc.pdf',
      'providers/documents/user-1/b.png',
    ]);
    expect(bucket.list).toHaveBeenCalledWith('providers/documents/user-1', {
      limit: 1000,
    });
  });

  it('liệt kê lỗi thì trả null', async () => {
    bucket.list.mockResolvedValue({ data: null, error: new Error('down') });

    await expect(
      service.listFiles('providers/documents/user-1/'),
    ).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });
});
