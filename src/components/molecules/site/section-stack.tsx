import { Fragment, type ReactNode } from "react";
import { Fade } from "@/components/atoms/brand";
import { cx } from "@/shared/format";

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
                className={cx(s.paint.light && "ramp-light")}
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
 * White → footer navy (#0e174a = grad-night-fade start) in 8 equal OKLab-lightness steps along the brand blues
 * (white → sky-100 → sky-300 → sky-500 → navy-600 → navy-900). Index i = position i/8. Text flips at 50%:
 * above it navy-900 text ≥4.5:1, from 62.5% white text ≥4.5:1; nothing readable sits between (see homePaint).
 */
/** var(--color-ramp-0…8) in globals.css (hex values tested there). */
export const HOME_STOPS = Array.from({ length: 9 }, (_, i) => `var(--color-ramp-${i})`);
export const FLIP = 0.5;
/** Ramp colour at position t ∈ [0,1] (exact stop, or an OKLab mix of its two neighbours). */
export function stopAt(t: number): string {
  const x = Math.min(1, Math.max(0, t)) * (HOME_STOPS.length - 1),
    i = Math.floor(x),
    f = x - i;
  if (f < 1e-6 || i >= HOME_STOPS.length - 1)
    return HOME_STOPS[Math.min(i, HOME_STOPS.length - 1)];
  return `color-mix(in oklab, ${HOME_STOPS[i + 1]} ${Math.round(f * 100)}%, ${HOME_STOPS[i]})`;
}
/**
 * Each visible section spans an equal slice of the ramp (so a CMS reorder or hidden section keeps it white → footer).
 * Sections ending at or above FLIP are `light` (navy text). The one section crossing FLIP keeps navy text: it reaches
 * the FLIP colour 40% down (heading + lead sit there) and finishes the step under its cards and button.
 * shortcut: pricing/guides/CTA are styled for the dark half; make sections tone-aware if the CMS order moves them up.
 */
export function homePaint(keys: string[]): Record<string, Paint> {
  const n = keys.length;
  return Object.fromEntries(
    keys.map((k, i) => {
      const a = i / n,
        b = (i + 1) / n;
      const crosses = a <= FLIP && b > FLIP;
      return [
        k,
        {
          from: stopAt(a),
          to: stopAt(b),
          light: b <= FLIP || crosses,
          ...(crosses && { mid: { color: stopAt(FLIP), at: 0.4 } }),
        },
      ];
    }),
  );
}
