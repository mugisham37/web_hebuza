import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { mktCampaigns } from "@/content/pages/mkt-campaigns";
import { SequenceBuilder } from "@/components/organisms/marketing/sequences";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: mktCampaigns(locale).seq.title, robots: { index: false } };
}

async function View({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SequenceBuilder id={decodeURIComponent(id)} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense><View params={params} /></Suspense>;
}
