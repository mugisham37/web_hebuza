import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { fieldCopy } from "@/lib/field/copy";
import { FieldSettingsView } from "@/components/organisms/field/field-settings";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const c = fieldCopy(locale);
  return { title: `${c.nav.settings} · ${c.field}`, robots: { index: false } };
}

// U13 lite / battery / wipe (lane D)
export default function Page() {
  return (
    <Suspense>
      <FieldSettingsView />
    </Suspense>
  );
}
