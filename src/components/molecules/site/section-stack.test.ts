import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { FLIP, HOME_STOPS as VARS, homePaint, stopAt } from "./section-stack";

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
const KEYS = ["hero", "tracker", "institutions", "services", "how", "pricing", "guides", "cta"];
const NAVY = CSS.match(/--color-navy-900: (#[0-9a-f]{6})/)![1];

describe("home ramp", () => {
  it("runs white → footer navy in equal lightness steps", () => {
    expect([HOME_STOPS[0], HOME_STOPS.at(-1)]).toEqual(["#ffffff", NAVY]);
    const steps = HOME_STOPS.slice(1).map((h, i) => okL(HOME_STOPS[i]) - okL(h));
    for (const d of steps) expect(Math.abs(d - steps[0])).toBeLessThan(0.006);
  });
  it("each section ends exactly where the next starts (no seam)", () => {
    const p = homePaint(KEYS);
    KEYS.slice(1).forEach((k, i) => expect(p[k].from).toBe(p[KEYS[i]].to));
    expect([p.hero.from, p.cta.to]).toEqual([VARS[0], VARS[8]]);
  });
  it("text passes 4.5:1: navy text on the light half, white on the dark half", () => {
    HOME_STOPS.forEach((h, i) => {
      const t = i / (HOME_STOPS.length - 1);
      if (t <= FLIP) expect(cr(h, NAVY)).toBeGreaterThanOrEqual(4.5);
      else if (t >= FLIP + 0.125) expect(cr(h, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    });
  });
  it("default order: navy text down to How it works, which holds the flip colour behind its heading", () => {
    const p = homePaint(KEYS);
    expect(KEYS.filter((k) => p[k].light)).toEqual(["hero", "tracker", "institutions", "services", "how"]);
    expect(p.how.mid).toEqual({ color: stopAt(FLIP), at: 0.4 });
  });
  it("hidden sections still span the whole ramp", () => {
    const p = homePaint(["hero", "services", "cta"]);
    expect([p.hero.from, p.cta.to]).toEqual([VARS[0], VARS[8]]);
  });
  it("no zigzag left in the codebase", () => {
    expect(execSync("grep -rli zigzag src || true", { encoding: "utf8" }).trim().split("\n").filter((f) => f && !f.endsWith("section-stack.test.ts"))).toEqual([]);
    expect(readFileSync("src/components/atoms/brand.tsx", "utf8")).not.toMatch(/ZigzagBand/);
  });
});
