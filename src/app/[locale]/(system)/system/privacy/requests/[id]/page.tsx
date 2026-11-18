import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { systemPrivacy } from "@/content/pages/system-privacy";
import { DsrDetailView } from "@/components/organisms/system/dsr";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemPrivacy(locale).request, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, id: "DSR-2026-014" }));

// U15 Data request (lane F).
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <DsrDetailView id={decodeURIComponent(id)} />
    </Suspense>
  );
}
