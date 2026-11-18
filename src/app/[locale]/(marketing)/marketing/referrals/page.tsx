import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { mktInsights } from "@/content/pages/mkt-insights";
import { ReferralsView } from "@/components/organisms/marketing/community";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: mktInsights(locale).rf.title, robots: { index: false } };
}

// Stage 10 lane insights (U16, ?tab).
export default function Page() {
  return <Suspense><ReferralsView /></Suspense>;
}
