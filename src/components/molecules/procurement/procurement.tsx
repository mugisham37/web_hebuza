"use client";
import { isForbidden } from "@/components/atoms/hooks";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { homeFor } from "@/shared/auth/roles";
import { cx, formatDate, formatDateTime, formatMoney, formatRelative } from "@/shared/format";
import { addDays, daysBetween, lineCalc, routeFor, totals as sumLines, DEFAULT_LIMITS } from "@/shared/procurement/rules";
import { useProcAudit } from "@/lib/procurement/api";
import { type Advance, type BudgetCategory, type FileRef, type Line, type MatchLine, type Quote, type Reminder, type Vendor, type VendorPayment, type UserRef } from "@/shared/procurement/types";
import { errorCopy } from "@/lib/api/error-copy";
import { fill } from "@/content/pages/procurement-common";
import { Avatar, Stepper, Timeline } from "@/components/atoms/misc";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { Input, Radio, Textarea, Field } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { DiffList } from "@/components/molecules/finance/finance";
import { Amount, DocNo, LockChip, MatchDot, Pill, ProcPill, TolerancePill, useP } from "@/components/atoms/procurement";
import { ApiError } from "@/lib/api/client";
import { procurementAb } from "@/content/pages/procurement-ab";
import { procurementC } from "@/content/pages/procurement-c";
import { type PrDetail } from "@/lib/procurement/c";

// Stage 12 procurement molecules (plan 12 §5.3). Shared by every lane; lanes never fork these.
// ---------------------------------------------------------------- SegregationStrip (PK1)
export type SegStep = { role: "prepared" | "approved" | "authorised" | "paid" | "requested"; who?: UserRef | null; at?: string; state: "done" | "pending" | "skipped" | "override"; waitingFor?: string };
/** Prepare → approve → authorise → pay; blocked-self line when the viewer made an earlier step. Compact = avatars only (tables). */
export function SegregationStrip({ steps, me, compact, selfNote }: { steps: SegStep[]; me?: string; compact?: boolean; selfNote?: "self" | "selfApproved" | null }) {
  const p = useP();
  const { locale } = useI18n();
  if (compact)
    return (
      <span className="inline-flex items-center gap-0.5" aria-label={steps.map((s) => `${p.seg[s.role]}: ${s.who?.name ?? p.seg.waitingRole.replace("{role}", s.waitingFor ?? "—")}`).join(", ")}>
        {steps.map((s, i) => (
          <span key={i} className="flex items-center">
            {s.who && s.state !== "pending" ? <Avatar name={s.who.name} size="sm" className={cx("ring-2", s.state === "override" ? "ring-warning" : "ring-success")} />
              : <span className="flex size-7 items-center justify-center rounded-full border border-dashed border-border-strong text-fg-subtle"><Icon name={s.state === "skipped" ? "minus" : "clock"} size={12} aria-hidden /></span>}
            {i < steps.length - 1 && <span aria-hidden className={cx("h-px w-2", s.state === "done" ? "bg-success" : "bg-border-strong")} />}
          </span>
        ))}
      </span>
    );
  return (
    <section aria-label={p.seg.prepared} className="grid gap-3 border border-sky-200 bg-bg-tint p-4">
      <ol className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {steps.map((s, i) => (
          <li key={i} className="flex min-w-0 flex-1 items-center gap-3 sm:flex-col sm:items-start">
            <div className="flex w-full items-center gap-2">
              <span className={cx("relative", s.state === "done" && "m-pop")}>
                {s.who && s.state !== "pending" ? <Avatar name={s.who.name} size="md" className={cx("ring-2", s.state === "override" ? "ring-warning" : "ring-success", me === s.who.id && "ring-primary")} />
                  : <span className="flex size-10 items-center justify-center rounded-full border-2 border-dashed border-border-strong bg-surface text-fg-subtle"><Icon name={s.state === "skipped" ? "minus" : "clock"} size={16} aria-hidden /></span>}
              </span>
              {i < steps.length - 1 && <span aria-hidden className={cx("hidden h-px flex-1 sm:block", s.state === "done" ? "bg-success" : "bg-border-strong")} />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-small font-medium">{s.who && s.state !== "pending" ? s.who.name : s.state === "skipped" ? p.seg.skipped : fill(p.seg.waiting, { name: s.waitingFor ?? "—" })}</p>
              <p className="text-eyebrow text-fg-subtle">{s.state === "override" ? p.seg.override : p.seg[s.role]}{s.at ? ` · ${formatDateTime(s.at, locale)}` : ""}</p>
            </div>
          </li>
        ))}
      </ol>
      {selfNote && <p role="note" className="flex items-center gap-2 border-l-2 border-secondary bg-surface/70 px-3 py-2 text-small text-navy-800"><Icon name="lock" size={14} aria-hidden />{p.seg[selfNote]}</p>}
    </section>
  );
}

// ---------------------------------------------------------------- RoutePreview (pure; updates as you type)
export function RoutePreview({ amount, budget, quotes, quotesNeeded, execName = "Alice Mutoni", financeName, financeMax }: {
  amount: number; budget?: BudgetCategory; quotes?: number; quotesNeeded?: number; execName?: string; financeName?: string; financeMax: number;
}) {
  const p = useP();
  const { locale } = useI18n();
  const r = routeFor(amount, { budget }, { ...DEFAULT_LIMITS, financeMax });
  const missing = quotesNeeded ? Math.max(0, quotesNeeded - (quotes ?? 0)) : 0;
  return (
    <div aria-live="polite" className={cx("grid gap-1.5 border p-3 m-tone", missing ? "border-warning bg-warning-bg" : r.route === "executive" ? "border-navy-200 bg-info-bg" : "border-border bg-surface")}>
      <p className="text-eyebrow text-fg-subtle">{p.route.title}</p>
      <p className="flex flex-wrap items-center gap-2 text-small font-medium">
        <Icon name={missing ? "zap" : "shield"} size={14} aria-hidden />
        {missing ? fill(p.route.blocked, { n: missing }) : r.route === "executive" ? fill(p.route.executive, { name: execName }) : financeName ? fill(p.route.financeName, { name: financeName }) : p.route.finance}
        {r.reasons.map((x) => <Pill key={x} tone="warning" icon="zap">{p.reasons[x]}</Pill>)}
      </p>
      <p className="text-eyebrow text-fg-muted">{fill(p.route.limits, { limit: formatMoney(financeMax, "RWF", locale) })}</p>
    </div>
  );
}

// ---------------------------------------------------------------- MatchIndicator (PK2) + per-line table
export function MatchIndicator({ po, grn, bill, result, lines, compact }: {
  po?: string; grn?: string; bill: string; result: "matched" | "match_exception" | "no_po" | "contract" | "pending"; lines: MatchLine[]; compact?: boolean;
}) {
  const p = useP();
  const { locale } = useI18n();
  const bad = lines.filter((l) => l.result === "exception");
  const ok = result === "matched" || result === "contract";
  const docs: [string, string | undefined, "PO" | "GRN" | "BL"][] = [[p.kind.PO, po, "PO"], [p.kind.GRN, grn, "GRN"], [p.kind.BL, bill, "BL"]];
  return (
    <div className="grid gap-3">
      <p className={cx("flex items-center gap-2 text-body font-medium", ok ? "text-success" : result === "match_exception" ? "text-warning" : "text-fg-muted")}>
        <MatchDot state={result === "match_exception" ? "exception" : result === "matched" ? (lines.some((l) => l.result === "tolerance") ? "tolerance" : "matched") : result === "pending" ? "pending" : result} />
        {result === "match_exception" ? p.match.exception : result === "matched" ? p.match.matched : p.match[result === "pending" ? "pending" : result]}
      </p>
      {!compact && result !== "no_po" && result !== "contract" && (
        <ul className="grid gap-2 sm:grid-cols-3">
          {docs.map(([label, no, kind]) => (
            <li key={kind} className="flex items-center justify-between gap-2 border border-border bg-surface px-3 py-2">
              <span className="min-w-0"><span className="block text-eyebrow text-fg-subtle">{label}</span>{no ? <DocNo kind={kind} no={no} /> : <span className="text-small text-fg-subtle">—</span>}</span>
              {kind === "BL" && bad.length ? <Icon name="zap" size={16} className="text-warning" aria-hidden /> : no ? <Icon name="check" size={16} className="text-success m-tick" aria-hidden /> : null}
            </li>
          ))}
        </ul>
      )}
      {bad.map((l) => (
        <p key={l.lineId} role="alert" className="flex items-start gap-2 bg-warning-bg px-3 py-2 text-small text-warning m-shake">
          <Icon name="zap" size={14} aria-hidden className="mt-0.5" />
          <span>{l.description}: {l.reason === "qty" ? `billed ${l.billed}, received ${l.received} → ${formatMoney(Math.round((l.billed - l.received) * (l.billNet / Math.max(l.billed, 1))), "RWF", locale)} over`
            : l.reason === "vat" ? "VAT doesn't match 18% of the net" : `${formatMoney(Math.abs(l.delta), "RWF", locale)} ${l.delta > 0 ? "over" : "under"} the PO (limit ${formatMoney(l.threshold, "RWF", locale)})`}</span>
        </p>
      ))}
    </div>
  );
}
export function MatchTable({ lines }: { lines: MatchLine[] }) {
  const p = useP();
  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full min-w-[36rem] text-small">
        <thead className="bg-ink-100 text-left text-eyebrow text-ink-700">
          <tr><th className="px-3 py-2">{p.vat.line}</th><th className="px-3 py-2 text-right">PO</th><th className="px-3 py-2 text-right">GRN</th><th className="px-3 py-2 text-right">{p.kind.BL}</th><th className="px-3 py-2 text-right">Δ {p.vat.net}</th><th className="px-3 py-2">{p.common.none}</th></tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.lineId} className={cx("border-t border-border", l.result === "exception" && "bg-warning-bg/40")}>
              <td className="px-3 py-2">{l.description}</td>
              <td className="px-3 py-2 text-right tabular">{l.ordered}</td>
              <td className="px-3 py-2 text-right tabular">{l.received}</td>
              <td className={cx("px-3 py-2 text-right tabular", l.reason === "qty" && "font-semibold text-warning")}>{l.billed}</td>
              <td className="px-3 py-2 text-right"><Amount value={l.delta} sign="always" size="sm" /></td>
              <td className="px-3 py-2">{l.result === "exception" ? <MatchDot state="exception" label /> : l.result === "tolerance" ? <TolerancePill delta={l.delta} base={l.poNet} within /> : <MatchDot state="matched" label />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------- QuoteCompare (radio, chosen-not-cheapest reason)
export function QuoteCompare({ quotes, chosenId, onChoose, reason, onReason, required, readOnly }: {
  quotes: Quote[]; chosenId?: string; onChoose?: (id: string) => void; reason?: string; onReason?: (s: string) => void; required: number; readOnly?: boolean;
}) {
  const p = useP();
  const min = Math.min(...quotes.map((q) => q.amount));
  const chosen = quotes.find((q) => q.id === chosenId);
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 flex flex-wrap items-center gap-2 text-small font-medium">
        {fill(p.quotes.met, { n: quotes.length, req: Math.max(required, 1) })}
        <Pill tone={quotes.length >= required ? "success" : "warning"} icon={quotes.length >= required ? "check" : "zap"}>{quotes.length >= required ? "✓" : `${required - quotes.length}`}</Pill>
      </legend>
      <ul className="grid gap-1.5">
        {quotes.map((q) => (
          <li key={q.id} className={cx("flex items-center justify-between gap-3 border px-3 py-2", q.id === chosenId ? "border-secondary bg-navy-50" : "border-border bg-surface hover:border-navy-300")}>
            {readOnly ? <span className="min-w-0 truncate text-small">{q.vendorName}</span>
              : <Radio name="quote" checked={q.id === chosenId} onChange={() => onChoose?.(q.id)} label={<span className="truncate">{q.vendorName}</span>} />}
            <span className="flex shrink-0 items-center gap-2">
              {q.amount === min && <Pill tone="success" icon="check">{p.quotes.cheapest}</Pill>}
              {q.id === chosenId && <Pill tone="accent" icon="check">{p.quotes.chosen}</Pill>}
              <Amount value={q.amount} size="sm" className="font-medium" />
            </span>
          </li>
        ))}
      </ul>
      {chosen && chosen.amount > min && (readOnly ? reason && <p className="text-small text-fg-muted">{p.quotes.reason} {reason}</p> : (
        <label className="grid gap-1 text-small m-rise">{p.quotes.reason}<Textarea rows={2} value={reason ?? ""} onChange={(e) => onReason?.(e.target.value)} required /></label>
      ))}
    </fieldset>
  );
}

// ---------------------------------------------------------------- VatLines (editable/read-only, excl/incl, sticky totals)
export type DraftLine = { id: string; description: string; qty: number; unitPrice: number; vatable: boolean };
export function VatLines({ lines, mode, onMode, onChange, vatRegistered = true, readOnly, errors = {} }: {
  lines: DraftLine[] | Line[]; mode: "excl" | "incl"; onMode?: (m: "excl" | "incl") => void; onChange?: (l: DraftLine[]) => void; vatRegistered?: boolean; readOnly?: boolean; errors?: Record<string, string>;
}) {
  const p = useP();
  const calc = lines.map((l) => ({ ...l, ...lineCalc({ ...l, vatable: vatRegistered && l.vatable }, mode) }));
  const t = sumLines(calc);
  const set = (i: number, patch: Partial<DraftLine>) => onChange?.(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)) as DraftLine[]);
  return (
    <div className="grid gap-3">
      {!readOnly && onMode && (
        <div role="radiogroup" aria-label={p.vat.excl} className="inline-flex w-fit border border-border bg-surface p-0.5 text-small">
          {(["excl", "incl"] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} disabled={!vatRegistered} onClick={() => onMode(m)}
              className={cx("h-8 px-3 m-press", mode === m ? "bg-secondary text-on-secondary" : "text-fg-muted hover:bg-ink-100 hover:text-fg")}>{p.vat[m]}</button>
          ))}
        </div>
      )}
      {!vatRegistered && <p className="text-eyebrow text-fg-muted">{p.vat.notRegistered}</p>}
      <div className="overflow-x-auto border border-border">
        <table className="w-full min-w-[34rem] text-small">
          <thead className="bg-ink-100 text-left text-eyebrow text-ink-700">
            <tr><th className="px-3 py-2">{p.vat.line}</th><th className="w-20 px-3 py-2 text-right">{p.vat.qty}</th><th className="w-36 px-3 py-2 text-right">{p.vat.unit}</th><th className="px-3 py-2 text-right">{p.vat.net}</th><th className="px-3 py-2 text-right">VAT</th>{!readOnly && <th className="w-10" />}</tr>
          </thead>
          <tbody>
            {calc.map((l, i) => (
              <tr key={l.id} className="border-t border-border align-top">
                <td className="px-3 py-2">{readOnly ? l.description : <Input aria-label={`${p.vat.line} ${i + 1}`} aria-invalid={!!errors[`${i}.description`]} value={l.description} maxLength={200} onChange={(e) => set(i, { description: e.target.value })} className="h-9" />}</td>
                <td className="px-3 py-2 text-right tabular">{readOnly ? l.qty : <Input aria-label={`${p.vat.qty} ${i + 1}`} inputMode="decimal" type="number" min={0} value={l.qty || ""} onChange={(e) => set(i, { qty: Number(e.target.value) })} className="h-9 text-right" />}</td>
                <td className="px-3 py-2 text-right tabular">{readOnly ? <Amount value={l.unitPrice} size="sm" /> : <Input aria-label={`${p.vat.unit} ${i + 1}`} inputMode="numeric" type="number" min={0} value={l.unitPrice || ""} onChange={(e) => set(i, { unitPrice: Math.round(Number(e.target.value)) })} className="h-9 text-right" />}</td>
                <td className="px-3 py-2 text-right"><Amount value={l.net} size="sm" /></td>
                <td className="px-3 py-2 text-right"><Amount value={l.vat} size="sm" className="text-fg-muted" /></td>
                {!readOnly && <td className="px-1 py-2"><button type="button" aria-label={`${p.common.cancel} ${i + 1}`} disabled={lines.length < 2} onClick={() => onChange?.((lines as DraftLine[]).filter((_, k) => k !== i))} className="flex size-8 items-center justify-center text-fg-subtle hover:bg-ink-100 hover:text-fg disabled:opacity-30"><Icon name="x" size={14} aria-hidden /></button></td>}
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 border-t border-border-strong bg-bg-subtle text-small">
            <tr><td colSpan={3} className="px-3 py-1.5 text-right text-fg-muted">{p.vat.subtotal}</td><td className="px-3 py-1.5 text-right"><Amount value={t.subtotal} size="sm" /></td><td />{!readOnly && <td />}</tr>
            <tr><td colSpan={3} className="px-3 py-1.5 text-right text-fg-muted">{p.vat.vat}</td><td /><td className="px-3 py-1.5 text-right"><Amount value={t.vat} size="sm" /></td>{!readOnly && <td />}</tr>
            <tr><td colSpan={3} className="px-3 py-2 text-right font-semibold">{p.vat.total}</td><td colSpan={2} className="px-3 py-2 text-right"><Amount value={t.total} className="font-semibold" /></td>{!readOnly && <td />}</tr>
          </tfoot>
        </table>
      </div>
      {!readOnly && <Button type="button" size="sm" variant="secondary" className="w-fit m-press" onClick={() => onChange?.([...(lines as DraftLine[]), { id: `l${Date.now()}`, description: "", qty: 1, unitPrice: 0, vatable: true }])}><Icon name="plus" size={14} aria-hidden />{p.vat.line}</Button>}
    </div>
  );
}

// ---------------------------------------------------------------- BankDetailsCard (PK4) — masked only, audited reveal via onReveal
export function BankDetailsCard({ vendor, onRequest, onReveal, lastChange }: {
  vendor: Pick<Vendor, "bank" | "bankStatus" | "lockUntil" | "legalName">; onRequest?: () => void; onReveal?: (reason: string) => Promise<string>; lastChange?: { status: string; requestedAt: string } | null;
}) {
  const p = useP();
  const { locale } = useI18n();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [clear, setClear] = useState<string | null>(null);
  async function reveal() {
    if (!onReveal || !reason.trim()) return;
    const v = await onReveal(reason);
    setClear(v); setAsking(false); setReason("");
    setTimeout(() => setClear(null), 30_000); // PLACEHOLDER(bank-remask-seconds)
  }
  return (
    <section className="grid gap-3 border border-border bg-surface p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-card-title text-fg-heading">{p.bank.title}</h3>
        <ProcPill state={vendor.bankStatus} machine="bank" />
      </header>
      {vendor.bank ? (
        <p className="flex items-center gap-3 text-body">
          <span aria-hidden className="flex size-9 items-center justify-center bg-ink-100 text-ink-700"><Icon name={vendor.bank.kind === "bank" ? "building" : "phone"} size={16} /></span>
          <span className="tabular font-medium">{vendor.bank.label} {clear ?? vendor.bank.masked}</span>
          {onReveal && !clear && <button type="button" onClick={() => setAsking((x) => !x)} className="text-small text-link underline underline-offset-4 hover:text-link-hover">{p.bank.reveal}</button>}
        </p>
      ) : <p className="text-small text-fg-muted">{p.bank.none}</p>}
      {asking && (
        <form className="flex flex-wrap items-end gap-2 m-rise" onSubmit={(e) => { e.preventDefault(); reveal(); }}>
          <label className="grid min-w-0 flex-1 gap-1 text-small">{p.bank.revealReason}<Input value={reason} onChange={(e) => setReason(e.target.value)} required /></label>
          <Button size="sm" variant="primary" type="submit" disabled={!reason.trim()}>{p.bank.reveal}</Button>
        </form>
      )}
      {vendor.bankStatus === "unverified" && (
        <div className="grid gap-2 bg-danger-bg p-3 text-small text-danger">
          {lastChange && <p className="font-medium">{fill(p.bank.pending, { when: formatDateTime(lastChange.requestedAt, locale) })}</p>}
          <LockChip until={vendor.lockUntil ?? null} />
        </div>
      )}
      {vendor.bankStatus === "verified" && vendor.lockUntil && <LockChip until={vendor.lockUntil} />}
      {lastChange?.status === "rejected" && <p className="text-small text-fg-muted">{p.bank.rejected}</p>}
      {onRequest && <Button size="sm" variant="secondary" className="w-fit m-press" onClick={onRequest}><Icon name="refresh" size={14} aria-hidden />{p.bank.request}</Button>}
    </section>
  );
}

// ---------------------------------------------------------------- DuplicateVendorHint
export function DuplicateVendorHint({ matches }: { matches: { id: string; code: string; name: string; why: "tin" | "name" }[] }) {
  const p = useP();
  if (!matches.length) return null;
  return (
    <ul role="status" className="grid gap-1.5 m-rise">
      {matches.map((m) => (
        <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 bg-warning-bg px-3 py-2 text-small text-warning">
          <span className="flex items-center gap-2"><Icon name="zap" size={14} aria-hidden />{fill(m.why === "tin" ? p.dup.tin : p.dup.name, { name: m.name })}</span>
          <ProcLink href={`/procurement/suppliers/${m.id}`} className="font-medium underline underline-offset-4">{fill(p.dup.open, { code: m.code })}</ProcLink>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- ContractTimeline (PK5, SVG + SR list)
export function ContractTimeline({ start, end, notice, today, reminders }: { start: string; end: string; notice: string; today: string; reminders: Pick<Reminder, "offset" | "on" | "sentAt">[] }) {
  const p = useP();
  const { locale } = useI18n();
  const span = Math.max(1, daysBetween(start, end));
  const x = (d: string) => 4 + Math.min(1, Math.max(0, daysBetween(start, d) / span)) * 92;
  const pts = [{ k: "start", d: start }, { k: "today", d: today }, { k: "notice", d: notice }, { k: "end", d: end }];
  return (
    <figure className="grid gap-2">
      <svg viewBox="0 0 100 26" className="h-20 w-full overflow-visible" aria-hidden preserveAspectRatio="none">
        <line x1="4" x2="96" y1="12" y2="12" stroke="var(--color-border-strong)" strokeWidth="0.6" />
        <line x1="4" x2={x(today)} y1="12" y2="12" stroke="var(--color-secondary)" strokeWidth="1" className="m-grow" />
        {reminders.map((r) => <line key={r.offset} x1={x(r.on)} x2={x(r.on)} y1="8" y2="16" stroke={r.sentAt ? "var(--color-secondary)" : "var(--color-fg-subtle)"} strokeWidth="0.5" />)}
        <rect x={x(notice) - 1.6} y="10.4" width="3.2" height="3.2" transform={`rotate(45 ${x(notice)} 12)`} fill="var(--color-warning)" />
        <circle cx={x(start)} cy="12" r="1.6" fill="var(--color-secondary)" />
        <circle cx={x(today)} cy="12" r="2" fill="var(--color-primary)" stroke="var(--color-on-gold)" strokeWidth="0.4" />
        <circle cx={x(end)} cy="12" r="1.6" fill="var(--color-surface)" stroke="var(--color-secondary)" strokeWidth="0.6" />
      </svg>
      <div className="relative h-10 text-eyebrow text-fg-muted" aria-hidden>
        {pts.map((pt) => (
          <span key={pt.k} className="absolute -translate-x-1/2 text-center whitespace-nowrap" style={{ left: `${x(pt.d)}%`, top: pt.k === "notice" || pt.k === "today" ? "1.25rem" : 0 }}>
            {p.timeline[pt.k as "start"]} · {formatDate(pt.d, locale)}
          </span>
        ))}
      </div>
      <figcaption className="flex flex-wrap gap-1.5">
        {reminders.map((r) => <Pill key={r.offset} tone={r.sentAt ? "accent" : "neutral"} icon={r.sentAt ? "check" : "clock"}>{fill(p.timeline.reminder, { n: r.offset })} · {formatDate(r.on, locale)}</Pill>)}
      </figcaption>
      <ul className="sr-only">{pts.map((pt) => <li key={pt.k}>{p.timeline[pt.k as "start"]}: {formatDate(pt.d, locale)}</li>)}</ul>
    </figure>
  );
}

// ---------------------------------------------------------------- DepositCard
export function DepositCard({ deposit, today, href }: { deposit: Advance; today: string; href?: string }) {
  const p = useP();
  const { locale } = useI18n();
  const overdue = deposit.returnDueOn && ["held", "return_due", "partially_returned"].includes(deposit.status) && deposit.returnDueOn < today;
  return (
    <section className={cx("grid gap-2 border bg-surface p-4", overdue ? "border-danger" : "border-border")}>
      <header className="flex items-center justify-between gap-2">
        <DocNo kind="DP" no={deposit.no} href={href} />
        <ProcPill state={deposit.status} machine="deposit" />
      </header>
      <Amount value={deposit.remaining} size="lg" className="font-semibold" />
      {deposit.returnDueOn && (
        <p className={cx("text-small", overdue ? "font-medium text-danger" : "text-fg-muted")}>
          {overdue ? fill(p.deposit.overdue, { n: daysBetween(deposit.returnDueOn, today) }) : fill(p.deposit.returnDue, { date: formatDate(deposit.returnDueOn, locale) })}
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- EvidenceTile (PK7)
export function EvidenceTile({ photo, receivedBy, at, qty, state = "ready" }: { photo?: FileRef; receivedBy: string; at: string; qty: string; state?: "ready" | "scanning" | "blocked" }) {
  const p = useP();
  const { locale } = useI18n();
  return (
    <figure className="flex items-center gap-3 border border-border bg-surface p-3">
      <span aria-hidden className={cx("flex size-16 shrink-0 items-center justify-center", photo ? "bg-ink-100 text-ink-700" : "bg-bg-tint text-navy-700", state === "scanning" && "m-shimmer")}>
        <Icon name={state === "blocked" ? "x" : photo ? "camera" : "fileCheck"} size={22} />
      </span>
      <figcaption className="min-w-0 text-small">
        <p className="font-medium">{fill(p.evidence.receivedBy, { name: receivedBy })}</p>
        <p className="text-fg-muted">{formatDateTime(at, locale)} · {qty}</p>
        <p className="truncate text-eyebrow text-fg-subtle">{state === "scanning" ? p.evidence.scanning : state === "blocked" ? p.evidence.blocked : photo?.id.startsWith("up_") ? <a className="underline" href={`/api/files/${photo.id}/${encodeURIComponent(photo.name)}`}>{photo.name}</a> : photo?.name ?? p.evidence.noPhoto}</p>
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------- RemittanceCard
export function RemittanceCard({ payment, onSend, sending, href }: { payment: Pick<VendorPayment, "remittance" | "amount" | "no">; onSend?: () => void; sending?: boolean; href?: string }) {
  const p = useP();
  const { locale } = useI18n();
  const r = payment.remittance;
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 border border-border bg-surface p-4">
      <span className="flex items-center gap-3">
        <span aria-hidden className="flex size-10 items-center justify-center bg-bg-tint text-navy-700"><Icon name="file" size={18} /></span>
        <span className="grid">
          <DocNo kind="RA" no={r.no} href={href} />
          <span className="text-eyebrow text-fg-subtle">{r.status === "sent" && r.sentAt ? fill(p.remit.sent, { when: formatRelative(r.sentAt, locale) }) : r.status === "failed" ? p.remit.failed : p.remit.draft}</span>
        </span>
      </span>
      <span className="flex items-center gap-2">
        <ProcPill state={r.status} machine="remittance" />
        {onSend && r.status !== "sent" && <Button size="sm" variant="primary" loading={sending} onClick={onSend} className="m-press">{r.status === "failed" ? p.remit.retry : p.common.submit}</Button>}
      </span>
    </section>
  );
}

// ---------------------------------------------------------------- History (audit) list
export function HistoryList({ kind, id }: { kind: string; id: string }) {
  const p = useP();
  const { locale } = useI18n();
  const q = useProcAudit(kind, id);
  if (q.isPending) return <div className="grid gap-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 m-shimmer" />)}</div>;
  if (q.isError) return <PanelErr onRetry={() => q.refetch()} />;
  if (!q.data.items.length) return <p className="py-6 text-center text-small text-fg-muted">{p.common.none}</p>;
  return (
    <ol className="grid gap-2 m-stagger">
      {q.data.items.map((e, i) => (
        <li key={e.id} style={{ ["--i" as string]: i }} className="grid gap-1 border border-border bg-surface p-3">
          <p className="flex flex-wrap items-center justify-between gap-2 text-small">
            <span className="flex items-center gap-2"><Avatar name={e.actor} size="sm" /><span className="font-medium">{e.actor}</span><code className="text-eyebrow text-fg-subtle">{e.action}</code></span>
            <time className="text-eyebrow text-fg-subtle tabular" dateTime={e.at}>{formatDateTime(e.at, locale)}</time>
          </p>
          {e.reason && <p className="text-small text-fg-muted">{p.common.reason}: {e.reason}</p>}
          {(e.before != null || e.after != null) && <DiffList before={e.before} after={e.after} />}
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------- page helpers
export function ProcLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const { locale } = useI18n();
  return <Link href={localHref(locale, href)} className={className}>{children}</Link>;
}
export function PanelErr({ onRetry }: { onRetry: () => void }) {
  const p = useP();
  return (
    <div role="alert" className="grid place-items-center gap-2 bg-danger-bg/50 p-6 text-center text-small text-danger">
      <p>{p.states.error}</p>
      <Button size="sm" variant="secondary" onClick={onRetry}><Icon name="refresh" size={14} aria-hidden />{p.states.retry}</Button>
    </div>
  );
}
/** Page-level permission denial. */
export function ProcNoAccess() {
  const p = useP();
  const { locale } = useI18n();
  const { user } = useSession();
  return (
    <div role="alert" className="mx-auto grid max-w-md place-items-center gap-3 py-16 text-center m-rise">
      <span className="flex size-14 items-center justify-center bg-navy-50 text-navy-700"><Icon name="lock" size={24} aria-hidden /></span>
      <h1 className="text-h3 text-fg-heading">{p.noAccess.title}</h1>
      <p className="text-body text-fg-muted">{p.noAccess.body}</p>
      <Link href={localHref(locale, user ? homeFor(user.roles) : "/")} className="inline-flex h-11 items-center bg-secondary px-5 text-button text-on-secondary transition-colors hover:bg-secondary-hover active:bg-secondary-active m-press">{p.noAccess.home}</Link>
    </div>
  );
}
/** 409 stale_version banner: never silently overwrite (§4 Conflict). */
export function ConflictBanner({ who, when, onReload }: { who: string; when: string; onReload: () => void }) {
  const p = useP();
  const { locale } = useI18n();
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 bg-warning-bg px-4 py-3 text-small text-warning m-rise">
      <Icon name="refresh" size={16} aria-hidden /><p className="min-w-0 flex-1">{fill(p.states.conflict, { name: who, when: formatRelative(when, locale) })}</p>
      <Button size="sm" variant="secondary" onClick={onReload}>{p.states.reload}</Button>
    </div>
  );
}
/** Draft persistence for PR/bill forms (§4 Offline): sessionStorage, restored with a "Restored draft" note. */
export function useDraft<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try { const s = sessionStorage.getItem(key); return s ? (JSON.parse(s) as { v: T }).v : initial; } catch { return initial; }
  });
  const [restoredAt] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try { const s = sessionStorage.getItem(key); return s ? (JSON.parse(s) as { at: string }).at : null; } catch { return null; }
  });
  const save = (v: T) => { setValue(v); try { sessionStorage.setItem(key, JSON.stringify({ v, at: new Date().toISOString() })); } catch { /* storage full or blocked */ } };
  const clear = () => { setValue(initial); try { sessionStorage.removeItem(key); } catch { /* blocked */ } };
  return { value, save, clear, restoredAt };
}
export const todayIso = () => new Date().toISOString().slice(0, 10);
export { addDays };

// Lanes A+B shared bits: copy hook, small form helpers, money formatting, query-error → NoAccess/NotFound.
export const useAB = () => procurementAb(useI18n().locale);
export const isNotFound = (e: unknown) => e instanceof ApiError && e.status === 404;

/** Input field in one line: label, value, error. */
export function TextField({ label, value, onChange, error, type = "text", hint, optional, ...rest }: {
  label: ReactNode; value: string | number; onChange: (v: string) => void; error?: string; type?: string; hint?: ReactNode; optional?: string;
} & Omit<React.ComponentProps<"input">, "value" | "onChange" | "type">) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional}>{(a) => (
      <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type={type} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    )}</Field>
  );
}
/** Query failure → permission page, not-found text, or retry panel. */
export function QueryFail({ error, onRetry, notFound }: { error: unknown; onRetry: () => void; notFound: string }) {
  if (isForbidden(error)) return <ProcNoAccess />;
  if (isNotFound(error)) return <p role="alert" className="py-16 text-center text-body text-fg-muted">{notFound}</p>;
  return <PanelErr onRetry={onRetry} />;
}

// Lane C shared bits: copy hook, error mapping, PR stepper + timeline.
export const useC = () => procurementC(useI18n().locale);
/** Lane copy first (procurement codes), then the shared error copy. */
export function useErr() {
  const c = useC();
  const { locale } = useI18n();
  return (e: unknown, vars: Record<string, string | number> = {}) =>
    e instanceof ApiError && e.errorType && c.errors[e.errorType] ? fill(c.errors[e.errorType], vars) : errorCopy(e, locale);
}

/** Submitted → Approved → Ordered → Delivered (PR4). */
export function PrStepper({ pr }: { pr: PrDetail }) {
  const c = useC();
  const i = pr.delivered ? 3 : pr.status === "ordered" ? 2 : pr.status === "approved" ? 1 : 0;
  return <Stepper steps={c.mine.steps} current={i} />;
}
export function PrTimeline({ pr }: { pr: PrDetail }) {
  const c = useC();
  const { locale } = useI18n();
  const p = useP();
  return (
    <Timeline items={pr.decisions.map((d, i) => ({
      id: `${i}`, current: i === pr.decisions.length - 1,
      title: <span>{c.detail.events[d.step]} · <span className="font-medium">{d.by.name}</span>{d.outcome !== "done" && <span className="text-fg-muted"> · {p.status[d.outcome] ?? d.outcome}</span>}</span>,
      meta: formatDateTime(d.at, locale), body: d.reason,
    })).reverse()} />
  );
}
