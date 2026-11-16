import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  calculateDistanceFee,
  calculateHaversineKm,
  ServiceService,
} from './service.service';
import { Service } from './entities/service.entity';
import { ServiceCategory } from './entities/service-category.entity';
import { ServiceStatus } from 'src/shared/types/service-status.enum';
import { VerificationStatus } from 'src/shared/types/verification-status.enum';
import { PriceUnit } from 'src/shared/types/price-unit.enum';

describe('ServiceService Unit Tests', () => {
  let service: ServiceService;
  let serviceRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let categoryRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    serviceRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    categoryRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceService,
        {
          provide: getRepositoryToken(Service),
          useValue: serviceRepo,
        },
        {
          provide: getRepositoryToken(ServiceCategory),
          useValue: categoryRepo,
        },
      ],
    }).compile();

    service = module.get<ServiceService>(ServiceService);
  });

  describe('Utility Functions: Haversine & Distance Fee', () => {
    it('TC-06: nên tính khoảng cách Haversine và miễn phí vận chuyển cho cự ly <= 3km', () => {
      // Khoảng cách giữa 2 điểm ~1.4km tại Quận 9, TP.HCM
      const dist = calculateHaversineKm(10.8456, 106.7719, 10.8485, 106.7843);
      const roundedDist = parseFloat(dist.toFixed(1));
      expect(roundedDist).toBeLessThanOrEqual(3.0);

      const fee = calculateDistanceFee(roundedDist);
      expect(fee.isFreeShipping).toBe(true);
      expect(fee.distanceFee).toBe(0);
    });

    it('TC-07: nên tính đúng phụ phí 5.000đ/km cho cự ly vượt quá 3km', () => {
      // Cự ly 4.2km -> vượt 1.2km -> 1.2 * 5000 = 6000đ
      const distanceKm = 4.2;
      const fee = calculateDistanceFee(distanceKm);
      expect(fee.isFreeShipping).toBe(false);
      expect(fee.distanceFee).toBe(6000);

      // Cự ly 5.0km -> vượt 2.0km -> 2.0 * 5000 = 10000đ
      const fee5km = calculateDistanceFee(5.0);
      expect(fee5km.isFreeShipping).toBe(false);
      expect(fee5km.distanceFee).toBe(10000);
    });
  });

  describe('TC-01: getCategories()', () => {
    it('nên lấy danh sách danh mục gốc kèm số lượng activeServicesCount', async () => {
      categoryRepo.find.mockResolvedValue([
        {
          id: 'cat-1',
          name: 'Sửa điện lạnh',
          slug: 'sua-dien-lanh',
          icon: 'ac_unit',
          parentId: null,
          isActive: true,
          children: [],
        },
      ]);

      const mockQb = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ category_id: 'cat-1', total: '5' }]),
      };
      serviceRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getCategories();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cat-1');
      expect(result[0].activeServicesCount).toBe(5);
    });
  });

  describe('TC-02 & TC-03: searchServices()', () => {
    it('TC-03: nên ném BadRequestException khi minPrice > maxPrice', async () => {
      await expect(
        service.searchServices({
          minPrice: 500000,
          maxPrice: 200000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('TC-02: nên tìm kiếm dịch vụ phân trang và lọc hợp lệ', async () => {
      const mockItems = [
        {
          id: 'srv-1',
          title: 'Sửa điều hòa Daikin',
          description: 'Nhanh chóng tiện lợi',
          basePrice: 250000,
          priceUnit: PriceUnit.FIXED,
          durationMinutes: 60,
          status: ServiceStatus.ACTIVE,
          createdAt: new Date(),
          category: {
            id: 'cat-1',
            name: 'Sửa điện lạnh',
            slug: 'sua-dien-lanh',
            icon: 'ac_unit',
          },
          provider: {
            id: 'prov-1',
            userId: 'user-1',
            displayName: 'Lê Văn Minh',
            experienceYears: 6,
            phone: '0981111001',
            user: { image: 'https://avatar.png' },
            serviceAreas: [
              {
                id: 'area-1',
                areaName: 'Quận 9, TP.HCM',
                isActive: true,
              },
            ],
          },
        },
      ];

      const mockQb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockItems, 1]),
      };
      serviceRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.searchServices({
        keyword: 'điều hòa',
        category: 'sua-dien-lanh',
        minPrice: 100000,
        maxPrice: 300000,
        minExperienceYears: 3,
        sort: 'newest',
        page: 1,
        limit: 12,
      });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Sửa điều hòa Daikin');
      expect(result.items[0].provider.displayName).toBe('Lê Văn Minh');
      expect(result.items[0].provider.areaName).toBe('Quận 9, TP.HCM');
    });
  });

  describe('TC-04 to TC-07: getNearbyServices() - Dual Radius & Pricing', () => {
    it('nên ném BadRequestException khi minPrice > maxPrice trong nearby', async () => {
      await expect(
        service.getNearbyServices({
          lat: 10.8456,
          lng: 106.7719,
          minPrice: 400000,
          maxPrice: 100000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('TC-06 & TC-07: nên quét đúng vùng phủ Dual Radius và tính phụ phí chính xác', async () => {
      const mockCandidateServices = [
        // Thợ 1: Cách khách ~1.4km (Tăng Nhơn Phú A, Quận 9), vùng thợ 10km, khách quét 5km -> Đủ điều kiện, cự ly <= 3km -> Phụ phí 0đ
        {
          id: 'srv-1',
          title: 'Sửa điện nước tại nhà',
          description: 'Sửa chữa điện nước',
          basePrice: 200000,
          priceUnit: PriceUnit.FIXED,
          durationMinutes: 45,
          category: {
            id: 'cat-2',
            name: 'Sửa điện nước',
            slug: 'sua-dien-nuoc',
            icon: 'plumbing',
          },
          provider: {
            id: 'prov-1',
            displayName: 'Nguyễn Tiến Đạt',
            experienceYears: 8,
            user: { image: 'https://avatar1.png' },
            serviceAreas: [
              {
                id: 'area-1',
                areaName: 'Trạm Tăng Nhơn Phú A - Man Thiện, Quận 9',
                centerLatitude: 10.8485,
                centerLongitude: 106.7843,
                radiusKm: 10.0,
                isActive: true,
              },
            ],
          },
        },
        // Thợ 2: Cách khách ~4.2km (Long Thạnh Mỹ, Quận 9), vùng thợ 15km, khách quét 5km -> Đủ điều kiện, cự ly > 3km -> Phụ phí 6.000đ
        {
          id: 'srv-2',
          title: 'Thông tắc bồn cầu lò xo',
          description: 'Thông tắc vệ sinh',
          basePrice: 350000,
          priceUnit: PriceUnit.FIXED,
          durationMinutes: 60,
          category: {
            id: 'cat-4',
            name: 'Thông tắc vệ sinh',
            slug: 'thong-tac-ve-sinh',
            icon: 'wash',
          },
          provider: {
            id: 'prov-2',
            displayName: 'Phạm Văn Hùng',
            experienceYears: 7,
            user: { image: 'https://avatar2.png' },
            serviceAreas: [
              {
                id: 'area-2',
                areaName: 'Trạm Long Thạnh Mỹ - Khu Công Nghệ Cao, Quận 9',
                centerLatitude: 10.8548,
                centerLongitude: 106.8091,
                radiusKm: 15.0,
                isActive: true,
              },
            ],
          },
        },
        // Thợ 3: Cách khách ~16.5km (Biên Hòa), vùng thợ 5km, khách quét 5km -> NGOÀI VÙNG PHỦ -> Phải bị loại trừ
        {
          id: 'srv-3',
          title: 'Dịch vụ xa ngoài vùng phủ',
          description: 'Dịch vụ xa',
          basePrice: 500000,
          priceUnit: PriceUnit.FIXED,
          durationMinutes: 60,
          category: {
            id: 'cat-1',
            name: 'Sửa điện lạnh',
            slug: 'sua-dien-lanh',
            icon: 'ac_unit',
          },
          provider: {
            id: 'prov-3',
            displayName: 'Thợ Ngoài Vùng',
            experienceYears: 2,
            user: { image: null },
            serviceAreas: [
              {
                id: 'area-3',
                areaName: 'Biên Hòa, Đồng Nai',
                centerLatitude: 10.95,
                centerLongitude: 106.88,
                radiusKm: 5.0,
                isActive: true,
              },
            ],
          },
        },
      ];

      const mockQb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockCandidateServices),
      };
      serviceRepo.createQueryBuilder.mockReturnValue(mockQb);

      // Khách ở Quận 9 (10.8456, 106.7719), quét bán kính 5km
      const results = await service.getNearbyServices({
        lat: 10.8456,
        lng: 106.7719,
        radius: 5,
        sort: 'distance',
      });

      // Chỉ có thợ 1 và 2 thỏa mãn, thợ 3 bị loại
      expect(results).toHaveLength(2);

      // Thợ 1: khoảng cách ~1.4km -> Miễn phí di chuyển
      expect(results[0].provider.displayName).toBe('Nguyễn Tiến Đạt');
      expect(results[0].distance.isFreeShipping).toBe(true);
      expect(results[0].distance.distanceFee).toBe(0);
      expect(results[0].distance.estimatedTotal).toBe(200000);

      // Thợ 2: khoảng cách ~4.2km -> Có phụ phí: (4.2 - 3.0) * 5000 = 6000đ
      expect(results[1].provider.displayName).toBe('Phạm Văn Hùng');
      expect(results[1].distance.isFreeShipping).toBe(false);
      expect(results[1].distance.distanceKm).toBe(4.2);
      expect(results[1].distance.distanceFee).toBe(6000);
      expect(results[1].distance.estimatedTotal).toBe(356000);
    });
  });

  describe('TC-08 & TC-09: getServiceDetail()', () => {
    it('TC-08: nên trả về chi tiết dịch vụ ACTIVE của thợ APPROVED', async () => {
      const mockDetail = {
        id: 'srv-1',
        title: 'Bảo dưỡng điều hòa',
        description: 'Vệ sinh chuyên sâu',
        basePrice: 250000,
        priceUnit: PriceUnit.FIXED,
        durationMinutes: 60,
        status: ServiceStatus.ACTIVE,
        createdAt: new Date(),
        category: {
          id: 'cat-1',
          name: 'Sửa điện lạnh',
          slug: 'sua-dien-lanh',
          icon: 'ac_unit',
        },
        provider: {
          id: 'prov-1',
          userId: 'user-1',
          displayName: 'Lê Văn Minh',
          bio: 'Kỹ sư 6 năm kinh nghiệm',
          experienceYears: 6,
          phone: '0981111001',
          verificationStatus: VerificationStatus.APPROVED,
          user: { image: 'https://avatar.png' },
          serviceAreas: [
            {
              id: 'area-1',
              areaName: 'Quận 9, TP.HCM',
              centerLatitude: 10.8456,
              centerLongitude: 106.7719,
              radiusKm: 15.0,
              isActive: true,
            },
          ],
        },
      };

      serviceRepo.findOne.mockResolvedValue(mockDetail);

      const result = await service.getServiceDetail('srv-1');
      expect(result.id).toBe('srv-1');
      expect(result.title).toBe('Bảo dưỡng điều hòa');
      expect(result.category.slug).toBe('sua-dien-lanh');
      expect(result.provider.verificationStatus).toBe(
        VerificationStatus.APPROVED,
      );
      expect(result.provider.serviceAreas).toHaveLength(1);
    });

    it('TC-09: nên ném NotFoundException khi không tìm thấy dịch vụ hoặc dịch vụ không ACTIVE', async () => {
      serviceRepo.findOne.mockResolvedValue(null);

      await expect(service.getServiceDetail('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
