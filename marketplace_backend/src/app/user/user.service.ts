import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { DeepPartial, Repository } from 'typeorm';
import { apiNotFound } from 'src/shared/helpers/api-i18n';
import { v7 as uuidv7 } from 'uuid';
import { Session } from '../auth/entities/session.entity';
import { StorageService } from '../storage/storage.service';
import { AVATAR_EXTENSIONS } from './avatar-upload';
import { UpdateProfileDto } from './dto/update-profile.dto';

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
    // todo: khi có module booking, trả 409 nếu user còn booking CONFIRMED hoặc IN_PROGRESS
    await this.userRepository.manager.transaction(async (manager) => {
      await manager.softDelete(User, { id });
      await manager.delete(Session, { userId: id });
    });
  }
}
