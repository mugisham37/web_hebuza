/**
 * Instant client-side service search for the header (≈60 services, so a scored scan per keystroke is <1 ms).
 * Accent/case/punctuation-insensitive; every query word must match somewhere (AND). Ranking, best first:
 *   name starts with the query (left-to-right) › a name word starts with a query word › acronym (TIN, VAT, EBM…)
 *   › substring in the name › match in category / sub-area / summary › one-typo match (words ≥ 4 letters).
 * Ties: more requested first, then shorter name. Returns highlight ranges on the original name.
 */
export type SearchItem = {
  slug: string;
  path: string;
  name: string;
  family: string;
  area?: string | null;
  summary?: string;
  popular?: number;
};
export type Hit = {
  item: SearchItem;
  score: number;
  ranges: [number, number][];
};

const strip = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** Folds case/accents and turns punctuation into spaces, keeping a map back to the original index for highlights. */
function fold(s: string): { text: string; map: number[] } {
  let text = "";
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = strip(s[i]);
    const ch = /[a-z0-9]/.test(c) ? c : " ";
    if (ch === " " && text.endsWith(" ")) continue;
    text += ch;
    map.push(i);
  }
  return { text, map };
}
export const norm = (s: string) => fold(s).text.trim();
const words = (s: string) => s.split(" ").filter(Boolean);

type Entry = {
  item: SearchItem;
  name: ReturnType<typeof fold>;
  nameWords: { w: string; at: number }[];
  acro: string;
  rest: string;
};
export function buildIndex(items: SearchItem[]): Entry[] {
  return items.map((item) => {
    const name = fold(item.name);
    const nameWords: { w: string; at: number }[] = [];
    name.text.replace(/[a-z0-9]+/g, (w, at: number) => {
      nameWords.push({ w, at });
      return w;
    });
    return {
      item,
      name,
      nameWords,
      acro: nameWords.map((x) => x.w[0]).join(""),
      rest: norm(`${item.family} ${item.area ?? ""} ${item.summary ?? ""}`),
    };
  });
}

/** Damerau-style "within one edit" for typo tolerance (insert, delete, substitute or swap two neighbours). */
function oneEdit(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1 || a === b) return a === b;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length)
    return (
      a.slice(i + 1) === b.slice(i + 1) ||
      (a[i] === b[i + 1] &&
        a[i + 1] === b[i] &&
        a.slice(i + 2) === b.slice(i + 2))
    );
  return a.length > b.length
    ? a.slice(i + 1) === b.slice(i)
    : a.slice(i) === b.slice(i + 1);
}

function scoreEntry(
  e: Entry,
  q: string,
  qWords: string[],
): { score: number; spans: [number, number][] } | null {
  let score = 0;
  const spans: [number, number][] = [];
  const n = e.name.text;
  if (n.startsWith(q)) {
    score += 1000;
    spans.push([0, q.length]);
  } else if (qWords.length === 1 && q.length >= 2 && e.acro.startsWith(q))
    score += 700;
  for (const w of qWords) {
    const word = e.nameWords.find((x) => x.w.startsWith(w));
    if (word) {
      score += 300 + (word.at === 0 ? 100 : 0);
      spans.push([word.at, word.at + w.length]);
      continue;
    }
    const at = n.indexOf(w);
    if (at >= 0) {
      score += 150;
      spans.push([at, at + w.length]);
      continue;
    }
    if (e.rest.includes(w)) {
      score += 60;
      continue;
    }
    if (w.length >= 4) {
      const typo = e.nameWords.find(
        (x) => oneEdit(x.w.slice(0, w.length), w) || oneEdit(x.w, w),
      );
      if (typo) {
        score += 40;
        spans.push([typo.at, typo.at + typo.w.length]);
        continue;
      }
      if (words(e.rest).some((x) => oneEdit(x, w))) {
        score += 20;
        continue;
      }
    }
    if (!(qWords.length === 1 && score >= 700)) return null; // every word must match (acronym hits stand alone)
  }
  return { score: score + Math.min(e.item.popular ?? 0, 50), spans };
}

export function searchServices(
  index: Entry[],
  query: string,
  limit = 8,
): Hit[] {
  const q = norm(query);
  if (!q) return [];
  const qWords = words(q);
  const hits: Hit[] = [];
  for (const e of index) {
    const r = scoreEntry(e, q, qWords);
    if (!r) continue;
    // folded spans → original-name ranges, merged
    const ranges = r.spans
      .map(
        ([a, b]) =>
          [e.name.map[a], e.name.map[Math.max(a, b - 1)] + 1] as [
            number,
            number,
          ],
      )
      .sort((x, y) => x[0] - y[0])
      .reduce<[number, number][]>((acc, cur) => {
        const last = acc.at(-1);
        if (last && cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);
        else acc.push([...cur]);
        return acc;
      }, []);
    hits.push({ item: e.item, score: r.score, ranges });
  }
  return hits
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.item.popular ?? 0) - (a.item.popular ?? 0) ||
        a.item.name.length - b.item.name.length,
    )
    .slice(0, limit);
}
