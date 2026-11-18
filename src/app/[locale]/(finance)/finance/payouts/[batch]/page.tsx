import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { financePayouts } from "@/content/pages/finance-payouts";
import { BatchRecord } from "@/components/organisms/finance/payouts";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; batch: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const { batch } = await params;
  return { title: `${decodeURIComponent(batch)} · ${financePayouts(locale).title}`, robots: { index: false } };
}
// One sample batch so the route can prerender (Cache Components); other numbers render on request.
export const generateStaticParams = () => locales.map((locale) => ({ locale, batch: "PB-2026-10" }));

// U14 batch record (lane E). ?tab=lines|export|paid&line=
export default async function Page({ params }: { params: Promise<{ batch: string }> }) {
  const { batch } = await params;
  return (
    <Suspense>
      <BatchRecord no={decodeURIComponent(batch)} />
    </Suspense>
  );
}
