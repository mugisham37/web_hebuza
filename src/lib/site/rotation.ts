/** Hero showcase order: every slide of a category, then the next category down, wrapping to the top. */
export type Pos = { c: number; s: number };
export const SLIDE_MS = 6000;

export function nextPos({ c, s }: Pos, sizes: readonly number[]): Pos {
  if (s + 1 < (sizes[c] ?? 0)) return { c, s: s + 1 };
  for (let k = 1; k <= sizes.length; k++) {
    const n = (c + k) % sizes.length;
    if (sizes[n] > 0) return { c: n, s: 0 };
  }
  return { c, s: 0 };
}
/** Manual previous: back one slide, or to the last slide of the category above. */
export function prevPos({ c, s }: Pos, sizes: readonly number[]): Pos {
  if (s > 0) return { c, s: s - 1 };
  for (let k = 1; k <= sizes.length; k++) {
    const n = (c - k + sizes.length) % sizes.length;
    if (sizes[n] > 0) return { c: n, s: sizes[n] - 1 };
  }
  return { c, s: 0 };
}

/** Hero left panel: "intro" (who we are) and "browse" (category menu) take turns. */
export type View = "intro" | "browse";
export const VIEW_MS: Record<View, number> = { intro: 12_000, browse: 30_000 };
export const nextView = (v: View): View => (v === "intro" ? "browse" : "intro");
