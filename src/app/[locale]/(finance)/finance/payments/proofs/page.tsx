import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { financePayments } from "@/content/pages/finance-payments";
import { ProofsView } from "@/components/organisms/finance/proofs";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: financePayments(locale).proofsTitle, robots: { index: false } };
}

// U9 Transfer proofs, board 06 PY3/PY5 (lane C).
export default function Page() {
  return (
    <Suspense>
      <ProofsView />
    </Suspense>
  );
}
