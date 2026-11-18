import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { financeRecon } from "@/content/pages/finance-recon";
import { MatchWorkbench } from "@/components/organisms/finance/recon-workbench";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: financeRecon(locale).workbenchTitle, robots: { index: false } };
}

// One sample param (imports are client-side mock data; any id renders and the view handles not-found).
export const generateStaticParams = () => [{ importId: "imp-001" }];

// U10 Matching workbench, board 07 RC3/RC4 (lane C).
export default async function Page({ params }: { params: Promise<{ importId: string }> }) {
  const { importId } = await params;
  return (
    <Suspense>
      <MatchWorkbench importId={importId} />
    </Suspense>
  );
}
