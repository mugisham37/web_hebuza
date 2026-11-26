import type { MetadataRoute } from "next";
import { locales } from "@/shared/i18n/config";
import { SITE_URL } from "@/lib/site";
import { getFamilies, getServices } from "@/lib/catalogue";
import { CLIENT_GUIDES } from "@/content/guides";
import { getManifest } from "@/lib/marketing/cms/read";

const STATIC = ["", "/services", "/pricing", "/about", "/faq", "/contact", "/track", "/updates", "/guides", "/book", "/join-us", "/how-it-works", "/legal/terms", "/legal/privacy", "/legal/cookies", "/legal/disclaimers", "/accessibility"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages use generation time; services use their catalogue updated_at.
  const now = new Date();
  const entries: [string, Date][] = [
    ...STATIC.map((p): [string, Date] => [p, now]),
    ...(await getFamilies("en")).map((f): [string, Date] => [`/services/c/${f.slug}`, now]),
    ...CLIENT_GUIDES.map((g): [string, Date] => [`/guides/${g.slug}`, new Date(g.updated)]),
  ];
  // F-CAT-07: each locale lists its own service slug; hreflang points at the sibling slugs.
  const svc = (await getServices("en")).flatMap((s) => locales.map((l) => ({
    url: `${SITE_URL}/${l}/services/${s.slugs[l]}`, lastModified: s.updatedAt ? new Date(s.updatedAt) : now, changeFrequency: "weekly" as const, priority: 0.7,
    alternates: { languages: { ...Object.fromEntries(locales.map((x) => [x, `${SITE_URL}/${x}/services/${s.slugs[x]}`])), "x-default": `${SITE_URL}/rw/services/${s.slugs.rw}` } },
  })));
  // CMS-fed pages: only locales with a live variant are listed (plan 10 §2.6, spec §13).
  const cms = await getManifest();
  const cmsUrls = (["updates"] as const).flatMap((k) => cms[k].map((e) => ({ path: `/${k}/${e.slug}`, at: new Date(e.at), ls: e.locales as readonly string[] })));
  return [...svc, ...[...entries.map(([path, at]) => ({ path, at, ls: locales as readonly string[] })), ...cmsUrls].flatMap(({ path, at: lastModified, ls }) =>
    ls.map((l) => ({
      url: `${SITE_URL}/${l}${path}`,
      lastModified,
      changeFrequency: path ? "weekly" : "daily",
      priority: path ? 0.7 : 1,
      alternates: { languages: { ...Object.fromEntries(ls.map((x) => [x, `${SITE_URL}/${x}${path}`])), "x-default": `${SITE_URL}/rw${path}` } },
    })),
  )] as MetadataRoute.Sitemap;
}
