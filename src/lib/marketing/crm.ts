"use client";
// CRM lane hooks (plan 10 U9–U11): leads, tasks, notes, inbox, customers. Keys under mktKeys.crm(…).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toQuery } from "@/lib/api/query";
import { mktKeys } from "./api";
import type { ConsentState, Channel, CrmNote, CrmTask, InboxThread, Lead, LeadActivity, LeadSource, LostReason, Touch, Locale } from "@/shared/marketing/types";
import { api, unwrap } from "@/lib/api/client";
import { hdr } from "@/lib/marketing/api";

export type LeadKpi = { total: number; new: number; contacted: number; qualified: number; quote_sent: number; wonMonth: number; lost: number };
export type ConsentEvent = { channel: Channel; state: ConsentState; at: string; source: string };
export type LeadDetail = { lead: Lead; activities: LeadActivity[]; tasks: CrmTask[]; notes: CrmNote[]; duplicates: Lead[]; consentHistory: ConsentEvent[]; retentionAt: string; revenue: number };
export type LeadPatch = Partial<Pick<Lead, "stage" | "lostReason" | "lostNote" | "ownerId" | "nextActionAt" | "estimatedValue" | "tags" | "serviceInterest">>;
export type NewLead = { source: Exclude<LeadSource, "assistant">; // assistant leads are created server-side only
  name: string; org?: string; phone?: string; email?: string; language: Locale; serviceInterest: string[]; consent: Record<Channel, ConsentState>; nextActionAt: string; ownerId?: string; force?: boolean };
export type ImportRow = { i: number; data: { name: string; phone?: string; email?: string; org?: string; service?: string; consent: Record<Channel, ConsentState> }; errors: string[]; dupInFile: boolean; dupInCrm?: string };
export type CustomerRow = { id: string; name: string; org?: string; customerId?: string; language: Locale; sector: string; lifetime: number; lastActiveAt: string; consent: Record<Channel, ConsentState>; phoneMasked: string; leads: number; match?: "phone" | "email" | "both" };
export type TimelineEvent = { id: string; kind: "visit" | "form" | "booking" | "case" | "status" | "quote" | "invoice" | "payment" | "message" | "campaign" | "rating" | "note" | "account" | "ai"; title: string; at: string; meta?: string };
export type Customer360 = CustomerRow & {
  district: string; size: string; subscription?: string; ownerId?: string; spark: number[]; timeline: TimelineEvent[];
  cases: { ref: string; service: string; status: string; at: string }[]; comms: { id: string; channel: string; subject: string; at: string; dir: "in" | "out" }[];
  tasks: CrmTask[]; notes: CrmNote[]; firstTouch?: Touch; lastTouch?: Touch; recommended: string[]; related: { cases: number; messages: number; ratings: number; campaigns: number };
  leadIds: string[]; candidates: { id: string; name: string; by: "phone" | "email" | "both" }[];
};

const k = mktKeys.crm;
const useInvalidate = () => { const qc = useQueryClient(); return () => qc.invalidateQueries({ queryKey: k() }); };

export const useLeads = () => useQuery({ queryKey: k("leads"), queryFn: () => unwrap<{ items: Lead[]; kpi: LeadKpi }>(api.GET("/api/admin/crm/leads")), staleTime: 30_000 });
export const useLead = (id: string | null) => useQuery({ queryKey: k("lead", id), queryFn: () => unwrap<LeadDetail>(api.GET("/api/admin/crm/leads/{id}", { params: { path: { id: id! } } })), enabled: !!id });
export function usePatchLead() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: (v: { id: string; version: number; body: LeadPatch }) => unwrap<Lead>(api.PATCH("/api/admin/crm/leads/{id}", { params: { path: { id: v.id } }, body: v.body, headers: hdr({ ifMatch: v.version }) })), onSettled: inv });
}
export function useCreateLead() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: (v: NewLead) => unwrap<{ lead?: Lead; duplicates: Lead[] }>(api.POST("/api/admin/crm/leads", { body: v })), onSettled: inv });
}
export function useConvert() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: (v: { id: string; mode: "link" | "invite"; clientId?: string }) => unwrap<Lead>(api.POST("/api/admin/crm/leads/{id}/convert", { params: { path: { id: v.id } }, body: v })), onSettled: inv });
}
export function useMerge() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: (v: { survivorId: string; ids: string[] }) => unwrap<Lead>(api.POST("/api/admin/crm/leads/merge", { body: v })), onSettled: inv });
}
export function useBulk() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: (v: { ids: string[]; ownerId?: string; tag?: string }) => unwrap<{ updated: number }>(api.POST("/api/admin/crm/leads/bulk", { body: v })), onSettled: inv });
}
export const enrol = (ruleId: string, leadIds: string[]) => unwrap<{ enrolled: number }>(api.POST("/api/admin/crm/automations/{id}/enrol", { params: { path: { id: ruleId } }, body: { leadIds } }));
export const exportLeads = (ids: string[], reason: string) => unwrap<{ csv: string; count: number; masked: boolean }>(api.POST("/api/admin/crm/leads/export", { body: { ids }, headers: hdr({ reason }) }));
export const importPreview = (rows: Record<string, string>[], mapping: Record<string, string>) => unwrap<{ jobId: string; rows: ImportRow[] }>(api.POST("/api/admin/crm/leads/import", { body: { rows, mapping } }));
export const importConfirm = (jobId: string) => unwrap<{ created: number; skipped: number }>(api.POST("/api/admin/crm/leads/import/{job}/confirm", { params: { path: { job: jobId } } }));

export const useTasks = () => useQuery({ queryKey: k("tasks"), queryFn: () => unwrap<{ items: CrmTask[] }>(api.GET("/api/admin/crm/tasks")), staleTime: 30_000 });
export function useSaveTask() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: (v: Partial<CrmTask> & { id?: string }) => (v.id ? unwrap<CrmTask>(api.PATCH("/api/admin/crm/tasks/{id}", { params: { path: { id: v.id } }, body: { done: v.done, title: v.title, dueAt: v.dueAt } })) : unwrap<CrmTask>(api.POST("/api/admin/crm/tasks", { body: { subject: v.subject!, kind: v.kind, title: v.title!, dueAt: v.dueAt!, assigneeId: v.assigneeId } }))), onSettled: inv });
}
export function useAddNote() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: (v: { type: "lead" | "customer"; id: string; body: string; mentions: string[] }) => unwrap<CrmNote>(api.POST("/api/admin/crm/{type}/{id}/notes", { params: { path: { type: v.type, id: v.id } }, body: v })), onSettled: inv });
}
export function useLogActivity() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: (v: { id: string; kind: "call" | "message" | "email"; text: string }) => unwrap<LeadActivity>(api.POST("/api/admin/crm/leads/{id}/activity", { params: { path: { id: v.id } }, body: v })), onSettled: inv });
}

export const useInbox = () => useQuery({ queryKey: k("inbox"), queryFn: () => unwrap<{ items: InboxThread[] }>(api.GET("/api/admin/crm/inbox")), staleTime: 15_000, refetchInterval: 30_000 });
export function useReply() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: (v: { id: string; body?: string; template?: string }) => unwrap<InboxThread>(api.POST("/api/admin/crm/inbox/{id}/reply", { params: { path: { id: v.id } }, body: v })), onSettled: inv });
}
export function useThreadAction() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: (v: { id: string; action: "lead" | "assign" | "tag" | "read"; value?: string }) => unwrap<InboxThread & { lead?: Lead }>(api.POST("/api/admin/crm/inbox/{id}/{action}", { params: { path: { id: v.id, action: v.action } }, body: v })), onSettled: inv });
}

/** `leadId` asks the server to flag clients whose phone/email match that lead (convert dialog). */
export const useCustomers = (leadId?: string) =>
  useQuery({ queryKey: k("customers", leadId ?? ""), queryFn: () => unwrap<{ items: CustomerRow[] }>(api.GET("/api/admin/crm/customers", { params: { query: toQuery(leadId ? `?lead=${leadId}` : "") } })), staleTime: 30_000 });
export const useCustomer = (id: string) => useQuery({ queryKey: k("customer", id), queryFn: () => unwrap<Customer360>(api.GET("/api/admin/crm/customers/{id}", { params: { path: { id } } })) });
export type { LostReason };
