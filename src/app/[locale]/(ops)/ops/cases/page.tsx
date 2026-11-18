import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { opsCases } from "@/content/pages/ops-cases";
import { CasesView } from "@/components/organisms/ops/cases";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: opsCases(locale).title, robots: { index: false } };
}

// U8 All cases, board 08 (lane A). URL: ?view&q&status&sla&assignee&institution&service&density&cols&sort&open.
export default function Page() {
  return (
    <Suspense>
      <CasesView />
    </Suspense>
  );
}
