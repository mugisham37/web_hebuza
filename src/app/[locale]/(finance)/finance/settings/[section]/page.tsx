import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { financeSettings } from "@/content/pages/finance-settings";
import { SettingsView } from "@/components/organisms/finance/settings";
import { SECTIONS, isSection } from "@/components/molecules/finance/settings-sections";

export const generateStaticParams = () => SECTIONS.map((section) => ({ section }));

export async function generateMetadata({ params }: { params: Promise<{ locale: string; section: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const { section } = await params;
  const s = financeSettings(locale);
  return { title: `${s.sections[section] ?? s.title} · ${s.title}`, robots: { index: false } };
}

// U17 Settings, board 13 (lane F): tax · numbering · accounts · policies · history.
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!isSection(section)) notFound();
  return (
    <Suspense>
      <SettingsView section={section} />
    </Suspense>
  );
}
