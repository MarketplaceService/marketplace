import axiosInstance from "@/lib/axios";
import type {
  MarkAllNotificationsReadResponse,
  MarkNotificationReadResponse,
  NotificationsListResponse,
} from "@/types/notification.types";

export const notificationServices = {
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationsListResponse> => {
    const { data } = await axiosInstance.get<NotificationsListResponse>(
      "/notifications",
      { params },
    );
    return data;
  },

  markAsRead: async (id: string): Promise<MarkNotificationReadResponse> => {
    const { data } = await axiosInstance.patch<MarkNotificationReadResponse>(
      `/notifications/${id}/read`,
    );
    return data;
  },

  markAllAsRead: async (): Promise<MarkAllNotificationsReadResponse> => {
    const { data } =
      await axiosInstance.patch<MarkAllNotificationsReadResponse>(
        "/notifications/read-all",
      );
    return data;
  },
};
