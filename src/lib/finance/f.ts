"use client";
// Stage 5 finance lane F hooks (U17 Settings). Owned by lane F. Build on get/post/patch/finKeys from ./api.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toQuery } from "@/lib/api/query";
import { finKeys } from "./api";
import { formatMoney, formatNumber } from "@/shared/format";
import type { Locale } from "@/shared/i18n/config";
import type { ExportJob, FinanceSettingKey, UserRef } from "@/shared/finance/types";
import { api, unwrap } from "@/lib/api/client";
import { hdr } from "@/lib/finance/api";

export type LocalChange = {
  id: string; area: "numbering" | "policy"; key: string; old: unknown; next: unknown; effectiveAt: string;
  status: "proposed" | "approved" | "applied" | "rejected"; proposedBy: UserRef; approvedBy?: UserRef; reason: string; at: string;
};
export type NumberingRow = { series: string; prefix: string; reset: "yearly" | "monthly"; next: string | null; last: string | null };
export type FinAccount = {
  id: string; name: string; method: "bank" | "mtn_momo" | "airtel_money"; masked: string; status: "pending_callback" | "verified";
  addedBy: UserRef; verifiedBy?: UserRef; payoutLockedUntil?: string;
};
export type HistoryRow = {
  id: string; at: string; actor: string; action: string; kind: string; record: string; field: string | null; before: unknown; after: unknown; reason: string | null;
};
export type Policies = { refundPolicy: Record<string, number>; reminderOffsets: number[]; changes: LocalChange[] };

export const fKeys = {
  numbering: () => [...finKeys.all, "settings", "numbering"] as const,
  policies: () => [...finKeys.all, "settings", "policies"] as const,
  accounts: () => [...finKeys.all, "settings", "accounts"] as const,
  history: (qs: string) => [...finKeys.all, "settings", "history", qs] as const,
};

export const useNumbering = () =>
  useQuery({ queryKey: fKeys.numbering(), queryFn: () => unwrap<{ items: NumberingRow[]; changes: LocalChange[] }>(api.GET("/api/finance/x/settings/numbering")) });
export const usePolicies = () => useQuery({ queryKey: fKeys.policies(), queryFn: () => unwrap<Policies>(api.GET("/api/finance/x/settings/policies")) });
export const useAccounts = () => useQuery({ queryKey: fKeys.accounts(), queryFn: () => unwrap<{ items: FinAccount[] }>(api.GET("/api/finance/x/settings/accounts")) });
export const useHistory = (qs: string) =>
  useQuery({
    queryKey: fKeys.history(qs),
    queryFn: () => unwrap<{ items: HistoryRow[]; meta: { total: number; page: number; pageSize: number } }>(api.GET("/api/finance/x/settings/history", { params: { query: toQuery(qs) } })),
    placeholderData: (prev) => prev,
  });

function useInvalidating<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: finKeys.all }) });
}
export const useProposeLocal = () =>
  useInvalidating((v: { area: LocalChange["area"]; key: string; next: unknown; effectiveAt: string; reason: string; idempotencyKey: string }) =>
    unwrap<LocalChange>(api.POST("/api/finance/x/settings/changes", { body: v, headers: hdr({ idempotencyKey: v.idempotencyKey }) })));
export const useDecideLocal = () =>
  useInvalidating((v: { id: string; decision: "approve" | "reject"; reason?: string; stepUp: string; idempotencyKey: string }) =>
    unwrap<LocalChange>(api.POST("/api/finance/x/settings/changes/{id}/decision", { params: { path: { id: v.id } }, body: { decision: v.decision, reason: v.reason }, headers: hdr(v) })));
export const useAddAccount = () =>
  useInvalidating((v: { name: string; method: FinAccount["method"]; number: string; stepUp: string; idempotencyKey: string }) =>
    unwrap<FinAccount>(api.POST("/api/finance/x/settings/accounts", { body: { name: v.name, method: v.method, number: v.number }, headers: hdr(v) })));
export const useConfirmCallback = () =>
  useInvalidating((v: { id: string; idempotencyKey: string }) => unwrap<FinAccount>(api.POST("/api/finance/x/settings/accounts/{id}/callback", { params: { path: { id: v.id } }, headers: hdr(v) })));
export const revealAccount = (id: string, stepUp: string) => unwrap<{ number: string }>(api.POST("/api/finance/x/settings/accounts/{id}/reveal", { params: { path: { id } }, headers: hdr({ stepUp }) }));
export const exportHistory = (qs: string) => unwrap<ExportJob>(api.POST("/api/finance/x/settings/history/export", { params: { query: toQuery(qs) } }));

// ---- value display / parsing per key (rates in bps, money integer RWF)
export type ValueKind = "bool" | "pct" | "money" | "days" | "day" | "text";
const KIND: Record<FinanceSettingKey, ValueKind> = {
  vat_registered: "bool", vat_bps: "pct", hebuza_tin: "text", invoice_terms_days: "days", quote_validity_days: "days",
  deposit_threshold: "money", deposit_bps: "pct", manual_confirm_threshold: "money", manual_confirm_exec: "money",
  refund_exec_limit: "money", wht_bps: "pct", payout_day: "day", quote_approval_threshold: "money", licence_fee_monthly: "money",
};
export const kindOf = (k: FinanceSettingKey): ValueKind => KIND[k];
export const pct = (bps: number, l: Locale) => `${formatNumber(bps / 100, l)}%`;
/** Display string; `null` text marks an unset PLACEHOLDER value. */
export function showValue(k: FinanceSettingKey, v: unknown, l: Locale, u: { days: string; dayOfMonth: string; yes: string; no: string; placeholder: string }): string {
  if (typeof v === "string" && v.startsWith("PLACEHOLDER")) return u.placeholder;
  switch (KIND[k]) {
    case "bool": return v ? u.yes : u.no;
    case "pct": return pct(Number(v), l);
    case "money": return formatMoney(Number(v), "RWF", l);
    case "days": return u.days.replace("{n}", String(v));
    case "day": return u.dayOfMonth.replace("{n}", String(v));
    default: return String(v ?? "—");
  }
}
/** Form string → API value; `undefined` when invalid. Percent → bps (integer). */
export function parseValue(k: FinanceSettingKey, s: string): unknown {
  const t = s.trim();
  switch (KIND[k]) {
    case "bool": return t === "true";
    case "pct": { const n = Number(t); return t && Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 100) : undefined; }
    case "money": { const n = Number(t.replace(/[\s,]/g, "")); return t && Number.isInteger(n) && n >= 0 ? n : undefined; }
    case "days": { const n = Number(t); return Number.isInteger(n) && n >= 1 && n <= 365 ? n : undefined; }
    case "day": { const n = Number(t); return Number.isInteger(n) && n >= 1 && n <= 28 ? n : undefined; }
    default: return t || undefined;
  }
}
/** Form default: bps shown as percent. */
export const editValue = (k: FinanceSettingKey, v: unknown) =>
  typeof v === "string" && v.startsWith("PLACEHOLDER") ? "" : KIND[k] === "pct" ? String(Number(v) / 100) : String(v ?? "");
export const parseOffsets = (s: string) => {
  const xs = s.split(",").map((x) => x.trim()).filter(Boolean).map(Number);
  return xs.length && xs.every(Number.isInteger) ? [...new Set(xs)].sort((a, b) => a - b) : undefined;
};
/** Numbering preview with a new prefix (same shape as numbering.ts formatNo). */
export const previewNo = (prefix: string, year: number) => `${prefix || "•••"}-${year}-00001`;
