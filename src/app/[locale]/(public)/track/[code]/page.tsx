import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { LC, normaliseCode } from "@/content/pages/lc";
import { TrackResult } from "@/components/organisms/site/track";

// One sample param keeps cacheComponents happy; other codes render on first request (shell only, data loads client-side).
export const generateStaticParams = () => [{ code: "HBZ-WMVX19" }];

// Codes are private-ish: keep result pages out of search.
export const metadata: Metadata = { robots: { index: false } };

// /track/[code] — summary → verify → full tracker (11-track__v1).
export default async function TrackCodePage({ params }: { params: Promise<{ locale: string; code: string }> }) {
  const { locale } = await getI18n(params);
  const { code } = await params;
  return (
    <section className="px-gutter pt-[var(--spacing-hero-top)] pb-[var(--spacing-section-sm)]">
      <div className="container-page grid max-w-5xl gap-6">
        <h1 className="text-h2">{LC[locale].track.title1} {LC[locale].track.titleHl}</h1>
        <TrackResult code={normaliseCode(decodeURIComponent(code))} />
      </div>
    </section>
  );
}
