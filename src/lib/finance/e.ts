"use client";
// Stage 5 finance lane E hooks (U13 Revenue, U14 Payouts). Keys under ["finance", …]; every mutation carries one
// Idempotency-Key per dialog and invalidates finKeys.all so shell badges refresh.
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { toQuery } from "@/lib/api/query";
import { finKeys } from "./api";
import type {
  Adjustment, AgentFee, Allocation, Bps, PayoutBatch, PayoutLine, Rule, Rwf, Share, Step, ExportFile,
} from "@/shared/finance/types";
import { api, unwrap, type ApiCall } from "@/lib/api/client";
import { hdr } from "@/lib/finance/api";

// ---------------------------------------------------------------- view models (handlers-finance-e.ts builds them)
export type Who = { id: string; name: string; kind: "internal" | "external" | "field" };
export type Five = { invoiced: Rwf; collected: Rwf; allocated: Rwf; approved: Rwf; paid: Rwf };
export type LastChange = { by: string; at: string };
export type AllocView = Omit<Allocation, "shares"> & {
  serviceName: string; clientName: string; completedAt: string; shares: (Share & { name: string })[];
  rule: { scope: Rule["scope"]; from: string; to?: string }; credits: Rwf; five: Five; rev: number; last?: LastChange;
  can: { approve: boolean; query: boolean; hold: boolean; void: boolean; answer: boolean };
  waitingFor?: string;
};
export type AllocTiles = Record<"pending_review" | "reviewed" | "approved_for_payment" | "paid", { amount: Rwf; n: number }>;
export type RuleView = Rule & { label: string; agentName?: string; serviceName?: string; chain: Step[]; can: { approve: boolean; end: boolean } };
export type AdjView = Adjustment & { workerName: string; caseRef?: string; chain: Step[]; createdBy: { id: string; name: string }; at: string; can: { approve: boolean } };
export type FeeView = AgentFee & { workerName: string };
export type LineView = PayoutLine & {
  name: string; kind: "internal" | "external"; taxable: Rwf; carriedIn: Rwf;
  parts: { allocations: { id: string; caseRef: string; amount: Rwf }[]; adjustments: { id: string; amount: Rwf; reason: string }[]; fees: { id: string; month: string; amount: Rwf }[] };
  failReason?: string; paidAt?: string;
};
export type Totals = PayoutBatch["totals"];
export type BatchView = Omit<PayoutBatch, "lines"> & {
  lines: LineView[]; chain: Step[]; agents: number; rev: number; last?: LastChange;
  vsLast: { net: Rwf; pct: number } | null; rejectNote?: string; statements?: "running" | "ready";
  can: { submit: boolean; authorise: boolean; reject: boolean; execute: boolean; mark: boolean; close: boolean; exclude: boolean; export: boolean };
  whyNot?: "preparer" | "role" | "status";
};
export type Preview = {
  no: string; period: string; exists: string | null; lines: LineView[]; totals: Totals;
  blockers: { workerId: string; name: string; kind: "unverified" | "cooling"; until?: string }[];
};

// ---------------------------------------------------------------- keys
export const eKeys = {
  allocations: (q: string) => ["finance", "revenue", "allocations", q] as const,
  rules: () => ["finance", "revenue", "rules"] as const,
  rulePreview: (q: string) => ["finance", "revenue", "rules", "preview", q] as const,
  adjustments: () => ["finance", "revenue", "adjustments"] as const,
  fees: () => ["finance", "revenue", "fees"] as const,
  workers: () => ["finance", "revenue", "workers"] as const,
  batches: () => ["finance", "payouts", "batches"] as const,
  batch: (no: string) => ["finance", "payouts", "batch", no] as const,
  preview: (q: string) => ["finance", "payouts", "preview", q] as const,
};

const qs = (o: Record<string, string | null | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const useAllocations = (f: { state?: string | null; agent?: string | null; period?: string | null }) => {
  const q = qs(f);
  return useQuery({
    queryKey: eKeys.allocations(q),
    queryFn: () => unwrap<{ items: AllocView[]; meta: { tiles: AllocTiles; periods: string[]; agents: { id: string; name: string }[] } }>(api.GET("/api/finance/revenue/allocations", { params: { query: toQuery(q) } })),
    refetchInterval: 30_000,
  });
};
export const useRules = () =>
  useQuery({ queryKey: eKeys.rules(), queryFn: () => unwrap<{ items: RuleView[]; defaultBps: Bps; services: { slug: string; name: string }[]; agents: { id: string; name: string }[] }>(api.GET("/api/finance/revenue/rules")) });
export const useRulePreview = (p: { scope: string; agentId?: string; serviceSlug?: string; contractId?: string; pct: number; from: string }, enabled: boolean) => {
  const q = qs({ scope: p.scope, agentId: p.agentId, serviceSlug: p.serviceSlug, contractId: p.contractId, pct: String(p.pct), from: p.from });
  return useQuery({
    queryKey: eKeys.rulePreview(q), enabled,
    queryFn: () => unwrap<{ affected: number; overlap: boolean; retroactive: boolean; current: { pct: Bps; label: string }; needsExec: boolean; example: { eligible: Rwf; pool: Rwf; hebuza: Rwf } }>(api.GET("/api/finance/revenue/rules/preview", { params: { query: toQuery(q) } })),
  });
};
export const useAdjustments = () =>
  useQuery({ queryKey: eKeys.adjustments(), queryFn: () => unwrap<{ items: AdjView[]; workers: Who[] }>(api.GET("/api/finance/revenue/adjustments")) });
export const useFees = () =>
  useQuery({ queryKey: eKeys.fees(), queryFn: () => unwrap<{ items: FeeView[]; workers: Who[]; monthly: Rwf }>(api.GET("/api/finance/revenue/fees")) });
export const useBatches = () =>
  useQuery({ queryKey: eKeys.batches(), queryFn: () => unwrap<{ items: BatchView[]; payoutDay: number }>(api.GET("/api/finance/payouts/batches")), refetchInterval: 30_000 });
export const useBatch = (no: string) =>
  useQuery({ queryKey: eKeys.batch(no), queryFn: () => unwrap<BatchView>(api.GET("/api/finance/payouts/batches/{no}", { params: { path: { no: no } } })), refetchInterval: 30_000 });
export const usePreview = (period: string, run: number, excluded: string[]) => {
  const q = qs({ period, run: String(run), excluded: excluded.join(",") || null });
  return useQuery({ queryKey: eKeys.preview(q), enabled: !!period, queryFn: () => unwrap<Preview>(api.GET("/api/finance/payouts/preview", { params: { query: toQuery(q) } })) });
};

/** One generic finance mutation for this lane: POST/PATCH path with body, idempotency key and optional step-up. */
export function useFinAct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { req: ApiCall; idempotencyKey: string; stepUp?: string; reason?: string }) =>
      unwrap<unknown>(v.req(hdr({ idempotencyKey: v.idempotencyKey, stepUp: v.stepUp, reason: v.reason }))),
    onSettled: () => qc.invalidateQueries({ queryKey: finKeys.all }),
  });
}

/** DoD #2 stale: refetch before a money action when the data is older than 5 minutes. */
export async function ensureFresh(q: Pick<UseQueryResult, "dataUpdatedAt" | "refetch">) {
  if (Date.now() - q.dataUpdatedAt > 5 * 60_000) await q.refetch();
}

export type { ExportFile };
