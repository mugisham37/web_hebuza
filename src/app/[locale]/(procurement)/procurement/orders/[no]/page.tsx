import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { procurementC } from "@/content/pages/procurement-c";
import { PoDetailView } from "@/components/organisms/procurement/orders";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; no: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const { no } = await params;
  return { title: `${decodeURIComponent(no)} · ${procurementC(locale).po.title}`, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, no: "PO-2026-0064" }));

// Stage 12 lane C detail.
export default async function Page({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params;
  return (
    <Suspense>
      <PoDetailView no={decodeURIComponent(no)} />
    </Suspense>
  );
}
