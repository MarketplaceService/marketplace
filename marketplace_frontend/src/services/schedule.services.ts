import axiosInstance from "@/lib/axios";

export interface AvailabilityBlock {
  id: string;
  /** 0 là Chủ Nhật */
  dayOfWeek: number;
  /** HH:mm theo giờ Việt Nam */
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export type AvailabilityBlockInput = Omit<AvailabilityBlock, "id">;

export interface TimeOff {
  id: string;
  startAt: string;
  endAt: string;
  reason: string;
}

export interface CreateTimeOffInput {
  /** ISO kèm múi giờ, ví dụ 2026-11-20T08:00:00+07:00 */
  startAt: string;
  endAt: string;
  reason: string;
}

export type SlotStatus = "AVAILABLE" | "HELD" | "BOOKED";

export interface AvailableSlot {
  startAt: string;
  endAt: string;
  startTime: string;
  endTime: string;
  status: SlotStatus;
}

export interface AvailableSlotsResponse {
  providerId: string;
  date: string;
  timezone: string;
  durationMinutes: number;
  slots: AvailableSlot[];
}

export const scheduleService = {
  listAvailability: async () => {
    const { data } = await axiosInstance.get<AvailabilityBlock[]>("/provider/availability");
    return data;
  },

  replaceAvailability: async (blocks: AvailabilityBlockInput[]) => {
    const { data } = await axiosInstance.put<AvailabilityBlock[]>(
      "/provider/availability",
      { blocks },
    );
    return data;
  },

  listTimeOffs: async () => {
    const { data } = await axiosInstance.get<TimeOff[]>("/provider/time-off");
    return data;
  },

  createTimeOff: async (payload: CreateTimeOffInput) => {
    const { data } = await axiosInstance.post<TimeOff>("/provider/time-off", payload);
    return data;
  },

  deleteTimeOff: async (id: string) => {
    const { data } = await axiosInstance.delete<{ id: string }>(`/provider/time-off/${id}`);
    return data;
  },

  getAvailableSlots: async (providerId: string, date: string, durationMinutes?: number) => {
    const { data } = await axiosInstance.get<AvailableSlotsResponse>(
      `/providers/${providerId}/available-slots`,
      { params: { date, durationMinutes } },
    );
    return data;
  },
};
