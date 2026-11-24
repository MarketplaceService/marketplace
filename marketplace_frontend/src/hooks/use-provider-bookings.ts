import { BOOKING_KEYS } from "@/hooks/use-bookings";
import { PROVIDER_KEYS } from "@/hooks/use-provider";
import { mutationErrorToast } from "@/lib/api/api-error";
import { bookingServices } from "@/services/booking.services";
import { providerServices } from "@/services/provider.services";
import type {
  BookingStatus,
  ProviderBookingTab,
  SubmitInspectionPayload,
} from "@/types/booking.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const PROVIDER_BOOKING_KEYS = {
  list: (params?: {
    tab?: ProviderBookingTab;
    status?: BookingStatus;
    date?: string;
    page?: number;
    limit?: number;
  }) => ["provider", "bookings", params] as const,
  wallet: (params?: { month?: string; page?: number; limit?: number }) =>
    ["provider", "wallet", params] as const,
};

export function useProviderBookings(
  params?: {
    tab?: ProviderBookingTab;
    status?: BookingStatus;
    date?: string;
    page?: number;
    limit?: number;
  },
  enabled = true,
) {
  return useQuery({
    queryKey: PROVIDER_BOOKING_KEYS.list(params),
    queryFn: () => bookingServices.getProviderBookings(params),
    enabled,
  });
}

export function useConfirmBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bookingServices.confirmBooking(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(BOOKING_KEYS.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: ["provider", "bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["provider", "wallet"] });
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: ["providers"] });
      toast.success("Đã xác nhận nhận đơn đặt lịch");
    },
    onError: mutationErrorToast("Không thể xác nhận đơn đặt lịch"),
  });
}

export function useRejectBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      bookingServices.rejectBooking(id, reason),
    onSuccess: (updated) => {
      queryClient.setQueryData(BOOKING_KEYS.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: ["provider", "bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["provider", "wallet"] });
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: ["providers"] });
      toast.success("Đã từ chối đơn đặt lịch");
    },
    onError: mutationErrorToast("Không thể từ chối đơn đặt lịch"),
  });
}

export function useStartBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bookingServices.startBooking(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(BOOKING_KEYS.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: ["provider", "bookings"] });
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
      toast.success("Đã chuyển đơn sang trạng thái Đang thực hiện");
    },
    onError: mutationErrorToast("Không thể bắt đầu thực hiện đơn"),
  });
}

export function useUploadInspectionImage() {
  return useMutation({
    mutationFn: ({
      bookingId,
      kind,
      file,
    }: {
      bookingId: string;
      kind: "before" | "after";
      file: File;
    }) => bookingServices.uploadInspectionImage(bookingId, kind, file),
    onError: mutationErrorToast("Không thể tải ảnh nghiệm thu lên"),
  });
}

export function useSubmitInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: SubmitInspectionPayload;
    }) => bookingServices.submitInspection(bookingId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(BOOKING_KEYS.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: ["provider", "bookings"] });
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
      toast.success("Đã gửi biên bản nghiệm thu cho khách hàng!");
    },
    onError: mutationErrorToast("Không thể gửi biên bản nghiệm thu"),
  });
}

export function useProviderWallet(params?: {
  month?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: PROVIDER_BOOKING_KEYS.wallet(params),
    queryFn: () => bookingServices.getProviderWallet(params),
  });
}

export function useUpdateProviderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (isOnline: boolean) => providerServices.updateMyStatus(isOnline),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: PROVIDER_KEYS.myProfile });
      void queryClient.invalidateQueries({ queryKey: ["providers"] });
      if (res.isOnline) {
        toast.success("Đã bật chế độ: Sẵn sàng nhận việc");
      } else {
        toast.warning("Đã chuyển sang chế độ: Tạm nghỉ nhận việc");
      }
    },
    onError: mutationErrorToast("Không thể cập nhật trạng thái nhận việc"),
  });
}
