import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { procurementAb } from "@/content/pages/procurement-ab";
import { ContractDetail } from "@/components/organisms/procurement/contract-detail";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const { id } = await params;
  return { title: `${decodeURIComponent(id)} · ${procurementAb(locale).contracts.title}`, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, id: "ct-lease-1" }));

// S8–S12 Contract record (board 03). URL: ?tab=
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Suspense><ContractDetail id={decodeURIComponent(id)} /></Suspense>;
}
