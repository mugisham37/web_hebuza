import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { mktInsights } from "@/content/pages/mkt-insights";
import { DashboardView } from "@/components/organisms/marketing/dashboard";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: mktInsights(locale).dash.title, robots: { index: false } };
}

// Stage 10 lane insights (U1 dashboard, ?range).
export default function Page() {
  return <Suspense><DashboardView /></Suspense>;
}
