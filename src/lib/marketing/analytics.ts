// GA4 hygiene (F-CRM-10): events carry opaque ids only, never PII.
const PII = /(name|phone|email|tel|msisdn|tin|address|message)/i;
const LOOKS_PII = /@|\+?\d[\d\s]{7,}/;
export function scrubParams(p: Record<string, unknown>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(p)) {
    if (PII.test(k) || (typeof v === "string" && LOOKS_PII.test(v))) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[k] = v;
  }
  return out;
}
if (process.env.NODE_ENV !== "production") console.assert(!("phone" in scrubParams({ phone: "+250788", lead_id: "LD-1" })) && scrubParams({ x: "a@b.rw" }).x === undefined, "scrubParams");
