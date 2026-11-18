import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { procurementAb } from "@/content/pages/procurement-ab";
import { DepositsView } from "@/components/organisms/procurement/deposits";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: procurementAb(locale).deposits.title, robots: { index: false } };
}

// D1–D4 Deposits & advances (board 08 DP1/DP2).
export default function Page() {
  return <Suspense><DepositsView /></Suspense>;
}
