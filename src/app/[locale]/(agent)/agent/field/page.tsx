import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { fieldCopy } from "@/lib/field/copy";
import { DayPlan } from "@/components/organisms/field/day-plan";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const c = fieldCopy(locale);
  return { title: `${c.nav.today} · ${c.field}`, robots: { index: false } };
}

// U2 day plan, board 02 (lane A). ?view=list|map&day=today|tomorrow
export default function Page() {
  return (
    <Suspense>
      <DayPlan />
    </Suspense>
  );
}
