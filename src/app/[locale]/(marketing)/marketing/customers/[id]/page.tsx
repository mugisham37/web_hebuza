import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { mktCrm } from "@/content/pages/mkt-crm";
import { Customer360View } from "@/components/organisms/marketing/customers";

type Props = { params: Promise<{ locale: string; id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: mktCrm(locale).customers.title, robots: { index: false } };
}

async function View({ params }: Props) {
  const { id } = await params;
  return <Customer360View id={id} />;
}
// U11 Customer 360, board marketing/08 CU1 (lane CRM). URL: ?tab=
export default function Page(props: Props) {
  return <Suspense><View {...props} /></Suspense>;
}
