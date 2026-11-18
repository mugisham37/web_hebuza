// Catalogue search (F-CAT-02): accent/case-insensitive, word-prefix match, 1 typo allowed on words of 4+ letters.
// shortcut: no synonym map (TIN/RRA/imisoro) yet, add once HEBUZA supplies the term list.
export const normalise = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const words = (s: string) => normalise(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** True when a and b differ by at most one insert, delete or substitution. */
export function within1(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Every query word must prefix a haystack word, or (4+ letters) be within one edit of a word or its same-length prefix. */
export function matches(haystack: string, query: string): boolean {
  const q = words(query);
  if (!q.length) return true;
  const h = words(haystack);
  return q.every((t) => h.some((w) => w.startsWith(t) || (t.length >= 4 && (within1(t, w) || within1(t, w.slice(0, t.length))))));
}
