"use client";
// Lane A data hooks (Today, Intake, All cases). Same pattern as api.ts: typed fetchers + TanStack Query + key invalidation.
import { useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { opsKeys, toCaseVM, type CaseVM } from "@/lib/ops/api";
import type { CaseFacts } from "@/shared/ops/transitions";
import type { CaseStatus } from "@/shared/domain/case-status";

const enc = encodeURIComponent;

export const aKeys = {
  needsYou: () => ["ops", "needs-you"] as const,
  events: (ref: string) => ["ops", "events", ref] as const,
  dupes: (ref: string) => ["ops", "dupes", ref] as const,
  views: () => ["ops", "views"] as const,
  pulse: () => ["ops", "pulse"] as const,
};

/** Facts the transition guards need, from a list row (bulk change). Pricing mode isn't on the list, so quote moves stay blocked. */
export const factsOf = (c: CaseVM): CaseFacts => ({
  status: c.status,
  previous: c.previous,
  missingItems: c.completeness ? c.completeness.total - c.completeness.done : 0,
  fee: c.amount,
  paid: c.payment === "paid",
  covered: c.payment === "covered",
  complete: !!c.completeness && c.completeness.done >= c.completeness.total,
  assigneeChosen: c.assignees.length > 0,
  deliverablesUploaded: c.deliverables,
});

export type NeedsYouItem = {
  id: string;
  kind: "review" | "reupload" | "declined" | "quote" | "dispute";
  ref: string;
  service: string;
  client: string;
  dueAt: string;
  agent: string | null;
};
export const useNeedsYou = () =>
  useQuery({
    queryKey: aKeys.needsYou(),
    queryFn: () => unwrap<{ items: NeedsYouItem[] }>(api.GET("/api/admin/ops/needs-you")),
    refetchInterval: 30_000,
  });

export type CaseEvent = {
  kind: string;
  code: string;
  actor: string;
  at: string;
  status?: CaseStatus;
};
export const useRecentEvents = (ref: string | null) =>
  useQuery({
    queryKey: aKeys.events(ref ?? ""),
    queryFn: () =>
      unwrap<{ events: CaseEvent[] }>(api.GET("/api/admin/applications/{code}/recent-events", { params: { path: { code: ref! } } })),
    enabled: !!ref,
  });

export type DupCard = {
  ref: string;
  status: CaseStatus;
  service: string;
  client: string;
  phone: string;
  submittedAt: string;
  amount: number | null;
  payment: string;
  documents: number;
};
export const useDuplicates = (ref: string | null) =>
  useQuery({
    queryKey: aKeys.dupes(ref ?? ""),
    queryFn: () =>
      unwrap<{ source: DupCard; match: DupCard | null }>(api.GET("/api/admin/applications/{code}/duplicates", { params: { path: { code: ref! } } })),
    enabled: !!ref,
  });

/** Polls the intake count; the page compares against what it is showing to raise the "N new" banner. */
export const useIntakePulse = () =>
  useQuery({
    queryKey: aKeys.pulse(),
    queryFn: () => unwrap<{ received: number }>(api.GET("/api/admin/ops/intake/pulse")),
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
  });

const useInvalidateCases = () => {
  const qc = useQueryClient();
  return (ref?: string) => {
    qc.invalidateQueries({ queryKey: ["ops", "cases"] });
    qc.invalidateQueries({ queryKey: opsKeys.today() });
    qc.invalidateQueries({ queryKey: aKeys.needsYou() });
    if (ref) {
      qc.invalidateQueries({ queryKey: opsKeys.case(ref) });
      qc.invalidateQueries({ queryKey: aKeys.events(ref) });
    }
  };
};

export const useResolveDuplicate = () => {
  const inv = useInvalidateCases();
  return useMutation({
    mutationFn: (v: {
      ref: string;
      action: "merge" | "dismiss" | "reject";
      into?: string;
    }) =>
      unwrap(api.POST("/api/admin/applications/{code}/duplicate", { params: { path: { code: v.ref } }, body: {
        action: v.action,
        into: v.into,
      } })),
    onSettled: (_d, _e, v) => inv(v.ref),
  });
};

/** Undo: restores each case's status from before the last change (server keeps the prior state). */
export const useRevert = () => {
  const inv = useInvalidateCases();
  return useMutation({
    mutationFn: (refs: string[]) =>
      Promise.allSettled(
        refs.map((r) => unwrap(api.POST("/api/admin/applications/{code}/revert", { params: { path: { code: r } } }))),
      ),
    onSettled: () => inv(),
  });
};

export const useNudge = () => {
  const inv = useInvalidateCases();
  return useMutation({
    mutationFn: (ref: string) =>
      unwrap<{ ref: string; to: string }>(api.POST("/api/admin/applications/{code}/nudge", { params: { path: { code: ref } } })),
    onSettled: (_d, _e, ref) => inv(ref),
  });
};

/** Bulk status change: one request per case, reporting which moved and which failed (partial failure). */
export const useBulkStatus = () => {
  const inv = useInvalidateCases();
  return useMutation({
    mutationFn: async (v: {
      refs: string[];
      status: CaseStatus;
      reason?: string;
    }) => {
      const res = await Promise.allSettled(
        v.refs.map((r) =>
          unwrap(api.POST("/api/admin/applications/{code}/status", { params: { path: { code: r } }, body: {
            status: v.status,
            reason: v.reason,
          } })),
        ),
      );
      return {
        moved: v.refs.filter((_, i) => res[i].status === "fulfilled"),
        failed: v.refs.filter((_, i) => res[i].status === "rejected"),
      };
    },
    onSettled: () => inv(),
  });
};

export type SavedView = {
  id: string;
  name: string;
  query: string;
  shared: boolean;
  isDefault: boolean;
};
export const useSavedViews = () =>
  useQuery({
    queryKey: aKeys.views(),
    queryFn: () => unwrap<{ views: SavedView[] }>(api.GET("/api/admin/ops/views")),
    staleTime: 60_000,
  });
export const useSaveView = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: Omit<SavedView, "id">) =>
      unwrap<SavedView>(api.POST("/api/admin/ops/views", { body: v })),
    onSettled: () => qc.invalidateQueries({ queryKey: aKeys.views() }),
  });
};
export const useDeleteView = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(api.DELETE("/api/admin/ops/views/{id}", { params: { path: { id: id } } })),
    onSettled: () => qc.invalidateQueries({ queryKey: aKeys.views() }),
  });
};

/** CSV text (RFC 4180 quoting; leading =,+,-,@ neutralised against spreadsheet formula injection). */
export function toCsv(
  header: string[],
  rows: (string | number | null)[][],
): string {
  const cell = (v: string | number | null) => {
    let s = v === null ? "" : String(v);
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}
export function downloadCsv(name: string, csv: string) {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv" })),
    download: `${name}.csv`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

// Wall clock for render without breaking purity: null on the server / first paint, then ticks every 30 s.
const tick = (fn: () => void) => {
  const id = setInterval(fn, 30_000);
  return () => clearInterval(id);
};
const nowSnap = () => Math.floor(Date.now() / 30_000) * 30_000;
export const useNow = () => useSyncExternalStore(tick, nowSnap, () => null);

/** Intake list without background refetch: new arrivals surface through the pulse banner instead of shifting rows under the cursor. */
export const useIntakeCases = () =>
  useQuery({
    queryKey: opsKeys.cases({ status: "received", frozen: true }),
    queryFn: async () => {
      const d = await unwrap<{ applications: Record<string, unknown>[]; total: number }>(api.GET("/api/admin/applications", { params: { query: { status: "received" } } }));
      return d.applications.map(toCaseVM);
    },
    staleTime: Infinity,
  });

// ---- All cases views (pure; unit-tested in a.test.ts)
export const CASE_VIEWS = ["mine", "overdue", "risk", "unassigned", "client", "institution", "review", "hold"] as const;
export type CaseView = (typeof CASE_VIEWS)[number];
export type SlaBucket = "breach" | "risk" | "ok" | "paused";
const TERMINAL = ["completed_delivered", "cancelled", "rejected", "refunded"];
const PAUSED = ["on_hold", "awaiting_client_documents", "awaiting_external_institution", "awaiting_quotation", "awaiting_payment"];

/** SLA bucket for filtering (wall clock, same rule as Today's overdue/at-risk tiles: paused statuses excluded, risk = due within 24h). */
export function slaBucket(x: Pick<CaseVM, "status" | "dueAt">, now: number): SlaBucket | null {
  if (!x.dueAt || TERMINAL.includes(x.status)) return null;
  if (PAUSED.includes(x.status)) return "paused";
  const left = Date.parse(x.dueAt) - now;
  return left < 0 ? "breach" : left <= 24 * 3600_000 ? "risk" : "ok";
}

export function inView(x: CaseVM, view: CaseView, now: number | null): boolean {
  const open = !TERMINAL.includes(x.status);
  switch (view) {
    case "mine":
      return open;
    case "overdue":
      return now !== null && slaBucket(x, now) === "breach";
    case "risk":
      return now !== null && slaBucket(x, now) === "risk";
    case "unassigned":
      return !x.assignees.length && ["under_review", "approved_assigned"].includes(x.status);
    case "client":
      return x.status === "awaiting_client_documents" || x.status === "awaiting_payment";
    case "institution":
      return x.status === "awaiting_external_institution";
    case "review":
      return x.status === "awaiting_internal_review";
    case "hold":
      return x.status === "on_hold";
  }
}
