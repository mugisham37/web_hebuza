import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { procurementAb } from "@/content/pages/procurement-ab";
import { ProcHome } from "@/components/organisms/procurement/home";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: procurementAb(locale).home.title, robots: { index: false } };
}

// H1 Home (board 01).
export default function Page() {
  return <Suspense><ProcHome /></Suspense>;
}
