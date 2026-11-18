import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { systemUsers } from "@/content/pages/system-users";
import { OffboardView } from "@/components/organisms/system/offboard";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemUsers(locale).offboard, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, id: "ag-david" }));

// U4 Offboarding (lane B).
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <OffboardView id={decodeURIComponent(id)} />
    </Suspense>
  );
}
