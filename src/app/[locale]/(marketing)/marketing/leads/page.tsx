import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { mktCrm } from "@/content/pages/mkt-crm";
import { LeadsView } from "@/components/organisms/marketing/leads";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: mktCrm(locale).leads.title, robots: { index: false } };
}

// U9 Leads, board marketing/07 (lane CRM). URL: ?view=board|table|tasks&lead=LD-…&tab=&new=1
export default function Page() {
  return <Suspense><LeadsView /></Suspense>;
}
