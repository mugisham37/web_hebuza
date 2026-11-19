"use client";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/client";
import { SessionProvider } from "@/lib/auth/session";
import { ToastProvider } from "@/components/atoms/toast";

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  return (
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <ToastProvider>{children}</ToastProvider>
        </SessionProvider>
      </QueryClientProvider>
  );
}
