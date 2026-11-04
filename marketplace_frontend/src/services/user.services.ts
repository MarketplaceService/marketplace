import axiosInstance from "@/lib/axios";
import { UpdateProfileDto, UserProfile } from "@/types/api.types";

export const userService = {
  getProfile: async (): Promise<UserProfile> => {
    const res = await axiosInstance.get<UserProfile>("/users/me");
    return res.data;
  },

  updateProfile: async (data: UpdateProfileDto): Promise<UserProfile> => {
    const res = await axiosInstance.patch<UserProfile>("/users/me", data);
    return res.data;
  },

  deleteAccount: async (): Promise<void> => {
    await axiosInstance.delete("/users/me");
  },
};
