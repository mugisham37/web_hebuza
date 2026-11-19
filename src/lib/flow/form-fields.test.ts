import { describe, expect, it } from "vitest";
import { toFieldDefs } from "./form-fields";

describe("toFieldDefs", () => {
  it("maps builder fields to wizard fields", () => {
    const out = toFieldDefs([
      { id: "tin", type: "id", label: { en: "TIN", rw: "TIN" }, required: true, profile: "org.tin" },
      { id: "kind", type: "select", label: { en: "Kind" }, options: ["A", " ", "B"] },
      { id: "doc", type: "file", label: { en: "Upload" } },
    ], "rw");
    expect(out).toEqual([
      { key: "tin", type: "text", label: "TIN", hint: undefined, optional: false, profile: "org.tin" },
      { key: "kind", type: "radio", label: "Kind", options: ["A", "B"] },
      { key: "doc", type: "file", label: "Upload", hint: undefined, optional: true },
    ]);
    const [g] = toFieldDefs([{ id: "h", type: "group", label: { en: "Holders" }, visibleIf: { field: "kind", equals: "A" }, totalField: "pct",
      children: [{ id: "pct", type: "number", label: { en: "%" }, required: true }] }], "en");
    expect(g).toMatchObject({ type: "group", totalField: "pct", visibleIf: { field: "kind", equals: "A" }, children: [{ key: "pct", optional: false }] });
  });
});
