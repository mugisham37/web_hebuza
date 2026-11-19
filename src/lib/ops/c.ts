"use client";
// Lane C data layer (U3 staff auth, U11 workload, U12 SLA, U13 reviews). Same pattern as api.ts:
// typed fetchers + TanStack Query hooks; extension paths go through `send`.
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { api, unwrap, newIdempotencyKey } from "@/lib/api/client";
import type { CaseStatus } from "@/shared/domain/case-status";
import { slaStatus, AT_RISK_MS } from "@/lib/ops/sla";
import type { CaseVM } from "@/lib/ops/api";

/** Step-up token + audit reason + idempotency headers (spec §2.7). */
export function hdr(opts: { stepUp?: string; audit?: string; idempotent?: boolean } = {}) {
  const headers: Record<string, string> = {};
  if (opts.stepUp) headers["X-Step-Up-Token"] = opts.stepUp;
  if (opts.audit) headers["X-Audit-Reason"] = encodeURIComponent(opts.audit);
  if (opts.idempotent) headers["Idempotency-Key"] = newIdempotencyKey();
  return headers;
}

export const cKeys = {
  mfa: ["ops", "mfa"] as const,
  devices: ["ops", "mfa", "devices"] as const,
  invite: (t: string) => ["ops", "invite", t] as const,
  workload: (week: number) => ["ops", "workload", week] as const,
  agent: (id: string) => ["ops", "workload", "agent", id] as const,
  approvals: ["ops", "approvals"] as const,
  slaHealth: ["ops", "sla", "health"] as const,
  slaRules: ["ops", "sla", "rules"] as const,
  reviews: (tab: string) => ["ops", "reviews", tab] as const,
  review: (id: string) => ["ops", "review", id] as const,
};
const INVALIDATES: Record<string, QueryKey[]> = {
  workload: [
    ["ops", "workload"],
    ["ops", "agents"],
    ["ops", "cases"],
    ["ops", "today"],
  ],
  approvals: [
    cKeys.approvals,
    ["ops", "workload"],
    ["ops", "today"],
    ["ops", "cases"],
  ],
  sla: [["ops", "cases"], ["ops", "case"], ["ops", "today"], cKeys.slaHealth],
  review: [
    ["ops", "reviews"],
    ["ops", "review"],
    ["ops", "cases"],
    ["ops", "today"],
  ],
  devices: [cKeys.devices],
};
function useCMutation<V, R = unknown>(
  kind: keyof typeof INVALIDATES,
  fn: (v: V) => Promise<R>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () =>
      INVALIDATES[kind].forEach((k) => qc.invalidateQueries({ queryKey: k })),
  });
}

// ---------------------------------------------------------------- U3 staff auth (★ mock F-IAM-05/09)
export type InvitePreview = {
  name: string;
  email: string;
  role: "agent" | "admin";
  issuedBy: string;
  issuedAt: string;
  expiresAt: string;
};
export const useInvite = (token: string) =>
  useQuery({
    queryKey: cKeys.invite(token),
    queryFn: () =>
      unwrap<InvitePreview>(api.GET("/api/auth/set-password/{token}", { params: { path: { token: token } } })),
    retry: false,
  });
export const acceptInvite = (
  token: string,
  body: { name: string; phone: string; password: string },
) =>
  unwrap<{ ok: true }>(api.POST("/api/auth/set-password/{token}", { params: { path: { token: token } }, body: body }));

export type MfaStatus = { enrolled: boolean; trustedDevice: boolean };
export const useMfaStatus = () =>
  useQuery({
    queryKey: cKeys.mfa,
    queryFn: () => unwrap<MfaStatus>(api.GET("/api/auth/mfa/status")),
    staleTime: 0,
  });
export const mfaEnrol = () =>
  unwrap<{ secret: string; qrSvg: string; periodS: number }>(api.POST("/api/auth/mfa/enrol"));
export const mfaEnrolVerify = (code: string) =>
  unwrap<{ backupCodes: string[] }>(api.POST("/api/auth/mfa/enrol/verify", { body: {
    code,
  } }));
export const mfaVerify = (code: string, backup: boolean, trust: boolean) =>
  unwrap<{ verified: true }>(api.POST("/api/auth/mfa/verify", { body: {
    code,
    backup,
    trust,
  } }));
export const stepUp = (code: string, backup: boolean, action: string) =>
  unwrap<{ token: string; expiresAt: string }>(api.POST("/api/auth/mfa/step-up", { body: {
    code,
    backup,
    action,
  } }));
export const regenBackupCodes = (token: string) =>
  unwrap<{ backupCodes: string[] }>(api.POST("/api/auth/mfa/backup-codes", { headers: hdr({ stepUp: token, audit: "regenerate backup codes" }) }));

export type Device = {
  id: string;
  label: string;
  place: string;
  lastSeen: string;
  current: boolean;
};
export const useDevices = () =>
  useQuery({
    queryKey: cKeys.devices,
    queryFn: () => unwrap<{ devices: Device[] }>(api.GET("/api/auth/mfa/devices")),
  });
export const useRevokeDevice = () =>
  useCMutation<string>("devices", (id) =>
    unwrap(api.DELETE("/api/auth/mfa/devices/{id}", { params: { path: { id: id } } })),
  );

/** Rules for a staff password (AU1): stricter than clients (12+, number, symbol, not common). */
const COMMON = new Set([
  "password1234",
  "123456789012",
  "qwertyuiop12",
  "hebuza123456",
  "kigali123456",
]);
export const staffPasswordRules = (p: string) => ({
  len: p.length >= 12,
  num: /\d/.test(p),
  symbol: /[^a-z0-9]/i.test(p),
  common: p.length > 0 && !COMMON.has(p.toLowerCase()),
});

// ---------------------------------------------------------------- U11 workload (real /api/admin/agents* + ★ mock M9)
export type WorkloadAgent = {
  id: string;
  name: string;
  role: string;
  external: boolean;
  skillsLabel: string[];
  status: "available" | "leave" | "parttime";
  onLeaveUntil: string | null;
  load: number;
  cap: number;
  dueWeek: number;
  overdue: number;
  onTime: number;
  rating: number;
  days: number[];
  services: string[];
};
export type AgentCase = {
  ref: string;
  service: string;
  serviceSlug: string;
  status: CaseStatus;
  dueAt: string;
};
export type AgentDetail = WorkloadAgent & {
  skills: { name: string; level: number }[];
  cases: AgentCase[];
  spark: number[];
  leave: { from: string; to: string; state: "approved" | "pending" }[];
};
export const useWorkload = (week: number) =>
  useQuery({
    queryKey: cKeys.workload(week),
    queryFn: () =>
      unwrap<{ agents: WorkloadAgent[]; weekStart: string }>(api.GET("/api/admin/ops/workload", { params: { query: { week: week } } })),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
export const useAgentDetail = (id: string | null) =>
  useQuery({
    queryKey: cKeys.agent(id ?? ""),
    queryFn: () =>
      unwrap<AgentDetail>(api.GET("/api/admin/ops/workload/{id}", { params: { path: { id: id! } } })),
    enabled: !!id,
  });
export const useSetCap = () =>
  useCMutation<{ id: string; cap: number; reason: string; token: string }>(
    "workload",
    (v) =>
      unwrap(api.PATCH("/api/admin/agents/{id}/settings", { params: { path: { id: v.id } }, body: { daily_case_cap: v.cap }, headers: hdr({ stepUp: v.token, audit: v.reason }) })),
  );
export const useRebalance = () =>
  useCMutation<
    { from: string; to: string; refs: string[] },
    { moved: string[] }
  >("workload", (v) =>
    unwrap(api.POST("/api/admin/ops/rebalance", { body: v, headers: hdr({
      idempotent: true,
      audit: "rebalance",
    }) })),
  );

export type Approval = {
  id: string;
  kind: "leave" | "skill" | "due" | "cancel";
  agentId: string;
  agentName: string;
  state: "pending" | "approved" | "declined";
  submittedAt: string;
  reason: string;
  from?: string;
  to?: string;
  impact?: string[];
  skill?: string;
  certificate?: string;
  ref?: string;
  service?: string;
  currentDue?: string;
  proposedDue?: string;
};
export const useApprovals = () =>
  useQuery({
    queryKey: cKeys.approvals,
    queryFn: () =>
      unwrap<{ approvals: Approval[] }>(api.GET("/api/admin/ops/approvals")),
    staleTime: 15_000,
  });
export const useDecideApproval = () =>
  useCMutation<{
    id: string;
    decision: "approve" | "decline" | "pending";
    notifyClient?: boolean;
  }>("approvals", (v) =>
    unwrap(api.POST("/api/admin/ops/approvals/{id}", { params: { path: { id: v.id } }, body: { decision: v.decision, notify_client: v.notifyClient }, headers: hdr({ audit: v.decision }) })),
  );

/**
 * Rebalance suggestion (WL4): the most over-cap agent hands their least urgent movable cases to the
 * least-loaded available internal agent who can do those services, until back at cap.
 */
export function planRebalance(
  agents: WorkloadAgent[],
  casesOf: (id: string) => AgentCase[],
) {
  const over = agents
    .filter((a) => a.load > a.cap)
    .sort((a, b) => b.load - b.cap - (a.load - a.cap))[0];
  if (!over) return null;
  const movable = casesOf(over.id).sort(
    (a, b) => Date.parse(b.dueAt) - Date.parse(a.dueAt),
  );
  const targets = agents
    .filter(
      (a) =>
        a.id !== over.id &&
        a.status === "available" &&
        !a.external &&
        a.load < a.cap,
    )
    .sort((a, b) => a.load / a.cap - b.load / b.cap);
  for (const to of targets) {
    const room = Math.min(over.load - over.cap, to.cap - to.load);
    const refs = movable
      .filter((c) => to.services.includes(c.serviceSlug))
      .slice(0, room);
    if (refs.length) return { from: over, to, cases: refs };
  }
  return null;
}

// ---------------------------------------------------------------- U12 SLA (real oversight + /due, ★ mock rules/health)
export const PAUSED: CaseStatus[] = [
  "on_hold",
  "awaiting_client_documents",
  "awaiting_external_institution",
  "awaiting_quotation",
  "awaiting_payment",
];
const CLOSED: CaseStatus[] = [
  "completed_delivered",
  "rejected",
  "cancelled",
  "refunded",
  "refund_requested", // Finance tracks refunds; the delivery SLA no longer applies
];
const kigaliDay = (t: number) =>
  new Date(t + 2 * 3600_000).toISOString().slice(0, 10);

/** SL1 columns. Breached: past due. Due today: due later today (Kigali). At risk: due within 24 h but not today. Paused excluded. */
export function slaColumns(cases: CaseVM[], now: number) {
  const cols = {
    risk: [] as CaseVM[],
    today: [] as CaseVM[],
    breach: [] as CaseVM[],
    paused: 0,
  };
  for (const c of cases) {
    if (!c.dueAt || CLOSED.includes(c.status)) continue;
    if (PAUSED.includes(c.status)) {
      cols.paused++;
      continue;
    }
    const due = Date.parse(c.dueAt);
    if (due < now) cols.breach.push(c);
    else if (kigaliDay(due) === kigaliDay(now)) cols.today.push(c);
    else if (due - now <= AT_RISK_MS) cols.risk.push(c);
  }
  const byDue = (a: CaseVM, b: CaseVM) =>
    Date.parse(a.dueAt!) - Date.parse(b.dueAt!);
  cols.risk.sort(byDue);
  cols.today.sort(byDue);
  cols.breach.sort(byDue);
  return cols;
}
export { slaStatus };

export type SlaHealth = {
  metPct: number;
  avgFirstResponseMs: number;
  breaches: number;
  trend: number[];
};
export type SlaRule = {
  service: string;
  name: string;
  firstResponseH: number;
  completionDays: number;
  pauses: CaseStatus[];
};
export const useSlaHealth = () =>
  useQuery({
    queryKey: cKeys.slaHealth,
    queryFn: () => unwrap<SlaHealth>(api.GET("/api/admin/ops/sla/health")),
    staleTime: 60_000,
  });
export const useSlaRules = () =>
  useQuery({
    queryKey: cKeys.slaRules,
    queryFn: () =>
      unwrap<{ rules: SlaRule[]; holidays: string[] }>(api.GET("/api/admin/ops/sla/rules")),
    staleTime: 60_000,
  });
export const useExtendDue = () =>
  useCMutation<{
    ref: string;
    dueDate: string;
    reason: string;
    note: string;
    notify: boolean;
  }>("sla", (v) =>
    unwrap(api.PATCH("/api/admin/applications/{code}/due", { params: { path: { code: v.ref } }, body: {
        due_date: v.dueDate,
        note: [v.reason, v.note].filter(Boolean).join(" · "),
        notify_client: v.notify,
      }, headers: hdr({ audit: v.reason }) })),
  );
export const useEscalate = () =>
  useCMutation<{ ref: string; reason: string }>("sla", (v) =>
    unwrap(api.PATCH("/api/admin/oversight/cases/{code}/escalate", { params: { path: { code: v.ref } }, body: { reason: v.reason }, headers: hdr({ audit: v.reason }) })),
  );

// ---------------------------------------------------------------- U13 reviews (★ mock F-DLV-03/05, F-REV-06)
export type ReviewItem = {
  id: string;
  ref: string;
  service: string;
  deliverable: string;
  authorId: string;
  authorName: string;
  version: number;
  submittedAt: string;
  reviewDueAt: string;
  payment: string;
  outstanding: number;
  amount: number;
  secondLevel: boolean;
  state: "awaiting" | "returned" | "approved";
};
export type ReviewComment = {
  id: string;
  fileId: string;
  author: string;
  body: string;
  at: string;
  page: number;
  x: number;
  y: number;
};
export type ReviewFile = {
  id: string;
  name: string;
  kind: "pdf" | "image";
  versions: { v: number; pages: string[] }[];
};
export type ChainStep = {
  name: string;
  role: string;
  state: "approved" | "pending" | "requested" | "waiting";
};
export type Allocation = {
  fee: number;
  deductions: { label: string; amount: number }[];
  agentPct: number;
  shares: { id: string; name: string; pct: number }[];
  reviewed: boolean;
};
export type ReviewDetail = ReviewItem & {
  viewerId: string;
  files: ReviewFile[];
  comments: ReviewComment[];
  requirements: { id: string; label: string; met: boolean }[];
  chain: ChainStep[];
  gate: {
    blocked: boolean;
    override: { reason: string; by: string; at: string } | null;
  };
  allocation: Allocation | null;
  returned: { to: string; due: string } | null;
};
export const useReviews = (tab: string) =>
  useQuery({
    queryKey: cKeys.reviews(tab),
    queryFn: () =>
      unwrap<{
        items: ReviewItem[];
        counts: Record<"mine" | "returned" | "approved", number>;
      }>(api.GET("/api/admin/ops/reviews", { params: { query: { tab: tab } } })),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
export const useReview = (id: string) =>
  useQuery({
    queryKey: cKeys.review(id),
    queryFn: () =>
      unwrap<ReviewDetail>(api.GET("/api/admin/ops/reviews/{id}", { params: { path: { id: id } } })),
  });
const rv = (id: string, p: string) =>
  `/api/admin/ops/reviews/${encodeURIComponent(id)}/${p}`;
export const useReviewComment = () =>
  useCMutation<
    Omit<ReviewComment, "id" | "author" | "at"> & { reviewId: string }
  >("review", ({ reviewId, ...b }) =>
    unwrap(api.POST("/api/admin/ops/reviews/{id}/comments", { params: { path: { id: reviewId } }, body: b })),
  );
export type Decision =
  "approve_release" | "approve_after_payment" | "return" | "reopen";
export const useDecide = () =>
  useCMutation<{ id: string; decision: Decision; note?: string; due?: string }>(
    "review",
    (v) =>
      unwrap(api.POST("/api/admin/ops/reviews/{id}/decision", { params: { path: { id: v.id } }, body: { decision: v.decision === "approve_after_payment" ? "approve" : v.decision, note: v.note, due: v.due }, headers: hdr({ idempotent: true, audit: v.decision }) })),
  );
export const useOverrideGate = () =>
  useCMutation<{
    id: string;
    reason: string;
    note: string;
    proof: string | null;
    token: string;
  }>("review", (v) =>
    unwrap(api.POST("/api/admin/ops/reviews/{id}/override", { params: { path: { id: v.id } }, body: { reason: v.reason, note: v.note, proof: v.proof }, headers: hdr({ stepUp: v.token, audit: v.reason }) })),
  );
export const useSecondApproval = () =>
  useCMutation<{ id: string }>("review", (v) =>
    unwrap(api.POST("/api/admin/ops/reviews/{id}/second-approval", { params: { path: { id: v.id } }, headers: hdr({ idempotent: true }) })),
  );
export const useSecondApprove = () =>
  useCMutation<{ id: string }>("review", (v) =>
    unwrap(api.POST("/api/admin/ops/reviews/{id}/second-approve", { params: { path: { id: v.id } }, headers: hdr({ idempotent: true, audit: "second approval" }) })),
  );
export const useAllocation = () =>
  useCMutation<{ id: string; shares: Allocation["shares"]; reason: string }>(
    "review",
    (v) =>
      unwrap(api.POST("/api/admin/ops/reviews/{id}/allocation", { params: { path: { id: v.id } }, body: { shares: v.shares, reason: v.reason }, headers: hdr({ audit: v.reason }) })),
  );

/** RV6 split: net = fee − deductions; agent pool by agentPct, shared by pct; rounding remainder goes to HEBUZA so the parts sum to net. */
export function allocate(
  a: Pick<Allocation, "fee" | "deductions" | "agentPct" | "shares">,
) {
  const net = a.fee - a.deductions.reduce((s, d) => s + d.amount, 0);
  const pool = Math.floor((net * a.agentPct) / 100);
  const agents = a.shares.map((s) => ({
    ...s,
    amount: Math.floor((pool * s.pct) / 100),
  }));
  const paid = agents.reduce((s, x) => s + x.amount, 0);
  return {
    net,
    pool,
    agents,
    hebuza: net - paid,
    valid: a.shares.reduce((s, x) => s + x.pct, 0) === 100,
  };
}
