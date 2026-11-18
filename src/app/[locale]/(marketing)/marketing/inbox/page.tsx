import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { mktCrm } from "@/content/pages/mkt-crm";
import { InboxView } from "@/components/organisms/marketing/inbox";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: mktCrm(locale).inbox.title, robots: { index: false } };
}

// U10 Unified inbox, board marketing/07 LD3 (lane CRM). URL: ?channel=&thread=
export default function Page() {
  return <Suspense><InboxView /></Suspense>;
}
