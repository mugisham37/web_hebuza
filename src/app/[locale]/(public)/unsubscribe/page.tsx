import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { UnsubscribeView } from "@/components/organisms/site/unsubscribe-view";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

export default async function UnsubscribePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  const { locale } = await getI18n(params);
  return <UnsubscribeView locale={locale} token={(await searchParams).token ?? ""} />;
}
