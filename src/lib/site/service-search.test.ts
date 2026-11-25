import { describe, expect, it } from "vitest";
import { buildIndex, searchServices, type SearchItem } from "./service-search";

const items: SearchItem[] = [
  { slug: "company-registration", path: "company-registration", name: "Company Registration", family: "Online services", popular: 9 },
  { slug: "vat-registration", path: "vat-registration", name: "Application for VAT registration", family: "Online services" },
  { slug: "tin", path: "tin", name: "Activating TIN status from dormancy", family: "Online services" },
  { slug: "ebm", path: "ebm", name: "Application for EBM acquisition and installation", family: "Online services" },
  { slug: "plan", path: "plan", name: "Business plan preparation", family: "Taxes and business support", summary: "A bankable plan for investors" },
  { slug: "creation", path: "creation", name: "Création de société", family: "Services en ligne" },
];
const idx = buildIndex(items);
const top = (q: string) => searchServices(idx, q).map((h) => h.item.slug);

describe("service search", () => {
  it("prefix of the name wins, left to right", () => expect(top("comp")[0]).toBe("company-registration"));
  it("any word prefix, every word must match", () => {
    expect(top("vat reg")).toEqual(["vat-registration"]);
    expect(top("registration")).toEqual(expect.arrayContaining(["company-registration", "vat-registration"]));
  });
  it("matches category / summary too", () => expect(top("investors")).toEqual(["plan"]));
  it("forgives one typo and accents", () => {
    expect(top("regsitration")).toContain("company-registration");
    expect(top("creation societe")).toEqual(["creation"]);
  });
  it("single letters and nonsense", () => {
    expect(top("c").length).toBeGreaterThan(0);
    expect(top("zzqx")).toEqual([]);
    expect(top("   ")).toEqual([]);
  });
  it("highlights the matched part of the original name", () => {
    const h = searchServices(idx, "regis").find((x) => x.item.slug === "company-registration")!;
    expect(h.item.name.slice(...h.ranges[0])).toBe("Regis");
  });
});
