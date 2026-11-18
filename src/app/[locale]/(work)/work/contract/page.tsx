import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { workContract } from "@/content/pages/work-contract";
import { ContractView } from "@/components/organisms/agent/work-contract";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: workContract(locale).title, robots: { index: false } };
}

// Stage 8 lane F · board 05. ?tab=overview|documents|rates|licence|renewal|history
export default function Page() {
  return (
    <Suspense>
      <ContractView />
    </Suspense>
  );
}
