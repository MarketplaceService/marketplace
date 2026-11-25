export const NOTIFICATION_SOCKET_NAMESPACE = '/notifications';
export const NOTIFICATION_SOCKET_EVENT_NEW = 'notification:new';
export const NOTIFICATION_SOCKET_EVENT_UNREAD_COUNT =
  'notification:unread_count';

export function getNotificationUserRoom(userId: string): string {
  return `user:${userId}`;
}
