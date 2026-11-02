"use client";
import { useEnsureAnonymousSession } from "@/hooks/use-ensure-anonymous-session";

export function AnonymousSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEnsureAnonymousSession();
  return <>{children}</>;
}
