import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { financeRefunds } from "@/content/pages/finance-refunds";
import { RefundsView } from "@/components/organisms/finance/refunds";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: financeRefunds(locale).title, robots: { index: false } };
}

// U12 Refunds queue + credit notes, board 09 RF1 (lane D). URL: ?tab&q
export default function Page() {
  return (
    <Suspense>
      <RefundsView />
    </Suspense>
  );
}
