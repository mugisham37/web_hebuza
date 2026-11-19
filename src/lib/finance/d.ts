"use client";
// Stage 5 finance lane D hooks: U11 receivables + reminders, U12 refunds, credit notes, ops refund panel.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toQuery } from "@/lib/api/query";
import { finKeys } from "./api";
import type { Bucket } from "@/shared/finance/ageing";
import type { CreditNote, Invoice, Payment, RefundMethod, RefundReason, RefundRequest, UserRef } from "@/shared/finance/types";
import type { Locale } from "@/shared/i18n/config";
import { api, unwrap } from "@/lib/api/client";
import { hdr } from "@/lib/finance/api";

// ---------------------------------------------------------------- shapes
export type Channel = "email" | "whatsapp" | "sms";
export type Reminder = { at: string; channel: Channel; lang: Locale; by: string; scheduledFor?: string };
export type ArClient = {
  clientId: string; name: string; language: Locale; outstanding: number; buckets: Record<Bucket, number>; oldestDays: number;
  bucket: Bucket; credit: number; invoices: number; lastReminder?: Reminder; promise?: { at: string; note: string };
};
export type ArSummary = { asOf: string; total: number; overdue31: number; due0_30: number; over90: number; buckets: Record<Bucket, number>; clients: ArClient[] };
export type ArInvoice = Invoice & { bucket: Bucket; days: number; reminders: Reminder[] };
export type ArNote = { id: string; at: string; by: string; text: string; promiseAt?: string };
export type ArClientDetail = {
  client: { id: string; name: string; type: string; phone: string; email: string; language: Locale; consent: Record<Channel, boolean> };
  summary: ArClient; invoices: ArInvoice[]; payments: Payment[]; credits: CreditNote[]; notes: ArNote[];
};

export type RefundTab = "awaiting_me" | "requested" | "in_review" | "awaiting_executive" | "executing" | "completed" | "rejected" | "credit_notes";
export type RefundRow = RefundRequest & {
  clientName: string; tier: "finance" | "executive"; mine: boolean; eligiblePart: number; passThroughRefunded: number;
  changedFrom?: number; adjustedBy?: UserRef; rejectReason?: string; failReason?: string; note?: string;
  updatedBy?: string; updatedAt?: string; execStartedAt?: string; proofDocId?: string;
};
export type ImpactRow = { workerId: string; name: string; allocated: number; reversal: number; net: number; paidOut: boolean; voided: boolean };
export type RefundDetail = {
  refund: RefundRow; invoice: Invoice; policy: Record<string, number>; refundable: number; limit: number; impact: ImpactRow[];
  payer: { masked: string }; creditNote: CreditNote | null; locked: boolean;
  can: { sign: boolean; signReason?: "complete" | "same_approver" | "forbidden"; execute: boolean; adjust: boolean; reject: boolean; review: boolean };
};
export type CreditNoteDetail = CreditNote & { clientName: string; refund?: RefundRow; invoiceTotal: number; outcome: "balance" | "credit" | "refund" };

export const dKeys = {
  ar: () => [...finKeys.all, "receivables"] as const,
  arClient: (id: string) => [...finKeys.all, "receivables", "client", id] as const,
  refunds: (q: string) => [...finKeys.all, "refunds", q] as const,
  refund: (no: string) => [...finKeys.all, "refund", no] as const,
  cns: () => [...finKeys.all, "credit-notes"] as const,
  cn: (no: string) => [...finKeys.all, "credit-note", no] as const,
};

// ---------------------------------------------------------------- receivables
export const useReceivables = () => useQuery({ queryKey: dKeys.ar(), queryFn: () => unwrap<ArSummary>(api.GET("/api/finance/reports/receivables-ageing")) });
export const useArClient = (id: string | null) =>
  useQuery({ queryKey: dKeys.arClient(id ?? ""), enabled: !!id, queryFn: () => unwrap<ArClientDetail>(api.GET("/api/finance/x/receivables/clients/{id}", { params: { path: { id: id! } } })) });

function useInvalidating<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: finKeys.all }) });
}
export type RemindInput = { invoiceNo: string; channel: Channel; lang: Locale; template: string; text: string; idempotencyKey: string };
export const useRemind = () =>
  useInvalidating((v: RemindInput) => unwrap<Reminder>(api.POST("/api/finance/invoices/{key}/remind", { params: { path: { key: v.invoiceNo } }, body: v, headers: hdr({ idempotencyKey: v.idempotencyKey }) })));
export const useArNote = () =>
  useInvalidating((v: { clientId: string; text: string; promiseAt?: string; idempotencyKey: string }) =>
    unwrap<ArNote>(api.POST("/api/finance/x/receivables/clients/{id}/notes", { params: { path: { id: v.clientId } }, body: v, headers: hdr({ idempotencyKey: v.idempotencyKey }) })));

// ---------------------------------------------------------------- refunds
export const useRefunds = (q: { tab?: RefundTab; caseRef?: string }) => {
  const qs = q.caseRef ? `case=${encodeURIComponent(q.caseRef)}` : `tab=${q.tab ?? "awaiting_me"}`;
  return useQuery({
    queryKey: dKeys.refunds(qs),
    queryFn: () => unwrap<{ items: RefundRow[]; counts: Record<RefundTab, number> }>(api.GET("/api/finance/refund-requests", { params: { query: toQuery(qs) } })),
    refetchInterval: 30_000,
  });
};
export const useRefund = (no: string) =>
  useQuery({
    queryKey: dKeys.refund(no),
    queryFn: () => unwrap<RefundDetail>(api.GET("/api/finance/refund-requests/{no}", { params: { path: { no: no } } })),
    // Poll while the provider disbursement runs (≤ 2 min); otherwise the shared 30 s cadence elsewhere is enough.
    refetchInterval: (q) => (q.state.data?.refund.status === "executing" ? 2000 : false),
  });
type K = { no: string; idempotencyKey: string; rev: number };
export const useRefundReview = () =>
  useInvalidating((v: K & { decision: "recommend" | "reject"; amount?: number; note: string }) => unwrap<RefundRow>(api.POST("/api/finance/refund-requests/{no}/review", { params: { path: { no: v.no } }, body: v, headers: hdr({ idempotencyKey: v.idempotencyKey }) })));
export type AdjustInput = K & { amount: number; spent: boolean; method: RefundMethod; destination?: string; note: string };
export const useRefundAdjust = () => useInvalidating((v: AdjustInput) => unwrap<RefundRow>(api.POST("/api/finance/refund-requests/{no}/adjust", { params: { path: { no: v.no } }, body: v, headers: hdr({ idempotencyKey: v.idempotencyKey }) })));
export const useRefundApprove = () =>
  useInvalidating((v: K & { stepUp: string }) => unwrap<RefundRow>(api.POST("/api/finance/refund-requests/{no}/approve", { params: { path: { no: v.no } }, body: { rev: v.rev }, headers: hdr({ idempotencyKey: v.idempotencyKey, stepUp: v.stepUp }) })));
export const useRefundReject = () =>
  useInvalidating((v: K & { reason: string; note: string }) => unwrap<RefundRow>(api.POST("/api/finance/refund-requests/{no}/reject", { params: { path: { no: v.no } }, body: v, headers: hdr({ idempotencyKey: v.idempotencyKey, reason: v.reason }) })));
export const useRefundExecute = () =>
  useInvalidating((v: K & { stepUp: string; method: RefundMethod; proofName?: string; proofUploadId?: string }) =>
    unwrap<RefundRow>(api.POST("/api/finance/refund-requests/{no}/execute", { params: { path: { no: v.no } }, body: { rev: v.rev, method: v.method, proofName: v.proofName, proofUploadId: v.proofUploadId }, headers: hdr({ idempotencyKey: v.idempotencyKey, stepUp: v.stepUp }) })));
export const useRefundCreate = () =>
  useInvalidating((v: { invoiceNo: string; reason: RefundReason; note: string; idempotencyKey: string }) =>
    unwrap<RefundRow>(api.POST("/api/finance/refund-requests", { body: v, headers: hdr({ idempotencyKey: v.idempotencyKey }) })));
/** Paid invoices a refund can be raised on (create-on-behalf picker). */
export const useRefundable = (enabled: boolean) =>
  useQuery({ queryKey: [...finKeys.all, "refundable"], enabled, queryFn: () => unwrap<{ items: { no: string; clientName: string; refundable: number }[] }>(api.GET("/api/finance/x/refundable-invoices")) });

// ---------------------------------------------------------------- credit notes
export const useCreditNotes = (enabled = true) =>
  useQuery({ queryKey: dKeys.cns(), enabled, queryFn: () => unwrap<{ items: CreditNoteDetail[] }>(api.GET("/api/finance/credit-notes")) });
export const useCreditNote = (no: string) =>
  useQuery({ queryKey: dKeys.cn(no), queryFn: () => unwrap<CreditNoteDetail>(api.GET("/api/finance/credit-notes/{no}", { params: { path: { no: no } } })) });
