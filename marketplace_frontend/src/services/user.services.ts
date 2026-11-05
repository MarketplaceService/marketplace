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

  uploadAvatar: async (file: File): Promise<UserProfile> => {
    const formData = new FormData();
    formData.append("avatar", file);

    // Phải ghi đè Content-Type mặc định, nếu không axios sẽ biến FormData thành JSON
    const res = await axiosInstance.post<UserProfile>("/users/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  deleteAccount: async (): Promise<void> => {
    await axiosInstance.delete("/users/me");
  },
};
