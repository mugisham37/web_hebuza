"use client";
// Lane G: firm team hooks (plan §7.9, §9.2 /api/work/x/firm*).
import { api, unwrap } from "@/lib/api/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workKeys, type FirmMember } from "./api";
import type { CaseStatus } from "@/shared/domain/case-status";

export type FirmJob = { ref: string; service: string; serviceSlug: string; client: string; status: CaseStatus; dueAt: string; assigneeId: string; assignee: string; earning: number; open: boolean };
export type FirmPayout = { month: string; gross: number; status: "pending" | "paid"; ref: string | null; breakdown: { id: string; name: string; amount: number }[] };
export type Firm = { org: string; account: string; members: (FirmMember & { removalRequested: boolean })[]; jobs: FirmJob[]; payouts: FirmPayout[] };

export const useFirm = () => useQuery({ queryKey: workKeys.firm(), queryFn: () => unwrap<Firm>(api.GET("/api/work/x/firm")), retry: false });

function useFirmMutation<B>(fn: (b: B) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: workKeys.all }) });
}
export const useInviteMember = () => useFirmMutation((b: { name: string; email: string; phone: string; services: string[] }) => unwrap<FirmMember>(api.POST("/api/work/x/firm/members", { body: b })));
export const useRequestRemoval = () => useFirmMutation((b: { id: string; reason: string }) => unwrap(api.POST("/api/work/x/firm/members/{id}/removal", { params: { path: { id: b.id } }, body: { reason: b.reason } })));
export const useAssignInternally = () => useFirmMutation((b: { ref: string; memberId: string }) => unwrap(api.POST("/api/work/x/firm/jobs/{code}/assign", { params: { path: { code: b.ref } }, body: { memberId: b.memberId } })));
