"use client";
// Workforce admin hooks (/ops/workforce, plan 12 W1–W5). Keys under ["workforce", …].
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";

const hdr = (o: { idempotencyKey?: string; stepUp?: string }) => ({
  ...(o.idempotencyKey && { "Idempotency-Key": o.idempotencyKey }),
  ...(o.stepUp && { "X-Step-Up-Token": o.stepUp }),
});
import type { Review, WorkerDetail, WorkerEvent, WorkerRow, WorkerStatus } from "@/shared/procurement/types";
import type { AuditEvent } from "@/lib/audit-event";

export type WorkerFull = WorkerDetail & { sessionsRevoked: boolean };
const K = ["workforce"] as const;
/** F-WRK-14: server-side directory filters (service, language, district, minRating, q); no filters = everyone. */
export type WorkerFilters = { service?: string; language?: string; district?: string; minRating?: number; q?: string };
export const useWorkers = (f: WorkerFilters = {}) => {
  const query = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== "")) as WorkerFilters;
  return useQuery({
    queryKey: [...K, "list", query],
    queryFn: () => unwrap<{ items: WorkerRow[] }>(api.GET("/api/staff/workers", { params: { query } })),
    placeholderData: (prev) => prev,
  });
};
export const useWorker = (id: string) => useQuery({ queryKey: [...K, "one", id], queryFn: () => unwrap<WorkerFull>(api.GET("/api/staff/workers/{id}", { params: { path: { id } } })) });
export const useReviews = (id: string) => useQuery({ queryKey: [...K, "reviews", id], queryFn: () => unwrap<{ items: Review[] }>(api.GET("/api/staff/workers/{id}/reviews", { params: { path: { id } } })) });
export const useHistory = (id: string) =>
  useQuery({ queryKey: [...K, "history", id], queryFn: () => unwrap<{ items: WorkerEvent[]; audit: AuditEvent[] }>(api.GET("/api/staff/workers/{id}/history", { params: { path: { id } } })) });
export const useAssignees = (id: string) =>
  useQuery({ queryKey: [...K, "assignees", id], queryFn: () => unwrap<{ items: { id: string; name: string; load: number; cap: number }[] }>(api.GET("/api/staff/workers/{id}/assignees", { params: { path: { id } } })) });

/** Audited reveal: reason travels in X-Reveal-Reason (F-WRK-15). */
export const revealWorker = (id: string, reason: string) =>
  unwrap<WorkerFull>(api.GET("/api/staff/workers/{id}", { params: { path: { id }, query: { reveal: "1" } }, headers: { "X-Reveal-Reason": encodeURIComponent(reason) } }));

function useInvalidating<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: K }) });
}
export const useCreateWorker = () =>
  useInvalidating((v: { firstName: string; lastName: string; email: string; phone: string; type: "internal" | "external"; field: boolean; idempotencyKey: string }) =>
    unwrap<{ id: string }>(api.POST("/api/staff/workers", { body: v, headers: hdr({ idempotencyKey: v.idempotencyKey }) })));
export const useWorkerStatus = (id: string) =>
  useInvalidating((v: { to: WorkerStatus; reason: string; reassignments?: { ref: string; to: string }[]; idempotencyKey?: string; stepUp?: string }) =>
    unwrap<WorkerFull>(api.POST("/api/staff/workers/{id}/status", { params: { path: { id } }, body: { to: v.to, reason: v.reason, reassignments: v.reassignments }, headers: hdr(v) })));
/** F-WRK-04: issue a new contract version to an external worker. */
export const useIssueContract = (id: string) =>
  useInvalidating((v: { kind: "service_agreement" | "sla" | "nda" | "licence"; start: string; end: string | null; noticeDays: number; idempotencyKey: string }) =>
    unwrap(api.POST("/api/staff/workers/{id}/contracts", { params: { path: { id } }, body: { kind: v.kind, start: v.start, end: v.end, noticeDays: v.noticeDays }, headers: hdr({ idempotencyKey: v.idempotencyKey }) })));
export const useSubmitReview = (id: string) =>
  useInvalidating((v: { period: string; rating: number; goals: string; comments: string; ackRequired: boolean; idempotencyKey: string }) =>
    unwrap<Review>(api.POST("/api/staff/workers/{id}/reviews", { params: { path: { id } }, body: v, headers: hdr({ idempotencyKey: v.idempotencyKey }) })));

/** External worker's items awaiting a staff decision (GET /staff/workers/{id}/work). */
export type StaffWork = {
  status: string;
  onboarding: { submittedAt: string | null; changes: { items: string[]; note: string } | null };
  payoutDest: { method: string; label: string; last4: string; status: "verified" | "pending_verification" | "failed"; coolingUntil: string | null } | null;
  invoices: { id: string; number: string; period: string; amount: number; fileName: string; at: string }[];
  rateOwner: string;
  rates: { serviceId: string; serviceName: string; bps?: number; flat?: number; from: string; reason?: string }[];
  access: { id: string; ref: string; reason: string; note?: string; at: string }[];
};
export const useStaffWork = (id: string) =>
  useQuery({ queryKey: [...K, "work", id], queryFn: () => unwrap<StaffWork>(api.GET("/api/staff/workers/{id}/work", { params: { path: { id } } })) });
export type PendingDest = { workerId: string; method: string; label: string; last4: string; status: string; coolingUntil: string | null };
export const usePendingDestinations = () =>
  useQuery({ queryKey: [...K, "dests"], queryFn: () => unwrap<PendingDest[]>(api.GET("/api/staff/payout-destinations/pending")), retry: false });
export type WorkDecision =
  | { k: "onboarding"; decision: "approve" | "changes"; note?: string }
  | { k: "access"; opId: string; grant: boolean }
  | { k: "rate"; owner: string; serviceId: string; action: "approve" | "reject" }
  | { k: "invoice"; invId: string; decision: "accepted" | "rejected" }
  | { k: "payout"; result: "verify" | "fail" };
export const useWorkDecision = (id: string) =>
  useInvalidating((a: WorkDecision) => {
    const path = { id };
    switch (a.k) {
      case "onboarding": return unwrap(api.POST("/api/staff/workers/{id}/onboarding/decision", { params: { path }, body: { decision: a.decision, note: a.note } }));
      case "access": return unwrap(api.POST("/api/staff/workers/{id}/access-requests/{opId}/decision", { params: { path: { id, opId: a.opId } }, body: { grant: a.grant } }));
      case "rate": return unwrap(api.POST("/api/staff/work/rates/{owner}/{serviceId}/{action}", { params: { path: { owner: a.owner, serviceId: a.serviceId, action: a.action } } }));
      case "invoice": return unwrap(api.POST("/api/staff/workers/{id}/invoices/{invId}/decision", { params: { path: { id, invId: a.invId } }, body: { decision: a.decision } }));
      case "payout": return unwrap(api.POST("/api/staff/workers/{id}/payout-destination/{result}", { params: { path: { id, result: a.result } } }));
    }
  });
