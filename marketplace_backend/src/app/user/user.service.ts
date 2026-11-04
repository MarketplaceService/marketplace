import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { DeepPartial, Repository } from 'typeorm';
import { apiNotFound } from 'src/shared/helpers/api-i18n';
import { Session } from '../auth/entities/session.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

  async softDeleteAccount(id: string) {
    // todo: khi có module booking, trả 409 nếu user còn booking CONFIRMED hoặc IN_PROGRESS
    await this.userRepository.manager.transaction(async (manager) => {
      await manager.softDelete(User, { id });
      await manager.delete(Session, { userId: id });
    });
  }
}
