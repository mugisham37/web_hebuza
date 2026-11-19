import "server-only";
// CMS reader for the public site (F-CMS-01/17): published entries from GET /api/content/entries, cached under every
// `cms:list:<type>` tag the API's cms.revalidate webhook sends on publish. Draft Mode overlays the previewed entry.
// Returns today's view-model shapes (Guide/Update/Campaign) so pages only change their data line.
import { cacheTag } from "next/cache";
import { cookies, draftMode } from "next/headers";
import type { Campaign, Guide, GuideCat, Institution, Affects, Update } from "@/content/pages/ld";
import type { BlockShape, CmsEntry, CmsType, CmsVariant, Locale, NavNode, RichDoc, SiteSettings } from "@/shared/marketing/types";
import { LOCALES } from "@/shared/marketing/types";
import { docText, kbEligible, liveLocales, resolveVariant } from "@/shared/marketing/cms/rules";
import { publicGet } from "@/lib/public-api";
import { PREVIEW_COOKIE } from "./preview";

const TYPES: CmsType[] = ["page", "landing_page", "article", "guide", "regulatory_update", "faq", "team_member", "testimonial", "partner_logo", "legal_doc"];
async function liveEntries(): Promise<CmsEntry[]> {
  "use cache";
  cacheTag("cms", "cms:manifest", ...TYPES.map((t) => `cms:list:${t}`));
  return (await publicGet<CmsEntry[]>("/content/entries", [])) ?? [];
}
/** Published entries; in Draft Mode the previewed entry (with its drafts) replaces its published copy. Not cached itself. */
async function entries(draft = false): Promise<CmsEntry[]> {
  const live = await liveEntries();
  if (!draft || !process.env.API_URL) return live;
  const token = (await cookies()).get(PREVIEW_COOKIE)?.value;
  const r = token ? await fetch(`${process.env.API_URL}/api/content/preview?token=${encodeURIComponent(token)}`, { cache: "no-store" }).catch(() => null) : null;
  const p = r?.ok ? ((await r.json()) as { data: { entry: CmsEntry } }).data.entry : null;
  return p ? [...live.filter((e) => e.id !== p.id), p] : live;
}
const isDraft = async () => (await draftMode()).isEnabled;
const ofType = async (t: CmsType, draft = false) => (await entries(draft)).filter((e) => e.type === t && !e.archivedTo);

export type Served = { id: string; fallback?: Partial<Record<Locale, Locale>>; stale?: boolean; locales: Locale[] };
/** Resolve every locale; returns null when no locale can be served (never an empty page). */
function resolveAll(e: CmsEntry, draft: boolean) {
  const out = {} as Record<Locale, CmsVariant>;
  const fallback: Partial<Record<Locale, Locale>> = {};
  for (const l of LOCALES) {
    const r = resolveVariant(e, l, draft) ?? (draft ? null : firstLive(e));
    if (!r) return null;
    out[l] = r.variant;
    if (r.isFallback) fallback[l] = r.served;
  }
  return { v: out, served: { id: e.id, fallback, stale: LOCALES.some((l) => e.variants[l]?.status === "stale"), locales: draft ? LOCALES.filter((l) => e.variants[l]) : liveLocales(e) } satisfies Served };
}
/** No allowed fallback: still render the first live variant (with notice) rather than 404 a page that exists in another language. */
function firstLive(e: CmsEntry) {
  const l = liveLocales(e)[0];
  return l ? { variant: e.variants[l]!, served: l, isFallback: true } : null;
}
const blockOf = (blocks: BlockShape[], type: string) => blocks.find((b) => b.type === type && !b.hidden);
const txt = (v: CmsVariant, b?: BlockShape) => (b ? v.body[b.id] ?? {} : {}) as { text?: string; doc?: RichDoc; items?: unknown[]; [k: string]: unknown };
const strings = (x: unknown[] | undefined) => (x ?? []).map((i) => (typeof i === "string" ? i : (i as { title?: string }).title ?? "")).filter(Boolean);

export type GuideVM = Guide & Served;
export async function getGuides(): Promise<GuideVM[]> {
  const draft = await isDraft();
  return (await ofType("guide", draft)).flatMap((e) => {
    const r = resolveAll(e, draft);
    if (!r) return [];
    const m = e.meta.guide;
    const en = r.v.en;
    return [{
      ...r.served, slug: e.key, cat: (m?.category ?? "registration") as GuideCat, date: (en.publishedAt ?? e.createdAt).slice(0, 10),
      updated: en.updatedAt.slice(0, 10) !== (en.publishedAt ?? "").slice(0, 10) ? en.updatedAt.slice(0, 10) : undefined,
      read: m?.readMinutes ?? 3, img: m?.image ?? "/hebuza/guides/register-a-company-in-rwanda.jpg", // PLACEHOLDER(default-guide-image)
      service: e.serviceSlugs[0], featured: e.tags.includes("featured"),
      t: Object.fromEntries(LOCALES.map((l) => {
        const v = r.v[l];
        return [l, {
          title: v.title, excerpt: v.excerpt ?? "", overview: docText(txt(v, blockOf(e.blocks, "rich_text")).doc),
          reqs: strings(txt(v, blockOf(e.blocks, "requirements")).items), steps: strings(txt(v, blockOf(e.blocks, "steps")).items),
          tip: String(txt(v, blockOf(e.blocks, "tip")).text ?? ""),
        }];
      })) as Guide["t"],
    }];
  });
}
export const getGuide = async (slug: string) => (await getGuides()).find((g) => g.slug === slug) ?? null;

export type UpdateVM = Update & Served;
export async function getUpdates(): Promise<UpdateVM[]> {
  const draft = await isDraft();
  return (await ofType("regulatory_update", draft)).flatMap((e) => {
    const r = resolveAll(e, draft);
    if (!r) return [];
    const reg = e.meta.regulatory;
    const by = (id: string) => e.blocks.find((b) => b.id === id && !b.hidden);
    return [{
      ...r.served, slug: e.key, inst: (reg?.authority ?? "RRA") as Institution, affects: (reg?.affects ?? []) as Affects[], date: reg?.effectiveAt ?? e.createdAt.slice(0, 10),
      deadline: reg?.deadline, visual: (e.meta.guide?.category === "doc" ? "doc" : "calendar") as Update["visual"], service: e.serviceSlugs[0] ?? "",
      img: e.meta.guide?.image ?? "/hebuza/updates/monthly-vat-return-reminder.jpg", // PLACEHOLDER(default-update-image)
      t: Object.fromEntries(LOCALES.map((l) => {
        const v = r.v[l];
        return [l, {
          title: v.title, changed: String(txt(v, by("changed") ?? blockOf(e.blocks, "callout")).text ?? v.excerpt ?? ""),
          who: String(txt(v, by("who") ?? blockOf(e.blocks, "quote")).text ?? ""), todo: strings(txt(v, blockOf(e.blocks, "requirements")).items),
          body: docText(txt(v, blockOf(e.blocks, "rich_text")).doc),
        }];
      })) as Update["t"],
    }];
  });
}
export const getUpdate = async (slug: string) => (await getUpdates()).find((u) => u.slug === slug) ?? null;

export type CampaignVM = Campaign & Served & { noindex: boolean; form?: NonNullable<CmsEntry["meta"]["landing"]>["form"] };
export async function getCampaign(slug: string): Promise<CampaignVM | null> {
  const draft = await isDraft();
  const e = (await ofType("landing_page", draft)).find((x) => x.key === slug);
  const r = e && resolveAll(e, draft);
  if (!e || !r) return null;
  const by = (type: string) => blockOf(e.blocks, type);
  return {
    ...r.served, slug, service: e.serviceSlugs[0] ?? "", price: e.meta.landing?.price ?? 0, index: r.v.en.seo.robots === "index",
    noindex: LOCALES.some((l) => r.v[l].seo.robots === "noindex"), form: e.meta.landing?.form,
    endsOn: e.tags.find((t) => t.startsWith("ends:"))?.slice(5),
    t: Object.fromEntries(LOCALES.map((l) => {
      const v = r.v[l];
      const hero = txt(v, by("heading"));
      const cta = txt(v, by("cta"));
      return [l, {
        badge: String(hero.badge ?? ""), l1: String(hero.text ?? v.title), hl: String(hero.hl ?? ""), sub: String(hero.sub ?? v.excerpt ?? ""),
        priceNote: String(hero.priceNote ?? ""), get: strings(txt(v, by("requirements")).items), how: strings(txt(v, by("steps")).items),
        faq: (txt(v, by("faq_list")).items ?? []) as { q: string; a: string }[], readyT: String(cta.title ?? ""), cta: String(cta.label ?? ""),
      }];
    })) as Campaign["t"],
  };
}
export async function getCampaignSlugs(): Promise<string[]> {
  return (await ofType("landing_page")).filter((e) => liveLocales(e).length).map((e) => e.key);
}

/** FAQs grouped by category, published and resolved for one locale (FAQPage JSON-LD is built from this). */
export async function getFaqs(locale: Locale): Promise<Record<string, { q: string; a: string; fallback?: Locale }[]>> {
  const draft = await isDraft();
  const out: Record<string, { q: string; a: string; fallback?: Locale }[]> = {};
  for (const e of await ofType("faq", draft)) {
    const r = resolveVariant(e, locale, draft);
    if (!r) continue;
    const cat = e.meta.faq?.category ?? "getting-started";
    (out[cat] ??= []).push({ q: r.variant.title, a: String((r.variant.body[e.blocks[0]?.id ?? "a"] as { text?: string })?.text ?? ""), fallback: r.isFallback ? r.served : undefined });
  }
  return out;
}

/** Home section order + visibility (copy and facts stay with the section components / catalogue). */
export async function getHomeSections(): Promise<string[]> {
  const home = (await ofType("page")).find((e) => e.key === "home");
  const all = ["hero", "tracker", "institutions", "services", "how", "pricing", "guides", "cta"];
  if (!home) return all;
  const order = home.blocks.filter((b) => b.type.startsWith("home.") && (!b.hidden || b.type === "home.hero")).map((b) => b.type.slice(5));
  return order.includes("hero") ? order : ["hero", ...order];
}

export type PublicTestimonial = { id: string; quote: string; cite: string; stars: number; lang: Locale };
/** Published testimonials for a placement, in their original language (D-16). */
export async function getTestimonials(placement: "home" | "service" | "landing"): Promise<PublicTestimonial[]> {
  return (await ofType("testimonial")).filter((e) => e.tags.includes(placement)).flatMap((e) => {
    const l = liveLocales(e)[0];
    const q = l && (e.variants[l]!.body[e.blocks[0]?.id ?? "q"] as { text?: string; cite?: string; stars?: number } | undefined);
    return q?.text ? [{ id: e.id, quote: q.text, cite: q.cite ?? e.variants[l]!.title, stars: q.stars ?? 5, lang: l }] : [];
  });
}

export type TeamVM = { slug: string; name: string; role: Record<Locale, string>; photo: string; consented: boolean; verified: boolean; credential: { title: string; issuer: string } | null };
/** Team profiles: public fields only (serializer allow-list, spec AC "no address/CV in HTML"). */
export async function getTeam(): Promise<TeamVM[]> {
  return (await ofType("team_member")).flatMap((e) => {
    const ls = liveLocales(e);
    if (!ls.length) return [];
    const v = e.variants[ls[0]]!;
    const role = Object.fromEntries(LOCALES.map((l) => [l, String((e.variants[l] ?? v).excerpt ?? e.meta.team?.role ?? "")])) as Record<Locale, string>;
    return [{ slug: e.key, name: v.title, role, photo: e.meta.team?.photo ?? "", consented: true, verified: !!e.meta.team?.verified,
      credential: e.meta.team?.verified && e.meta.team.credential ? { title: e.meta.team.credential.title, issuer: e.meta.team.credential.issuer } : null }];
  });
}

/** Slugs per public route, for the sitemap (redirects are served to the proxy by GET /api/content/manifest). */
export async function getManifest() {
  const all = await entries();
  const live = (t: CmsType) => all.filter((e) => e.type === t && !e.archivedTo && liveLocales(e).length).map((e) => ({ slug: e.key, locales: liveLocales(e), at: e.variants[liveLocales(e)[0]]!.updatedAt }));
  return { knowledge: live("guide"), updates: live("regulatory_update"), campaign: live("landing_page"), legal: live("legal_doc") };
}

export type LegalVM = { version: number; effective: string | null; sections: { id: string; title: string; body: string }[]; fallback?: Locale };
/** Legal document `key` (terms, privacy, cookies, disclaimers): one section per visible block, `{title, doc|text}`. */
export async function getLegal(key: string, locale: Locale): Promise<LegalVM | null> {
  const draft = await isDraft();
  const e = (await ofType("legal_doc", draft)).find((x) => x.key === key);
  const r = e && resolveVariant(e, locale, draft);
  if (!e || !r) return null;
  return {
    version: r.variant.version, effective: r.variant.publishedAt?.slice(0, 10) ?? null, fallback: r.isFallback ? r.served : undefined,
    sections: e.blocks.filter((b) => !b.hidden).map((b) => {
      const t = txt(r.variant, b);
      return { id: b.id, title: String(t.title ?? ""), body: t.doc ? docText(t.doc) : String(t.text ?? "") };
    }).filter((x) => x.title || x.body),
  };
}

/** FAQs linked to a service (entry.serviceSlugs), for the service page block and its FAQPage JSON-LD (F-CMS-09/13). */
export async function getServiceFaqs(slug: string, locale: Locale): Promise<{ q: string; a: string }[]> {
  const draft = await isDraft();
  return (await ofType("faq", draft)).filter((e) => e.serviceSlugs.includes(slug)).flatMap((e) => {
    const r = resolveVariant(e, locale, draft);
    return r ? [{ q: r.variant.title, a: String((r.variant.body[e.blocks[0]?.id ?? "a"] as { text?: string })?.text ?? "") }] : [];
  });
}

/** Stage 11 hook: the AI assistant indexes only ai_approved, published, non-stale content (F-AIA-02). */
export async function kbSources(): Promise<{ id: string; type: CmsType; locale: Locale; title: string; text: string; updatedAt: string }[]> {
  const t = Date.now();
  return (await entries()).filter((e) => kbEligible(e, t)).flatMap((e) => liveLocales(e).map((l) => {
    const v = e.variants[l]!;
    return { id: e.id, type: e.type, locale: l, title: v.title, text: Object.values(v.body).map((b) => JSON.stringify(b)).join(" "), updatedAt: v.updatedAt };
  }));
}

/** generateStaticParams for a CMS route. Cache Components needs ≥1 param, so an empty build (API down) yields one
 * sentinel that renders notFound(); real slugs are rendered on first request. */
export async function slugParams(type: "guide" | "regulatory_update" | "landing_page", locales: readonly Locale[]) {
  const slugs = (await entries()).filter((e) => e.type === type && liveLocales(e).length).map((e) => e.key);
  return locales.flatMap((locale) => (slugs.length ? slugs : ["_"]).map((slug) => ({ locale, slug })));
}

export type PublicSite = { nav: Record<"header" | "mobile" | "footer", NavNode[]>; settings: SiteSettings | null };
/** F-CMS-07 nav + site settings (GET /api/content/site), dropped by the cms:nav / cms:settings tags. */
export async function getSite(): Promise<PublicSite> {
  "use cache";
  cacheTag("cms", "cms:nav", "cms:settings");
  return (await publicGet<PublicSite>("/content/site", { nav: { header: [], mobile: [], footer: [] }, settings: null })) ?? { nav: { header: [], mobile: [], footer: [] }, settings: null };
}
