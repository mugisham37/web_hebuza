// CMS seed adapters (plan 10 §2.6): today's static GUIDES/UPDATES/CAMPAIGNS, FAQs and home order as CmsEntry documents,
// so the CMS-fed public site starts byte-for-byte identical. Read back by src/lib/marketing/cms/read.ts.
import { GUIDES, UPDATES, CAMPAIGNS } from "@/content/pages/ld";
import { FAQ_CATEGORIES, getLB, slugify as lbSlug } from "@/content/pages/lb";
import type { CmsEntry, CmsVariant, HomeSection, Locale, NavNode, SiteSettings, Redirect } from "@/shared/marketing/types";
import { LOCALES } from "@/shared/marketing/types";
import { textDoc } from "@/shared/marketing/cms/rules";

const AUTHOR = "st-grace-m";
const variant = (language: Locale, slug: string, title: string, body: CmsVariant["body"], at: string, extra: Partial<CmsVariant> = {}): CmsVariant => ({
  language, slug, title, body, status: "published", version: 1, publishedAt: at, updatedAt: at, updatedBy: AUTHOR, authorId: AUTHOR,
  seo: { title: title.slice(0, 60), description: extra.excerpt ?? title, robots: "index" }, ...extra,
});
const per = (f: (l: Locale) => CmsVariant) => Object.fromEntries(LOCALES.map((l) => [l, f(l)])) as CmsEntry["variants"];
const base = (id: string, type: CmsEntry["type"], key: string, at: string, rest: Partial<CmsEntry>): CmsEntry => ({
  id, type, key, ownerId: AUTHOR, serviceSlugs: [], tags: [], aiApproved: true, serviceFacts: false, blocks: [], meta: {}, variants: {}, version: 1, createdAt: at, ...rest,
});

export function seedEntries(): CmsEntry[] {
  const guides = GUIDES.map((g) => base(`cms-guide-${g.slug}`, "guide", g.slug, g.date, {
    serviceSlugs: g.service ? [g.service] : [], tags: g.featured ? ["featured"] : [],
    meta: { guide: { readMinutes: g.read, category: g.cat, image: g.img } },
    blocks: [{ id: "overview", type: "rich_text" }, { id: "reqs", type: "requirements" }, { id: "steps", type: "steps" }, { id: "tip", type: "tip" }],
    variants: per((l) => {
      const t = g.t[l];
      return variant(l, g.slug, t.title, {
        overview: { doc: textDoc(t.overview) }, reqs: { items: t.reqs }, steps: { items: t.steps.map((s) => ({ title: s })) }, tip: { text: t.tip },
      }, g.date, { excerpt: t.excerpt, updatedAt: g.updated ?? g.date, seo: { title: t.title.slice(0, 60), description: t.excerpt, robots: "index", jsonLdType: "Article" } });
    }),
  }));
  const updates = UPDATES.map((u) => base(`cms-update-${u.slug}`, "regulatory_update", u.slug, u.date, {
    serviceSlugs: [u.service], serviceFacts: true, reviewBy: `${Number(u.date.slice(0, 4)) + 1}${u.date.slice(4)}`, // PLACEHOLDER(review-by-seed): 12 months after the date until SM sets real ones
    meta: { regulatory: { authority: u.inst, effectiveAt: u.date, deadline: u.deadline, affects: u.affects, sourceUrl: "" /* PLACEHOLDER(source-url) */ }, guide: { readMinutes: 2, category: u.visual, image: u.img } },
    blocks: [{ id: "changed", type: "callout" }, { id: "who", type: "quote" }, { id: "todo", type: "requirements" }, { id: "body", type: "rich_text" }],
    variants: per((l) => {
      const t = u.t[l];
      return variant(l, u.slug, t.title, { changed: { text: t.changed }, who: { text: t.who }, todo: { items: t.todo }, body: { doc: textDoc(t.body) } }, u.date, { excerpt: t.changed });
    }),
  }));
  const landings = CAMPAIGNS.map((c) => base(`cms-landing-${c.slug}`, "landing_page", c.slug, "2026-10-01", {
    serviceSlugs: [c.service], aiApproved: false, tags: c.endsOn ? [`ends:${c.endsOn}`] : [],
    meta: { landing: { price: c.price, campaignTag: c.slug, form: { email: true, servicePreselect: c.service, consent: ["email", "whatsapp", "sms"], thankYou: {} } } },
    blocks: [{ id: "hero", type: "heading" }, { id: "get", type: "requirements" }, { id: "how", type: "steps" }, { id: "faq", type: "faq_list" }, { id: "cta", type: "cta" }],
    variants: per((l) => {
      const t = c.t[l];
      return variant(l, c.slug, `${t.l1} ${t.hl}`, {
        hero: { text: t.l1, hl: t.hl, badge: t.badge, sub: t.sub, priceNote: t.priceNote }, get: { items: t.get }, how: { items: t.how.map((s) => ({ title: s })) },
        faq: { items: t.faq }, cta: { label: t.cta, title: t.readyT },
      }, "2026-10-01", { excerpt: t.sub, seo: { title: `${t.l1} ${t.hl}`.slice(0, 60), description: t.sub, robots: c.index ? "index" : "noindex" } });
    }),
  }));
  const faqs = FAQ_CATEGORIES.flatMap((cat) => getLB("en").faq.items[cat].map((_, i) => base(`cms-faq-${cat}-${i}`, "faq", `${cat}-${i}`, "2026-09-01", {
    meta: { faq: { category: cat } }, blocks: [{ id: "a", type: "rich_text" }],
    variants: per((l) => {
      const qa = getLB(l).faq.items[cat][i];
      return variant(l, lbSlug(qa.q), qa.q, { a: { text: qa.a } }, "2026-09-01");
    }),
  })));
  const HOME: HomeSection[] = ["hero", "tracker", "institutions", "services", "how", "pricing", "guides", "cta"];
  const home = base("cms-page-home", "page", "home", "2026-09-01", {
    blocks: HOME.map((s) => ({ id: s, type: `home.${s}` as const })),
    variants: per((l) => variant(l, "home", "HEBUZA", Object.fromEntries(HOME.map((s) => [s, { copy: {} }])), "2026-09-01")),
  });
  // Mirrors marketing-world ts-4 (published, placement home, consent given). PLACEHOLDER mock quote, not a real client.
  const testimonial = base("cms-testimonial-ts-4", "testimonial", "ts-4", "2026-10-20", {
    aiApproved: false, tags: ["home"], meta: {}, blocks: [{ id: "q", type: "quote" }],
    variants: { en: variant("en", "ts-4", "Eric · Kivu Transport Co", { q: { text: "They handled the RDB filing while I kept working.", cite: "Eric · Kivu Transport Co", stars: 5 } }, "2026-10-20", { fallbackAllowed: true }) },
  });
  return [...guides, ...updates, ...landings, ...faqs, home, testimonial];
}

export const seedNav = (): Record<"header" | "mobile" | "footer", NavNode[]> => {
  const n = (id: string, href: string, en: string, fr: string, rw: string): NavNode => ({ id, href, label: { en, fr, rw } });
  const header = [
    n("services", "/services", "Services", "Services", "Serivisi"), n("pricing", "/pricing", "Pricing", "Tarifs", "Ibiciro"),
    n("knowledge", "/knowledge", "Guides", "Guides", "Ubuyobozi"), n("updates", "/updates", "Updates", "Actualités", "Amavugurura"),
    n("about", "/about", "About", "À propos", "Abo turi bo"), n("contact", "/contact", "Contact", "Contact", "Twandikire"),
  ];
  return { header, mobile: header, footer: [n("faq", "/faq", "FAQ", "FAQ", "Ibibazo"), n("legal", "/legal/terms", "Terms", "Conditions", "Amabwiriza")] };
};
export const seedSettings = (contact: { phone: string; email: string; whatsapp: string }): SiteSettings => ({
  address: "Kigali, Rwanda", phone: contact.phone, email: contact.email, whatsapp: contact.whatsapp,
  hours: { en: "Mon–Fri 08:00–17:00", fr: "Lun–ven 08:00–17:00", rw: "Kuwa mbere–Kuwa gatanu 08:00–17:00" }, // PLACEHOLDER(HOURS)
  social: [],
});
export const seedRedirects = (): Redirect[] => [];
