import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { procurementC } from "@/content/pages/procurement-c";
import { RequestDetail } from "@/components/organisms/procurement/requests";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; no: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const { no } = await params;
  return { title: `${decodeURIComponent(no)} · ${procurementC(locale).board.title}`, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, no: "PR-2026-0087" }));

// Stage 12 lane C detail.
export default async function Page({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params;
  return (
    <Suspense>
      <RequestDetail no={decodeURIComponent(no)} />
    </Suspense>
  );
}
