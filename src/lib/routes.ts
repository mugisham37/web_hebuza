// Planned routes per stage (Project/BUILD-PLAN.md). Placeholders render only for these; anything else 404s.
import { WORKSPACE_NAV } from "./nav";
import type { Workspace } from "@/shared/auth/roles";

/** Stage 1 public pages (home is a real page). */
export const PUBLIC_PLANNED = [
  "/pricing", "/about", "/about/team", "/faq", "/contact", "/track",
  "/legal/terms", "/legal/privacy", "/legal/cookies", "/legal/disclaimers", "/accessibility",
  "/knowledge", "/updates", "/book", "/pay", "/apply", "/offline",
] as const;

/** Dynamic children allowed under these (e.g. /apply/[slug], /track/[code]) until their stage ships. */
export const PUBLIC_PREFIXES = ["apply", "pay", "track", "knowledge", "updates"] as const;


/** Optional catch-all params for one workspace prefix: "/ops" → [{rest:undefined},{rest:["intake"]},…]. */
export function plannedParams(ws: Workspace, prefix: string) {
  const subs = WORKSPACE_NAV[ws].items
    .map((i) => i.href)
    .filter((h) => h === prefix || h.startsWith(`${prefix}/`))
    .map((h) => h.slice(prefix.length).split("/").filter(Boolean));
  return subs.map((rest) => ({ rest: rest.length ? rest : undefined }));
}

/** Placeholder pages 404 on anything outside their planned list (dynamicParams=false is unavailable with cacheComponents). */
export function isPlanned(list: { rest?: string[] }[], rest: string[] | undefined): boolean {
  const key = (rest ?? []).join("/");
  return list.some((p) => (p.rest ?? []).join("/") === key);
}
