import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { agentClients } from "@/content/pages/agent-clients";
import { ClientsView } from "@/components/organisms/agent/clients";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: agentClients(locale).title, robots: { index: false } };
}

// U9 My clients, board 10 CM1 (lane D).
export default function Page() {
  return (
    <Suspense>
      <ClientsView />
    </Suspense>
  );
}
