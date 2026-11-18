// Mirror of server/src/domain/money.ts — UI display only; the server enforces.
// Integer-RWF money maths shared by every workspace. Rates are basis points (1800 = 18%) so nothing floats.
import { POLICY } from "@/shared/policy";

/** round(amount × bps / 10000), half away from zero, integer RWF. */
export const applyBps = (amount: number, bps: number) => Math.sign(amount) * Math.round((Math.abs(amount) * bps) / 10_000);

/** VAT-inclusive gross → { net, vat }. */
export function splitVat(gross: number, vatBps: number = POLICY.vatBps) {
  const net = Math.round((gross * 10_000) / (10_000 + vatBps));
  return { net, vat: gross - net };
}

/** Net + VAT → gross. */
export const addVat = (net: number, vatBps: number = POLICY.vatBps) => net + applyBps(net, vatBps);

/** Allowed variance between an expected and a received amount. */
export const tolerance = (expected: number) => Math.max(applyBps(expected, POLICY.toleranceBps), POLICY.toleranceMin);
export const withinTolerance = (expected: number, actual: number) => Math.abs(expected - actual) <= tolerance(expected);

/**
 * Payout for one period. share = eligible × shareBps; external agents pay WHT then the monthly licence (X-2).
 * A negative net is carried forward, never paid out as a negative.
 */
export function payout(o: { gross: number; shareBps: number; external: boolean; carriedIn?: number; licence?: number }) {
  const share = applyBps(o.gross, o.shareBps);
  const wht = o.external ? applyBps(share, POLICY.whtBps) : 0;
  const licence = o.external ? (o.licence ?? POLICY.licenceFeeMonthly) : 0;
  const net = share - wht - licence + (o.carriedIn ?? 0);
  return { share, wht, licence, net: Math.max(0, net), carryForward: Math.min(0, net) };
}
