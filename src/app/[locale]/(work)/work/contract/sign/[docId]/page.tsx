import { Suspense } from "react";
import type { Metadata } from "next";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { workContract } from "@/content/pages/work-contract";
import { SignPage } from "@/components/organisms/agent/work-contract";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: workContract(locale).tabs.documents, robots: { index: false } };
}
export const generateStaticParams = () => locales.map((locale) => ({ locale, docId: "doc-sla" }));

// Stage 8 lane F · board 05 CT2 / PCT1: full-page click-to-sign.
export default async function Page({ params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  return (
    <Suspense>
      <SignPage docId={decodeURIComponent(docId)} />
    </Suspense>
  );
}
