import { mutationErrorToast } from "@/lib/api/api-error";
import { bookingServices } from "@/services/booking.services";
import type {
  BookingPreviewPayload,
  BookingStatus,
  CreateBookingPayload,
  CreateReviewPayload,
  CustomerBookingTab,
} from "@/types/booking.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const BOOKING_KEYS = {
  all: ["bookings"] as const,
  my: (params?: {
    tab?: CustomerBookingTab;
    status?: BookingStatus;
    page?: number;
    limit?: number;
  }) => ["bookings", "my", params] as const,
  detail: (id: string) => ["bookings", "detail", id] as const,
  preview: (payload: BookingPreviewPayload | null) =>
    ["bookings", "preview", payload] as const,
};

export function useBookingPreview(payload: BookingPreviewPayload | null) {
  return useQuery({
    queryKey: BOOKING_KEYS.preview(payload),
    queryFn: () => bookingServices.previewBooking(payload!),
    enabled: Boolean(
      payload?.serviceId && payload?.addressId && payload?.scheduledStartAt,
    ),
    staleTime: 0,
    retry: false,
  });
}

export function useUploadInitialBookingImages() {
  return useMutation({
    mutationFn: (files: File[]) => bookingServices.uploadInitialImages(files),
    onError: mutationErrorToast("Không thể tải ảnh hiện trạng lên"),
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBookingPayload) =>
      bookingServices.createBooking(payload),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: ["provider", "bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["providers"] });
      queryClient.setQueryData(BOOKING_KEYS.detail(created.id), created);
      toast.success("Đặt lịch thành công! Đơn hàng đang chờ thợ xác nhận.");
    },
    onError: mutationErrorToast("Không thể tạo đơn đặt lịch"),
  });
}

export function useMyBookings(params?: {
  tab?: CustomerBookingTab;
  status?: BookingStatus;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: BOOKING_KEYS.my(params),
    queryFn: () => bookingServices.getMyBookings(params),
  });
}

export function useBookingDetail(id: string) {
  return useQuery({
    queryKey: BOOKING_KEYS.detail(id),
    queryFn: () => bookingServices.getBookingDetail(id),
    enabled: Boolean(id),
  });
}

export function useCompleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bookingServices.completeBooking(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(BOOKING_KEYS.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: ["provider"] });
      toast.success("Đã xác nhận nghiệm thu & hoàn tất đơn hàng!");
    },
    onError: mutationErrorToast("Không thể hoàn tất đơn hàng"),
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      bookingServices.cancelBooking(id, reason),
    onSuccess: (updated) => {
      queryClient.setQueryData(BOOKING_KEYS.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: ["provider"] });
      void queryClient.invalidateQueries({ queryKey: ["providers"] });
      toast.success("Đã hủy đơn đặt lịch");
    },
    onError: mutationErrorToast("Không thể hủy đơn đặt lịch"),
  });
}

export function useCreateBookingReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: CreateReviewPayload;
    }) => bookingServices.createBookingReview(bookingId, payload),
    onSuccess: (_review, variables) => {
      void queryClient.invalidateQueries({
        queryKey: BOOKING_KEYS.detail(variables.bookingId),
      });
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: ["providers"] });
      void queryClient.invalidateQueries({ queryKey: ["discovery"] });
      toast.success("Cảm ơn bạn đã gửi đánh giá dịch vụ!");
    },
    onError: mutationErrorToast("Không thể gửi đánh giá"),
  });
}
