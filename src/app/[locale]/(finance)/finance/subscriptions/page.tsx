import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { financeSubscriptions } from "@/content/pages/finance-subscriptions";
import { SubscriptionsView } from "@/components/organisms/finance/subscriptions";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: financeSubscriptions(locale).title, robots: { index: false } };
}

// F-SUB-09 subscriptions list + pause.
export default function Page() {
  return <SubscriptionsView />;
}
