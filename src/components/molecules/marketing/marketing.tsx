"use client";
import { useMoney } from "@/components/atoms/hooks";
import { type ReactNode, useState } from "react";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatNumber, formatRelative } from "@/shared/format";
import { errorCopy } from "@/lib/api/error-copy";
import { mktCampaigns, fill } from "@/content/pages/mkt-campaigns";
import { type ExcludedReason, type BlockShape, type CmsEntry, type CmsType, type CmsVariant, type Locale, type MediaAsset, type PublishBlocker, type Staff, LOCALES } from "@/shared/marketing/types";
import { type Budget } from "@/lib/marketing/campaigns";
import { EmptyPanel, Panel, PanelError, ReasonDialog } from "@/components/molecules/ops/ops";
import { CostPill, useM } from "@/components/atoms/marketing";
import { useRouter } from "next/navigation";
import { mktContent } from "@/content/pages/mkt-content";
import { useCreateEntry } from "@/lib/marketing/content";
import { MKT_POLICY } from "@/shared/policy";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Field, Input, Select, DateInput } from "@/components/atoms/field";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { exportWithReason, type FunnelRow, type Range } from "@/lib/marketing/insights";
import { mktInsights } from "@/content/pages/mkt-insights";
import { useToast } from "@/components/atoms/toast";
import { useNow } from "@/components/atoms/agent";

// Lane CAMPAIGNS shared pieces: copy hook, consent exclusion card, cost/budget cards, progress ring, list states.
export const useC = () => mktCampaigns(useI18n().locale);
export { fill };
export function useErr() {
  const { locale } = useI18n();
  return (e: unknown) => errorCopy(e, locale);
}
export const useNum = () => {
  const { locale } = useI18n();
  return (n: number) => formatNumber(n, locale);
};

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return <div className="grid gap-2" aria-busy>{Array.from({ length: rows }, (_, i) => <div key={i} className="h-14 m-shimmer" />)}</div>;
}
/** Query wrapper: skeleton → error with retry → empty → content. */
export function QueryState({ q, empty, emptyAction, what, children }: { q: { isPending: boolean; isError: boolean; refetch: () => unknown }; empty?: string | false; emptyAction?: ReactNode; what: string; children: ReactNode }) {
  if (q.isPending) return <ListSkeleton />;
  if (q.isError) return <PanelError what={what} onRetry={() => q.refetch()} />;
  if (empty) return <EmptyPanel title={empty} action={emptyAction} />;
  return <>{children}</>;
}

/** Match → excluded by reason → eligible (plan §2.7). */
export function ConsentExclusionCard({ count, eligible, excluded, loading }: { count: number; eligible: number; excluded: Partial<Record<ExcludedReason, number>>; loading?: boolean }) {
  const c = useC();
  const n = useNum();
  const rows = (Object.entries(excluded) as [ExcludedReason, number][]).filter(([, v]) => v > 0);
  const total = rows.reduce((a, [, v]) => a + v, 0);
  return (
    <Panel title={c.card.exclusion}>
      <dl className={cx("grid grid-cols-3 gap-2 text-center", loading && "opacity-60")}>
        <div className="bg-bg-subtle p-2"><dt className="text-eyebrow text-fg-subtle">{c.seg.match}</dt><dd className="text-card-title tabular m-tick">{n(count)}</dd></div>
        <div className="bg-danger-bg p-2 text-danger"><dt className="text-eyebrow">{c.seg.excluded}</dt><dd className="text-card-title tabular m-tick">{n(total)}</dd></div>
        <div className="bg-success-bg p-2 text-success"><dt className="text-eyebrow">{c.seg.eligible}</dt><dd className="text-card-title tabular m-tick">{n(eligible)}</dd></div>
      </dl>
      {rows.length > 0 && (
        <details className="mt-3 text-small">
          <summary className="cursor-pointer text-fg-muted">{c.seg.whyExcluded}</summary>
          <ul className="mt-2 grid gap-1">{rows.map(([k, v]) => <li key={k} className="flex justify-between"><span>{c.seg.reasons[k]}</span><span className="tabular">{n(v)}</span></li>)}</ul>
        </details>
      )}
    </Panel>
  );
}

export function CostEstimate({ amount, unit }: { amount: number; unit: number }) {
  const c = useC();
  return <Panel title={c.card.estimate}><CostPill amount={amount} perUnit={unit} /></Panel>;
}

export function BudgetMeter({ budget }: { budget: Budget }) {
  const c = useC();
  const m = useMoney();
  const pct = (v: number) => `${Math.min(100, Math.round((v / budget.cap) * 100))}%`;
  return (
    <Panel title={c.card.budget}>
      <div role="img" aria-label={`${c.card.spent} ${m(budget.spent)}, ${c.card.thisCampaign} ${m(budget.estimate)}, ${c.card.cap} ${m(budget.cap)}`} className="relative h-3 overflow-hidden bg-ink-100">
        <span className="absolute inset-y-0 left-0 bg-secondary m-grow" style={{ width: pct(budget.spent) }} />
        <span className={cx("absolute inset-y-0 m-grow", budget.state === "block" ? "bg-danger" : budget.state === "warn" ? "bg-warning" : "bg-primary")} style={{ left: pct(budget.spent), width: pct(budget.estimate) }} />
      </div>
      <p className="mt-2 flex flex-wrap justify-between gap-2 text-eyebrow text-fg-muted tabular">
        <span>{c.card.spent} {m(budget.spent)}</span><span>{c.card.thisCampaign} {m(budget.estimate)}</span><span>{c.card.cap} {m(budget.cap)}</span>
      </p>
      {budget.state !== "ok" && <p role="status" className={cx("mt-2 text-small", budget.state === "block" ? "text-danger" : "text-warning")}>{budget.state === "block" ? c.card.block : c.card.warn}</p>}
    </Panel>
  );
}

/** Stroke ring; with reduced motion the global m-* rules make it static. */
export function ProgressRing({ pct, label }: { pct: number; label: string }) {
  const r = 34, C = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="size-20 -rotate-90" role="img" aria-label={label}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-ink-100)" strokeWidth="8" />
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-secondary)" strokeWidth="8" strokeLinecap="butt" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} className="transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none" />
    </svg>
  );
}

/** Consent dots for a sample row (text included). */
export function ConsentDots({ consent }: { consent: Record<string, string> }) {
  const m = useM();
  return (
    <span className="inline-flex gap-1.5">
      {Object.entries(consent).map(([ch, st]) => (
        <span key={ch} className={cx("px-1.5 text-[0.68rem]", st === "in" ? "bg-success-bg text-success" : st === "out" ? "bg-danger-bg text-danger" : "bg-ink-100 text-ink-700")}>
          {m.consent[ch]} {st === "in" ? "✓" : st === "out" ? "✗" : "?"}<span className="sr-only"> {m.consent[st]}</span>
        </span>
      ))}
    </span>
  );
}

/** Field render-prop ids → DOM props. */
export const fa = (a: { id: string; describedBy?: string; invalid: boolean }) => ({ id: a.id, "aria-describedby": a.describedBy, "aria-invalid": a.invalid || undefined });

// Lane CONTENT shared pieces: copy hook, per-type routes, rules (approver, local blockers), empty art, create dialog.
export const useCC = () => mktContent(useI18n().locale);

/** Where each type is edited in the workspace. */
export const editorBase = (type: CmsType) =>
  type === "landing_page" ? "/marketing/landing" : type === "guide" || type === "article" ? "/marketing/knowledge" : type === "regulatory_update" ? "/marketing/updates" : "/marketing/content";
/** Public path of a variant (null for types without a page). */
export function publicPath(type: CmsType, lang: Locale, slug?: string, key?: string) {
  if (type === "page") return key === "home" ? `/${lang}` : `/${lang}/${slug ?? key}`;
  if (!slug) return null;
  return type === "landing_page" ? `/${lang}/campaign/${slug}` // guides/articles: no public page
    : type === "regulatory_update" ? `/${lang}/updates/${slug}` : type === "faq" ? `/${lang}/faq` : null;
}

/** Approver matrix (§2.1): regulatory + service facts → SM only; legal → exec; else marketing or SM. Self-approval blocked where SM/exec is required. */
export function approverRule(entry: Pick<CmsEntry, "type" | "serviceFacts">, me: Staff | null, authorId?: string): { can: boolean; reason?: "needsSm" | "needsExec" | "selfApprove" } {
  const need = entry.type === "legal_doc" ? "executive" : entry.type === "regulatory_update" || entry.serviceFacts ? "service_manager" : null;
  if (!me) return { can: false, reason: "needsSm" };
  if (need === "executive" && me.role !== "executive") return { can: false, reason: "needsExec" };
  if (need === "service_manager" && me.role !== "service_manager") return { can: false, reason: "needsSm" };
  if (need && authorId === me.id) return { can: false, reason: "selfApprove" };
  return { can: me.role === "marketing" || me.role === "service_manager" || me.role === "executive" };
}

const words = (v: CmsVariant) => JSON.stringify(v.body).replace(/"[a-zA-Z_]+":/g, " ").split(/\s+/).filter((w) => /\w/.test(w)).length;
export const moneyIn = (text: string) => /\bRWF\s?\d|\d[\d,.\s]*\s?RWF\b|\bFrw\s?\d/i.test(text);
/** Client mirror of the server publish checklist so the editor can warn before a round trip. Server blockers win. */
export function localBlockers(entry: CmsEntry, lang: Locale, media: MediaAsset[] = []): PublishBlocker[] {
  const v = entry.variants[lang];
  if (!v) return [{ language: lang, code: "missing_variant", severity: "error" }];
  const out: PublishBlocker[] = [];
  const e = (code: string, field?: string, blockId?: string) => out.push({ language: lang, code, field, blockId, severity: "error" });
  const w = (code: string, field?: string, blockId?: string) => out.push({ language: lang, code, field, blockId, severity: "warning" });
  if (!v.title.trim()) e("title", "title");
  if (!v.slug.trim() && !(entry.type === "page" && entry.key === "home") && entry.type !== "faq") e("slug", "slug");
  if (!v.seo.title.trim() && entry.type !== "faq") e("seo_title", "seo.title");
  if (v.seo.title.length > 60) w("seo_title_long", "seo.title");
  if (v.seo.description.length > 160) w("seo_desc_long", "seo.description");
  if (v.needsReview) e("needs_review");
  for (const b of entry.blocks) {
    if (b.hidden) continue;
    const ids = b.type === "image" ? [b.props?.assetId] : b.type === "gallery" ? ((b.props?.assetIds as string[]) ?? []) : [];
    for (const id of ids) { const a = media.find((m) => m.id === id); if (a && !a.alt[lang]?.trim()) e("alt", undefined, b.id); }
    if (moneyIn(JSON.stringify(v.body[b.id] ?? ""))) w("money", undefined, b.id);
  }
  const reg = entry.meta.regulatory;
  if (entry.type === "regulatory_update") {
    if (!reg?.authority) e("authority");
    if (!reg?.sourceUrl?.startsWith("https://")) e("source_url");
    if (!entry.reviewBy) e("review_by");
  }
  if (entry.reviewBy && Date.parse(entry.reviewBy) > Date.parse(entry.createdAt) + MKT_POLICY.reviewByMaxMonths * 31 * 864e5 * 1.0) w("review_by_far");
  if ((entry.type === "article" || entry.type === "guide") && words(v) < 300) w("thin");
  return out;
}
export const coverageOf = (entry: CmsEntry) =>
  Object.fromEntries(LOCALES.map((l) => { const v = entry.variants[l]; return [l, !v ? "missing" : v.needsReview ? "needs_review" : "ok"]; })) as Record<Locale, "ok" | "missing" | "needs_review">;

export const newBlock = (type: BlockShape["type"]): BlockShape => ({ id: `b-${Math.random().toString(36).slice(2, 9)}`, type, props: type === "heading" ? { level: 2 } : type === "callout" ? { tone: "info" } : type === "cta" ? { variant: "primary", href: "/" } : type === "form" ? { form: "lead" } : {} });

// ---------------------------------------------------------------- empty art (§5.4, 2-colour tokens, aria-hidden)
export function ArtPages() {
  return <svg aria-hidden viewBox="0 0 120 90" className="h-20 w-auto text-navy-700"><rect x="30" y="18" width="50" height="62" rx="0" className="fill-navy-100" /><rect x="40" y="10" width="50" height="62" rx="0" fill="white" stroke="currentColor" strokeWidth="2" /><path d="M50 26h30M50 36h30M50 46h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}
export function ArtMedia() {
  return <svg aria-hidden viewBox="0 0 120 90" className="h-20 w-auto text-navy-700"><rect x="22" y="16" width="76" height="58" rx="0" className="fill-navy-100" /><path d="M30 64l18-20 14 14 10-10 18 16" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M60 46V22m-9 9l9-9 9 9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>;
}
export function Empty({ art, title, body, action }: { art: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="grid place-items-center gap-3 border border-dashed border-border-strong bg-grad-sky-wash px-6 py-12 text-center m-rise">
      {art}
      <p className="text-h3 text-fg-heading">{title}</p>
      {body && <p className="max-w-sm text-small text-fg-muted">{body}</p>}
      {action}
    </div>
  );
}

/** "{n} of 30 guides" progress (KN1). */
export function TargetMeter({ n, target = MKT_POLICY.guideTarget }: { n: number; target?: number }) {
  const c = useCC();
  const pct = Math.min(100, Math.round((n / target) * 100));
  return (
    <div className="grid gap-1.5 border border-border bg-surface p-4">
      <p className="flex items-baseline justify-between text-small"><span className="font-medium">{fill(c.target.label, { n, target })}</span><span className="tabular text-fg-subtle">{pct}%</span></p>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={target} aria-valuenow={n} aria-label={fill(c.target.label, { n, target })} className="h-2 overflow-hidden bg-ink-100">
        <div className="h-full origin-left bg-secondary m-grow" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-eyebrow text-fg-subtle">{c.target.hint}</p>
    </div>
  );
}

/** "New {type}" dialog → POST → open editor. */
export function CreateDialog({ type, open, onClose }: { type: CmsType; open: boolean; onClose: () => void }) {
  const c = useCC();
  const m = useM();
  const { locale } = useI18n();
  const router = useRouter();
  const create = useCreateEntry();
  const [title, setTitle] = useState("");
  const [lang, setLang] = useState<Locale>(locale);
  const [err, setErr] = useState<string | null>(null);
  const label = c.types[type].toLowerCase();
  return (
    <Dialog open={open} onClose={onClose} title={fill(c.create.title, { type: label })}
      footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>{m.common.cancel}</Button>
        <Button variant="primary" loading={create.isPending} disabled={!title.trim()} onClick={async () => {
          setErr(null);
          try { const e = await create.mutateAsync({ type, locale: lang, title: title.trim() }); router.push(localHref(locale, `${editorBase(type)}/${e.id}?locale=${lang}`)); }
          catch (x) { setErr(errorCopy(x, locale)); }
        }}>{c.create.go}</Button></div>}>
      <div className="grid gap-4">
        <Field label={c.create.name} hint={c.create.slugNote}>{(f) => <Input id={f.id} aria-describedby={f.describedBy} autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} />}</Field>
        <Field label={c.create.locale}>{(f) => <Select id={f.id} value={lang} onChange={(e) => setLang(e.target.value as Locale)}>{LOCALES.map((l) => <option key={l} value={l}>{m.locale[l]}</option>)}</Select>}</Field>
        {err && <p role="alert" className={cx("text-small text-danger m-shake")}>{err}</p>}
      </div>
    </Dialog>
  );
}

// Lane insights shared pieces: range/model in the URL, hand-made SVG charts (with table alternatives), export with reason.
export const useI = () => mktInsights(useI18n().locale);

const RANGES = ["today", "7d", "30d", "90d", "custom"] as const;
export function useRange(def = "30d"): Range {
  const p = useUrlParams();
  return { range: p.get("range") ?? def, from: p.get("from") ?? undefined, to: p.get("to") ?? undefined };
}
export function RangePicker({ value }: { value: Range }) {
  const t = useI();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div data-guide="marketing-range" role="group" aria-label={t.dash.range.label} className="flex flex-wrap border border-border bg-surface p-1">
        {RANGES.map((r) => (
          <button key={r} type="button" aria-pressed={value.range === r} onClick={() => setUrlParams({ range: r })}
            className={cx("h-8 px-3 text-small m-press", value.range === r ? "bg-secondary text-on-secondary" : "text-fg-muted hover:bg-ink-100 hover:text-fg")}>{t.dash.range[r]}</button>
        ))}
      </div>
      {value.range === "custom" && (
        <span className="flex items-center gap-2 text-small">
          <label className="sr-only" htmlFor="rf">{t.dash.range.from}</label>
          <DateInput id="rf" value={value.from ?? ""} onChange={(e) => setUrlParams({ from: e.target.value })} className="h-9 w-40" />
          <label className="sr-only" htmlFor="rt">{t.dash.range.to}</label>
          <DateInput id="rt" value={value.to ?? ""} onChange={(e) => setUrlParams({ to: e.target.value })} className="h-9 w-40" />
        </span>
      )}
    </div>
  );
}
export function ModelToggle({ value }: { value: string }) {
  const t = useI();
  return (
    <label className="flex items-center gap-2 text-small">
      <span className="text-fg-muted">{t.rep.model.label}</span>
      <Select value={value} onChange={(e) => setUrlParams({ model: e.target.value })} className="h-9 w-auto">
        <option value="last">{t.rep.model.last}</option>
        <option value="first">{t.rep.model.first}</option>
      </Select>
    </label>
  );
}
export function Updated({ at, onRefresh }: { at?: string; onRefresh: () => void }) {
  const t = useI();
  const { locale } = useI18n();
  const now = useNow();
  if (!at) return null;
  return (
    <p className="flex items-center gap-2 text-eyebrow text-fg-subtle">
      {fill(t.rep.updated, { t: formatRelative(at, locale, now ?? Date.parse(at)) })}
      <button type="button" onClick={onRefresh} className="underline underline-offset-4 hover:text-link">{t.rep.refresh}</button>
    </p>
  );
}

/** Chart + "Show as table" toggle (a11y alternative, §4). */
export function ChartFrame({ chart, table }: { chart: ReactNode; table: ReactNode }) {
  const m = useM();
  const [asTable, setAsTable] = useState(false);
  return (
    <div className="grid gap-2">
      <div className="flex justify-end"><button type="button" onClick={() => setAsTable((v) => !v)} className="text-eyebrow text-fg-muted underline underline-offset-4">{asTable ? m.common.showChart : m.common.showTable}</button></div>
      {asTable ? <div className="overflow-x-auto">{table}</div> : chart}
    </div>
  );
}
export function SimpleTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <table className="w-full text-left text-small">
      <thead className="text-fg-subtle"><tr>{head.map((h) => <th key={h} scope="col" className="py-2 pr-3 font-medium">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-border">{r.map((c, j) => <td key={j} className="py-2 pr-3 tabular">{c}</td>)}</tr>)}</tbody>
    </table>
  );
}

/** Five trapezoids, widths ∝ count (min 12 %), step % chips between, m-grow on mount. */
export function FunnelChart({ rows }: { rows: FunnelRow[] }) {
  const t = useI();
  const { locale } = useI18n();
  const max = Math.max(1, ...rows.map((r) => r.count));
  const w = (n: number) => Math.max(12, (n / max) * 100);
  const chart = (
    <ol className="grid gap-1.5">
      {rows.map((r, i) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="relative h-10">
            <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="h-10 m-grow" style={{ width: `${w(r.count)}%`, transformOrigin: "left" }} aria-hidden>
              <polygon points={`0,0 100,0 ${100 - Math.min(8, (w(rows[i + 1]?.count ?? r.count) < w(r.count) ? 8 : 0))},10 0,10`} fill={`var(--chart-${i + 1}, var(--color-navy-400))`} />
            </svg>
            <span className="absolute inset-y-0 left-3 flex items-center text-small font-medium">{t.dash.steps[r.key]}</span>
          </div>
          <span className="flex items-center gap-2 text-small tabular">
            <strong>{formatNumber(r.count, locale)}</strong>
            {r.stepPct != null && <span title={r.ofVisits != null ? fill(t.dash.ofVisits, { p: `${r.ofVisits}%` }) : undefined} className="bg-gold-100 px-2 py-0.5 text-eyebrow text-gold-800">{r.stepPct}%</span>}
          </span>
        </li>
      ))}
    </ol>
  );
  return (
    <ChartFrame chart={<>{chart}<p className="mt-2 text-eyebrow text-fg-subtle">{t.dash.stepNote}</p></>}
      table={<SimpleTable head={["", "#", "%", fill(t.dash.ofVisits, { p: "%" })]} rows={rows.map((r) => [t.dash.steps[r.key], formatNumber(r.count, locale), r.stepPct ?? "", r.ofVisits ?? ""])} />} />
  );
}

/** Horizontal labelled bars (≤ 6, then "Others" folded by caller). */
export function Bars({ items, max, format }: { items: { label: string; value: number }[]; max?: number; format?: (n: number) => string }) {
  const { locale } = useI18n();
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  const fmt = format ?? ((n: number) => formatNumber(n, locale));
  return (
    <ChartFrame
      chart={<ul className="grid gap-2 m-stagger">{items.map((it, i) => (
        <li key={it.label} style={{ ["--i" as string]: i }} className="grid grid-cols-[8rem_minmax(0,1fr)_auto] items-center gap-3 text-small">
          <span className="truncate" title={it.label}>{it.label}</span>
          <span className="h-3 overflow-hidden bg-ink-100"><span className="block h-full bg-secondary m-grow" style={{ width: `${(it.value / top) * 100}%`, transformOrigin: "left" }} /></span>
          <span className="tabular">{fmt(it.value)}</span>
        </li>
      ))}</ul>}
      table={<SimpleTable head={["", "#"]} rows={items.map((i) => [i.label, fmt(i.value)])} />} />
  );
}

export function Donut({ items, total, centre }: { items: { label: string; value: number }[]; total: number; centre: string }) {
  const C = 2 * Math.PI * 40;
  return (
    <ChartFrame
      chart={(
        <div className="flex flex-wrap items-center gap-6">
          <svg viewBox="0 0 100 100" className="size-36 -rotate-90" aria-hidden>
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-ink-100)" strokeWidth="14" />
            {items.map((it, i) => {
              const len = total ? (it.value / total) * C : 0;
              const acc = items.slice(0, i).reduce((n, x) => n + (total ? (x.value / total) * C : 0), 0);
              return <circle key={it.label} cx="50" cy="50" r="40" fill="none" stroke={`var(--chart-${i + 1}, var(--color-secondary))`} strokeWidth="14" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} />;
            })}
          </svg>
          <div className="grid gap-1 text-small">
            <strong className="text-h3 tabular">{centre}</strong>
            {items.map((it, i) => <span key={it.label} className="flex items-center gap-2"><span className="size-2.5 rounded-full" data-round style={{ background: `var(--chart-${i + 1}, var(--color-secondary))` }} aria-hidden />{it.label} · {total ? Math.round((it.value / total) * 100) : 0}%</span>)}
          </div>
        </div>
      )}
      table={<SimpleTable head={["", "#", "%"]} rows={items.map((i) => [i.label, i.value, total ? Math.round((i.value / total) * 100) : 0])} />} />
  );
}

/** Export: CSV downloads (UTF-8 BOM from the server); XLSX/PDF are queued. Reason is always asked and audited. */
export function ExportButton({ report, range, model = "last" }: { report: string; range: Range; model?: string }) {
  const t = useI();
  const { locale } = useI18n();
  const toast = useToast();
  const [format, setFormat] = useState<string | null>(null);
  return (
    <>
      <span className="inline-flex divide-x divide-border-strong border border-border-strong bg-surface">
        {(["csv", "xlsx", "pdf"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFormat(f)} className="h-9 px-3 text-small hover:bg-navy-50 m-press">
            {f === "csv" ? `${t.rep.export.label} ${t.rep.export.csv}` : t.rep.export[f]}
          </button>
        ))}
      </span>
      <ReasonDialog open={!!format} onClose={() => setFormat(null)} title={t.rep.export.title} description={t.rep.export.reasonT} audited
        options={Object.entries(t.rep.export.opts).map(([value, label]) => ({ value, label }))} notice={t.rep.export.audited} confirmLabel={t.rep.export.confirm}
        onConfirm={async ({ reason, note }) => {
          try {
            const res = await exportWithReason(report, format!, range, model, note ? `${reason}: ${note}` : reason);
            if (res.csv && res.filename) {
              const url = URL.createObjectURL(new Blob([res.csv], { type: "text/csv;charset=utf-8" }));
              const a = Object.assign(document.createElement("a"), { href: url, download: res.filename });
              a.click(); URL.revokeObjectURL(url);
              toast({ title: fill(t.rep.export.done, { f: res.filename }), tone: "success" });
            } else toast({ title: t.rep.export.queued });
            setFormat(null);
          } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
        }} />
    </>
  );
}

export function Skel({ className }: { className?: string }) {
  return <div aria-hidden className={cx("m-shimmer", className)} />;
}
export { Button };
