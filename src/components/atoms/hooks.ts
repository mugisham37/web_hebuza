"use client";
// Domain-neutral client hooks shared across workspaces.
import { useSyncExternalStore } from "react";
import { ApiError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/provider";
import { formatMoney } from "@/shared/format";

const subscribeOnline = (fn: () => void) => {
  window.addEventListener("online", fn);
  window.addEventListener("offline", fn);
  return () => {
    window.removeEventListener("online", fn);
    window.removeEventListener("offline", fn);
  };
};
/** navigator.onLine as a store (true on the server). */
export const useOnline = () =>
  useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );

/** RWF amount → localized text. */
export const useMoney = () => {
  const { locale } = useI18n();
  return (n: number) => formatMoney(n, "RWF", locale);
};

export const errType = (e: unknown) => (e instanceof ApiError ? e.errorType : null);
export const isForbidden = (e: unknown) => e instanceof ApiError && e.status === 403;
