import type { BookingStatus } from "./booking.types";

export type MessageType = "TEXT" | "IMAGE" | "SYSTEM";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  messageType: MessageType;
  content: string;
  createdAt: string;
}

export interface ConversationPartner {
  userId: string;
  providerId: string | null;
  displayName: string;
  avatarUrl: string | null;
  phone: string | null;
  isVerified: boolean;
  isOnline: boolean;
  subtitle: string;
}

export interface ConversationBookingSummary {
  id: string;
  bookingCode: string;
  serviceTitle: string;
  totalPrice: number;
  status: BookingStatus;
  scheduledStartAt: string;
  addressText: string;
}

export interface ConversationItem {
  id: string;
  bookingId: string | null;
  roleInConversation: "customer" | "provider";
  partner: ConversationPartner;
  booking: ConversationBookingSummary | null;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  myLastReadAt: string | null;
  partnerLastReadAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationsResponse {
  counts: {
    all: number;
    unread: number;
    totalUnreadMessages: number;
  };
  items: ConversationItem[];
}

export interface MessagesPageResponse {
  items: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
  myLastReadAt: string | null;
  partnerLastReadAt: string | null;
}

export interface CreateConversationPayload {
  bookingId?: string;
  recipientUserId?: string;
  providerId?: string;
}

export interface SendMessagePayload {
  content: string;
  clientTempId?: string;
}

export interface MarkReadResponse {
  conversationId: string;
  userId: string;
  lastReadAt: string;
}

export type VoiceCallStatus =
  | "idle"
  | "calling"
  | "incoming"
  | "connecting"
  | "connected";

export interface VoiceCallPeerInfo {
  conversationId: string;
  name: string;
  avatarUrl: string | null;
  subtitle?: string;
}
