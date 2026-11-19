"use client";
// Lane B data layer: workbench case detail + every workbench mutation. Real /api/agent/* paths first, /api/agent/x/* otherwise.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { agentKeys } from "@/lib/agent/api";
import { normalizeStatus, type CaseStatus } from "@/shared/domain/case-status";
import type { Move } from "@/shared/ops/transitions";
export type ChecklistStep = { id: string; label: string; done: boolean; doneAt?: string };
export type TimeEntry = { id: string; date: string; minutes: number; activity: string; note?: string };
export type WbEvent = { id: string; kind: "status" | "document" | "note" | "message" | "system" | "time"; text: string; actor: string; at: string; internal?: boolean };

const enc = encodeURIComponent;

export type Outcome = {
  state: "pending" | "approved" | "rejected" | "more_info";
  note: string;
  at: string;
  evidence: string | null;
};
export type QcDoc = {
  document_id: string;
  requirement_key: string;
  original_filename: string;
  file_size_bytes: number;
  version: number;
  qc_status: "pending" | "accepted" | "rejected";
  qc_notes: { reason?: string; note?: string } | null;
  /** F-DOC-12 advisory OCR suggestion (server: null until OCR runs). */
  ocr_suggestion?: { kind: string; confidence: number } | null;
  created_at: string;
  x_agent: {
    label: string;
    pages: number;
    legibility: number;
    expiry: string | null;
    nameOnDoc: string;
  };
};
export type WorkbenchVM = {
  ref: string;
  service: string;
  serviceSlug: string;
  client: string;
  status: CaseStatus;
  previous: CaseStatus | null;
  dueAt: string | null;
  slaPaused: boolean;
  institution: string | null;
  submissionRef: string | null;
  expectedDecision: string | null;
  outcome: Outcome | null;
  readOnly: "reassigned" | null;
  instructions: string;
  manager: string;
  instructionsAt: string;
  checklist: ChecklistStep[];
  slots: { key: string; label: string; required: boolean; uploaded: boolean }[];
  review: string | null;
  dispute: null | { id: string; text: string; openedAt: string };
  timesheet: TimeEntry[];
  moves: Move[];
  answers: {
    key: string;
    label: string;
    value: string;
    masked: string | null;
    shared: boolean;
  }[];
  notShared: string[];
  share: {
    eligible: number;
    pct: number;
    amount: number;
    state: "pending" | "approved";
  };
  events: WbEvent[];
  docsToCheck: number;
  unread: number;
};
type Raw = Record<string, unknown> & { x_agent: Record<string, unknown> };
function toVM(r: Raw): WorkbenchVM {
  const x = r.x_agent;
  return {
    ...(x as unknown as WorkbenchVM),
    ref: String(r.code),
    service: String(r.service_name),
    serviceSlug: String(r.service_slug),
    client: String((r.personal_info as { full_name?: string }).full_name ?? ""),
    status: normalizeStatus(String(r.status)),
    previous: x.previous ? normalizeStatus(String(x.previous)) : null,
    unread: Number(r.unread_messages ?? 0),
  };
}

export const bKeys = {
  docs: (ref: string) => ["agent", "case", ref, "docs"] as const,
};

export const useWorkbench = (ref: string) =>
  useQuery({
    queryKey: agentKeys.case(ref),
    queryFn: async () => toVM(await unwrap<Raw>(api.GET("/api/agent/cases/{code}", { params: { path: { code: ref } } }))),
    refetchInterval: 30_000,
    retry: (n, e) => (e as { status?: number }).status !== 404 && n < 2,
  });

export const useCaseDocs = (ref: string) =>
  useQuery({
    queryKey: bKeys.docs(ref),
    queryFn: async () =>
      (
        await unwrap<{ documents: QcDoc[] }>(api.GET("/api/agent/cases/{code}/documents", { params: { path: { code: ref } } }))
      ).documents,
  });

/** Every workbench mutation refreshes this case (incl. docs, nested key) and the shell counts. */
function useCaseMutation<V>(ref: string, fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => qc.invalidateQueries({ queryKey: agentKeys.all }),
  });
}
const base = (ref: string) => `/api/agent/cases/${enc(ref)}`;
const x = (ref: string) => `/api/agent/x/cases/${enc(ref)}`;

export type InstitutionFields = {
  institution: string;
  submissionRef: string;
  submittedOn: string;
  expectedDecision: string;
  evidence: string | null;
};
export const useSetStatus = (ref: string) =>
  useCaseMutation(
    ref,
    (b: { status: CaseStatus; note?: string; x_agent?: InstitutionFields }) =>
      unwrap(api.PATCH("/api/agent/cases/{code}/status", { params: { path: { code: ref } }, body: b })),
  );
export const useFlag = (ref: string) =>
  useCaseMutation(ref, (b: { kind: "attention" | "reassign"; note: string }) =>
    unwrap(api.POST("/api/agent/cases/{code}/flag", { params: { path: { code: ref } }, body: b })),
  );
export const useProposeDue = (ref: string) =>
  useCaseMutation(ref, (b: { due_date: string; note: string }) =>
    unwrap(api.POST("/api/agent/cases/{code}/propose-due", { params: { path: { code: ref } }, body: b })),
  );
export const useQc = (ref: string) =>
  useCaseMutation(
    ref,
    (b: {
      id: string;
      qc_status: QcDoc["qc_status"];
      qc_notes?: { reason?: string; note?: string; move?: boolean } | null;
    }) =>
      unwrap(api.PATCH("/api/agent/cases/{code}/documents/{document_id}/qc", { params: { path: { code: ref, document_id: b.id } }, body: {
        qc_status: b.qc_status,
        qc_notes: b.qc_notes ?? null,
      } })),
  );
export const useReveal = (ref: string) =>
  useCaseMutation(ref, (field: string) => unwrap(api.POST("/api/agent/x/cases/{code}/reveal", { params: { path: { code: ref } }, body: { field } })));
export const useOutcome = (ref: string) =>
  useCaseMutation(
    ref,
    (b: { state: Outcome["state"]; note: string; evidence: string | null }) =>
      unwrap(api.POST("/api/agent/x/cases/{code}/outcome", { params: { path: { code: ref } }, body: b })),
  );
export const useFieldVisit = (ref: string) =>
  useCaseMutation(
    ref,
    (b: { location: string; purpose: string; date: string }) =>
      unwrap(api.POST("/api/agent/x/cases/{code}/field-visit", { params: { path: { code: ref } }, body: b })),
  );
export const useLogTime = (ref: string) =>
  useCaseMutation(
    ref,
    (b: { date: string; minutes: number; activity: string; note?: string }) =>
      unwrap(api.POST("/api/agent/x/cases/{code}/timesheet", { params: { path: { code: ref } }, body: b })),
  );
export const useDisputeResponse = (ref: string) =>
  useCaseMutation(ref, (text: string) =>
    unwrap(api.POST("/api/agent/x/cases/{code}/dispute-response", { params: { path: { code: ref } }, body: { text } })),
  );

/** Optimistic checklist tick; reverts on error (caller toasts). */
export function useTick(ref: string) {
  const qc = useQueryClient();
  const key = agentKeys.case(ref);
  return useMutation({
    mutationFn: (b: { id: string; done: boolean }) =>
      unwrap(api.POST("/api/agent/x/cases/{code}/checklist/{item}", { params: { path: { code: ref, item: b.id } }, body: { done: b.done } })),
    onMutate: async (b) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<WorkbenchVM>(key);
      if (prev)
        qc.setQueryData(key, {
          ...prev,
          checklist: prev.checklist.map((s) =>
            s.id === b.id ? { ...s, done: b.done } : s,
          ),
        });
      return { prev };
    },
    onError: (_e, _b, ctx) => ctx?.prev && qc.setQueryData(key, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: agentKeys.all }),
  });
}

/** Primary next action for the phone bar (plan U6), computed from state. */
export type NextAction =
  "start" | "check" | "upload" | "outcome" | "reply" | "none";
export function nextAction(
  c: Pick<
    WorkbenchVM,
    "status" | "docsToCheck" | "slots" | "unread" | "readOnly"
  >,
): NextAction {
  if (c.readOnly) return "none";
  if (c.status === "approved_assigned") return "start";
  if (c.docsToCheck) return "check";
  if (c.status === "awaiting_external_institution") return "outcome";
  if (c.status === "in_progress")
    return "upload";
  if (c.unread) return "reply";
  return "none";
}
