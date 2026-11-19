"use client";
// Lane C data layer: U4 offers + U7 deliverables over /api/agent/x/*.
import { api, unwrap } from "@/lib/api/client";
import { asMime } from "@/lib/api/upload";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agentKeys } from "@/lib/agent/api";
import type { Conflict } from "@/shared/agent/core";
import type { CaseStatus } from "@/shared/domain/case-status";

// ---------------------------------------------------------------- offers
export type OfferVM = {
  id: string;
  ref: string;
  service: string;
  client: string;
  summary: string;
  sentAt: string;
  expiresAt: string;
  dueAt: string;
  effortH: number;
  shared: [number, number];
  skills: string[];
  status: "pending" | "accepted" | "declined" | "expired" | "returned";
  decidedAt?: string;
  reason?: string;
  share: number;
  pct: number;
  fee: number | null; // only when policy.show_fee (D2)
  started: boolean;
};
export const offerKeys = { list: () => [...agentKeys.offers(), "c"] as const };
export const useOffers = () =>
  useQuery({
    queryKey: offerKeys.list(),
    queryFn: () =>
      unwrap<{ offers: OfferVM[] }>(api.GET("/api/agent/x/offers")).then((r) => r.offers),
    refetchInterval: 30_000,
  });

/** PUT a file to a presigned URL with progress (fetch has no upload progress). */
function putFile(url: string, file: File, onProgress?: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.setRequestHeader("content-type", file.type || "application/octet-stream");
    x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    x.onload = () => (x.status < 300 ? resolve() : reject(new Error(`upload ${x.status}`)));
    x.onerror = () => reject(new Error("upload failed"));
    x.send(file);
  });
}

export function useOfferActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: agentKeys.all });
  const accept = useMutation({
    mutationFn: (b: {
      id: string;
      conflict: Conflict;
      note?: string;
      start_now: boolean;
    }) =>
      unwrap<OfferVM>(api.POST("/api/agent/x/offers/{id}/accept", { params: { path: { id: b.id } }, body: {
        conflict: b.conflict,
        note: b.note,
        start_now: b.start_now,
      } })),
  });
  const decline = useMutation({
    mutationFn: (b: { id: string; reason: string; note?: string }) =>
      unwrap<OfferVM>(api.POST("/api/agent/x/offers/{id}/decline", { params: { path: { id: b.id } }, body: {
        reason: b.reason,
        note: b.note,
      } })),
  });
  const undo = useMutation({
    mutationFn: (id: string) => unwrap<OfferVM>(api.POST("/api/agent/x/offers/{id}/undo", { params: { path: { id } } })),
    onSettled: refresh,
  });
  return { accept, decline, undo, refresh };
}

// ---------------------------------------------------------------- deliverables
export type VersionVM = {
  v: string;
  name: string;
  size: number;
  at: string;
  state: "uploaded" | "returned" | "approved";
  comment?: string;
};
export type SlotVM = {
  key: string;
  label: string;
  required: boolean;
  /** DLV-10: released file asks the client for a signature. */
  signature?: boolean;
  versions: VersionVM[];
};
export type DelivEvent = {
  kind:
    | "submitted"
    | "returned"
    | "resubmitted"
    | "approved"
    | "released"
    | "delivered";
  at: string;
  v?: string;
};
export type DeliverablesVM = {
  ref: string;
  status: CaseStatus;
  slots: SlotVM[];
  clientNote: string;
  review: null | {
    state: "submitted" | "returned" | "approved" | "released";
    at: string;
    comments?: { slot: string; text: string; by: string; at: string }[];
  };
  checklist: { done: number; total: number };
  reviewRequired: boolean;
  reviewer: { name: string; category: string };
  events: DelivEvent[];
  share: number;
};
export const delivKey = (ref: string) =>
  [...agentKeys.case(ref), "deliverables"] as const;
export const useDeliverables = (ref: string) =>
  useQuery({
    queryKey: delivKey(ref),
    queryFn: () =>
      unwrap<DeliverablesVM>(api.GET("/api/agent/x/cases/{code}/deliverables", { params: { path: { code: ref } } })),
  });

export function useDeliverableActions(ref: string) {
  const qc = useQueryClient();
  const set = (d: DeliverablesVM) => {
    qc.setQueryData(delivKey(ref), d);
    qc.invalidateQueries({
      queryKey: agentKeys.all,
      predicate: (q) => q.queryKey.join() !== delivKey(ref).join(),
    });
  };
  const base = `/api/agent/x/cases/${ref}`;
  return {
    // Registers the version (server validates type/size and presigns), then the browser PUTs the bytes to storage.
    upload: useMutation({
      mutationFn: async ({ slot, file, onProgress }: { slot: string; file: File; onProgress?: (pct: number) => void }) => {
        const d = await unwrap<DeliverablesVM & { upload?: { url: string } }>(api.POST("/api/agent/x/cases/{code}/deliverables", { params: { path: { code: ref } }, body: { slot, name: file.name, size: file.size, type: asMime(file.type) } }));
        if (d.upload) await putFile(d.upload.url, file, onProgress);
        return d;
      },
      onSuccess: set,
    }),
    signature: useMutation({
      mutationFn: ({ slot, on }: { slot: string; on: boolean }) =>
        unwrap<DeliverablesVM>(api.POST("/api/agent/x/cases/{code}/deliverables", { params: { path: { code: ref } }, body: { slot, signature: on } })),
      onSuccess: (d) => qc.setQueryData(delivKey(ref), d),
    }),
    note: useMutation({
      mutationFn: (clientNote: string) =>
        unwrap<DeliverablesVM>(api.POST("/api/agent/x/cases/{code}/deliverables", { params: { path: { code: ref } }, body: { clientNote } })),
      onSuccess: (d) => qc.setQueryData(delivKey(ref), d),
    }),
    submit: useMutation({
      mutationFn: () => unwrap<DeliverablesVM>(api.POST("/api/agent/x/cases/{code}/submit-review", { params: { path: { code: ref } } })),
      onSuccess: set,
    }),
  };
}
