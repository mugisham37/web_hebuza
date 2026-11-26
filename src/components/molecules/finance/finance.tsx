"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { cx, formatDateTime, formatRelative, formatDate, formatMoney } from "@/shared/format";
import { fill } from "@/content/pages/finance-common";
import { canSign } from "@/shared/finance/approvals";
import { isTaxable, lineVat, lineNet } from "@/lib/finance/money";
import { BUCKETS, type Bucket } from "@/shared/finance/ageing";
import { useAudit } from "@/lib/finance/api";
import { type DocLine, type DocTotals, type ExportJob, type LineKind, type Step } from "@/shared/finance/types";
import { type Role } from "@/shared/auth/roles";
import { ApiError } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { Icon } from "@/components/atoms/icon";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Avatar } from "@/components/atoms/misc";
import { useToast } from "@/components/atoms/toast";
import { Sparkline } from "@/components/atoms/ops";
import { PanelError } from "@/components/molecules/ops/ops";
import { useStepUp, StepUpCancelled, usePhone } from "@/components/atoms/step-up";
import { useNow } from "@/components/atoms/agent";
import { Amount, AmountDelta, SignerAvatar, useF, type SignerState, FinStatus, MatchChip } from "@/components/atoms/finance";
import { type Locale } from "@/shared/i18n/config";
import { financePayments } from "@/content/pages/finance-payments";
import { financeRecon } from "@/content/pages/finance-recon";
import { type LineRow, type PlatformRow, type ProofCandidate } from "@/lib/finance/c";
import { useOnline } from "@/components/atoms/hooks";

// Finance molecules shared by every lane (plan 05 §5.4, board 01). Lane-only pieces (proof preview, workbench rows)
// live in the owning lane's folder. Amounts shown here come from props (API or lib/finance/money.ts) — no maths here.
// ---------------------------------------------------------------- MoneyTile (FK1)
/** Label, amount, delta (with period), count, drill link. Per-tile loading/error so one failure never blanks the board. */
export function MoneyTile({ label, value, delta, deltaPeriod, count, href, spark, loading, error, onRetry, tone = "white", icon }: {
  label: string; value?: number | null; delta?: number; deltaPeriod?: string; count?: ReactNode; href?: string; spark?: number[];
  loading?: boolean; error?: boolean; onRetry?: () => void; tone?: "white" | "lavender"; icon?: Parameters<typeof Icon>[0]["name"];
}) {
  if (error) return <PanelError what={label} onRetry={onRetry ?? (() => {})} />;
  const cls = cx("group grid min-h-32 content-between gap-3 p-4 m-lift", tone === "lavender" ? "bg-bg-tint" : "border border-border bg-surface", href && "focus-visible:outline-2");
  const body = (
    <>
      <span className="flex items-center justify-between gap-2 text-small text-fg-muted">
        {label}
        {icon && <Icon name={icon} size={18} aria-hidden className="text-link" />}
      </span>
      {loading ? (
        <span aria-hidden className="h-8 w-40 m-shimmer" />
      ) : (
        <span className="flex items-end justify-between gap-2">
          {/* value cross-fades on change (m-rise keyed by value); never counted up — counting misreads money (§5.2) */}
          <span key={String(value)} className="m-rise"><Amount value={value ?? 0} size="xl" /></span>
          {spark && <span className="text-link"><Sparkline values={spark} /></span>}
        </span>
      )}
      <span className="flex flex-wrap items-center gap-2">
        {delta != null && deltaPeriod && <AmountDelta value={delta} period={deltaPeriod} />}
        {count != null && <span className="bg-ink-100 px-2 py-0.5 text-eyebrow tabular">{count}</span>}
      </span>
    </>
  );
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

// ---------------------------------------------------------------- ApprovalChain + MakerChecker (FK3)
/**
 * Signers left → right. State per step: signed / you (next and allowed) / waiting / blocked (same person).
 * `onSign` renders the sign button on "you"; wrap it with useStepUpAction. Phone: summary line + vertical list.
 */
export function ApprovalChain({ steps, me, makerIds = [], onSign, signing }: {
  steps: Step[]; me?: { id: string; roles: readonly Role[] }; makerIds?: string[]; onSign?: () => void; signing?: boolean;
}) {
  const f = useF();
  const { locale } = useI18n();
  const check = me ? canSign(steps, me, makerIds) : null;
  const next = steps.findIndex((s) => !s.signedBy);
  const signed = steps.filter((s) => s.signedBy).length;
  const stateOf = (i: number): SignerState =>
    steps[i].signedBy ? "signed" : i === next && check?.ok ? "you" : i === next && check && !check.ok && check.reason === "same_approver" ? "blocked" : "waiting";
  return (
    <section aria-label={fill(f.signer.ofSigned, { n: signed, m: steps.length })} className="bg-bg-tint p-4">
      <p className="mb-3 text-eyebrow text-navy-800 tabular" aria-live="polite">{fill(f.signer.ofSigned, { n: signed, m: steps.length })}</p>
      <ol className="flex flex-col gap-3 md:flex-row md:items-start">
        {steps.map((s, i) => (
          <li key={i} className="flex min-w-0 flex-1 items-start gap-3 md:flex-col">
            <div className="flex w-full items-center gap-2">
              <SignerAvatar user={s.signedBy ?? null} state={stateOf(i)} caption={f.chain[s.reason] ?? s.reason} />
              {i < steps.length - 1 && <span aria-hidden className={cx("hidden h-px flex-1 md:block m-tone", s.signedBy ? "bg-success" : "bg-border-strong")} />}
            </div>
            {s.at && <span className="text-eyebrow text-fg-subtle tabular md:pl-12">{formatDateTime(s.at, locale)}</span>}
            {stateOf(i) === "you" && onSign && <Button size="sm" variant="primary" className="m-press md:ml-12" loading={signing} onClick={onSign}>{f.chain[s.reason] ?? s.reason}</Button>}
            {stateOf(i) === "blocked" && <span className="text-eyebrow text-danger md:pl-12">{f.signer.youMade}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Maker → checker; the same person is called out (spec/02 §4). */
export function MakerChecker({ maker, checker }: { maker: { id: string; name: string }; checker?: { id: string; name: string } | null }) {
  const f = useF();
  const same = !!checker && checker.id === maker.id;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SignerAvatar user={maker} state="signed" caption={f.chain.proposer} />
      <Icon name="arrowRight" size={18} aria-hidden className="text-fg-subtle" />
      <SignerAvatar user={checker ?? null} state={same ? "blocked" : checker ? "signed" : "waiting"} caption={f.chain.checker} />
      {same && <p role="alert" className="w-full text-small text-danger">{f.signer.sameNotAllowed}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- LineEditor + TotalsPanel + EligibleBreakdown (QT2/IN2)
const KINDS: LineKind[] = ["service_fee", "urgent_surcharge", "government_fee", "third_party_cost", "discount", "other"];
/** Kind drives VAT and eligibility (indicators only — eligibility is a rule, not a choice). No drag: buttons reorder. */
export function LineEditor({ lines, onChange, readOnly, errors = {}, vatBps }: {
  lines: DocLine[]; onChange?: (l: DocLine[]) => void; readOnly?: boolean; errors?: Record<number, string>; vatBps?: number;
}) {
  const f = useF();
  const { locale } = useI18n();
  const set = (i: number, p: Partial<DocLine>) => onChange?.(lines.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const move = (i: number, d: -1 | 1) => { const n = [...lines]; [n[i], n[i + d]] = [n[i + d], n[i]]; onChange?.(n); };
  const label = (l: DocLine) => (typeof l.label === "string" ? l.label : (l.label[locale] ?? l.label.en ?? ""));
  const num = "h-10 w-full border border-border-strong bg-surface px-2 text-right tabular";
  return (
    <div className="grid gap-3">
      <div role="region" aria-label={f.totals.total} tabIndex={0} className="overflow-x-auto border border-border bg-surface">
        <table className="w-full min-w-[44rem] text-small">
          <thead className="bg-bg-subtle text-left text-eyebrow text-fg-subtle">
            <tr>
              <th className="p-3 font-medium">{f.lines.kind}</th><th className="p-3 font-medium">{f.lines.label}</th>
              <th className="w-20 p-3 text-right font-medium">{f.lines.qty}</th><th className="w-36 p-3 text-right font-medium">{f.lines.unit}</th>
              <th className="w-28 p-3 text-right font-medium">{f.lines.vat}</th><th className="w-20 p-3 text-center font-medium">{f.lines.eligible}</th>
              {!readOnly && <th className="w-28 p-3"><span className="sr-only">{f.lines.remove}</span></th>}
            </tr>
          </thead>
          <tbody className="m-stagger">
            {lines.map((l, i) => (
              <tr key={i} style={{ ["--i" as string]: i }} className={cx("border-t border-border align-top", errors[i] && "bg-danger-bg/40")}>
                <td className="p-2">
                  {readOnly ? f.lines.kinds[l.kind] : (
                    <select aria-label={f.lines.kind} value={l.kind} onChange={(e) => set(i, { kind: e.target.value as LineKind })} className="h-10 w-full border border-border-strong bg-surface px-2">
                      {KINDS.map((k) => <option key={k} value={k}>{f.lines.kinds[k]}</option>)}
                    </select>
                  )}
                </td>
                <td className="p-2">
                  {readOnly ? label(l) : <input aria-label={f.lines.label} value={label(l)} onChange={(e) => set(i, { label: e.target.value })} className="h-10 w-full border border-border-strong bg-surface px-2" />}
                  {errors[i] && <p className="mt-1 text-eyebrow text-danger">{errors[i]}</p>}
                </td>
                <td className="p-2 text-right tabular">{readOnly ? l.qty : <input aria-label={f.lines.qty} inputMode="numeric" value={l.qty} onChange={(e) => set(i, { qty: Number(e.target.value.replace(/\D/g, "")) || 0 })} className={num} />}</td>
                <td className="p-2 text-right">{readOnly ? <Amount value={l.unit} size="sm" /> : <input aria-label={f.lines.unit} inputMode="numeric" value={l.unit} onChange={(e) => set(i, { unit: Number(e.target.value.replace(/\D/g, "")) || 0 })} className={num} />}</td>
                <td className="p-3 text-right"><Amount value={lineVat(l, vatBps)} size="sm" /></td>
                <td className="p-3 text-center">
                  {isTaxable(l) ? <Icon name="check" size={16} className="inline text-success" aria-label={f.lines.eligible} /> : <span aria-label="" className="text-fg-subtle"></span>}
                </td>
                {!readOnly && (
                  <td className="p-2">
                    <span className="flex justify-end gap-1">
                      <button type="button" aria-label={f.lines.up} disabled={i === 0} onClick={() => move(i, -1)} className="flex size-9 items-center justify-center hover:bg-ink-100 disabled:opacity-30"><Icon name="chevronDown" size={14} className="rotate-180" aria-hidden /></button>
                      <button type="button" aria-label={f.lines.down} disabled={i === lines.length - 1} onClick={() => move(i, 1)} className="flex size-9 items-center justify-center hover:bg-ink-100 disabled:opacity-30"><Icon name="chevronDown" size={14} aria-hidden /></button>
                      <button type="button" aria-label={f.lines.remove} onClick={() => onChange?.(lines.filter((_, j) => j !== i))} className="flex size-9 items-center justify-center text-danger hover:bg-danger-bg"><Icon name="x" size={14} aria-hidden /></button>
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <Button size="sm" variant="outline" className="w-fit m-press" onClick={() => onChange?.([...lines, { kind: "service_fee", label: "", qty: 1, unit: 0 }])}>
          <Icon name="plus" size={14} aria-hidden />{f.lines.add}
        </Button>
      )}
    </div>
  );
}

/** Read-only totals from docTotals(); sticky on desktop, bottom bar on phone (caller places it). */
export function TotalsPanel({ totals, deposit, className }: { totals: DocTotals; deposit?: { deposit: number; balance: number; pct: string } | null; className?: string }) {
  const f = useF();
  const row = (k: string, v: number, strong?: boolean) => (
    <div className={cx("flex items-baseline justify-between gap-4 py-1.5", strong && "border-t border-border pt-3")}>
      <dt className={strong ? "text-label" : "text-small text-fg-muted"}>{k}</dt><dd><Amount value={v} size={strong ? "lg" : "sm"} /></dd>
    </div>
  );
  return (
    <dl className={cx("border border-border bg-surface p-4 lg:sticky lg:top-20", className)}>
      {row(f.totals.subtotal, totals.subtotal)}{row(f.totals.vat, totals.vat)}{row(f.totals.passThrough, totals.passThrough)}{row(f.totals.total, totals.total, true)}
      <div className="mt-3 flex items-baseline justify-between gap-4 bg-bg-tint px-3 py-2">
        <dt className="text-small text-navy-800">{f.totals.eligible}</dt><dd><Amount value={totals.eligible} size="sm" /></dd>
      </div>
      {deposit !== undefined && (
        <p className="mt-2 text-small text-fg-muted">{deposit ? <DepositLine {...deposit} /> : f.totals.noDeposit}</p>
      )}
    </dl>
  );
}
function DepositLine({ deposit, pct }: { deposit: number; pct: string }) {
  const f = useF();
  const { locale } = useI18n();
  return <>{fill(f.totals.deposit, { pct, amount: formatMoney(deposit, "RWF", locale) })}</>;
}

/** Eligible fee → net base (values from the API; F-REV-02). */
export function EligibleBreakdown({ eligible, deductions, credits, netBase }: { eligible: number; deductions: { kind: string; amount: number; note: string }[]; credits: number; netBase: number }) {
  const f = useF();
  return (
    <dl className="grid gap-1.5 text-small">
      <div className="flex justify-between gap-3"><dt className="text-fg-muted">{f.eligible.lines}</dt><dd><Amount value={eligible} size="sm" /></dd></div>
      {deductions.map((d, i) => (
        <div key={i} className="flex justify-between gap-3"><dt className="text-fg-muted">{f.eligible.deductions} · {d.note || d.kind}</dt><dd><Amount value={-d.amount} size="sm" /></dd></div>
      ))}
      {credits !== 0 && <div className="flex justify-between gap-3"><dt className="text-fg-muted">{f.eligible.credits}</dt><dd><Amount value={-Math.abs(credits)} size="sm" /></dd></div>}
      <div className="flex justify-between gap-3 border-t border-border pt-2"><dt className="text-label">{f.eligible.net}</dt><dd><Amount value={netBase} size="md" /></dd></div>
    </dl>
  );
}

// ---------------------------------------------------------------- charts with table alternatives (FK6, §5.6)
type Five = { invoiced: number; collected: number; allocated: number; approved: number; paid: number };
/** Five money states as decreasing step bars with values; table toggle (C3.8-j). */
export function FiveStatesBar({ values }: { values: Five }) {
  const f = useF();
  const [table, setTable] = useState(false);
  const keys = Object.keys(values) as (keyof Five)[];
  const max = Math.max(1, ...keys.map((k) => values[k]));
  const tone: Record<keyof Five, string> = { invoiced: "bg-navy-700", collected: "bg-success", allocated: "bg-sky-400", approved: "bg-info", paid: "bg-primary" };
  return (
    <figure className="grid gap-3">
      {table ? (
        <table className="w-full text-small"><tbody>{keys.map((k) => <tr key={k} className="border-t border-border"><th className="py-2 text-left font-normal text-fg-muted">{f.states5[k]}</th><td className="py-2 text-right"><Amount value={values[k]} size="sm" /></td></tr>)}</tbody></table>
      ) : (
        <div className="grid h-40 grid-cols-5 items-end gap-2" aria-hidden>
          {keys.map((k) => (
            <div key={k} className="grid h-full content-end gap-1.5">
              <span className="truncate text-center text-eyebrow tabular"><Amount value={values[k]} size="sm" /></span>
              <span className={cx("block m-grow", tone[k])} style={{ height: `${Math.max(4, (values[k] / max) * 100)}%` }} />
              <span className="truncate text-center text-eyebrow text-fg-muted">{f.states5[k]}</span>
            </div>
          ))}
        </div>
      )}
      <figcaption className="sr-only">{keys.map((k) => `${f.states5[k]} ${values[k]}`).join(", ")}</figcaption>
      <button type="button" aria-pressed={table} onClick={() => setTable(!table)} className="w-fit text-small underline underline-offset-4">{f.states5.table}</button>
    </figure>
  );
}

const BUCKET_FILL: Record<Bucket, string> = { not_due: "bg-ink-300", "0_30": "bg-sky-400", "31_60": "bg-navy-500", "61_90": "bg-warning", "90_plus": "bg-danger" };
/** Ageing: 5-segment bar + legend with values; table toggle (board 08 fix: not colour alone). */
export function AgeingBar({ buckets, onPick }: { buckets: Record<Bucket, number>; onPick?: (b: Bucket) => void }) {
  const f = useF();
  const [table, setTable] = useState(false);
  const total = BUCKETS.reduce((s, b) => s + buckets[b], 0) || 1;
  return (
    <figure className="grid gap-3">
      {!table && (
        <div aria-hidden className="flex h-4 overflow-hidden bg-ink-100 m-rise">
          {BUCKETS.map((b) => buckets[b] > 0 && <span key={b} className={cx("h-full", BUCKET_FILL[b])} style={{ width: `${(buckets[b] / total) * 100}%` }} />)}
        </div>
      )}
      {table ? (
        <table className="w-full text-small"><tbody>{BUCKETS.map((b) => <tr key={b} className="border-t border-border"><th className="py-2 text-left font-normal text-fg-muted">{f.bucket[b]}</th><td className="py-2 text-right"><Amount value={buckets[b]} size="sm" /></td></tr>)}</tbody></table>
      ) : (
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {BUCKETS.map((b) => (
            <li key={b}>
              <button type="button" disabled={!onPick} onClick={() => onPick?.(b)} className="flex items-center gap-2 text-small disabled:cursor-default">
                <span aria-hidden className={cx("size-2.5 rounded-full", BUCKET_FILL[b])} />{f.bucket[b]} <Amount value={buckets[b]} size="sm" className="font-medium" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" aria-pressed={table} onClick={() => setTable(!table)} className="w-fit text-small underline underline-offset-4">{f.states5.table}</button>
    </figure>
  );
}

// ---------------------------------------------------------------- History (FK8, F-AUD-03)
const show = (v: unknown) => (v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
/** Before → after for changed keys only. */
export function DiffList({ before, after }: { before: unknown; after: unknown }) {
  const f = useF();
  const b = (before ?? {}) as Record<string, unknown>, a = (after ?? {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].filter((k) => show(b[k]) !== show(a[k]));
  if (!keys.length) return <p className="text-small text-fg-subtle"></p>;
  return (
    <dl className="grid gap-2 text-small">
      {keys.map((k) => (
        <div key={k} className="grid gap-1 bg-bg-subtle p-3 sm:grid-cols-[8rem_1fr]">
          <dt className="font-medium">{k}</dt>
          <dd className="flex flex-wrap items-center gap-2 tabular">
            <span className="sr-only">{f.history.before}</span><del className="text-danger">{show(b[k])}</del>
            <Icon name="arrowRight" size={12} aria-hidden />
            <span className="sr-only">{f.history.after}</span><ins className="text-success no-underline">{show(a[k])}</ins>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Financial change history of one record + diff drawer. Every money record page mounts it. */
export function HistoryTab({ resourceType, resourceId }: { resourceType: string; resourceId: string }) {
  const f = useF();
  const { locale } = useI18n();
  const q = useAudit(resourceType, resourceId);
  const [open, setOpen] = useState<string | null>(null);
  if (q.isPending) return <div className="grid gap-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 m-shimmer" />)}</div>;
  if (q.isError) return <PanelError what={f.history.title} onRetry={() => q.refetch()} />;
  const items = q.data.items;
  if (!items.length) return <p className="border border-dashed border-border-strong px-4 py-8 text-center text-small text-fg-muted">{f.history.empty}</p>;
  const cur = items.find((e) => e.id === open);
  return (
    <>
      <ol className="relative grid gap-1 border-l border-border pl-5 m-stagger">
        {items.map((e, i) => (
          <li key={e.id} style={{ ["--i" as string]: i }} className="relative">
            <span aria-hidden className="absolute top-4 -left-[1.6rem] size-2.5 rounded-full bg-secondary ring-4 ring-surface" />
            <button type="button" onClick={() => setOpen(e.id)} className="grid w-full gap-0.5 p-2.5 text-left hover:bg-bg-subtle">
              <span className="text-small font-medium">{e.action.split(".").slice(1).join(" · ")}</span>
              <span className="text-eyebrow text-fg-subtle tabular">{formatDateTime(e.at, locale)} · {e.actor}{e.reason ? ` · ${e.reason}` : ""}</span>
            </button>
          </li>
        ))}
      </ol>
      <Dialog open={!!cur} onClose={() => setOpen(null)} side="right" title={f.history.diff} description={cur ? `${formatDateTime(cur.at, locale)} · ${cur.actor}` : undefined}>
        {cur && (
          <div className="grid gap-4">
            <DiffList before={cur.before} after={cur.after} />
            {cur.reason && <p className="text-small"><span className="text-fg-muted">{f.history.reason}: </span>{cur.reason}</p>}
          </div>
        )}
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------- ReportFrame + ExportMenu (RPT frame)
/** Period, timezone, filters, definitions drawer, generated-at and freshness (stale > 5 min warns). */
export function ReportFrame({ title, period, filters, definitions, generatedAt, freshness, actions, children }: {
  title: ReactNode; period: ReactNode; filters?: ReactNode; definitions: { key: string; text: string }[]; generatedAt: string; freshness: string;
  actions?: ReactNode; children: ReactNode;
}) {
  const f = useF();
  const { locale } = useI18n();
  const now = useNow();
  const [defs, setDefs] = useState(false);
  const stale = !!now && now - Date.parse(freshness) > 5 * 60_000;
  return (
    <section className="grid gap-4 border border-border bg-surface p-4 md:p-6 m-rise">
      <header className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-fg-heading text-card-title">{title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">{period}
            <span className="text-eyebrow text-fg-subtle tabular">{fill(f.report.generated, { t: formatDateTime(generatedAt, locale) })}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setDefs(true)}>{f.report.definitions}</Button>
          {actions}
        </div>
      </header>
      {filters && <div aria-label={f.report.filters} className="flex flex-wrap gap-2">{filters}</div>}
      <p className={cx("flex items-center gap-2 text-eyebrow", stale ? "text-warning" : "text-fg-subtle")}>
        <Icon name="clock" size={12} aria-hidden />{fill(f.report.freshness, { t: now ? formatRelative(freshness, locale, now) : formatDateTime(freshness, locale) })}{stale && ` · ${f.report.stale}`}
      </p>
      {children}
      <Dialog open={defs} onClose={() => setDefs(false)} side="right" title={f.report.definitions}>
        <dl className="grid gap-4">{definitions.map((d) => <div key={d.key}><dt className="text-label">{d.key}</dt><dd className="text-small text-fg-muted">{d.text}</dd></div>)}</dl>
      </Dialog>
    </section>
  );
}

/** Export formats → background job; status shown inline (polite live region). Exports are audited server-side. */
export function ExportMenu({ formats, job, onPick, disabled }: { formats: string[]; job?: ExportJob | null; onPick: (format: string) => void; disabled?: boolean }) {
  const f = useF();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button size="sm" variant="outline" aria-haspopup="menu" aria-expanded={open} disabled={disabled} onClick={() => setOpen((o) => !o)} className="m-press">
        <Icon name="upload" size={14} aria-hidden className="rotate-180" />{f.export.label}
      </Button>
      {open && (
        <div role="menu" onKeyDown={(e) => e.key === "Escape" && setOpen(false)} className="absolute right-0 z-40 mt-2 w-48 border border-border bg-surface p-1.5 shadow-md m-pop">
          {formats.map((x) => <button key={x} role="menuitem" type="button" onClick={() => { setOpen(false); onPick(x); }} className="flex h-10 w-full items-center px-3 text-left text-small uppercase hover:bg-bg-subtle">{x}</button>)}
        </div>
      )}
      {job && (
        <p aria-live="polite" className={cx("mt-2 flex items-center gap-2 text-eyebrow", job.status === "failed" ? "text-danger" : "text-fg-muted")}>
          {job.status === "running" || job.status === "queued" ? <span aria-hidden className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
          {job.status === "ready" && job.url ? <a href={job.url} className="underline underline-offset-4">{f.export.ready}</a> : f.export[job.status]}
          {job.status === "ready" && <span className="text-fg-subtle">· {f.export.logged}</span>}
          {(job.status === "failed" || job.status === "expired") && <button type="button" onClick={() => onPick(job.format)} disabled={disabled} className="underline underline-offset-4 hover:text-fg">{f.export.retry}</button>}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- StepUpGate, ConflictDialog, NoAccess, MockSimulator
/**
 * Wraps a step-up mutation: `run("approve refund", (token) => mutateAsync({…, stepUp: token}))`.
 * Cancel → nothing changes; 401 step_up_required → drops the cached token and asks once more; other errors → mapped toast.
 */
export function useStepUpAction() {
  const { request, reset, dialog } = useStepUp();
  const toast = useToast();
  const { locale } = useI18n();
  const f = useF();
  async function run<T>(what: string, fn: (token: string) => Promise<T>): Promise<T | undefined> {
    try {
      try { return await fn(await request(what)); }
      catch (e) {
        if (e instanceof ApiError && e.errorType === "step_up_required") { reset(); return await fn(await request(what)); }
        throw e;
      }
    } catch (e) {
      if (e instanceof StepUpCancelled) { toast({ title: f.stepUp.cancelled }); return undefined; }
      toast({ title: errorCopy(e, locale), tone: "danger" });
      throw e;
    }
  }
  return { run, dialog };
}

/** 409 version_conflict: who/when + Refresh, never a silent overwrite. */
export function ConflictDialog({ open, who, when, onRefresh, onClose }: { open: boolean; who: string; when: string; onRefresh: () => void; onClose: () => void }) {
  const f = useF();
  const { locale } = useI18n();
  return (
    <Dialog open={open} onClose={onClose} title={f.conflict.title} footer={<Button onClick={onRefresh} className="m-press"><Icon name="refresh" size={14} aria-hidden />{f.conflict.refresh}</Button>}>
      <div className="flex items-start gap-3">
        <Avatar name={who} size="md" />
        <p className="text-body">{fill(f.conflict.body, { who, when: formatRelative(when, locale) })}</p>
      </div>
    </Dialog>
  );
}

/** Page-level permission denial (role-aware). */
export function NoAccess() {
  const f = useF();
  const { locale } = useI18n();
  const { user } = useSession();
  const exec = !!user?.roles.includes("staff:executive");
  return (
    <div role="alert" className="mx-auto grid max-w-md place-items-center gap-3 py-16 text-center m-rise">
      <span className="flex size-14 items-center justify-center rounded-full bg-navy-50 text-navy-700"><Icon name="lock" size={24} aria-hidden /></span>
      <h1 className="text-fg-heading text-h3">{f.noAccess.title}</h1>
      <p className="text-body text-fg-muted">{f.noAccess.body}</p>
      <Link href={localHref(locale, exec ? "/finance/approvals" : "/")} className="inline-flex h-11 items-center bg-secondary px-5 text-button text-on-navy m-press">{exec ? f.noAccess.exec : f.noAccess.home}</Link>
    </div>
  );
}

// Lane B shared pieces: error → conflict/toast routing, stale-before-money guard, document preview sheet, expiry chip, back link.
/** Routes a failed mutation: 409 version_conflict → ConflictDialog (who/when + Refresh); anything else → mapped toast. */
export function useBError(who: () => { name: string; at: string } | null, refresh: () => void) {
  const toast = useToast();
  const { locale } = useI18n();
  const [conflict, setConflict] = useState(false);
  const w = who();
  const onError = (e: unknown) => {
    if (e instanceof ApiError && e.errorType === "version_conflict") setConflict(true);
    else toast({ title: errorCopy(e, locale), tone: "danger" });
  };
  const dialog = (
    <ConflictDialog open={conflict} who={w?.name ?? ""} when={w?.at ?? new Date(0).toISOString()}
      onClose={() => setConflict(false)} onRefresh={() => { setConflict(false); refresh(); }} />
  );
  return { onError, dialog };
}

/** Stale guard (DoD 2): if the record is older than 5 min, refetch before a money action. */
export async function fresh(q: { dataUpdatedAt: number; refetch: () => Promise<unknown> }) {
  if (Date.now() - q.dataUpdatedAt > 5 * 60_000) await q.refetch();
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  const { locale } = useI18n();
  return (
    <Link href={localHref(locale, href)} className="mb-2 inline-flex items-center gap-1.5 text-small text-fg-muted hover:text-fg">
      <Icon name="arrowRight" size={14} aria-hidden className="rotate-180" />{children}
    </Link>
  );
}

/** "Expires in 6 h" chip when ≤ 48 h left (U5); plain date otherwise. */
export function ExpiryChip({ validUntil, label }: { validUntil: string; label: string }) {
  const { locale } = useI18n();
  const now = useNow();
  const end = Date.parse(`${validUntil}T23:59:59+02:00`);
  const left = now ? end - now : Infinity;
  const date = <span className="tabular">{formatDate(validUntil, locale)}</span>;
  if (left <= 0 || left > 48 * 3600_000) return date;
  const h = Math.max(1, Math.round(left / 3600_000));
  const rel = new Intl.RelativeTimeFormat(locale === "rw" ? "rw" : locale, { numeric: "auto" }).format(h, "hour");
  return (
    <span className="grid gap-1">
      {date}
      <span aria-live="polite" className="inline-flex w-fit items-center gap-1 bg-warning-bg px-2 py-0.5 text-eyebrow text-warning m-tone">
        <Icon name="clock" size={11} aria-hidden />{fill(label, { t: rel })}
      </span>
    </span>
  );
}

const lbl = (l: DocLine, locale: Locale) => (typeof l.label === "string" ? l.label : (l.label[locale] ?? l.label.en ?? ""));

/** A4-like preview (QT3/IN2 Documents): every line incl. pass-through (board 05 fix), totals from the API. Phone → bottom sheet. */
export function DocumentPreview({ open, onClose, title, kindLabel, no, billTo, date, lines, totals, lang, footer, extra }: {
  open: boolean; onClose: () => void; title: string; kindLabel: string; no: string | null; billTo: { name: string; tin?: string };
  date: string; lines: DocLine[]; totals: DocTotals; lang: Locale; footer?: ReactNode; extra?: ReactNode;
}) {
  const f = useF();
  const phone = usePhone();
  return (
    <Dialog open={open} onClose={onClose} side={phone ? "bottom" : "right"} title={title} footer={footer} className="md:max-w-2xl">
      <article lang={lang} className="relative overflow-hidden border border-border bg-surface p-5 shadow-md sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -bottom-10 -left-10 size-40 rotate-45 bg-gold-200/60" />
        <header className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-label"><span aria-hidden className="text-gold-600">✳</span>HEBUZA</p>
            <h3 className="text-fg-heading mt-4 text-h3">{kindLabel}</h3>
          </div>
          <p className="text-small font-medium tabular">{no ?? f.doc.pending}</p>
        </header>
        <dl className="relative mt-4 grid gap-0.5 text-small">
          <div className="flex gap-2"><dt className="text-fg-muted">·</dt><dd>{billTo.name}</dd></div>
          {billTo.tin && <div className="flex gap-2"><dt className="text-fg-muted">TIN</dt><dd className="tabular">{billTo.tin}</dd></div>}
          <div className="flex gap-2"><dt className="text-fg-muted">·</dt><dd className="tabular">{formatDate(date, lang)}</dd></div>
        </dl>
        <div role="region" aria-label={kindLabel} tabIndex={0} className="relative mt-5 overflow-x-auto">
          <table className="w-full min-w-[26rem] text-small">
            <thead className="border-b border-border text-left text-eyebrow text-fg-subtle">
              <tr><th className="py-2 font-medium">{f.lines.label}</th><th className="py-2 text-right font-medium">{f.lines.qty}</th><th className="py-2 text-right font-medium">{f.lines.unit}</th><th className="py-2 text-right font-medium">{f.totals.total}</th></tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="py-2 pr-2">{lbl(l, lang)}<span className="block text-eyebrow text-fg-subtle">{f.lines.kinds[l.kind]}</span></td>
                  <td className="py-2 text-right tabular">{l.qty}</td>
                  <td className="py-2 text-right"><Amount value={l.unit} size="sm" /></td>
                  <td className="py-2 text-right"><Amount value={lineNet(l)} size="sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="relative mt-4 ml-auto grid max-w-xs gap-1 text-small">
          {([[f.totals.subtotal, totals.subtotal], [f.totals.vat, totals.vat], [f.totals.passThrough, totals.passThrough]] as const).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4"><dt className="text-fg-muted">{k}</dt><dd><Amount value={v} size="sm" /></dd></div>
          ))}
          <div className="mt-1 flex justify-between gap-4 bg-bg-tint px-2 py-1.5"><dt className="text-label">{f.totals.total}</dt><dd><Amount value={totals.total} size="md" className="font-medium" /></dd></div>
        </dl>
        {extra && <div className="relative mt-4">{extra}</div>}
      </article>
    </Dialog>
  );
}

/** Small key/value used in record headers. */
export function Meta({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx("grid min-w-0 gap-0.5", className)}>
      <dt className="text-eyebrow text-fg-subtle">{label}</dt>
      <dd className="truncate text-body">{children}</dd>
    </div>
  );
}

// Lane C shared pieces (plan 05 §5.4): ProofPreview, StatementLineRow, PlatformLineRow + copy hooks and the
// money-action guard (offline / executive read-only). Amounts and differences come from the API — no maths here.
export const useP = () => financePayments(useI18n().locale);
export const useR = () => financeRecon(useI18n().locale);
export { fill };

/** Money actions: off when offline (nothing queued) or for executives outside their signing steps. */
export function useMoneyGuard() {
  const online = useOnline();
  const { user } = useSession();
  const exec = !!user?.roles.includes("staff:executive") && !user.roles.some((r) => r.startsWith("staff:finance"));
  return { online, exec, can: online && !exec };
}

export const isConflict = (e: unknown) => e instanceof ApiError && e.errorType === "version_conflict";

/** Holds a 409 version_conflict so the page can show ConflictDialog instead of a toast. */
export function useConflict() {
  const [conflict, setConflict] = useState<{ at: string } | null>(null);
  return {
    conflict,
    clear: () => setConflict(null),
    /** Returns true when the error was a conflict (caller skips its toast). */
    take: (e: unknown) => { if (!isConflict(e)) return false; setConflict({ at: new Date().toISOString() }); return true; },
  };
}

// ---------------------------------------------------------------- ProofPreview
/** Proof document + bank ref + amount + best statement candidate. Renders image / PDF / unreadable states. */
export function ProofPreview({ fileName, href, amount, bankRef, candidate, kind, action }: {
  fileName?: string; href?: string; amount: number; bankRef?: string; candidate?: ProofCandidate | null; kind?: "image" | "pdf" | "unreadable"; action?: ReactNode;
}) {
  const p = useP();
  const { locale } = useI18n();
  const k = kind ?? (!fileName ? "unreadable" : /\.(png|jpe?g|webp)$/i.test(fileName) ? "image" : "pdf");
  const both = !!candidate && candidate.exactAmount && candidate.refFound;
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,10rem)_1fr]">
      <figure className="m-lift relative grid aspect-[3/4] place-items-center overflow-hidden border border-border bg-ink-100">
        {k === "unreadable" ? (
          <figcaption className="grid place-items-center gap-2 p-3 text-center text-eyebrow text-fg-muted">
            <Icon name="file" size={22} aria-hidden />{p.proofs.unreadable}
          </figcaption>
        ) : (
          <>
            {/* shortcut: drawn placeholder page instead of the real file, swap for the document service preview URL. */}
            <div aria-hidden className="absolute inset-3 grid content-start gap-1.5 bg-surface p-3 shadow-sm">
              {k === "image" ? <span className="h-14 bg-ink-300" /> : <span className="h-2 w-1/2 bg-ink-400/60" />}
              {Array.from({ length: 6 }, (_, i) => <span key={i} className="h-1.5 bg-ink-400/40" style={{ width: `${90 - i * 9}%` }} />)}
            </div>
            <figcaption className="absolute inset-x-2 bottom-2 truncate bg-white/90 px-2 py-1 text-eyebrow text-fg-muted">
              <Icon name={k === "image" ? "camera" : "file"} size={11} aria-hidden className="mr-1 inline" />{href ? <a className="underline" href={href} target="_blank" rel="noopener">{fileName}</a> : fileName}
            </figcaption>
          </>
        )}
      </figure>
      <div className="grid content-start gap-3">
        <span className={cx("inline-flex w-fit items-center gap-1.5 px-3 py-1 text-eyebrow font-medium m-tone",
          both ? "bg-success-bg text-success" : candidate ? "bg-warning-bg text-warning" : "bg-ink-100 text-fg-muted")}>
          <Icon name={both ? "check" : candidate ? "zap" : "search"} size={12} aria-hidden />
          {both ? p.proofs.match : candidate ? p.proofs.partial : p.proofs.none}
        </span>
        <dl className="grid gap-1">
          <dt className="sr-only">{p.proofs.amount}</dt>
          <dd><Amount value={amount} size="xl" /></dd>
          {bankRef && <><dt className="sr-only">{p.proofs.ref}</dt><dd className="text-body text-fg-muted tabular">{bankRef}</dd></>}
        </dl>
        {candidate && (
          <div className="border border-border bg-surface p-3 text-small">
            <p className="mb-1 text-eyebrow text-fg-subtle">{p.proofs.candidate}</p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium tabular">{candidate.externalRef}</span>
              <Amount value={candidate.amount} size="sm" />
              <span className="text-fg-subtle tabular">{formatDateTime(candidate.at, locale)}</span>
            </p>
            <p className="mt-2 flex flex-wrap gap-2 text-eyebrow">
              <Check ok={candidate.exactAmount} yes={p.checker.exact} no={p.checker.amountOff} />
              <Check ok={candidate.refFound} yes={p.checker.refFound} no={p.checker.refMissing} />
            </p>
          </div>
        )}
        {action}
      </div>
    </div>
  );
}
function Check({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1", ok ? "text-success" : "text-warning")}>
      <Icon name={ok ? "check" : "x"} size={12} aria-hidden />{ok ? yes : no}
    </span>
  );
}

// ---------------------------------------------------------------- workbench rows
/** One statement line. Selectable; a line that just matched collapses out (m-out + m-collapse) in the "needs you" view. */
export function StatementLineRow({ line, selected, onSelect, leaving, actions }: {
  line: LineRow; selected?: boolean; onSelect?: () => void; leaving?: boolean; actions?: ReactNode;
}) {
  const r = useR();
  const { locale } = useI18n();
  const reason = line.reason && !line.reason.includes(":") ? line.reason : null;
  return (
    <li
      aria-current={selected || undefined}
      className={cx("grid grid-cols-1 gap-3 border bg-surface p-3 transition-colors md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center",
        selected ? "border-secondary ring-2 ring-focus/20" : "border-border", leaving && "m-out m-collapse")}
    >
      <button type="button" onClick={onSelect} className="grid min-w-0 gap-1 text-left">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-eyebrow text-fg-subtle tabular">{formatDateTime(line.occurredAt, locale)}</span>
          <MatchChip state={line.match} />
          {line.locked && <Icon name="lock" size={12} aria-label={r.bench.locked} className="text-link" />}
        </span>
        <span className="flex flex-wrap items-baseline gap-x-3">
          <Amount value={line.amount} size="lg" />
          <span className="truncate text-small text-fg-muted tabular">{line.externalRef}</span>
        </span>
        {(line.payer || reason || line.diff) && (
          <span className="flex flex-wrap gap-x-3 text-eyebrow text-fg-subtle">
            {line.payer && <span>{fill(r.bench.payer, { v: line.payer })}</span>}
            {reason && <span>{fill(r.bench.reason, { r: reason })}</span>}
            {!!line.diff && <span className="text-warning">{fill(r.link.diff, { amount: "" })}<Amount value={line.diff} sign="always" size="sm" /></span>}
          </span>
        )}
      </button>
      <span aria-hidden className={cx("hidden justify-self-center md:block", line.payment ? "text-success" : "text-fg-disabled")}>
        <Icon name={line.payment ? "check" : "arrowRight"} size={18} />
      </span>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 bg-ink-100/60 p-2.5">
        {line.payment ? (
          <span className="grid min-w-0 gap-0.5">
            <span className="truncate text-small font-medium">{line.payment.invoiceNo} · {line.payment.clientName}</span>
            <span className="flex items-center gap-2"><Amount value={line.payment.amount} size="sm" /><FinStatus status={line.payment.state} kind="payment" /></span>
          </span>
        ) : <span className="text-small text-fg-muted">{r.bench.noPlatform}</span>}
        {actions}
      </div>
      {line.by && <p className="text-eyebrow text-fg-subtle md:col-span-3">{fill(r.bench.matchedBy, { who: line.by.name, t: formatDateTime(line.by.at, locale) })}</p>}
    </li>
  );
}

/** Platform confirmed payment with no statement line in the import window (recon case 5). */
export function PlatformLineRow({ row, action }: { row: PlatformRow; action?: ReactNode }) {
  const { locale } = useI18n();
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border border-border bg-surface p-3">
      <span className="grid min-w-0 gap-0.5">
        <span className="text-eyebrow text-fg-subtle tabular">{formatDateTime(row.at, locale)}{row.ref ? ` · ${row.ref}` : ""}</span>
        <span className="truncate text-small font-medium">{row.invoiceNo} · {row.clientName}</span>
      </span>
      <span className="flex items-center gap-2"><Amount value={row.amount} /><FinStatus status={row.state} kind="payment" />{action}</span>
    </li>
  );
}

/** Desktop-only builders on phone (D11): read-only note + "Continue on desktop". */
export function DesktopOnly({ text }: { text: string }) {
  return (
    <p role="note" className="flex items-start gap-2 bg-info-bg p-3 text-small text-info md:hidden">
      <Icon name="laptop" size={16} aria-hidden className="mt-0.5 shrink-0" />{text}
    </p>
  );
}
