"use client";
// Lane CAMPAIGNS hooks (plan 10 U12–U15): segments, campaigns, sequences, templates. Keys under mktKeys.cmp.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toQuery } from "@/lib/api/query";
import { mktKeys, qs } from "./api";
import type { AutomationRule, AutomationRun, Campaign, Channel, Contact, ExcludedReason, Locale, MsgTemplate, SegGroup, Segment } from "@/shared/marketing/types";
import { api, unwrap } from "@/lib/api/client";
import { hdr } from "@/lib/marketing/api";

/** GET /api/admin/crm/campaigns/:id — the campaign plus live audience, budget and approval facts (marketing.campaigns.ts view()). */
export type CampaignView = Campaign & {
  live: { count: number; eligible: number; excluded: Record<ExcludedReason, number>; languages: Record<Locale, number> };
  budget: Budget; approvalNeeded: boolean; approvalReason: "recipients" | "budget" | "cost" | null;
  timeline: { status: string; at: string; by?: string; note?: string }[]; consentDelta: number; budgetApproved: boolean;
  segmentName: string; createdByName?: string; approvedByName?: string; approverName?: string; mine: boolean; unitCost: number;
};
export type SegmentPreview = { count: number; eligible: number; excluded: Record<ExcludedReason, number>; sample: { id: string; name: string; phone: string; language: Locale; consent: Contact["consent"] }[]; languages: Record<Locale, number> };
export type Budget = { spent: number; cap: number; estimate: number; state: "ok" | "warn" | "block" };
export type Recipient = { id: string; name: string; phone: string; language: Locale; state: string };
export type SequenceRow = AutomationRule & { waiting: number };
export type InactiveRule = { days: number; count: number; consent: Record<Channel, number>; sequenceId: string; templates: MsgTemplate[] };

const LIST = { staleTime: 30_000 };
export const useSegments = () => useQuery({ queryKey: mktKeys.cmp("segments"), queryFn: () => unwrap<{ items: (Segment & { createdByName?: string })[] }>(api.GET("/api/admin/crm/segments")), ...LIST });
export const useSegment = (id: string) => useQuery({ queryKey: mktKeys.cmp("segment", id), queryFn: () => unwrap<Segment>(api.GET("/api/admin/crm/segments/{id}", { params: { path: { id } } })), enabled: id !== "new" });
export const useSegmentPreview = (definition: SegGroup, channel: Channel) =>
  useQuery({ queryKey: mktKeys.cmp("preview", JSON.stringify(definition), channel), queryFn: () => unwrap<SegmentPreview>(api.POST("/api/admin/crm/segments/preview", { body: { definition, channel } })), placeholderData: (p) => p });

export const useCampaigns = (status?: string) =>
  useQuery({ queryKey: mktKeys.cmp("campaigns", status ?? "all"), queryFn: () => unwrap<{ items: CampaignView[]; budget: Budget }>(api.GET("/api/admin/crm/campaigns", { params: { query: toQuery(qs({ status })) } })), ...LIST });
/** Polls while sending/scheduled: the send job advances each campaign once a minute (throttle per tick). */
export const useCampaign = (id: string | null) =>
  useQuery({
    queryKey: mktKeys.cmp("campaign", id), queryFn: () => unwrap<CampaignView>(api.GET("/api/admin/crm/campaigns/{id}", { params: { path: { id: id! } } })), enabled: !!id,
    refetchInterval: (q) => (q.state.data?.status === "sending" || q.state.data?.status === "scheduled" ? 10_000 : false),
  });
export const useRecipients = (id: string, state?: string) =>
  useQuery({ queryKey: mktKeys.cmp("recipients", id, state ?? ""), queryFn: () => unwrap<{ items: Recipient[]; total: number }>(api.GET("/api/admin/crm/campaigns/{id}/recipients", { params: { path: { id }, query: toQuery(qs({ state })) } })) });

export const useTemplates = (o: { channel?: string; status?: string; category?: string } = {}) =>
  useQuery({ queryKey: mktKeys.cmp("templates", o), queryFn: () => unwrap<{ items: MsgTemplate[] }>(api.GET("/api/admin/notification-templates", { params: { query: toQuery(qs(o)) } })), ...LIST });
export const useSequences = () => useQuery({ queryKey: mktKeys.cmp("sequences"), queryFn: () => unwrap<{ items: SequenceRow[]; excludedNoWa: number; inactiveDays: number }>(api.GET("/api/admin/crm/automations")), ...LIST });
export const useSequence = (id: string) => useQuery({ queryKey: mktKeys.cmp("sequence", id), queryFn: () => unwrap<SequenceRow>(api.GET("/api/admin/crm/automations/{id}", { params: { path: { id } } })), enabled: id !== "new" });
export const useRuns = (id: string) => useQuery({ queryKey: mktKeys.cmp("runs", id), queryFn: () => unwrap<{ items: AutomationRun[] }>(api.GET("/api/admin/crm/automations/{id}/runs", { params: { path: { id } } })), enabled: id !== "new" });
export const useInactiveRule = () => useQuery({ queryKey: mktKeys.cmp("inactive"), queryFn: () => unwrap<InactiveRule>(api.GET("/api/admin/crm/inactive-rule")) });

/** One mutation hook for every write; invalidates the lane on settle. */
export function useCmpMutation<V, R = unknown>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: mktKeys.cmp() }) });
}
export const exportRecipients = (id: string, reason: string) => unwrap<{ csv: string; count: number; masked: boolean }>(api.POST("/api/admin/crm/campaigns/{id}/recipients/export", { params: { path: { id } }, headers: hdr({ reason }) }));
