import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { procurementAb } from "@/content/pages/procurement-ab";
import { ContractsView } from "@/components/organisms/procurement/contracts";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: procurementAb(locale).contracts.title, robots: { index: false } };
}

// S7 Contracts & leases (board 03).
export default function Page() {
  return <Suspense><ContractsView /></Suspense>;
}
