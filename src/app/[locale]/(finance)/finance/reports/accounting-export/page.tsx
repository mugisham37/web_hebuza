import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { financeReports } from "@/content/pages/finance-reports";
import { AccountingExport } from "@/components/organisms/finance/accounting-export";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: financeReports(locale).journal.title, robots: { index: false } };
}

// U16 Accounting export wizard, board 12 RP3 (lane A). URL: ?step=&from=&to=&format=
export default function Page() {
  return <AccountingExport />;
}
