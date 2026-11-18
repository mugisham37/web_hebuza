import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { financeRevenue } from "@/content/pages/finance-revenue";
import { RuleWizard } from "@/components/organisms/finance/rule-wizard";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: financeRevenue(locale).wizard.title, robots: { index: false } };
}

// U13 RuleWizard (lane E).
export default function Page() {
  return (
    <Suspense>
      <RuleWizard />
    </Suspense>
  );
}
