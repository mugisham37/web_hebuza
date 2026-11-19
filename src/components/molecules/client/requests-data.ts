"use client";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap, ApiError } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import type * as C from "@/lib/client/types";
import {
  CASE_STATUSES,
  CASE_STATUS_META,
  LEGACY_STATUS,
  type CaseStatus,
  type ExternalOutcome,
} from "@/shared/domain/case-status";

export type RequestSummary =
  C.ApplicationSummaryResponse & { group_code?: string | null };

// shortcut: needs/timeline/payments/deliverables are mock-only extensions of the detail + ★GET /api/me/dashboard (spec CLP §11);
// drop these types for schema ones once the server ships them.
export type Need = {
  id: string;
  kind: "document" | "payment" | "quote";
  code: string;
  service: string;
  label: string;
  dueAt?: string | null;
  amount?: number | null;
  done?: boolean;
};
export type Step = {
  id: string;
  title: string;
  at?: string | null;
  state: "done" | "current" | "upcoming";
  note?: string | null;
};
export type Payment = {
  id: string;
  label: string;
  amount: number;
  status: "due" | "paid";
  code: string;
  service: string;
  dueAt?: string | null;
  paidAt?: string | null;
};
export type Deliverable = {
  id: string;
  name: string;
  size: number;
  released: boolean;
  at?: string | null;
};
export type RequestDetail =
  C.ApplicationDetailResponse & {
    timeline?: Step[];
    needs?: Need[];
    payments?: Payment[];
    deliverables?: Deliverable[];
    outcome?: ExternalOutcome;
  };
export type Dashboard = {
  needs: Need[];
  requests: RequestSummary[];
  paymentsDue: Payment[];
  unread: number;
  openQuotes?: { code: string; service: string }[];
  releasedDeliverables?: { id: string; code: string; title: string; at: string }[];
  deadlines?: { code: string; service: string; dueAt: string }[];
};

/** Server may still send legacy status strings (REQ migration). */
export const toStatus = (s: string): CaseStatus =>
  (CASE_STATUSES as readonly string[]).includes(s)
    ? (s as CaseStatus)
    : (LEGACY_STATUS[s] ?? "received");

export type Bucket = "action" | "active" | "done" | "closed";
export function bucket(s: string): Bucket {
  const st = toStatus(s);
  const m = CASE_STATUS_META[st];
  if (m.waitingOnClient) return "action";
  if (m.terminal || st === "refund_requested") return "closed";
  return st === "completed_delivered" ? "done" : "active";
}

export const useDashboard = () =>
  useQuery({
    queryKey: ["c2", "dashboard"],
    queryFn: () => unwrap<Dashboard>(api.GET("/api/me/dashboard")),
  });
export const useRequests = () =>
  useQuery({
    queryKey: ["c2", "requests"],
    queryFn: async () =>
      (await unwrap<components["schemas"]["ApplicationListResponse"]>(api.GET("/api/applications"))).applications,
  });
export const useRequest = (code: string) =>
  useQuery({
    queryKey: ["c2", "request", code],
    queryFn: () =>
      unwrap<RequestDetail>(
        api.GET("/api/applications/{code}", { params: { path: { code } } }),
      ) as Promise<RequestDetail>,
    retry: (n, e) => !(e instanceof ApiError && e.isNotFound) && n < 2,
  });
