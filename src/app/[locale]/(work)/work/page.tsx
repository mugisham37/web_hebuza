import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { workHome } from "@/content/pages/work-home";
import { WorkHome } from "@/components/organisms/agent/work-home";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: workHome(locale).title, robots: { index: false } };
}

// Stage 8 lane C · /work home (board 06 HO1).
export default function Page() {
  return (
    <Suspense>
      <WorkHome />
    </Suspense>
  );
}
