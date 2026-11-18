import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { agentToday } from "@/content/pages/agent-today";
import { CasesView } from "@/components/organisms/agent/cases";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: agentToday(locale).cases.title, robots: { index: false } };
}

// U5 My cases (lane A). URL: ?view&q&sort&focus.
export default function Page() {
  return (
    <Suspense>
      <CasesView />
    </Suspense>
  );
}
