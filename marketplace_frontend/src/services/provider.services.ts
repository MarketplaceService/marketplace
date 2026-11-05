import axiosInstance from '@/lib/axios';
import {
  CheckServiceAreaPayload,
  CheckServiceAreaResult,
  CreateServiceAreaPayload,
  ProviderDocument,
  ProviderProfile,
  ProviderServiceArea,
  RegisterProviderPayload,
  UpdateProviderProfilePayload,
  UpdateServiceAreaPayload,
} from '@/types/provider.types';

export const providerService = {
  register: async (payload: RegisterProviderPayload): Promise<ProviderProfile> => {
    const res = await axiosInstance.post<ProviderProfile>(
      '/provider/register',
      payload,
    );
    return res.data;
  },

  getMyProfile: async (): Promise<ProviderProfile> => {
    const res = await axiosInstance.get<ProviderProfile>('/provider/me');
    return res.data;
  },

  updateMyProfile: async (
    payload: UpdateProviderProfilePayload,
  ): Promise<ProviderProfile> => {
    const res = await axiosInstance.patch<ProviderProfile>(
      '/provider/me',
      payload,
    );
    return res.data;
  },

  getMyDocuments: async (): Promise<ProviderDocument[]> => {
    const res = await axiosInstance.get<ProviderDocument[]>(
      '/provider/me/documents',
    );
    return res.data;
  },

  addDocument: async (payload: {
    documentType: string;
    fileUrl: string;
  }): Promise<ProviderDocument> => {
    const res = await axiosInstance.post<ProviderDocument>(
      '/provider/me/documents',
      payload,
    );
    return res.data;
  },

  getMyServiceAreas: async (): Promise<ProviderServiceArea[]> => {
    const res = await axiosInstance.get<ProviderServiceArea[]>(
      '/provider/service-areas',
    );
    return res.data;
  },

  createServiceArea: async (
    payload: CreateServiceAreaPayload,
  ): Promise<ProviderServiceArea> => {
    const res = await axiosInstance.post<ProviderServiceArea>(
      '/provider/service-areas',
      payload,
    );
    return res.data;
  },

  updateServiceArea: async (
    id: string,
    payload: UpdateServiceAreaPayload,
  ): Promise<ProviderServiceArea> => {
    const res = await axiosInstance.patch<ProviderServiceArea>(
      `/provider/service-areas/${id}`,
      payload,
    );
    return res.data;
  },

  deleteServiceArea: async (id: string): Promise<{ success: boolean }> => {
    const res = await axiosInstance.delete<{ success: boolean }>(
      `/provider/service-areas/${id}`,
    );
    return res.data;
  },

  checkServiceArea: async (
    payload: CheckServiceAreaPayload,
  ): Promise<CheckServiceAreaResult> => {
    const res = await axiosInstance.post<CheckServiceAreaResult>(
      '/provider/service-areas/check',
      payload,
    );
    return res.data;
  },

  getPublicProfile: async (id: string): Promise<ProviderProfile> => {
    const res = await axiosInstance.get<ProviderProfile>(`/providers/${id}`);
    return res.data;
  },
};

