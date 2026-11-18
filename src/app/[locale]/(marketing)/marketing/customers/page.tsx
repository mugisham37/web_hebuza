import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { mktCrm } from "@/content/pages/mkt-crm";
import { CustomersView } from "@/components/organisms/marketing/customers";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: mktCrm(locale).customers.title, robots: { index: false } };
}

// U11 Customers list, board marketing/08 (lane CRM).
export default function Page() {
  return <Suspense><CustomersView /></Suspense>;
}
