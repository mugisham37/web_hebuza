"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ButtonLink } from "@/components/atoms/button";
import { Faces, RwandaFlag } from "@/components/atoms/brand";
import { Icon } from "@/components/atoms/icon";
import { SlideControls, SlideTimer } from "@/components/atoms/showcase";
import {
  PosterSlide,
  type ShowCat,
} from "@/components/molecules/site/showcase";
import { nextPos, prevPos, SLIDE_MS, type Pos } from "@/lib/site/rotation";

type Copy = {
  allIn: string;
  apply: string;
  pause: string;
  play: string;
  next: string;
  prev: string;
  slide: string;
  carousel: string;
};
type Intro = { eyebrow: string; title: string; acronym: string; line: string; start: string; consult: string; consultHref: string; faces: string[]; services: number; areas: number; proof: { services: string; areas: string; pros: string; verified: string; fast: string } };

/**
 * Home hero: "who we are" text on the left, a poster carousel of featured services on the right. The carousel walks every
 * slide of a category, then the next category, wrapping; it pauses on hover, keyboard focus, a hidden tab or the pause
 * button, and reduced motion never autoplays (the timer line that drives it is hidden). Swipe on touch.
 */
export function HeroShowcase({
  cats,
  copy,
  intro,
  startHref,
}: {
  cats: ShowCat[];
  copy: Copy;
  intro: Intro;
  startHref: string;
}) {
  const [pos, setPos] = useState<Pos>({ c: 0, s: 0 });
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [hidden, setHidden] = useState(false);
  const startX = useRef<number | null>(null);
  const sizes = cats.map((c) => c.slides.length);
  const cat = cats[pos.c];

  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  if (!cat) return null;

  const running = playing && !hover && !focus && !hidden;
  const next = () => setPos((p) => nextPos(p, sizes));
  const prev = () => setPos((p) => prevPos(p, sizes));
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") startX.current = e.clientX;
  };
  const onUp = (e: PointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 48) (dx < 0 ? next : prev)();
  };
  const fill = (s: string, v: Record<string, string | number>) =>
    s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-12">
      <div className="flex flex-col gap-6 text-white lg:gap-7">
        <p className="flex w-fit items-center gap-2.5 border border-white/20 bg-white/5 py-1.5 pr-4 pl-1.5 text-eyebrow font-semibold tracking-[0.14em] uppercase">
          <span data-round className="flex size-7 items-center justify-center rounded-full bg-gold-400 text-on-gold"><Icon name="layers" size={14} aria-hidden /></span>{intro.eyebrow}
        </p>
        {/* Visible headline (the page h1 with the same words sits in the section for SEO / screen readers). */}
        <p aria-hidden className="max-w-[17ch] text-[clamp(2.1rem,1.4rem+2.4vw,3.6rem)] leading-[1.06] font-semibold tracking-[-0.03em] text-balance">
          {intro.title} <RwandaFlag /> <span className="text-primary">{intro.acronym}</span>
        </p>
        <p className="max-w-md text-lead text-white/80">{intro.line}</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={startHref} size="lg" variant="primary" dots>{intro.start}</ButtonLink>
          <ButtonLink href={intro.consultHref} size="lg" variant="outline-dark">{intro.consult}</ButtonLink>
        </div>
        {/* Social proof: real faces + the live catalogue size. */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-6">
          <Faces srcs={intro.faces} size={40} />
          <p className="leading-tight"><span className="block text-label-lg">{intro.services}+ {intro.proof.services}</span><span className="text-small text-white/70">{intro.proof.pros}</span></p>
          <span aria-hidden className="hidden h-10 w-px bg-white/15 sm:block" />
          <p className="leading-tight"><span className="block text-label-lg">{intro.areas} {intro.proof.areas}</span><span className="text-small text-white/70">{intro.proof.fast}</span></p>
        </div>
      </div>

      <div className="relative">
        {/* Floating "verified experts" card on the carousel (desktop). */}
        <div aria-hidden className="pointer-events-none absolute -right-5 bottom-24 z-30 hidden items-center gap-3 bg-white px-4 py-3 text-ink-950 shadow-lg lg:flex">
          <span><span className="block text-eyebrow text-ink-500">{intro.proof.verified}</span><span className="text-label-lg">{intro.proof.pros}</span></span>
          <span data-round className="flex size-9 items-center justify-center rounded-full bg-gold-100 text-gold-700"><Icon name="check" size={16} /></span>
        </div>
      <section
        aria-roledescription="carousel"
        aria-label={copy.carousel}
        className="relative min-h-[34rem] touch-pan-y overflow-hidden bg-navy-950 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)] ring-1 ring-white/10 sm:min-h-[30rem] lg:h-[clamp(32rem,64vh,40rem)] lg:min-h-0"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={(e) => {
          if (e.target.matches(":focus-visible")) setFocus(true);
        }} // keyboard only: a tap must not stop autoplay
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null))
            setFocus(false);
        }}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={() => {
          startX.current = null;
        }}
      >
        <div
          aria-live={running ? "off" : "polite"}
          className="absolute inset-0"
        >
          {cat.slides.map((sl, i) => (
            <PosterSlide
              key={sl.key}
              slide={sl}
              active={i === pos.s}
              priority={pos.c === 0 && i === 0}
              label={fill(copy.slide, { i: i + 1, n: cat.slides.length })}
            />
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 z-20 px-6 pb-4 sm:px-8 lg:px-10 lg:pb-5">
          <SlideControls
            count={cat.slides.length}
            index={pos.s}
            playing={playing}
            labels={{
              prev: copy.prev,
              next: copy.next,
              pause: copy.pause,
              play: copy.play,
              slide: (i) => fill(copy.slide, { i, n: cat.slides.length }),
            }}
            onGo={(s) => setPos({ c: pos.c, s })}
            onPrev={prev}
            onNext={next}
            onToggle={() => setPlaying((p) => !p)}
          />
        </div>
        <SlideTimer
          tick={`${pos.c}-${pos.s}`}
          ms={SLIDE_MS}
          running={running}
          onEnd={next}
        />
      </section>
      </div>
    </div>
  );
}
