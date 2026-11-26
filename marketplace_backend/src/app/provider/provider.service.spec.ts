import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Service } from 'src/app/service/entities/service.entity';
import { ServiceCategory } from 'src/app/service/entities/service-category.entity';
import { PriceUnit } from 'src/shared/types/price-unit.enum';
import { ServiceStatus } from 'src/shared/types/service-status.enum';
import { VerificationStatus } from 'src/shared/types/verification-status.enum';
import {
  InitialServiceDto,
  MAX_REGISTER_SERVICES,
  RegisterProviderDto,
} from './dto/register-provider.dto';
import { ProviderDocument } from './entities/provider-document.entity';
import { ProviderProfile } from './entities/provider-profile.entity';
import { ProviderServiceArea } from './entities/provider-service-area.entity';
import { ProviderService } from './provider.service';

const USER_ID = '01a1d9e6-0000-7000-8000-000000000001';
const PROFILE_ID = '01a1d9e6-0000-7000-8000-000000000002';
const CATEGORY_ID = '01a1d9e6-0000-7000-8000-000000000003';
const SIGN_PREFIX =
  'https://project.supabase.co/storage/v1/object/sign/private-files/';
const docPath = (name: string, userId = USER_ID) =>
  `providers/documents/${userId}/${name}.png`;
const signedUrl = (path: string) => `${SIGN_PREFIX}${path}?token=t`;
const serviceItem = (title: string): InitialServiceDto => ({
  title,
  basePrice: 250000,
  priceUnit: PriceUnit.HOURLY,
  durationMinutes: 90,
});

describe('ProviderService.register', () => {
  let service: ProviderService;
  let serviceRepoInTx: {
    delete: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let docRepoInTx: {
    find: jest.Mock;
    delete: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let privateStorage: {
    toPath: jest.Mock;
    remove: jest.Mock;
    removeMany: jest.Mock;
    listFiles: jest.Mock;
    signPaths: jest.Mock;
  };

  beforeEach(() => {
    const existingProfile = {
      id: PROFILE_ID,
      userId: USER_ID,
      verificationStatus: VerificationStatus.REJECTED,
    };

    docRepoInTx = {
      find: jest
        .fn()
        .mockResolvedValue([
          { fileUrl: docPath('kept') },
          { fileUrl: docPath('replaced') },
          { fileUrl: 'data:image/png;base64,AAAA' },
        ]),
      delete: jest.fn(),
      create: jest.fn((value: object) => value),
      save: jest.fn(),
    };

    const passthroughRepo = {
      delete: jest.fn(),
      create: jest.fn((value: object) => value),
      save: jest.fn((value: object) => value),
    };
    serviceRepoInTx = {
      delete: jest.fn(),
      create: jest.fn((value: object) => value),
      save: jest.fn((value: object) => value),
    };
    const repos = new Map<unknown, object>([
      [ProviderProfile, { save: jest.fn((value: object) => value) }],
      [ProviderDocument, docRepoInTx],
      [ProviderServiceArea, passthroughRepo],
      [Service, serviceRepoInTx],
      [
        ServiceCategory,
        {
          findOne: jest
            .fn()
            .mockResolvedValue({ id: CATEGORY_ID, name: 'Điện lạnh' }),
        },
      ],
    ]);
    const dataSource = {
      transaction: jest.fn((work: (manager: unknown) => Promise<unknown>) =>
        work({ getRepository: (entity: unknown) => repos.get(entity) }),
      ),
    };

    privateStorage = {
      toPath: jest.fn((ref: string | null) => {
        if (!ref) return null;
        if (ref.startsWith(SIGN_PREFIX)) {
          return ref.slice(SIGN_PREFIX.length).split('?')[0];
        }
        return /^[a-z]+:/i.test(ref) ? null : ref;
      }),
      remove: jest.fn(),
      removeMany: jest.fn(),
      // Mặc định coi như không liệt kê được thư mục, để thử nhánh dự phòng
      listFiles: jest.fn().mockResolvedValue(null),
      signPaths: jest.fn().mockResolvedValue(new Map()),
    };

    service = new ProviderService(
      {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(existingProfile)
          .mockResolvedValue({ ...existingProfile, documents: [] }),
      } as never,
      {} as never,
      {} as never,
      { find: jest.fn().mockResolvedValue([]) } as never,
      {
        findOne: jest
          .fn()
          .mockResolvedValue({ id: USER_ID, isAnonymous: false }),
      } as never,
      dataSource as never,
      privateStorage as never,
    );
  });

  const register = (fileUrls: string[], services?: InitialServiceDto[]) =>
    service.register(USER_ID, {
      displayName: 'Thợ Mẫu',
      phone: '0900000002',
      experienceYears: 3,
      categoryId: CATEGORY_ID,
      documents: fileUrls.map((fileUrl, index) => ({
        documentType: `DOC_${index}`,
        fileUrl,
      })),
      services,
    });

  it('lưu path thay vì URL có chữ ký; không liệt kê được thư mục thì chỉ xóa giấy tờ cũ bị thay', async () => {
    await register([signedUrl(docPath('kept')), signedUrl(docPath('new'))]);

    expect(docRepoInTx.create).toHaveBeenCalledTimes(2);
    expect(docRepoInTx.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ fileUrl: docPath('kept') }),
    );
    expect(docRepoInTx.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ fileUrl: docPath('new') }),
    );
    // data: URL cũ không phải file trong bucket nên không bị xóa
    expect(privateStorage.removeMany).toHaveBeenCalledTimes(1);
    expect(privateStorage.removeMany).toHaveBeenCalledWith([
      docPath('replaced'),
    ]);
  });

  it('xóa mọi file mồ côi trong thư mục KYC, kể cả file của lần gửi lỗi trước đó', async () => {
    privateStorage.listFiles.mockResolvedValue([
      docPath('kept'),
      docPath('new'),
      docPath('replaced'),
      docPath('failed-attempt'),
      docPath('double-submit'),
    ]);

    await register([signedUrl(docPath('kept')), signedUrl(docPath('new'))]);

    expect(privateStorage.listFiles).toHaveBeenCalledWith(
      `providers/documents/${USER_ID}/`,
    );
    expect(privateStorage.removeMany).toHaveBeenCalledWith([
      docPath('replaced'),
      docPath('failed-attempt'),
      docPath('double-submit'),
    ]);
  });

  it('không dọn file khi lưu hồ sơ thất bại', async () => {
    await expect(
      register([signedUrl(docPath('x', 'other-user'))]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(privateStorage.listFiles).not.toHaveBeenCalled();
    expect(privateStorage.removeMany).not.toHaveBeenCalled();
  });

  it.each([
    [
      'file trong thư mục của người khác',
      signedUrl(docPath('x', 'other-user')),
    ],
    ['URL ngoài bucket', 'https://evil.example/providers/documents/a.png'],
    ['data URL', 'data:image/png;base64,AAAA'],
  ])('từ chối %s', async (_, fileUrl) => {
    await expect(register([fileUrl])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(docRepoInTx.save).not.toHaveBeenCalled();
  });

  describe('nhiều dịch vụ', () => {
    it('tạo mỗi dịch vụ một dòng PENDING cùng ngành nghề chính', async () => {
      await register(
        [signedUrl(docPath('kept'))],
        [
          serviceItem('  Vệ sinh điều hòa  '),
          serviceItem('Nạp gas'),
          serviceItem('Sửa tủ lạnh'),
        ],
      );

      expect(serviceRepoInTx.delete).toHaveBeenCalledWith({
        providerId: PROFILE_ID,
        status: ServiceStatus.PENDING,
      });
      expect(serviceRepoInTx.save).toHaveBeenCalledTimes(1);
      const [saved] = serviceRepoInTx.save.mock.calls[0] as [
        Array<Record<string, unknown>>,
      ];
      expect(saved.map((item) => item.title)).toEqual([
        'Vệ sinh điều hòa',
        'Nạp gas',
        'Sửa tủ lạnh',
      ]);
      for (const item of saved) {
        expect(item).toMatchObject({
          providerId: PROFILE_ID,
          categoryId: CATEGORY_ID,
          basePrice: 250000,
          priceUnit: PriceUnit.HOURLY,
          durationMinutes: 90,
          status: ServiceStatus.PENDING,
        });
      }
    });

    it('không khai dịch vụ thì tạo một dịch vụ mặc định theo ngành', async () => {
      await register([signedUrl(docPath('kept'))]);

      const [saved] = serviceRepoInTx.save.mock.calls[0] as [
        Array<Record<string, unknown>>,
      ];
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({
        title: 'Dịch vụ Điện lạnh chuyên nghiệp',
        categoryId: CATEGORY_ID,
        status: ServiceStatus.PENDING,
      });
    });

    it.each([
      ['trùng tên khác hoa thường', ['Nạp gas', ' nạp GAS ']],
      ['tên chỉ có khoảng trắng', ['Nạp gas', '   ']],
    ])('từ chối %s và không ghi gì', async (_, titles) => {
      await expect(
        register([signedUrl(docPath('kept'))], titles.map(serviceItem)),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(serviceRepoInTx.save).not.toHaveBeenCalled();
      expect(docRepoInTx.save).not.toHaveBeenCalled();
    });

    const dtoErrors = async (count: number) => {
      const dto = plainToInstance(RegisterProviderDto, {
        displayName: 'Thợ Mẫu',
        phone: '0900000002',
        experienceYears: 3,
        categoryId: CATEGORY_ID,
        documents: [],
        services: Array.from({ length: count }, (_, index) =>
          serviceItem(`Dịch vụ ${index}`),
        ),
      });
      const errors = await validate(dto);
      return errors.map((error) => error.property);
    };

    it(`DTO nhận tối đa ${MAX_REGISTER_SERVICES} dịch vụ`, async () => {
      await expect(dtoErrors(MAX_REGISTER_SERVICES)).resolves.toEqual([]);
      await expect(dtoErrors(MAX_REGISTER_SERVICES + 1)).resolves.toEqual([
        'services',
      ]);
      await expect(dtoErrors(0)).resolves.toEqual(['services']);
    });
  });

  describe('frontend cũ gửi initialService', () => {
    const legacyPayload = (extra: object = {}) => ({
      displayName: 'Thợ Mẫu',
      phone: '0900000002',
      experienceYears: 3,
      categoryId: CATEGORY_ID,
      documents: [
        { documentType: 'ID_CARD_FRONT', fileUrl: signedUrl(docPath('kept')) },
      ],
      initialService: serviceItem('  Vệ sinh điều hòa  '),
      ...extra,
    });
    const savedTitles = () =>
      (
        serviceRepoInTx.save.mock.calls[0] as [Array<Record<string, unknown>>]
      )[0].map((item) => item.title);

    it('DTO vẫn hợp lệ với ValidationPipe chặn field lạ', async () => {
      const errors = await validate(
        plainToInstance(RegisterProviderDto, legacyPayload()),
        { whitelist: true, forbidNonWhitelisted: true },
      );
      expect(errors).toEqual([]);
    });

    it('tạo đúng dịch vụ đã khai thay vì dịch vụ mặc định', async () => {
      await service.register(
        USER_ID,
        plainToInstance(RegisterProviderDto, legacyPayload()),
      );

      expect(savedTitles()).toEqual(['Vệ sinh điều hòa']);
      expect(
        (
          serviceRepoInTx.save.mock.calls[0] as [Array<Record<string, unknown>>]
        )[0][0],
      ).toMatchObject({
        basePrice: 250000,
        priceUnit: PriceUnit.HOURLY,
        durationMinutes: 90,
        categoryId: CATEGORY_ID,
        status: ServiceStatus.PENDING,
      });
    });

    it('có cả services thì bỏ qua initialService', async () => {
      await service.register(
        USER_ID,
        plainToInstance(
          RegisterProviderDto,
          legacyPayload({ services: [serviceItem('Nạp gas')] }),
        ),
      );

      expect(savedTitles()).toEqual(['Nạp gas']);
    });
  });
});
