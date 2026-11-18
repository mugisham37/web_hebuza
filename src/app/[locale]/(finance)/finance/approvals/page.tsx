import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { financeApprovals } from "@/content/pages/finance-approvals";
import { ApprovalsView } from "@/components/organisms/finance/approvals";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: financeApprovals(locale).title, robots: { index: false } };
}

// U4 Approvals inbox, boards 02 SH3 + 14 (lane A). URL: ?type=&id=
export default function Page() {
  return <ApprovalsView />;
}
