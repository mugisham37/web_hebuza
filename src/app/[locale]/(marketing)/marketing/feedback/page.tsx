import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { mktInsights } from "@/content/pages/mkt-insights";
import { FeedbackView } from "@/components/organisms/marketing/community";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: mktInsights(locale).fb.title, robots: { index: false } };
}

// Stage 10 lane insights (U17, ?range&service).
export default function Page() {
  return <Suspense><FeedbackView /></Suspense>;
}
