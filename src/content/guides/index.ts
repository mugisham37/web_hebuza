import type { Locale } from "@/shared/i18n/config";
import shotsJson from "./shots.json";
import { CLIENT_GUIDES } from "./client";
import type { Guide, GuideText, ShotData } from "./types";

// Public (client) guides only. Team guides live in ./staff (server-only) so they never reach a public page or bundle.
export { CLIENT_GUIDES };
export const CLIENT_CATS = [
  "start",
  "apply",
  "pay",
  "track",
  "docs",
  "account",
] as const;

const SHOTS = shotsJson as Record<string, Partial<Record<Locale, ShotData>>>;
/** Screenshot data for a locale, each with its image path; a screen not captured in that locale falls back to English. */
export function guideShots(l: Locale): Record<string, ShotData | undefined> {
  return Object.fromEntries(Object.entries(SHOTS).map(([id, by]) => {
    const at = by[l] ? l : by.en ? "en" : (Object.keys(by)[0] as Locale | undefined);
    return [id, at ? { ...by[at]!, src: `/guides/shots/${at}/${id}.jpg` } : undefined];
  }));
}
export const guideText = (g: Guide, l: Locale): GuideText => g.t[l] ?? g.t.en;
/** Everything searchable in a guide, as one string. */
export const guideSearchText = (t: GuideText) =>
  [
    t.keywords,
    ...t.sections.flatMap((s) => [
      s.title,
      s.intro,
      ...(s.steps ?? []).map((x) => x.text.replace(/\*\*/g, "")),
      ...(s.tips ?? []),
      ...(s.faq ?? []).map((f) => `${f.q} ${f.a}`),
    ]),
  ]
    .filter(Boolean)
    .join(" ");
export const guidesForService = (slug: string) =>
  CLIENT_GUIDES.filter((g) => g.service === slug);
/** Related: same topic first, then the most read. */
export const relatedGuides = (list: Guide[], g: Guide, n = 3) =>
  [
    ...list.filter((x) => x.slug !== g.slug && x.cat === g.cat),
    ...list.filter((x) => x.slug !== g.slug && x.cat !== g.cat && x.popular),
  ].slice(0, n);
