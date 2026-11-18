"use client";
// Stage 6 system lane E hooks: U13 audit, U14 notifications (plan 06 §7, §9.3). Keys under ["system", "e", …].
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toQuery } from "@/lib/api/query";
import { sysKeys } from "./api";
import type { AuditEntryVM, BudgetVM, ChainReport, DeliveryVM, EventRuleVM, TemplateBody, TemplateVM } from "@/shared/system/types";
import type { Locale } from "@/shared/i18n/config";
import { api, unwrap } from "@/lib/api/client";
import { hdr } from "@/lib/ops/c";
import { ifMatchHdr } from "@/lib/system/api";

export type ChainSummary = { state: "verified" | "broken"; entries: number; hash: string; brokenAt?: string };
export type AuditPage = { items: AuditEntryVM[]; next: string | null; total: number; chain: ChainSummary };
export type SensitiveRes = { items: AuditEntryVM[]; unusual: { who: string; n: number; at: string } | null; threshold: number };
export type IntegrityRes = { report: ChainReport | null; entries: number; lastHash: string; from: string; to: string; notifiedAt: string | null };
export type ExportJob = { id: string; rows: number; sha256: string; format: "csv" | "pdf"; content: string };
export type TemplateRes = { template: TemplateVM; rev: number };
export type CostsRes = { budgets: BudgetVM[]; version: number };

const k = {
  audit: (qs: string) => ["system", "e", "audit", qs] as const,
  entry: (id: string) => ["system", "e", "entry", id] as const,
  sensitive: ["system", "e", "sensitive"] as const,
  integrity: ["system", "e", "integrity"] as const,
  rules: ["system", "e", "rules"] as const,
  templates: ["system", "e", "templates"] as const,
  template: (key: string) => ["system", "e", "template", key] as const,
  deliveries: (qs: string) => ["system", "e", "deliveries", qs] as const,
  costs: ["system", "e", "costs"] as const,
};
const N = "/api/staff/x/notifications";

// ---------------------------------------------------------------- U13 audit
/** Cursor-paginated, newest first. `qs` is the filter query string (no cursor). */
export const useAudit = (qs: string) =>
  useInfiniteQuery({
    queryKey: k.audit(qs),
    initialPageParam: "",
    queryFn: ({ pageParam }) => unwrap<AuditPage>(api.GET("/api/staff/audit", { params: { query: toQuery(`${qs}${pageParam ? `&cursor=${pageParam}` : ""}`) } })),
    getNextPageParam: (p) => p.next,
  });
export const useAuditEntry = (id: string | null) =>
  useQuery({ queryKey: k.entry(id ?? ""), queryFn: () => unwrap<AuditEntryVM>(api.GET("/api/staff/audit/entries/{id}", { params: { path: { id: id! } } })), enabled: !!id });
export const useVerifyEntry = () =>
  useMutation({ mutationFn: (id: string) => unwrap<{ ok: boolean }>(api.POST("/api/staff/audit/entries/{id}/verify", { params: { path: { id } } })) });
export const useExportAudit = () =>
  useMutation({ mutationFn: (v: { qs: string; format: "csv" | "pdf"; token: string }) => unwrap<ExportJob>(api.POST("/api/staff/audit/export", { params: { query: toQuery(v.qs) }, body: { format: v.format }, headers: hdr({ stepUp: v.token, idempotent: true }) })) });
export const useSensitive = () => useQuery({ queryKey: k.sensitive, queryFn: () => unwrap<SensitiveRes>(api.GET("/api/staff/audit/sensitive")) });
export const useIntegrity = () => useQuery({ queryKey: k.integrity, queryFn: () => unwrap<IntegrityRes>(api.GET("/api/staff/audit/integrity")) });
export function useVerifyChain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap<IntegrityRes>(api.POST("/api/staff/audit/integrity/verify")),
    onSuccess: (d) => { qc.setQueryData(k.integrity, d); qc.invalidateQueries({ queryKey: ["system", "e", "audit"] }); qc.invalidateQueries({ queryKey: sysKeys.summary() }); },
  });
}
export const fetchIntegrityReport = () => unwrap<{ content: string; sha256: string }>(api.GET("/api/staff/audit/integrity/report"));

// ---------------------------------------------------------------- U14 notifications
export const useRules = () => useQuery({ queryKey: k.rules, queryFn: () => unwrap<{ items: EventRuleVM[]; version: number }>(api.GET("/api/staff/x/notifications/rules")) });
export function useSaveRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { items: EventRuleVM[]; version: number }) => unwrap<{ items: EventRuleVM[]; version: number }>(api.PUT("/api/staff/x/notifications/rules", { body: { items: v.items }, headers: ifMatchHdr(v.version) })),
    onSuccess: (d) => qc.setQueryData(k.rules, d),
  });
}
export const useTemplates = () => useQuery({ queryKey: k.templates, queryFn: () => unwrap<{ items: TemplateVM[] }>(api.GET("/api/staff/x/notifications/templates")) });
export const useTemplate = (key: string) =>
  useQuery({ queryKey: k.template(key), queryFn: () => unwrap<TemplateRes>(api.GET("/api/staff/x/notifications/templates/{key}", { params: { path: { key: key } } })), refetchInterval: (q) => (q.state.data?.template.versions.at(-1)?.status === "pending_provider_approval" ? 2000 : false) });
export function useTemplateAction(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v:
      | { op: "save"; rev: number; languages: Record<Locale, TemplateBody | null>; category: TemplateVM["category"] }
      | { op: "submit" | "simulate-rejection" | "test"; rev: number }
      | { op: "retire"; rev: number; reason: string }) =>
      v.op === "save"
        ? unwrap<TemplateRes>(api.PUT("/api/staff/x/notifications/templates/{key}", { params: { path: { key } }, body: { languages: v.languages, category: v.category }, headers: ifMatchHdr(v.rev) }))
        : unwrap<TemplateRes>(api.POST("/api/staff/x/notifications/templates/{key}/{op}", { params: { path: { key, op: v.op } }, body: v.op === "retire" ? { reason: v.reason } : {}, headers: ifMatchHdr(v.rev) })),
    onSuccess: (d) => { qc.setQueryData(k.template(key), d); qc.invalidateQueries({ queryKey: k.templates }); },
  });
}
export const useDeliveries = (qs: string) => useQuery({ queryKey: k.deliveries(qs), queryFn: () => unwrap<{ items: DeliveryVM[] }>(api.GET("/api/staff/x/notifications/deliveries", { params: { query: toQuery(qs) } })) });
export const useCosts = () => useQuery({ queryKey: k.costs, queryFn: () => unwrap<CostsRes>(api.GET("/api/staff/x/notifications/costs")) });
export function useSaveBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { channel: BudgetVM["channel"]; budget: number; version: number; token: string }) =>
      unwrap<CostsRes>(api.PUT("/api/staff/x/notifications/costs/{channel}", { params: { path: { channel: v.channel } }, body: { budget: v.budget }, headers: ifMatchHdr(v.version, v.token) })),
    onSuccess: (d) => { qc.setQueryData(k.costs, d); qc.invalidateQueries({ queryKey: sysKeys.all }); },
  });
}

/** Save text as a file (export jobs, verification report). */
export function download(name: string, content: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
