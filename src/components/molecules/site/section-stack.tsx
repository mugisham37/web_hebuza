import { Fragment, type ReactNode } from "react";
import { ZigzagBand } from "@/components/atoms/brand";

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
  | "ink-950"
  | "hero";
/** `paint` = this section has one flat colour (home ramp); `light` = navy text, else white text. */
export type Paint = { color: string; light: boolean };
export type StackEntry = {
  key: string;
  node: ReactNode;
  top?: Tone;
  bottom?: Tone;
  paint?: Paint;
};

/** Sections in order, each a flat colour; wherever two neighbours differ, a ZigzagBand joins them. */
export function SectionStack({ sections }: { sections: StackEntry[] }) {
  const edge = (e: StackEntry, side: "top" | "bottom") => e.paint?.color ?? e[side];
  return (
    <>
      {sections.map((s, i) => {
        const prev = sections[i - 1];
        const from = prev && edge(prev, "bottom"), to = edge(s, "top");
        return (
          <Fragment key={s.key}>
            {from && to && from !== to && <ZigzagBand from={from} to={to} />}
            {s.paint ? <div className={s.paint.light ? "ramp-light" : "ramp-dark"} style={{ backgroundColor: s.paint.color }}>{s.node}</div> : s.node}
          </Fragment>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------- home ramp
/**
 * White → the footer blue (ramp-8 = 80% of the old navy-900 depth) in 8 equal OKLab-lightness steps along the brand
 * blues; position r = i/8. Navy-900 text clears 4.5:1 up to NAVY_MAX, white text from WHITE_MIN; nothing readable sits
 * between, so the section crossing each threshold reaches it inside its padding (see homePaint).
 */
export const HOME_STOPS = Array.from({ length: 9 }, (_, i) => `var(--color-ramp-${i})`);
/** Hero background: deep brand navy (white text). */
export const HERO_BG = "var(--color-hero)";
export const NAVY_MAX = 0.62, WHITE_MIN = 0.71;
/** Ramp colour at r ∈ [0,1] (exact stop, or an OKLab mix of its two neighbours). */
export function stopAt(t: number): string {
  const x = Math.min(1, Math.max(0, t)) * (HOME_STOPS.length - 1), i = Math.floor(x + 1e-9), f = x - i;
  if (f < 1e-6 || i >= HOME_STOPS.length - 1) return HOME_STOPS[Math.min(i, HOME_STOPS.length - 1)];
  return `color-mix(in oklab, ${HOME_STOPS[i + 1]} ${Math.round(f * 100)}%, ${HOME_STOPS[i]})`;
}
/**
 * Home page: a deep navy hero, "Our services" and "Guides" on a light blue (sky-100), every other section plain white (no bands between them). The zigzag therefore only
 * appears where the colour changes: under the hero here, and above it (HomeHero draws that one under the header).
 */
export function homePaint(keys: string[]): Record<string, Paint> {
  const [first, ...rest] = keys;
  return Object.fromEntries([...(first ? [[first, { color: HERO_BG, light: false }]] : []), ...rest.map((k) => [k, { color: k === "services" || k === "guides" ? "var(--color-sky-100)" : "var(--color-white)", light: true }])]);
}
