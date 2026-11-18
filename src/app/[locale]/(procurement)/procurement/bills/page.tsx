import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { procurementDe } from "@/content/pages/procurement-de";
import { BillsView } from "@/components/organisms/procurement/bills";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: procurementDe(locale).bills.title, robots: { index: false } };
}

// B1 Bills inbox (board 07 BL1). URL: ?view=&q=
export default function Page() {
  return <Suspense><BillsView /></Suspense>;
}
