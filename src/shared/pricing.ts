// Mirror of server/src/domain/pricing.ts — UI display only; the server enforces.
// Amount-based fee bands (D5), shared by the public detail page (la.tsx BandCalculator) and the ops builder (U17).
// `rate` is a percent of the amount added on top of `fee`.
export type PriceBand = {
  min: number;
  max: number | null;
  fee: number;
  rate?: number;
  minFee?: number | null;
  maxFee?: number | null;
};
export const bandFor = (bands: PriceBand[], amount: number) =>
  bands.find((b) => amount >= b.min && (b.max == null || amount <= b.max)) ??
  null;
export const bandFee = (b: PriceBand, amount: number) =>
  Math.round(Math.min(b.maxFee ?? Infinity, Math.max(b.minFee ?? 0, b.fee + (amount * (b.rate ?? 0)) / 100)));

/** API band (PriceBandInput/Response) → PriceBand; same mapping as lib/catalogue. */
export type ApiBand = {
  min_amount_rwf: number;
  max_amount_rwf?: number | null;
  fee_type: string;
  fee_rwf?: number | null;
  fee_percent?: number | null;
  min_fee_rwf?: number | null;
  max_fee_rwf?: number | null;
};
export const fromApiBand = (b: ApiBand): PriceBand => ({
  min: b.min_amount_rwf,
  max: b.max_amount_rwf ?? null,
  fee: b.fee_type === "percent" ? 0 : (b.fee_rwf ?? 0),
  rate: b.fee_type === "percent" ? (b.fee_percent ?? 0) : 0,
  minFee: b.min_fee_rwf ?? null,
  maxFee: b.max_fee_rwf ?? null,
});

/** Overlaps / gaps / min>max between sorted bands, as indexes of the offending band (for the editor). */
export function bandProblems(bands: PriceBand[]) {
  const out: { i: number; kind: "range" | "overlap" | "gap" }[] = [];
  const s = bands.map((b, i) => ({ b, i })).sort((x, y) => x.b.min - y.b.min);
  s.forEach(({ b, i }, k) => {
    if (b.max != null && b.max < b.min) out.push({ i, kind: "range" });
    const prev = s[k - 1]?.b;
    if (!prev) return;
    if (prev.max == null || prev.max >= b.min) out.push({ i, kind: "overlap" });
    else if (prev.max + 1 < b.min) out.push({ i, kind: "gap" });
  });
  return out;
}

/** Display price for a catalogue service: quote label, "from X" for ranges, else first-tier total (shared by pricing explorer + home services). */
type Priced = { priceMode: "fixed" | "range" | "quote"; fromFee: number | null; tiers: { fee: number; governmentFee: number }[] };
export function priceLabel(x: Priced, l: { from: string; quote: string }, money: (n: number) => string) {
  const t = x.tiers[0];
  const total = t ? t.fee + t.governmentFee : null;
  if (x.priceMode === "quote") return l.quote;
  return x.priceMode === "range" ? `${l.from} ${money(x.fromFee ?? total ?? 0)}` : money(total ?? x.fromFee ?? 0);
}
