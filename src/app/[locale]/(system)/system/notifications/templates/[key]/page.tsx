import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { systemNotifications } from "@/content/pages/system-notifications";
import { TemplateEditorView } from "@/components/organisms/system/template-editor";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemNotifications(locale).template, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, key: "security.new_device_login" }));

// U14 Template editor (lane E).
export default async function Page({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return (
    <Suspense>
      <TemplateEditorView templateKey={decodeURIComponent(key)} />
    </Suspense>
  );
}
