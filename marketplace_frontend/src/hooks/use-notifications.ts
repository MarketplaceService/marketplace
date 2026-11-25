"use client";

import { getPublicApiRoot } from "@/lib/api/api-url";
import { mutationErrorToast } from "@/lib/api/api-error";
import { notificationServices } from "@/services/notification.services";
import type {
  NotificationItem,
  NotificationSocketNewPayload,
  NotificationSocketUnreadPayload,
  NotificationsListResponse,
} from "@/types/notification.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";

export const NOTIFICATION_KEYS = {
  all: ["notifications"] as const,
  list: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    ["notifications", "list", params ?? {}] as const,
};

const NOTIFICATION_SOCKET_NAMESPACE = "/notifications";
const NOTIFICATION_EVENT_NEW = "notification:new";
const NOTIFICATION_EVENT_UNREAD_COUNT = "notification:unread_count";

export function useNotifications(
  params?: { page?: number; limit?: number; unreadOnly?: boolean },
  enabled = true,
) {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.list(params),
    queryFn: () => notificationServices.getNotifications(params),
    enabled,
    staleTime: 30_000,
  });
}

function prependNotificationToCache(
  old: NotificationsListResponse | undefined,
  incoming: NotificationItem,
  unreadCount: number,
): NotificationsListResponse | undefined {
  if (!old) return old;
  const exists = old.items.some((item) => item.id === incoming.id);
  const nextItems = exists
    ? old.items.map((item) => (item.id === incoming.id ? incoming : item))
    : [incoming, ...old.items].slice(0, old.limit || 15);

  return {
    ...old,
    items: nextItems,
    unreadCount,
    total: exists ? old.total : old.total + 1,
  };
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationServices.markAsRead(id),
    onSuccess: (data) => {
      queryClient.setQueriesData<NotificationsListResponse>(
        { queryKey: NOTIFICATION_KEYS.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            unreadCount: data.unreadCount,
            items: old.items.map((item) =>
              item.id === data.notification.id ? data.notification : item,
            ),
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
    onError: mutationErrorToast("Không thể đánh dấu thông báo đã đọc"),
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationServices.markAllAsRead(),
    onSuccess: (data) => {
      const nowIso = new Date().toISOString();
      queryClient.setQueriesData<NotificationsListResponse>(
        { queryKey: NOTIFICATION_KEYS.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            unreadCount: data.unreadCount,
            items: old.items.map((item) => ({
              ...item,
              readAt: item.readAt ?? nowIso,
            })),
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
      if (data.updatedCount > 0) {
        toast.success("Đã đánh dấu tất cả thông báo là đã đọc");
      }
    },
    onError: mutationErrorToast("Không thể đánh dấu tất cả thông báo đã đọc"),
  });
}

export function useNotificationSocket(
  userId?: string | null,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const hasConnectedOnceRef = useRef(false);

  useEffect(() => {
    if (!enabled || !userId || typeof window === "undefined") {
      hasConnectedOnceRef.current = false;
      return;
    }

    const socketUrl = `${getPublicApiRoot()}${NOTIFICATION_SOCKET_NAMESPACE}`;
    const socket: Socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });

    const handleConnect = () => {
      if (hasConnectedOnceRef.current) {
        // Khi socket kết nối lại sau khi rớt mạng, fetch lại danh sách mới nhất
        void queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
      }
      hasConnectedOnceRef.current = true;
    };

    const handleNewNotification = (payload: NotificationSocketNewPayload) => {
      queryClient.setQueriesData<NotificationsListResponse>(
        { queryKey: NOTIFICATION_KEYS.all },
        (old) =>
          prependNotificationToCache(
            old,
            payload.notification,
            payload.unreadCount,
          ),
      );
      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });

      if (payload.notification.referenceType === "BOOKING") {
        void queryClient.invalidateQueries({ queryKey: ["bookings"] });
        void queryClient.invalidateQueries({ queryKey: ["provider", "bookings"] });
      } else if (payload.notification.referenceType === "PROVIDER_PROFILE") {
        void queryClient.invalidateQueries({ queryKey: ["provider"] });
        void queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
        void queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
      }

      toast.info(payload.notification.title, {
        description: payload.notification.body,
      });
    };

    const handleUnreadCount = (payload: NotificationSocketUnreadPayload) => {
      queryClient.setQueriesData<NotificationsListResponse>(
        { queryKey: NOTIFICATION_KEYS.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            unreadCount: payload.unreadCount,
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    };

    socket.on("connect", handleConnect);
    socket.on(NOTIFICATION_EVENT_NEW, handleNewNotification);
    socket.on(NOTIFICATION_EVENT_UNREAD_COUNT, handleUnreadCount);

    return () => {
      socket.off("connect", handleConnect);
      socket.off(NOTIFICATION_EVENT_NEW, handleNewNotification);
      socket.off(NOTIFICATION_EVENT_UNREAD_COUNT, handleUnreadCount);
      socket.disconnect();
    };
  }, [userId, enabled, queryClient]);
}
