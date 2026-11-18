import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { systemSettings } from "@/content/pages/system-settings";
import { SettingsView } from "@/components/organisms/system/settings";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemSettings(locale).title, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, group: "security" }));

// U12 Settings (lane D).
export default async function Page({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params;
  return (
    <Suspense>
      <SettingsView group={decodeURIComponent(group)} />
    </Suspense>
  );
}
