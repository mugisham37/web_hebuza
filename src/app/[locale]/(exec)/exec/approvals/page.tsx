import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { systemOverview } from "@/content/pages/system-overview";
import { ApprovalsInbox } from "@/components/organisms/system/approvals";
import { ExecProcApprovals } from "@/components/organisms/procurement/exec";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemOverview(locale).approvals, robots: { index: false } };
}

// X-6 executive approvals (lane A): the shared inbox, server-filtered to kinds an executive approves. Stage 14 extends.
export default function Page() {
  return (
    <Suspense>
      <div className="grid gap-10">
        <ExecProcApprovals />
        <ApprovalsInbox viewer="executive" />
      </div>
    </Suspense>
  );
}
