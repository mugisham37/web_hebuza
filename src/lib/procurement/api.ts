"use client";
// Procurement data layer (plan 12 §6): keys under ["procure", …]; fetchers reuse the finance call() (Idempotency-Key,
// step-up token, audit reason). Lane hooks live in src/lib/procurement/<lane>.ts and invalidate procKeys.all on success.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toQuery } from "@/lib/api/query";

import type { AuditEvent } from "@/lib/audit-event";
import type { ApprovalLimits, ProcAlert, ProcApproval, ProcApprovalKind, ProcNote, ProcSettings, ProcSummary } from "@/shared/procurement/types";
import { api, unwrap } from "@/lib/api/client";
import { hdr } from "@/lib/finance/api";

export const procKeys = {
  all: ["procure"] as const,
  summary: () => ["procure", "summary"] as const,
  alerts: (h: number) => ["procure", "alerts", h] as const,
  notes: () => ["procure", "notes"] as const,
  approvals: (type?: string) => ["procure", "approvals", type ?? "all"] as const,
  settings: () => ["procure", "settings"] as const,
  audit: (kind: string, id: string) => ["procure", "audit", kind, id] as const,
};
/** Optional If-Match for conflict detection (§4). */
export type MutOpts = { stepUp?: string; idempotencyKey?: string; reason?: string };

export const useProcSummary = (enabled = true) =>
  useQuery({ queryKey: procKeys.summary(), queryFn: () => unwrap<ProcSummary>(api.GET("/api/procurement/summary")), refetchInterval: 30_000, enabled });
export const useProcAlerts = (horizon = 90) =>
  useQuery({ queryKey: procKeys.alerts(horizon), queryFn: () => unwrap<{ items: ProcAlert[] }>(api.GET("/api/procurement/alerts", { params: { query: { horizon: horizon } } })) });
export const useProcNotes = (enabled = true) =>
  useQuery({ queryKey: procKeys.notes(), queryFn: () => unwrap<{ items: ProcNote[] }>(api.GET("/api/procurement/notifications")), refetchInterval: 60_000, enabled });
/** shortcut: approval queues poll every 30 s, upgrade to SSE when a realtime channel exists. */
export const useProcApprovals = (type?: ProcApprovalKind) =>
  useQuery({
    queryKey: procKeys.approvals(type),
    queryFn: () => unwrap<{ items: ProcApproval[] }>(api.GET("/api/procurement/approvals", { params: { query: toQuery(type ? `?type=${type}` : "") } })),
    refetchInterval: 30_000,
  });
export const useProcSettings = () => useQuery({ queryKey: procKeys.settings(), queryFn: () => unwrap<ProcSettings>(api.GET("/api/procurement/settings")) });
export const useProcAudit = (kind: string, id: string) =>
  useQuery({ queryKey: procKeys.audit(kind, id), queryFn: () => unwrap<{ items: AuditEvent[] }>(api.GET("/api/procurement/audit", { params: { query: { kind: kind, id: id } } })) });

/** Generic procurement mutation: POST/PATCH then invalidate everything procurement (figures are cross-linked). */
export function useProcMutation<V extends { idempotencyKey?: string; stepUp?: string; reason?: string }, R = unknown>(
  fn: (v: V) => Promise<R>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => qc.invalidateQueries({ queryKey: procKeys.all }),
  });
}
export const useProposeSettings = () =>
  useProcMutation<{ limits?: Partial<ApprovalLimits>; budgets?: { code: string; annualBudget: number }[]; effectiveOn: string; reason: string; idempotencyKey: string }>((v) => unwrap(api.POST("/api/procurement/settings/proposals", { body: v, headers: hdr(v) })));
export const useDecideSettings = () =>
  useProcMutation<{ id: string; decision: "approve" | "reject"; reason?: string; stepUp: string; idempotencyKey: string }>((v) => unwrap(api.POST("/api/procurement/settings/proposals/{id}/decision", { params: { path: { id: v.id } }, body: ({ decision: v.decision, reason: v.reason }), headers: hdr(v) })));
