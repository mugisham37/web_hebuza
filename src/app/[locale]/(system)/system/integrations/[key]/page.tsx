import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { systemIntegrations } from "@/content/pages/system-integrations";
import { IntegrationDetailView } from "@/components/organisms/system/integration-detail";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemIntegrations(locale).title, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, key: "sms" }));

// U12b Integration (lane D).
export default async function Page({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return (
    <Suspense>
      <IntegrationDetailView integrationKey={decodeURIComponent(key)} />
    </Suspense>
  );
}
