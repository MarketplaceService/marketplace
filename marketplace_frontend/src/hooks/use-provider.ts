import {
  providerServices,
  type CheckServiceAreaPayload,
  type RegisterProviderPayload,
} from "@/services/provider.services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const PROVIDER_KEYS = {
  myProfile: ["provider", "me"] as const,
  adminList: (filters?: { search?: string; category?: string; status?: string }) =>
    ["admin", "providers", filters] as const,
  adminDetail: (id: string) => ["admin", "providers", id] as const,
};

export function useMyProviderProfile() {
  return useQuery({
    queryKey: PROVIDER_KEYS.myProfile,
    queryFn: () => providerServices.getMyProfile(),
    staleTime: 1000 * 60,
  });
}

export function useRegisterProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RegisterProviderPayload) =>
      providerServices.register(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(PROVIDER_KEYS.myProfile, data);
      queryClient.invalidateQueries({ queryKey: ["provider"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
      toast.success("Hồ sơ đăng ký đã được gửi thành công và đang chờ xét duyệt!");
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message || "Có lỗi xảy ra khi nộp hồ sơ đăng ký";
      toast.error(msg);
    },
  });
}

export function useCheckServiceArea() {
  return useMutation({
    mutationFn: (payload: CheckServiceAreaPayload) =>
      providerServices.checkServiceArea(payload),
  });
}

export function useAdminProviders(filters?: {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: PROVIDER_KEYS.adminList(filters),
    queryFn: () => providerServices.adminList(filters),
  });
}

export function useAdminProviderDetail(id?: string) {
  return useQuery({
    queryKey: PROVIDER_KEYS.adminDetail(id ?? ""),
    queryFn: () => providerServices.adminGetDetail(id!),
    enabled: !!id,
  });
}

export function useAdminApproveProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => providerServices.adminApprove(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
      queryClient.setQueryData(PROVIDER_KEYS.adminDetail(updated.id), updated);
      toast.success("Đã phê duyệt hồ sơ và nâng quyền Thợ thành công!");
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message || "Có lỗi xảy ra khi phê duyệt hồ sơ";
      toast.error(msg);
    },
  });
}

export function useAdminRejectProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      providerServices.adminReject(id, reason),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
      queryClient.setQueryData(PROVIDER_KEYS.adminDetail(updated.id), updated);
      toast.success("Đã từ chối hồ sơ kèm lý do");
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message || "Có lỗi xảy ra khi từ chối hồ sơ";
      toast.error(msg);
    },
  });
}

