import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { mktCampaigns } from "@/content/pages/mkt-campaigns";
import { SegmentsView } from "@/components/organisms/marketing/segments";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: mktCampaigns(locale).seg.title, robots: { index: false } };
}

export default function Page() {
  return <Suspense><SegmentsView /></Suspense>;
}
