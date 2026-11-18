import type { MetadataRoute } from "next";
import { locales } from "@/shared/i18n/config";
import { SITE_URL } from "@/lib/site";
import { getServices } from "@/lib/catalogue";
import { FAMILIES } from "@/content/families";
import { getManifest } from "@/lib/marketing/cms/read";

const STATIC = ["", "/services", "/pricing", "/about", "/faq", "/contact", "/track", "/knowledge", "/updates", "/book", "/join-us", "/status", "/how-it-works", "/legal/terms", "/legal/privacy", "/legal/cookies", "/legal/disclaimers", "/accessibility"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // shortcut: the catalogue has no updated_at yet, so services/static pages use generation time; use the API timestamp once exposed.
  const now = new Date();
  const entries: [string, Date][] = [
    ...STATIC.map((p): [string, Date] => [p, now]),
    ...FAMILIES.map((f): [string, Date] => [`/services/c/${f.slug}`, now]),
    ...(await getServices("en")).map((s): [string, Date] => [`/services/${s.slug}`, now]),
  ];
  // CMS-fed pages: only locales with a live variant are listed (plan 10 §2.6, spec §13).
  const cms = await getManifest();
  const cmsUrls = (["knowledge", "updates"] as const).flatMap((k) => cms[k].map((e) => ({ path: `/${k}/${e.slug}`, at: new Date(e.at), ls: e.locales as readonly string[] })));
  return [...entries.map(([path, at]) => ({ path, at, ls: locales as readonly string[] })), ...cmsUrls].flatMap(({ path, at: lastModified, ls }) =>
    ls.map((l) => ({
      url: `${SITE_URL}/${l}${path}`,
      lastModified,
      changeFrequency: path ? "weekly" : "daily",
      priority: path ? 0.7 : 1,
      alternates: { languages: { ...Object.fromEntries(ls.map((x) => [x, `${SITE_URL}/${x}${path}`])), "x-default": `${SITE_URL}/rw${path}` } },
    })),
  ) as MetadataRoute.Sitemap;
}
