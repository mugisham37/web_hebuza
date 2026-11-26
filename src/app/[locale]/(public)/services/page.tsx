import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import { getCopy } from "@/content/marketing";
import { ServicesCatalogue } from "@/components/organisms/site/services-catalogue";

export async function generateMetadata({ params }: PageProps<"/[locale]/services">): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const c = getCopy(locale).catalogue;
  return pageMeta(locale, `/services`, { title: c.tag, description: c.unsureBody });
}

// /services (F-CAT-01, F-CAT-02): every category.
export default async function ServicesPage({ params }: PageProps<"/[locale]/services">) {
  const { locale } = await getI18n(params);
  return <ServicesCatalogue locale={locale} />;
}
