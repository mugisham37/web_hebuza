import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { workEarnings } from "@/content/pages/work-earnings";
import { WorkEarnings } from "@/components/organisms/agent/work-earnings";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: workEarnings(locale).title, robots: { index: false } };
}

// Stage 8 §7.7 Earnings, board 09 (lane E). ?month=YYYY-MM&tab=allocations|statements|payouts|invoices&state=&alloc=
export default function Page() {
  return (
    <Suspense>
      <WorkEarnings />
    </Suspense>
  );
}
