"use client";
// Lane A+B hooks: reports (ageing, spend, export audit), vendors, contracts, deposits & advances.
import { useQuery } from "@tanstack/react-query";
import { toQuery } from "@/lib/api/query";
import { useProcMutation } from "./api";
import type { Advance, AdvanceKind, BankChange, BankKind, BudgetCategory, Contact, Contract, Vendor, VendorPayment, VendorType } from "@/shared/procurement/types";
import { api, unwrap } from "@/lib/api/client";
import { hdr } from "@/lib/finance/api";

export type VendorRow = Vendor & { locked: boolean };
export type ContractRow = Contract & { vendorName: string; noticeOn: string; nextReminder?: string; snoozed: boolean };
export type VendorDetail = {
  vendor: VendorRow; contracts: ContractRow[]; payments: VendorPayment[]; advances: Advance[]; bankChange: BankChange | null;
  bills: { no: string; vendorInvoiceNo: string; dueOn: string; total: number; open: number; status: string }[];
};
export type DepositRow = Advance & { vendorName: string; overdueDays: number };
export type OpenBill = { no: string; vendorId: string; total: number; payable: number; vendorInvoiceNo: string };
export type Statement = {
  vendor: { id: string; code: string; legalName: string; email: string | null }; from: string; to: string; opening: number; billed: number; paid: number; closing: number;
  rows: { date: string; ref: string; text: string; debit: number; credit: number }[];
};
export type Ageing = {
  asOf: string; total: number; totals: Record<string, number>;
  vendors: { vendorId: string; name: string; buckets: Record<string, number>; total: number }[];
  bills: { no: string; vendorName: string; vendorInvoiceNo: string; dueOn: string; open: number; bucket: string; status: string }[];
};
export type Spend = {
  from: string; to: string; paid: number; months: { month: string; spend: number; budget: number }[];
  categories: (BudgetCategory & { available: number; pct: number })[]; vendors: { vendorId: string; name: string; total: number }[];
};
export type VendorInput = {
  legalName: string; tradingName?: string; type: VendorType; tin: string; rdbNumber?: string; categories: string[]; contacts: Contact[]; address?: string;
  paymentTermsDays: number; vatRegistered: boolean; rating?: number; bank?: { kind: BankKind; label: string; number: string };
};
type K = { idempotencyKey?: string; stepUp?: string; reason?: string };

const qs = (o: Record<string, string | undefined | null>) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries(o)) if (v) p.set(k, v); const s = p.toString(); return s ? `?${s}` : ""; };
export const useVendors = (f: Record<string, string | null> = {}) =>
  useQuery({ queryKey: ["procure", "vendors", f], queryFn: () => unwrap<{ items: VendorRow[]; total: number }>(api.GET("/api/procurement/vendors", { params: { query: toQuery(qs(f)) } })) });
export const useVendor = (id: string) => useQuery({ queryKey: ["procure", "vendor", id], queryFn: () => unwrap<VendorDetail>(api.GET("/api/procurement/vendors/{id}", { params: { path: { id: id } } })), retry: false });
export const checkDuplicate = (tin: string, name: string, except?: string) =>
  unwrap<{ matches: { id: string; code: string; name: string; why: "tin" | "name" }[] }>(api.GET("/api/procurement/vendors/check-duplicate", { params: { query: toQuery(qs({ tin, name, except })) } }));
export const useStatement = (id: string, from: string, to: string, enabled = true) =>
  useQuery({ queryKey: ["procure", "statement", id, from, to], queryFn: () => unwrap<Statement>(api.GET("/api/procurement/vendors/{id}/statement", { params: { path: { id }, query: toQuery(qs({ from, to })) } })), enabled: enabled && !!id });
export const useContracts = (f: Record<string, string | null> = {}) =>
  useQuery({ queryKey: ["procure", "contracts", f], queryFn: () => unwrap<{ items: ContractRow[] }>(api.GET("/api/procurement/contracts", { params: { query: toQuery(qs(f)) } })) });
export const useContract = (id: string) =>
  useQuery({
    queryKey: ["procure", "contract", id], retry: false,
    queryFn: () => unwrap<{ contract: ContractRow; vendor: Vendor | null; deposit: Advance | null; escalated: number; bills: { no: string; invoiceDate: string; total: number; status: string }[]; versions: { id: string; ref: string; startOn: string; endOn: string; amount: number; status: string }[] }>(api.GET("/api/procurement/contracts/{id}", { params: { path: { id: id } } })),
  });
export const useDeposits = () => useQuery({ queryKey: ["procure", "deposits"], queryFn: () => unwrap<{ items: DepositRow[]; openBills: OpenBill[] }>(api.GET("/api/procurement/deposits")) });
export const useAgeing = (asOf: string) => useQuery({ queryKey: ["procure", "ageing", asOf], queryFn: () => unwrap<Ageing>(api.GET("/api/procurement/reports/payables-ageing", { params: { query: toQuery(qs({ asOf })) } })) });
export const useSpend = (from: string, to: string) => useQuery({ queryKey: ["procure", "spend", from, to], queryFn: () => unwrap<Spend>(api.GET("/api/procurement/reports/spend", { params: { query: toQuery(qs({ from, to })) } })) });

export const useCreateVendor = () => useProcMutation<VendorInput & K, { vendor: Vendor; duplicates: { code: string }[] }>((v) => unwrap<{ vendor: Vendor; duplicates: { code: string }[] }>(api.POST("/api/procurement/vendors", { body: v, headers: hdr(v) })));
export const useUpdateVendor = () => useProcMutation<Partial<VendorInput> & K & { id: string }>((v) => unwrap(api.PATCH("/api/procurement/vendors/{id}", { params: { path: { id: v.id } }, body: v, headers: hdr(v) })));
export const useVendorStatus = () => useProcMutation<K & { id: string; to: Vendor["status"]; reason: string }>((v) => unwrap(api.POST("/api/procurement/vendors/{id}/status", { params: { path: { id: v.id } }, body: ({ to: v.to, reason: v.reason }), headers: hdr(v) })));
export const useBankChange = () =>
  useProcMutation<K & { id: string; kind: BankKind; label: string; number: string; reason: string; doc?: string }>((v) => unwrap(api.POST("/api/procurement/vendors/{id}/bank-changes", { params: { path: { id: v.id } }, body: v, headers: hdr(v) })));
export const useReveal = () => useProcMutation<K & { id: string; field: "bank" | "tin"; reason: string }, { value: string }>((v) => unwrap<{ value: string }>(api.POST("/api/procurement/vendors/{id}/reveal", { params: { path: { id: v.id } }, body: ({ field: v.field, reason: v.reason }), headers: hdr(v) })));
export const useAddDocument = () => useProcMutation<K & { id: string; name: string; expiresOn?: string }>((v) => unwrap(api.POST("/api/procurement/vendors/{id}/documents", { params: { path: { id: v.id } }, body: v, headers: hdr(v) })));
export const useSendStatement = () => useProcMutation<K & { id: string; from: string; to: string }, { sentTo: string }>((v) => unwrap<{ sentTo: string }>(api.POST("/api/procurement/vendors/{id}/statement/send", { params: { path: { id: v.id } }, body: v, headers: hdr(v) })));
export const useCreateContract = () => useProcMutation<K & Partial<Contract>, Contract>((v) => unwrap<Contract>(api.POST("/api/procurement/contracts", { body: v, headers: hdr(v) })));
export const useUpdateContract = () => useProcMutation<K & Partial<Contract> & { id: string }>((v) => unwrap(api.PATCH("/api/procurement/contracts/{id}", { params: { path: { id: v.id } }, body: v, headers: hdr(v) })));
export const useRenewal = () => useProcMutation<K & { id: string; amount: number; endOn: string; noticeDays: number; reason: string }>((v) => unwrap(api.POST("/api/procurement/contracts/{id}/renewal", { params: { path: { id: v.id } }, body: v, headers: hdr(v) })));
export const useTerminate = () => useProcMutation<K & { id: string; effectiveOn: string; checklist: string[]; reason: string }>((v) => unwrap(api.POST("/api/procurement/contracts/{id}/terminate", { params: { path: { id: v.id } }, body: v, headers: hdr(v) })));
export const useSnooze = () => useProcMutation<K & { id: string }, { until: string }>((v) => unwrap<{ until: string }>(api.POST("/api/procurement/contracts/{id}/snooze", { params: { path: { id: v.id } }, headers: hdr(v) })));
export const useCreateAdvance = () =>
  useProcMutation<K & { kind: AdvanceKind; vendorId: string; amount: number; contractRef?: string; note?: string; returnDueOn?: string }, Advance>((v) => unwrap<Advance>(api.POST("/api/procurement/deposits", { body: v, headers: hdr(v) })));
export const useReturnDeposit = () =>
  useProcMutation<K & { id: string; received: number; bankRef: string; date: string; deductions: { reason: string; amount: number }[]; proof?: string }>((v) => unwrap(api.POST("/api/procurement/deposits/{id}/return", { params: { path: { id: v.id } }, body: v, headers: hdr(v) })));
export const useForfeit = () => useProcMutation<K & { id: string; reason: string }>((v) => unwrap(api.POST("/api/procurement/deposits/{id}/forfeit", { params: { path: { id: v.id } }, body: ({ reason: v.reason }), headers: hdr(v) })));
export const useOffset = () => useProcMutation<K & { id: string; billNo: string; amount: number }>((v) => unwrap(api.POST("/api/procurement/deposits/{id}/offset", { params: { path: { id: v.id } }, body: v, headers: hdr(v) })));
export const useLogExport = () => useProcMutation<K & { report: string; rows: number; params?: string }>((v) => unwrap(api.POST("/api/procurement/reports/export", { body: v, headers: hdr(v) })));

/** Client CSV download (shortcut: exports the loaded rows only, upgrade to server export jobs for > 10,000 rows). */
export function downloadCsv(name: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [header.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv" })), download: `${name}.csv` });
  a.click();
  URL.revokeObjectURL(a.href);
}
