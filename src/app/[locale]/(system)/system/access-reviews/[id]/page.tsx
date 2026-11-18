import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { systemGovernance } from "@/content/pages/system-governance";
import { ReviewCampaignView } from "@/components/organisms/system/access-reviews";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemGovernance(locale).title, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, id: "AR-2026-Q4" }));

// U7 Review campaign (lane C).
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <ReviewCampaignView id={decodeURIComponent(id)} />
    </Suspense>
  );
}
