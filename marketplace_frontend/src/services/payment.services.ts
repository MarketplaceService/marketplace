import axiosInstance from "@/lib/axios";
import type {
  BookingPaymentSummary,
  PaymentMethod,
  PaymentMethodOption,
  PaymentStatusResponse,
} from "@/types/booking.types";

export const paymentServices = {
  getMethods: async (): Promise<PaymentMethodOption[]> => {
    const { data } = await axiosInstance.get<PaymentMethodOption[]>(
      "/payments/methods",
    );
    return data;
  },

  /** Trạng thái đọc từ database, dùng để polling */
  getPayment: async (id: string): Promise<PaymentStatusResponse> => {
    const { data } = await axiosInstance.get<PaymentStatusResponse>(
      `/payments/${id}`,
    );
    return data;
  },

  /** Hỏi PayOS trạng thái thật rồi cập nhật database */
  syncPayment: async (id: string): Promise<PaymentStatusResponse> => {
    const { data } = await axiosInstance.post<PaymentStatusResponse>(
      `/payments/${id}/sync`,
    );
    return data;
  },

  getBookingPayments: async (
    bookingId: string,
  ): Promise<BookingPaymentSummary[]> => {
    const { data } = await axiosInstance.get<BookingPaymentSummary[]>(
      `/bookings/${bookingId}/payments`,
    );
    return data;
  },

  /** Thanh toán lại hoặc đổi phương thức */
  createBookingPayment: async (
    bookingId: string,
    paymentMethod: PaymentMethod,
  ): Promise<PaymentStatusResponse> => {
    const { data } = await axiosInstance.post<PaymentStatusResponse>(
      `/bookings/${bookingId}/payments`,
      { paymentMethod },
    );
    return data;
  },
};
