"use client";
// Stage 5 finance lane C hooks (U8–U10): payments, transfer proofs, manual confirm, reconciliation.
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { toQuery } from "@/lib/api/query";
import { finKeys } from "./api";
import type { MatchState, Method, Payment, PaymentState, Provider, StatementImport, StatementLine } from "@/shared/finance/types";
import { api, unwrap } from "@/lib/api/client";

// ---------------------------------------------------------------- view types (mirrored by handlers-finance-c.ts)
export type PayTab = "all" | "pending" | "verification" | "failed" | "expired" | "reversed" | "attention";
export const PAY_TABS: PayTab[] = ["all", "pending", "verification", "failed", "expired", "reversed", "attention"];
export type PaymentRow = {
  id: string; at: string; method: Method; ref?: string; clientName: string; invoiceNo: string; caseRef?: string;
  amount: number; fee?: number; state: PaymentState; verify?: Payment["verify"]; attention: boolean; duplicate?: boolean;
};
export type PaymentList = { items: PaymentRow[]; meta: { counts: Record<PayTab, number>; total: number; amount: number; fee: number; next: string | null } };
export type ProofCandidate = { lineId: string; importId: string; externalRef: string; amount: number; at: string; exactAmount: boolean; refFound: boolean };
export type PaymentDetail = {
  payment: Payment & { clientName: string };
  invoice: { no: string; total: number; balanceDue: number; amountPaid: number; status: string } | null;
  /** Received − balance due (negative = partial). */ diff: number;
  /** Part of the amount that becomes client credit if confirmed. */ over: number;
  candidates: ProofCandidate[]; returnAt?: string; lockUntil?: string; evidence?: string; evidenceHref?: string;
  impact: { invoiceNo: string; balanceAfter: number; allocation: boolean; paidOut: boolean };
};
export type InvoiceOption = { no: string; client: string; balance: number; caseRef?: string };

export type ProviderCard = { provider: Provider; lastImport?: { id: string; at: string; by: string }; pct: number | null; needs: number };
export type Lock = "open" | "closed" | "reopened";
export type DayCell = { day: string; lines: number; needs: number; lock: Lock };
export type ImportRow = StatementImport & { at: string; fileName: string };
export type Blocker = { lineId: string; ref: string; match: MatchState; importId: string };
export type ReconOverview = {
  providers: ProviderCard[]; days: DayCell[]; month: { month: string; state: Lock; blockers: number };
  selected: { provider: Provider; day: string; lock: Lock; lines: number; needs: number; difference: number; blockers: Blocker[]; importId?: string };
  imports: ImportRow[];
};
export type LineRow = StatementLine & {
  rev: number; payer?: string; day: string; locked: boolean; diff?: number; by?: { name: string; at: string };
  payment?: { id: string; invoiceNo: string; clientName: string; amount: number; state: PaymentState };
};
export type PlatformRow = { id: string; at: string; ref?: string; invoiceNo: string; clientName: string; amount: number; state: PaymentState };
export type ImportDetail = { import: ImportRow; lines: LineRow[]; platform: PlatformRow[]; totals: { statement: number; platform: number; difference: number }; counts: Record<MatchState, number> };
export type LineCandidate = { id: string; invoiceNo: string; clientName: string; amount: number; at: string; state: PaymentState; diff: number };
export type Mapping = Record<"external_ref" | "amount" | "fee" | "occurred_at", string>;
export type ImportRowIn = { externalRef: string; amount: number; fee: number; occurredAt: string; payer?: string };

// ---------------------------------------------------------------- keys
export const cKeys = {
  payments: (q: string) => [...finKeys.all, "payments", q] as const,
  payment: (id: string) => [...finKeys.all, "payment", id] as const,
  invoiceOptions: (q: string) => [...finKeys.all, "payments", "invoice-options", q] as const,
  recon: (provider: string, date: string) => [...finKeys.all, "recon", provider, date] as const,
  import: (id: string) => [...finKeys.all, "recon", "import", id] as const,
  candidates: (lineId: string) => [...finKeys.all, "recon", "candidates", lineId] as const,
  mapping: (provider: string) => [...finKeys.all, "recon", "mapping", provider] as const,
};

// ---------------------------------------------------------------- reads
export const usePayments = (qs: string) =>
  useQuery({ queryKey: cKeys.payments(qs), queryFn: () => unwrap<PaymentList>(api.GET("/api/finance/payments", { params: { query: toQuery(qs) } })), refetchInterval: 30_000 });
export const usePayment = (id: string | null) =>
  useQuery({ queryKey: cKeys.payment(id ?? ""), queryFn: () => unwrap<PaymentDetail>(api.GET("/api/finance/payments/{id}", { params: { path: { id: id! } } })), enabled: !!id, refetchInterval: 30_000 });
export const useInvoiceOptions = (q: string, enabled = true) =>
  useQuery({ queryKey: cKeys.invoiceOptions(q), queryFn: () => unwrap<{ items: InvoiceOption[] }>(api.GET("/api/finance/x/payments/invoice-options", { params: { query: { q: q } } })), enabled });
export const useReconOverview = (provider: string, date: string) =>
  useQuery({ queryKey: cKeys.recon(provider, date), queryFn: () => unwrap<ReconOverview>(api.GET("/api/finance/statements", { params: { query: { provider: provider, date: date } } })), refetchInterval: 60_000 });
export const useImportDetail = (id: string) =>
  useQuery({ queryKey: cKeys.import(id), queryFn: () => unwrap<ImportDetail>(api.GET("/api/finance/statements/{id}/lines", { params: { path: { id } } })) });
export const useLineCandidates = (lineId: string | null) =>
  useQuery({ queryKey: cKeys.candidates(lineId ?? ""), queryFn: () => unwrap<{ items: LineCandidate[] }>(api.GET("/api/finance/statements/lines/{id}/candidates", { params: { path: { id: lineId! } } })), enabled: !!lineId });
export const useMapping = (provider: string) =>
  useQuery({ queryKey: cKeys.mapping(provider), queryFn: () => unwrap<{ mapping: Mapping | null }>(api.GET("/api/finance/x/statements/mapping", { params: { query: { provider: provider } } })) });

/** DoD #2 stale rule: refetch before a money action when the data is older than 5 minutes. */
export async function fresh(q: UseQueryResult<unknown>) {
  if (Date.now() - q.dataUpdatedAt > 5 * 60_000) await q.refetch();
}

/** Any lane-C mutation: invalidates the whole finance tree (shell badges, overview) when it settles. */
export function useFinAction<V, T>(fn: (v: V) => Promise<T>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: finKeys.all }) });
}
