import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { procurementAb } from "@/content/pages/procurement-ab";
import { ReportsView } from "@/components/organisms/procurement/reports";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: procurementAb(locale).reports.title, robots: { index: false } };
}

// R1–R4 Reports. URL: ?tab=ageing|statement|spend|obligations
export default function Page() {
  return <Suspense><ReportsView /></Suspense>;
}
