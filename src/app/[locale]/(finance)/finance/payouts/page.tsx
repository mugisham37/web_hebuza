import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { financePayouts } from "@/content/pages/finance-payouts";
import { PayoutsView } from "@/components/organisms/finance/payouts";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: financePayouts(locale).title, robots: { index: false } };
}

// U14 Payouts list, board 11 (lane E). ?view=
export default function Page() {
  return (
    <Suspense>
      <PayoutsView />
    </Suspense>
  );
}
