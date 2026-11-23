"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "./use-auth";
import { useEffect, useRef } from "react";
import { getAuthClient } from "@/lib/auth/auth-client";
import type { AuthSession } from "@/types/hook.types";

const COOLDOWN_MS = 60_000;
const STORAGE_KEY = "anonymous-signin-cooldown-until";

function isInCooldown(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  const until = Number(sessionStorage.getItem(STORAGE_KEY) ?? "0");
  return until > Date.now();
}

function setCooldown(ms = COOLDOWN_MS): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, String(Date.now() + ms));
}

function isRateLimitedError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;

  const status =
    (err as { status?: number }).status ??
    (err as { response?: { status?: number } }).response?.status;

  return status === 429;
}

export function useEnsureAnonymousSession() {
  const { data: session, isLoading } = useAuthSession();
  const queryClient = useQueryClient();
  const signingInRef = useRef(false);

  // Khi người dùng mới điều hướng vào trang khách vãng lai (vd: từ /auth/signin về /),
  // gỡ cờ skipAnonymous để khách có thể khởi tạo lại phiên ẩn danh
  useEffect(() => {
    queryClient.setQueryData<AuthSession | undefined>(
      ["auth", "session"],
      (prev) => (prev?.skipAnonymous ? { ...prev, skipAnonymous: false } : prev),
    );
  }, [queryClient]);

  useEffect(() => {
    if (isLoading || signingInRef.current) return;
    if (session?.isAuthenticated || session?.skipAnonymous) return;
    if (isInCooldown()) return;

    signingInRef.current = true;

    void getAuthClient()
      .signIn.anonymous()
      .then(() => {
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem(STORAGE_KEY);
        }

        void queryClient.invalidateQueries({
          queryKey: ["auth", "session"],
        });
      })
      .catch((err: unknown) => {
        if (isRateLimitedError(err)) {
          setCooldown();
        }

        console.error("[auth] Anonymous sign-in failed:", err);
      })
      .finally(() => {
        signingInRef.current = false;
      });
  }, [isLoading, session?.isAuthenticated, session?.skipAnonymous, queryClient]);
}
