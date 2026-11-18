import "server-only";
// CMS reader for the public site (plan 10 §2.6). Sources: CMS tables, else the seed (database outage).
// Returns today's view-model shapes (Guide/Update/Campaign) so Stage 1 pages only change their data line.
import { cacheLife, cacheTag } from "next/cache";
import { draftMode } from "next/headers";
import type { Campaign, Guide, GuideCat, Institution, Affects, Update } from "@/content/pages/ld";
import { seedEntries } from "@/content/cms-seed";
import type { BlockShape, CmsEntry, CmsType, CmsVariant, Locale, RichDoc } from "@/shared/marketing/types";
import { LOCALES } from "@/shared/marketing/types";
import { docText, kbEligible, liveLocales, resolveVariant } from "@/shared/marketing/cms/rules";

/** Dummy CMS content (the seed) until the backend exists; drafts are the same set. */
async function entries(_draft = false): Promise<CmsEntry[]> {
  return seedEntries();
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
  "use cache";
  cacheTag("cms", "cms:list:guide");
  cacheLife("hours");
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
  "use cache";
  cacheTag("cms", "cms:list:regulatory_update");
  cacheLife("hours");
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
  "use cache";
  cacheTag("cms", "cms:list:landing_page", `cms:landing_page:${slug}`);
  cacheLife("hours");
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
  "use cache";
  cacheTag("cms", "cms:list:landing_page");
  return (await ofType("landing_page")).filter((e) => liveLocales(e).length).map((e) => e.key);
}

/** FAQs grouped by category, published and resolved for one locale (FAQPage JSON-LD is built from this). */
export async function getFaqs(locale: Locale): Promise<Record<string, { q: string; a: string; fallback?: Locale }[]>> {
  "use cache";
  cacheTag("cms", "cms:list:faq");
  cacheLife("hours");
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
  "use cache";
  cacheTag("cms", "cms:page:home");
  cacheLife("hours");
  const home = (await ofType("page")).find((e) => e.key === "home");
  const all = ["hero", "tracker", "institutions", "services", "how", "pricing", "guides", "cta"];
  if (!home) return all;
  const order = home.blocks.filter((b) => b.type.startsWith("home.") && (!b.hidden || b.type === "home.hero")).map((b) => b.type.slice(5));
  return order.includes("hero") ? order : ["hero", ...order];
}

export type PublicTestimonial = { id: string; quote: string; cite: string; stars: number; lang: Locale };
/** Published testimonials for a placement, in their original language (D-16). */
export async function getTestimonials(placement: "home" | "service" | "landing"): Promise<PublicTestimonial[]> {
  "use cache";
  cacheTag("cms", "cms:list:testimonial");
  cacheLife("hours");
  return (await ofType("testimonial")).filter((e) => e.tags.includes(placement)).flatMap((e) => {
    const l = liveLocales(e)[0];
    const q = l && (e.variants[l]!.body[e.blocks[0]?.id ?? "q"] as { text?: string; cite?: string; stars?: number } | undefined);
    return q?.text ? [{ id: e.id, quote: q.text, cite: q.cite ?? e.variants[l]!.title, stars: q.stars ?? 5, lang: l }] : [];
  });
}

export type TeamVM = { slug: string; name: string; role: Record<Locale, string>; photo: string; consented: boolean; verified: boolean };
/** Team profiles: public fields only (serializer allow-list, spec AC "no address/CV in HTML"). */
export async function getTeam(): Promise<TeamVM[]> {
  "use cache";
  cacheTag("cms", "cms:list:team_member");
  cacheLife("hours");
  return (await ofType("team_member")).flatMap((e) => {
    const ls = liveLocales(e);
    if (!ls.length) return [];
    const v = e.variants[ls[0]]!;
    const role = Object.fromEntries(LOCALES.map((l) => [l, String((e.variants[l] ?? v).excerpt ?? e.meta.team?.role ?? "")])) as Record<Locale, string>;
    return [{ slug: e.key, name: v.title, role, photo: e.meta.team?.photo ?? "", consented: true, verified: !!e.meta.team?.verified }];
  });
}

/** Slugs per public route + redirects, for the proxy guard and the sitemap. */
export async function getManifest() {
  "use cache";
  cacheTag("cms", "cms:manifest");
  cacheLife("minutes");
  const all = await entries();
  const live = (t: CmsType) => all.filter((e) => e.type === t && !e.archivedTo && liveLocales(e).length).map((e) => ({ slug: e.key, locales: liveLocales(e), at: e.variants[liveLocales(e)[0]]!.updatedAt }));
  const redirects: { from: string; to: string }[] = []; // CMS redirects come from the backend later
  return { knowledge: live("guide"), updates: live("regulatory_update"), campaign: live("landing_page"), redirects };
}

/** Stage 11 hook: the AI assistant indexes only ai_approved, published, non-stale content (F-AIA-02). */
export async function kbSources(): Promise<{ id: string; type: CmsType; locale: Locale; title: string; text: string; updatedAt: string }[]> {
  "use cache";
  cacheTag("cms", "cms:kb");
  cacheLife("hours");
  const t = Date.now();
  return (await entries()).filter((e) => kbEligible(e, t)).flatMap((e) => liveLocales(e).map((l) => {
    const v = e.variants[l]!;
    return { id: e.id, type: e.type, locale: l, title: v.title, text: Object.values(v.body).map((b) => JSON.stringify(b)).join(" "), updatedAt: v.updatedAt };
  }));
}
