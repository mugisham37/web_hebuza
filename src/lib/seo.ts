import type { Metadata } from "next";
import { locales, defaultLocale } from "@/shared/i18n/config";
import { images } from "@/lib/assets";

/** Per-page metadata: canonical + hreflang (rw/en/fr + x-default) + OG title/url. `path` excludes the locale ("" = home). */
export function pageMeta(locale: string, path: string, m: Metadata = {}): Metadata {
  const title = typeof m.title === "string" ? m.title : (m.title as { absolute?: string } | null)?.absolute;
  return {
    ...m,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: { ...Object.fromEntries(locales.map((l) => [l, `/${l}${path}`])), "x-default": `/${defaultLocale}${path}` },
      types: { "application/rss+xml": `/${locale}/rss.xml` },
    },
    // Page openGraph replaces the layout's (shallow merge), so restate type/images.
    openGraph: { type: "website", images: images.brandOgImage, title, description: m.description ?? undefined, url: `/${locale}${path}`, locale, ...m.openGraph },
  };
}
