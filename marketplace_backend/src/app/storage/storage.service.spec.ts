import { BadGatewayException } from '@nestjs/common';
import { StorageService } from './storage.service';

const PUBLIC_PREFIX =
  'https://project.supabase.co/storage/v1/object/public/avatars/';
const PATH = 'user-1/avatar.png';

describe('StorageService', () => {
  let service: StorageService;
  let from: jest.Mock;
  let bucket: { upload: jest.Mock; remove: jest.Mock; getPublicUrl: jest.Mock };
  let logger: { setContext: jest.Mock; error: jest.Mock; warn: jest.Mock };

  beforeEach(() => {
    bucket = {
      upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
      remove: jest.fn().mockResolvedValue({ data: [], error: null }),
      getPublicUrl: jest.fn((path: string) => ({
        data: { publicUrl: `${PUBLIC_PREFIX}${path}` },
      })),
    };
    from = jest.fn(() => bucket);
    logger = { setContext: jest.fn(), error: jest.fn(), warn: jest.fn() };

    service = new StorageService(
      { storage: { from } } as never,
      { getOrThrow: () => ({ bucket: 'avatars' }) } as never,
      logger as never,
    );
  });

  it('upload đúng bucket, path, content type và trả về URL công khai', async () => {
    const file = Buffer.from('image');

    await expect(service.upload(PATH, file, 'image/png')).resolves.toBe(
      `${PUBLIC_PREFIX}${PATH}`,
    );

    expect(from).toHaveBeenCalledWith('avatars');
    expect(bucket.upload).toHaveBeenCalledWith(PATH, file, {
      contentType: 'image/png',
    });
  });

  it('trả 502 và ghi log khi Supabase báo lỗi upload', async () => {
    bucket.upload.mockResolvedValue({
      data: null,
      error: new Error('storage down'),
    });

    await expect(
      service.upload(PATH, Buffer.from('image'), 'image/png'),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ path: PATH, error: 'storage down' }),
    );
  });

  it('lấy được path từ URL thuộc bucket', () => {
    expect(service.getPathFromUrl(`${PUBLIC_PREFIX}${PATH}`)).toBe(PATH);
  });

  it.each([
    ['ảnh Google', 'https://lh3.googleusercontent.com/a/photo'],
    [
      'bucket khác',
      'https://project.supabase.co/storage/v1/object/public/other/a.png',
    ],
    ['chưa có ảnh', null],
  ])('trả về null với %s', (_, url) => {
    expect(service.getPathFromUrl(url)).toBeNull();
  });

  it('xóa đúng file theo path', async () => {
    await service.remove(PATH);

    expect(bucket.remove).toHaveBeenCalledWith([PATH]);
  });

  it('không ném lỗi khi xóa file thất bại', async () => {
    bucket.remove.mockResolvedValue({
      data: null,
      error: new Error('storage down'),
    });

    await expect(service.remove(PATH)).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ path: PATH, error: 'storage down' }),
    );
  });
});
