import Image from "next/image";
import type { ReactNode } from "react";
import { cx } from "@/shared/format";

// Brand atoms (Highlight marker, Dots block, Faces, Seal, Mark, Grid Lines, Rule) in the Hebuza sharp system.

const STAR8 = "50,0 56,38 85,15 62,44 100,50 62,56 85,85 56,62 50,100 44,62 15,85 38,56 0,50 38,44 15,15 44,38";
const STAR12 = "50,0 54.7,32.6 75,6.7 62.7,37.3 93.3,25 67.4,45.3 100,50 67.4,54.7 93.3,75 62.7,62.7 75,93.3 54.7,67.4 50,100 45.3,67.4 25,93.3 37.3,62.7 6.7,75 32.6,54.7 0,50 32.6,45.3 6.7,25 37.3,37.3 25,6.7 45.3,32.6";

/** 8- or 12-point star mark (marquee separator, section marks, badges). */
export function Star({ points = 8, className }: { points?: 8 | 12; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cx("inline-block shrink-0", className)} fill="currentColor" aria-hidden>
      <polygon points={points === 8 ? STAR8 : STAR12} />
    </svg>
  );
}

/** Straight gold-200 marker block behind a word (D8). `tone`/`rotate` are accepted for back-compat and ignored (no tilt). */
export function HighlightWord({ children, className }: { children: ReactNode; tone?: "lavender" | "lime" | "gold"; rotate?: number; className?: string }) {
  return (
    <span className={cx("relative inline-block max-w-full px-[0.14em] text-navy-950 sm:whitespace-nowrap", className)}>
      <span aria-hidden data-highlight className="absolute inset-x-0 top-[0.18em] bottom-[0.02em] -z-0 rounded-md bg-gold-200" />
      <span className="relative">{children}</span>
    </span>
  );
}

/** Square gold block with navy dots, inline in headlines. */
export function DotsPill({ className }: { className?: string }) {
  return (
    <span aria-hidden data-pop className={cx("inline-flex h-[0.72em] translate-y-[-0.06em] items-center gap-[0.09em] rounded-md bg-gold-400 px-[0.2em] align-middle", className)}>
      <span className="size-[0.13em] rounded-full bg-navy-950" />
      <span className="size-[0.13em] rounded-full bg-navy-950/45" />
      <span className="size-[0.13em] rounded-full bg-navy-950/20" />
    </span>
  );
}

/** Round faces overlapping (landing1 "Faces"); `inline` sizes them to the surrounding text. */
export function Faces({ srcs, inline, size = 48, className }: { srcs: string[]; inline?: boolean; size?: number; className?: string }) {
  return (
    <span aria-hidden className={cx("inline-flex align-middle", inline ? "-space-x-[0.18em] translate-y-[-0.05em]" : "-space-x-3", className)}>
      {srcs.map((s, i) => (
        <span key={s} data-pop data-round className={cx("relative inline-block overflow-hidden rounded-full ring-[3px] ring-white", inline && "size-[0.74em]")} style={inline ? { zIndex: srcs.length - i } : { width: size, height: size, zIndex: srcs.length - i }}>
          <Image src={s} alt="" fill sizes="96px" className="object-cover" />
        </span>
      ))}
    </span>
  );
}

/** Scattered face cluster with a navy tag (landing1 "What we do" aside, CTA card). */
export function FaceCluster({ srcs, tag, className }: { srcs: string[]; tag: string; className?: string }) {
  const spots = [
    "left-[18%] top-0 size-12", "left-0 top-[28%] size-16", "left-[40%] top-[20%] size-11", "left-[22%] top-[52%] size-[4.5rem]", "left-[56%] top-[6%] size-10",
  ];
  return (
    <div className={cx("relative h-40 w-56", className)}>
      {srcs.slice(0, 5).map((s, i) => (
        <span key={s} data-pop data-round className={cx("absolute overflow-hidden rounded-full ring-[3px] ring-white", spots[i])}>
          <Image src={s} alt="" fill sizes="80px" className="object-cover" />
        </span>
      ))}
      <span data-pop className="absolute top-[64%] left-[46%] rounded-md bg-navy-700 px-3 py-1.5 text-small font-medium whitespace-nowrap text-white">{tag}</span>
    </div>
  );
}

/** Round navy seal: circular text around a gold star, slow spin (kept round, D7). */
export function CircleBadge({ text, className, center = <Star className="size-9 text-primary" />, size = "size-28" }: { text: string; className?: string; center?: ReactNode; size?: string }) {
  const id = `ring-${text.length}`;
  return (
    <span data-pop data-round className={cx("theme-dark relative inline-flex items-center justify-center rounded-full bg-navy-700 text-white ring-4 ring-white", size, className)}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full animate-spin-slow motion-reduce:animate-none" aria-hidden>
        <defs><path id={id} d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" /></defs>
        <text fill="currentColor" fontSize="9.5" fontWeight="600" letterSpacing="2.2"><textPath href={`#${id}`}>{text}</textPath></text>
      </svg>
      {center}
      <span className="sr-only">{text}</span>
    </span>
  );
}

/** Thin ink-200 column lines behind light sections (desktop only, decorative). */
export function GridLines({ className }: { className?: string }) {
  return <div aria-hidden className={cx("pointer-events-none absolute inset-0 bg-grid", className)} />;
}

/** Hairline rule; `accent` uses the rule role (navy on light, gold in .theme-dark). `data-rule` lets the motion layer draw it in. */
export function Rule({ tone = "light", className }: { tone?: "light" | "dark" | "accent"; className?: string }) {
  return <hr data-rule className={cx("h-px origin-left border-0", tone === "accent" ? "bg-rule" : tone === "dark" ? "bg-ink-800" : "bg-border", className)} />;
}

/** 48×3 accent bar above a section heading (guide §7). */
export function AccentBar({ className }: { className?: string }) {
  return <span aria-hidden className={cx("block h-[3px] w-12 bg-primary", className)} />;
}

/** Big Archivo numeral ("04", "48"). Add data-count to animate (motion layer). */
export function BigNumber({ value, className, count }: { value: string | number; className?: string; count?: boolean }) {
  return <span data-count={count ? String(value) : undefined} className={cx("block font-display text-num text-fg-heading tabular", className)}>{value}</span>;
}

/** Soft vertical fade between two colour tokens (var(--color-<token>)); joins a page's last section to the footer. Decorative. */
export function Fade({ from, to, className }: { from: string; to: string; className?: string }) {
  return <div aria-hidden className={cx("pointer-events-none -my-px h-12 forced-colors:hidden print:hidden", className)}
    style={{ backgroundImage: `linear-gradient(in oklab to bottom, var(--color-${from}), var(--color-${to}))` }} />;
}
