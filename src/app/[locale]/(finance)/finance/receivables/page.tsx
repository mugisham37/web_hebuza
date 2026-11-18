import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { financeReceivables } from "@/content/pages/finance-receivables";
import { ReceivablesView } from "@/components/organisms/finance/receivables";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: financeReceivables(locale).title, robots: { index: false } };
}

// U11 Receivables & ageing, board 08 (lane D). URL: ?bucket&client&q
export default function Page() {
  return (
    <Suspense>
      <ReceivablesView />
    </Suspense>
  );
}
