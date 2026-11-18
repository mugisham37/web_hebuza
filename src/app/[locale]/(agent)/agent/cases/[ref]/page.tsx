import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { agentWorkbench } from "@/content/pages/agent-workbench";
import { Workbench } from "@/components/organisms/agent/workbench";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; ref: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const { ref } = await params;
  return { title: `${decodeURIComponent(ref)} · ${agentWorkbench(locale).meta}`, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, ref: "HBZ-8VB2XCQ" }));

// U6 Workbench, boards 06 + 07 (lane B). ?tab=brief|documents|conversation|deliverables|timeline|time|money
export default async function Page({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return (
    <Suspense>
      <Workbench refId={decodeURIComponent(ref)} />
    </Suspense>
  );
}
