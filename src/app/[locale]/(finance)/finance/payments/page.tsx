import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { financePayments } from "@/content/pages/finance-payments";
import { PaymentsView } from "@/components/organisms/finance/payments";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: financePayments(locale).title, robots: { index: false } };
}

// U8 Payments, board 06 PY1/PY2/PY4/PY6 (lane C).
export default function Page() {
  return (
    <Suspense>
      <PaymentsView />
    </Suspense>
  );
}
