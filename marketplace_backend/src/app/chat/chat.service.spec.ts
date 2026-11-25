import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Booking } from 'src/app/booking/entities/booking.entity';
import { ProviderProfile } from 'src/app/provider/entities/provider-profile.entity';
import { StorageService } from 'src/app/storage/storage.service';
import { User } from 'src/app/user/entities/user.entity';
import { MessageType } from 'src/shared/types/message-type.enum';
import { VerificationStatus } from 'src/shared/types/verification-status.enum';
import { DataSource, Repository } from 'typeorm';
import { ChatRealtimePublisher } from './chat-realtime.publisher';
import { ChatService } from './chat.service';
import { ConversationParticipant } from './entities/conversation-participant.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

const CUSTOMER_ID = '01950000-0000-7000-8000-000000000001';
const PROVIDER_USER_ID = '01950000-0000-7000-8000-000000000002';
const STRANGER_ID = '01950000-0000-7000-8000-000000000003';
const PROVIDER_PROFILE_ID = '01950000-0000-7000-8000-000000000010';
const BOOKING_ID = '01950000-0000-7000-8000-000000000020';
const CONV_ID = '01950000-0000-7000-8000-000000000030';
const MSG_ID_1 = '01950000-0000-7000-8000-000000000041';
const MSG_ID_2 = '01950000-0000-7000-8000-000000000042';

function createMocks() {
  const txManager = {
    query: jest.fn(),
    getRepository: jest.fn(),
  };

  const dataSourceQuery = jest.fn();
  const dataSource = {
    transaction: jest.fn((cb: (m: typeof txManager) => unknown) =>
      cb(txManager),
    ),
    query: dataSourceQuery,
  } as unknown as DataSource;

  const conversationRepo = {
    exists: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((v: Partial<Conversation>) => v),
    save: jest.fn(),
    update: jest.fn(),
  };

  const participantRepo = {
    find: jest.fn(),
    create: jest.fn((v: Partial<ConversationParticipant>) => v),
    save: jest.fn(),
  };

  const messageRepo = {
    createQueryBuilder: jest.fn(),
    create: jest.fn((v: Partial<Message>) => v),
    save: jest.fn(),
  };

  const bookingRepo = {
    findOne: jest.fn(),
  };

  const providerProfileRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const userRepo = {
    findOne: jest.fn(),
  };

  const storageUpload = jest.fn();
  const storageService = {
    upload: storageUpload,
  } as unknown as StorageService;

  const emitNewMessage = jest.fn();
  const emitReadReceipt = jest.fn();
  const isUserOnline = jest.fn(() => false);
  const realtimePublisher = {
    emitNewMessage,
    emitReadReceipt,
    isUserOnline,
  } as unknown as ChatRealtimePublisher;

  txManager.getRepository.mockImplementation((entity: unknown) => {
    if (entity === Conversation) return conversationRepo;
    if (entity === ConversationParticipant) return participantRepo;
    if (entity === Message) return messageRepo;
    return null;
  });

  const service = new ChatService(
    dataSource,
    conversationRepo as unknown as Repository<Conversation>,
    participantRepo as unknown as Repository<ConversationParticipant>,
    messageRepo as unknown as Repository<Message>,
    bookingRepo as unknown as Repository<Booking>,
    providerProfileRepo as unknown as Repository<ProviderProfile>,
    userRepo as unknown as Repository<User>,
    storageService,
    realtimePublisher,
  );

  return {
    service,
    txManager,
    dataSourceQuery,
    conversationRepo,
    participantRepo,
    messageRepo,
    bookingRepo,
    providerProfileRepo,
    userRepo,
    storageUpload,
    emitNewMessage,
    emitReadReceipt,
  };
}

describe('ChatService', () => {
  it('blocks non-participants of a booking from creating a booking conversation (403)', async () => {
    const { service, bookingRepo } = createMocks();
    bookingRepo.findOne.mockResolvedValue({
      id: BOOKING_ID,
      customerId: CUSTOMER_ID,
      provider: { id: PROVIDER_PROFILE_ID, userId: PROVIDER_USER_ID },
    });

    await expect(
      service.createOrGetConversation(STRANGER_ID, { bookingId: BOOKING_ID }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects direct conversation with non-existent recipient (404)', async () => {
    const { service, userRepo } = createMocks();
    userRepo.findOne.mockResolvedValue(null);

    await expect(
      service.createOrGetConversation(CUSTOMER_ID, {
        recipientUserId: STRANGER_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('uses pg_advisory_xact_lock on sorted pair and returns existing direct conversation', async () => {
    const {
      service,
      txManager,
      dataSourceQuery,
      userRepo,
      conversationRepo,
      providerProfileRepo,
    } = createMocks();

    userRepo.findOne.mockResolvedValue({
      id: PROVIDER_USER_ID,
      deletedAt: null,
      isAnonymous: false,
    });

    txManager.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: CONV_ID }]);

    conversationRepo.find.mockResolvedValue([
      {
        id: CONV_ID,
        bookingId: null,
        booking: null,
        createdAt: new Date('2026-11-24T10:00:00Z'),
        updatedAt: new Date('2026-11-24T10:00:00Z'),
        participants: [
          {
            userId: CUSTOMER_ID,
            lastReadAt: null,
            user: { id: CUSTOMER_ID, name: 'Khách', image: null },
          },
          {
            userId: PROVIDER_USER_ID,
            lastReadAt: null,
            user: { id: PROVIDER_USER_ID, name: 'Thợ', image: null },
          },
        ],
      },
    ]);

    providerProfileRepo.find.mockResolvedValue([
      {
        id: PROVIDER_PROFILE_ID,
        userId: PROVIDER_USER_ID,
        displayName: 'Lê Văn Minh',
        verificationStatus: VerificationStatus.APPROVED,
        isOnline: true,
        phone: '0901234567',
        services: [],
      },
    ]);

    dataSourceQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await service.createOrGetConversation(CUSTOMER_ID, {
      recipientUserId: PROVIDER_USER_ID,
    });

    expect(txManager.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('pg_advisory_xact_lock'),
      [CUSTOMER_ID, PROVIDER_USER_ID],
    );
    expect(result.id).toBe(CONV_ID);
    expect(result.partner.displayName).toBe('Lê Văn Minh');
  });

  it('blocks client from sending SYSTEM messageType (403)', async () => {
    const { service } = createMocks();

    await expect(
      service.sendTextMessage(CUSTOMER_ID, CONV_ID, {
        content: 'Giả mạo hệ thống',
        messageType: MessageType.SYSTEM,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects empty or > 2000 character text messages (400)', async () => {
    const { service, conversationRepo, participantRepo } = createMocks();
    conversationRepo.exists.mockResolvedValue(true);
    participantRepo.find.mockResolvedValue([
      { userId: CUSTOMER_ID } as ConversationParticipant,
      { userId: PROVIDER_USER_ID } as ConversationParticipant,
    ]);

    await expect(
      service.sendTextMessage(CUSTOMER_ID, CONV_ID, { content: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.sendTextMessage(CUSTOMER_ID, CONV_ID, {
        content: 'a'.repeat(2001),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks non-member from reading messages (403)', async () => {
    const { service, conversationRepo, participantRepo } = createMocks();
    conversationRepo.exists.mockResolvedValue(true);
    participantRepo.find.mockResolvedValue([
      { userId: CUSTOMER_ID } as ConversationParticipant,
      { userId: PROVIDER_USER_ID } as ConversationParticipant,
    ]);

    await expect(
      service.getMessages(STRANGER_ID, CONV_ID, {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns cursor pagination page in chronological order with nextCursor', async () => {
    const {
      service,
      conversationRepo,
      participantRepo,
      messageRepo,
      providerProfileRepo,
    } = createMocks();
    conversationRepo.exists.mockResolvedValue(true);
    participantRepo.find.mockResolvedValue([
      {
        userId: CUSTOMER_ID,
        lastReadAt: new Date('2026-11-24T10:05:00Z'),
      } as ConversationParticipant,
      {
        userId: PROVIDER_USER_ID,
        lastReadAt: new Date('2026-11-24T10:06:00Z'),
      } as ConversationParticipant,
    ]);

    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: MSG_ID_2,
          conversationId: CONV_ID,
          senderId: PROVIDER_USER_ID,
          messageType: MessageType.TEXT,
          content: 'Tin mới hơn',
          createdAt: new Date('2026-11-24T10:02:00Z'),
          sender: { id: PROVIDER_USER_ID, name: 'Minh', image: null },
        },
        {
          id: MSG_ID_1,
          conversationId: CONV_ID,
          senderId: CUSTOMER_ID,
          messageType: MessageType.TEXT,
          content: 'Tin cũ hơn',
          createdAt: new Date('2026-11-24T10:01:00Z'),
          sender: { id: CUSTOMER_ID, name: 'Nam', image: null },
        },
      ]),
    };

    messageRepo.createQueryBuilder.mockReturnValue(qb);
    providerProfileRepo.find.mockResolvedValue([]);

    const page = await service.getMessages(CUSTOMER_ID, CONV_ID, { limit: 1 });

    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBeTruthy();
    expect(page.items).toHaveLength(1);
    expect(page.items[0].id).toBe(MSG_ID_2);
  });

  it('monotonically advances last_read_at using GREATEST on markAsRead', async () => {
    const {
      service,
      conversationRepo,
      participantRepo,
      dataSourceQuery,
      emitReadReceipt,
    } = createMocks();
    conversationRepo.exists.mockResolvedValue(true);
    participantRepo.find.mockResolvedValue([
      { userId: CUSTOMER_ID } as ConversationParticipant,
      { userId: PROVIDER_USER_ID } as ConversationParticipant,
    ]);

    const now = new Date('2026-11-24T12:00:00Z');
    dataSourceQuery.mockResolvedValueOnce([{ last_read_at: now }]);

    const res = await service.markAsRead(CUSTOMER_ID, CONV_ID);

    expect(dataSourceQuery).toHaveBeenCalledWith(
      expect.stringContaining('GREATEST(COALESCE(last_read_at'),
      [CONV_ID, CUSTOMER_ID],
    );
    expect(res.conversationId).toBe(CONV_ID);
    expect(emitReadReceipt).toHaveBeenCalledTimes(1);
  });

  it('uploads attachment to Supabase Storage and stores plain URL with IMAGE type', async () => {
    const {
      service,
      conversationRepo,
      participantRepo,
      messageRepo,
      userRepo,
      providerProfileRepo,
      storageUpload,
      emitNewMessage,
      txManager,
    } = createMocks();

    conversationRepo.exists.mockResolvedValue(true);
    participantRepo.find.mockResolvedValue([
      { userId: CUSTOMER_ID } as ConversationParticipant,
      { userId: PROVIDER_USER_ID } as ConversationParticipant,
    ]);

    const publicUrl =
      'https://demo.supabase.co/storage/v1/object/public/marketplace/chat/attachments/sample.jpg';
    storageUpload.mockResolvedValue(publicUrl);

    const createdAt = new Date('2026-11-24T12:10:00Z');
    messageRepo.save.mockResolvedValue({
      id: MSG_ID_1,
      conversationId: CONV_ID,
      senderId: CUSTOMER_ID,
      messageType: MessageType.IMAGE,
      content: publicUrl,
      createdAt,
    });
    txManager.query.mockResolvedValue([]);
    userRepo.findOne.mockResolvedValue({
      id: CUSTOMER_ID,
      name: 'Hoàng Nam',
      image: null,
    });
    providerProfileRepo.findOne.mockResolvedValue(null);

    const msg = await service.sendImageAttachment(CUSTOMER_ID, CONV_ID, {
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake-jpeg'),
    } as Express.Multer.File);

    expect(storageUpload).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(`^chat/attachments/${CONV_ID}/.+\\.jpg$`),
      ),
      expect.any(Buffer),
      'image/jpeg',
    );
    expect(msg.messageType).toBe(MessageType.IMAGE);
    expect(msg.content).toBe(publicUrl);
    expect(emitNewMessage).toHaveBeenCalledTimes(1);
  });
});
