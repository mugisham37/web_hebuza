"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cx } from "@/shared/format";

export type MosaicTile = { src: string; alt: string; caption: string; href: string };

/** Home hero photo strip: 3 drifting rows of 4:3 tiles bleeding off the right edge (2 rows below lg). Each tile links to the service it
 *  shows and carries a short hint. Order is shuffled per visit after hydration (server renders the authored order, so no mismatch). */
export function HeroMosaic({ tiles }: { tiles: MosaicTile[] }) {
  const [order, setOrder] = useState(tiles);
  useEffect(() => {
    const a = [...tiles];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    setOrder(a); // eslint-disable-line react-hooks/set-state-in-effect -- browser-only randomness after hydration
  }, [tiles]);
  const n = Math.ceil(order.length / 3);
  const rows = [order.slice(0, n), order.slice(n, 2 * n), order.slice(2 * n)];
  const drift = ["[animation-duration:120s]", "[animation-duration:150s] [animation-direction:reverse]", "[animation-duration:135s]"];
  const tile = (t: MosaicTile, r: number, dup: boolean) => (
    <Link key={`${t.src}${dup ? "-d" : ""}`} href={t.href} aria-label={dup ? undefined : t.caption} aria-hidden={dup || undefined} tabIndex={dup ? -1 : undefined}
      className="group/tile shrink-0 pr-2.5 focus-visible:outline-offset-[-4px]">
      <figure className="relative aspect-[4/3] w-[min(42vw,25vh)] overflow-hidden bg-navy-900 lg:w-[13vw]">
        <Image src={t.src} alt={dup ? "" : t.alt} fill sizes="(min-width: 1024px) 13vw, 42vw" loading={r === 0 && !dup ? "eager" : "lazy"}
          className="object-cover transition-transform duration-(--duration-slow) group-hover/tile:scale-105 motion-reduce:transition-none" />
        {/* Caption is part of the photo: a soft navy scrim rises from the bottom edge and the hint sits in it in light blue, no box. */}
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-navy-900/70 via-navy-900/25 to-transparent transition-opacity duration-(--duration-slow) group-hover/tile:from-navy-900/85" />
        <figcaption className="absolute inset-x-0 bottom-0 truncate px-3 pb-2 text-eyebrow font-semibold tracking-[0.08em] text-navy-100/90 uppercase [text-shadow:0_1px_6px_color-mix(in_oklab,var(--color-navy-900)_60%,transparent)] transition-colors group-hover/tile:text-white">{t.caption}</figcaption>
      </figure>
    </Link>
  );
  return (
    // clip only the left edge so rows never drift over the text column; the section's overflow-hidden crops the right.
    <div data-hero="actions" className="group -mx-gutter grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2.5 [clip-path:inset(0_-100vw_0_0)] lg:mx-0">
      {rows.map((row, r) => (
        <div key={r} className={cx(r === 2 && "max-lg:hidden", r === 1 ? "-ml-16" : r === 2 && "-ml-8")}>
          <div className={cx("flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none", drift[r])}>
            {row.map((t) => tile(t, r, false))}
            <div aria-hidden className="contents">{row.map((t) => tile(t, r, true))}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
