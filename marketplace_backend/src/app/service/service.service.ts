import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Service } from './entities/service.entity';
import { ServiceCategory } from './entities/service-category.entity';
import { ServiceStatus } from 'src/shared/types/service-status.enum';
import { VerificationStatus } from 'src/shared/types/verification-status.enum';
import { SearchServicesDto } from './dto/search-services.dto';
import { NearbyServicesDto } from './dto/nearby-services.dto';

export function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Bán kính Trái Đất theo km
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

export function calculateDistanceFee(distanceKm: number): {
  distanceFee: number;
  isFreeShipping: boolean;
} {
  const isFreeShipping = distanceKm <= 3.0;
  const distanceFee = isFreeShipping
    ? 0
    : Math.round((distanceKm - 3.0) * 5000);
  return { distanceFee, isFreeShipping };
}

@Injectable()
export class ServiceService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
    @InjectRepository(ServiceCategory)
    private readonly categoryRepo: Repository<ServiceCategory>,
  ) {}

  /**
   * GET /categories: Lấy danh mục ngành nghề công khai kèm số lượng dịch vụ ACTIVE
   */
  async getCategories() {
    // 1. Lấy tất cả danh mục đang hoạt động kèm quan hệ cha con
    const categories = await this.categoryRepo.find({
      where: { isActive: true },
      relations: { children: true },
      order: { name: 'ASC' },
    });

    // 2. Đếm số lượng dịch vụ ACTIVE theo từng danh mục
    // Chỉ tính service ACTIVE của Thợ APPROVED
    const countsRaw: Array<{ category_id: string; total: string }> =
      await this.serviceRepo
        .createQueryBuilder('service')
        .innerJoin('service.provider', 'provider')
        .select('service.categoryId', 'category_id')
        .addSelect('COUNT(service.id)', 'total')
        .where('service.status = :sStatus', { sStatus: ServiceStatus.ACTIVE })
        .andWhere('provider.verificationStatus = :vStatus', {
          vStatus: VerificationStatus.APPROVED,
        })
        .groupBy('service.categoryId')
        .getRawMany();

    const countMap = new Map<string, number>();
    for (const c of countsRaw) {
      countMap.set(c.category_id, parseInt(c.total, 10) || 0);
    }

    // 3. Chỉ lấy các danh mục gốc (parentId IS NULL) và map số lượng dịch vụ
    const rootCategories = categories.filter((cat) => !cat.parentId);

    return rootCategories.map((cat) => {
      const activeCount = countMap.get(cat.id) || 0;
      const childrenWithCount = (cat.children || [])
        .filter((child) => child.isActive)
        .map((child) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          icon: child.icon,
          activeServicesCount: countMap.get(child.id) || 0,
        }));

      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        activeServicesCount: activeCount,
        children: childrenWithCount,
      };
    });
  }

  /**
   * GET /services & GET /services/search
   */
  async searchServices(dto: SearchServicesDto) {
    if (
      dto.minPrice !== undefined &&
      dto.maxPrice !== undefined &&
      dto.minPrice > dto.maxPrice
    ) {
      throw new BadRequestException(
        'Giá tối thiểu không được lớn hơn giá tối đa',
      );
    }

    const page = Math.max(1, Number(dto.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(dto.limit) || 12));
    const skip = (page - 1) * limit;

    const qb = this.serviceRepo
      .createQueryBuilder('service')
      .innerJoinAndSelect('service.category', 'category')
      .innerJoinAndSelect('service.provider', 'provider')
      .leftJoinAndSelect('provider.user', 'user')
      .leftJoinAndSelect('provider.serviceAreas', 'serviceAreas')
      .where('service.status = :status', { status: ServiceStatus.ACTIVE })
      .andWhere('provider.verificationStatus = :vStatus', {
        vStatus: VerificationStatus.APPROVED,
      });

    // Lọc theo keyword
    this.applyKeywordFilter(qb, dto.keyword);

    // Lọc theo category (hỗ trợ cả UUID và Slug)
    if (dto.category && dto.category.trim() !== '') {
      const catVal = dto.category.trim();
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          catVal,
        );
      if (isUuid) {
        qb.andWhere('category.id = :catVal', { catVal });
      } else {
        qb.andWhere('category.slug = :catVal', { catVal });
      }
    }

    // Lọc theo khoảng giá
    if (dto.minPrice !== undefined) {
      qb.andWhere('service.basePrice >= :minPrice', { minPrice: dto.minPrice });
    }
    if (dto.maxPrice !== undefined) {
      qb.andWhere('service.basePrice <= :maxPrice', { maxPrice: dto.maxPrice });
    }

    // Lọc theo năm kinh nghiệm
    if (dto.minExperienceYears !== undefined) {
      qb.andWhere('provider.experienceYears >= :minExp', {
        minExp: dto.minExperienceYears,
      });
    }

    // Sắp xếp
    switch (dto.sort) {
      case 'price_asc':
        qb.orderBy('service.basePrice', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('service.basePrice', 'DESC');
        break;
      case 'rating':
        qb.orderBy('provider.experienceYears', 'DESC').addOrderBy(
          'service.createdAt',
          'DESC',
        );
        break;
      case 'newest':
      default:
        qb.orderBy('service.createdAt', 'DESC');
        break;
    }

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    const formattedItems = items.map((service) => {
      const activeArea = (service.provider.serviceAreas || []).find(
        (a) => a.isActive,
      );
      return {
        id: service.id,
        title: service.title,
        description: service.description,
        basePrice: Number(service.basePrice),
        priceUnit: service.priceUnit,
        durationMinutes: service.durationMinutes,
        status: service.status,
        createdAt: service.createdAt,
        category: {
          id: service.category.id,
          name: service.category.name,
          slug: service.category.slug,
          icon: service.category.icon,
        },
        provider: {
          id: service.provider.id,
          userId: service.provider.userId,
          displayName: service.provider.displayName,
          experienceYears: service.provider.experienceYears ?? 0,
          avatar: service.provider.user?.image ?? null,
          phone: service.provider.phone,
          areaName: activeArea?.areaName ?? null,
          isOnline: service.provider.isOnline ?? true,
        },
      };
    });

    return {
      items: formattedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * GET /services/nearby: Quét bán kính Dual Radius & tính phụ phí di chuyển
   */
  async getNearbyServices(dto: NearbyServicesDto) {
    if (
      dto.minPrice !== undefined &&
      dto.maxPrice !== undefined &&
      dto.minPrice > dto.maxPrice
    ) {
      throw new BadRequestException(
        'Giá tối thiểu không được lớn hơn giá tối đa',
      );
    }

    const searchRadius = Number(dto.radius) || 5;

    const qb = this.serviceRepo
      .createQueryBuilder('service')
      .innerJoinAndSelect('service.category', 'category')
      .innerJoinAndSelect('service.provider', 'provider')
      .leftJoinAndSelect('provider.user', 'user')
      .innerJoinAndSelect('provider.serviceAreas', 'serviceAreas')
      .where('service.status = :status', { status: ServiceStatus.ACTIVE })
      .andWhere('provider.verificationStatus = :vStatus', {
        vStatus: VerificationStatus.APPROVED,
      })
      .andWhere('serviceAreas.isActive = :areaActive', { areaActive: true });

    this.applyKeywordFilter(qb, dto.keyword);

    if (dto.category && dto.category.trim() !== '') {
      const catVal = dto.category.trim();
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          catVal,
        );
      if (isUuid) {
        qb.andWhere('category.id = :catVal', { catVal });
      } else {
        qb.andWhere('category.slug = :catVal', { catVal });
      }
    }

    if (dto.minPrice !== undefined) {
      qb.andWhere('service.basePrice >= :minPrice', { minPrice: dto.minPrice });
    }
    if (dto.maxPrice !== undefined) {
      qb.andWhere('service.basePrice <= :maxPrice', { maxPrice: dto.maxPrice });
    }

    if (dto.minExperienceYears !== undefined) {
      qb.andWhere('provider.experienceYears >= :minExp', {
        minExp: dto.minExperienceYears,
      });
    }

    const candidateServices = await qb.getMany();
    const results: Array<{
      service: {
        id: string;
        title: string;
        description: string;
        basePrice: number;
        priceUnit: string;
        durationMinutes: number;
        category: {
          id: string;
          name: string;
          slug: string;
          icon: string | null;
        };
      };
      provider: {
        id: string;
        displayName: string;
        experienceYears: number;
        avatar: string | null;
        isOnline: boolean;
      };
      location: {
        areaName: string | null;
        latitude: number;
        longitude: number;
        providerRadiusKm: number;
      };
      distance: {
        distanceKm: number;
        distanceFee: number;
        isFreeShipping: boolean;
        estimatedTotal: number;
      };
    }> = [];

    for (const service of candidateServices) {
      const activeAreas = (service.provider.serviceAreas || []).filter(
        (a) => a.isActive,
      );

      let bestArea: (typeof activeAreas)[0] | null = null;
      let minDistance = Infinity;

      for (const area of activeAreas) {
        const dist = calculateHaversineKm(
          dto.lat,
          dto.lng,
          Number(area.centerLatitude),
          Number(area.centerLongitude),
        );

        // Dual Radius Coverage Check
        if (dist <= searchRadius && dist <= Number(area.radiusKm)) {
          if (dist < minDistance) {
            minDistance = dist;
            bestArea = area;
          }
        }
      }

      if (bestArea && minDistance !== Infinity) {
        const distanceKm = parseFloat(minDistance.toFixed(1));
        const { distanceFee, isFreeShipping } =
          calculateDistanceFee(distanceKm);
        const estimatedTotal = Number(service.basePrice) + distanceFee;

        results.push({
          service: {
            id: service.id,
            title: service.title,
            description: service.description,
            basePrice: Number(service.basePrice),
            priceUnit: service.priceUnit,
            durationMinutes: service.durationMinutes,
            category: {
              id: service.category.id,
              name: service.category.name,
              slug: service.category.slug,
              icon: service.category.icon,
            },
          },
          provider: {
            id: service.provider.id,
            displayName: service.provider.displayName,
            experienceYears: service.provider.experienceYears ?? 0,
            avatar: service.provider.user?.image ?? null,
            isOnline: service.provider.isOnline ?? true,
          },
          location: {
            areaName: bestArea.areaName,
            latitude: Number(bestArea.centerLatitude),
            longitude: Number(bestArea.centerLongitude),
            providerRadiusKm: Number(bestArea.radiusKm),
          },
          distance: {
            distanceKm,
            distanceFee,
            isFreeShipping,
            estimatedTotal,
          },
        });
      }
    }

    // Sắp xếp kết quả
    switch (dto.sort) {
      case 'price':
        results.sort(
          (a, b) => a.distance.estimatedTotal - b.distance.estimatedTotal,
        );
        break;
      case 'rating':
        results.sort(
          (a, b) =>
            b.provider.experienceYears - a.provider.experienceYears ||
            a.distance.distanceKm - b.distance.distanceKm,
        );
        break;
      case 'distance':
      default:
        results.sort((a, b) => a.distance.distanceKm - b.distance.distanceKm);
        break;
    }

    return results;
  }

  /**
   * GET /services/:id: Xem chi tiết dịch vụ ACTIVE của Thợ APPROVED
   */
  async getServiceDetail(id: string) {
    const service = await this.serviceRepo.findOne({
      where: {
        id,
        status: ServiceStatus.ACTIVE,
      },
      relations: {
        category: true,
        provider: {
          user: true,
          serviceAreas: true,
        },
      },
    });

    if (
      !service ||
      service.provider?.verificationStatus !== VerificationStatus.APPROVED
    ) {
      throw new NotFoundException(
        'Không tìm thấy dịch vụ hoặc dịch vụ đã ngừng hoạt động',
      );
    }

    const activeAreas = (service.provider.serviceAreas || [])
      .filter((a) => a.isActive)
      .map((a) => ({
        id: a.id,
        areaName: a.areaName,
        centerLatitude: Number(a.centerLatitude),
        centerLongitude: Number(a.centerLongitude),
        radiusKm: Number(a.radiusKm),
      }));

    return {
      id: service.id,
      title: service.title,
      description: service.description,
      basePrice: Number(service.basePrice),
      priceUnit: service.priceUnit,
      durationMinutes: service.durationMinutes,
      status: service.status,
      createdAt: service.createdAt,
      category: {
        id: service.category.id,
        name: service.category.name,
        slug: service.category.slug,
        icon: service.category.icon,
      },
      provider: {
        id: service.provider.id,
        userId: service.provider.userId,
        displayName: service.provider.displayName,
        bio: service.provider.bio,
        experienceYears: service.provider.experienceYears ?? 0,
        phone: service.provider.phone,
        avatar: service.provider.user?.image ?? null,
        verificationStatus: service.provider.verificationStatus,
        serviceAreas: activeAreas,
      },
    };
  }

  /**
   * Tìm kiếm tiếng Việt không dấu trên các trường hiển thị công khai trên card
   * (bỏ description để tránh kết quả khớp ngầm với chuỗi không hiện ra ngoài).
   */
  private applyKeywordFilter(
    qb: SelectQueryBuilder<Service>,
    keyword?: string,
  ): void {
    const trimmed = keyword?.trim();
    if (!trimmed) return;
    const term = `%${trimmed}%`;
    qb.andWhere(
      '(unaccent(service.title) ILIKE unaccent(:term) OR unaccent(category.name) ILIKE unaccent(:term) OR unaccent(provider.displayName) ILIKE unaccent(:term))',
      { term },
    );
  }
}
