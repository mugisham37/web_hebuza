import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import { bkgCopy } from "@/lib/booking/copy";
import { TypeList } from "@/components/organisms/booking/flow";
import { SkeletonList } from "@/components/atoms/booking";
import { BookShell } from "./_hero";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const c = bkgCopy(locale).types;
  return pageMeta(locale, "/book", { title: c.title.replace(/\.$/, ""), description: c.lead });
}

// /book — consultation types from the API (plan 11 §7.2, BC1). ?service= / ?family= carry into the chosen flow.
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await getI18n(params);
  const c = bkgCopy(locale).types;
  return (
    <BookShell eyebrow={c.eyebrow} title={c.title} lead={c.lead}>
      <Suspense fallback={<SkeletonList n={2} h="h-72" />}><TypeList /></Suspense>
    </BookShell>
  );
}
