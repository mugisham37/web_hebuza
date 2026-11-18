import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { financeQuotes } from "@/content/pages/finance-quotes";
import { QuotesView } from "@/components/organisms/finance/quotes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: financeQuotes(locale).title, robots: { index: false } };
}

// U5 Quotes list, board 04 (lane B). URL: ?state&q&page&new=1&case
export default function Page() {
  return (
    <Suspense>
      <QuotesView />
    </Suspense>
  );
}
