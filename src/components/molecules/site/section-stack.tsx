import { Fragment, type ReactNode } from "react";
import { ZigzagBand } from "@/components/atoms/brand";

// WCAG relative luminance of each edge tone (from the globals.css hex); only drives the soft/strong band choice.
const LUM = {
  white: 1, "sky-50": 0.942, "sky-100": 0.8796, "sky-200": 0.7554, "sky-300": 0.6074, "sky-700": 0.1103,
  "navy-300": 0.4703, "navy-700": 0.0323, "navy-800": 0.0187, "navy-900": 0.012, "ink-950": 0.0037,
} as const;
/** Literal classes per tone (Tailwind needs them spelled out). */
export const TONE_BG: Record<Tone, string> = {
  white: "bg-white", "sky-50": "bg-sky-50", "sky-100": "bg-sky-100", "sky-200": "bg-sky-200", "sky-300": "bg-sky-300", "sky-700": "bg-sky-700",
  "navy-300": "bg-navy-300", "navy-700": "bg-navy-700", "navy-800": "bg-navy-800", "navy-900": "bg-navy-900", "ink-950": "bg-ink-950",
};
export const lum = (t: Tone) => LUM[t];
export type Tone = keyof typeof LUM;
export type StackEntry = { key: string; node: ReactNode; top: Tone; bottom: Tone; divider?: boolean; /** paint the section with its tone */ fill?: boolean };

export const contrast = (a: Tone, b: Tone) => (Math.max(LUM[a], LUM[b]) + 0.05) / (Math.min(LUM[a], LUM[b]) + 0.05);

/** Renders sections in order, blending each join with a ZigzagBand (skipped for equal tones, or above an entry with divider:false). */
export function SectionStack({ sections, footerTop }: { sections: StackEntry[]; footerTop?: Tone }) {
  const join = (a: { bottom: Tone }, b: { top: Tone; divider?: boolean }) =>
    a.bottom !== b.top && b.divider !== false ? <ZigzagBand from={a.bottom} to={b.top} soft={contrast(a.bottom, b.top) < 1.3} /> : null;
  const last = sections.at(-1);
  return (
    <>
      {sections.map((s, i) => <Fragment key={s.key}>{i > 0 && join(sections[i - 1], s)}{s.fill ? <div className={TONE_BG[s.top]}>{s.node}</div> : s.node}</Fragment>)}
      {last && footerTop && join(last, { top: footerTop })}
    </>
  );
}

// One light→dark home ramp into the footer (navy-900 → ink-950), by position so a CMS reorder or hidden section keeps
// the fade. Hero + tracker stay white; the rest spread over HOME_RAMP.
// shortcut: pricing + guides are styled for dark tones, CTA is wrapped in theme-dark; make sections tone-aware if the CMS order changes.
export const HOME_RAMP: Tone[] = ["sky-50", "sky-100", "sky-300", "sky-700", "navy-700", "navy-800"];
export function homeTones(keys: string[]): Record<string, Tone> {
  const lead = keys.filter((k) => k === "hero" || k === "tracker"), rest = keys.filter((k) => k !== "hero" && k !== "tracker");
  const at = (j: number) => HOME_RAMP[rest.length < 2 ? 0 : Math.round((j * (HOME_RAMP.length - 1)) / (rest.length - 1))];
  return Object.fromEntries([...lead.map((k) => [k, "white" as Tone]), ...rest.map((k, j) => [k, at(j)])]);
}

