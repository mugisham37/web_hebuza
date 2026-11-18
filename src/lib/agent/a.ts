"use client";
// Lane A data + pure rules: Today (U3) and My cases (U5).
import { api, unwrap } from "@/lib/api/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agentKeys, type AgentCaseVM } from "./api";
import { groupOf, type WorkGroup } from "@/shared/agent/core";
import type { EventKind } from "@/components/atoms/agent";

export type StripOffer = {
  id: string;
  ref: string;
  service: string;
  client: string;
  expiresAt: string;
  dueAt: string;
  eligible: number;
  share: number;
};
export const useStripOffers = (enabled = true) =>
  useQuery({
    queryKey: [...agentKeys.offers(), "strip"],
    queryFn: async () =>
      (
        await unwrap<{ offers: StripOffer[] }>(api.GET("/api/agent/x/offers", { params: { query: { status: "pending", view: "strip" } } }))
      ).offers,
    refetchInterval: 15_000,
    enabled,
  });

/** Real CalendarResponse item; label.type = deadline | appointment | field | obligation. */
export type CalItem = {
  kind: "case" | "obligation";
  id: string;
  code?: string | null;
  title: string;
  label?: Record<string, string> | null;
  serviceName: string;
  clientName?: string | null;
  dueDate: string;
  dueAt?: string | null;
  state: string;
  note?: string | null;
};
export const eventKind = (i: CalItem): EventKind =>
  (i.label?.type as EventKind | undefined) ??
  (i.kind === "obligation" ? "obligation" : "deadline");

export const useCalendar = () =>
  useQuery({
    queryKey: ["agent", "calendar"],
    queryFn: () =>
      unwrap<{ today: string; items: CalItem[] }>(api.GET("/api/agent/calendar")),
  });

export type Metrics = {
  completedCount: number;
  onTimeSLAPercent: number;
  clientRating: number;
  ratingsCount: number;
  weeklyBars: { week: string; count: number }[];
};
export const useMetrics = () =>
  useQuery({
    queryKey: ["agent", "metrics"],
    queryFn: () => unwrap<Metrics>(api.GET("/api/agent/metrics")),
  });


// ---------------------------------------------------------------- My cases views (U5)
export const CASE_VIEWS = [
  "all",
  "overdue",
  "today",
  "client",
  "institution",
  "review",
  "completed",
] as const;
export type CaseView = (typeof CASE_VIEWS)[number];
const CLOSED = ["completed_delivered", "cancelled", "rejected", "refunded"];
const groupOrNull = (c: AgentCaseVM, now: number): WorkGroup | null =>
  c.dueAt ? groupOf({ status: c.status, dueAt: c.dueAt }, now) : null;

export function inCaseView(
  view: CaseView,
  c: AgentCaseVM,
  now: number,
): boolean {
  const closed = CLOSED.includes(c.status);
  if (view === "completed") return closed;
  if (closed) return false;
  return view === "all" || groupOrNull(c, now) === view;
}

/** Today "My work" groups, in board order; closed cases and "later" are left out. */
export const TODAY_GROUPS = [
  "overdue",
  "today",
  "week",
  "client",
  "institution",
  "review",
] as const;
export function workGroups(cases: AgentCaseVM[], now: number) {
  const out = new Map<WorkGroup, AgentCaseVM[]>(
    TODAY_GROUPS.map((g) => [g, []]),
  );
  for (const c of cases) {
    if (CLOSED.includes(c.status)) continue;
    const g = groupOrNull(c, now);
    if (g) out.get(g)?.push(c);
  }
  for (const rows of out.values())
    rows.sort((a, b) => Date.parse(a.dueAt ?? "") - Date.parse(b.dueAt ?? ""));
  return out;
}
