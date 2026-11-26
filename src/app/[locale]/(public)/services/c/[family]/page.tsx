import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { notFound } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { locales } from "@/shared/i18n/config";
import { getFamilies, getFamily } from "@/lib/catalogue";
import { ServicesCatalogue } from "@/components/organisms/site/services-catalogue";
export async function generateStaticParams() {
  const fams = (await getFamilies("en")).map((f) => f.slug); // live categories (F-CAT-01), not the static art list
  return locales.flatMap((locale) => (fams.length ? fams : ["_"]).map((family) => ({ locale, family })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/services/c/[family]">): Promise<Metadata> {
  const { family } = await params;
  const { locale } = await getI18n(params);
  const f = await getFamily(family, locale);
  if (!f) return {};
  return pageMeta(locale, `/services/c/${f.slug}`, { title: f.name, description: f.blurb });
}

// /services/c/[family] (F-CAT-09): the general services page, filtered to one category.
export default async function FamilyPage({ params }: PageProps<"/[locale]/services/c/[family]">) {
  const { family } = await params;
  const { locale } = await getI18n(params);
  if (!(await getFamily(family, locale))) notFound();
  return <ServicesCatalogue locale={locale} family={family} />;
}
