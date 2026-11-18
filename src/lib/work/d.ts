"use client";
// Lane D (scoped workbench) hooks: access requests, watermarked download, instruction versions, hand back,
// own contributions after access ends. Case/doc/thread reads stay on the Stage 4 hooks (the mock scopes them).
import { api, unwrap } from "@/lib/api/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workKeys, type AccessRequest } from "./api";

const enc = encodeURIComponent;
const refresh = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries({ queryKey: workKeys.all });

export const useAccessRequests = (ref: string) =>
  useQuery({
    queryKey: workKeys.lane("d", "access", ref),
    queryFn: () => unwrap<{ items: AccessRequest[] }>(api.GET("/api/work/x/cases/{code}/access-requests", { params: { path: { code: ref } } })),
  });
export function useRequestAccess(ref: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { reason: string; note?: string; client_op_id: string }) =>
      unwrap<AccessRequest>(api.POST("/api/work/x/cases/{code}/access-requests", { params: { path: { code: ref } }, body: b })),
    onSettled: () => refresh(qc),
  });
}

export type Watermark = { name: string; ref: string; at: string };
export function useDownload(ref: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) =>
      unwrap<{ url: string; watermark: Watermark }>(api.GET("/api/agent/x/cases/{code}/documents/{id}/download", { params: { path: { code: ref, id: docId } } })),
    onSettled: () => refresh(qc),
  });
}

export type InstructionVersion = { v: number; text: string; by: string; at: string };
export const useInstructions = (ref: string) =>
  useQuery({
    queryKey: workKeys.lane("d", "instructions", ref),
    queryFn: () => unwrap<{ items: InstructionVersion[] }>(api.GET("/api/agent/x/cases/{code}/instructions", { params: { path: { code: ref } } })),
  });

export const HANDBACK_REASONS = ["cant_complete", "conflict", "scope_changed", "other"] as const;
export type HandbackReason = (typeof HANDBACK_REASONS)[number];
/** Other and Scope changed need a note (plan §7.6). */
export const handbackNeedsNote = (r: HandbackReason) => r === "other" || r === "scope_changed";
export function useHandback(ref: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { reason: HandbackReason; note?: string }) => unwrap(api.POST("/api/agent/x/cases/{code}/handback", { params: { path: { code: ref } }, body: b })),
    onSettled: () => refresh(qc),
  });
}

export type Contributions = {
  messages: { id: string; body: string; at: string }[];
  uploads: { slot: string; name: string; v: string; at: string }[];
};
export const useContributions = (ref: string, enabled: boolean) =>
  useQuery({
    queryKey: workKeys.lane("d", "mine", ref),
    queryFn: () => unwrap<Contributions>(api.GET("/api/work/x/cases/{code}/contributions", { params: { path: { code: ref } } })),
    enabled,
  });
