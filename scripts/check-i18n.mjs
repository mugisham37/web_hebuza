#!/usr/bin/env node
// I18N-ci: rw/en/fr dictionaries must have the same keys (nested), and no value may be empty.
import { readFileSync } from "node:fs";
const L = ["rw", "en", "fr"];
const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
const dicts = Object.fromEntries(L.map((l) => [l, new Map(flat(JSON.parse(readFileSync(`src/shared/i18n/dictionaries/${l}.json`, "utf8"))))]));
const all = new Set(L.flatMap((l) => [...dicts[l].keys()]));
const problems = [];
for (const k of all) for (const l of L) {
  if (!dicts[l].has(k)) problems.push(`${l}: missing ${k}`);
  else if (String(dicts[l].get(k)).trim() === "") problems.push(`${l}: empty ${k}`);
}
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`check:i18n ok (${all.size} keys × ${L.length} locales)`);
