"use client";
// Stage 5 finance lane B hooks (quotes, invoices, credit, renewals). Keys under ["finance", "b", …].
// Mutations take the Idempotency-Key from the opening dialog/page and invalidate finKeys.all (shell badges refresh).
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toQuery } from "@/lib/api/query";
import type { Locale } from "@/shared/i18n/config";
import { finKeys } from "./api";
import type { CreditNote, DocLine, Invoice, Payment, Quote, Series, UserRef } from "@/shared/finance/types";
import { api, unwrap, type ApiCall } from "@/lib/api/client";
import { hdr } from "@/lib/finance/api";

export type BillKind = "company" | "individual";
export type QuoteRec = Quote & {
  clientName: string; service: string; kind: BillKind; notes: Record<Locale, string>; terms: Record<Locale, string>;
  deposit: { deposit: number; balance: number } | null; invoiceNos?: string[];
};
export type QuoteRow = QuoteRec;
export type QuoteDetail = {
  versions: QuoteRec[]; history: { v: number; status: string; at: string; note?: string }[];
  changedBy?: UserRef; changedAt?: string; threshold: number; validityDays: number;
};
export type CaseOption = { ref: string; clientId: string; clientName: string; service: string };
export type Reminder = { at: string; channel: "email" | "whatsapp" | "sms"; by: string; auto?: boolean };
export type InvoiceRow = Invoice & { key: string; clientName: string; ebmRequired: boolean };
export type InvoiceDetail = {
  invoice: InvoiceRow; payments: Payment[]; creditNotes: CreditNote[]; credit: number; reminders: Reminder[]; lang: Locale;
  quoteNo?: string; changedBy?: UserRef; changedAt?: string; statement: { at: string; label: string; amount: number }[]; confirmedPayments: boolean;
};
type Page<T> = { items: T[]; meta: { total: number; page: number; pages: number } };

export const bKeys = {
  quotes: (qs: string) => ["finance", "b", "quotes", qs] as const,
  quote: (no: string) => ["finance", "b", "quote", no] as const,
  cases: () => ["finance", "b", "cases"] as const,
  invoices: (qs: string) => ["finance", "b", "invoices", qs] as const,
  invoice: (key: string) => ["finance", "b", "invoice", key] as const,
  form: () => ["finance", "b", "invoice-form"] as const,
};

export const useQuotes = (qs: string) =>
  useQuery({ queryKey: bKeys.quotes(qs), queryFn: () => unwrap<Page<QuoteRow> & { counts: Record<string, number> }>(api.GET("/api/finance/quotations", { params: { query: toQuery(qs) } })), placeholderData: keepPreviousData, refetchInterval: 30_000 });
export const useQuote = (no: string) =>
  useQuery({ queryKey: bKeys.quote(no), queryFn: () => unwrap<QuoteDetail>(api.GET("/api/finance/quotations/{no}", { params: { path: { no: no } } })), enabled: no !== "new" });
export const useQuoteCases = (on = true) =>
  useQuery({ queryKey: bKeys.cases(), queryFn: () => unwrap<{ items: CaseOption[] }>(api.GET("/api/finance/quotations/x/cases")), enabled: on, staleTime: 60_000 });
export const useInvoices = (qs: string) =>
  useQuery({
    queryKey: bKeys.invoices(qs), placeholderData: keepPreviousData, refetchInterval: 30_000,
    queryFn: () => unwrap<Page<InvoiceRow> & { meta: { totals: { total: number; paid: number; balance: number }; clients: { id: string; name: string }[] } }>(api.GET("/api/finance/invoices", { params: { query: toQuery(qs) } })),
  });
export const useInvoice = (key: string) =>
  useQuery({ queryKey: bKeys.invoice(key), queryFn: () => unwrap<InvoiceDetail>(api.GET("/api/finance/invoices/{key}", { params: { path: { key: key } } })) });
export const useInvoiceForm = () =>
  useQuery({
    queryKey: bKeys.form(), staleTime: 60_000,
    queryFn: () => unwrap<{ clients: { id: string; name: string; type: BillKind }[]; cases: CaseOption[]; termsDays: number; today: string }>(api.GET("/api/finance/invoices/x/form")),
  });

/** One mutation hook for every lane-B action: `act({ path, body, key, stepUp? })`. Invalidates all finance queries. */
export function useBAction<T = unknown>(_method: "post" | "patch" = "post") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { req: ApiCall; key?: string; stepUp?: string; reason?: string }) =>
      unwrap<T>(v.req(hdr({ idempotencyKey: v.key, stepUp: v.stepUp, reason: v.reason }))),
    onSettled: () => qc.invalidateQueries({ queryKey: finKeys.all }),
  });
}

/** Lines + header the quote autosave sends. */
export type QuoteDraftPatch = { rev: number; lines?: DocLine[]; lang?: Locale; validUntil?: string; kind?: BillKind; tin?: string; notes?: Record<Locale, string>; terms?: Record<Locale, string> };
export type NewInvoiceBody = { clientId: string; caseRef?: string; series: Series; lines: DocLine[]; dueAt: string; lang: Locale };
