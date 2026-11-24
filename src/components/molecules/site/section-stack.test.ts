import { describe, expect, it } from "vitest";
import { HOME_RAMP, homeTones, lum } from "./section-stack";

const KEYS = ["hero", "tracker", "institutions", "services", "how", "pricing", "guides", "cta"];
describe("home ramp", () => {
  it("default order: white top, every step darker, ends above the footer", () => {
    const t = homeTones(KEYS);
    expect([t.hero, t.tracker]).toEqual(["white", "white"]);
    const seq = KEYS.map((k) => lum(t[k]));
    seq.slice(1).forEach((v, i) => expect(v).toBeLessThanOrEqual(seq[i]));
    expect(t.cta).toBe("navy-800");
  });
  it("hidden sections still span the whole ramp", () => {
    const t = homeTones(["hero", "services", "guides"]);
    expect([t.services, t.guides]).toEqual([HOME_RAMP[0], HOME_RAMP.at(-1)]);
  });
  it("text contrast: dark text on light steps, white on dark steps (≥4.5:1)", () => {
    for (const tone of HOME_RAMP) {
      const l = lum(tone), dark = 0.012; // navy-900 text
      expect(Math.max((l + 0.05) / (dark + 0.05), 1.05 / (l + 0.05))).toBeGreaterThanOrEqual(4.5);
    }
  });
});
