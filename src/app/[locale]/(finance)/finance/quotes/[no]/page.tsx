import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { financeQuotes } from "@/content/pages/finance-quotes";
import { QuoteView } from "@/components/organisms/finance/quote-detail";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: financeQuotes(locale).title, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, no: "new" }));

// U6 Quote builder / detail, board 04 (lane B). URL: ?v&tab ("new" → case picker, ?case=)
export default async function Page({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params;
  return (
    <Suspense>
      <QuoteView no={decodeURIComponent(no)} />
    </Suspense>
  );
}
