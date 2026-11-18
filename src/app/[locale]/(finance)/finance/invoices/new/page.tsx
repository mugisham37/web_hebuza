import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { financeInvoices } from "@/content/pages/finance-invoices";
import { NewInvoiceView } from "@/components/organisms/finance/invoice-new";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: financeInvoices(locale).new.title, robots: { index: false } };
}

// U7 New invoice, board 05 IN5 (lane B). URL: ?client&case
export default function Page() {
  return (
    <Suspense>
      <NewInvoiceView />
    </Suspense>
  );
}
