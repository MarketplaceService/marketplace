import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { AddressService } from './address.service';
import { Address } from './entities/address.entity';

const USER_ID = 'user-1';
const ADDRESS_ID = 'address-1';

describe('AddressService', () => {
  let service: AddressService;
  let repository: {
    findOne: jest.Mock;
    update: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let manager: { transaction: jest.Mock; getRepository: jest.Mock };
  let softDelete: jest.Mock;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn((address: Address) => Promise.resolve(address)),
      create: jest.fn((address: Partial<Address>) => address),
    };
    manager = {
      getRepository: jest.fn(() => repository),
      transaction: jest.fn((work: (m: unknown) => Promise<unknown>) =>
        work(manager),
      ),
    };
    softDelete = jest.fn();

    service = new AddressService({
      manager,
      softDelete,
    } as never);
  });

  it('chỉ tìm địa chỉ theo cả id và userId', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.update(USER_ID, ADDRESS_ID, { city: 'Huế' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: ADDRESS_ID, userId: USER_ID },
    });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('không xóa địa chỉ của người khác', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.remove(USER_ID, ADDRESS_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(softDelete).not.toHaveBeenCalled();
  });

  it('gỡ mặc định cũ trước khi lưu mặc định mới', async () => {
    repository.findOne.mockResolvedValue({
      id: ADDRESS_ID,
      userId: USER_ID,
      isDefault: false,
    });

    const result = await service.setDefault(USER_ID, ADDRESS_ID);

    expect(repository.update).toHaveBeenCalledWith(
      { userId: USER_ID, isDefault: true },
      { isDefault: false },
    );
    expect(repository.update.mock.invocationCallOrder[0]).toBeLessThan(
      repository.save.mock.invocationCallOrder[0],
    );
    expect(result.isDefault).toBe(true);
  });

  it('không gỡ mặc định khi tạo địa chỉ thường', async () => {
    await service.create(USER_ID, {
      fullName: 'A',
      phone: '0912345678',
      addressLine1: '1 Lê Lợi',
      ward: 'Phường 1',
      city: 'Huế',
      latitude: 16.4,
      longitude: 107.5,
    });

    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, isDefault: false }),
    );
  });

  it('đổi lỗi unique của Postgres thành 409', async () => {
    repository.findOne.mockResolvedValue({
      id: ADDRESS_ID,
      userId: USER_ID,
      isDefault: false,
    });
    repository.save.mockRejectedValue(
      new QueryFailedError(
        '',
        [],
        Object.assign(new Error(), { code: '23505' }),
      ),
    );

    await expect(
      service.setDefault(USER_ID, ADDRESS_ID),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
