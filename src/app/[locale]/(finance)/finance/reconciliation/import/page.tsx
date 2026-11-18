import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { financeRecon } from "@/content/pages/finance-recon";
import { ImportWizard } from "@/components/organisms/finance/import-wizard";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: financeRecon(locale).importTitle, robots: { index: false } };
}

// U10 Import wizard, board 07 RC2 (lane C).
export default function Page() {
  return (
    <Suspense>
      <ImportWizard />
    </Suspense>
  );
}
