// Finance empty/error illustrations (plan 05 §5.6). Two colours: ink line (currentColor) + one token fill. 160×120, decorative.
import type { ReactNode } from "react";

function Art({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 160 120" width={160} height={120} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {children}
    </svg>
  );
}
const LIME = "var(--color-gold-400)", LAV = "var(--color-sky-200)";

/** "All reconciled for yesterday": two stacked ledger sheets, gold check where the columns meet. */
export const ArtReconciled = () => (
  <Art><rect x="40" y="22" width="70" height="84" rx="6" fill="white" /><rect x="52" y="14" width="70" height="84" rx="6" fill="white" />
    <path d="M62 32h50M62 44h50M62 56h30M87 26v66" /><circle cx="100" cy="76" r="16" fill={LIME} /><path className="m-tick" d="M92 76l6 6 10-12" /></Art>
);
/** "No pending refunds": coin with a curved return arrow. */
export const ArtNoRefunds = () => (
  <Art><circle cx="80" cy="62" r="30" fill={LAV} /><path d="M72 52h12a8 8 0 010 16H72M76 46v32" /><path d="M120 36a46 46 0 00-74-6M46 30v-10M46 30h10" /></Art>
);
/** "Nothing waiting for you": open tray with the brand star. */
export const ArtNothingWaiting = () => (
  <Art><path d="M30 70l14-30h72l14 30v26a6 6 0 01-6 6H36a6 6 0 01-6-6z" fill="white" /><path d="M30 70h32l6 10h24l6-10h32" />
    <path d="M80 18v20M70 28h20M73 21l14 14M87 21L73 35" stroke={LIME} strokeWidth={4} /></Art>
);
/** "No batches yet": calendar page showing the payout day + a stack of notes. */
export const ArtNoBatches = () => (
  <Art><rect x="34" y="24" width="60" height="70" rx="6" fill="white" /><path d="M34 42h60M48 18v12M80 18v12" /><text x="64" y="80" textAnchor="middle" fontSize="26" fill="currentColor" stroke="none">5</text>
    <rect x="100" y="64" width="34" height="18" rx="3" fill={LIME} /><rect x="104" y="56" width="34" height="18" rx="3" fill="white" /></Art>
);
/** "No overdue invoices": clock at 12 with a check. */
export const ArtNoOverdue = () => (
  <Art><circle cx="76" cy="60" r="34" fill="white" /><path d="M76 34v26" /><circle cx="112" cy="86" r="14" fill={LIME} /><path className="m-tick" d="M105 86l5 5 9-10" /></Art>
);
/** "No statements imported": upload arrow into a tray with a CSV glyph. */
export const ArtNoImports = () => (
  <Art><path d="M30 76v18a6 6 0 006 6h88a6 6 0 006-6V76" /><path d="M80 76V24M62 42l18-18 18 18" /><rect x="58" y="82" width="44" height="14" rx="3" fill={LAV} />
    <text x="80" y="93" textAnchor="middle" fontSize="10" fill="currentColor" stroke="none">CSV</text></Art>
);
/** "Import failed": sheet with a broken column line. */
export const ArtImportFailed = () => (
  <Art><rect x="46" y="16" width="68" height="88" rx="6" fill="white" /><path d="M58 34h44M58 46h44M80 56v14M80 78v14" /><path d="M70 66l20 8" stroke="var(--color-danger)" strokeWidth={3} /></Art>
);
