import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INSTITUTION_ROWS, INSTITUTIONS } from "@/content/marketing";

// Everyone on the client's handwritten list + printed index (2026-11-20/23), plus the ones already shown.
const REQUIRED = ["Irembo", "RRA", "RDB", "RSSB", "City of Kigali", "RICA", "Rwanda FDA", "RURA", "RNP", "RBC", "HEC", "BNR", "RHA", "REMA",
  "CMA", "DGIE", "MoH", "MINICOM", "NAEB", "NLA", "RCAA", "RFL", "RFA", "RMB", "RSB", "RWB", "Kigali SEZ"];

describe("who we file with", () => {
  it("lists every required organisation exactly once, in 3 rows", () => {
    expect(INSTITUTION_ROWS).toHaveLength(3);
    const shorts = INSTITUTIONS.map((i) => i.short);
    expect(new Set(shorts).size).toBe(shorts.length);
    expect(shorts).toEqual(expect.arrayContaining(REQUIRED));
  });
  it("every referenced logo file exists", () => {
    for (const i of INSTITUTIONS) if (i.logo) expect(existsSync(`public/hebuza/institutions/${i.logo}`), i.logo).toBe(true);
  });
});
