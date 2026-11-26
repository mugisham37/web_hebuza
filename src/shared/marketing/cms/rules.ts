// Mirror of server/src/domain/marketing/cms/rules.ts — UI display only; the server enforces.
// CMS pure rules (plan 10 §1.3, §2.1): workflow, approver, publish blockers, slug, SEO, fallback, KB, sanitising.
// No React, no Next: shared by the mock CMS route, the server reader and the editor UI.
import type { BlockShape, CmsEntry, CmsStatus, CmsType, CmsVariant, KbState, Locale, LocaleState, PublishBlocker, RichDoc } from "@/shared/marketing/types";
import { LOCALES } from "@/shared/marketing/types";

// ---------------------------------------------------------------- workflow (F-CMS-09)
export type CmsAction = "submit" | "request_changes" | "approve" | "schedule" | "unschedule" | "publish" | "edit" | "stale" | "rereview" | "archive" | "restore" | "unpublish";
const T: Record<CmsAction, [CmsStatus[], CmsStatus]> = {
  submit: [["draft"], "in_review"], request_changes: [["in_review"], "draft"], approve: [["in_review"], "approved"],
  schedule: [["approved"], "scheduled"], unschedule: [["scheduled"], "approved"], publish: [["approved", "scheduled"], "published"],
  edit: [["published"], "draft"], stale: [["published"], "stale"], rereview: [["stale"], "published"], archive: [["published", "stale", "draft"], "archived"],
  restore: [["archived"], "draft"], unpublish: [["published", "stale"], "draft"],
};
export const canTransition = (from: CmsStatus, a: CmsAction) => T[a][0].includes(from);
export const nextStatus = (a: CmsAction) => T[a][1];

// ---------------------------------------------------------------- approver (Q-AI-03, §2.1 matrix)
export type CmsRole = "marketing" | "service_manager" | "executive";
export const needsSm = (e: Pick<CmsEntry, "type" | "serviceFacts">) => e.type === "regulatory_update" || ((e.type === "guide" || e.type === "faq") && e.serviceFacts);
/** null = allowed; otherwise the error code the API answers. */
export function canApprove(role: CmsRole, actorId: string, e: Pick<CmsEntry, "type" | "serviceFacts">, authorId: string): null | "APPROVER_REQUIRED" | "SOD_SELF_APPROVAL" {
  if (e.type === "legal_doc") return role === "executive" ? (actorId === authorId ? "SOD_SELF_APPROVAL" : null) : "APPROVER_REQUIRED";
  if (needsSm(e)) return role !== "service_manager" && role !== "executive" ? "APPROVER_REQUIRED" : actorId === authorId ? "SOD_SELF_APPROVAL" : null;
  return role === "marketing" || role === "service_manager" ? null : "APPROVER_REQUIRED";
}

// ---------------------------------------------------------------- slug (CMS-16)
export const RESERVED = new Set(["admin", "api", "marketing", "ops", "finance", "preview", "hooks", "new", "edit", "login", "signup", "lp", "c", "r"]);
export function slugify(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/['’]/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
}
export const slugError = (s: string) => (!s ? "required" : s !== slugify(s) ? "format" : RESERVED.has(s) ? "reserved" : null);

// ---------------------------------------------------------------- text helpers
export const docText = (d?: RichDoc) =>
  (d?.content ?? []).map((n) => n.type === "paragraph" ? (n.content ?? []).map((i) => i.text).join("") : n.items.map((it) => it.map((i) => i.text).join("")).join("\n")).join("\n\n");
export const textDoc = (s: string): RichDoc => ({ type: "doc", content: s.split(/\n{2,}/).map((p) => ({ type: "paragraph", content: [{ text: p }] })) });
/** All visible text of a variant (for word counts, money checks, search). */
export function variantText(blocks: BlockShape[], v: CmsVariant) {
  const out: string[] = [v.title, v.excerpt ?? ""];
  const walk = (x: unknown): void => {
    if (typeof x === "string") out.push(x);
    else if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === "object") Object.values(x).forEach(walk);
  };
  for (const b of blocks) if (!b.hidden) walk(v.body[b.id]);
  return out.join(" ").replace(/\s+/g, " ").trim();
}
export const wordCount = (s: string) => (s.match(/\S+/g) ?? []).length;
/** Service facts come from the catalogue: warn when copy types "RWF 20,000"-style money (§1.3). */
export const moneyInBody = (s: string) => /\b(RWF|Frw|FRW)\s?\d|\d[\d,. ]*\s?(RWF|Frw|FRW)\b/.test(s);

// ---------------------------------------------------------------- SEO (CMS-05)
export const SEO_MAX = { title: 60, description: 160 } as const;
export const THIN_WORDS = 300;
export function duplicateTitles(rows: { id: string; title: string }[]) {
  const seen = new Map<string, string[]>();
  for (const r of rows) seen.set(r.title.trim().toLowerCase(), [...(seen.get(r.title.trim().toLowerCase()) ?? []), r.id]);
  return new Set([...seen.values()].filter((ids) => ids.length > 1).flat());
}

// ---------------------------------------------------------------- publish blockers (§1.3)
export function publishBlockers(e: CmsEntry, lang: Locale, now: number, alt?: (assetId: string, l: Locale) => boolean): PublishBlocker[] {
  const v = e.variants[lang];
  const out: PublishBlocker[] = [];
  const err = (code: string, field?: string, blockId?: string) => out.push({ language: lang, code, field, blockId, severity: "error" });
  const warn = (code: string, field?: string, blockId?: string) => out.push({ language: lang, code, field, blockId, severity: "warning" });
  if (!v) { err("missing_variant"); return out; }
  if (!v.title.trim()) err("title_required", "title");
  if (slugError(v.slug)) err(`slug_${slugError(v.slug)}`, "slug");
  if (!v.seo.title.trim()) err("seo_title_required", "seo.title");
  if (v.seo.title.length > SEO_MAX.title) warn("seo_title_long", "seo.title");
  if (!v.seo.description.trim()) warn("seo_description_missing", "seo.description");
  if (v.seo.description.length > SEO_MAX.description) warn("seo_description_long", "seo.description");
  if (v.needsReview) err("translation_needs_review");
  for (const b of e.blocks) {
    const ids = b.type === "image" ? [b.props?.assetId] : b.type === "gallery" ? (b.props?.assetIds as unknown[] | undefined) ?? [] : [];
    for (const id of ids) if (typeof id === "string" && alt && !alt(id, lang)) err("alt_missing", "alt", b.id);
  }
  const text = variantText(e.blocks, v);
  if ((e.type === "guide" || e.type === "article") && wordCount(text) < THIN_WORDS) warn("thin_content");
  if (moneyInBody(text) && e.type !== "landing_page") warn("money_in_body");
  if (e.type === "regulatory_update") {
    const r = e.meta.regulatory;
    if (!r?.authority) err("authority_required", "authority");
    if (!r?.sourceUrl || !/^https:\/\//.test(r.sourceUrl)) err("source_url_required", "sourceUrl");
    if (!e.reviewBy) err("review_by_required", "reviewBy");
    else if (Date.parse(e.reviewBy) > now + 366 * 864e5) err("review_by_too_far", "reviewBy");
  }
  if (e.type === "page" && e.key === "home" && e.blocks.find((b) => b.type === "home.hero")?.hidden) err("home_hero_hidden");
  return out;
}

// ---------------------------------------------------------------- locales & fallback (D-07 PLACEHOLDER chain)
export const FALLBACK: Record<Locale, Locale[]> = { fr: ["en", "rw"], rw: ["en", "fr"], en: ["rw", "fr"] }; // PLACEHOLDER(languages.fallback_code)
export const isLive = (v?: CmsVariant) => !!v && (v.status === "published" || v.status === "stale");
/** Served variant for a locale: own if live, else the first live one in the chain (only when that one allows fallback or none exists in this locale). */
export function resolveVariant(e: CmsEntry, locale: Locale, draft = false): { variant: CmsVariant; served: Locale; isFallback: boolean } | null {
  const ok = (v?: CmsVariant) => (draft ? !!v : isLive(v));
  if (ok(e.variants[locale])) return { variant: e.variants[locale]!, served: locale, isFallback: false };
  for (const l of FALLBACK[locale]) {
    const v = e.variants[l];
    if (ok(v) && v!.fallbackAllowed) return { variant: v!, served: l, isFallback: true };
  }
  return null;
}
export const liveLocales = (e: CmsEntry) => LOCALES.filter((l) => isLive(e.variants[l]));
export function coverage(e: CmsEntry): Record<Locale, LocaleState> {
  const newest = Math.max(...LOCALES.map((l) => Date.parse(e.variants[l]?.updatedAt ?? "0")));
  return Object.fromEntries(LOCALES.map((l) => {
    const v = e.variants[l];
    return [l, !v ? "missing" : v.needsReview ? "needs_review" : newest - Date.parse(v.updatedAt) > 30 * 864e5 ? "outdated" : "ok"];
  })) as Record<Locale, LocaleState>;
}
/** Entry-level status: the "most advanced" variant status. */
export function entryStatus(e: CmsEntry): CmsStatus {
  const order: CmsStatus[] = ["in_review", "scheduled", "approved", "stale", "published", "draft", "archived"];
  const s = LOCALES.map((l) => e.variants[l]?.status).filter(Boolean) as CmsStatus[];
  return order.find((o) => s.includes(o)) ?? "draft";
}

// ---------------------------------------------------------------- KB (F-AIA-02)
export const kbEligible = (e: CmsEntry, now: number) => e.aiApproved && liveLocales(e).length > 0 && !LOCALES.some((l) => e.variants[l]?.status === "stale") && !(e.reviewBy && Date.parse(e.reviewBy) < now);
export const kbState = (e: CmsEntry, now: number): KbState => !e.aiApproved ? "not_approved" : e.reviewBy && Date.parse(e.reviewBy) < now ? "stale" : kbEligible(e, now) ? "indexed" : "pending";

// ---------------------------------------------------------------- sanitising (rich text allow-list)
/** Only http(s)/mailto/tel/relative links survive; external ones get rel noopener nofollow. */
export function safeHref(href?: string): { href: string; external: boolean } | null {
  if (!href) return null;
  const h = href.trim();
  if (/^(https?:|mailto:|tel:)/i.test(h)) return { href: h, external: /^https?:/i.test(h) };
  if (h.startsWith("/") && !h.startsWith("//")) return { href: h, external: false };
  return null;
}
export const youtubeId = (id?: unknown) => (typeof id === "string" && /^[\w-]{11}$/.test(id) ? id : null);

/** Public path of an entry per locale (types without a page return null). */
export function publicPath(type: CmsType, key: string, slug: string, locale: Locale) {
  // guides/articles have no public page (they feed the AI assistant only)
  if (type === "regulatory_update") return `/${locale}/updates/${slug}`;
  if (type === "landing_page") return `/${locale}/campaign/${slug}`;
  if (type === "faq") return `/${locale}/faq`;
  if (type === "team_member") return `/${locale}/about`;
  if (type === "page") return key === "home" ? `/${locale}` : `/${locale}/${slug}`;
  return null;
}
