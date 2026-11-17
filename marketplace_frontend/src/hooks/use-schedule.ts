import { toastApiError } from "@/lib/api/api-error";
import {
  scheduleService,
  type AvailabilityBlockInput,
  type CreateTimeOffInput,
} from "@/services/schedule.services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";

// Bắt đầu bằng "provider" như các query khác của thợ; resetUserCache xóa hết khi đổi người dùng
export const SCHEDULE_KEYS = {
  availability: ["provider", "availability"] as const,
  timeOffs: ["provider", "time-off"] as const,
  slots: (providerId: string, date: string, durationMinutes: number) =>
    ["providers", providerId, "slots", date, durationMinutes] as const,
};

export const isConflictError = (error: unknown) =>
  isAxiosError(error) && error.response?.status === 409;

export function useMyAvailability() {
  return useQuery({
    queryKey: SCHEDULE_KEYS.availability,
    queryFn: scheduleService.listAvailability,
  });
}

/** Lỗi do trang tự báo theo từng phần khi lưu, nên hook không hiện toast */
export function useReplaceAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (blocks: AvailabilityBlockInput[]) =>
      scheduleService.replaceAvailability(blocks),
    onSuccess: (blocks) => {
      queryClient.setQueryData(SCHEDULE_KEYS.availability, blocks);
      void queryClient.invalidateQueries({ queryKey: ["providers"] });
    },
  });
}

export function useMyTimeOffs() {
  return useQuery({
    queryKey: SCHEDULE_KEYS.timeOffs,
    queryFn: scheduleService.listTimeOffs,
  });
}

export function useCreateTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTimeOffInput) => scheduleService.createTimeOff(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.timeOffs });
      void queryClient.invalidateQueries({ queryKey: ["providers"] });
      toast.success("Đã thêm lịch nghỉ");
    },
    // Lỗi 409 trùng đơn đã nhận được hiện thành khung cảnh báo trong thẻ, không cần toast
    onError: (error) => {
      if (!isConflictError(error)) toastApiError(error, "Không thể thêm lịch nghỉ");
    },
  });
}

export function useDeleteTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => scheduleService.deleteTimeOff(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.timeOffs });
      void queryClient.invalidateQueries({ queryKey: ["providers"] });
      toast.success("Đã xóa lịch nghỉ");
    },
    onError: (error) => toastApiError(error, "Không thể xóa lịch nghỉ"),
  });
}

export function useAvailableSlots(providerId: string, date: string, durationMinutes = 60) {
  return useQuery({
    queryKey: SCHEDULE_KEYS.slots(providerId, date, durationMinutes),
    queryFn: () => scheduleService.getAvailableSlots(providerId, date, durationMinutes),
    enabled: !!providerId && !!date,
    // Trạng thái slot đổi khi có người đặt, nên luôn lấy lại khi quay lại trang
    staleTime: 0,
  });
}
