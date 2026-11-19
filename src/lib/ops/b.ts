"use client";
// Lane B data layer: case record (U6–U7) and the assign flow (U9–U10). Same pattern as api.ts.
// Contract: contract/openapi.json (lane B).
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { opsKeys } from "@/lib/ops/api";
import type { Agent } from "@/shared/ops/ranking";
import type { QuoteLine } from "@/shared/ops/quotation";
import type { TimelineKind } from "@/components/molecules/ops/ops";
import type { Precheck, OfferState } from "@/components/atoms/ops";

// ---------- types
export type DocVM = {
  id: string;
  key: string;
  label: string;
  kind: "pdf" | "image" | "id";
  pages: number;
  legibility: number;
  typeDetected: string;
  expiry: string | null;
  nameOnDoc: string;
  checks: { kind: Precheck; detail?: string }[];
  state: "accepted" | "rejected" | null;
  reason: string | null;
  uploadedAt: string;
};
export type OpsEvent = {
  id: string;
  kind: TimelineKind;
  actor: string;
  at: string;
  from?: string;
  to?: string;
  text?: string;
  internal?: boolean;
  client?: boolean;
  ip?: string;
};
export type DocRequest = {
  items: { key: string; label: string; note: string }[];
  due: string;
  channels: string[];
  sentAt: string;
};
export type SentQuote = {
  lines: QuoteLine[];
  discountPct: number;
  discountReason?: string;
  validityDays: number;
  note: string;
  sentAt: string;
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  validUntil: string;
};
export type CaseRecord = {
  groups: { key: string; rows: { label: string; value: string }[] }[];
  shareholders: { name: string; pct: number }[];
  docs: DocVM[];
  request: DocRequest | null;
  quote: SentQuote | null;
  priceList: { label: string; unit: number }[];
  payments: { label: string; amount: number; method: string; at: string }[];
  reuploaded: number;
};
export type Brief = {
  template: string;
  steps: { text: string; done: boolean }[];
  deliverables: string[];
  deadline: string;
  priority: "low" | "normal" | "high";
  instructions: string;
  attachments: string[];
};
export const SCOPE_KEYS = [
  "nationalId",
  "address",
  "shareholderIds",
  "answers",
  "phone",
  "email",
  "plan",
  "bank",
  "payment",
] as const;
export type ScopeKey = (typeof SCOPE_KEYS)[number];
export type ScopeRole = "lead" | "helper" | "external";
export type Scope = Record<ScopeKey, Record<ScopeRole, boolean>>;
export type Offer = {
  id: string;
  agentId: string;
  agentName: string;
  state: OfferState | "withdrawn";
  sentAt: string;
  expiresAt: string;
  viewedAt?: string;
  endedAt?: string;
  declineReason?: string;
};
export type RuleMode = "roundRobin" | "leastLoaded" | "skill";
export type Rules = {
  mode: RuleMode;
  pool: string[];
  cap: number;
  vipApproval: boolean;
  assignMode?: "manual" | "suggest" | "auto";
  threshold?: number;
  preview: string[];
};
export type AssignContext = {
  internalCost: number;
  revenueRule: { agency: number; agent: number };
  contracts: Record<string, { status: string; until: string }>;
  week: Record<string, number[]>;
  language: string;
  location: string;
};
export type AgentRow = Agent & {
  role: string;
  status: string;
  skillsLabel: string[];
};

// ---------- pure helpers (unit tested)
export { previewNext } from "@/shared/ops/rules";
export const sharesState = (shares: number[]) => {
  const total = shares.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
  return { total, ok: total === 100 && shares.every((v) => v > 0) };
};
/** How many scoped items a role sees. */
export const scopeCount = (s: Scope, role: ScopeRole) =>
  SCOPE_KEYS.filter((k) => s[k]?.[role]).length;

// ---------- fetchers
const enc = encodeURIComponent;
const A = (ref: string) => `/api/admin/applications/${enc(ref)}`;

export const bKeys = {
  record: (ref: string) => ["ops", "record", ref] as const,
  timeline: (ref: string) => ["ops", "timeline", ref] as const,
  audit: (ref: string) => ["ops", "audit", ref] as const,
  ctx: (ref: string) => ["ops", "assign-ctx", ref] as const,
  brief: (ref: string) => ["ops", "brief", ref] as const,
  scope: (ref: string) => ["ops", "scope", ref] as const,
  offers: (ref: string) => ["ops", "offers", ref] as const,
  rules: (slug: string) => ["ops", "rules", slug] as const,
};

export const useRecord = (ref: string) =>
  useQuery({
    queryKey: bKeys.record(ref),
    queryFn: () => unwrap<CaseRecord>(api.GET("/api/admin/applications/{code}/record", { params: { path: { code: ref } } })),
    staleTime: 15_000,
  });
export const useTimeline = (ref: string) =>
  useQuery({
    queryKey: bKeys.timeline(ref),
    queryFn: () =>
      unwrap<{ events: OpsEvent[] }>(api.GET("/api/admin/applications/{code}/timeline", { params: { path: { code: ref } } })).then((d) => d.events),
  });
export const useAudit = (ref: string, enabled = true) =>
  useQuery({
    queryKey: bKeys.audit(ref),
    enabled,
    queryFn: () =>
      unwrap<{ rows: OpsEvent[] }>(api.GET("/api/admin/audit-log", { params: { query: { entity: ref } } })).then(
        (d) => d.rows,
      ),
  });
export const useAgents = () =>
  useQuery({
    queryKey: opsKeys.agents(),
    queryFn: () =>
      unwrap<{ agents: AgentRow[] }>(api.GET("/api/admin/agents")).then((d) => d.agents),
    staleTime: 30_000,
  });
export const useAssignContext = (ref: string) =>
  useQuery({
    queryKey: bKeys.ctx(ref),
    queryFn: () => unwrap<AssignContext>(api.GET("/api/admin/applications/{code}/assign-context", { params: { path: { code: ref } } })),
  });
export const useBrief = (ref: string) =>
  useQuery({
    queryKey: bKeys.brief(ref),
    queryFn: () =>
      unwrap<{
        brief: Brief | null;
        suggested: Brief;
        templates: {
          id: string;
          name: string;
          steps: string[];
          deliverables: string[];
        }[];
        clientDeadline: string;
      }>(api.GET("/api/admin/applications/{code}/brief", { params: { path: { code: ref } } })),
  });
export const useScope = (ref: string) =>
  useQuery({
    queryKey: bKeys.scope(ref),
    queryFn: () =>
      unwrap<{ scope: Scope; phone: string; email: string }>(api.GET("/api/admin/applications/{code}/scope", { params: { path: { code: ref } } })),
  });
/** Polls every 3 s while an offer is open, so the timeline moves sent → viewed → accepted live. */
export const useOffers = (ref: string) =>
  useQuery({
    queryKey: bKeys.offers(ref),
    queryFn: () =>
      unwrap<{ offers: Offer[] }>(api.GET("/api/admin/applications/{code}/offers", { params: { path: { code: ref } } })).then((d) => d.offers),
    refetchInterval: (q) =>
      q.state.data?.some((o) => o.state === "sent" || o.state === "viewed")
        ? 3000
        : false,
  });
export const useRules = (slug: string) =>
  useQuery({
    queryKey: bKeys.rules(slug),
    enabled: !!slug,
    queryFn: () =>
      unwrap<Rules & { candidates: string[] }>(api.GET("/api/admin/services/{slug}/auto-assign", { params: { path: { slug: slug } } })),
  });

// ---------- mutations (invalidate by key, same as api.ts)
function useB<V extends { ref: string }, R = unknown>(
  fn: (v: V) => Promise<R>,
  keys: (v: V) => QueryKey[],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: (_d, _e, v) =>
      keys(v).forEach((k) => qc.invalidateQueries({ queryKey: k })),
  });
}
const caseKeys = (ref: string): QueryKey[] => [
  opsKeys.case(ref),
  ["ops", "cases"],
  opsKeys.today(),
  bKeys.record(ref),
  bKeys.timeline(ref),
  bKeys.audit(ref),
];

export const useDocDecision = () =>
  useB(
    (v: {
      ref: string;
      docId: string;
      decision: "accepted" | "rejected" | null;
      reason?: string;
    }) =>
      unwrap(api.POST("/api/admin/applications/{code}/documents/{doc}/decision", { params: { path: { code: v.ref, doc: v.docId } }, body: {
        decision: v.decision,
        reason: v.reason,
      } })),
    (v) => caseKeys(v.ref),
  );
/** F-IAM-11: view-as needs a reason; the server checks the role and writes the audit row. */
export const useViewAs = () =>
  useB(
    (v: { ref: string; reason: string; note: string }) =>
      unwrap(api.POST("/api/admin/applications/{code}/view-as", { params: { path: { code: v.ref } }, body: { reason: v.reason, note: v.note } })),
    (v) => [bKeys.audit(v.ref)],
  );
export const useMarkComplete = () =>
  useB(
    (v: { ref: string }) => unwrap(api.POST("/api/admin/applications/{code}/checklist/complete", { params: { path: { code: v.ref } } })),
    (v) => caseKeys(v.ref),
  );
export const useRequestDocs = () =>
  useB(
    (v: {
      ref: string;
      items: { key: string; note: string }[];
      due: string;
      channels: string[];
      sub?: string;
    }) =>
      unwrap<DocRequest>(api.POST("/api/admin/applications/{code}/document-request", { params: { path: { code: v.ref } }, body: {
        items: v.items,
        due: v.due,
        channels: v.channels,
        sub: v.sub,
      } })),
    (v) => caseKeys(v.ref),
  );
export const useSendQuote = () =>
  useB(
    (v: {
      ref: string;
      lines: QuoteLine[];
      discountPct: number;
      discountReason?: string;
      validityDays: number;
      note: string;
      sub?: string;
    }) => {
      const { ref, ...body } = v;
      return unwrap<SentQuote>(api.POST("/api/admin/applications/{code}/quotation", { params: { path: { code: ref } }, body: body }));
    },
    (v) => caseKeys(v.ref),
  );
export const useAddNote = () =>
  useB(
    (v: { ref: string; body: string }) =>
      unwrap(api.POST("/api/admin/applications/{code}/notes", { params: { path: { code: v.ref } }, body: { body: v.body } })),
    (v) => [bKeys.timeline(v.ref), bKeys.audit(v.ref)],
  );

const assignKeys = (ref: string): QueryKey[] => [
  ...caseKeys(ref),
  opsKeys.agents(),
  ["ops", "suggest", ref],
  bKeys.offers(ref),
];
export const useAssignTerms = () =>
  useB(
    (v: {
      ref: string;
      lead: { id: string; share: number; role?: string; deadline?: string };
      helpers?: {
        id: string;
        share: number;
        role?: string;
        deadline?: string;
      }[];
      price?: number;
      override?: { agency: number; reason: string };
    }) => {
      const { ref, ...body } = v;
      return unwrap(api.POST("/api/admin/applications/{code}/assignment", { params: { path: { code: ref } }, body: body }));
    },
    (v) => [bKeys.ctx(v.ref)],
  );
export const useAssignOverride = () =>
  useB(
    (v: { ref: string; agentId: string; reason: string }) =>
      unwrap(api.POST("/api/admin/applications/{code}/assign-override", { params: { path: { code: v.ref } }, body: {
        agent_id: v.agentId,
        reason: v.reason,
      } })),
    (v) => assignKeys(v.ref),
  );
export const useSaveBrief = () =>
  useB(
    (v: { ref: string; brief: Brief }) =>
      unwrap(api.PUT("/api/admin/applications/{code}/brief", { params: { path: { code: v.ref } }, body: v.brief })),
    (v) => [bKeys.brief(v.ref)],
  );
export const useSaveScope = () =>
  useB(
    (v: { ref: string; scope: Scope }) =>
      unwrap(api.PUT("/api/admin/applications/{code}/scope", { params: { path: { code: v.ref } }, body: { scope: v.scope } })),
    (v) => [bKeys.scope(v.ref), bKeys.timeline(v.ref)],
  );
export const useSendOffer = () =>
  useB(
    (v: { ref: string; agentId: string }) =>
      unwrap<Offer>(api.POST("/api/admin/applications/{code}/offers", { params: { path: { code: v.ref } }, body: { agent_id: v.agentId } })),
    (v) => assignKeys(v.ref),
  );
export const useReassign = () =>
  useB(
    (v: {
      ref: string;
      to: string;
      reason: string;
      note?: string;
      handoff?: string;
      revoke: boolean;
      splitPct?: number;
      notify: boolean;
    }) =>
      unwrap(api.POST("/api/admin/applications/{code}/reassign", { params: { path: { code: v.ref } }, body: {
        to: v.to,
        reason: v.reason,
        note: v.note,
        handoff: v.handoff,
        revoke: v.revoke,
        split_pct: v.splitPct,
        notify: v.notify,
      } })),
    (v) => assignKeys(v.ref),
  );
export const useSaveRules = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { slug: string; rules: Omit<Rules, "preview"> }) =>
      unwrap(api.PUT("/api/admin/services/{slug}/auto-assign", { params: { path: { slug: v.slug } }, body: v.rules })),
    onSettled: (_d, _e, v) =>
      qc.invalidateQueries({ queryKey: bKeys.rules(v.slug) }),
  });
};
