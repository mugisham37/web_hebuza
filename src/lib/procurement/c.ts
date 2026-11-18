"use client";
// Lane C hooks: purchase requests (raise, track, decide), purchase orders, goods received notes.
import { useQuery } from "@tanstack/react-query";
import { toQuery } from "@/lib/api/query";
import { useProcMutation } from "./api";
import type { BudgetCategory, Condition, GoodsReceipt, PurchaseOrder, PurchaseRequest, Quote, UserRef, VendorStatus } from "@/shared/procurement/types";
import { api, unwrap } from "@/lib/api/client";
import { hdr } from "@/lib/finance/api";

export type PrDetail = PurchaseRequest & { vendorName?: string; budget?: BudgetCategory; po?: PurchaseOrder; delivered: boolean };
export type PoDetail = PurchaseOrder & {
  vendorName: string; vendorEmail?: string; vendorStatus?: VendorStatus; grns: GoodsReceipt[]; bills: { no: string; status: string; total: number }[];
  pr?: { no: string; title: string; requester: UserRef; total: number }; receivedPct: number;
};
export type ReceiptRow = GoodsReceipt & { vendorId: string; vendorName: string; vendorEmail?: string; value: number; ageDays: number; poStatus: string; reversed: boolean; lineText: string };
export type VendorOption = { id: string; code: string; name: string; status: VendorStatus; blockReason?: string; vatRegistered: boolean; paymentTermsDays: number; email?: string };
export type LineIn = { id?: string; description: string; qty: number; unitPrice: number };
export type PrInput = {
  title?: string; lines: LineIn[]; budgetCategory: string; neededBy: string; justification: string; vendorId?: string; vendorFreeText?: string;
  quotes?: Quote[]; chosenQuoteId?: string; chosenReason?: string; waiveReason?: string; workspace?: string; draft?: boolean;
};
type K = { idempotencyKey: string };

export const cKeys = {
  prs: (mine: boolean) => ["procure", "prs", mine ? "mine" : "all"] as const,
  pr: (no: string) => ["procure", "pr", no] as const,
  pos: () => ["procure", "pos"] as const,
  po: (no: string) => ["procure", "po", no] as const,
  receipts: (ni: boolean) => ["procure", "receipts", ni ? "ni" : "all"] as const,
  vendors: () => ["procure", "vendor-options"] as const,
};
export const usePrs = (mine = false, enabled = true) =>
  useQuery({ queryKey: cKeys.prs(mine), queryFn: () => unwrap<{ items: PrDetail[] }>(api.GET("/api/procurement/purchase-requests", { params: { query: toQuery(mine ? "?mine=1" : "") } })), enabled, refetchOnWindowFocus: true });
export const usePr = (no: string | null) =>
  useQuery({ queryKey: cKeys.pr(no ?? ""), queryFn: () => unwrap<PrDetail>(api.GET("/api/procurement/purchase-requests/{no}", { params: { path: { no: no! } } })), enabled: !!no, retry: false });
export const usePos = (enabled = true) => useQuery({ queryKey: cKeys.pos(), queryFn: () => unwrap<{ items: PoDetail[] }>(api.GET("/api/procurement/purchase-orders")), enabled });
export const usePo = (no: string, enabled = true) => useQuery({ queryKey: cKeys.po(no), queryFn: () => unwrap<PoDetail>(api.GET("/api/procurement/purchase-orders/{no}", { params: { path: { no: no } } })), retry: false, enabled: enabled && !!no });
export const useReceipts = (notInvoiced = false) =>
  useQuery({ queryKey: cKeys.receipts(notInvoiced), queryFn: () => unwrap<{ items: ReceiptRow[] }>(api.GET("/api/procurement/receipts", { params: { query: toQuery(notInvoiced ? "?notInvoiced=1" : "") } })) });
export const useVendorOptions = (enabled = true) =>
  useQuery({ queryKey: cKeys.vendors(), queryFn: () => unwrap<{ items: VendorOption[] }>(api.GET("/api/procurement/x/vendor-options")), enabled, staleTime: 60_000 });

export const useCreatePr = () => useProcMutation<PrInput & K, PrDetail>((v) => unwrap<PrDetail>(api.POST("/api/procurement/purchase-requests", { body: v, headers: hdr(v) })));
export const useSubmitPr = () => useProcMutation<Partial<PrInput> & K & { no: string; note?: string }, PrDetail>((v) => unwrap<PrDetail>(api.POST("/api/procurement/purchase-requests/{no}/{action}", { params: { path: { no: v.no, action: "submit" } }, body: v, headers: hdr(v) })));
export const useWithdrawPr = () => useProcMutation<K & { no: string; reason?: string }, PrDetail>((v) => unwrap<PrDetail>(api.POST("/api/procurement/purchase-requests/{no}/{action}", { params: { path: { no: v.no, action: "withdraw" } }, body: v, headers: hdr(v) })));
export const usePrNote = () => useProcMutation<K & { no: string; note: string }, PrDetail>((v) => unwrap<PrDetail>(api.POST("/api/procurement/purchase-requests/{no}/{action}", { params: { path: { no: v.no, action: "note" } }, body: v, headers: hdr(v) })));
/** Finance/executive decisions (lane E): approve needs a step-up token; reject/request-info need a reason. */
export const useApprovePr = () => useProcMutation<K & { no: string; stepUp: string }, PrDetail>((v) => unwrap<PrDetail>(api.POST("/api/procurement/purchase-requests/{no}/{action}", { params: { path: { no: v.no, action: "approve" } }, body: ({}), headers: hdr(v) })));
export const useRejectPr = () => useProcMutation<K & { no: string; reason: string }, PrDetail>((v) => unwrap<PrDetail>(api.POST("/api/procurement/purchase-requests/{no}/{action}", { params: { path: { no: v.no, action: "reject" } }, body: ({ reason: v.reason }), headers: hdr(v) })));
export const useRequestInfoPr = () => useProcMutation<K & { no: string; reason: string }, PrDetail>((v) => unwrap<PrDetail>(api.POST("/api/procurement/purchase-requests/{no}/{action}", { params: { path: { no: v.no, action: "request-info" } }, body: ({ reason: v.reason }), headers: hdr(v) })));

export const useCreatePo = () =>
  useProcMutation<K & { prNo: string; vendorId: string; lines: LineIn[]; deliveryAddress: string; paymentTermsDays: number; neededBy: string; send: boolean }, PoDetail>((v) => unwrap<PoDetail>(api.POST("/api/procurement/purchase-orders", { body: v, headers: hdr(v) })));
export const usePoAction = () =>
  useProcMutation<K & { no: string; action: "send" | "cancel" | "close"; reason?: string }, PoDetail>((v) => unwrap<PoDetail>(api.POST("/api/procurement/purchase-orders/{no}/{action}", { params: { path: { no: v.no, action: v.action } }, body: ({ reason: v.reason }), headers: hdr(v) })));
export type GrnInput = {
  no: string; lines: { lineId: string; qty: number; condition: Condition; note?: string }[]; receivedById?: string; receivedAt?: string;
  evidence?: { name: string; uploadId?: string }; notes?: string; service?: boolean; reverses?: string;
};
export const useReceive = () => useProcMutation<K & GrnInput, { grn: GoodsReceipt; po: PoDetail }>((v) => unwrap<{ grn: GoodsReceipt; po: PoDetail }>(api.POST("/api/procurement/purchase-orders/{no}/{action}", { params: { path: { no: v.no, action: "receive" } }, body: v, headers: hdr(v) })));
export type PrContext = { budgets: BudgetCategory[]; financeMax: number; quoteThreshold: number; quotesRequired: number };
export const usePrContext = (enabled = true) =>
  useQuery({ queryKey: ["procure", "pr-context"], queryFn: () => unwrap<PrContext>(api.GET("/api/procurement/x/pr-context")), enabled, staleTime: 60_000 });
