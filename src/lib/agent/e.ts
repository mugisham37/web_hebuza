"use client";
// Lane E data: U11 earnings/statements/payouts and U12 performance (/api/agent/x/*, server: agent.service.ts).
import { api, unwrap } from "@/lib/api/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MoneyState } from "./money";

export type EarnFilter =
  "pending" | "approved" | "scheduled" | "paid" | "deducted";
export type EarnRow = {
  id: string;
  ref: string;
  service: string;
  client: string;
  eligible: number;
  deducted: number;
  amount: number;
  state: MoneyState;
  at: string;
  approvedAt: string | null;
  approvedBy: string;
  /** One of Eric's cases (workbench exists). */
  mine: boolean;
  payout: { date: string; ref: string; status: "paid" | "pending" } | null;
  question: {
    id: string;
    ref: string;
    reason: string;
    status: "open" | "answered";
    at: string;
  } | null;
};
export type MonthBar = {
  month: string;
  paid: number;
  scheduled: number;
  pending: number;
  deducted: number;
};
export type Earnings = {
  month: string;
  sharePct: number;
  months: MonthBar[];
  rows: EarnRow[];
};
export type Statement = {
  month: string;
  total: number;
  status: "available" | "downloaded" | "generating";
};
export type Payout = {
  id: string;
  date: string;
  method: string;
  ref: string;
  amount: number;
  status: "paid" | "pending";
};
export type Payouts = {
  items: Payout[];
  method: { label: string; last4: string; verified: boolean };
};

export const SERIES = ["paid", "scheduled", "pending", "deducted"] as const;
export type Series = (typeof SERIES)[number];

/** Which table rows a filter (chip or tile) shows. "approved" is cumulative, matching its tile. */
export function matches(r: EarnRow, f: EarnFilter | null) {
  if (!f) return true;
  if (f === "pending")
    return ["allocated", "approved", "adjusted"].includes(r.state);
  if (f === "approved")
    return ["approved", "scheduled", "paid"].includes(r.state);
  return r.state === f;
}


const k = {
  earnings: (m: string) => ["agent", "earnings", m] as const,
  statements: () => ["agent", "statements"] as const,
  payouts: () => ["agent", "payouts"] as const,
  performance: (r: string) => ["agent", "performance", r] as const,
};

export const useEarnings = (month: string) =>
  useQuery({
    queryKey: k.earnings(month),
    queryFn: () =>
      unwrap<Earnings>(api.GET("/api/agent/x/earnings", { params: { query: month ? { month } : {} } })),
    placeholderData: (p) => p,
  });

export const useStatements = () =>
  useQuery({
    queryKey: k.statements(),
    queryFn: () => unwrap<Statement[]>(api.GET("/api/agent/x/statements")),
    refetchInterval: (q) =>
      q.state.data?.some((s) => s.status === "generating") ? 3000 : false,
  });

export const usePayouts = () =>
  useQuery({
    queryKey: k.payouts(),
    queryFn: () => unwrap<Payouts>(api.GET("/api/agent/x/payouts")),
  });

export function useQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...b
    }: {
      id: string;
      reason: string;
      note: string;
      file: string | null;
    }) => unwrap<EarnRow>(api.POST("/api/agent/x/allocations/{id}/question", { params: { path: { id } }, body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent", "earnings"] }),
  });
}

/** Fetch the statement file and hand it to the browser as a download. Marks it downloaded. */
export function useStatementDownload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (month: string) => {
      const r = await fetch(`/api/agent/x/statements/${month}/file`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error(String(r.status));
      const url = URL.createObjectURL(await r.blob());
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: `statement-${month}.pdf`,
      });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: k.statements() }),
  });
}

// ---------------------------------------------------------------- performance
export type Range = "30d" | "quarter" | "year";
export const RANGES: Range[] = ["30d", "quarter", "year"];
type Kpi = { you: number; median: number; spark: number[] };
export type Performance = {
  range: Range;
  completed: number;
  sla: number;
  kpis: Record<
    "completed" | "onTime" | "turnaround" | "rework" | "rating" | "complaints",
    Kpi
  >;
  trend: { end: string; you: number; median: number }[];
  services: {
    service: string;
    cases: number;
    onTime: number;
    turnaround: number;
    rework: number;
  }[];
  feedback: {
    id: string;
    client: string;
    rating: number;
    note: "clear" | "onTime" | "helpful" | "responsive";
    at: string;
  }[];
};
export const usePerformance = (range: Range) =>
  useQuery({
    queryKey: k.performance(range),
    queryFn: () => unwrap<Performance>(api.GET("/api/agent/x/performance", { params: { query: { range: range } } })),
    placeholderData: (p) => p,
  });

