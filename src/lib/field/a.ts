// Lane A pure helpers: day-plan ordering and straight-line travel estimate (plan §7.3).
import { FIELD_POLICY } from "@/shared/policy";
import { distanceM } from "./geo";
import type { FieldVisit } from "@/shared/field/types";

type Pt = { lat: number; lng: number };
const pt = (v: Pick<FieldVisit, "lat" | "lng">): Pt | null => (v.lat !== null && v.lng !== null ? { lat: v.lat, lng: v.lng } : null);

/** Window start, then distance from the last fix (unknown distance sorts by time only). */
export function sortVisits<T extends FieldVisit>(vs: T[], from: Pt | null): T[] {
  const d = (v: T) => { const p = pt(v); return from && p ? distanceM(from, p) : Infinity; };
  return [...vs].sort((a, b) => a.windowStart.localeCompare(b.windowStart) || d(a) - d(b));
}

/** Straight-line metres along the time order (from the fix if known). PLACEHOLDER speed lives in FIELD_POLICY. */
export function travel(vs: FieldVisit[], from: Pt | null) {
  const pts = [from, ...vs.filter((v) => v.status !== "cancelled" && v.status !== "declined").map(pt)].filter(Boolean) as Pt[];
  let m = 0;
  for (let i = 1; i < pts.length; i++) m += distanceM(pts[i - 1], pts[i]);
  return { meters: m, ms: (m / 1000 / FIELD_POLICY.travelKmh) * 3600_000 };
}

/** Centre for the schematic map: the fix, else the mean of visit pins. */
export function centreOf(vs: FieldVisit[], from: Pt | null): Pt | null {
  if (from) return from;
  const ps = vs.map(pt).filter(Boolean) as Pt[];
  return ps.length ? { lat: ps.reduce((s, p) => s + p.lat, 0) / ps.length, lng: ps.reduce((s, p) => s + p.lng, 0) / ps.length } : null;
}

if (process.env.NODE_ENV !== "production") {
  const v = (s: string, lat: number | null) => ({ windowStart: s, lat, lng: lat === null ? null : 29.6, status: "scheduled" }) as FieldVisit;
  const out = sortVisits([v("10", -1.5), v("09", -1.4), v("09", -1.49)], { lat: -1.5, lng: 29.6 });
  console.assert(out[0].lat === -1.49 && out[2].windowStart === "10", "field a: time then distance");
}
