export type NotificationType = "BOOKING" | "MESSAGE" | "SYSTEM";

export type NotificationReferenceType =
  | "BOOKING"
  | "CONVERSATION"
  | "PROVIDER_PROFILE"
  | "REPORT";

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  referenceType: NotificationReferenceType | null;
  referenceId: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsListResponse {
  items: NotificationItem[];
  unreadCount: number;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MarkNotificationReadResponse {
  notification: NotificationItem;
  unreadCount: number;
}

export interface MarkAllNotificationsReadResponse {
  updatedCount: number;
  unreadCount: number;
}

export interface NotificationSocketNewPayload {
  notification: NotificationItem;
  unreadCount: number;
}

export interface NotificationSocketUnreadPayload {
  unreadCount: number;
}
