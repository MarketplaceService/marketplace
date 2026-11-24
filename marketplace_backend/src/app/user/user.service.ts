import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { DeepPartial, Repository } from 'typeorm';
import { apiConflict, apiNotFound } from 'src/shared/helpers/api-i18n';
import { BookingStatus } from 'src/shared/types/booking-status.enum';
import { v7 as uuidv7 } from 'uuid';
import { Session } from '../auth/entities/session.entity';
import { Booking } from '../booking/entities/booking.entity';
import { StorageService } from '../storage/storage.service';
import { AVATAR_EXTENSIONS } from './avatar-upload';
import { UpdateProfileDto } from './dto/update-profile.dto';

const BLOCKING_DELETE_BOOKING_STATUSES = [
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
];

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly storageService: StorageService,
  ) {}
  async verifyUser(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      apiNotFound('errors.common.userNotFound');
    }

    return this.userRepository.update({ id: user.id }, { emailVerified: true });
  }

  async getUser(id: string) {
    return this.userRepository.findOne({ where: { id } });
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const user = await this.getUser(id);
    if (!user) {
      apiNotFound('errors.common.userNotFound');
    }

    return this.userRepository.save(
      this.userRepository.merge(user, dto as DeepPartial<User>),
    );
  }

  async updateAvatar(id: string, file: Express.Multer.File) {
    const user = await this.getUser(id);
    if (!user) {
      apiNotFound('errors.common.userNotFound');
    }

    const previousPath = this.storageService.getPathFromUrl(user.image);
    const path = `${id}/${uuidv7()}.${AVATAR_EXTENSIONS.get(file.mimetype)}`;
    const image = await this.storageService.upload(
      path,
      file.buffer,
      file.mimetype,
    );

    const saved = await this.userRepository
      .save(this.userRepository.merge(user, { image }))
      .catch(async (error: unknown) => {
        await this.storageService.remove(path);
        throw error;
      });

    // better-auth cho người dùng đặt image tùy ý, nên chỉ xóa file trong thư mục của chính họ
    if (previousPath?.startsWith(`${id}/`)) {
      await this.storageService.remove(previousPath);
    }

    return saved;
  }

  async softDeleteAccount(id: string) {
    await this.userRepository.manager.transaction(async (manager) => {
      const hasBlockingBooking = await manager
        .createQueryBuilder(Booking, 'booking')
        .leftJoin('booking.provider', 'provider')
        .where('booking.status IN (:...statuses)', {
          statuses: BLOCKING_DELETE_BOOKING_STATUSES,
        })
        .andWhere(
          '(booking.customerId = :userId OR provider.userId = :userId)',
          { userId: id },
        )
        .getExists();

      if (hasBlockingBooking) {
        apiConflict('errors.user.activeBookingConflict');
      }

      await manager.softDelete(User, { id });
      await manager.delete(Session, { userId: id });
    });
  }
}
