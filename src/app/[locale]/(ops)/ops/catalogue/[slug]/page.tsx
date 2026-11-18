import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { BuilderView } from "@/components/organisms/ops/builder";

export const metadata: Metadata = { robots: { index: false } };
export const generateStaticParams = () => locales.map((locale) => ({ locale, slug: "company-registration" }));

// U16–U17 service builder, boards 16 v2 + 17 v2 (lane E).
// ?step=details|form|documents|checklist|deliverables|pricing|sla|versions&lang=&field=&v=&publish=1
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Suspense>
      <BuilderView slug={decodeURIComponent(slug)} />
    </Suspense>
  );
}
