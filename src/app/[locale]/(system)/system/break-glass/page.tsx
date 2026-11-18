import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { systemGovernance } from "@/content/pages/system-governance";
import { BreakGlassView } from "@/components/organisms/system/break-glass";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemGovernance(locale).breakGlass, robots: { index: false } };
}

// U9 Break-glass (lane C).
export default function Page() {
  return (
    <Suspense>
      <BreakGlassView />
    </Suspense>
  );
}
