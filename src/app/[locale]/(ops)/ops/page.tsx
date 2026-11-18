import { Suspense } from "react";
import { QueueCopilotCard } from "@/components/organisms/booking/staff-ai";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { opsToday } from "@/content/pages/ops-today";
import { TodayView } from "@/components/organisms/ops/today";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: opsToday(locale).title, robots: { index: false } };
}

// U4 Today, board 04 (lane A).
export default function Page() {
  return (
    <div className="grid gap-6">
      <Suspense>
        <TodayView />
      </Suspense>
      <QueueCopilotCard />
    </div>
  );
}
