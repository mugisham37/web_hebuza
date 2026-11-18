import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { mktInsights } from "@/content/pages/mkt-insights";
import { TestimonialsView } from "@/components/organisms/marketing/community";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: mktInsights(locale).ts.title, robots: { index: false } };
}

// Stage 10 lane insights (U17, ?tab).
export default function Page() {
  return <Suspense><TestimonialsView /></Suspense>;
}
