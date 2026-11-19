"use client";
// Finance data layer (plan 05 §6, DoD #8): keys under ["finance", …], fetchers that carry Idempotency-Key and the
// step-up token, and the core hooks every lane shares. Lane hooks live in src/lib/finance/<lane>.ts.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toQuery } from "@/lib/api/query";
import { api, unwrap } from "@/lib/api/client";
import type { AuditEvent } from "@/lib/audit-event";
import type { ApprovalItem, ApprovalType, FinNote, FinSummary, FinanceSettingKey, SettingChange, SettingRow } from "@/shared/finance/types";

export const finKeys = {
  all: ["finance"] as const,
  summary: () => ["finance", "summary"] as const,
  approvals: (type?: ApprovalType) => ["finance", "approvals", type ?? "all"] as const,
  notes: () => ["finance", "notes"] as const,
  settings: () => ["finance", "settings"] as const,
  audit: (type: string, id: string) => ["finance", "audit", type, id] as const,
};

type Opts = { stepUp?: string; idempotencyKey?: string; reason?: string };
/** Step-up / idempotency / audit-reason headers for finance + procurement writes. */
export function hdr(o: Opts = {}) {
  const headers: Record<string, string> = {};
  if (o.stepUp) headers["X-Step-Up-Token"] = o.stepUp;
  if (o.idempotencyKey) headers["Idempotency-Key"] = o.idempotencyKey;
  if (o.reason) headers["X-Audit-Reason"] = encodeURIComponent(o.reason);
  return headers;
}
/** Mutations: pass one idempotencyKey per dialog instance (newIdempotencyKey() when the dialog opens), not per click. */

export const useFinSummary = () =>
  useQuery({ queryKey: finKeys.summary(), queryFn: () => unwrap<FinSummary>(api.GET("/api/finance/x/summary")), refetchInterval: 30_000 });
/** shortcut: realtime via 30 s polling on queues, upgrade to SSE when /api/realtime finance channel exists. */
export const useApprovals = (type?: ApprovalType) =>
  useQuery({
    queryKey: finKeys.approvals(type),
    queryFn: () => unwrap<{ items: ApprovalItem[] }>(api.GET("/api/finance/x/approvals", { params: { query: toQuery(type ? `?type=${type}` : "") } })),
    refetchInterval: 30_000,
  });
export const useFinNotes = () =>
  useQuery({ queryKey: finKeys.notes(), queryFn: () => unwrap<{ items: FinNote[] }>(api.GET("/api/finance/x/notifications")), refetchInterval: 60_000 });
export const useFinSettings = () =>
  useQuery({ queryKey: finKeys.settings(), queryFn: () => unwrap<{ items: SettingRow[]; changes: SettingChange[] }>(api.GET("/api/finance/settings")) });
/** Financial change history of one record (HistoryTab). */
export const useAudit = (resourceType: string, resourceId: string) =>
  useQuery({
    queryKey: finKeys.audit(resourceType, resourceId),
    queryFn: () => unwrap<{ items: AuditEvent[] }>(api.GET("/api/staff/audit", { params: { query: { resource_type: resourceType, resource_id: resourceId } } })),
  });

export function useProposeSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { key: FinanceSettingKey; value: unknown; effectiveAt: string; reason: string; idempotencyKey: string }) =>
      unwrap<SettingChange>(api.PATCH("/api/finance/settings", { body: v, headers: hdr({ idempotencyKey: v.idempotencyKey }) })),
    onSettled: () => qc.invalidateQueries({ queryKey: finKeys.all }),
  });
}
export function useDecideSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; decision: "approve" | "reject"; reason?: string; stepUp: string; idempotencyKey: string }) =>
      unwrap<SettingChange>(api.POST("/api/staff/settings/changes/{id}/decision", { params: { path: { id: v.id } }, body: { decision: v.decision, reason: v.reason }, headers: hdr(v) })),
    onSettled: () => qc.invalidateQueries({ queryKey: finKeys.all }),
  });
}
