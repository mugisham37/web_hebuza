import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { workHome } from "@/content/pages/work-home";
import { WorkJobs } from "@/components/organisms/agent/work-jobs";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: workHome(locale).jobs.title, robots: { index: false } };
}

// Stage 8 lane C · jobs list: Stage 4 CasesView relabelled. ?view&q&sort
export default function Page() {
  return (
    <Suspense>
      <WorkJobs />
    </Suspense>
  );
}
