"use client";
// Stage 5 finance lane A hooks: U3 Overview, U4 Approvals (bulk allocations), U16 Reports + accounting export.
// Every figure comes from the mock/API (finance-world sums with lib/finance/money.ts); components only display.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toQuery } from "@/lib/api/query";
import { finKeys } from "./api";
import type { Bucket } from "@/shared/finance/ageing";
import type { Account } from "@/shared/finance/journal";
import type { ExportJob, ReportResult, Rwf } from "@/shared/finance/types";
import { api, unwrap } from "@/lib/api/client";
import { hdr } from "@/lib/finance/api";

export const aKeys = {
  overview: (date: string) => ["finance", "a", "overview", date] as const,
  cash: () => ["finance", "a", "cash"] as const,
  payables: () => ["finance", "a", "payables"] as const,
  catalog: () => ["finance", "a", "reports"] as const,
  report: (key: string, qs: string) => ["finance", "a", "report", key, qs] as const,
  drill: (key: string, qs: string) => ["finance", "a", "drill", key, qs] as const,
  job: (id: string) => ["finance", "a", "job", id] as const,
};

// ---------------------------------------------------------------- U3 overview
export type QueueKey = "proofs" | "pending_momo" | "allocations" | "unmatched" | "refunds" | "overdue";
export type Overview = {
  date: string; execOnly: boolean; quiet: boolean;
  tiles: {
    collected: { total: Rwf; count: number; spark: number[]; delta: number | null; href: string };
    pending: { total: Rwf; count: number; href: string };
    unreconciled: { total: Rwf; count: number; hasImport: boolean; href: string };
    refunds: { total: Rwf; count: number; href: string };
    allocations: { total: Rwf; count: number; href: string };
  };
  nextPayout: { date: string; projectedNet: Rwf; agents: number };
  ageing: Record<Bucket, Rwf>; receivables: Rwf; currentPct: number;
  renewals: { due7: number; pastDue: number };
  queues: { key: QueueKey; n: number; href: string }[];
};
export type CashPosition = { asOf: string | null; accounts: { provider: string; balance: Rwf }[]; total: Rwf };

export const useOverview = (date: string) =>
  useQuery({ queryKey: aKeys.overview(date), queryFn: () => unwrap<Overview>(api.GET("/api/finance/x/overview", { params: { query: toQuery(date ? `?date=${date}` : "") } })), refetchInterval: 30_000 });
export const useCashPosition = () => useQuery({ queryKey: aKeys.cash(), queryFn: () => unwrap<CashPosition>(api.GET("/api/finance/x/cash-position")), retry: false });
export const usePayablesDue = () =>
  useQuery({ queryKey: aKeys.payables(), queryFn: () => unwrap<{ total: Rwf; count: number }>(api.GET("/api/finance/x/payables-due")) });

// ---------------------------------------------------------------- U4 approvals: bulk allocations (no step-up: rev.allocations.adjust ∉ STEP_UP)
export function useBulkApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { ids: string[]; idempotencyKey: string }) =>
      unwrap<{ approved: string[]; total: Rwf }>(api.POST("/api/finance/revenue/allocations/bulk-approve", { body: { ids: v.ids }, headers: hdr({ idempotencyKey: v.idempotencyKey }) })),
    onSettled: () => qc.invalidateQueries({ queryKey: finKeys.all }),
  });
}
/** Server-side total of the selection (no maths in components). */
export const bulkPreview = (ids: string[]) =>
  unwrap<{ count: number; total: Rwf }>(api.POST("/api/finance/revenue/allocations/bulk-approve", { body: { ids, preview: true } }));

// ---------------------------------------------------------------- U16 reports
export const REPORT_KEYS = [
  "fin.revenue", "fin.collections", "fin.receivables_ageing", "fin.reconciliation", "fin.refunds_credit_notes", "fin.revenue_share",
  "fin.revenue_reconciliation", "fin.vat", "fin.wht_payable", "fin.cash_flow", "fin.subscriptions", "fin.payables_ageing",
] as const;
export type ReportKey = (typeof REPORT_KEYS)[number];
export const isReportKey = (k: string): k is ReportKey => (REPORT_KEYS as readonly string[]).includes(k);
export type ColKind = "money" | "count" | "pct";
export type ReportCol = { key: string; kind: ColKind; drill: boolean };
export type ReportRow = { key: string; label: string; values: Record<string, number> };
export type ReportData = ReportResult<ReportRow> & {
  key: ReportKey; columns: ReportCol[]; groups: string[]; group: string; total: Record<string, number>;
  five?: { invoiced: Rwf; collected: Rwf; allocated: Rwf; approved: Rwf; paid: Rwf };
  empty: "no_import" | "stage12" | null;
};
export type DrillItem = { ref: string; href: string; date: string; party: string; state?: string; value: number };
export type CatalogItem = { key: ReportKey; lastRun: string | null };

export const useCatalog = () => useQuery({ queryKey: aKeys.catalog(), queryFn: () => unwrap<{ items: CatalogItem[] }>(api.GET("/api/reports/catalog")) });
export const useReport = (key: string, qs: string) =>
  useQuery({ queryKey: aKeys.report(key, qs), queryFn: () => unwrap<ReportData>(api.GET("/api/reports/{key}", { params: { path: { key }, query: toQuery(qs) } })), enabled: isReportKey(key) });
export const useDrill = (key: string, qs: string, on: boolean) =>
  useQuery({ queryKey: aKeys.drill(key, qs), queryFn: () => unwrap<{ items: DrillItem[]; total: number }>(api.GET("/api/reports/{key}/drill", { params: { path: { key }, query: toQuery(qs) } })), enabled: on });

/** Report export → background job, polled until ready/failed (F-RPT-04). */
export function useExportJob(id: string | null) {
  return useQuery({
    queryKey: aKeys.job(id ?? ""),
    queryFn: () => unwrap<ExportJob>(api.GET("/api/reports/exports/{id}", { params: { path: { id: id! } } })),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data && ["ready", "failed", "expired"].includes(q.state.data.status) ? false : 800),
  });
}
export const startExport = (key: string, format: "pdf" | "csv" | "xlsx", filters: Record<string, string>, idempotencyKey: string) =>
  unwrap<ExportJob>(api.POST("/api/reports/{key}/export", { params: { path: { key } }, body: { format, filters }, headers: hdr({ idempotencyKey }) }));

// ---------------------------------------------------------------- accounting export (journal)
export const JOURNAL_FORMATS = ["generic_csv", "quickbooks", "xero", "odoo"] as const;
export type JournalFormat = (typeof JOURNAL_FORMATS)[number];
export type JournalPreview = {
  count: number; debits: Rwf; credits: Rwf; balanced: boolean;
  byAccount: { account: Account; code: string; debit: Rwf; credit: Rwf }[];
  sample: { ref: string; date: string; account: Account; code: string; debit: Rwf; credit: Rwf }[];
};
export type JournalBody = { from: string; to: string; format: JournalFormat; map: Record<Account, string> };
export const journalPreview = (b: JournalBody) => unwrap<JournalPreview>(api.POST("/api/finance/exports/journal/preview", { body: b }));
export const journalExport = (b: JournalBody, stepUp: string, idempotencyKey: string) =>
  unwrap<ExportJob & { checksum: string; name: string }>(api.POST("/api/finance/exports/journal", { body: b, headers: hdr({ stepUp, idempotencyKey }) }));
