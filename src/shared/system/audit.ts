// Mirror of server/src/domain/system/audit.ts — UI display only; the server enforces.
// Tamper-evident audit chain (plan 06 §2.9, AUD F-AUD-04). hash = sha256(prev_hash ‖ canonicalJson(row without hash)).
// The server chain is core/audit.ts (chain_* columns, append-only trigger); these helpers serve display (shortHash, redact) and the seed world.
import type { AuditEntryVM, ChainReport } from "./types";

export const GENESIS = "0".repeat(64);

/** Keys sorted recursively, no whitespace, `hash` excluded at the top level. */
export function canonicalJson(v: unknown, top = true): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map((x) => canonicalJson(x, false)).join(",")}]`;
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o).filter((k) => o[k] !== undefined && !(top && k === "hash")).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k], false)}`).join(",")}}`;
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const hashRow = (row: Omit<AuditEntryVM, "hash">) => sha256(row.prevHash + canonicalJson(row));

/** Rows oldest → newest. First row whose prevHash or hash doesn't match is `brokenAt`. */
export async function verifyChain(rows: readonly AuditEntryVM[], at = new Date().toISOString()): Promise<ChainReport> {
  let prev = GENESIS;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.prevHash !== prev || (await hashRow(r)) !== r.hash) return { ok: false, checked: i, brokenAt: r.id, at };
    prev = r.hash;
  }
  return { ok: true, checked: rows.length, at };
}

/** Short display form `9f3c…a17e`. */
export const shortHash = (h: string) => (h.length > 12 ? `${h.slice(0, 4)}…${h.slice(-4)}` : h);

const SECRET = /secret|password|token|key|credential|otp|code/i;
/** Redact secret-looking keys anywhere in a details blob (F-AUD-03). */
export function redact(v: unknown, extra: readonly string[] = []): unknown {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map((x) => redact(x, extra));
  return Object.fromEntries(
    Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, SECRET.test(k) || extra.includes(k) ? "•••• (redacted)" : redact(x, extra)]),
  );
}
