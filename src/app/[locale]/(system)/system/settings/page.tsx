import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { systemSettings } from "@/content/pages/system-settings";
import { SettingsView } from "@/components/organisms/system/settings";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemSettings(locale).title, robots: { index: false } };
}

// U12 Settings (lane D).
export default function Page() {
  return (
    <Suspense>
      <SettingsView group="general" />
    </Suspense>
  );
}
