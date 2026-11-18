import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { systemOps } from "@/content/pages/system-ops";
import { IncidentDetailView } from "@/components/organisms/system/incidents";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemOps(locale).incident, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, id: "INC-2026-007" }));

// U16 Incident (lane F).
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <IncidentDetailView id={decodeURIComponent(id)} />
    </Suspense>
  );
}
