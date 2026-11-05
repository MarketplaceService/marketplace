import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { ProviderProfile } from '../entities/provider-profile.entity';
import { ProviderDocument } from '../entities/provider-document.entity';
import { User } from 'src/app/user/entities/user.entity';
import { VerificationStatus } from 'src/shared/types/verification-status.enum';
import { UserRole } from 'src/shared/types/user-role.enum';

export interface ProviderQueryFilters {
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AdminProviderService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ProviderProfile)
    private readonly providerProfileRepo: Repository<ProviderProfile>,
    @InjectRepository(ProviderDocument)
    private readonly providerDocumentRepo: Repository<ProviderDocument>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getStats() {
    const [total, pending, approved, rejected] = await Promise.all([
      this.providerProfileRepo.count(),
      this.providerProfileRepo.count({
        where: { verificationStatus: VerificationStatus.PENDING },
      }),
      this.providerProfileRepo.count({
        where: { verificationStatus: VerificationStatus.APPROVED },
      }),
      this.providerProfileRepo.count({
        where: { verificationStatus: VerificationStatus.REJECTED },
      }),
    ]);

    return { total, pending, approved, rejected };
  }

  async getProvidersList(filters: ProviderQueryFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, Math.min(100, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.providerProfileRepo
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .leftJoinAndSelect('profile.documents', 'documents')
      .leftJoinAndSelect('profile.serviceAreas', 'serviceAreas')
      .orderBy('profile.createdAt', 'DESC');

    if (filters.status && filters.status !== 'ALL') {
      qb.andWhere('profile.verificationStatus = :status', {
        status: filters.status,
      });
    }

    if (filters.category) {
      qb.andWhere('profile.categoryId = :category', {
        category: filters.category,
      });
    }

    if (filters.search) {
      const s = `%${filters.search.trim()}%`;
      qb.andWhere(
        '(profile.displayName ILIKE :s OR user.name ILIKE :s OR user.email ILIKE :s OR profile.phone ILIKE :s)',
        { s },
      );
    }

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
    const stats = await this.getStats();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats,
    };
  }

  async getProviderDetail(providerId: string) {
    const profile = await this.providerProfileRepo.findOne({
      where: { id: providerId },
      relations: {
        user: true,
        approver: true,
        documents: true,
        serviceAreas: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Không tìm thấy hồ sơ Nhà cung cấp');
    }

    return profile;
  }

  async approveProvider(adminId: string, providerId: string) {
    const profile = await this.providerProfileRepo.findOne({
      where: { id: providerId },
      relations: { user: true, documents: true },
    });

    if (!profile) {
      throw new NotFoundException('Không tìm thấy hồ sơ Nhà cung cấp');
    }

    if (profile.verificationStatus === VerificationStatus.APPROVED) {
      throw new ConflictException('Hồ sơ Nhà cung cấp này đã được phê duyệt');
    }

    return await this.dataSource.transaction(async (manager) => {
      const profileRepo = manager.getRepository(ProviderProfile);
      const userRepo = manager.getRepository(User);
      const docRepo = manager.getRepository(ProviderDocument);

      // 1. Update profile
      profile.verificationStatus = VerificationStatus.APPROVED;
      profile.approvedBy = adminId;
      profile.approvedAt = new Date();
      profile.rejectionReason = null;
      await profileRepo.save(profile);

      // 2. Update user role
      await userRepo.update(profile.userId, {
        role: UserRole.PROVIDER,
      });

      // 3. Update documents status
      await docRepo.update(
        { providerId: profile.id },
        { status: VerificationStatus.APPROVED },
      );

      return profileRepo.findOne({
        where: { id: profile.id },
        relations: {
          user: true,
          approver: true,
          documents: true,
          serviceAreas: true,
        },
      });
    });
  }

  async rejectProvider(adminId: string, providerId: string, reason: string) {
    const profile = await this.providerProfileRepo.findOne({
      where: { id: providerId },
      relations: { user: true, documents: true },
    });

    if (!profile) {
      throw new NotFoundException('Không tìm thấy hồ sơ Nhà cung cấp');
    }

    return await this.dataSource.transaction(async (manager) => {
      const profileRepo = manager.getRepository(ProviderProfile);
      const userRepo = manager.getRepository(User);
      const docRepo = manager.getRepository(ProviderDocument);

      // 1. Update profile
      profile.verificationStatus = VerificationStatus.REJECTED;
      profile.rejectionReason = reason;
      profile.approvedBy = null;
      profile.approvedAt = null;
      await profileRepo.save(profile);

      // 2. Ensure user role remains CUSTOMER (or revert if previously provider)
      if (profile.user && profile.user.role === UserRole.PROVIDER) {
        await userRepo.update(profile.userId, {
          role: UserRole.CUSTOMER,
        });
      }

      // 3. Update documents status
      await docRepo.update(
        { providerId: profile.id },
        { status: VerificationStatus.REJECTED },
      );

      return profileRepo.findOne({
        where: { id: profile.id },
        relations: {
          user: true,
          approver: true,
          documents: true,
          serviceAreas: true,
        },
      });
    });
  }
}

