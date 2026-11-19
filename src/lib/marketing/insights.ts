"use client";
// Lane insights hooks: dashboard summary, report tabs, testimonials, feedback analytics, referrals.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toQuery } from "@/lib/api/query";
import { api, unwrap } from "@/lib/api/client";
import { mktKeys, qs } from "./api";
import type { AutomationRule, Referral, Referrer, Testimonial } from "@/shared/marketing/types";
import { hdr } from "@/lib/marketing/api";

export type Range = { range: string; from?: string; to?: string };
const rq = (r: Range, extra: Record<string, string | undefined> = {}) => qs({ range: r.range, from: r.range === "custom" ? r.from : undefined, to: r.range === "custom" ? r.to : undefined, ...extra });

export type Kpi = { value: number; prev: number; spark: number[] };
export type FunnelRow = { key: "visits" | "leads" | "consultations" | "requests" | "paid"; count: number; stepPct: number | null; ofVisits: number | null };
export type CampaignRow = {
  id: string; name: string; slug: string; channel: string; source: string; leads: number; consultations: number; requests: number; paid: number;
  revenue: number; cost: number; cpl: number | null; roi: number | null;
  chain?: { leadId: string; leadName: string; client: string; invoiceNo: string; total: number; paidAt: string }[];
};
export type Summary = {
  range: string; days: number; generatedAt: string; firstWeek: boolean; ga4Connected: boolean; trafficError: string | null;
  kpis: { visitors: Kpi | null; leads: Kpi; consultations: Kpi; paidClients: Kpi; revenue: Kpi };
  funnel: FunnelRow[]; bySource: { source: string; leads: number }[]; topPages: { path: string; views: number }[]; topServices: { slug: string; leads: number }[];
  campaigns: CampaignRow[]; attention: { newLeads: number; awaitingApproval: number; brokenLinks: number; pausedBudget: number };
  recent: { id: string; kind: string; text: string; sub: string; at: string; href: string }[];
  next: { id: string; label: string; status: string; at: string | null; href: string } | null;
};
export const useSummary = (r: Range) =>
  useQuery({ queryKey: mktKeys.rpt("summary", r), queryFn: () => unwrap<Summary>(api.GET("/api/admin/mkt/summary", { params: { query: toQuery(rq(r)) } })), staleTime: 5 * 60_000 });

/** Lane campaigns owns automations; the dashboard only reads and toggles. `waiting` is optional in their payload. */
export type AutoRow = AutomationRule & { waiting?: number };
export const useActiveAutomations = () =>
  useQuery({ queryKey: mktKeys.cmp("automations", "active"), queryFn: () => unwrap<{ items: AutoRow[] }>(api.GET("/api/admin/crm/automations", { params: { query: { active: "1" } } })) });
export function useToggleAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<AutomationRule>(api.POST("/api/admin/crm/automations/{id}/toggle", { params: { path: { id } } })),
    onSettled: () => qc.invalidateQueries({ queryKey: mktKeys.cmp("automations") }),
  });
}

export type Tab = "funnel" | "campaigns" | "leads" | "traffic" | "social" | "clients";
export const useAnalytics = <T,>(tab: Tab, r: Range, model: string, extra: Record<string, string | undefined> = {}) =>
  useQuery({ queryKey: mktKeys.rpt(tab, r, model, extra), queryFn: () => unwrap<T & { generatedAt: string }>(api.GET("/api/admin/crm/analytics/{tab}", { params: { path: { tab }, query: toQuery(rq(r, { model, ...extra })) } })), staleTime: 5 * 60_000 });

/** PII-bearing export: the reason travels in the audited X-Audit-Reason header. */
export const exportWithReason = (report: string, format: string, r: Range, model: string, reason: string) => {
  return unwrap<{ queued: boolean; csv: string | null; filename: string | null }>(api.GET("/api/admin/reports/export", { params: { query: toQuery(rq(r, { report, format, model })) }, headers: { "X-Audit-Reason": encodeURIComponent(reason) } }));
};

export type SocialRow = { id: string; date: string; network: string; campaign: string; reach: number; impressions: number; engagements: number; clicks: number; followers: number; spend: number; utmMatch: string | null };
export const importSocial = (csv: string) => unwrap<{ id: string; rows: { line: number; error: string | null; row: SocialRow }[] }>(api.POST("/api/admin/crm/social-metrics/import", { body: { csv } }));
export const confirmSocial = (id: string, key: string) => unwrap<{ created: number }>(api.POST("/api/admin/crm/social-metrics/import/{id}/confirm", { params: { path: { id } }, headers: hdr({ idempotencyKey: key }) }));
export const addSocial = (row: Omit<SocialRow, "id" | "utmMatch">) => unwrap<SocialRow>(api.POST("/api/admin/crm/social-metrics", { body: row }));

export const useTestimonials = (status: string) =>
  useQuery({ queryKey: mktKeys.rpt("testimonials", status), queryFn: () => unwrap<{ items: Testimonial[]; counts: Record<string, number> }>(api.GET("/api/admin/fbk/testimonials", { params: { query: toQuery(qs({ status })) } })), staleTime: 30_000 });
export function useTestimonialAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; action: "approve" | "reject" | "unpublish" | "request-consent" | "excerpt" | "simulate-consent"; body?: unknown }) =>
      unwrap<Testimonial>(api.POST("/api/admin/fbk/testimonials/{id}/{action}", { params: { path: { id: v.id, action: v.action } }, body: v.body ?? {} })),
    onSettled: () => { qc.invalidateQueries({ queryKey: mktKeys.rpt("testimonials") }); qc.invalidateQueries({ queryKey: mktKeys.shell() }); },
  });
}

export type Feedback = {
  generatedAt: string; total: number; avg: number | null; nps: number | null; npsMin: number;
  byService: { service: string; avg: number | null; n: number }[]; themes: { tag: string; n: number }[]; services: string[];
  recent: Testimonial[]; distribution: { stars: number; n: number }[];
};
export const useFeedback = (r: Range, service?: string) =>
  useQuery({ queryKey: mktKeys.rpt("feedback", r, service), queryFn: () => unwrap<Feedback>(api.GET("/api/admin/fbk/analytics", { params: { query: toQuery(rq(r, { service })) } })), staleTime: 5 * 60_000 });

export type Programme = { active: boolean; reward: number; eligibility: "first_paid_request"; channels: string[]; updatedAt: string };
/** F-CMS-08: "Was this helpful?" votes per CMS entry (all-time; the route takes no range). */
export const useContentFeedback = () => useQuery({ queryKey: mktKeys.rpt("cms-feedback"), queryFn: () => unwrap<{ items: { type: string; key: string; yes: number; no: number }[] }>(api.GET("/api/admin/cms/feedback")), retry: false });
export const useProgramme = () => useQuery({ queryKey: mktKeys.rpt("programme"), queryFn: () => unwrap<Programme>(api.GET("/api/admin/crm/referrals/programme")) });
export function useSaveProgramme() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (b: Partial<Programme>) => unwrap<Programme>(api.PATCH("/api/admin/crm/referrals/programme", { body: { ...b, channels: b.channels as ("client" | "agent")[] | undefined } })), onSettled: () => qc.invalidateQueries({ queryKey: mktKeys.rpt("programme") }) });
}
export const useReferrals = () =>
  useQuery({ queryKey: mktKeys.rpt("referrals"), queryFn: () => unwrap<{ referrers: Referrer[]; referrals: Referral[]; fraud: { selfBlocked: number; ineligible: number }; totalDue: number }>(api.GET("/api/admin/crm/referrals")) });

