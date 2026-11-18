import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { agentOffers } from "@/content/pages/agent-offers";
import { OffersView } from "@/components/organisms/agent/offers";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: agentOffers(locale).title, robots: { index: false } };
}

// U4 Offers, board 05 (lane C). URL: ?tab=pending|accepted|declined|expired&offer=<id>&act=accept|decline.
export default function Page() {
  return (
    <Suspense>
      <OffersView />
    </Suspense>
  );
}
