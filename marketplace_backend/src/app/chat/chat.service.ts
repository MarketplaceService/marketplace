import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking } from 'src/app/booking/entities/booking.entity';
import { ProviderProfile } from 'src/app/provider/entities/provider-profile.entity';
import { StorageService } from 'src/app/storage/storage.service';
import { User } from 'src/app/user/entities/user.entity';
import {
  apiBadRequest,
  apiForbidden,
  apiNotFound,
} from 'src/shared/helpers/api-i18n';
import { BookingStatus } from 'src/shared/types/booking-status.enum';
import { MessageType } from 'src/shared/types/message-type.enum';
import { VerificationStatus } from 'src/shared/types/verification-status.enum';
import { toVnIsoString } from 'src/shared/utils/vn-time';
import { DataSource, In, Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { CHAT_IMAGE_EXTENSIONS } from './chat-image-upload';
import {
  ChatRealtimePublisher,
  SerializedChatMessage,
} from './chat-realtime.publisher';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ConversationParticipant } from './entities/conversation-participant.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

const MAX_MESSAGE_LENGTH = 2000;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ConversationSummaryDto {
  id: string;
  bookingId: string | null;
  roleInConversation: 'customer' | 'provider';
  partner: {
    userId: string;
    providerId: string | null;
    displayName: string;
    avatarUrl: string | null;
    phone: string | null;
    isVerified: boolean;
    isOnline: boolean;
    subtitle: string;
  };
  booking: {
    id: string;
    bookingCode: string;
    serviceTitle: string;
    totalPrice: number;
    status: BookingStatus;
    scheduledStartAt: string;
    addressText: string;
  } | null;
  lastMessage: SerializedChatMessage | null;
  unreadCount: number;
  myLastReadAt: string | null;
  partnerLastReadAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function getPgErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const err = error as { code?: unknown; driverError?: { code?: unknown } };
  if (typeof err.driverError?.code === 'string') return err.driverError.code;
  if (typeof err.code === 'string') return err.code;
  return undefined;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(
    JSON.stringify({ createdAt: createdAt.toISOString(), id }),
    'utf8',
  ).toString('base64url');
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as { createdAt?: unknown; id?: unknown };
    if (
      typeof parsed.createdAt !== 'string' ||
      typeof parsed.id !== 'string' ||
      !UUID_REGEX.test(parsed.id)
    ) {
      apiBadRequest('errors.chat.invalidCursor');
    }
    const date = new Date(parsed.createdAt);
    if (Number.isNaN(date.getTime())) {
      apiBadRequest('errors.chat.invalidCursor');
    }
    return { createdAt: date, id: parsed.id };
  } catch {
    apiBadRequest('errors.chat.invalidCursor');
  }
}

@Injectable()
export class ChatService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private readonly participantRepo: Repository<ConversationParticipant>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(ProviderProfile)
    private readonly providerProfileRepo: Repository<ProviderProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly storageService: StorageService,
    private readonly realtimePublisher: ChatRealtimePublisher,
  ) {}

  async createOrGetConversation(
    currentUserId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationSummaryDto> {
    if (!dto.bookingId && !dto.recipientUserId && !dto.providerId) {
      apiBadRequest('errors.chat.invalidCreatePayload');
    }

    if (dto.bookingId) {
      const booking = await this.bookingRepo.findOne({
        where: { id: dto.bookingId },
        relations: { provider: true },
      });

      if (!booking || !booking.provider) {
        apiNotFound('errors.booking.notFound');
      }

      const isCustomer = booking.customerId === currentUserId;
      const isProvider = booking.provider.userId === currentUserId;
      if (!isCustomer && !isProvider) {
        apiForbidden('errors.chat.forbidden');
      }

      const conversationId = await this.ensureBookingConversation(
        booking.id,
        booking.customerId,
        booking.provider.userId,
      );

      return this.getConversationSummaryById(currentUserId, conversationId);
    }

    let targetUserId: string | null = null;
    if (dto.providerId) {
      const providerProfile = await this.providerProfileRepo.findOne({
        where: { id: dto.providerId },
        relations: { user: true },
      });
      if (
        !providerProfile?.user ||
        providerProfile.user.deletedAt ||
        providerProfile.user.isAnonymous ||
        providerProfile.verificationStatus !== VerificationStatus.APPROVED
      ) {
        apiNotFound('errors.chat.recipientNotFound');
      }
      targetUserId = providerProfile.userId;
    } else if (dto.recipientUserId) {
      const targetUser = await this.userRepo.findOne({
        where: { id: dto.recipientUserId },
      });
      if (!targetUser || targetUser.deletedAt || targetUser.isAnonymous) {
        apiNotFound('errors.chat.recipientNotFound');
      }
      targetUserId = targetUser.id;
    }

    if (!targetUserId) {
      apiNotFound('errors.chat.recipientNotFound');
    }

    if (targetUserId === currentUserId) {
      apiBadRequest('errors.chat.selfConversation');
    }

    const [minUserId, maxUserId] = [currentUserId, targetUserId].sort();

    const conversationId = await this.dataSource.transaction(
      async (manager) => {
        // Chống race condition tạo trùng phòng direct chat trên cặp (minUserId, maxUserId)
        await manager.query(
          `SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`,
          [minUserId, maxUserId],
        );

        const existingRows = await manager.query<Array<{ id: string }>>(
          `SELECT c.id
           FROM conversation c
           INNER JOIN conversation_participant p1
             ON p1.conversation_id = c.id AND p1.user_id = $1
           INNER JOIN conversation_participant p2
             ON p2.conversation_id = c.id AND p2.user_id = $2
           WHERE c.booking_id IS NULL
           ORDER BY c.created_at ASC
           LIMIT 1`,
          [minUserId, maxUserId],
        );

        if (existingRows[0]?.id) {
          return existingRows[0].id;
        }

        const convRepo = manager.getRepository(Conversation);
        const partRepo = manager.getRepository(ConversationParticipant);

        const created = await convRepo.save(
          convRepo.create({ bookingId: null }),
        );
        await partRepo.save([
          partRepo.create({
            conversationId: created.id,
            userId: minUserId,
            lastReadAt: null,
          }),
          partRepo.create({
            conversationId: created.id,
            userId: maxUserId,
            lastReadAt: null,
          }),
        ]);

        return created.id;
      },
    );

    return this.getConversationSummaryById(currentUserId, conversationId);
  }

  async listConversations(currentUserId: string, query: QueryConversationsDto) {
    const memberships = await this.participantRepo.find({
      where: { userId: currentUserId },
      select: { conversationId: true },
    });

    const conversationIds = memberships.map((m) => m.conversationId);
    if (conversationIds.length === 0) {
      return {
        counts: { all: 0, unread: 0, totalUnreadMessages: 0 },
        items: [] as ConversationSummaryDto[],
      };
    }

    const allSummaries = await this.loadConversationSummaries(
      currentUserId,
      conversationIds,
    );

    const scope = query.scope ?? 'all';
    const scoped =
      scope === 'all'
        ? allSummaries
        : allSummaries.filter((item) => item.roleInConversation === scope);

    const unreadConversations = scoped.filter((item) => item.unreadCount > 0);
    const totalUnreadMessages = scoped.reduce(
      (sum, item) => sum + item.unreadCount,
      0,
    );

    let filtered =
      query.filter === 'unread' ? unreadConversations : [...scoped];

    const searchTerm = query.search ? normalizeSearchText(query.search) : '';
    if (searchTerm) {
      filtered = filtered.filter((item) => {
        const haystack = normalizeSearchText(
          [
            item.partner.displayName,
            item.partner.subtitle,
            item.booking?.bookingCode ?? '',
            item.booking?.serviceTitle ?? '',
            item.lastMessage?.content ?? '',
          ].join(' '),
        );
        return haystack.includes(searchTerm);
      });
    }

    return {
      counts: {
        all: scoped.length,
        unread: unreadConversations.length,
        totalUnreadMessages,
      },
      items: filtered,
    };
  }

  async getMessages(
    currentUserId: string,
    conversationId: string,
    query: QueryMessagesDto,
  ) {
    await this.assertMembership(currentUserId, conversationId);

    const limit = Math.max(1, Math.min(100, Number(query.limit) || 30));
    const parsedCursor = query.cursor ? decodeCursor(query.cursor) : null;

    const qb = this.messageRepo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.deletedAt IS NULL');

    if (parsedCursor) {
      qb.andWhere('(message.created_at, message.id) < (:cursorAt, :cursorId)', {
        cursorAt: parsedCursor.createdAt,
        cursorId: parsedCursor.id,
      });
    }

    qb.orderBy('message.createdAt', 'DESC')
      .addOrderBy('message.id', 'DESC')
      .take(limit + 1);

    const [rows, participants] = await Promise.all([
      qb.getMany(),
      this.participantRepo.find({
        where: { conversationId },
        select: { userId: true, lastReadAt: true },
      }),
    ]);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const oldest = pageRows[pageRows.length - 1];
    const nextCursor =
      hasMore && oldest ? encodeCursor(oldest.createdAt, oldest.id) : null;

    const senderIds = Array.from(new Set(pageRows.map((row) => row.senderId)));
    const providerProfiles =
      senderIds.length > 0
        ? await this.providerProfileRepo.find({
            where: { userId: In(senderIds) },
            select: { userId: true, displayName: true },
          })
        : [];
    const providerNameMap = new Map(
      providerProfiles.map((p) => [p.userId, p.displayName]),
    );

    const items = pageRows
      .slice()
      .reverse()
      .map((msg) =>
        this.serializeMessage(msg, providerNameMap.get(msg.senderId)),
      );

    const myParticipant = participants.find((p) => p.userId === currentUserId);
    const partnerParticipant = participants.find(
      (p) => p.userId !== currentUserId,
    );

    return {
      items,
      nextCursor,
      hasMore,
      myLastReadAt: myParticipant?.lastReadAt
        ? toVnIsoString(myParticipant.lastReadAt)
        : null,
      partnerLastReadAt: partnerParticipant?.lastReadAt
        ? toVnIsoString(partnerParticipant.lastReadAt)
        : null,
    };
  }

  async sendTextMessage(
    currentUserId: string,
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<SerializedChatMessage> {
    if (
      dto.messageType !== undefined &&
      dto.messageType.toUpperCase() !== String(MessageType.TEXT)
    ) {
      apiForbidden('errors.chat.systemMessageForbidden');
    }

    const participants = await this.assertMembership(
      currentUserId,
      conversationId,
    );

    const content = (dto.content ?? '').trim();
    if (content.length === 0 || content.length > MAX_MESSAGE_LENGTH) {
      apiBadRequest('errors.chat.invalidContent');
    }

    const serialized = await this.persistAndBroadcastMessage({
      conversationId,
      senderId: currentUserId,
      messageType: MessageType.TEXT,
      content,
      participantUserIds: participants.map((p) => p.userId),
      advanceSenderReadAt: true,
      clientTempId: dto.clientTempId,
    });

    return serialized;
  }

  async markAsRead(currentUserId: string, conversationId: string) {
    const participants = await this.assertMembership(
      currentUserId,
      conversationId,
    );

    // Đảm bảo last_read_at chỉ tăng tiến, tuyệt đối không lùi mốc thời gian cũ
    const rows = await this.dataSource.query<
      Array<{ last_read_at: Date | string }>
    >(
      `UPDATE conversation_participant
       SET last_read_at = GREATEST(COALESCE(last_read_at, '-infinity'::timestamptz), NOW()),
           updated_at = NOW()
       WHERE conversation_id = $1 AND user_id = $2
       RETURNING last_read_at`,
      [conversationId, currentUserId],
    );

    const lastReadDate = rows[0]?.last_read_at
      ? new Date(rows[0].last_read_at)
      : new Date();
    const lastReadAt = toVnIsoString(lastReadDate);

    this.realtimePublisher.emitReadReceipt(
      conversationId,
      participants.map((p) => p.userId),
      currentUserId,
      lastReadAt,
    );

    return {
      conversationId,
      userId: currentUserId,
      lastReadAt,
    };
  }

  async sendImageAttachment(
    currentUserId: string,
    conversationId: string,
    file: Express.Multer.File | undefined,
  ): Promise<SerializedChatMessage> {
    // Kiểm tra quyền thành viên TRƯỚC khi tải ảnh lên Supabase Storage
    const participants = await this.assertMembership(
      currentUserId,
      conversationId,
    );

    if (!file) {
      apiBadRequest('errors.chat.invalidImage');
    }

    const ext = CHAT_IMAGE_EXTENSIONS.get(file.mimetype) ?? 'jpg';
    const path = `chat/attachments/${conversationId}/${uuidv7()}.${ext}`;
    const publicUrl = await this.storageService.upload(
      path,
      file.buffer,
      file.mimetype,
    );

    return this.persistAndBroadcastMessage({
      conversationId,
      senderId: currentUserId,
      messageType: MessageType.IMAGE,
      content: publicUrl,
      participantUserIds: participants.map((p) => p.userId),
      advanceSenderReadAt: true,
    });
  }

  async createSystemMessageForBooking(input: {
    bookingId: string;
    customerId: string;
    providerUserId: string;
    actorUserId: string;
    content: string;
  }): Promise<SerializedChatMessage | null> {
    const trimmed = input.content.trim();
    if (!trimmed) return null;

    const conversationId = await this.ensureBookingConversation(
      input.bookingId,
      input.customerId,
      input.providerUserId,
    );

    return this.persistAndBroadcastMessage({
      conversationId,
      senderId: input.actorUserId,
      messageType: MessageType.SYSTEM,
      content: trimmed,
      participantUserIds: [input.customerId, input.providerUserId],
      advanceSenderReadAt: true,
    });
  }

  async createSystemMessageForConversation(
    conversationId: string,
    actorUserId: string,
    content: string,
  ): Promise<SerializedChatMessage | null> {
    const trimmed = content.trim();
    if (!trimmed) return null;

    const participants = await this.participantRepo.find({
      where: { conversationId },
      select: { userId: true },
    });
    if (participants.length === 0) return null;

    return this.persistAndBroadcastMessage({
      conversationId,
      senderId: actorUserId,
      messageType: MessageType.SYSTEM,
      content: trimmed,
      participantUserIds: participants.map((p) => p.userId),
      advanceSenderReadAt: true,
    });
  }

  async assertMembership(
    userId: string,
    conversationId: string,
  ): Promise<ConversationParticipant[]> {
    const conversationExists = await this.conversationRepo.exists({
      where: { id: conversationId },
    });
    if (!conversationExists) {
      apiNotFound('errors.chat.conversationNotFound');
    }

    const participants = await this.participantRepo.find({
      where: { conversationId },
      select: {
        id: true,
        conversationId: true,
        userId: true,
        lastReadAt: true,
      },
    });

    if (!participants.some((p) => p.userId === userId)) {
      apiForbidden('errors.chat.forbidden');
    }

    return participants;
  }

  async getPartnerUserId(
    userId: string,
    conversationId: string,
  ): Promise<string | null> {
    const participants = await this.assertMembership(userId, conversationId);
    return participants.find((p) => p.userId !== userId)?.userId ?? null;
  }

  async getChatPartnerUserIds(userId: string): Promise<string[]> {
    const rows = await this.dataSource.query<Array<{ user_id: string }>>(
      `SELECT DISTINCT cp2.user_id
       FROM conversation_participant cp1
       INNER JOIN conversation_participant cp2
         ON cp2.conversation_id = cp1.conversation_id
        AND cp2.user_id <> cp1.user_id
       WHERE cp1.user_id = $1`,
      [userId],
    );
    return rows.map((row) => row.user_id);
  }

  private async ensureBookingConversation(
    bookingId: string,
    customerId: string,
    providerUserId: string,
  ): Promise<string> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        await manager.query(
          `SELECT pg_advisory_xact_lock(hashtext('chat_booking'), hashtext($1))`,
          [bookingId],
        );

        const convRepo = manager.getRepository(Conversation);
        const partRepo = manager.getRepository(ConversationParticipant);

        const existing = await convRepo.findOne({ where: { bookingId } });
        if (existing) {
          return existing.id;
        }

        const created = await convRepo.save(convRepo.create({ bookingId }));
        const uniqueUsers = Array.from(new Set([customerId, providerUserId]));
        await partRepo.save(
          uniqueUsers.map((uid) =>
            partRepo.create({
              conversationId: created.id,
              userId: uid,
              lastReadAt: null,
            }),
          ),
        );

        return created.id;
      });
    } catch (error) {
      if (getPgErrorCode(error) === '23505') {
        const existing = await this.conversationRepo.findOne({
          where: { bookingId },
        });
        if (existing) return existing.id;
      }
      throw error;
    }
  }

  private async persistAndBroadcastMessage(input: {
    conversationId: string;
    senderId: string;
    messageType: MessageType;
    content: string;
    participantUserIds: string[];
    advanceSenderReadAt: boolean;
    clientTempId?: string;
  }): Promise<SerializedChatMessage> {
    const savedMessage = await this.dataSource.transaction(async (manager) => {
      const msgRepo = manager.getRepository(Message);
      const saved = await msgRepo.save(
        msgRepo.create({
          conversationId: input.conversationId,
          senderId: input.senderId,
          messageType: input.messageType,
          content: input.content,
        }),
      );

      await manager
        .getRepository(Conversation)
        .update({ id: input.conversationId }, { updatedAt: saved.createdAt });

      if (input.advanceSenderReadAt) {
        await manager.query(
          `UPDATE conversation_participant
           SET last_read_at = GREATEST(COALESCE(last_read_at, '-infinity'::timestamptz), $3::timestamptz),
               updated_at = NOW()
           WHERE conversation_id = $1 AND user_id = $2`,
          [input.conversationId, input.senderId, saved.createdAt.toISOString()],
        );
      }

      return saved;
    });

    const [senderUser, providerProfile] = await Promise.all([
      this.userRepo.findOne({
        where: { id: input.senderId },
        select: { id: true, name: true, image: true },
      }),
      this.providerProfileRepo.findOne({
        where: { userId: input.senderId },
        select: { displayName: true },
      }),
    ]);

    savedMessage.sender =
      senderUser ??
      ({ id: input.senderId, name: 'Người dùng', image: null } as User);
    const serialized = this.serializeMessage(
      savedMessage,
      providerProfile?.displayName,
    );

    this.realtimePublisher.emitNewMessage(
      input.conversationId,
      input.participantUserIds,
      serialized,
      input.clientTempId,
    );

    return serialized;
  }

  private async getConversationSummaryById(
    currentUserId: string,
    conversationId: string,
  ): Promise<ConversationSummaryDto> {
    const [summary] = await this.loadConversationSummaries(currentUserId, [
      conversationId,
    ]);
    if (!summary) {
      apiNotFound('errors.chat.conversationNotFound');
    }
    return summary;
  }

  private async loadConversationSummaries(
    currentUserId: string,
    conversationIds: string[],
  ): Promise<ConversationSummaryDto[]> {
    if (conversationIds.length === 0) return [];

    const conversations = await this.conversationRepo.find({
      where: { id: In(conversationIds) },
      relations: {
        participants: { user: true },
        booking: {
          provider: true,
          service: { category: true },
        },
      },
    });

    const allUserIds = Array.from(
      new Set(
        conversations.flatMap((c) => c.participants.map((p) => p.userId)),
      ),
    );

    const [providerProfiles, lastMessageRows, unreadRows] = await Promise.all([
      allUserIds.length > 0
        ? this.providerProfileRepo.find({
            where: { userId: In(allUserIds) },
            relations: { services: { category: true } },
          })
        : Promise.resolve([] as ProviderProfile[]),

      this.dataSource.query<
        Array<{
          id: string;
          conversation_id: string;
          sender_id: string;
          message_type: MessageType;
          content: string;
          created_at: Date | string;
          sender_name: string | null;
          sender_avatar_url: string | null;
        }>
      >(
        `SELECT DISTINCT ON (m.conversation_id)
                m.id,
                m.conversation_id,
                m.sender_id,
                m.message_type,
                m.content,
                m.created_at,
                u.name AS sender_name,
                u.image AS sender_avatar_url
         FROM message m
         LEFT JOIN "user" u ON u.id = m.sender_id
         WHERE m.conversation_id = ANY($1::uuid[])
           AND m.deleted_at IS NULL
         ORDER BY m.conversation_id, m.created_at DESC, m.id DESC`,
        [conversationIds],
      ),

      this.dataSource.query<
        Array<{ conversation_id: string; unread_count: number }>
      >(
        `SELECT m.conversation_id, COUNT(*)::int AS unread_count
         FROM message m
         INNER JOIN conversation_participant cp
           ON cp.conversation_id = m.conversation_id AND cp.user_id = $1
         WHERE m.conversation_id = ANY($2::uuid[])
           AND m.deleted_at IS NULL
           AND m.sender_id <> $1
           AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
         GROUP BY m.conversation_id`,
        [currentUserId, conversationIds],
      ),
    ]);

    const providerByUserId = new Map<string, ProviderProfile>(
      providerProfiles.map((p) => [p.userId, p]),
    );
    const lastMessageMap = new Map<string, SerializedChatMessage>();
    for (const row of lastMessageRows) {
      const senderProfile = providerByUserId.get(row.sender_id);
      lastMessageMap.set(row.conversation_id, {
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        senderName:
          senderProfile?.displayName ?? row.sender_name ?? 'Người dùng',
        senderAvatarUrl: row.sender_avatar_url ?? null,
        messageType: row.message_type,
        content: row.content,
        createdAt: toVnIsoString(new Date(row.created_at)),
      });
    }

    const unreadMap = new Map<string, number>(
      unreadRows.map((r) => [r.conversation_id, Number(r.unread_count) || 0]),
    );

    const myProviderProfile = providerByUserId.get(currentUserId);
    const amApprovedProvider =
      myProviderProfile?.verificationStatus === VerificationStatus.APPROVED;

    const summaries = conversations.map((conv) => {
      const myPart = conv.participants.find((p) => p.userId === currentUserId);
      const partnerPart =
        conv.participants.find((p) => p.userId !== currentUserId) ?? myPart;
      const partnerUser = partnerPart?.user;
      const partnerUserId = partnerPart?.userId ?? currentUserId;
      const partnerProvider = providerByUserId.get(partnerUserId);

      let roleInConversation: 'customer' | 'provider' = 'customer';
      if (conv.booking?.provider) {
        roleInConversation =
          conv.booking.provider.userId === currentUserId
            ? 'provider'
            : 'customer';
      } else if (
        amApprovedProvider &&
        partnerProvider?.verificationStatus !== VerificationStatus.APPROVED
      ) {
        roleInConversation = 'provider';
      } else {
        roleInConversation = 'customer';
      }

      const addressSnapshot = conv.booking?.serviceAddressSnapshot;
      const addressParts = [
        addressSnapshot?.addressLine1,
        addressSnapshot?.ward,
        addressSnapshot?.district,
        addressSnapshot?.city,
      ].filter(Boolean);
      const addressText = addressParts.join(', ');

      const partnerCategoryName =
        conv.booking?.service?.category?.name ??
        partnerProvider?.services?.[0]?.category?.name ??
        null;

      const isPartnerProviderRole = roleInConversation === 'customer';
      const partnerDisplayName = isPartnerProviderRole
        ? (conv.booking?.provider?.displayName ??
          partnerProvider?.displayName ??
          partnerUser?.name ??
          'Nhà cung cấp')
        : (partnerUser?.name ?? addressSnapshot?.fullName ?? 'Khách hàng');

      const partnerSubtitle = isPartnerProviderRole
        ? (partnerCategoryName ?? 'Đối tác dịch vụ Servigo')
        : addressText || 'Khách hàng Servigo';

      const partnerPhone = isPartnerProviderRole
        ? (conv.booking?.provider?.phone ??
          partnerProvider?.phone ??
          partnerUser?.phone ??
          null)
        : (addressSnapshot?.phone ?? partnerUser?.phone ?? null);

      const lastMessage = lastMessageMap.get(conv.id) ?? null;

      return {
        id: conv.id,
        bookingId: conv.bookingId,
        roleInConversation,
        partner: {
          userId: partnerUserId,
          providerId: isPartnerProviderRole
            ? (conv.booking?.providerId ?? partnerProvider?.id ?? null)
            : null,
          displayName: partnerDisplayName,
          avatarUrl: partnerUser?.image ?? null,
          phone: partnerPhone,
          isVerified: isPartnerProviderRole
            ? partnerProvider?.verificationStatus ===
              VerificationStatus.APPROVED
            : Boolean(partnerUser?.emailVerified),
          isOnline: this.realtimePublisher.isUserOnline(partnerUserId),
          subtitle: partnerSubtitle,
        },
        booking: conv.booking
          ? {
              id: conv.booking.id,
              bookingCode: conv.booking.bookingCode,
              serviceTitle: conv.booking.serviceTitleSnapshot,
              totalPrice: Number(conv.booking.totalPrice),
              status: conv.booking.status,
              scheduledStartAt: toVnIsoString(conv.booking.scheduledStartAt),
              addressText,
            }
          : null,
        lastMessage,
        unreadCount: unreadMap.get(conv.id) ?? 0,
        myLastReadAt: myPart?.lastReadAt
          ? toVnIsoString(myPart.lastReadAt)
          : null,
        partnerLastReadAt: partnerPart?.lastReadAt
          ? toVnIsoString(partnerPart.lastReadAt)
          : null,
        createdAt: toVnIsoString(conv.createdAt),
        updatedAt: toVnIsoString(conv.updatedAt),
      } satisfies ConversationSummaryDto;
    });

    summaries.sort((a, b) => {
      const timeA = new Date(a.lastMessage?.createdAt ?? a.updatedAt).getTime();
      const timeB = new Date(b.lastMessage?.createdAt ?? b.updatedAt).getTime();
      return timeB - timeA;
    });

    return summaries;
  }

  private serializeMessage(
    message: Message,
    providerDisplayName?: string,
  ): SerializedChatMessage {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName:
        providerDisplayName ?? message.sender?.name ?? 'Người dùng Servigo',
      senderAvatarUrl: message.sender?.image ?? null,
      messageType: message.messageType,
      content: message.content,
      createdAt: toVnIsoString(message.createdAt),
    };
  }
}
