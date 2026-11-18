import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { financeReports } from "@/content/pages/finance-reports";
import { ReportsLibrary } from "@/components/organisms/finance/reports";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: financeReports(locale).title, robots: { index: false } };
}

// U16 Report library, board 12 RP1 (lane A). URL: ?q=
export default function Page() {
  return <ReportsLibrary />;
}
