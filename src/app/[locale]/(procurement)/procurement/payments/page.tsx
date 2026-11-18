import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { procurementDe } from "@/content/pages/procurement-de";
import { PaymentsView } from "@/components/organisms/procurement/payments";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: procurementDe(locale).pay.title, robots: { index: false } };
}

// PA Payments tracker (board 08 PA1, read-only). URL: ?q=VP-…|RA-…|BL-…
export default function Page() {
  return <PaymentsView />;
}
