import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PrivateStorageService } from 'src/app/storage/private-storage.service';
import { User } from 'src/app/user/entities/user.entity';
import { apiBadRequest, apiNotFound } from 'src/shared/helpers/api-i18n';
import { UserRole } from 'src/shared/types/user-role.enum';
import { VerificationStatus } from 'src/shared/types/verification-status.enum';
import { DataSource, Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { CheckServiceAreaDto } from './dto/service-area-and-approval.dto';
import {
  InitialServiceDto,
  RegisterProviderDto,
} from './dto/register-provider.dto';
import { UpdateServiceAreaDto } from './dto/update-service-area.dto';
import { ProviderDocument } from './entities/provider-document.entity';
import { ProviderProfile } from './entities/provider-profile.entity';
import { ProviderServiceArea } from './entities/provider-service-area.entity';
import { PROVIDER_DOCUMENT_EXTENSIONS } from './provider-document-upload';
import { Service } from 'src/app/service/entities/service.entity';
import { ServiceCategory } from 'src/app/service/entities/service-category.entity';
import { PriceUnit } from 'src/shared/types/price-unit.enum';
import { ServiceStatus } from 'src/shared/types/service-status.enum';

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
    @InjectRepository(ServiceCategory)
    private readonly categoryRepo: Repository<ServiceCategory>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly privateStorage: PrivateStorageService,
  ) {}

  private getDocumentPrefix(userId: string): string {
    return `providers/documents/${userId}/`;
  }

  /** Trả path của giấy tờ trong bucket riêng tư; chỉ nhận file trong thư mục của chính user */
  private toManagedDocumentPath(url: string, userId: string): string {
    const storagePath = this.privateStorage.toPath(url);
    if (
      !storagePath ||
      !storagePath.startsWith(this.getDocumentPrefix(userId))
    ) {
      apiBadRequest('errors.provider.invalidDocumentUrl');
    }
    return storagePath;
  }

  /** Cắt khoảng trắng ở tên dịch vụ; tên rỗng hoặc trùng nhau (không phân biệt hoa thường) trả 400 */
  private normalizeServiceDrafts(
    services: InitialServiceDto[] | undefined,
  ): InitialServiceDto[] {
    const seen = new Set<string>();

    return (services ?? []).map((service) => {
      const title = service.title.trim();
      if (!title) {
        apiBadRequest('errors.provider.serviceTitleRequired');
      }

      const key = title.toLocaleLowerCase('vi');
      if (seen.has(key)) {
        apiBadRequest('errors.provider.duplicateServiceTitle');
      }
      seen.add(key);

      return { ...service, title };
    });
  }

  /**
   * Sau khi lưu hồ sơ, xóa mọi file trong thư mục KYC của user mà hồ sơ không dùng tới.
   * Giấy tờ được tải lên trước khi gửi hồ sơ, nên lần gửi bị lỗi, giấy tờ chọn lại hoặc bấm gửi hai lần
   * đều để lại file mồ côi; giấy tờ của hồ sơ trước bị thay cũng nằm trong thư mục này.
   * Không liệt kê được thư mục thì chỉ dọn giấy tờ cũ mà database từng trỏ tới.
   */
  private async removeUnusedDocumentFiles(
    userId: string,
    keptPaths: string[],
    previousDocPaths: string[],
  ) {
    const prefix = this.getDocumentPrefix(userId);
    const kept = new Set(keptPaths);

    // URL công khai cũ (máy chưa chạy storage:move-private) cho toPath trả null nên không bị xóa
    const candidates =
      (await this.privateStorage.listFiles(prefix)) ??
      previousDocPaths.map((value) => this.privateStorage.toPath(value));

    const unused = candidates.filter(
      (path): path is string =>
        Boolean(path?.startsWith(prefix)) && !kept.has(path),
    );

    await this.privateStorage.removeMany([...new Set(unused)]);
  }

  // Database lưu path; thay bằng URL có chữ ký trước khi trả cho client
  private async signDocuments<T extends { documents?: ProviderDocument[] }>(
    profiles: T[],
  ): Promise<T[]> {
    const docs = profiles.flatMap((profile) => profile.documents ?? []);
    if (docs.length === 0) return profiles;

    const signed = await this.privateStorage.signPaths(
      docs.map((doc) => doc.fileUrl),
    );
    for (const doc of docs) {
      doc.fileUrl = signed.get(doc.fileUrl) ?? null;
    }
    return profiles;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private matchCategoryFromList(
    categories: ServiceCategory[],
    rawCategory?: string | null,
  ): ServiceCategory | null {
    const val = rawCategory?.trim();
    if (!val) return null;

    const exactIdOrSlug = categories.find(
      (c) => c.id === val || c.slug === val,
    );
    if (exactIdOrSlug) return exactIdOrSlug;

    const lowerVal = val.toLowerCase();
    const exactName = categories.find((c) => c.name.toLowerCase() === lowerVal);
    if (exactName) return exactName;

    // Tương thích ngược dữ liệu text cũ dạng "1. Điện lạnh (Điều hòa, máy giặt, tủ lạnh)"
    const cleaned = val
      .replace(/^\d+\.\s*/, '')
      .replace(/\s*\([^)]*\)/g, '')
      .trim()
      .toLowerCase();

    if (!cleaned) return null;

    const directCleaned = categories.find((c) => {
      const catName = c.name.toLowerCase();
      return (
        catName === cleaned ||
        catName.includes(cleaned) ||
        cleaned.includes(catName)
      );
    });
    if (directCleaned) return directCleaned;

    const tokens = cleaned
      .split(/[&,]+/)
      .map((t) => t.replace(/^(sửa|thiết bị|công nghiệp)\s+/i, '').trim())
      .filter((t) => t.length >= 3);

    return (
      categories.find((c) => {
        const catName = c.name.toLowerCase();
        return tokens.some((token) => catName.includes(token));
      }) ?? null
    );
  }

  private async resolveCategory(
    categoryRepo: Repository<ServiceCategory>,
    rawCategory?: string | null,
  ): Promise<ServiceCategory | null> {
    const val = rawCategory?.trim();
    if (!val) return null;

    if (this.isUuid(val)) {
      return categoryRepo.findOne({ where: { id: val } });
    }

    const bySlug = await categoryRepo.findOne({ where: { slug: val } });
    if (bySlug) return bySlug;

    const categories = await categoryRepo.find({ where: { isActive: true } });
    return this.matchCategoryFromList(categories, val);
  }

  private async attachCategoryNames<T extends { services?: Service[] }>(
    profiles: T[],
  ): Promise<
    Array<T & { categoryId: string | null; categoryName: string | null }>
  > {
    if (profiles.length === 0) return [];
    const categories = await this.categoryRepo.find();
    return profiles.map((p) => {
      const primaryCategoryId = p.services?.[0]?.categoryId ?? null;
      const matched = this.matchCategoryFromList(categories, primaryCategoryId);
      return {
        ...p,
        categoryId: primaryCategoryId,
        categoryName: matched?.name ?? primaryCategoryId ?? null,
      };
    });
  }

  async getMyProfile(userId: string) {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      relations: {
        documents: true,
        serviceAreas: true,
        services: true,
        user: true,
      },
      order: {
        documents: { createdAt: 'ASC' },
        serviceAreas: { createdAt: 'ASC' },
        services: { createdAt: 'ASC' },
      },
    });

    if (!profile) {
      return {
        status: 'UNREGISTERED',
        profile: null,
      };
    }

    const [enriched] = await this.signDocuments(
      await this.attachCategoryNames([profile]),
    );
    return {
      status: profile.verificationStatus,
      profile: enriched,
    };
  }

  async uploadDocument(userId: string, file: Express.Multer.File) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (user.isAnonymous) {
      throw new BadRequestException('Tài khoản khách không thể đăng ký Thợ');
    }

    const existing = await this.profileRepo.findOne({ where: { userId } });
    if (
      existing &&
      existing.verificationStatus === VerificationStatus.APPROVED
    ) {
      throw new ConflictException('Hồ sơ của bạn đã được phê duyệt');
    }

    const ext = PROVIDER_DOCUMENT_EXTENSIONS.get(file.mimetype) ?? 'jpg';
    const path = `${this.getDocumentPrefix(userId)}${uuidv7()}.${ext}`;
    const { signedUrl } = await this.privateStorage.upload(
      path,
      file.buffer,
      file.mimetype,
    );

    // URL có chữ ký để xem trước; form gửi lại URL này khi nộp hồ sơ
    return { fileUrl: signedUrl };
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

    // Client gửi lại URL nhận được lúc tải lên hoặc lúc xem hồ sơ; database chỉ lưu path
    const documentPaths = (dto.documents ?? []).map((doc) =>
      this.toManagedDocumentPath(doc.fileUrl, userId),
    );

    // Frontend cũ gửi initialService (một dịch vụ); coi như danh sách một phần tử
    const serviceDrafts = this.normalizeServiceDrafts(
      dto.services ?? (dto.initialService ? [dto.initialService] : undefined),
    );

    let previousDocPaths: string[] = [];

    await this.dataSource.transaction(async (manager) => {
      const pRepo = manager.getRepository(ProviderProfile);
      const dRepo = manager.getRepository(ProviderDocument);
      const aRepo = manager.getRepository(ProviderServiceArea);
      const cRepo = manager.getRepository(ServiceCategory);
      const sRepo = manager.getRepository(Service);

      const resolvedCategory = await this.resolveCategory(
        cRepo,
        dto.categoryId,
      );
      if (!resolvedCategory) {
        throw new BadRequestException('Ngành nghề dịch vụ không tồn tại');
      }

      let profile = existing;
      if (!profile) {
        profile = pRepo.create({
          userId,
          displayName: dto.displayName,
          phone: dto.phone,
          experienceYears: dto.experienceYears,
          bio: dto.bio ?? null,
          verificationStatus: VerificationStatus.PENDING,
          rejectionReason: null,
        });
      } else {
        profile.displayName = dto.displayName;
        profile.phone = dto.phone;
        profile.experienceYears = dto.experienceYears;
        profile.bio = dto.bio ?? null;
        profile.verificationStatus = VerificationStatus.PENDING;
        profile.rejectionReason = null;
      }

      const savedProfile = await pRepo.save(profile);

      // Re-save documents
      if (dto.documents && dto.documents.length > 0) {
        const previousDocs = await dRepo.find({
          where: { providerId: savedProfile.id },
          select: { fileUrl: true },
        });
        previousDocPaths = previousDocs.map((doc) => doc.fileUrl);

        await dRepo.delete({ providerId: savedProfile.id });
        const docs = dto.documents.map((d, index) =>
          dRepo.create({
            providerId: savedProfile.id,
            documentType: d.documentType,
            fileUrl: documentPaths[index],
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

      // Tạo lại các dịch vụ ở trạng thái PENDING, tất cả thuộc ngành nghề chính; admin duyệt
      // hồ sơ thì mọi dịch vụ PENDING chuyển ACTIVE
      await sRepo.delete({
        providerId: savedProfile.id,
        status: ServiceStatus.PENDING,
      });

      const drafts = serviceDrafts.length
        ? serviceDrafts
        : [
            {
              title: `Dịch vụ ${resolvedCategory.name} chuyên nghiệp`,
              basePrice: 200000,
              priceUnit: PriceUnit.FIXED,
              durationMinutes: 60,
            },
          ];

      await sRepo.save(
        drafts.map((draft) =>
          sRepo.create({
            providerId: savedProfile.id,
            categoryId: resolvedCategory.id,
            title: draft.title,
            description:
              dto.bio?.trim() ||
              `Cung cấp dịch vụ ${draft.title} tận nơi uy tín trên Servigo.`,
            basePrice: draft.basePrice,
            priceUnit: draft.priceUnit,
            durationMinutes: draft.durationMinutes,
            status: ServiceStatus.PENDING,
          }),
        ),
      );
    });

    if (documentPaths.length > 0) {
      await this.removeUnusedDocumentFiles(
        userId,
        documentPaths,
        previousDocPaths,
      );
    }

    return this.getMyProfile(userId);
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

  async updateMyStatus(userId: string, isOnline: boolean) {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      apiNotFound('errors.provider.profileNotFound');
    }

    profile.isOnline = isOnline;
    await this.profileRepo.save(profile);

    return {
      id: profile.id,
      isOnline: profile.isOnline,
    };
  }

  // Chỉ trả các trường công khai. Tọa độ tâm vùng phục vụ có thể là nhà riêng của thợ nên không trả
  async getPublicProfile(id: string) {
    const profile = await this.profileRepo.findOne({
      where: { id, verificationStatus: VerificationStatus.APPROVED },
      relations: { user: true, serviceAreas: true, services: true },
      order: { services: { createdAt: 'ASC' } },
    });

    if (!profile?.user || profile.user.deletedAt) {
      apiNotFound('errors.provider.notFound');
    }

    const [enriched] = await this.attachCategoryNames([profile]);
    const area = profile.serviceAreas.find((item) => item.isActive) ?? null;
    const activeServices = (profile.services ?? [])
      .filter((item) => item.status === ServiceStatus.ACTIVE)
      .map((item) => ({
        id: item.id,
        categoryId: item.categoryId,
        title: item.title,
        description: item.description,
        basePrice: Number(item.basePrice),
        priceUnit: item.priceUnit,
        durationMinutes: item.durationMinutes,
      }));

    return {
      id: profile.id,
      displayName: profile.displayName,
      avatarUrl: profile.user.image,
      bio: profile.bio,
      category: enriched.categoryName,
      experienceYears: profile.experienceYears,
      isOnline: profile.isOnline ?? true,
      verifiedAt: profile.approvedAt,
      serviceArea: area
        ? { areaName: area.areaName, radiusKm: Number(area.radiusKm) }
        : null,
      services: activeServices,
    };
  }

  async checkServiceArea(dto: CheckServiceAreaDto, currentUserId?: string) {
    if (
      dto.centerLatitude !== undefined &&
      dto.centerLongitude !== undefined &&
      dto.radiusKm !== undefined
    ) {
      const distance = calculateHaversineKm(
        dto.latitude,
        dto.longitude,
        dto.centerLatitude,
        dto.centerLongitude,
      );
      const radiusKm = Number(dto.radiusKm);
      const distanceKm = parseFloat(distance.toFixed(2));
      const eligible = distance <= radiusKm;
      return {
        eligible,
        distanceKm,
        radiusKm,
        areaName: null,
        message: eligible
          ? `Nằm trong vùng phục vụ (${distanceKm.toFixed(2)} km <= ${radiusKm} km)`
          : `Nằm ngoài vùng phục vụ (${distanceKm.toFixed(2)} km > ${radiusKm} km)`,
      };
    }

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
      .leftJoinAndSelect('profile.services', 'services')
      .orderBy('profile.createdAt', 'DESC')
      .addOrderBy('services.createdAt', 'ASC');

    if (filters.status && filters.status !== 'ALL') {
      qb.andWhere('profile.verificationStatus = :status', {
        status: filters.status,
      });
    }

    if (filters.category) {
      const catTerm = filters.category.trim().toLowerCase();
      const allCategories = await this.categoryRepo.find();
      const directMatched = this.matchCategoryFromList(
        allCategories,
        filters.category,
      );
      const matchedCatIds = Array.from(
        new Set([
          ...(directMatched ? [directMatched.id] : []),
          ...allCategories
            .filter(
              (c) =>
                c.id.toLowerCase() === catTerm ||
                c.slug.toLowerCase() === catTerm ||
                c.name.toLowerCase().includes(catTerm),
            )
            .map((c) => c.id),
        ]),
      );

      if (matchedCatIds.length > 0) {
        qb.andWhere(
          'EXISTS (SELECT 1 FROM service s WHERE s.provider_id = profile.id AND s.category_id IN (:...matchedCatIds))',
          { matchedCatIds },
        );
      } else {
        qb.andWhere('1 = 0');
      }
    }

    if (filters.search) {
      const normalized = filters.search.trim().replace(/^#+/, '');
      if (normalized) {
        const term = `%${normalized}%`;
        qb.andWhere(
          '(profile.displayName ILIKE :term OR profile.phone ILIKE :term OR user.name ILIKE :term OR user.email ILIKE :term OR CAST(profile.id AS text) ILIKE :term)',
          { term },
        );
      }
    }

    qb.skip(skip).take(limit);

    const [items, totalFiltered] = await qb.getManyAndCount();
    const enrichedItems = await this.signDocuments(
      await this.attachCategoryNames(items),
    );

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
      items: enrichedItems,
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
        documents: true,
        serviceAreas: true,
        services: true,
      },
      order: {
        services: { createdAt: 'ASC' },
      },
    });

    if (!profile) {
      throw new NotFoundException('Không tìm thấy hồ sơ nhà cung cấp');
    }

    const [enriched] = await this.signDocuments(
      await this.attachCategoryNames([profile]),
    );
    return enriched;
  }

  async approve(providerId: string) {
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

    await this.dataSource.transaction(async (manager) => {
      profile.verificationStatus = VerificationStatus.APPROVED;
      profile.approvedAt = new Date();
      profile.rejectionReason = null;
      await manager.getRepository(ProviderProfile).save(profile);

      // Cập nhật role = provider
      await manager
        .getRepository(User)
        .update({ id: profile.userId }, { role: UserRole.PROVIDER });

      // Kích hoạt các dịch vụ khởi tạo đang PENDING kèm theo hồ sơ đăng ký
      await manager
        .getRepository(Service)
        .update(
          { providerId: profile.id, status: ServiceStatus.PENDING },
          { status: ServiceStatus.ACTIVE },
        );
    });

    return this.getDetailForAdmin(providerId);
  }

  async reject(providerId: string, reason: string) {
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
    profile.approvedAt = null;
    profile.rejectionReason = reason;

    await this.profileRepo.save(profile);
    return this.getDetailForAdmin(providerId);
  }
}
