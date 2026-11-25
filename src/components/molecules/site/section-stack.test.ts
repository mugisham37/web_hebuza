import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { HOME_STOPS as VARS, homePaint, NAVY_MAX, stopAt, WHITE_MIN } from "./section-stack";

const CSS = readFileSync("src/app/globals.css", "utf8");
const HOME_STOPS = VARS.map((v) => CSS.match(new RegExp(`${v.slice(4, -1)}: (#[0-9a-f]{6})`))![1]);

const lin = (c: number) => (c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const lum = (h: string) => { const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// OKLab L (perceived lightness) for the equal-step check.
const okL = (h: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16)));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
};
const KEYS = ["hero", "tracker", "institutions", "services", "how", "guides", "cta"];
const NAVY = CSS.match(/--color-navy-900: (#[0-9a-f]{6})/)![1];
const OLD_FOOTER = NAVY; // the footer used to be navy-900
// OKLab mix of the two neighbouring stops at r (what stopAt's color-mix renders).
const lab = (h: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16)));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const hexOf = ([L, A, B]: number[]) => {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const enc = (c: number) => { c = Math.min(1, Math.max(0, c)); return Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255); };
  return "#" + [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map((c) => enc(c).toString(16).padStart(2, "0")).join("");
};
const colourAt = (r: number) => { const x = r * 8, i = Math.min(7, Math.floor(x)), f = x - i, [p, q] = [lab(HOME_STOPS[i]), lab(HOME_STOPS[i + 1])]; return hexOf(p.map((v, k) => v + (q[k] - v) * f)); };

describe("home ramp", () => {
  it("runs white → footer blue (60% of the old navy depth) in equal lightness steps", () => {
    expect(HOME_STOPS[0]).toBe("#ffffff");
    const depth = (okL("#ffffff") - okL(HOME_STOPS[8])) / (okL("#ffffff") - okL(OLD_FOOTER));
    expect(Math.abs(depth - 0.6)).toBeLessThan(0.01);
    const steps = HOME_STOPS.slice(1).map((h, i) => okL(HOME_STOPS[i]) - okL(h));
    for (const d of steps) expect(Math.abs(d - steps[0])).toBeLessThan(0.006);
  });
  it("each section ends exactly where the next starts (no seam)", () => {
    const p = homePaint(KEYS);
    KEYS.slice(1).forEach((k, i) => expect(p[k].from).toBe(p[KEYS[i]].to));
    expect([p.hero.from, p.cta.to]).toEqual([VARS[0], VARS[8]]);
  });
  it("text passes 4.5:1: navy text up to NAVY_MAX, white text from WHITE_MIN (footer included)", () => {
    for (let r = 0; r <= NAVY_MAX + 1e-9; r += 0.01) expect(cr(colourAt(r), NAVY)).toBeGreaterThanOrEqual(4.5);
    for (let r = WHITE_MIN; r <= 1 + 1e-9; r += 0.01) expect(cr(colourAt(Math.min(r, 1)), "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });
  it("default order: navy text down to Guides, CTA white; each crosses its threshold inside padding", () => {
    const p = homePaint(KEYS);
    expect(KEYS.filter((k) => !p[k].light)).toEqual(["cta"]);
    expect(p.guides.mid).toEqual({ color: stopAt(NAVY_MAX), at: 0.88 });
    expect(p.cta.mid).toEqual({ color: stopAt(WHITE_MIN), at: 0.15 });
  });
  it("hidden sections still span the whole ramp", () => {
    const p = homePaint(["hero", "services", "cta"]);
    expect([p.hero.from, p.cta.to]).toEqual([VARS[0], VARS[8]]);
  });
  it("no zigzag left in the codebase", { timeout: 30_000 }, () => {
    expect(execSync("grep -rli zigzag src || true", { encoding: "utf8" }).trim().split("\n").filter((f) => f && !f.endsWith("section-stack.test.ts"))).toEqual([]);
    expect(readFileSync("src/components/atoms/brand.tsx", "utf8")).not.toMatch(/ZigzagBand/);
  });
});
