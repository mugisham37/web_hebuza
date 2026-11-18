import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { mktContent } from "@/content/pages/mkt-content";
import { ContentList } from "@/components/organisms/marketing/list";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: mktContent(locale).titles.updates, robots: { index: false } };
}

// Stage 10 lane content (plan 10 §7).
export default function Page() {
  return <Suspense><ContentList kind="updates" /></Suspense>;
}
