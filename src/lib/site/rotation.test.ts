import { describe, expect, it } from "vitest";
import { nextPos, prevPos } from "./rotation";

describe("hero rotation", () => {
  const sizes = [3, 0, 2, 1];
  it("plays a category's slides, then moves down (skipping empty), then wraps", () => {
    let p = { c: 0, s: 0 };
    const seen: string[] = [];
    for (let i = 0; i < 7; i++) { seen.push(`${p.c}.${p.s}`); p = nextPos(p, sizes); }
    expect(seen).toEqual(["0.0", "0.1", "0.2", "2.0", "2.1", "3.0", "0.0"]);
  });
  it("prev walks back into the previous category's last slide", () => {
    expect(prevPos({ c: 2, s: 0 }, sizes)).toEqual({ c: 0, s: 2 });
    expect(prevPos({ c: 0, s: 0 }, sizes)).toEqual({ c: 3, s: 0 });
  });
});

