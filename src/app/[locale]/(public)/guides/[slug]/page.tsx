import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import { locales } from "@/shared/i18n/config";
import { SITE_URL } from "@/lib/site";
import { CLIENT_GUIDES, guideText, relatedGuides } from "@/content/guides";
import { GuideArticle } from "@/components/organisms/site/guide-article";

export function generateStaticParams() {
  return locales.flatMap((locale) => CLIENT_GUIDES.map((g) => ({ locale, slug: g.slug })));
}
export async function generateMetadata({ params }: PageProps<"/[locale]/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { locale } = await getI18n(params);
  const g = CLIENT_GUIDES.find((x) => x.slug === slug);
  if (!g) return {};
  const t = guideText(g, locale);
  return pageMeta(locale, `/guides/${slug}`, { title: t.title, description: t.summary });
}

// /guides/[slug]: one client guide. HowTo JSON-LD lists the steps for search engines.
export default async function GuidePage({ params }: PageProps<"/[locale]/guides/[slug]">) {
  const { slug } = await params;
  const { locale } = await getI18n(params);
  const g = CLIENT_GUIDES.find((x) => x.slug === slug);
  if (!g) notFound();
  const t = guideText(g, locale);
  const ld = {
    "@context": "https://schema.org", "@type": "HowTo", name: t.title, description: t.summary, totalTime: `PT${g.minutes}M`, inLanguage: locale,
    step: t.sections.flatMap((s) => s.steps ?? []).map((st, i) => ({ "@type": "HowToStep", position: i + 1, text: st.text.replace(/\*\*/g, ""), ...(st.shot ? { image: `${SITE_URL}/guides/shots/${locale}/${st.shot}.jpg` } : {}) })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <GuideArticle guide={g} locale={locale} related={relatedGuides(CLIENT_GUIDES, g)} base="/guides" />
    </>
  );
}
