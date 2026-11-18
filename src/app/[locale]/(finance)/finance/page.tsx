import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { financeOverview } from "@/content/pages/finance-overview";
import { OverviewView } from "@/components/organisms/finance/overview";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: financeOverview(locale).title, robots: { index: false } };
}

// U3 Overview, board 03 v2 (lane A). URL: ?date=YYYY-MM-DD
export default function Page() {
  return <OverviewView />;
}
