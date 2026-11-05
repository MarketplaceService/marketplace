'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { providerService } from '@/services/provider.services';
import {
  CheckServiceAreaPayload,
  CreateServiceAreaPayload,
  RegisterProviderPayload,
  UpdateProviderProfilePayload,
  UpdateServiceAreaPayload,
} from '@/types/provider.types';
import { toast } from 'sonner';

export const useMyProviderProfile = () => {
  return useQuery({
    queryKey: ['provider', 'me'],
    queryFn: () => providerService.getMyProfile(),
    retry: false,
    staleTime: 1000 * 60 * 2, // 2 mins
  });
};

export const useRegisterProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RegisterProviderPayload) =>
      providerService.register(payload),
    onSuccess: () => {
      toast.success(
        'Gửi hồ sơ đăng ký Nhà cung cấp thành công! Vui lòng chờ Admin thẩm định.',
      );
      void queryClient.invalidateQueries({ queryKey: ['provider', 'me'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        'Gửi hồ sơ đăng ký thất bại, vui lòng kiểm tra lại thông tin!';
      toast.error(msg);
    },
  });
};

export const useUpdateProviderProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProviderProfilePayload) =>
      providerService.updateMyProfile(payload),
    onSuccess: () => {
      toast.success('Cập nhật hồ sơ Nhà cung cấp thành công!');
      void queryClient.invalidateQueries({ queryKey: ['provider', 'me'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Cập nhật hồ sơ thất bại!';
      toast.error(msg);
    },
  });
};

export const useMyServiceAreas = () => {
  return useQuery({
    queryKey: ['provider', 'service-areas'],
    queryFn: () => providerService.getMyServiceAreas(),
  });
};

export const useCreateServiceArea = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateServiceAreaPayload) =>
      providerService.createServiceArea(payload),
    onSuccess: () => {
      toast.success('Đã thêm khu vực phục vụ mới!');
      void queryClient.invalidateQueries({
        queryKey: ['provider', 'service-areas'],
      });
      void queryClient.invalidateQueries({ queryKey: ['provider', 'me'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Thêm khu vực phục vụ thất bại!';
      toast.error(msg);
    },
  });
};

export const useUpdateServiceArea = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateServiceAreaPayload;
    }) => providerService.updateServiceArea(id, payload),
    onSuccess: () => {
      toast.success('Đã cập nhật khu vực phục vụ!');
      void queryClient.invalidateQueries({
        queryKey: ['provider', 'service-areas'],
      });
      void queryClient.invalidateQueries({ queryKey: ['provider', 'me'] });
    },
  });
};

export const useDeleteServiceArea = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => providerService.deleteServiceArea(id),
    onSuccess: () => {
      toast.success('Đã xóa khu vực phục vụ!');
      void queryClient.invalidateQueries({
        queryKey: ['provider', 'service-areas'],
      });
      void queryClient.invalidateQueries({ queryKey: ['provider', 'me'] });
    },
  });
};

export const useCheckServiceArea = () => {
  return useMutation({
    mutationFn: (payload: CheckServiceAreaPayload) =>
      providerService.checkServiceArea(payload),
  });
};

