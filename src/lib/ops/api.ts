"use client";
// Ops data layer: typed fetchers + TanStack Query hooks + view models.
// Real /api/admin/* contracts first; `x_ops` carries mock-only extensions (see src/mocks/handlers-ops.ts).
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { normalizeStatus, type CaseStatus } from "@/shared/domain/case-status";
import type { ChecklistItem } from "@/shared/ops/completeness";
import type { Move } from "@/shared/ops/transitions";
import type { Suggestion, Ineligible } from "@/shared/ops/ranking";

export type Flag =
  | "urgent"
  | "vip"
  | "subscriber"
  | "ai"
  | "partner"
  | "duplicate"
  | "dedicated";
export type CaseVM = {
  ref: string;
  service: string;
  serviceSlug: string;
  status: CaseStatus;
  subStatus: string | null;
  previous: CaseStatus | null;
  client: string;
  clientId: string;
  clientType: "individual" | "company";
  clientPhone: string | null;
  submittedAt: string;
  updatedAt: string;
  dueAt: string | null;
  firstResponseDueAt: string | null;
  breached: boolean;
  payment: string;
  amount: number | null;
  flags: Flag[];
  partner: string | null;
  assignees: { id: string; name: string; role: "lead" | "helper" }[];
  institution: string | null;
  submissionRef: string | null;
  expectedDecision: string | null;
  completeness: { done: number; total: number } | null;
  precheck: { ok: number; warn: number } | null;
  deliverables: number;
  claimedBy: string | null;
  dedicatedAgent: string | null;
};
export type CaseDetailVM = CaseVM & {
  checklist: ChecklistItem[];
  moves: Move[];
  clientInfo: {
    name: string;
    phone: string;
    email: string;
    language: string;
    since: string;
    past: number;
    type: string;
  } | null;
};

type Raw = Record<string, unknown> & { x_ops?: Record<string, unknown> };
const s = (v: unknown) => (typeof v === "string" ? v : null);

export function toCaseVM(r: Raw): CaseVM {
  const x = (r.x_ops ?? {}) as Record<string, unknown>;
  return {
    ref: String(r.code),
    service: String(r.service_name),
    serviceSlug: String(r.service_slug),
    status: normalizeStatus(String(r.status)),
    subStatus: s(x.subStatus),
    previous: x.previous ? normalizeStatus(String(x.previous)) : null,
    client: s(r.client_name) ?? "",
    clientId: s(x.clientId) ?? "",
    clientType: (x.clientType as CaseVM["clientType"]) ?? "individual",
    clientPhone: s(r.client_phone),
    submittedAt: String(r.submitted_at),
    updatedAt: s(x.updatedAt) ?? String(r.submitted_at),
    dueAt: s(r.due_at) ?? s(r.sla_deadline),
    firstResponseDueAt: s(x.firstResponseDueAt),
    breached: !!r.sla_breached,
    payment: String(r.payment_status),
    amount: (x.amount as number | null) ?? null,
    flags: (x.flags as Flag[]) ?? [],
    partner: s(r.partner_name),
    assignees:
      (x.assignees as CaseVM["assignees"]) ??
      (r.assignee_id
        ? [
            {
              id: String(r.assignee_id),
              name: String(r.assignee_name),
              role: "lead",
            },
          ]
        : []),
    institution: s(x.institution),
    submissionRef: s(x.submissionRef),
    expectedDecision: s(x.expectedDecision),
    completeness: (x.completeness as CaseVM["completeness"]) ?? null,
    precheck: (x.precheck as CaseVM["precheck"]) ?? null,
    deliverables: Number(x.deliverables ?? 0),
    claimedBy: s(x.claimedBy),
    dedicatedAgent: s(r.dedicated_agent_name),
  };
}

/** Query keys: ["ops", domain, params]. */
export const opsKeys = {
  all: ["ops"] as const,
  cases: (p: Record<string, unknown> = {}) => ["ops", "cases", p] as const,
  case: (ref: string) => ["ops", "case", ref] as const,
  today: () => ["ops", "today"] as const,
  suggest: (ref: string, external: boolean) =>
    ["ops", "suggest", ref, external] as const,
  agents: () => ["ops", "agents"] as const,
};
/** Which caches each mutation makes stale. */
const INVALIDATES: Record<string, (ref?: string) => QueryKey[]> = {
  status: (ref) => [opsKeys.case(ref!), ["ops", "cases"], opsKeys.today()],
  assign: (ref) => [
    opsKeys.case(ref!),
    ["ops", "cases"],
    opsKeys.today(),
    opsKeys.agents(),
    ["ops", "suggest", ref],
  ],
  claim: (ref) => [opsKeys.case(ref!), ["ops", "cases"], opsKeys.today()],
};


export function useCases(
  params: { status?: string; agent?: string; payment?: string } = {},
) {
  return useQuery({
    queryKey: opsKeys.cases(params),
    queryFn: async () => {
      const d = await unwrap<{ applications: Raw[]; total: number }>(
        api.GET("/api/admin/applications", {
          params: { query: { status: params.status || undefined, agent_id: params.agent || undefined, payment_status: params.payment || undefined } },
        }),
      );
      return { cases: d.applications.map(toCaseVM), total: d.total };
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useCase(ref: string) {
  return useQuery({
    queryKey: opsKeys.case(ref),
    queryFn: async () => {
      const r = await unwrap<Raw>(api.GET("/api/admin/applications/{code}", { params: { path: { code: ref } } }));
      const x = (r.x_ops ?? {}) as Record<string, unknown>;
      return {
        ...toCaseVM(r),
        checklist: (x.checklist as ChecklistItem[]) ?? [],
        moves: (x.moves as Move[]) ?? [],
        clientInfo: (x.client as CaseDetailVM["clientInfo"]) ?? null,
      } satisfies CaseDetailVM;
    },
    staleTime: 15_000,
  });
}

export type TodayVM = {
  manager: { name: string; categoryName: string };
  intake: number;
  awaitingReview: number;
  overdue: CaseVM[];
  atRisk: CaseVM[];
  unassigned: number;
  complaints: number;
  reviewBreakdown: {
    deliverables: number;
    allocations: number;
    dueDates: number;
    leave: number;
    skills: number;
  };
  institutions: { name: string; count: number; next: string | null }[];
  workload: { id: string; name: string; cap: number; days: number[] }[];
  consultations: {
    time: string;
    client: string;
    mode: "meet" | "phone" | "office";
  }[];
  sparks: Record<
    "intake" | "review" | "overdue" | "risk" | "unassigned" | "complaints",
    number[]
  >;
};
/** Booking & AI notes for the ops bell (plan 11 §8.3). */
export type OpsBookingNote = { id: string; type: string; vars: Record<string, string>; text: string; href: string; at: string; read: boolean };
export function useOpsBookingNotes(enabled: boolean) {
  return useQuery({ queryKey: [...opsKeys.today(), "booking-notes"], queryFn: () => unwrap<{ items: OpsBookingNote[] }>(api.GET("/api/ops/x/notifications")), enabled });
}

export function useToday() {
  return useQuery({
    queryKey: opsKeys.today(),
    queryFn: async () => {
      const d = await unwrap<Omit<TodayVM, "overdue" | "atRisk"> & { overdue: Raw[]; atRisk: Raw[] }>(api.GET("/api/admin/ops/today"));
      return {
        ...d,
        overdue: d.overdue.map(toCaseVM),
        atRisk: d.atRisk.map(toCaseVM),
      } satisfies TodayVM;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useSuggestions(ref: string, external = false) {
  return useQuery({
    queryKey: opsKeys.suggest(ref, external),
    queryFn: () =>
      unwrap<{ suggestions: Suggestion[]; ineligible: Ineligible[] }>(
        api.GET("/api/admin/applications/{code}/suggestions", { params: { path: { code: ref }, query: external ? { external: "1" } : {} } }),
      ),
  });
}

/** Mutation helper: runs, then invalidates the mapped keys. */
function useOpsMutation<V extends { ref: string }>(
  kind: keyof typeof INVALIDATES,
  fn: (v: V) => Promise<unknown>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: (_d, _e, v) =>
      INVALIDATES[kind](v.ref).forEach((k) =>
        qc.invalidateQueries({ queryKey: k }),
      ),
  });
}
export const useSetStatus = () =>
  useOpsMutation<{
    ref: string;
    status: CaseStatus;
    reason?: string;
    subStatus?: string;
    resumeAt?: string;
  }>("status", (v) =>
    unwrap(api.POST("/api/admin/applications/{code}/status", { params: { path: { code: v.ref } }, body: {
      status: v.status,
      reason: v.reason,
      sub_status: v.subStatus,
      resume_at: v.resumeAt,
    } })),
  );
export const useAssign = () =>
  useOpsMutation<{ ref: string; agentId: string; helpers?: string[]; reviewerId?: string | null }>(
    "assign",
    (v) =>
      unwrap(api.POST("/api/admin/applications/{code}/assign", { params: { path: { code: v.ref } }, body: {
        agent_id: v.agentId,
        helpers: v.helpers,
        ...(v.reviewerId !== undefined ? { reviewer_id: v.reviewerId } : {}),
      } })),
  );
export const useClaim = () =>
  useOpsMutation<{ ref: string }>("claim", (v) =>
    unwrap(api.POST("/api/admin/applications/{code}/claim", { params: { path: { code: v.ref } } })),
  );
