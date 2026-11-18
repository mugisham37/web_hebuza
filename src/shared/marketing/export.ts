// Mirror of server/src/domain/marketing/export.ts — UI display only; the server enforces.
// CRM export helpers (plan 10 §10.2): masked phones unless crm.export_full; CSV with UTF-8 BOM for Excel.
export const maskPhone = (p?: string) => (p ? `${p.slice(0, 4)} ${p.slice(4, 6)}• ••• ${p.slice(-3)}` : "");
const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (head: string[], rows: unknown[][]) => `﻿${[head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n")}`;
