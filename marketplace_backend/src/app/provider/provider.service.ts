import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/app/user/entities/user.entity';
import { apiNotFound } from 'src/shared/helpers/api-i18n';
import { UserRole } from 'src/shared/types/user-role.enum';
import { VerificationStatus } from 'src/shared/types/verification-status.enum';
import { DataSource, Repository } from 'typeorm';
import { CheckServiceAreaDto } from './dto/service-area-and-approval.dto';
import { RegisterProviderDto } from './dto/register-provider.dto';
import { UpdateServiceAreaDto } from './dto/update-service-area.dto';
import { ProviderDocument } from './entities/provider-document.entity';
import { ProviderProfile } from './entities/provider-profile.entity';
import { ProviderServiceArea } from './entities/provider-service-area.entity';

function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

@Injectable()
export class ProviderService {
  constructor(
    @InjectRepository(ProviderProfile)
    private readonly profileRepo: Repository<ProviderProfile>,
    @InjectRepository(ProviderDocument)
    private readonly docRepo: Repository<ProviderDocument>,
    @InjectRepository(ProviderServiceArea)
    private readonly areaRepo: Repository<ProviderServiceArea>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async getMyProfile(userId: string) {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      relations: {
        documents: true,
        serviceAreas: true,
        user: true,
      },
      order: {
        documents: { createdAt: 'ASC' },
        serviceAreas: { createdAt: 'ASC' },
      },
    });

    if (!profile) {
      return {
        status: 'UNREGISTERED',
        profile: null,
      };
    }

    return {
      status: profile.verificationStatus,
      profile,
    };
  }

  async register(userId: string, dto: RegisterProviderDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (user.isAnonymous) {
      throw new BadRequestException('Tài khoản khách không thể đăng ký Thợ');
    }

    const existing = await this.profileRepo.findOne({
      where: { userId },
    });

    if (
      existing &&
      existing.verificationStatus === VerificationStatus.APPROVED
    ) {
      throw new ConflictException('Hồ sơ của bạn đã được phê duyệt');
    }

    return this.dataSource.transaction(async (manager) => {
      const pRepo = manager.getRepository(ProviderProfile);
      const dRepo = manager.getRepository(ProviderDocument);
      const aRepo = manager.getRepository(ProviderServiceArea);

      let profile = existing;
      if (!profile) {
        profile = pRepo.create({
          userId,
          displayName: dto.displayName,
          phone: dto.phone,
          experienceYears: dto.experienceYears,
          categoryId: dto.categoryId,
          bio: dto.bio ?? null,
          verificationStatus: VerificationStatus.PENDING,
          rejectionReason: null,
        });
      } else {
        profile.displayName = dto.displayName;
        profile.phone = dto.phone;
        profile.experienceYears = dto.experienceYears;
        profile.categoryId = dto.categoryId;
        profile.bio = dto.bio ?? null;
        profile.verificationStatus = VerificationStatus.PENDING;
        profile.rejectionReason = null;
      }

      const savedProfile = await pRepo.save(profile);

      // Re-save documents
      if (dto.documents && dto.documents.length > 0) {
        await dRepo.delete({ providerId: savedProfile.id });
        const docs = dto.documents.map((d) =>
          dRepo.create({
            providerId: savedProfile.id,
            documentType: d.documentType,
            fileUrl: d.fileUrl,
            status: VerificationStatus.PENDING,
          }),
        );
        await dRepo.save(docs);
      }

      // Re-save service area
      if (dto.serviceArea) {
        await aRepo.delete({ providerId: savedProfile.id });
        const area = aRepo.create({
          providerId: savedProfile.id,
          areaName: dto.serviceArea.areaName ?? 'Khu vực hoạt động mặc định',
          centerLatitude: dto.serviceArea.centerLatitude,
          centerLongitude: dto.serviceArea.centerLongitude,
          radiusKm: dto.serviceArea.radiusKm,
          isActive: dto.serviceArea.isActive ?? true,
        });
        await aRepo.save(area);
      }

      return this.getMyProfile(userId);
    });
  }

  async updateMyServiceArea(userId: string, dto: UpdateServiceAreaDto) {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      apiNotFound('errors.provider.profileNotFound');
    }

    const area =
      (await this.areaRepo.findOne({
        where: { providerId: profile.id, isActive: true },
        order: { createdAt: 'ASC' },
      })) ?? this.areaRepo.create({ providerId: profile.id, isActive: true });

    area.areaName =
      dto.areaName?.trim() || area.areaName || 'Vùng phục vụ chính';
    area.centerLatitude = dto.centerLatitude;
    area.centerLongitude = dto.centerLongitude;
    area.radiusKm = dto.radiusKm;
    await this.areaRepo.save(area);

    return this.getMyProfile(userId);
  }

  // Chỉ trả các trường công khai. Tọa độ tâm vùng phục vụ có thể là nhà riêng của thợ nên không trả
  async getPublicProfile(id: string) {
    const profile = await this.profileRepo.findOne({
      where: { id, verificationStatus: VerificationStatus.APPROVED },
      relations: { user: true, serviceAreas: true },
    });

    if (!profile?.user || profile.user.deletedAt) {
      apiNotFound('errors.provider.notFound');
    }

    const area = profile.serviceAreas.find((item) => item.isActive) ?? null;

    return {
      id: profile.id,
      displayName: profile.displayName,
      avatarUrl: profile.user.image,
      bio: profile.bio,
      category: profile.categoryId,
      experienceYears: profile.experienceYears,
      verifiedAt: profile.approvedAt,
      serviceArea: area
        ? { areaName: area.areaName, radiusKm: Number(area.radiusKm) }
        : null,
    };
  }

  async checkServiceArea(dto: CheckServiceAreaDto, currentUserId?: string) {
    let providerId = dto.providerId;
    if (!providerId && currentUserId) {
      const profile = await this.profileRepo.findOne({
        where: { userId: currentUserId },
      });
      if (profile) providerId = profile.id;
    }

    if (!providerId) {
      throw new BadRequestException(
        'Vui lòng chỉ định ID Nhà cung cấp để kiểm tra',
      );
    }

    const areas = await this.areaRepo.find({
      where: { providerId, isActive: true },
    });

    if (areas.length === 0) {
      return {
        eligible: false,
        message: 'Nhà cung cấp chưa có vùng phục vụ đang hoạt động',
        distanceKm: null,
        radiusKm: null,
      };
    }

    let minDistance = Infinity;
    let matchingArea: ProviderServiceArea | null = null;

    for (const area of areas) {
      const distance = calculateHaversineKm(
        dto.latitude,
        dto.longitude,
        Number(area.centerLatitude),
        Number(area.centerLongitude),
      );

      if (distance <= Number(area.radiusKm)) {
        return {
          eligible: true,
          distanceKm: parseFloat(distance.toFixed(2)),
          radiusKm: Number(area.radiusKm),
          areaName: area.areaName,
          message: `Nằm trong vùng phục vụ (${distance.toFixed(2)} km <= ${area.radiusKm} km)`,
        };
      }

      if (distance < minDistance) {
        minDistance = distance;
        matchingArea = area;
      }
    }

    return {
      eligible: false,
      distanceKm: parseFloat(minDistance.toFixed(2)),
      radiusKm: matchingArea ? Number(matchingArea.radiusKm) : null,
      areaName: matchingArea?.areaName ?? null,
      message: `Nằm ngoài vùng phục vụ (${minDistance.toFixed(2)} km > ${matchingArea?.radiusKm} km)`,
    };
  }

  async listForAdmin(filters: {
    search?: string;
    category?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filters.limit) || 10));
    const skip = (page - 1) * limit;

    const qb = this.profileRepo
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
      qb.andWhere('profile.categoryId ILIKE :cat', {
        cat: `%${filters.category}%`,
      });
    }

    if (filters.search) {
      const term = `%${filters.search}%`;
      qb.andWhere(
        '(profile.displayName ILIKE :term OR profile.phone ILIKE :term OR user.name ILIKE :term OR user.email ILIKE :term)',
        { term },
      );
    }

    qb.skip(skip).take(limit);

    const [items, totalFiltered] = await qb.getManyAndCount();

    // Stats
    const total = await this.profileRepo.count();
    const pending = await this.profileRepo.count({
      where: { verificationStatus: VerificationStatus.PENDING },
    });
    const approved = await this.profileRepo.count({
      where: { verificationStatus: VerificationStatus.APPROVED },
    });
    const rejected = await this.profileRepo.count({
      where: { verificationStatus: VerificationStatus.REJECTED },
    });

    return {
      stats: { total, pending, approved, rejected },
      items,
      total: totalFiltered,
      page,
      limit,
      totalPages: Math.ceil(totalFiltered / limit),
    };
  }

  async getDetailForAdmin(id: string) {
    const profile = await this.profileRepo.findOne({
      where: { id },
      relations: {
        user: true,
        approver: true,
        documents: true,
        serviceAreas: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Không tìm thấy hồ sơ nhà cung cấp');
    }

    return profile;
  }

  async approve(adminId: string, providerId: string) {
    const profile = await this.profileRepo.findOne({
      where: { id: providerId },
      relations: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('Không tìm thấy hồ sơ nhà cung cấp');
    }

    if (profile.verificationStatus === VerificationStatus.APPROVED) {
      throw new ConflictException('Hồ sơ đã ở trạng thái được phê duyệt');
    }

    return this.dataSource.transaction(async (manager) => {
      profile.verificationStatus = VerificationStatus.APPROVED;
      profile.approvedBy = adminId;
      profile.approvedAt = new Date();
      profile.rejectionReason = null;
      await manager.getRepository(ProviderProfile).save(profile);

      // Cập nhật role = provider
      await manager
        .getRepository(User)
        .update({ id: profile.userId }, { role: UserRole.PROVIDER });

      return profile;
    });
  }

  async reject(adminId: string, providerId: string, reason: string) {
    const profile = await this.profileRepo.findOne({
      where: { id: providerId },
    });

    if (!profile) {
      throw new NotFoundException('Không tìm thấy hồ sơ nhà cung cấp');
    }

    if (profile.verificationStatus === VerificationStatus.APPROVED) {
      throw new ConflictException('Hồ sơ đã ở trạng thái được phê duyệt');
    }

    profile.verificationStatus = VerificationStatus.REJECTED;
    profile.approvedBy = adminId;
    profile.approvedAt = new Date();
    profile.rejectionReason = reason;

    return this.profileRepo.save(profile);
  }
}
