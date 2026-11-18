import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { procurementDe } from "@/content/pages/procurement-de";
import { BillDetailView } from "@/components/organisms/procurement/bill-detail";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; no: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const { no } = await params;
  return { title: `${decodeURIComponent(no)} · ${procurementDe(locale).bills.title}`, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, no: "BL-2026-0119" }));

// B3/B4 Bill record (board 07 BL3/BL4). URL: ?tab=lines|match|approvals|payments|files|history
export default async function Page({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params;
  return (
    <Suspense>
      <BillDetailView no={decodeURIComponent(no)} />
    </Suspense>
  );
}
