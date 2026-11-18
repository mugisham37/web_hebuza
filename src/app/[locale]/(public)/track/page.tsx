import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import { LC } from "@/content/pages/lc";
import { TrackHero } from "@/components/molecules/site/site";
import { TrackLookup } from "@/components/organisms/site/track";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return pageMeta(locale, `/track`, { title: LC[locale].track.eyebrow, description: LC[locale].track.sub });
}

// /track — photos/To_build/landing/11-track__v1 (entry block).
export default async function TrackPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await getI18n(params);
  const c = LC[locale].track;
  return (
    <TrackHero c={c}>
      <TrackLookup autoFocus />
      <ol className="mt-6 grid gap-3 text-left text-small sm:grid-cols-2">
        {[c.tip1, c.tip2].map((tip, i) => (
          <li key={tip} className="flex items-center gap-3 border border-border bg-white/60 p-3">
            <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-navy-700 text-white">{i + 1}</span>{tip}
          </li>
        ))}
      </ol>
    </TrackHero>
  );
}
