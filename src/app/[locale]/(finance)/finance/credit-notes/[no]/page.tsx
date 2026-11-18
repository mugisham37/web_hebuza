import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { financeRefunds } from "@/content/pages/finance-refunds";
import { CreditNoteView } from "@/components/organisms/finance/credit-note";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; no: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const { no } = await params;
  return { title: `${decodeURIComponent(no)} · ${financeRefunds(locale).cn.title}`, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, no: "CN-2026-00001" }));

// U12 Credit note record, board 09 RF4 (lane D).
export default async function Page({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params;
  return (
    <Suspense>
      <CreditNoteView no={decodeURIComponent(no)} />
    </Suspense>
  );
}
