import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { agentInbox } from "@/content/pages/agent-inbox";
import { TemplatesView } from "@/components/organisms/agent/templates";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: agentInbox(locale).tpl.pageTitle, robots: { index: false } };
}

// Stage 8: personal templates, same as Stage 4 (lane D).
export default function Page() {
  return (
    <Suspense>
      <TemplatesView />
    </Suspense>
  );
}
