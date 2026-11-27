import { mutationErrorToast } from "@/lib/api/api-error";
import { isPaymentPending, redirectToPayos } from "@/lib/payment";
import { paymentServices } from "@/services/payment.services";
import type {
  PaymentMethod,
  PaymentStatusResponse,
} from "@/types/booking.types";
import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BOOKING_KEYS } from "./use-bookings";

const POLL_INTERVAL_MS = 3_000;
// Quá thời gian này thì ngừng polling, khách bấm "Kiểm tra lại" để hỏi tiếp
const MAX_POLL_DURATION_MS = 10 * 60_000;

export const PAYMENT_KEYS = {
  all: ["payments"] as const,
  methods: ["payments", "methods"] as const,
  detail: (id: string) => ["payments", "detail", id] as const,
};

/**
 * Khi trạng thái đổi: báo khách lúc tiền vừa về, và làm mới chi tiết, danh sách đơn
 * để thẻ thanh toán và nút nghiệm thu đổi theo.
 */
function handleTransition(
  queryClient: QueryClient,
  previous: PaymentStatusResponse | undefined,
  next: PaymentStatusResponse,
) {
  if (previous?.payment.status === next.payment.status) return;
  if (
    previous &&
    isPaymentPending(previous.payment.status) &&
    next.payment.status === "completed"
  ) {
    toast.success("Đã nhận được thanh toán. Cảm ơn bạn!");
  }
  void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
}

function applyPaymentResponse(
  queryClient: QueryClient,
  response: PaymentStatusResponse,
) {
  const key = PAYMENT_KEYS.detail(response.payment.id);
  const previous = queryClient.getQueryData<PaymentStatusResponse>(key);
  queryClient.setQueryData(key, response);
  handleTransition(queryClient, previous, response);
}

export function usePaymentMethods(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: PAYMENT_KEYS.methods,
    queryFn: paymentServices.getMethods,
    staleTime: 5 * 60_000,
    enabled: options.enabled ?? true,
  });
}

/**
 * Trạng thái giao dịch. Với poll: true, hỏi lại mỗi 3 giây khi còn chờ tiền về.
 * React Query tự dừng khi tab bị ẩn và hỏi lại khi khách quay lại tab.
 */
export function usePaymentStatus(
  id: string | null | undefined,
  options: { poll?: boolean } = {},
) {
  const queryClient = useQueryClient();
  const [startedAt] = useState(() => Date.now());
  const poll = options.poll ?? false;

  return useQuery({
    queryKey: PAYMENT_KEYS.detail(id ?? ""),
    queryFn: async () => {
      const key = PAYMENT_KEYS.detail(id as string);
      const previous = queryClient.getQueryData<PaymentStatusResponse>(key);
      const next = await paymentServices.getPayment(id as string);
      if (previous) handleTransition(queryClient, previous, next);
      return next;
    },
    enabled: Boolean(id),
    refetchInterval: (query) => {
      if (!poll || Date.now() - startedAt > MAX_POLL_DURATION_MS) return false;
      return isPaymentPending(query.state.data?.payment.status)
        ? POLL_INTERVAL_MS
        : false;
    },
  });
}

/** Hỏi PayOS trạng thái thật. silent: không báo lỗi (dùng khi tự đồng bộ lúc mở trang) */
export function useSyncPayment(options: { silent?: boolean } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => paymentServices.syncPayment(id),
    onSuccess: (response) => applyPaymentResponse(queryClient, response),
    onError: options.silent
      ? undefined
      : mutationErrorToast("Không kiểm tra được trạng thái thanh toán"),
  });
}

/**
 * Thanh toán lại hoặc đổi phương thức. redirect: true thì chuyển sang trang PayOS ngay khi có link,
 * false thì để trang đơn hiện mã QR mới.
 */
export function useRetryPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      bookingId: string;
      method: PaymentMethod;
      redirect?: boolean;
    }) => paymentServices.createBookingPayment(input.bookingId, input.method),
    onSuccess: (response, input) => {
      queryClient.setQueryData(PAYMENT_KEYS.detail(response.payment.id), response);
      void queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.all });
      const { payment } = response;

      if (payment.paymentMethod !== "payos") {
        toast.success("Đã chuyển sang thanh toán tiền mặt khi nghiệm thu");
        return;
      }
      if (payment.status === "failed" || !payment.paymentLinkUrl) {
        toast.error("Chưa tạo được link thanh toán PayOS, vui lòng thử lại sau");
        return;
      }
      if (input.redirect && redirectToPayos(payment.paymentLinkUrl)) {
        toast.success("Đang chuyển tới trang thanh toán PayOS...");
        return;
      }
      toast.success("Đã tạo link thanh toán mới");
    },
    onError: mutationErrorToast("Không tạo được giao dịch thanh toán mới"),
  });
}
