"use client";
import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { ButtonLink } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import {
  CategoryTab,
  SlideControls,
  SlideTimer,
} from "@/components/atoms/showcase";
import {
  PosterSlide,
  type ShowCat,
} from "@/components/molecules/site/showcase";
import {
  nextPos,
  nextView,
  prevPos,
  SLIDE_MS,
  VIEW_MS,
  type Pos,
  type View,
} from "@/lib/site/rotation";
import { cx } from "@/shared/format";

type Copy = {
  browse: string;
  all: string;
  allIn: string;
  apply: string;
  pause: string;
  play: string;
  next: string;
  prev: string;
  slide: string;
  carousel: string;
};
type Intro = {
  eyebrow: string;
  title: string;
  line: string;
  start: string;
  browse: string;
  about: string;
};
const SEEN = "hebuza.hero.seen";
const useMedia = (q: string) =>
  useSyncExternalStore((cb: () => void) => { const m = window.matchMedia(q); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); }, () => window.matchMedia(q).matches, () => false);

/**
 * Home hero. Left: two views that take turns — "intro" (who we are, wide) then "browse" (category menu, narrow) — while
 * the poster carousel on the right keeps playing and resizes between them. The view switch stops for good once the
 * visitor takes over (clicks a category or a view button); hovering holds it. Return visits in the same session open on
 * "browse"; reduced motion never auto-switches. Phones: intro text, then category chips, then the poster (no switching).
 * Carousel: autoplay walks every slide then the next category; pauses on hover, keyboard focus, a hidden tab or the button.
 */
export function HeroShowcase({
  cats,
  copy,
  intro,
  startHref,
  allHref,
}: {
  cats: ShowCat[];
  copy: Copy;
  intro: Intro;
  startHref: string;
  allHref: string;
}) {
  const uid = useId();
  const [pos, setPos] = useState<Pos>({ c: 0, s: 0 });
  const [view, setView] = useState<View>("intro");
  const [pinned, setPinned] = useState(false); // visitor took over the view
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [hidden, setHidden] = useState(false);
  const still = useMedia("(prefers-reduced-motion: reduce)");
  const desk = useMedia("(min-width: 64rem)"); // ≥ lg: the two views share one panel
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const startX = useRef<number | null>(null);
  const sizes = cats.map((c) => c.slides.length);
  const cat = cats[pos.c];

  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", on);
    // Session memory is read after mount (no SSR mismatch): a return visit opens on the category menu.
    const id = requestAnimationFrame(() => {
      try { if (sessionStorage.getItem(SEEN)) setView("browse"); else sessionStorage.setItem(SEEN, "1"); } catch {}
    });
    return () => { cancelAnimationFrame(id); document.removeEventListener("visibilitychange", on); };
  }, []);
  // The view clock: intro 12 s → browse 30 s → intro … (held while hovered, stopped once pinned or reduced motion).
  useEffect(() => {
    if (pinned || still || hover || hidden) return;
    const t = setTimeout(() => setView((v) => nextView(v)), VIEW_MS[view]);
    return () => clearTimeout(t);
  }, [view, pinned, still, hover, hidden]);
  if (!cat) return null;

  const running = playing && !hover && !focus && !hidden;
  const next = () => setPos((p) => nextPos(p, sizes));
  const prev = () => setPos((p) => prevPos(p, sizes));
  const show = (v: View) => {
    setView(v);
    setPinned(true);
  };
  const pick = (c: number, moveFocus = false) => {
    setPos({ c, s: 0 });
    setPinned(true);
    if (moveFocus) tabs.current[c]?.focus();
  };
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const k = e.key,
      n = cats.length;
    const to =
      k === "ArrowDown" || k === "ArrowRight"
        ? (pos.c + 1) % n
        : k === "ArrowUp" || k === "ArrowLeft"
          ? (pos.c - 1 + n) % n
          : k === "Home"
            ? 0
            : k === "End"
              ? n - 1
              : null;
    if (to === null) return;
    e.preventDefault();
    pick(to, true);
  };
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") startX.current = e.clientX;
  };
  const onUp = (e: PointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 48) (dx < 0 ? next : prev)();
  };
  const panelId = `${uid}-panel`;
  const fill = (s: string, v: Record<string, string | number>) =>
    s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
  const isIntro = view === "intro";

  const introPanel = (
    <div className="flex h-full flex-col justify-center gap-5 lg:gap-6 lg:pr-6">
      <p className="flex items-center gap-3 text-eyebrow font-semibold tracking-[0.14em] text-fg-subtle uppercase">
        <span aria-hidden className="h-px w-10 bg-fg-subtle" />
        {intro.eyebrow}
      </p>
      {/* The page's h1 (same words) is in the section; this is the visible version. */}
      <p
        aria-hidden
        className="max-w-[18ch] text-[clamp(2rem,1.4rem+2.2vw,3.4rem)] leading-[1.06] font-semibold tracking-[-0.03em] text-fg-heading text-balance"
      >
        {intro.title}
      </p>
      <p className="max-w-md text-lead text-fg-muted">{intro.line}</p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href={startHref} size="lg" variant="secondary" dots>
          {intro.start}
        </ButtonLink>
        <button
          type="button"
          onClick={() => show("browse")}
          className="hidden h-14 items-center gap-2 border-[1.5px] border-secondary px-6 text-button text-secondary transition-colors hover:bg-navy-50 lg:inline-flex"
        >
          {intro.browse}
          <Icon name="arrowRight" size={16} aria-hidden />
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="grid gap-5 lg:block"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={(e) => {
        if (e.target.matches(":focus-visible")) setFocus(true);
      }} // keyboard only: a tap or click must not stop autoplay
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setFocus(false);
      }}
    >
      {/* Phones/tablets: the intro is always shown above (no switching). */}
      <div className="lg:hidden">{introPanel}</div>

      <div
        className="grid gap-4 transition-[grid-template-columns] duration-700 ease-(--ease-out-expo) motion-reduce:transition-none lg:h-[clamp(32rem,64vh,40rem)] lg:gap-5 lg:[grid-template-columns:var(--hero-cols)]"
        style={
          {
            "--hero-cols": isIntro ? "42% minmax(0,1fr)" : "22% minmax(0,1fr)",
          } as React.CSSProperties
        }
      >
        <div className="relative min-w-0">
          {/* Desktop intro view */}
          <div
            inert={!isIntro}
            aria-hidden={!isIntro || undefined}
            className={cx(
              "absolute inset-0 hidden transition-opacity duration-500 lg:block",
              isIntro
                ? "opacity-100 delay-200"
                : "pointer-events-none opacity-0",
            )}
          >
            {introPanel}
          </div>
          {/* Browse view (desktop panel) / category chips (phones) */}
          <nav
            aria-label={copy.browse}
            inert={desk && isIntro ? true : undefined}
            className={cx(
              "flex h-full min-w-0 flex-col transition-opacity duration-500 lg:border lg:border-border lg:bg-white",
              isIntro
                ? "lg:pointer-events-none lg:opacity-0"
                : "opacity-100 lg:delay-200",
            )}
          >
            <div className="hidden h-13 shrink-0 items-center justify-between gap-2 bg-navy-900 pr-2 pl-5 text-label text-white lg:flex">
              <span className="truncate">{copy.browse}</span>
              <button
                type="button"
                onClick={() => show("intro")}
                aria-label={intro.about}
                title={intro.about}
                className="flex size-9 shrink-0 items-center justify-center text-navy-100 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Icon name="sparkle" size={16} />
              </button>
            </div>
            <div
              role="tablist"
              aria-orientation="vertical"
              aria-label={copy.browse}
              className="no-scrollbar -mx-gutter flex gap-2 overflow-x-auto px-gutter lg:mx-0 lg:flex lg:flex-1 lg:flex-col lg:gap-0 lg:overflow-hidden lg:px-0"
            >
              {cats.map((c, i) => (
                <CategoryTab
                  key={c.slug}
                  ref={(el) => {
                    tabs.current[i] = el;
                  }}
                  id={`${uid}-tab-${i}`}
                  panelId={panelId}
                  name={c.short}
                  selected={i === pos.c}
                  onSelect={() => pick(i)}
                  onKeyDown={onTabKey}
                />
              ))}
            </div>
            <Link
              href={allHref}
              className="hidden h-12 shrink-0 items-center justify-between px-5 text-label text-navy-700 hover:bg-navy-50 lg:flex"
            >
              {copy.all}
              <Icon name="arrowRight" size={16} aria-hidden />
            </Link>
          </nav>
        </div>

        <section
          id={panelId}
          role="tabpanel"
          aria-labelledby={`${uid}-tab-${pos.c}`}
          aria-roledescription="carousel"
          aria-label={copy.carousel}
          className="relative min-h-[34rem] touch-pan-y overflow-hidden bg-navy-950 sm:min-h-[30rem] lg:min-h-0"
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
                applyLabel={copy.apply}
                allLabel={fill(copy.allIn, { name: cat.name })}
                allHref={cat.href}
              />
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 z-20 px-6 pb-5 sm:px-8 lg:px-10 lg:pb-7">
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
