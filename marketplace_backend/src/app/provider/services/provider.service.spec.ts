import { Test, TestingModule } from '@nestjs/testing';
import {
  ProviderService,
  calculateHaversineDistanceKm,
} from './provider.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProviderProfile } from '../entities/provider-profile.entity';
import { ProviderDocument } from '../entities/provider-document.entity';
import { ProviderServiceArea } from '../entities/provider-service-area.entity';
import { DataSource } from 'typeorm';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { User } from 'src/app/user/entities/user.entity';
import { UserRole } from 'src/shared/types/user-role.enum';
import { VerificationStatus } from 'src/shared/types/verification-status.enum';

describe('ProviderService', () => {
  let service: ProviderService;
  let profileRepo: any;
  let docRepo: any;
  let areaRepo: any;
  let dataSource: any;

  beforeEach(async () => {
    profileRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };
    docRepo = {
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };
    areaRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderService,
        {
          provide: getRepositoryToken(ProviderProfile),
          useValue: profileRepo,
        },
        {
          provide: getRepositoryToken(ProviderDocument),
          useValue: docRepo,
        },
        {
          provide: getRepositoryToken(ProviderServiceArea),
          useValue: areaRepo,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<ProviderService>(ProviderService);
  });

  describe('calculateHaversineDistanceKm', () => {
    it('should calculate distance accurately between two HCM locations', () => {
      // Ben Thanh Market (10.7725, 106.6980) to Landmark 81 (10.7950, 106.7219)
      const distance = calculateHaversineDistanceKm(
        10.7725,
        106.698,
        10.795,
        106.7219,
      );
      // Expected around 3.6 - 3.8 km
      expect(distance).toBeGreaterThan(3.0);
      expect(distance).toBeLessThan(4.5);
    });

    it('should return 0 when coordinates are identical', () => {
      const distance = calculateHaversineDistanceKm(
        10.7725,
        106.698,
        10.7725,
        106.698,
      );
      expect(distance).toBe(0);
    });
  });

  describe('register', () => {
    it('should throw ForbiddenException for anonymous users', async () => {
      const user = {
        id: 'u-1',
        isAnonymous: true,
        role: UserRole.UNREGISTERED,
      } as User;
      const dto = {} as any;

      await expect(service.register(user, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException if profile is already PENDING', async () => {
      const user = {
        id: 'u-1',
        isAnonymous: false,
        role: UserRole.CUSTOMER,
      } as User;
      profileRepo.findOne.mockResolvedValue({
        id: 'p-1',
        verificationStatus: VerificationStatus.PENDING,
      });

      await expect(service.register(user, {} as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('checkServiceArea', () => {
    it('should return eligible: true when customer coordinates are within radius', async () => {
      areaRepo.find.mockResolvedValue([
        {
          id: 'area-1',
          centerLatitude: 10.776889,
          centerLongitude: 106.700897,
          radiusKm: 5.0,
          isActive: true,
        },
      ]);

      // Coordinates ~1.1km away (10.7850, 106.6950)
      const res = await service.checkServiceArea({
        providerId: 'p-1',
        latitude: 10.785,
        longitude: 106.695,
      });

      expect(res.eligible).toBe(true);
      expect(res.matchedAreaId).toBe('area-1');
      expect(res.distanceKm).toBeLessThanOrEqual(5.0);
    });

    it('should return eligible: false when customer is outside radius', async () => {
      areaRepo.find.mockResolvedValue([
        {
          id: 'area-1',
          centerLatitude: 10.776889,
          centerLongitude: 106.700897,
          radiusKm: 5.0,
          isActive: true,
        },
      ]);

      // Coordinates ~16.8km away (10.8850, 106.5950)
      const res = await service.checkServiceArea({
        providerId: 'p-1',
        latitude: 10.885,
        longitude: 106.595,
      });

      expect(res.eligible).toBe(false);
      expect(res.matchedAreaId).toBeNull();
      expect(res.distanceKm).toBeGreaterThan(5.0);
    });
  });
});

