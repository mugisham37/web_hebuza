import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { financeRecon } from "@/content/pages/finance-recon";
import { ReconHome } from "@/components/organisms/finance/recon-home";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: financeRecon(locale).title, robots: { index: false } };
}

// U10 Reconciliation home, board 07 RC1/RC5/PR1 (lane C).
export default function Page() {
  return (
    <Suspense>
      <ReconHome />
    </Suspense>
  );
}
