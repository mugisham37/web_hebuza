// Mirror of server/src/domain/marketing/dedupe.ts — UI display only; the server enforces.
// Contact dedupe (plan 10 §1.3): E.164 phone (Rwanda default +250), lowercase email. Suggest only, never auto-merge.

/** "0788 123 456" → "+250788123456"; returns null when it cannot be a valid number. */
export function toE164(raw?: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("00")) d = `+${d.slice(2)}`;
  if (d.startsWith("+")) return /^\+\d{8,15}$/.test(d) ? d : null;
  if (d.startsWith("250") && d.length === 12) return `+${d}`;
  if (d.startsWith("0") && d.length === 10) return `+250${d.slice(1)}`;
  if (d.length === 9 && d.startsWith("7")) return `+250${d}`;
  return null;
}
export const normEmail = (e?: string | null) => (e ? e.trim().toLowerCase() : null);
export const validEmail = (e?: string | null) => !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

type Keyed = { id: string; phoneE164?: string; email?: string };
/** Records in `pool` sharing the phone or email of `c`. */
export function duplicatesOf<T extends Keyed>(c: { phoneE164?: string | null; email?: string | null }, pool: T[], skipId?: string): T[] {
  const p = c.phoneE164 ?? null, e = normEmail(c.email);
  return pool.filter((x) => x.id !== skipId && ((p && x.phoneE164 === p) || (e && normEmail(x.email) === e)));
}

// self-check (spec worked example)
if (toE164("0788 123 456") !== "+250788123456") throw new Error("toE164 self-check failed");
