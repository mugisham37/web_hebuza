import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { agentEarnings } from "@/content/pages/agent-earnings";
import { EarningsView } from "@/components/organisms/agent/earnings";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: agentEarnings(locale).title, robots: { index: false } };
}

// U11 Earnings, board 11 (lane E). URL: ?month=YYYY-MM&state&alloc
export default function Page() {
  return (
    <Suspense>
      <EarningsView />
    </Suspense>
  );
}
