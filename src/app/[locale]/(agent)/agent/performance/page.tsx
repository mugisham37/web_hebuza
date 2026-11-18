import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { agentPerformance } from "@/content/pages/agent-performance";
import { PerformanceView } from "@/components/organisms/agent/performance";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: agentPerformance(locale).title, robots: { index: false } };
}

// U12 Performance, board 12 (lane E). URL: ?range=30d|quarter|year
export default function Page() {
  return (
    <Suspense>
      <PerformanceView />
    </Suspense>
  );
}
