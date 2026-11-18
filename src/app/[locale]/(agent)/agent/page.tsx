import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { agentToday } from "@/content/pages/agent-today";
import { TodayView } from "@/components/organisms/agent/today";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: agentToday(locale).title, robots: { index: false } };
}

// U3 Today, board 04 (lane A).
export default function Page() {
  return (
    <Suspense>
      <TodayView />
    </Suspense>
  );
}
