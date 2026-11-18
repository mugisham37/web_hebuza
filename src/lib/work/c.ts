"use client";
// Lane C data layer: external offer fields + counter-propose (plan §2.5, §9.2). Mocks in handlers-work-c.ts.
import { api, unwrap } from "@/lib/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { offerKeys, type OfferVM } from "@/lib/agent/c";
import { workKeys } from "./api";
import type { Rate } from "@/lib/agent/money";

/** Extra fields the offers endpoint returns for externals. */
export type ExtOfferVM = OfferVM & {
  eligible?: number;
  rate?: Rate;
  counter?: { due: string; reason: string; status: "pending" | "accepted" | "declined" };
};

export function useCounter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { id: string; due: string; reason: string }) =>
      unwrap<ExtOfferVM>(api.POST("/api/agent/x/offers/{id}/counter", { params: { path: { id: b.id } }, body: { due: b.due, reason: b.reason } })),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: offerKeys.list() });
      qc.invalidateQueries({ queryKey: workKeys.all });
    },
  });
}
