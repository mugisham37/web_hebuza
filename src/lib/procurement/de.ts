"use client";
// Lane D+E hooks: bills, payments, payables queue, bank verification, renewal/forfeit/exception decisions.
import { useQuery } from "@tanstack/react-query";
import { useProcMutation } from "./api";
import type {
  Advance, ApprovalLimits, BankChange, BankKind, Bill, BudgetCategory, Contract, GoodsReceipt, PayMethod, PoLine, PurchaseOrder, PurchaseRequest, Vendor, VendorPayment,
} from "@/shared/procurement/types";
import type { SegStep } from "@/components/molecules/procurement/procurement";
import { api, unwrap } from "@/lib/api/client";
import { hdr } from "@/lib/finance/api";

export type BillRow = Bill & { vendorName: string; vendorCode: string; locked: boolean; lockUntil: string | null; vendorStatus: string };
export type BillDetail = {
  bill: BillRow; vendor: Vendor; po: PurchaseOrder | null; grns: GoodsReceipt[]; contract: Contract | null; payments: VendorPayment[];
  advances: Advance[]; bankChange: BankChange | null; limits: ApprovalLimits;
};
export type FormOptions = {
  vendors: { id: string; name: string; code: string; status: string; blockReason?: string; terms: number; vatRegistered: boolean }[];
  pos: { no: string; vendorId: string; lines: PoLine[]; total: number }[];
  contracts: { ref: string; vendorId: string; title: string; amount: number; dueDay?: number; budgetCategory: string }[];
};
export type BankChangeRow = BankChange & { vendorName: string; vendorCode?: string };
type K = { idempotencyKey: string; stepUp?: string; version?: number };

export const useBills = () => useQuery({ queryKey: ["procure", "bills"], queryFn: () => unwrap<{ items: BillRow[]; today: string }>(api.GET("/api/procurement/bills")), refetchOnWindowFocus: true });
export const useBill = (no: string) => useQuery({ queryKey: ["procure", "bill", no], queryFn: () => unwrap<BillDetail>(api.GET("/api/procurement/bills/{no}", { params: { path: { no: no } } })), retry: false });
export const useBillOptions = () => useQuery({ queryKey: ["procure", "bill-options"], queryFn: () => unwrap<FormOptions>(api.GET("/api/procurement/bills/form-options")) });
export const checkDuplicate = (vendorId: string, invoiceNo: string) =>
  unwrap<{ duplicate: boolean; billNo?: string; vendorName?: string }>(api.GET("/api/procurement/bills/check-duplicate", { params: { query: { vendorId: vendorId, invoiceNo: invoiceNo } } }));
export const useRecurringPreview = () =>
  useQuery({ queryKey: ["procure", "recurring"], queryFn: () => unwrap<{ items: { ref: string; title: string; vendorName: string; amount: number; invoiceDate: string }[] }>(api.GET("/api/procurement/bills/recurring-preview")) });
export const usePayments = () =>
  useQuery({ queryKey: ["procure", "payments"], queryFn: () => unwrap<{ payments: (VendorPayment & { vendorName: string })[]; waiting: BillRow[] }>(api.GET("/api/procurement/payments")), refetchInterval: 30_000 });
export const useBankChanges = () => useQuery({ queryKey: ["procure", "bank-changes"], queryFn: () => unwrap<{ items: BankChangeRow[] }>(api.GET("/api/procurement/bank-changes")), refetchInterval: 30_000 });
export const usePrFor = (no: string | null) =>
  useQuery({ queryKey: ["procure", "x-pr", no], enabled: !!no, queryFn: () => unwrap<{ pr: PurchaseRequest; budget?: BudgetCategory; limits: ApprovalLimits; vendorName?: string }>(api.GET("/api/procurement/x/pr/{no}", { params: { path: { no: no! } } })) });
export const useContractFor = (ref: string | null) =>
  useQuery({ queryKey: ["procure", "x-contract", ref], enabled: !!ref, queryFn: () => unwrap<{ contract: Contract; vendorName: string }>(api.GET("/api/procurement/x/contract/{ref}", { params: { path: { ref: ref! } } })) });

export type BillInput = {
  vendorId: string; vendorInvoiceNo: string; invoiceDate: string; dueOn: string; poNo?: string; contractRef?: string; noPoJustification?: string;
  vatMode: "excl" | "incl"; lines: { id: string; description: string; qty: number; unitPrice: number; vatable: boolean }[]; file?: { id: string; name: string }; submit: boolean;
};
export const useCreateBill = () => useProcMutation<BillInput & K, BillRow>((v) => unwrap<BillRow>(api.POST("/api/procurement/bills", { body: v, headers: hdr(v) })));
export const useCorrectBill = () => useProcMutation<{ no: string; lines: BillInput["lines"]; vatMode: "excl" | "incl" } & K, BillRow>((v) => unwrap<BillRow>(api.POST("/api/procurement/bills/{no}/correct", { params: { path: { no: v.no } }, body: v, headers: hdr(v) })));
/** Bill actions: submit · approve · authorise · reject · dispute · resolve · void · exception · apply-advance. */
export type BillAction = "submit" | "approve" | "authorise" | "reject" | "dispute" | "resolve" | "void" | "exception" | "apply-advance";
export const useBillAction = (action: BillAction) =>
  useProcMutation<{ no: string; reason?: string; override?: string; decision?: "approve" | "reject"; advanceNo?: string; amount?: number } & K>((v) => unwrap(api.POST(`/api/procurement/bills/{no}/${action}`, { params: { path: { no: v.no } }, body: (({ no: _no, idempotencyKey: _k, stepUp: _s, ...rest }) => rest)(v), headers: hdr(v) })));
export const useGenerateRecurring = () => useProcMutation<K, { created: string[] }>((v) => unwrap<{ created: string[] }>(api.POST("/api/procurement/bills/generate-recurring", { headers: hdr(v) })));
export const usePay = () =>
  useProcMutation<{ allocations: { billNo: string; amount: number }[]; method: PayMethod; reference: string; proof: { id: string; name: string } } & K, VendorPayment>((v) => unwrap<VendorPayment>(api.POST("/api/procurement/payments", { body: (({ idempotencyKey: _k, stepUp: _s, ...rest }) => rest)(v), headers: hdr(v) })));
export const useSendRemittance = () => useProcMutation<{ no: string } & K, VendorPayment>((v) => unwrap<VendorPayment>(api.POST("/api/procurement/payments/{no}/remittance", { params: { path: { no: v.no } }, headers: hdr(v) })));
export const useVerifyBank = () =>
  useProcMutation<{ id: string; decision: "verify" | "reject"; reason?: string; callback: { calledNumber: string; holderConfirmed: boolean; last4Confirmed: boolean; answeredBy: string } } & K>((v) => unwrap(api.POST("/api/procurement/bank-changes/{id}/verify", { params: { path: { id: v.id } }, body: (({ id: _i, idempotencyKey: _k, stepUp: _s, ...rest }) => rest)(v), headers: hdr(v) })));
/** PR decisions (lane C endpoints). */
export const usePrDecision = (action: "approve" | "reject" | "request-info") =>
  useProcMutation<{ no: string; reason?: string } & K>((v) => unwrap(api.POST("/api/procurement/purchase-requests/{no}/{action}", { params: { path: { no: v.no, action } }, body: ({ reason: v.reason }), headers: hdr(v) })));
export const useRenewalDecision = () =>
  useProcMutation<{ id: string; decision: "approve" | "reject"; reason?: string } & K>((v) => unwrap(api.POST("/api/procurement/contracts/{id}/renewal/decision", { params: { path: { id: v.id } }, body: ({ decision: v.decision, reason: v.reason }), headers: hdr(v) })));
export const useForfeitDecision = () =>
  useProcMutation<{ no: string; decision: "approve" | "reject"; reason?: string } & K>((v) => unwrap(api.POST("/api/procurement/deposits/{id}/forfeit/decision", { params: { path: { id: v.no } }, body: ({ decision: v.decision, reason: v.reason }), headers: hdr(v) })));
export type { BankKind };

/** Segregation strip steps for a bill (prepare → approve → authorise → pay). */
export function billSteps(b: Pick<Bill, "preparedBy" | "preparedAt" | "approvedBy" | "approvedAt" | "authorisedBy" | "authorisedAt" | "status" | "route" | "total" | "override">, financeMax: number, payer?: { name: string; id: string; at: string }): SegStep[] {
  const exec = b.total > financeMax;
  const paid = b.status === "paid" || b.status === "partially_paid";
  return [
    { role: "prepared", who: b.preparedBy, at: b.preparedAt, state: b.preparedBy ? "done" : "pending", waitingFor: "Procurement" },
    { role: "approved", who: b.approvedBy, at: b.approvedAt, state: b.override ? "override" : b.approvedBy ? "done" : "pending", waitingFor: b.route === "executive" ? "Alice Mutoni" : "Finance" },
    { role: "authorised", who: b.authorisedBy, at: b.authorisedAt, state: b.authorisedBy ? "done" : "pending", waitingFor: exec ? "Alice Mutoni" : "Finance" },
    { role: "paid", who: payer ?? null, at: payer?.at, state: paid && payer ? "done" : "pending", waitingFor: "Finance" },
  ];
}
