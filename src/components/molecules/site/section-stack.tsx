import { Fragment, type ReactNode } from "react";
import { Fade } from "@/components/atoms/brand";

/** Section edge tones used by the inner pages (services, how-it-works); token = var(--color-<tone>). */
export type Tone =
  | "white"
  | "sky-50"
  | "sky-100"
  | "sky-200"
  | "sky-300"
  | "sky-700"
  | "navy-300"
  | "navy-700"
  | "navy-800"
  | "navy-900"
  | "ink-950";
/** `paint` = this section draws its own top→bottom gradient (home ramp); edges then always meet, so no fade is added. */
export type Paint = {
  from: string;
  to: string;
  mid?: { color: string; at: number };
  light: boolean;
};
export type StackEntry = {
  key: string;
  node: ReactNode;
  top?: Tone;
  bottom?: Tone;
  paint?: Paint;
};

/** Sections in order. Painted sections join seamlessly; plain sections with different edge tones get a soft Fade. */
export function SectionStack({ sections }: { sections: StackEntry[] }) {
  return (
    <>
      {sections.map((s, i) => {
        const prev = sections[i - 1];
        const fade =
          prev &&
          !prev.paint &&
          !s.paint &&
          prev.bottom &&
          s.top &&
          prev.bottom !== s.top;
        return (
          <Fragment key={s.key}>
            {fade && <Fade from={prev.bottom!} to={s.top!} />}
            {s.paint ? (
              <div
                className={s.paint.light ? "ramp-light" : "ramp-dark"}
                style={{ backgroundImage: gradient(s.paint) }}
              >
                {s.node}
              </div>
            ) : (
              s.node
            )}
          </Fragment>
        );
      })}
    </>
  );
}
const gradient = (p: Paint) =>
  `linear-gradient(in oklab to bottom, ${p.from}${p.mid ? `, ${p.mid.color} ${Math.round(p.mid.at * 100)}%` : ""}, ${p.to})`;

// ---------------------------------------------------------------- home ramp
/**
 * White → the footer blue (ramp-8 = 60% of the old navy-900 depth) in 8 equal OKLab-lightness steps along the brand
 * blues; position r = i/8. Navy-900 text clears 4.5:1 up to NAVY_MAX, white text from WHITE_MIN; nothing readable sits
 * between, so the section crossing each threshold reaches it inside its padding (see homePaint).
 */
export const HOME_STOPS = Array.from({ length: 9 }, (_, i) => `var(--color-ramp-${i})`);
export const NAVY_MAX = 0.83, WHITE_MIN = 0.94;
/** Ramp colour at r ∈ [0,1] (exact stop, or an OKLab mix of its two neighbours). */
export function stopAt(t: number): string {
  const x = Math.min(1, Math.max(0, t)) * (HOME_STOPS.length - 1), i = Math.floor(x + 1e-9), f = x - i;
  if (f < 1e-6 || i >= HOME_STOPS.length - 1) return HOME_STOPS[Math.min(i, HOME_STOPS.length - 1)];
  return `color-mix(in oklab, ${HOME_STOPS[i + 1]} ${Math.round(f * 100)}%, ${HOME_STOPS[i]})`;
}
/**
 * Each visible section spans an equal slice of the ramp (a CMS reorder or hidden section keeps it white → footer blue).
 * Navy text while the section starts below NAVY_MAX: if it ends past it, it reaches NAVY_MAX 88% down (its bottom
 * padding/opaque cards) and finishes the step there. White text otherwise: if it starts below WHITE_MIN it reaches
 * it 15% down (the home CTA has top padding for this).
 * shortcut: assumes the default order puts the CTA last; make sections tone-aware if the CMS moves white-text sections up.
 */
export function homePaint(keys: string[]): Record<string, Paint> {
  const n = keys.length;
  return Object.fromEntries(keys.map((k, i) => {
    const a = i / n, b = (i + 1) / n, light = a < NAVY_MAX;
    const mid = light ? (b > NAVY_MAX ? { color: stopAt(NAVY_MAX), at: 0.88 } : undefined) : a < WHITE_MIN ? { color: stopAt(WHITE_MIN), at: 0.15 } : undefined;
    return [k, { from: stopAt(a), to: stopAt(b), light, ...(mid && { mid }) }];
  }));
}
