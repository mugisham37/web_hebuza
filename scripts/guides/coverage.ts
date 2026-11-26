// Guide screenshot coverage: for every step `shot` (dashboard + public guides), per locale: image present? marks all placed?
//   npx tsx --conditions=react-server scripts/guides/coverage.ts [workspace]
import { existsSync, readFileSync } from "node:fs";
import { WS_SETS } from "../../src/content/guides/workspaces/index";
import { CLIENT_GUIDES } from "../../src/content/guides/client";

const L = ["en", "rw", "fr"] as const;
const only = process.argv[2];
const groups: [string, { t: Record<string, { sections: { steps?: { shot?: string; marks?: string[] }[] }[] }> }[], string][] = [
  ...Object.entries(WS_SETS).map(([w, s]) => [w, s.guides, `src/content/guides/shots/${w}.json`] as [string, typeof s.guides, string]),
  ["public", CLIENT_GUIDES, "src/content/guides/shots.json"],
];
let bad = 0;
for (const [w, guides, json] of groups) {
  if (only && only !== w) continue;
  const db = existsSync(json) ? JSON.parse(readFileSync(json, "utf8")) : {};
  const need = new Map<string, number>();
  for (const g of guides) for (const s of g.t.en.sections) for (const st of s.steps ?? []) if (st.shot) need.set(st.shot, Math.max(need.get(st.shot) ?? 0, (st.marks ?? []).filter((m) => m).length ? (st.marks ?? []).length : 0));
  const probs: string[] = [];
  for (const [id, n] of need) for (const l of L) {
    const img = existsSync(`public/guides/shots/${l}/${id}.jpg`), rec = db[id]?.[l];
    if (!img || !rec) { probs.push(`${id}/${l}: missing`); continue; }
    const nulls = (rec.marks as unknown[]).map((m, i) => (m ? -1 : i)).filter((i) => i >= 0);
    if (nulls.length) probs.push(`${id}/${l}: marks not placed ${nulls.map((i) => i + 1).join(",")}`);
    if (rec.marks.length < n) probs.push(`${id}/${l}: ${rec.marks.length}/${n} marks`);
  }
  bad += probs.length;
  console.log(`${w}: ${need.size} shots × 3 → ${probs.length ? `${probs.length} problems` : "complete"}`);
  if (only) probs.forEach((p) => console.log("  " + p));
}
process.exitCode = bad ? 1 : 0;
