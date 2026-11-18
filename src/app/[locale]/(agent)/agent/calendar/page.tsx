import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { agentCalendar } from "@/content/pages/agent-calendar";
import { CalendarView } from "@/components/organisms/agent/calendar";
import { AdviserSessions } from "@/components/organisms/booking/staff";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: agentCalendar(locale).title, robots: { index: false } };
}

// U8 Calendar, board 09 (lane F). ?view=week|month|agenda&date=YYYY-MM-DD&event=<id>
export default function Page() {
  return (
    <div className="grid gap-6">
      {/* Stage 11 bookings layer + availability (?panel=availability). shortcut: shown above the calendar, not merged into its grid; merge when lane F calendar takes external sources */}
      <Suspense><AdviserSessions /></Suspense>
      <Suspense>
        <CalendarView />
      </Suspense>
    </div>
  );
}
