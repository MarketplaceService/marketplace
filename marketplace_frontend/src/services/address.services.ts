import axiosInstance from "@/lib/axios";
import {
  CreateAddressDto,
  ProfileAddress,
  UpdateAddressDto,
} from "@/types/api.types";

export const addressService = {
  list: async (): Promise<ProfileAddress[]> => {
    const res = await axiosInstance.get<ProfileAddress[]>("/addresses");
    return res.data;
  },

  create: async (data: CreateAddressDto): Promise<ProfileAddress> => {
    const res = await axiosInstance.post<ProfileAddress>("/addresses", data);
    return res.data;
  },

  update: async (id: string, data: UpdateAddressDto): Promise<ProfileAddress> => {
    const res = await axiosInstance.patch<ProfileAddress>(`/addresses/${id}`, data);
    return res.data;
  },

  setDefault: async (id: string): Promise<ProfileAddress> => {
    const res = await axiosInstance.patch<ProfileAddress>(`/addresses/${id}/default`);
    return res.data;
  },

  remove: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/addresses/${id}`);
  },
};
