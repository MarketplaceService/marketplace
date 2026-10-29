import { mutationErrorToast } from "@/lib/api/api-error";
import axiosInstance from "@/lib/axios";
import { authSerivce } from "@/services/auth.services";

import {
  ForgotPasswordDto,
  ResetPasswordDto,
  SignInDto,
  SignUpDto,
  User,
} from "@/types/api.types";
import { AuthMeResponse, AuthSession } from "@/types/hook.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const GUEST_USER_ROLE = "unregistered";

interface AuthToastMessages {
  success?: string;
  error?: string;
}

export const useSignUp = (
  messages?: AuthToastMessages & { verifyEmail?: string },
) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SignUpDto) => authSerivce.signUp(data),

    onSuccess: (response) => {
      queryClient.setQueryData(["auth", "session"], {
        user: response.user,
        isGuest: false,
        isAuthenticated: true,
      });

      if (response.token) {
        toast.success(messages?.success ?? "Account created successfully");

        router.push("/product/catalog");
        return;
      }

      toast.info(
        messages?.verifyEmail ??
          messages?.success ??
          "Account created! Please check your email to verify your account",
      );

      router.push("/auth/signin");
    },

    onError: mutationErrorToast(messages?.error ?? "Sign up failed"),
  });
};

export const useResendVerificationEmail = (messages?: AuthToastMessages) => {
  return useMutation({
    mutationFn: (email: string) => authSerivce.resendVerificationEmail(email),

    onSuccess: () => {
      toast.success(
        messages?.success ?? "Verification email send! Please check your inbox",
      );
    },

    onError: mutationErrorToast(
      messages?.error ?? "Failed to send verification email",
    ),
  });
};

export const useSignIn = (messages?: AuthToastMessages, redirectTo?: string) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SignInDto & { rememberMe?: boolean }) =>
      authSerivce.signIn(data),

    onSuccess: (response) => {
      queryClient.setQueryData(["auth", "session"], {
        user: response.user,
        isGuest: false,
        isAuthenticated: true,
      });

      toast.success(messages?.success ?? "Sign in successfull!");

      router.push(redirectTo ?? "/product/catalog");
    },

    onError: mutationErrorToast(messages?.error ?? "Sign in failed"),
  });
};

export const useForgotPassword = (messages?: AuthToastMessages) => {
  return useMutation({
    mutationFn: (data: ForgotPasswordDto) => authSerivce.forgotPassword(data),

    onSuccess: () => {
      toast.success(messages?.success ?? "Password reset email sent");
    },

    onError: mutationErrorToast(messages?.error ?? "Failed to send reset email"),
  });
};

export const useResetPassword = (messages?: AuthToastMessages) => {
  const router = useRouter();
  return useMutation({
    mutationFn: (data: ResetPasswordDto) => authSerivce.resetPassword(data),

    onSuccess: () => {
      toast.success(messages?.success ?? "Password reset successful!");

      router.push("/auth/signin");
    },

    onError: mutationErrorToast(messages?.error ?? "Password reset failed"),
  });
};

export const useGoogleSignIn = (messages?: { error?: string }) => {
  const [isLoading, setIsLoading] = useState(false);

  const signInWithGoogle = async (redirectPath?: string) => {
    try {
      setIsLoading(true);
      await authSerivce.signInWithGoogle(redirectPath);
    } catch (error: unknown) {
      const msg = (error as Error)?.message;
      setIsLoading(false);
      toast.error(
        (messages?.error ?? "Unable to initialize Google sign in: ") + (msg ?? ""),
      );
      return;
    }
    setIsLoading(false);
  };
  return { signInWithGoogle, isLoading };
};

export const useAuthSession = () => {
  return useQuery<AuthSession>({
    queryKey: ["auth", "session"],
    queryFn: async () => {
      const res = await axiosInstance.get<AuthMeResponse>("/auth/me", {
        validateStatus: () => true,
      });

      const oke = res.status >= 200 && res.status < 300;
      const data = res.data;

      if (!oke || !data.success || !data.authenticated || !data.user) {
        return { user: null, isGuest: false, isAuthenticated: false };
      }

      const isGuest =
        data.user.isAnonymous === true ||
        data.user.role === GUEST_USER_ROLE ||
        (typeof data.user.email === "string" &&
          data.user.email.endsWith("@temp.local"));

      return {
        user: data.user,
        isGuest,
        isAuthenticated: true,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useCurrentUser = (): { data: User | null; isLoading: boolean } => {
  const { data, isLoading } = useAuthSession();
  const user = data?.isAuthenticated && !data.isGuest ? (data.user ?? null) : null;
  return { data: user, isLoading };
};

export const useSignOut = (messages?: { success?: string }) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authSerivce.signOut(),

    onSuccess: async () => {
      queryClient.setQueryData(["auth", "session"], {
        user: null,
        isGuest: false,
        isAuthenticated: false,
      });

      await queryClient.invalidateQueries({ queryKey: ["auth", "session"] });

      void queryClient.invalidateQueries({ queryKey: ["cart"] });

      toast.success(messages?.success ?? "Signed out");
      router.push("/auth/signin");
    },
  });
};
