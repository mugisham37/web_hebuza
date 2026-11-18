import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { financeRefunds } from "@/content/pages/finance-refunds";
import { RefundDetailView } from "@/components/organisms/finance/refund-detail";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; no: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const { no } = await params;
  return { title: `${decodeURIComponent(no)} · ${financeRefunds(locale).title}`, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, no: "RFD-2026-00045" }));

// U12 Refund record, board 09 RF2–RF5 (lane D).
export default async function Page({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params;
  return (
    <Suspense>
      <RefundDetailView no={decodeURIComponent(no)} />
    </Suspense>
  );
}
