import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { opsWorkforce } from "@/content/pages/ops-workforce";
import { locales } from "@/shared/i18n/config";
import { OffboardView } from "@/components/organisms/ops/offboard";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: opsWorkforce(locale).title, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, id: "ag-grace" }));

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Suspense><OffboardView id={decodeURIComponent(id)} /></Suspense>;
}
