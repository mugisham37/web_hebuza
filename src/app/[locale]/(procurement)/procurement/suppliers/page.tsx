import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { procurementAb } from "@/content/pages/procurement-ab";
import { VendorsView } from "@/components/organisms/procurement/vendors";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: procurementAb(locale).vendors.title, robots: { index: false } };
}

// S2 Supplier directory (board 02). URL: ?q=&status=
export default function Page() {
  return <Suspense><VendorsView /></Suspense>;
}
