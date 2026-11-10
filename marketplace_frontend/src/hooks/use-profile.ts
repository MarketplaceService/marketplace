import { mutationErrorToast } from "@/lib/api/api-error";
import { authSerivce } from "@/services/auth.services";
import { userService } from "@/services/user.services";
import { UpdateProfileDto } from "@/types/api.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { resetUserCache } from "./use-auth";

const PROFILE_QUERY_KEY = ["profile"];

export const useProfile = () => {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: userService.getProfile,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileDto) => userService.updateProfile(data),

    onSuccess: (profile) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, profile);
      void queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
      toast.success("Đã lưu thông tin cá nhân");
    },

    onError: mutationErrorToast("Không thể lưu thông tin cá nhân"),
  });
};

export const useUploadAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => userService.uploadAvatar(file),

    onSuccess: (profile) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, profile);
      void queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
      toast.success("Đã cập nhật ảnh đại diện");
    },

    onError: mutationErrorToast("Không thể tải ảnh lên"),
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => userService.deleteAccount(),

    onSuccess: async () => {
      await authSerivce.signOut();
      resetUserCache(queryClient);
      toast.success("Tài khoản đã được xóa");
      router.push("/auth/signin");
    },

    onError: mutationErrorToast("Không thể xóa tài khoản"),
  });
};
