// Mirror of server/src/domain/marketing/cost.ts — UI display only; the server enforces.
// Campaign money maths (plan 10 §2.5). Integer RWF only.
import { MKT_POLICY } from "@/shared/policy";
import type { Channel } from "@/shared/marketing/types";

export const OPT_OUT_SMS = "Reply STOP / Ohereza HAGARIKA";
const GSM7 = /^[\n\r @£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà^{}\\[~\]|€]*$/;
/** GSM-7 ≤ 160 → 1 else ceil(len/153); UCS-2 ≤ 70 → 1 else ceil(len/67). */
export function smsSegments(text: string): { segments: number; encoding: "GSM-7" | "UCS-2"; length: number } {
  const gsm = GSM7.test(text);
  const n = text.length;
  const [single, multi] = gsm ? [160, 153] : [70, 67];
  return { segments: n === 0 ? 0 : n <= single ? 1 : Math.ceil(n / multi), encoding: gsm ? "GSM-7" : "UCS-2", length: n };
}
export const unitCost = (channel: Channel, smsText = "") => MKT_POLICY.unitCost[channel] * (channel === "sms" ? Math.max(1, smsSegments(smsText).segments) : 1);
export const estimate = (channel: Channel, eligible: number, smsText = "") => eligible * unitCost(channel, smsText);
export type BudgetState = "ok" | "warn" | "block";
export function budgetState(spent: number, est: number, cap: number = MKT_POLICY.budgetCap): BudgetState {
  const pct = ((spent + est) * 100) / cap;
  return pct >= 100 ? "block" : pct >= MKT_POLICY.budgetWarnPct ? "warn" : "ok";
}
/** Messages that fit before the cap: ⌊(cap − spent) / unit⌋ (60,000 − 40,000) / 45 = 444. */
export const pausePoint = (spent: number, unit: number, cap: number = MKT_POLICY.budgetCap) => (unit <= 0 ? Infinity : Math.max(0, Math.floor((cap - spent) / unit)));
