import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { mktInsights } from "@/content/pages/mkt-insights";
import { ReportsView } from "@/components/organisms/marketing/reports";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: mktInsights(locale).rep.title, robots: { index: false } };
}

// Stage 10 lane insights (U18, ?tab&range&model).
export default function Page() {
  return <Suspense><ReportsView /></Suspense>;
}
