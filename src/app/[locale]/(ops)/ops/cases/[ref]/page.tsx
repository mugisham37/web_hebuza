import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { CaseView } from "@/components/organisms/ops/case";

export const metadata: Metadata = { robots: { index: false } };
export const generateStaticParams = () => locales.map((locale) => ({ locale, ref: "HBZ-4K2M9Q" }));

// U6–U7 case page, boards 06 + 07 (lane B). ?tab=triage|answers|documents|timeline|messages|billing|audit&doc=&viewAs=1
export default async function Page({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return (
    <Suspense>
      <CaseView refId={decodeURIComponent(ref)} />
    </Suspense>
  );
}
