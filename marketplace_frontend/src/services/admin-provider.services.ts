import axiosInstance from '@/lib/axios';
import {
  ProviderProfile,
  ProvidersListResponse,
  ProvidersQueryFilters,
  ProviderStats,
} from '@/types/provider.types';

export const adminProviderService = {
  getStats: async (): Promise<ProviderStats> => {
    const res = await axiosInstance.get<ProviderStats>('/admin/providers/stats');
    return res.data;
  },

  getProviders: async (
    filters?: ProvidersQueryFilters,
  ): Promise<ProvidersListResponse> => {
    const res = await axiosInstance.get<ProvidersListResponse>(
      '/admin/providers',
      { params: filters },
    );
    return res.data;
  },

  getProviderDetail: async (id: string): Promise<ProviderProfile> => {
    const res = await axiosInstance.get<ProviderProfile>(
      `/admin/providers/${id}`,
    );
    return res.data;
  },

  approveProvider: async (id: string): Promise<ProviderProfile> => {
    const res = await axiosInstance.post<ProviderProfile>(
      `/admin/providers/${id}/approve`,
    );
    return res.data;
  },

  rejectProvider: async (
    id: string,
    reason: string,
  ): Promise<ProviderProfile> => {
    const res = await axiosInstance.post<ProviderProfile>(
      `/admin/providers/${id}/reject`,
      { reason },
    );
    return res.data;
  },
};

