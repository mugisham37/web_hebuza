import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { agentProfile } from "@/content/pages/agent-profile";
import { WorkProfileView } from "@/components/organisms/agent/work-profile";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: agentProfile(locale).title, robots: { index: false } };
}

// Stage 8 lane F · board 11 (phone: section list; desktop: profile section).
export default function Page() {
  return (
    <Suspense>
      <WorkProfileView section={null} />
    </Suspense>
  );
}
