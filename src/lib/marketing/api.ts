"use client";
// Marketing data layer (plan 10 §6.4): keys under ["mkt", …] and typed fetchers. Lane hooks live next to their UI
// (src/lib/marketing/<lane>.ts) and reuse get/post/patch/put/del from here.
import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import type { MktBadges, MktNote, Staff } from "@/shared/marketing/types";

export const mktKeys = {
  all: ["mkt"] as const,
  shell: () => ["mkt", "shell"] as const,
  notes: () => ["mkt", "notes"] as const,
  staff: () => ["mkt", "staff"] as const,
  cms: (...k: unknown[]) => ["mkt", "cms", ...k] as const,
  crm: (...k: unknown[]) => ["mkt", "crm", ...k] as const,
  cmp: (...k: unknown[]) => ["mkt", "cmp", ...k] as const,
  rpt: (...k: unknown[]) => ["mkt", "rpt", ...k] as const,
};

type Opts = { idempotencyKey?: string; reason?: string; ifMatch?: number };
/** Idempotency / audit-reason / If-Match headers for marketing writes. */
export function hdr(o: Opts = {}) {
  const headers: Record<string, string> = {};
  if (o.idempotencyKey) headers["Idempotency-Key"] = o.idempotencyKey;
  if (o.reason) headers["X-Audit-Reason"] = encodeURIComponent(o.reason);
  if (o.ifMatch != null) headers["If-Match"] = String(o.ifMatch);
  return headers;
}
/** `?a=1&b=x` from an object, skipping empty values. */
export const qs = (o: Record<string, string | number | boolean | undefined | null>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};

/** Badges update live from the `mkt.note` SSE frame (lib/realtime); slow polling stays as a fallback when the stream drops. */
export const useMktShell = () =>
  useQuery({ queryKey: mktKeys.shell(), queryFn: () => unwrap<{ badges: MktBadges; me: Staff | null; nextScheduled?: { label: string; at: string; href: string } }>(api.GET("/api/admin/mkt/shell")), refetchInterval: 5 * 60_000 });
export const useMktNotes = () =>
  useQuery({ queryKey: mktKeys.notes(), queryFn: () => unwrap<{ items: MktNote[] }>(api.GET("/api/admin/mkt/notifications")), refetchInterval: 5 * 60_000 });
export const useStaff = () =>
  useQuery({ queryKey: mktKeys.staff(), queryFn: () => unwrap<{ items: Staff[] }>(api.GET("/api/admin/mkt/staff")), staleTime: 5 * 60_000 });
