import { Test, TestingModule } from '@nestjs/testing';
import { AdminProviderService } from './admin-provider.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProviderProfile } from '../entities/provider-profile.entity';
import { ProviderDocument } from '../entities/provider-document.entity';
import { User } from 'src/app/user/entities/user.entity';
import { DataSource } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { VerificationStatus } from 'src/shared/types/verification-status.enum';
import { UserRole } from 'src/shared/types/user-role.enum';

describe('AdminProviderService', () => {
  let service: AdminProviderService;
  let profileRepo: any;
  let docRepo: any;
  let userRepo: any;
  let dataSource: any;

  beforeEach(async () => {
    profileRepo = {
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
      save: jest.fn(),
    };
    docRepo = {
      update: jest.fn(),
    };
    userRepo = {
      update: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminProviderService,
        {
          provide: getRepositoryToken(ProviderProfile),
          useValue: profileRepo,
        },
        {
          provide: getRepositoryToken(ProviderDocument),
          useValue: docRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<AdminProviderService>(AdminProviderService);
  });

  describe('getStats', () => {
    it('should return correct counts', async () => {
      profileRepo.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(3) // approved
        .mockResolvedValueOnce(2); // rejected

      const stats = await service.getStats();

      expect(stats).toEqual({
        total: 10,
        pending: 5,
        approved: 3,
        rejected: 2,
      });
    });
  });

  describe('approveProvider', () => {
    it('should throw NotFoundException if provider does not exist', async () => {
      profileRepo.findOne.mockResolvedValue(null);

      await expect(service.approveProvider('admin-1', 'p-999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if provider is already APPROVED', async () => {
      profileRepo.findOne.mockResolvedValue({
        id: 'p-1',
        verificationStatus: VerificationStatus.APPROVED,
      });

      await expect(service.approveProvider('admin-1', 'p-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should approve provider and update user role to PROVIDER in transaction', async () => {
      const mockProfile = {
        id: 'p-1',
        userId: 'u-1',
        verificationStatus: VerificationStatus.PENDING,
      };
      profileRepo.findOne.mockResolvedValue(mockProfile);

      const mockManager = {
        getRepository: jest.fn((entity) => {
          if (entity === ProviderProfile) {
            return {
              save: jest.fn().mockResolvedValue({
                ...mockProfile,
                verificationStatus: VerificationStatus.APPROVED,
              }),
              findOne: jest.fn().mockResolvedValue({
                ...mockProfile,
                verificationStatus: VerificationStatus.APPROVED,
              }),
            };
          }
          if (entity === User) {
            return {
              update: jest.fn().mockResolvedValue(true),
            };
          }
          if (entity === ProviderDocument) {
            return {
              update: jest.fn().mockResolvedValue(true),
            };
          }
        }),
      };

      dataSource.transaction.mockImplementation((cb: any) => cb(mockManager));

      const result = await service.approveProvider('admin-1', 'p-1');
      expect(result.verificationStatus).toBe(VerificationStatus.APPROVED);
    });
  });

  describe('rejectProvider', () => {
    it('should set status to REJECTED and save rejection reason', async () => {
      const mockProfile = {
        id: 'p-1',
        userId: 'u-1',
        verificationStatus: VerificationStatus.PENDING,
        user: { role: UserRole.CUSTOMER },
      };
      profileRepo.findOne.mockResolvedValue(mockProfile);

      const mockManager = {
        getRepository: jest.fn((entity) => {
          if (entity === ProviderProfile) {
            return {
              save: jest.fn().mockResolvedValue({
                ...mockProfile,
                verificationStatus: VerificationStatus.REJECTED,
                rejectionReason: 'CCCD bị mờ',
              }),
              findOne: jest.fn().mockResolvedValue({
                ...mockProfile,
                verificationStatus: VerificationStatus.REJECTED,
                rejectionReason: 'CCCD bị mờ',
              }),
            };
          }
          if (entity === User) {
            return {
              update: jest.fn().mockResolvedValue(true),
            };
          }
          if (entity === ProviderDocument) {
            return {
              update: jest.fn().mockResolvedValue(true),
            };
          }
        }),
      };

      dataSource.transaction.mockImplementation((cb: any) => cb(mockManager));

      const result = await service.rejectProvider(
        'admin-1',
        'p-1',
        'CCCD bị mờ',
      );
      expect(result.verificationStatus).toBe(VerificationStatus.REJECTED);
      expect(result.rejectionReason).toBe('CCCD bị mờ');
    });
  });
});

