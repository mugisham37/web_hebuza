"use client";
// Stage 8 external-agent data layer (plan §9). Shared /api/agent/x/* hooks stay in lib/agent; this file holds the
// external-only types and the summary.external block. Lanes add hooks in lib/work/<lane>.ts via api + unwrap.
import { api, unwrap } from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";
import { putPresigned } from "@/lib/api/upload";
import { useSummary, type Summary } from "@/lib/agent/api";

/** Server writes that take a file answer with a presigned PUT; send the bytes straight to storage. */
export type WithUpload<T> = T & { upload?: { url: string | null; key: string } };
export async function putUpload<T>(res: WithUpload<T>, file?: File | null): Promise<T> {
  if (file && res.upload?.url) {
    await putPresigned(res.upload.url, file, file.type || "application/octet-stream");
  }
  return res;
}

export const workKeys = {
  all: ["agent"] as const, // same root as agentKeys so one invalidate refreshes both
  scope: (ref: string) => ["agent", "work", "scope", ref] as const,
  contract: () => ["agent", "work", "contract"] as const,
  firm: () => ["agent", "work", "firm"] as const,
  lane: (lane: string, ...k: string[]) => ["agent", "work", lane, ...k] as const,
};

export type WorkerStatus =
  | "onboarding"
  | "pending_verification"
  | "changes_requested"
  | "cleared"
  | "suspended"
  | "terminated";
export type ServiceClearance = "cleared" | "not_cleared" | "pending";
export type LicenceInvoice = {
  number: string;
  period: string;
  amount: number;
  due: string;
  status: "due" | "paid" | "overdue" | "netted" | "waived";
};
export type External = {
  status: WorkerStatus;
  firmRole: "admin" | "member" | null;
  firm: string | null;
  contractEnd: string | null;
  contractState: "active" | "expiring" | "expired" | "notice_given" | "pending_signature";
  licence: LicenceInvoice | null;
  services: { slug: string; name: string; state: ServiceClearance; reason?: string }[];
  lastPayout: { amount: number; at: string } | null;
  manager: string;
  /** onboarding items still to do, in order (identity … review) */
  todo: string[];
};
export type ExtSummary = Summary & { external?: External };

/** summary.external, or undefined for internal agents / while loading. */
export function useExternal() {
  const s = useSummary();
  return { ...s, ext: (s.data as ExtSummary | undefined)?.external };
}

export type Application = {
  ref: string;
  status: "received" | "under_review" | "info_requested" | "approved" | "rejected" | "invite_expired" | "converted";
  kind: "individual" | "firm";
  name: string;
  submittedAt: string;
  flaggedFields?: string[];
  decisionNote?: string;
};
export type Credential = {
  id: string;
  kind: "degree" | "certificate" | "license" | "professional_body";
  title: string;
  issuer: string;
  number: string;
  issuedOn: string;
  expiresOn: string | null;
  status: "pending" | "verified" | "rejected" | "expired";
  note?: string;
  fileName: string;
  services: string[];
};
export type ContractDoc = {
  id: string;
  kind: "service_agreement" | "sla" | "nda" | "licence";
  title: string;
  version: number;
  status: "pending_signature" | "active" | "expiring" | "expired" | "renewed" | "terminated";
  start: string;
  end: string | null;
  noticeDays: number;
  terms: string[];
  signedAt?: string;
  evidence?: { ip: string; sha256: string; typedName: string };
};
export type RateCardRow = {
  serviceId: string;
  serviceName: string;
  bps?: number;
  flat?: number;
  from: string;
  status: "approved" | "proposed" | "rejected";
  reason?: string;
};
export type Statement = {
  month: string;
  number: string;
  gross: number;
  adjustments: number;
  licence: number;
  taxable: number;
  wht: number;
  net: number;
  carry: number;
  status: "ready" | "generating";
  jobs: { ref: string; service: string; eligible: number; rate: string; share: number }[];
};
export type JobScope = {
  sharedDocIds: string[];
  sharedFields: string[];
  lockedDocs: number;
  clientLane: boolean;
  active: boolean;
  instructionsVersion: number;
  agreed: { amount: number; bps?: number; flat?: number };
  accessEndedAt?: string;
  accessEndedReason?: "closed" | "reassigned" | "handback" | "terminated";
  handback?: { reason: string; at: string };
};
export type AccessRequest = {
  id: string;
  ref: string;
  docLabel?: string;
  reason: string;
  note?: string;
  status: "pending" | "granted" | "denied";
  at: string;
};
export type FirmMember = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  status: WorkerStatus;
  activeJobs: number;
  services: string[];
};

/** GET /api/work/x/scope/{ref}: what an external may see on one job (404 when not assigned). */
export const useJobScope = (ref: string, enabled = true) =>
  useQuery({
    queryKey: workKeys.scope(ref),
    queryFn: () => unwrap<JobScope>(api.GET("/api/work/x/scope/{ref}", { params: { path: { ref: ref } } })),
    enabled,
    retry: false,
  });
