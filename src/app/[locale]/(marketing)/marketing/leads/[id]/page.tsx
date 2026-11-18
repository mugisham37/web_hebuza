import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { mktCrm } from "@/content/pages/mkt-crm";
import { LeadPage } from "@/components/organisms/marketing/leads";

type Props = { params: Promise<{ locale: string; id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: mktCrm(locale).leads.title, robots: { index: false } };
}

async function View({ params }: Props) {
  const { id } = await params;
  return <LeadPage id={id} />;
}
// Lead detail (Stage 10 U9 drawer as a page; plan 11 §8.2 `ai.lead_captured` deep link). URL: ?tab=
export default function Page(props: Props) {
  return <Suspense><View {...props} /></Suspense>;
}
