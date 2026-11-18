import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import { LC } from "@/content/pages/lc";
import { HighlightWord } from "@/components/atoms/brand";
import { Tag } from "@/components/atoms/tag";
import { StatusBoard } from "@/components/organisms/site/status-board";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return pageMeta(locale, `/status`, { title: LC[locale].status.eyebrow });
}

// /status — 13-status__v1.
export default async function StatusPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await getI18n(params);
  const c = LC[locale].status;
  return (
    <section className="px-gutter pt-[var(--spacing-hero-top)] pb-[var(--spacing-section)]">
      <div className="container-page max-w-4xl">
        <Tag variant="navy">{c.eyebrow}</Tag>
        <h1 className="mt-5 mb-10 text-display">{c.title} <HighlightWord>{c.titleHl}</HighlightWord></h1>
        <Suspense fallback={<div className="h-96 animate-pulse bg-ink-100" />}><StatusBoard /></Suspense>
      </div>
    </section>
  );
}
