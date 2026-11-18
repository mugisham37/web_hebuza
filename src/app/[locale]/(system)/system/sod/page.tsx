import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { systemGovernance } from "@/content/pages/system-governance";
import { SodView } from "@/components/organisms/system/sod";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemGovernance(locale).sod, robots: { index: false } };
}

// U8 Separation of duties (lane C).
export default function Page() {
  return (
    <Suspense>
      <SodView />
    </Suspense>
  );
}
