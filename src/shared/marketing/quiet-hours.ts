// Mirror of server/src/domain/marketing/quiet-hours.ts — UI display only; the server enforces.
// Quiet hours (NTF spec, D-15): marketing due 21:00–07:00 Africa/Kigali is deferred to 07:00. Kigali is UTC+2, no DST.
import { MKT_POLICY } from "@/shared/policy";

const OFFSET_H = 2;
export const kigaliHour = (at: Date) => (at.getUTCHours() + OFFSET_H) % 24;
export const inQuietHours = (at: Date) => { const h = kigaliHour(at); const [from, to] = MKT_POLICY.quietHours; return h >= from || h < to; };
/** Next moment a marketing message may go out (critical messages never call this). */
export function nextAllowed(at: Date): Date {
  if (!inQuietHours(at)) return at;
  const k = new Date(at.getTime() + OFFSET_H * 3600_000); // Kigali wall clock in UTC fields
  if (k.getUTCHours() >= MKT_POLICY.quietHours[0]) k.setUTCDate(k.getUTCDate() + 1);
  k.setUTCHours(MKT_POLICY.quietHours[1], 0, 0, 0);
  return new Date(k.getTime() - OFFSET_H * 3600_000);
}
