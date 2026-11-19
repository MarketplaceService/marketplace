"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { createQueryClient } from "@/lib/query-client";

const SHOW_QUERY_DEVTOOLS = process.env.NEXT_PUBLIC_QUERY_DEVTOOLS === "true";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {SHOW_QUERY_DEVTOOLS && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}
