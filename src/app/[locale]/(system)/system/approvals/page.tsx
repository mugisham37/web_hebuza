import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { systemOverview } from "@/content/pages/system-overview";
import { ApprovalsView } from "@/components/organisms/system/approvals";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemOverview(locale).approvals, robots: { index: false } };
}

// U2 Approvals (lane A).
export default function Page() {
  return (
    <Suspense>
      <ApprovalsView />
    </Suspense>
  );
}
