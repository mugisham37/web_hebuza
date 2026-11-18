import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { systemOverview } from "@/content/pages/system-overview";
import { OverviewView } from "@/components/organisms/system/overview";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemOverview(locale).title, robots: { index: false } };
}

// U1 Overview (lane A).
export default function Page() {
  return (
    <Suspense>
      <OverviewView />
    </Suspense>
  );
}
