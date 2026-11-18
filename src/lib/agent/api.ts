"use client";
// Agent data layer (plan §6). Real /api/agent/* contracts first; `x_agent` carries mock-only extensions and
// /api/agent/x/* covers endpoints the backend doesn't have yet. Lanes add hooks in src/lib/agent/<lane>.ts.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { normalizeStatus, type CaseStatus } from "@/shared/domain/case-status";

export const agentKeys = {
  all: ["agent"] as const,
  summary: () => ["agent", "summary"] as const,
  cases: () => ["agent", "cases"] as const,
  case: (ref: string) => ["agent", "case", ref] as const,
  offers: () => ["agent", "offers"] as const,
};


// ---------------------------------------------------------------- summary (shell badges, duty, clearance)
export type Summary = {
  offers: number;
  cases: number;
  overdue: number;
  dueToday: number;
  unread: number;
  outbox: number;
  duty: "on" | "away";
  awayUntil: string | null;
  leave: null | {
    from: string;
    to: string;
    status: "pending" | "approved" | "declined";
  };
  onLeaveNow: boolean;
  clearance:
    "new" | "in_progress" | "submitted" | "changes_requested" | "cleared";
  me: {
    id: string;
    name: string;
    title: string;
    sharePct: number;
    manager: string;
  };
};
export const useSummary = () =>
  useQuery({
    queryKey: agentKeys.summary(),
    queryFn: () => unwrap<Summary>(api.GET("/api/agent/x/summary")),
    refetchInterval: 30_000,
  });

export function useSetDuty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { state: "on" | "away"; until?: string | null }) =>
      unwrap<Summary>(api.PUT("/api/agent/x/duty", { body: b })),
    onMutate: async (b) => {
      await qc.cancelQueries({ queryKey: agentKeys.summary() });
      const prev = qc.getQueryData<Summary>(agentKeys.summary());
      if (prev)
        qc.setQueryData(agentKeys.summary(), {
          ...prev,
          duty: b.state,
          awayUntil: b.until ?? null,
        });
      return { prev };
    },
    onError: (_e, _b, ctx) =>
      ctx?.prev && qc.setQueryData(agentKeys.summary(), ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: agentKeys.all }),
  });
}

// ---------------------------------------------------------------- my cases (real GET /api/agent/cases + x_agent)
export type AgentCaseVM = {
  ref: string;
  service: string;
  serviceSlug: string;
  client: string;
  clientId: string;
  status: CaseStatus;
  dueAt: string | null;
  submittedAt: string;
  urgent: boolean;
  unread: number;
  docsToCheck: number;
  checklist: { done: number; total: number };
  institution: string | null;
  submissionRef: string | null;
  dispute: boolean;
};
type RawCase = Record<string, unknown> & { x_agent?: Record<string, unknown> };
export function toAgentCase(r: RawCase): AgentCaseVM {
  const x = (r.x_agent ?? {}) as Record<string, unknown>;
  return {
    ref: String(r.code),
    service: String(r.service_name),
    serviceSlug: String(x.serviceSlug ?? ""),
    client: String(r.client_name),
    clientId: String(x.clientId ?? ""),
    status: normalizeStatus(String(r.status)),
    dueAt: (r.due_at as string | null) ?? null,
    submittedAt: String(r.submitted_at),
    urgent: Boolean(r.is_urgent),
    unread: Number(r.unread_messages ?? 0),
    docsToCheck: Number(x.docsToCheck ?? 0),
    checklist: (x.checklist as { done: number; total: number }) ?? {
      done: 0,
      total: 0,
    },
    institution: (x.institution as string | null) ?? null,
    submissionRef: (x.submissionRef as string | null) ?? null,
    dispute: Boolean(x.dispute),
  };
}
export const useMyCases = () =>
  useQuery({
    queryKey: agentKeys.cases(),
    queryFn: async () =>
      (await unwrap<{ cases: RawCase[] }>(api.GET("/api/agent/cases"))).cases.map(
        toAgentCase,
      ),
    refetchInterval: 30_000,
  });
