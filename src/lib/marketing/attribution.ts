// UTM / click-id attribution (plan 10 §2.4, F-CRM-04). Pure: classify a landing, keep first + last NON-DIRECT touch.
import type { Touch } from "@/shared/marketing/types";

export type Attribution = { first?: Touch; last?: Touch };
const SEARCH = /(^|\.)(google|bing|duckduckgo|yahoo|yandex|ecosia)\./i;

export function classify(url: URL, referrer: string, siteHost: string, at = new Date().toISOString()): Touch | "direct" {
  const q = url.searchParams;
  const landing = url.pathname;
  const extra = { term: q.get("utm_term") ?? undefined, content: q.get("utm_content") ?? undefined, gclid: q.get("gclid") ?? undefined, fbclid: q.get("fbclid") ?? undefined };
  const clean = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
  if (q.get("utm_source")) return clean({ source: q.get("utm_source")!.toLowerCase(), medium: (q.get("utm_medium") ?? "unknown").toLowerCase(), campaign: q.get("utm_campaign") ?? undefined, ...extra, landing, at });
  if (extra.gclid) return clean({ source: "google", medium: "cpc", ...extra, landing, at });
  if (extra.fbclid) return clean({ source: "facebook", medium: "paid_social", ...extra, landing, at });
  let host = "";
  try { host = referrer ? new URL(referrer).hostname : ""; } catch { host = ""; }
  if (!host || host === siteHost) return "direct";
  return { source: SEARCH.test(host) ? host.replace(/^www\./, "").split(".")[0] : host.replace(/^www\./, ""), medium: SEARCH.test(host) ? "organic" : "referral", referrer: host, landing, at };
}

/** first = first non-direct ever; last = latest non-direct (direct never overwrites). */
export function nextAttribution(prev: Attribution, t: Touch | "direct"): Attribution {
  if (t === "direct") return prev;
  return { first: prev.first ?? t, last: t };
}

export const ATTR_COOKIE = "hebuza_attr";
/** Where to keep it: a 90-day cookie only after analytics consent, else this tab's sessionStorage (part of the user's own submission). */
export const persistTarget = (consent: { analytics: boolean } | null) => (consent?.analytics ? "cookie" : "session") as "cookie" | "session";

// Self-check of the rules (runs once at import in dev; cheap, no test runner needed).
if (process.env.NODE_ENV !== "production") {
  const u = new URL("https://hebuza.rw/rw/campaign/x?utm_source=Facebook&utm_campaign=nov_tax");
  const t = classify(u, "", "hebuza.rw", "2026-11-01T00:00:00Z");
  const a = nextAttribution(nextAttribution({}, t), "direct");
  console.assert(t !== "direct" && t.source === "facebook" && a.last === t && a.first === t, "attribution: utm + direct-keeps-last");
  console.assert(classify(new URL("https://hebuza.rw/"), "https://www.google.com/", "hebuza.rw") !== "direct", "attribution: search = organic");
}
