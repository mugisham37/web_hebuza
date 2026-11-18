import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { financeInvoices } from "@/content/pages/finance-invoices";
import { InvoiceView } from "@/components/organisms/finance/invoice-detail";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: financeInvoices(locale).title, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, no: "INV-2026-00001" }));

// U7 Invoice detail, board 05 IN2–IN4 (lane B). URL: ?tab=details|payments|credit|documents|reminders|history
export default async function Page({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params;
  return (
    <Suspense>
      <InvoiceView no={decodeURIComponent(no)} />
    </Suspense>
  );
}
