export const NOTIFICATION_TYPES = ['BOOKING', 'MESSAGE', 'SYSTEM'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_REFERENCE_TYPES = [
  'BOOKING',
  'CONVERSATION',
  'PROVIDER_PROFILE',
  'REPORT',
] as const;
export type NotificationReferenceType =
  (typeof NOTIFICATION_REFERENCE_TYPES)[number];

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  referenceType?: NotificationReferenceType | null;
  referenceId?: string | null;
}

export interface SerializedNotification {
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
