import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { agentClients } from "@/content/pages/agent-clients";
import { ClientView } from "@/components/organisms/agent/clients";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: agentClients(locale).title, robots: { index: false } };
}

export const generateStaticParams = () => [{ id: "cl-kff" }];

async function View({ params }: { params: Promise<{ id: string }> }) {
  return <ClientView id={(await params).id} />;
}
// U9 Client 360 (limited), board 10 CM2 (lane D).
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <View params={params} />
    </Suspense>
  );
}
