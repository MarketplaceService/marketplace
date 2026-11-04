import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { apiNotFound, translateApiMessage } from 'src/shared/helpers/api-i18n';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Address } from './entities/address.entity';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
  ) {}

  list(userId: string) {
    return this.addressRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  create(userId: string, dto: CreateAddressDto) {
    const { isDefault, ...fields } = dto;

    return this.runInTransaction(async (manager) => {
      if (isDefault) await this.clearDefault(manager, userId);

      const repository = manager.getRepository(Address);
      return repository.save(
        repository.create({ ...fields, userId, isDefault: !!isDefault }),
      );
    });
  }

  update(userId: string, id: string, dto: UpdateAddressDto) {
    const { isDefault, ...fields } = dto;

    return this.runInTransaction(async (manager) => {
      const address = await this.findOwned(manager, userId, id);

      if (isDefault && !address.isDefault) {
        await this.clearDefault(manager, userId);
      }

      Object.assign(address, fields);
      if (isDefault !== undefined) address.isDefault = isDefault;

      return manager.getRepository(Address).save(address);
    });
  }

  setDefault(userId: string, id: string) {
    return this.update(userId, id, { isDefault: true });
  }

  async remove(userId: string, id: string) {
    await this.findOwned(this.addressRepository.manager, userId, id);
    await this.addressRepository.softDelete({ id, userId });
  }

  private async findOwned(manager: EntityManager, userId: string, id: string) {
    const address = await manager
      .getRepository(Address)
      .findOne({ where: { id, userId } });

    if (!address) {
      apiNotFound('errors.address.notFound');
    }

    return address;
  }

  // Phải chạy trước khi đặt mặc định mới vì unique index kiểm tra theo từng câu lệnh
  private clearDefault(manager: EntityManager, userId: string) {
    return manager
      .getRepository(Address)
      .update({ userId, isDefault: true }, { isDefault: false });
  }

  private async runInTransaction<T>(
    work: (manager: EntityManager) => Promise<T>,
  ) {
    try {
      return await this.addressRepository.manager.transaction(work);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === PG_UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          translateApiMessage('errors.address.defaultConflict'),
        );
      }
      throw error;
    }
  }
}
