import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { bkgCopy } from "@/lib/booking/copy";
import { ConfirmationView } from "@/components/organisms/booking/manage";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: bkgCopy(locale).confirmed.title, robots: { index: false, follow: false } };
}

// /book/confirmed/[ref] (plan 11 §7.4): data only with the confirm key from this device's sessionStorage.
// Params are request-time here (no generateStaticParams): read them inside Suspense so the shell can prerender.
export default function Page({ params }: { params: Promise<{ ref: string }> }) {
  return <Suspense><View params={params} /></Suspense>;
}

async function View({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return <section className="px-gutter pt-[var(--spacing-hero-top)] pb-[var(--spacing-section-sm)]"><div className="container-page"><ConfirmationView reference={ref} /></div></section>;
}
