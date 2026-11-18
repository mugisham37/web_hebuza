import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { financeRevenue } from "@/content/pages/finance-revenue";
import { RevenueView } from "@/components/organisms/finance/revenue";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: financeRevenue(locale).title, robots: { index: false } };
}

// U13 Revenue, board 10 rebuilt (lane E). ?tab=allocations|rules|adjustments|fees&state&agent&period&id
export default function Page() {
  return (
    <Suspense>
      <RevenueView />
    </Suspense>
  );
}
