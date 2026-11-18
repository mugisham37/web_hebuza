"use client";
// System data layer (plan 06 §9). Query keys + core hooks. Lanes add hooks in src/lib/system/<lane>.ts with keys under
// ["system", …] and invalidate sysKeys.all after mutations that change counts.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api, newIdempotencyKey, unwrap } from "@/lib/api/client";
import type { AlertVM, ChangeArea, ChangeRequestVM, SetupItem, SystemSummary } from "@/shared/system/types";
import { hdr } from "@/lib/ops/c";


export const sysKeys = {
  all: ["system"] as const,
  summary: () => ["system", "summary"] as const,
  alerts: () => ["system", "alerts"] as const,
  setup: () => ["system", "setup"] as const,
  changes: (area: ChangeArea | "all", state: "pending" | "decided") => ["system", "changes", area, state] as const,
  change: (id: string) => ["system", "change", id] as const,
};

/** Nav badges, banners, env pill. Polls 30 s (DoD "Stale"). */
export const useSystemSummary = () =>
  useQuery({ queryKey: sysKeys.summary(), queryFn: () => unwrap<SystemSummary>(api.GET("/api/staff/x/summary")), refetchInterval: 30_000 });
export const useAlerts = () =>
  useQuery({ queryKey: sysKeys.alerts(), queryFn: () => unwrap<{ items: AlertVM[] }>(api.GET("/api/staff/x/alerts")), refetchInterval: 60_000 });
export function useMarkAlerts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[] | "all") => unwrap<{ items: AlertVM[] }>(api.POST("/api/staff/x/alerts/read", { body: { ids } })),
    onSuccess: (d) => { qc.setQueryData(sysKeys.alerts(), d); qc.invalidateQueries({ queryKey: sysKeys.summary() }); },
  });
}
export const useSetup = () => useQuery({ queryKey: sysKeys.setup(), queryFn: () => unwrap<{ items: SetupItem[] }>(api.GET("/api/staff/x/setup")) });

/** Approvals inbox (U2). Polls 30 s. Executives get only kinds they approve (server-filtered). */
export const useChanges = (area: ChangeArea | "all" = "all", state: "pending" | "decided" = "pending") =>
  useQuery({
    queryKey: sysKeys.changes(area, state),
    queryFn: () => unwrap<{ items: ChangeRequestVM[] }>(api.GET("/api/staff/x/changes", { params: { query: { area: area, state: state } } })),
    refetchInterval: 30_000,
  });
export const useChange = (id: string | null) =>
  useQuery({ queryKey: sysKeys.change(id ?? ""), queryFn: () => unwrap<ChangeRequestVM>(api.GET("/api/staff/x/changes/{id}", { params: { path: { id: id! } } })), enabled: !!id });

/** Approve / reject with step-up + If-Match. 409 already_decided / stale and 410 expired surface as ApiError. */
export function useDecide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { cr: ChangeRequestVM; decision: "approve" | "reject"; reason?: string; token: string }) =>
      unwrap<ChangeRequestVM>(api.POST("/api/staff/x/changes/{id}/decision", { params: { path: { id: v.cr.id } }, body: { decision: v.decision, reason: v.reason }, headers: ifMatchHdr(v.cr.version, v.token) })),
    onSettled: () => qc.invalidateQueries({ queryKey: sysKeys.all }),
  });
}
export function useWithdraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<ChangeRequestVM>(api.POST("/api/staff/x/changes/{id}/withdraw", { params: { path: { id } }, headers: hdr({ idempotent: true }) })),
    onSettled: () => qc.invalidateQueries({ queryKey: sysKeys.all }),
  });
}

/** `send` plus `If-Match` (optimistic concurrency, §9.1) and step-up token. Always idempotent. */
/** If-Match (optimistic concurrency, §9.1) + step-up token; always idempotent. */
export function ifMatchHdr(version: number, stepUp?: string) {
  const headers: Record<string, string> = { "If-Match": String(version), "Idempotency-Key": newIdempotencyKey() };
  if (stepUp) headers["X-Step-Up-Token"] = stepUp;
  return headers;
}

/** errorType → which DoD state to render. */
export function errorState(e: unknown): "locked" | "conflict" | "expired" | "step_up" | "offline" | "error" {
  if (!(e instanceof ApiError)) return typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error";
  if (e.errorType === "content_locked" || e.errorType === "forbidden_role" || e.status === 403) return "locked";
  if (e.status === 409) return "conflict";
  if (e.status === 410) return "expired";
  if (e.errorType === "step_up_required") return "step_up";
  return "error";
}
