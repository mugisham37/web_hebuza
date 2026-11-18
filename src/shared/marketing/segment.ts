// Mirror of server/src/domain/marketing/segment.ts — UI display only; the server enforces.
// Segment evaluation (plan 10 §2.7). Pure. Groups nest to depth 2 in the UI; evaluation is recursive.
import type { Contact, SegGroup, SegRule } from "@/shared/marketing/types";

const DAY = 86_400_000;
export const isGroup = (r: SegRule | SegGroup): r is SegGroup => "join" in r;

function fieldValue(c: Contact, f: SegRule["field"], now: number): unknown {
  switch (f) {
    case "service_used": return c.servicesUsed;
    case "category_interest": return c.interests;
    case "obligation": return c.obligations;
    case "company_size": return c.size;
    case "last_active_days": return Math.floor((now - Date.parse(c.lastActiveAt)) / DAY);
    case "consent_email": return c.consent.email;
    case "consent_whatsapp": return c.consent.whatsapp;
    case "consent_sms": return c.consent.sms;
    default: return (c as Record<string, unknown>)[f];
  }
}

export function matchRule(c: Contact, r: SegRule, now: number): boolean {
  const v = fieldValue(c, r.field, now);
  const list = Array.isArray(r.value) ? r.value.map(String) : [String(r.value)];
  const vals = Array.isArray(v) ? v.map(String) : [String(v)];
  const n = Number(v), x = Number(r.value);
  switch (r.op) {
    case "is": return vals.some((a) => a === String(r.value));
    case "is_not": return !vals.some((a) => a === String(r.value));
    case "in": return vals.some((a) => list.includes(a));
    case "lt": return n < x;
    case "lte": return n <= x;
    case "gt": return n > x;
    case "gte": return n >= x;
    case "before": return Date.parse(String(v)) < Date.parse(String(r.value));
    case "after": return Date.parse(String(v)) > Date.parse(String(r.value));
    case "within_days": return now - Date.parse(String(v)) <= x * DAY;
  }
}

export function matchGroup(c: Contact, g: SegGroup, now: number): boolean {
  if (!g.rules.length) return true;
  const test = (r: SegRule | SegGroup) => (isGroup(r) ? matchGroup(c, r, now) : matchRule(c, r, now));
  return g.join === "and" ? g.rules.every(test) : g.rules.some(test);
}

export const evaluate = (g: SegGroup, contacts: Contact[], now = Date.now()) => contacts.filter((c) => matchGroup(c, g, now));
