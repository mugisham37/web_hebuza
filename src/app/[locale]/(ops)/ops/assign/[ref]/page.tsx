import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { AssignView } from "@/components/organisms/ops/assign";

export const metadata: Metadata = { robots: { index: false } };
export const generateStaticParams = () => locales.map((locale) => ({ locale, ref: "HBZ-4K2M9Q" }));

// U9–U10 assign flow, boards 09 + 10 (lane B). ?step=suggest|brief|scope|offer|rules&external=1&ineligible=1
export default async function Page({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return (
    <Suspense>
      <AssignView refId={decodeURIComponent(ref)} />
    </Suspense>
  );
}
