import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import { guidesCopy } from "@/content/guides/copy";
import { CLIENT_CATS, CLIENT_GUIDES } from "@/content/guides";
import { GuidesHome } from "@/components/organisms/site/guides-home";

export async function generateMetadata({ params }: PageProps<"/[locale]/guides">): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const c = guidesCopy(locale);
  return pageMeta(locale, "/guides", { title: c.tag, description: c.meta });
}

// /guides: client guides (search, topics, step-by-step with annotated screenshots).
export default async function GuidesPage({ params }: PageProps<"/[locale]/guides">) {
  const { locale } = await getI18n(params);
  return <GuidesHome locale={locale} guides={CLIENT_GUIDES} cats={CLIENT_CATS} />;
}
