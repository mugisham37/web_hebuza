import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { getFamilies, getServices } from "@/lib/catalogue";
import { bkgCopy } from "@/lib/booking/copy";
import { BookingFlow } from "@/components/organisms/booking/flow";
import { SkeletonList } from "@/components/atoms/booking";
import { BookShell } from "../_hero";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: bkgCopy(locale).common.book, robots: { index: false } };
}

// /book/[type]?step=topic|time|details|pay (plan 11 §7.3). Unknown type → flow renders its own not-found state.
// Params are request-time here (no generateStaticParams): read them inside Suspense so the shell can prerender.
export default function Page({ params }: { params: Promise<{ locale: string; type: string }> }) {
  return <Suspense><View params={params} /></Suspense>;
}

async function View({ params }: { params: Promise<{ locale: string; type: string }> }) {
  const { locale } = await getI18n(params);
  const { type } = await params;
  const [families, services] = await Promise.all([getFamilies(locale), getServices(locale)]);
  const c = bkgCopy(locale);
  return (
    <BookShell eyebrow={c.types.eyebrow} title={c.common.book}>
      <Suspense fallback={<SkeletonList n={3} h="h-28" />}>
        <BookingFlow slug={type} topics={families.map((f) => ({ slug: f.slug, name: f.name }))} services={services.map((s) => ({ slug: s.slug, name: s.name, family: s.family }))} />
      </Suspense>
    </BookShell>
  );
}
