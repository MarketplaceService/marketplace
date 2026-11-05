'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminProviderService } from '@/services/admin-provider.services';
import { ProvidersQueryFilters } from '@/types/provider.types';
import { toast } from 'sonner';

export const useAdminProvidersList = (filters?: ProvidersQueryFilters) => {
  return useQuery({
    queryKey: ['admin', 'providers', filters],
    queryFn: () => adminProviderService.getProviders(filters),
  });
};

export const useAdminProviderStats = () => {
  return useQuery({
    queryKey: ['admin', 'providers', 'stats'],
    queryFn: () => adminProviderService.getStats(),
  });
};

export const useAdminProviderDetail = (id: string | null) => {
  return useQuery({
    queryKey: ['admin', 'providers', id],
    queryFn: () => (id ? adminProviderService.getProviderDetail(id) : null),
    enabled: Boolean(id),
  });
};

export const useApproveProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminProviderService.approveProvider(id),
    onSuccess: (data) => {
      toast.success(
        `Đã phê duyệt Nhà cung cấp "${data.displayName}" thành công! Đã cấp quyền Nhà cung cấp.`,
      );
      void queryClient.invalidateQueries({ queryKey: ['admin', 'providers'] });
      void queryClient.invalidateQueries({ queryKey: ['provider'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Phê duyệt Nhà cung cấp thất bại!';
      toast.error(msg);
    },
  });
};

export const useRejectProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminProviderService.rejectProvider(id, reason),
    onSuccess: (data) => {
      toast.warning(
        `Đã từ chối hồ sơ "${data.displayName}". Quyền tài khoản giữ nguyên là Khách hàng.`,
      );
      void queryClient.invalidateQueries({ queryKey: ['admin', 'providers'] });
      void queryClient.invalidateQueries({ queryKey: ['provider'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Từ chối hồ sơ thất bại!';
      toast.error(msg);
    },
  });
};

