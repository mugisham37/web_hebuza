import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { financeReports } from "@/content/pages/finance-reports";
import type { ReportKey } from "@/lib/finance/a";
import { ReportView } from "@/components/organisms/finance/reports";

// "@/lib/finance/a" is a client module: check the key against the (server-safe) copy table instead.
const isReportKey = (k: string): k is ReportKey => Object.hasOwn(financeReports("en").reports, k);

type P = { params: Promise<{ locale: string; key: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const { key } = await params;
  const c = financeReports(locale);
  return { title: isReportKey(key) ? c.reports[key].title : c.title, robots: { index: false } };
}

export const generateStaticParams = () => [{ key: "fin.collections" }];


// U16 Report detail, board 12 RP2 (lane A). URL: ?from=&to=&group=&drill=&row=
export default async function Page({ params }: P) {
  const { key } = await params;
  if (!isReportKey(key)) notFound();
  return <ReportView reportKey={key} />;
}
