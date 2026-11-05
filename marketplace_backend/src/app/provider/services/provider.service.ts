import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProviderProfile } from '../entities/provider-profile.entity';
import { ProviderDocument } from '../entities/provider-document.entity';
import { ProviderServiceArea } from '../entities/provider-service-area.entity';
import { RegisterProviderDto } from '../dto/register-provider.dto';
import { UpdateProviderProfileDto } from '../dto/update-provider-profile.dto';
import {
  CreateServiceAreaDto,
  UpdateServiceAreaDto,
} from '../dto/service-area.dto';
import { CheckServiceAreaDto } from '../dto/check-service-area.dto';
import { UploadDocumentDto } from '../dto/upload-document.dto';
import { VerificationStatus } from 'src/shared/types/verification-status.enum';
import { User } from 'src/app/user/entities/user.entity';
import { UserRole } from 'src/shared/types/user-role.enum';

export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

@Injectable()
export class ProviderService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ProviderProfile)
    private readonly providerProfileRepo: Repository<ProviderProfile>,
    @InjectRepository(ProviderDocument)
    private readonly providerDocumentRepo: Repository<ProviderDocument>,
    @InjectRepository(ProviderServiceArea)
    private readonly providerServiceAreaRepo: Repository<ProviderServiceArea>,
  ) {}

  async register(user: User, dto: RegisterProviderDto) {
    if (user.isAnonymous || user.role === UserRole.UNREGISTERED) {
      throw new ForbiddenException(
        'Khách vãng lai không được phép đăng ký làm Nhà cung cấp. Vui lòng đăng ký tài khoản chính thức.',
      );
    }

    const existingProfile = await this.providerProfileRepo.findOne({
      where: { userId: user.id },
      relations: { documents: true, serviceAreas: true },
    });

    if (existingProfile) {
      if (
        existingProfile.verificationStatus === VerificationStatus.PENDING ||
        existingProfile.verificationStatus === VerificationStatus.APPROVED
      ) {
        throw new ConflictException(
          'Bạn đã có hồ sơ Nhà cung cấp đang chờ xét duyệt hoặc đã được phê duyệt.',
        );
      }
    }

    return await this.dataSource.transaction(async (manager) => {
      const profileRepo = manager.getRepository(ProviderProfile);
      const docRepo = manager.getRepository(ProviderDocument);
      const areaRepo = manager.getRepository(ProviderServiceArea);

      let profile = existingProfile;
      if (!profile) {
        profile = profileRepo.create({
          userId: user.id,
          displayName: dto.displayName,
          phone: dto.phone,
          experienceYears: dto.experienceYears,
          categoryId: dto.categoryId,
          bio: dto.bio ?? null,
          verificationStatus: VerificationStatus.PENDING,
          rejectionReason: null,
        });
      } else {
        // Re-submit rejected profile
        profile.displayName = dto.displayName;
        profile.phone = dto.phone;
        profile.experienceYears = dto.experienceYears;
        profile.categoryId = dto.categoryId;
        profile.bio = dto.bio ?? null;
        profile.verificationStatus = VerificationStatus.PENDING;
        profile.rejectionReason = null;
        profile.approvedBy = null;
        profile.approvedAt = null;

        // Clean up old documents and service areas if re-submitting
        await docRepo.delete({ providerId: profile.id });
        await areaRepo.delete({ providerId: profile.id });
      }

      const savedProfile = await profileRepo.save(profile);

      // Create documents
      if (dto.documents && dto.documents.length > 0) {
        const docs = dto.documents.map((d) =>
          docRepo.create({
            providerId: savedProfile.id,
            documentType: d.documentType,
            fileUrl: d.fileUrl,
            status: VerificationStatus.PENDING,
          }),
        );
        await docRepo.save(docs);
      }

      // Create service area
      if (dto.serviceArea) {
        const area = areaRepo.create({
          providerId: savedProfile.id,
          areaName: dto.serviceArea.areaName ?? 'Khu vực chính',
          centerLatitude: dto.serviceArea.centerLatitude,
          centerLongitude: dto.serviceArea.centerLongitude,
          radiusKm: dto.serviceArea.radiusKm,
          isActive: dto.serviceArea.isActive ?? true,
        });
        await areaRepo.save(area);
      }

      return profileRepo.findOne({
        where: { id: savedProfile.id },
        relations: { documents: true, serviceAreas: true },
      });
    });
  }

  async getMyProfile(userId: string) {
    const profile = await this.providerProfileRepo.findOne({
      where: { userId },
      relations: {
        documents: true,
        serviceAreas: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Chưa tìm thấy hồ sơ Nhà cung cấp của bạn');
    }

    return profile;
  }

  async updateMyProfile(userId: string, dto: UpdateProviderProfileDto) {
    const profile = await this.getMyProfile(userId);

    if (dto.displayName !== undefined) profile.displayName = dto.displayName;
    if (dto.phone !== undefined) profile.phone = dto.phone;
    if (dto.experienceYears !== undefined)
      profile.experienceYears = dto.experienceYears;
    if (dto.categoryId !== undefined) profile.categoryId = dto.categoryId;
    if (dto.bio !== undefined) profile.bio = dto.bio;

    return this.providerProfileRepo.save(profile);
  }

  async getMyDocuments(userId: string) {
    const profile = await this.getMyProfile(userId);
    return this.providerDocumentRepo.find({
      where: { providerId: profile.id },
      order: { createdAt: 'DESC' },
    });
  }

  async addDocument(userId: string, dto: UploadDocumentDto) {
    const profile = await this.getMyProfile(userId);
    const doc = this.providerDocumentRepo.create({
      providerId: profile.id,
      documentType: dto.documentType,
      fileUrl: dto.fileUrl,
      status: VerificationStatus.PENDING,
    });
    return this.providerDocumentRepo.save(doc);
  }

  async getMyServiceAreas(userId: string) {
    const profile = await this.getMyProfile(userId);
    return this.providerServiceAreaRepo.find({
      where: { providerId: profile.id },
      order: { createdAt: 'DESC' },
    });
  }

  async createServiceArea(userId: string, dto: CreateServiceAreaDto) {
    const profile = await this.getMyProfile(userId);
    const area = this.providerServiceAreaRepo.create({
      providerId: profile.id,
      areaName: dto.areaName ?? null,
      centerLatitude: dto.centerLatitude,
      centerLongitude: dto.centerLongitude,
      radiusKm: dto.radiusKm,
      isActive: dto.isActive ?? true,
    });
    return this.providerServiceAreaRepo.save(area);
  }

  async updateServiceArea(
    userId: string,
    areaId: string,
    dto: UpdateServiceAreaDto,
  ) {
    const profile = await this.getMyProfile(userId);
    const area = await this.providerServiceAreaRepo.findOne({
      where: { id: areaId, providerId: profile.id },
    });

    if (!area) {
      throw new NotFoundException('Khu vực phục vụ không tồn tại');
    }

    if (dto.areaName !== undefined) area.areaName = dto.areaName;
    if (dto.centerLatitude !== undefined)
      area.centerLatitude = dto.centerLatitude;
    if (dto.centerLongitude !== undefined)
      area.centerLongitude = dto.centerLongitude;
    if (dto.radiusKm !== undefined) area.radiusKm = dto.radiusKm;
    if (dto.isActive !== undefined) area.isActive = dto.isActive;

    return this.providerServiceAreaRepo.save(area);
  }

  async deleteServiceArea(userId: string, areaId: string) {
    const profile = await this.getMyProfile(userId);
    const area = await this.providerServiceAreaRepo.findOne({
      where: { id: areaId, providerId: profile.id },
    });

    if (!area) {
      throw new NotFoundException('Khu vực phục vụ không tồn tại');
    }

    await this.providerServiceAreaRepo.delete(area.id);
    return { success: true };
  }

  async checkServiceArea(dto: CheckServiceAreaDto) {
    const areas = await this.providerServiceAreaRepo.find({
      where: { providerId: dto.providerId, isActive: true },
    });

    if (!areas.length) {
      return {
        eligible: false,
        message: 'Nhà cung cấp chưa có khu vực phục vụ nào đang hoạt động',
        distanceKm: null,
        radiusKm: null,
        matchedAreaId: null,
      };
    }

    let minDistance = Infinity;
    let matchedArea: ProviderServiceArea | null = null;

    for (const area of areas) {
      const distance = calculateHaversineDistanceKm(
        dto.latitude,
        dto.longitude,
        area.centerLatitude,
        area.centerLongitude,
      );

      if (distance <= area.radiusKm) {
        if (!matchedArea || distance < minDistance) {
          minDistance = distance;
          matchedArea = area;
        }
      }
    }

    if (matchedArea) {
      return {
        eligible: true,
        message: 'Địa chỉ nằm trong vùng phục vụ của Nhà cung cấp',
        distanceKm: parseFloat(minDistance.toFixed(2)),
        radiusKm: matchedArea.radiusKm,
        matchedAreaId: matchedArea.id,
      };
    }

    // If not matched, compute distance to closest area for feedback
    let closestDistance = Infinity;
    let closestArea = areas[0];
    for (const area of areas) {
      const distance = calculateHaversineDistanceKm(
        dto.latitude,
        dto.longitude,
        area.centerLatitude,
        area.centerLongitude,
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestArea = area;
      }
    }

    return {
      eligible: false,
      message: 'Địa chỉ nằm ngoài vùng phục vụ của Nhà cung cấp',
      distanceKm: parseFloat(closestDistance.toFixed(2)),
      radiusKm: closestArea.radiusKm,
      matchedAreaId: null,
    };
  }

  async getPublicProfile(providerId: string) {
    const profile = await this.providerProfileRepo.findOne({
      where: { id: providerId, verificationStatus: VerificationStatus.APPROVED },
      relations: {
        user: true,
        serviceAreas: true,
      },
    });

    if (!profile) {
      throw new NotFoundException(
        'Nhà cung cấp không tồn tại hoặc chưa được phê duyệt',
      );
    }

    // Do NOT return sensitive KYC documents in public profile!
    return {
      id: profile.id,
      displayName: profile.displayName,
      bio: profile.bio,
      experienceYears: profile.experienceYears,
      categoryId: profile.categoryId,
      avatar: profile.user?.image ?? null,
      serviceAreas: profile.serviceAreas.filter((a) => a.isActive),
      createdAt: profile.createdAt,
    };
  }
}

