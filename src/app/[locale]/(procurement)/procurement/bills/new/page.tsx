import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { procurementDe } from "@/content/pages/procurement-de";
import { BillForm } from "@/components/organisms/procurement/bill-form";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: procurementDe(locale).form.title, robots: { index: false } };
}

// B2 Enter bill (board 07 BL2). URL: ?po=PO-…&contract=CT-…
export default function Page() {
  return <BillForm />;
}
