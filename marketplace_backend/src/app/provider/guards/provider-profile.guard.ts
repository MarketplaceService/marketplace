import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderProfile } from '../entities/provider-profile.entity';
import { UserRole } from 'src/shared/types/user-role.enum';
import { VerificationStatus } from 'src/shared/types/verification-status.enum';
import { AuthenticatedRequest } from 'src/core/guards/auth.guard';

@Injectable()
export class ProviderProfileGuard implements CanActivate {
  constructor(
    @InjectRepository(ProviderProfile)
    private readonly providerProfileRepo: Repository<ProviderProfile>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Bạn cần đăng nhập để tiếp tục');
    }

    if (user.role !== UserRole.PROVIDER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Bạn không có quyền thao tác với tư cách là Nhà cung cấp',
      );
    }

    // Check if provider profile exists and is APPROVED
    const profile = await this.providerProfileRepo.findOne({
      where: { userId: user.id },
    });

    if (!profile) {
      throw new ForbiddenException('Chưa tìm thấy hồ sơ Nhà cung cấp của bạn');
    }

    if (profile.verificationStatus !== VerificationStatus.APPROVED) {
      throw new ForbiddenException(
        'Hồ sơ Nhà cung cấp của bạn chưa được phê duyệt',
      );
    }

    return true;
  }
}

