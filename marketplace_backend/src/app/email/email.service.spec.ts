import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { EmailService } from './email.service';

jest.mock('nodemailer', () => ({
  createTransport: () => ({ verify: jest.fn().mockResolvedValue(true) }),
}));

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        {
          provide: PinoLogger,
          useValue: {
            setContext: jest.fn(),
            info: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
