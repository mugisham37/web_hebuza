import { Fragment, type ReactNode } from "react";
import { ZigzagBand } from "@/components/atoms/brand";

// WCAG relative luminance of each edge tone (from the globals.css hex); only drives the soft/strong band choice.
const LUM = { white: 1, "sky-200": 0.7554, "sky-50": 0.942, "ink-950": 0.0037, "navy-900": 0.012, "navy-300": 0.4703 } as const;
export type Tone = keyof typeof LUM;
export type StackEntry = { key: string; node: ReactNode; top: Tone; bottom: Tone; divider?: boolean };

export const contrast = (a: Tone, b: Tone) => (Math.max(LUM[a], LUM[b]) + 0.05) / (Math.min(LUM[a], LUM[b]) + 0.05);

/** Renders sections in order, blending each join with a ZigzagBand (skipped for equal tones, or above an entry with divider:false). */
export function SectionStack({ sections, footerTop }: { sections: StackEntry[]; footerTop?: Tone }) {
  const join = (a: { bottom: Tone }, b: { top: Tone; divider?: boolean }) =>
    a.bottom !== b.top && b.divider !== false ? <ZigzagBand from={a.bottom} to={b.top} soft={contrast(a.bottom, b.top) < 1.3} /> : null;
  const last = sections.at(-1);
  return (
    <>
      {sections.map((s, i) => <Fragment key={s.key}>{i > 0 && join(sections[i - 1], s)}{s.node}</Fragment>)}
      {last && footerTop && join(last, { top: footerTop })}
    </>
  );
}
