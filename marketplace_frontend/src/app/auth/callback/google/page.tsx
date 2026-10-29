"use client";

import axiosInstance from "@/lib/axios";
import { User } from "@/types/api.types";
import { useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AuthMeResponse } from "@/types/hook.types";

async function fetchMeWithRetry(): Promise<User | null> {
  const attempt = async () => {
    try {
      const res = await axiosInstance.get<AuthMeResponse>("/auth/me", {
        validateStatus: () => true,
      });

      if (res.status < 200 || res.status >= 300) {
        return null;
      }

      const data = res.data;

      if (data.success && data.authenticated && data.user) {
        return data.user;
      }

      return null;
    } catch (error) {
      return null;
    }
  };

  let user = await attempt();
  if (!user) {
    await new Promise((r) => setTimeout(r, 500));
    user = await attempt();
  }
  return user;
}

function GoogleCallbackPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;
    const redirectTo = searchParams.get("redirect") || "/product/catalog";

    void (async () => {
      const user = await fetchMeWithRetry();
      if (cancelled) return;

      if (user) {
        queryClient.setQueryData(["auth", "session"], {
          user,
          isGuest: false,
          isAuthenticated: true,
        });
        setStatus("success");
        if (user.emailVerified === false) {
          toast.info("Vui lòng kiểm tra email để xác minh tài khoản.");
        } else {
          toast.success("Đăng nhập thành công! Đang chuyển hướng...");
        }
        redirectTimer = setTimeout(() => router.push(redirectTo), 600);
        return;
      }

      setStatus("error");
      toast.error("Đăng nhập thất bại. Đang chuyển hướng...");
      redirectTimer = setTimeout(() => router.push("/auth/signin"), 2000);
    })();
    return () => {
      cancelled = true;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [router, searchParams, queryClient]);

  const StatusIcon = status === "success" ? Check : X;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        {status === "loading" && (
          <>
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="text-muted-foreground">Đang xử lý...</p>
          </>
        )}
        {(status === "success" || status === "error") && (
          <>
            <StatusIcon
              className={cn(
                "mx-auto mb-4 h-12 w-12",
                status === "success" ? "text-green-500" : "text-destructive",
              )}
            />
            <p className="text-muted-foreground">
              {status === "success" ? "Đăng nhập thành công!" : "Đăng nhập thất bại"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
        </div>
      }
    >
      <GoogleCallbackPageInner />
    </Suspense>
  );
}
