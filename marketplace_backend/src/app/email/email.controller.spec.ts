import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { InternalEmailController } from './email.controller';
import { EmailService } from './email.service';

describe('InternalEmailController', () => {
  let controller: InternalEmailController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalEmailController],
      providers: [
        { provide: EmailService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    controller = module.get<InternalEmailController>(InternalEmailController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
