import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { workEarnings } from "@/content/pages/work-earnings";
import { StatementSheet } from "@/components/organisms/agent/work-statement";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; month: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const { month } = await params;
  return { title: `${month} · ${workEarnings(locale).st.title}`, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, month: "2026-11" }));

// Stage 8 §7.7 statement detail, board 09 EA2 (lane E).
export default async function Page({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  if (!/^\d{4}-\d{2}$/.test(month)) notFound();
  return (
    <Suspense>
      <StatementSheet month={month} />
    </Suspense>
  );
}
