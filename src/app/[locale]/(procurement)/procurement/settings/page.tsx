import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { procurementAb } from "@/content/pages/procurement-ab";
import { ProcSettingsView } from "@/components/organisms/procurement/settings";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: procurementAb(locale).settings.title, robots: { index: false } };
}

// P-SET read-only approval limits and budgets.
export default function Page() {
  return <Suspense><ProcSettingsView /></Suspense>;
}
