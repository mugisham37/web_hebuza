import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { agentOffers } from "@/content/pages/agent-offers";
import { OffersView } from "@/components/organisms/agent/offers";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: agentOffers(locale).title, robots: { index: false } };
}

// Stage 8 lane C · offers (board 06 HO2/HO3): Stage 4 OffersView with external earning + counter-propose.
export default function Page() {
  return (
    <Suspense>
      <OffersView />
    </Suspense>
  );
}
