import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { financeInvoices } from "@/content/pages/finance-invoices";
import { InvoicesView } from "@/components/organisms/finance/invoices";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: financeInvoices(locale).title, robots: { index: false } };
}

// U7 Invoices list + U15 renewals view, board 05 (lane B). URL: ?view&state&series&client&due&ebm&overdue&q&page
export default function Page() {
  return (
    <Suspense>
      <InvoicesView />
    </Suspense>
  );
}
