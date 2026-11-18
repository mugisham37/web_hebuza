import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { systemIntegrations } from "@/content/pages/system-integrations";
import { IntegrationsView } from "@/components/organisms/system/integrations";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: systemIntegrations(locale).title, robots: { index: false } };
}

// U12b Integrations (lane D).
export default function Page() {
  return (
    <Suspense>
      <IntegrationsView />
    </Suspense>
  );
}
