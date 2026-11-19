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
export const useWorkers = () => useQuery({ queryKey: [...K, "list"], queryFn: () => unwrap<{ items: WorkerRow[] }>(api.GET("/api/staff/workers")) });
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
export const useSubmitReview = (id: string) =>
  useInvalidating((v: { period: string; rating: number; goals: string; comments: string; ackRequired: boolean; idempotencyKey: string }) =>
    unwrap<Review>(api.POST("/api/staff/workers/{id}/reviews", { params: { path: { id } }, body: v, headers: hdr({ idempotencyKey: v.idempotencyKey }) })));
