import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { workFirm } from "@/content/pages/work-firm";
import { FirmTeam } from "@/components/organisms/agent/work-firm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: workFirm(locale).title, robots: { index: false } };
}

// Firm team, board 10 (lane G). ?tab=members|jobs|payouts — firm admin only.
export default function Page() {
  return (
    <Suspense>
      <FirmTeam />
    </Suspense>
  );
}
