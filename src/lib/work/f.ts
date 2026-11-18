"use client";
// Lane F hooks: contract, signing, rates, licence, renewal/notice, payout destination (plan §9.2).
import { api, unwrap } from "@/lib/api/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workKeys, type ContractDoc, type LicenceInvoice, type RateCardRow } from "./api";

export type HistItem = { id: string; at: string; kind: "signed" | "renewed" | "notice" | "rate" | "version" | "licence" | "payout"; text: string; by: string };
export type PayoutDest = { method: "momo" | "airtel" | "bank"; label: string; last4: string; status: "verified" | "pending_verification" | "failed"; coolingUntil: string | null };
export type ContractVM = {
  contract: ContractDoc[];
  rates: RateCardRow[];
  licence: LicenceInvoice[];
  revenue: { bps: number; licenceMonthly: number; whtBps: number };
  history: HistItem[];
  notice: { at: string; lastDay: string; reason: string } | null;
  payout: PayoutDest;
  firmRole: "admin" | "member" | null;
};

export const useContract = () => useQuery({ queryKey: workKeys.contract(), queryFn: () => unwrap<ContractVM>(api.GET("/api/work/x/contract")) });

/** Every lane-F mutation refreshes contract + summary (shell strip, home cards). */
function useM<B, R>(fn: (b: B) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: workKeys.all }) });
}
export const useSign = (docId: string) =>
  useM((typedName: string) => unwrap<ContractDoc>(api.POST("/api/work/x/contract/{docId}/sign", { params: { path: { docId } }, body: { typedName, readPct: 100, agree: true } })));
export const useRenew = () => useM(() => unwrap<{ end: string }>(api.POST("/api/work/x/contract/renew", { body: { acknowledge: true } })));
export const useNotice = () => useM((reason: string) => unwrap<{ lastDay: string }>(api.POST("/api/work/x/contract/notice", { body: { reason } })));
export const useRateRequest = () =>
  useM((b: { serviceId: string; bps?: number; flat?: number; reason: string }) => unwrap<RateCardRow>(api.POST("/api/work/x/rates/requests", { body: b })));
export const useLicence = () =>
  useM((b: { number: string; how: "pay" | "net"; phone?: string }) => unwrap<LicenceInvoice>(api.POST("/api/work/x/licence/{number}/{how}", { params: { path: { number: b.number, how: b.how } }, body: { phone: b.phone } })));
export const usePayoutDest = () =>
  useM((b: { method: PayoutDest["method"]; account: string; name: string; otp: string; stepUp: string }) => unwrap<PayoutDest>(api.PUT("/api/work/x/payout-destination", { body: b })));
