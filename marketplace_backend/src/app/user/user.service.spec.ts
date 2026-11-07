import { NotFoundException } from '@nestjs/common';
import { User } from './entities/user.entity';
import { UserService } from './user.service';

const USER_ID = 'user-1';
const NEW_URL = 'https://storage.test/avatars/new.png';
const OWN_OLD_PATH = `${USER_ID}/old.png`;
const OWN_OLD_URL = `https://storage.test/avatars/${OWN_OLD_PATH}`;

const file = {
  mimetype: 'image/png',
  buffer: Buffer.from('image'),
} as Express.Multer.File;

describe('UserService.updateAvatar', () => {
  let service: UserService;
  let repository: { findOne: jest.Mock; merge: jest.Mock; save: jest.Mock };
  let storage: {
    getPathFromUrl: jest.Mock;
    upload: jest.Mock;
    remove: jest.Mock;
  };

  const givenUserImage = (image: string | null) => {
    repository.findOne.mockResolvedValue({ id: USER_ID, image });
  };

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      merge: jest.fn((user: User, data: Partial<User>) => ({
        ...user,
        ...data,
      })),
      save: jest.fn((user: User) => Promise.resolve(user)),
    };
    storage = {
      getPathFromUrl: jest.fn((url: string | null) =>
        url?.startsWith('https://storage.test/avatars/')
          ? url.slice('https://storage.test/avatars/'.length)
          : null,
      ),
      upload: jest.fn().mockResolvedValue(NEW_URL),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    service = new UserService(repository as never, storage as never);
  });

  it('upload vào thư mục của user, lưu URL mới và xóa ảnh cũ', async () => {
    givenUserImage(OWN_OLD_URL);

    const saved = await service.updateAvatar(USER_ID, file);

    expect(saved.image).toBe(NEW_URL);
    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/[0-9a-f-]{36}\.png$/),
      file.buffer,
      'image/png',
    );
    expect(storage.remove).toHaveBeenCalledTimes(1);
    expect(storage.remove).toHaveBeenCalledWith(OWN_OLD_PATH);
  });

  it('dùng đuôi jpg cho ảnh JPEG', async () => {
    givenUserImage(null);

    await service.updateAvatar(USER_ID, {
      ...file,
      mimetype: 'image/jpeg',
    });

    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(/\.jpg$/),
      file.buffer,
      'image/jpeg',
    );
  });

  it('xóa file vừa upload và giữ ảnh cũ khi lưu database lỗi', async () => {
    givenUserImage(OWN_OLD_URL);
    repository.save.mockRejectedValue(new Error('database down'));

    await expect(service.updateAvatar(USER_ID, file)).rejects.toThrow(
      'database down',
    );

    const [uploadedPath] = storage.upload.mock.calls[0] as [string];
    expect(storage.remove).toHaveBeenCalledTimes(1);
    expect(storage.remove).toHaveBeenCalledWith(uploadedPath);
  });

  it('không xóa gì khi ảnh cũ nằm ngoài bucket', async () => {
    givenUserImage('https://lh3.googleusercontent.com/a/photo');

    await service.updateAvatar(USER_ID, file);

    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('không xóa file trong thư mục của người khác', async () => {
    givenUserImage('https://storage.test/avatars/user-2/photo.png');

    await service.updateAvatar(USER_ID, file);

    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('không nhầm thư mục có tên bắt đầu giống user', async () => {
    givenUserImage('https://storage.test/avatars/user-10/photo.png');

    await service.updateAvatar(USER_ID, file);

    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('trả 404 và không upload khi không tìm thấy user', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.updateAvatar(USER_ID, file)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(storage.upload).not.toHaveBeenCalled();
  });
});
