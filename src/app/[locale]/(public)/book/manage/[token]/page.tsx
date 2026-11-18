import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { bkgCopy } from "@/lib/booking/copy";
import { ManageByToken } from "@/components/organisms/booking/manage";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: bkgCopy(locale).manage.title, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

// /book/manage/[token] (plan 11 §7.5, F-BKG-09): magic link from email/SMS; invalid → resend form (no enumeration).
// Params are request-time here (no generateStaticParams): read them inside Suspense so the shell can prerender.
export default function Page({ params }: { params: Promise<{ token: string }> }) {
  return <Suspense><View params={params} /></Suspense>;
}

async function View({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <section className="px-gutter pt-[var(--spacing-hero-top)] pb-[var(--spacing-section-sm)]"><div className="container-page"><ManageByToken token={token} /></div></section>;
}
