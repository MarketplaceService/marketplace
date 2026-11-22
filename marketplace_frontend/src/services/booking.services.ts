import axiosInstance from "@/lib/axios";
import type {
  BookingDetail,
  BookingPreviewPayload,
  BookingPreviewResponse,
  BookingStatus,
  CreateBookingPayload,
  CustomerBookingTab,
  InspectionPhoto,
  MyBookingsResponse,
  ProviderBookingTab,
  ProviderBookingsResponse,
  ProviderWalletResponse,
  SubmitInspectionPayload,
} from "@/types/booking.types";

export const bookingServices = {
  previewBooking: async (
    payload: BookingPreviewPayload,
  ): Promise<BookingPreviewResponse> => {
    const { data } = await axiosInstance.post<BookingPreviewResponse>(
      "/bookings/preview",
      payload,
    );
    return data;
  },

  uploadInitialImages: async (files: File[]): Promise<InspectionPhoto[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("images", file);
    });

    const { data } = await axiosInstance.post<{ images: InspectionPhoto[] }>(
      "/bookings/initial-images",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data.images;
  },

  createBooking: async (payload: CreateBookingPayload): Promise<BookingDetail> => {
    const { data } = await axiosInstance.post<BookingDetail>("/bookings", payload);
    return data;
  },

  getMyBookings: async (params?: {
    tab?: CustomerBookingTab;
    status?: BookingStatus;
    page?: number;
    limit?: number;
  }): Promise<MyBookingsResponse> => {
    const { data } = await axiosInstance.get<MyBookingsResponse>("/bookings/my", {
      params,
    });
    return data;
  },

  getBookingDetail: async (id: string): Promise<BookingDetail> => {
    const { data } = await axiosInstance.get<BookingDetail>(`/bookings/${id}`);
    return data;
  },

  completeBooking: async (id: string): Promise<BookingDetail> => {
    const { data } = await axiosInstance.post<BookingDetail>(`/bookings/${id}/complete`);
    return data;
  },

  cancelBooking: async (id: string, reason: string): Promise<BookingDetail> => {
    const { data } = await axiosInstance.post<BookingDetail>(`/bookings/${id}/cancel`, {
      reason,
    });
    return data;
  },

  getProviderBookings: async (params?: {
    tab?: ProviderBookingTab;
    status?: BookingStatus;
    date?: string;
    page?: number;
    limit?: number;
  }): Promise<ProviderBookingsResponse> => {
    const { data } = await axiosInstance.get<ProviderBookingsResponse>(
      "/provider/bookings",
      { params },
    );
    return data;
  },

  confirmBooking: async (id: string): Promise<BookingDetail> => {
    const { data } = await axiosInstance.post<BookingDetail>(
      `/provider/bookings/${id}/confirm`,
    );
    return data;
  },

  rejectBooking: async (id: string, reason: string): Promise<BookingDetail> => {
    const { data } = await axiosInstance.post<BookingDetail>(
      `/provider/bookings/${id}/reject`,
      { reason },
    );
    return data;
  },

  startBooking: async (id: string): Promise<BookingDetail> => {
    const { data } = await axiosInstance.post<BookingDetail>(
      `/provider/bookings/${id}/start`,
    );
    return data;
  },

  uploadInspectionImage: async (
    bookingId: string,
    kind: "before" | "after",
    file: File,
  ): Promise<InspectionPhoto> => {
    const formData = new FormData();
    formData.append("image", file);

    const { data } = await axiosInstance.post<InspectionPhoto>(
      `/provider/bookings/${bookingId}/inspection/upload`,
      formData,
      {
        params: { kind },
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return data;
  },

  submitInspection: async (
    bookingId: string,
    payload: SubmitInspectionPayload,
  ): Promise<BookingDetail> => {
    const { data } = await axiosInstance.post<BookingDetail>(
      `/provider/bookings/${bookingId}/inspection`,
      payload,
    );
    return data;
  },

  getProviderWallet: async (params?: {
    month?: string;
    page?: number;
    limit?: number;
  }): Promise<ProviderWalletResponse> => {
    const { data } = await axiosInstance.get<ProviderWalletResponse>(
      "/provider/wallet",
      { params },
    );
    return data;
  },
};
