import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { mktCampaigns } from "@/content/pages/mkt-campaigns";
import { CampaignsView } from "@/components/organisms/marketing/campaigns";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: mktCampaigns(locale).list.title, robots: { index: false } };
}

export default function Page() {
  return <Suspense><CampaignsView /></Suspense>;
}
