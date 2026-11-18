// Mirror of server/src/domain/field/geo.ts — UI display only; the server enforces.
// Geolocation maths + check-in verdict (plan §2.10). Location is read ONLY in an action handler — never tracked.
import { FIELD_POLICY } from "@/shared/policy";
import type { Fix, Flag } from "@/shared/field/types";

export const FIELD_RADIUS_M = FIELD_POLICY.radiusM;
export const LOW_ACCURACY_M = FIELD_POLICY.lowAccuracyM;

/** Great-circle distance in metres (haversine). */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export type Verdict = "verified" | "verified_photo" | "needs_photo";
export function checkinVerdict(o: { distanceM: number | null; accuracyM: number | null; hasPhoto: boolean }): Verdict {
  if (o.distanceM !== null && o.accuracyM !== null && o.distanceM <= FIELD_RADIUS_M && o.accuracyM <= LOW_ACCURACY_M) return "verified";
  return o.hasPhoto ? "verified_photo" : "needs_photo";
}
/** `st` defaults to FIELD_POLICY; the api passes the admin-edited field settings. */
export function checkinFlags(o: { distanceM: number | null; accuracyM: number | null; noGps: boolean; hasPhoto: boolean }, st: { radiusM: number; lowAccuracyM: number } = FIELD_POLICY): Flag[] {
  if (o.noGps) return ["no_gps"];
  const f: Flag[] = [];
  if (o.distanceM !== null && o.distanceM > st.radiusM && !o.hasPhoto) f.push("far");
  if (o.accuracyM !== null && o.accuracyM > st.lowAccuracyM) f.push("low_accuracy");
  return f;
}

export const formatCoords = (lat: number, lng: number) => `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
export const formatDistance = (m: number) => (m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`);

/** Rwanda MSISDN: 07[2389]xxxxxxx (also accepts +2507… / 2507…). */
export function normaliseMsisdn(v: string): string | null {
  const d = v.replace(/[^\d]/g, "").replace(/^250/, "0");
  return /^07[2389]\d{7}$/.test(d) ? d : null;
}

