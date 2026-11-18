// Mirror of server/src/domain/finance/csv.ts — UI display only; the server enforces.
// RFC 4180 CSV parser shared by the statement import wizard (browser) and the import API (server).
/** Rows of trimmed cells; quoted fields may hold commas, quotes ("") and newlines; blank lines are dropped. */
export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  const s = text.replace(/^﻿/, "");
  const end = () => { row.push(cell.trim()); cell = ""; };
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"' && s[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") end();
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      end();
      if (row.some((c) => c)) out.push(row);
      row = [];
    } else cell += ch;
  }
  end();
  if (row.some((c) => c)) out.push(row);
  return out;
}
