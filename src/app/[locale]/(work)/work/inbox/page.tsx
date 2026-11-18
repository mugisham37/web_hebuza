import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { agentInbox } from "@/content/pages/agent-inbox";
import { InboxView } from "@/components/organisms/agent/inbox";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: agentInbox(locale).title, robots: { index: false } };
}

// Stage 8 Messages: the Stage 4 inbox, scoped to team/client lanes of the external's own jobs by the mock (lane D).
export default function Page() {
  return (
    <Suspense>
      <InboxView />
    </Suspense>
  );
}
