"use client";
// U10 Reconciliation home (board 07 RC1 + RC5 + PR1): provider cards, 7-day strip for the selected provider (state of the
// selected day, not the month), close/reopen day + month (reopen: reason + step-up, alt "post adjustment"), imports table,
// Run verify now. Phone: summary + "Open on desktop" (D11).
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { useShortcut } from "@/lib/ops/shortcuts";
import { cx, formatDate, formatDateTime } from "@/shared/format";
import { api, newIdempotencyKey, unwrap } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { useFinAction, useReconOverview, type DayCell, type ImportRow, type ReconOverview } from "@/lib/finance/c";
import type { Provider } from "@/shared/finance/types";
import { Icon } from "@/components/atoms/icon";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Textarea } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { PageHead, SkeletonRows } from "@/components/atoms/agent";
import { Amount, LockChip, MatchChip, useF } from "@/components/atoms/finance";
import { NoAccess, useStepUpAction } from "@/components/molecules/finance/finance";
import { ArtNoImports, ArtReconciled } from "@/components/atoms/finance-art";
import { fill, useMoneyGuard, useR } from "@/components/molecules/finance/finance";
import { isForbidden } from "@/components/atoms/hooks";
import { hdr } from "@/lib/finance/api";

const PROVIDERS: Provider[] = ["mtn_momo", "airtel_money", "card", "bank"];

export function ReconHome() {
  const r = useR();
  const { locale } = useI18n();
  const url = useUrlParams();
  const toast = useToast();
  const router = useRouter();
  const guard = useMoneyGuard();
  const provider = (PROVIDERS.includes(url.get("provider") as Provider) ? url.get("provider") : "mtn_momo") as Provider;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(url.get("date") ?? "") ? url.get("date")! : "";
  const q = useReconOverview(provider, date);
  const [dialog, setDialog] = useState<null | { kind: "close" | "reopen"; scope: "day" | "month" }>(null);
  const [adjust, setAdjust] = useState(false);
  const verify = useFinAction(() => unwrap<{ confirmed: number }>(api.POST("/api/finance/x/recon/verify-pending", { body: { provider }, headers: hdr({ idempotencyKey: newIdempotencyKey() }) })));
  useShortcut("i", r.shortcuts.import, () => router.push(localHref(locale, `/finance/reconciliation/import?provider=${provider}`)), "list");

  if (isForbidden(q.error)) return <NoAccess />;
  const d = q.data;
  const sel = d?.selected;
  const dayText = sel ? formatDate(sel.day, locale, { weekday: "short", day: "numeric", month: "short" }) : "";

  return (
    <div className="grid gap-6">
      <PageHead title={r.title} sub={r.sub} actions={<>
        <Button variant="outline" loading={verify.isPending} disabled={!guard.can} className="m-press" onClick={async () => {
          try { const x = await verify.mutateAsync(undefined); toast({ title: x.confirmed ? fill(r.home.verified, { n: x.confirmed }) : r.home.verifiedNone, tone: x.confirmed ? "success" : "info" }); }
          catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
        }}><Icon name="refresh" size={16} aria-hidden />{r.home.verify}</Button>
        <ButtonLink href={localHref(locale, `/finance/reconciliation/import?provider=${provider}`)} dots className="m-press hidden md:inline-flex">{r.home.import}</ButtonLink>
      </>} />

      {/* Provider cards (RC1) */}
      {q.isPending ? <SkeletonRows n={2} /> : q.error ? <PanelError what={r.home.err} onRetry={() => q.refetch()} /> : d && (
        <>
          <ul className="grid gap-3 m-stagger sm:grid-cols-2 xl:grid-cols-4">
            {d.providers.map((c) => (
              <li key={c.provider}>
                <button type="button" aria-pressed={c.provider === provider} onClick={() => setUrlParams({ provider: c.provider })}
                  className={cx("m-lift grid h-full w-full gap-2 border p-4 text-left", c.provider === provider ? "border-secondary bg-navy-50" : "border-border bg-white")}>
                  <span className="text-card-title">{r.providers[c.provider]}</span>
                  <span className="text-eyebrow text-fg-subtle">{c.lastImport ? fill(r.home.lastImport, { t: formatDateTime(c.lastImport.at, locale), who: c.lastImport.by }) : r.home.never}</span>
                  {c.pct != null && (
                    <span className="grid gap-1">
                      <span key={c.pct} className="text-label m-rise tabular">{fill(r.home.matched, { pct: c.pct })}</span>
                      <span aria-hidden className="h-1.5 overflow-hidden bg-ink-100"><span className="block h-full origin-left bg-success m-grow" style={{ width: `${c.pct}%` }} /></span>
                    </span>
                  )}
                  <span className={cx("flex items-center gap-1.5 text-small", c.needs ? "text-danger" : "text-success")}>
                    <Icon name={c.needs ? "search" : "check"} size={14} aria-hidden />{c.needs ? fill(r.home.needs, { n: c.needs }) : r.home.none}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* Day strip + month lock */}
          <section aria-label={r.home.days} className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-label">{r.home.days} · {r.providers[provider]}</h2>
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-small text-fg-muted">{fill(r.home.month, { m: d.month.month })}</span>
                <LockChip scope="month" state={d.month.state} />
                {d.month.state === "closed"
                  ? <Button size="sm" variant="ghost" disabled={!guard.can} onClick={() => setDialog({ kind: "reopen", scope: "month" })}>{r.home.reopenMonth}</Button>
                  : <Button size="sm" variant="ghost" disabled={!guard.can || d.month.blockers > 0} title={d.month.blockers ? fill(r.home.monthBlockers, { n: d.month.blockers }) : undefined} onClick={() => setDialog({ kind: "close", scope: "month" })}>{r.home.closeMonth}</Button>}
              </span>
            </div>
            <ol className="no-scrollbar -mx-gutter flex gap-2 overflow-x-auto px-gutter sm:mx-0 sm:grid sm:grid-cols-7 sm:px-0">
              {d.days.map((c) => <DayButton key={c.day} c={c} active={c.day === sel?.day} />)}
            </ol>
          </section>

          {/* Selected day */}
          {sel && <SelectedDay d={d} dayText={dayText} onClose={() => setDialog({ kind: "close", scope: "day" })} onReopen={() => setDialog({ kind: "reopen", scope: "day" })} />}

          {/* Imports */}
          <ImportsTable rows={d.imports} />
        </>
      )}


      {d && dialog && (
        <PeriodDialog d={d} kind={dialog.kind} scope={dialog.scope} dayText={dayText} onClose={() => setDialog(null)}
          onAdjust={() => { setDialog(null); setAdjust(true); }} />
      )}
      <Dialog open={adjust} onClose={() => setAdjust(false)} title={r.adjust.title} footer={<Button onClick={() => setAdjust(false)}>{r.adjust.ok}</Button>}>
        <p className="text-body text-fg-muted">{r.adjust.body}</p>
      </Dialog>
    </div>
  );
}

function DayButton({ c, active }: { c: DayCell; active: boolean }) {
  const r = useR();
  const { locale } = useI18n();
  const state = c.lock === "closed" ? r.home.dayLocked : !c.lines ? r.home.dayEmpty : c.needs ? fill(r.home.dayNeeds, { n: c.needs }) : r.home.dayOk;
  return (
    <li className="min-w-[5.5rem] shrink-0">
      <button type="button" aria-current={active ? "date" : undefined} aria-label={fill(r.home.dayLabel, { day: formatDate(c.day, locale, { weekday: "long", day: "numeric", month: "long" }), state })}
        onClick={() => setUrlParams({ date: c.day })}
        className={cx("m-press grid w-full place-items-center gap-1 border px-2 py-2.5 text-center",
          active ? "border-transparent bg-secondary text-on-navy" : "border-border bg-white hover:bg-navy-50")}>
        <span className="text-eyebrow text-fg-muted">{formatDate(c.day, locale, { weekday: "short" })}</span>
        <span className="text-small font-medium tabular">{formatDate(c.day, locale, { day: "numeric", month: "short" })}</span>
        <span aria-hidden className="flex h-4 items-center gap-1 text-eyebrow">
          {c.lock === "closed" ? <Icon name="lock" size={12} className="text-navy-600" /> : !c.lines ? <span className="text-fg-subtle">—</span>
            : c.needs ? <><span className="size-2 rounded-full bg-danger" /><span className="tabular">{c.needs}</span></> : <Icon name="check" size={12} className="text-success" />}
        </span>
      </button>
    </li>
  );
}

function SelectedDay({ d, dayText, onClose, onReopen }: { d: ReconOverview; dayText: string; onClose: () => void; onReopen: () => void }) {
  const r = useR();
  const { locale } = useI18n();
  const guard = useMoneyGuard();
  const s = d.selected;
  const bench = s.importId ? localHref(locale, `/finance/reconciliation/${s.importId}?date=${s.day}`) : null;
  return (
    <section aria-label={fill(r.home.selected, { day: dayText, provider: r.providers[s.provider] })} className="grid gap-4 border border-border bg-white p-4 sm:p-5 lg:grid-cols-[1fr_minmax(0,20rem)]">
      <div className="grid content-start gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-card-title">{fill(r.home.selected, { day: dayText, provider: r.providers[s.provider] })}</h2>
          <LockChip scope="day" state={s.lock} />
        </div>
        {!s.lines ? (
          <EmptyPanel compact title={r.home.noLines} body={r.home.noLinesBody} action={<span className="text-navy-600"><ArtNoImports /></span>} />
        ) : !s.needs ? (
          <div className="flex flex-wrap items-center gap-4 bg-success-bg/60 p-4 m-rise">
            <span className="text-success"><ArtReconciled /></span>
            <div className="grid gap-1">
              <p className="text-label">{fill(r.home.allClear, { day: dayText })}</p>
              <p className="text-small text-fg-muted">{r.home.allClearBody}</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            <p className="text-label">{r.home.blockers}</p>
            <ul className="grid gap-1.5 m-stagger">
              {s.blockers.slice(0, 8).map((b) => (
                <li key={b.lineId}>
                  <Link href={localHref(locale, `/finance/reconciliation/${b.importId}?line=${b.lineId}`)} className="flex flex-wrap items-center justify-between gap-2 border border-border px-3 py-2 text-small hover:bg-navy-50">
                    <span className="tabular">{b.ref}</span><MatchChip state={b.match} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="grid content-start gap-3 bg-bg-subtle p-4">
        <p className="text-small text-fg-muted">{fill(r.home.lines, { n: s.lines })}</p>
        <p className="grid gap-0.5"><span className="text-eyebrow text-fg-subtle">{r.home.difference}</span><Amount key={s.difference} value={s.difference} size="xl" className="m-rise" /></p>
        <div className="hidden flex-wrap gap-2 md:flex">
          {bench && <ButtonLink href={bench} variant="outline" size="sm" className="m-press">{r.home.open}</ButtonLink>}
          {s.lock === "closed"
            ? <Button size="sm" variant="secondary" disabled={!guard.can} onClick={onReopen}>{r.home.reopen}</Button>
            : <Button size="sm" dots disabled={!guard.can || !s.lines || s.needs > 0} title={s.needs ? fill(r.close.blocked, { n: s.needs }) : undefined} onClick={onClose} className="m-press">{r.home.close}</Button>}
        </div>
        <p className="flex items-start gap-2 text-small text-fg-muted md:hidden"><Icon name="laptop" size={14} aria-hidden className="mt-0.5" />{r.home.phone} {r.home.openDesktop}.</p>
      </div>
    </section>
  );
}

function ImportsTable({ rows }: { rows: ImportRow[] }) {
  const r = useR();
  const { locale } = useI18n();
  const router = useRouter();
  const cols: OpsColumn<ImportRow>[] = [
    { key: "at", label: r.home.importCols.at, cell: (x) => <span className="tabular">{formatDateTime(x.at, locale)}</span>, sort: (x) => x.at },
    { key: "file", label: r.home.importCols.file, cell: (x) => <span className="block max-w-56 truncate">{x.fileName || x.id}</span> },
    { key: "period", label: r.home.importCols.period, cell: (x) => <span className="tabular">{x.from === x.to ? x.from : `${x.from} → ${x.to}`}</span> },
    { key: "rows", label: r.home.importCols.rows, align: "right", cell: (x) => <span className="tabular">{x.rows}</span> },
    { key: "matched", label: r.home.importCols.matched, align: "right", cell: (x) => <span className="tabular">{x.counts.matched}</span> },
    { key: "needs", label: r.home.importCols.needs, align: "right", cell: (x) => {
      const n = x.counts.unmatched + x.counts.suggested + x.counts.duplicate;
      return <span className={cx("tabular", n ? "font-medium text-danger" : "text-fg-subtle")}>{n}</span>;
    } },
    { key: "by", label: r.home.importCols.by, cell: (x) => x.importedBy.name, card: false },
  ];
  return (
    <section aria-label={r.home.importsLabel} className="grid gap-3">
      <h2 className="text-label">{r.home.imports}</h2>
      <OpsTable rows={rows} columns={cols} rowKey={(x) => x.id} label={r.home.importsLabel} rowLabel={(x) => x.fileName || x.id}
        onOpen={(x) => router.push(localHref(locale, `/finance/reconciliation/${x.id}`))}
        empty={<EmptyPanel title={r.home.emptyImports[0]} body={r.home.emptyImports[1]} action={<span className="text-navy-600"><ArtNoImports /></span>} />} />
    </section>
  );
}

// ---------------------------------------------------------------- Close / Reopen (RC5)
function PeriodDialog({ d, kind, scope, dayText, onClose, onAdjust }: {
  d: ReconOverview; kind: "close" | "reopen"; scope: "day" | "month"; dayText: string; onClose: () => void; onAdjust: () => void;
}) {
  const r = useR();
  const f = useF();
  const { locale } = useI18n();
  const toast = useToast();
  const stepUp = useStepUpAction();
  const [key] = useState(newIdempotencyKey);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const s = d.selected;
  const period = scope === "month" ? d.month.month : s.day;
  const label = scope === "month" ? d.month.month : dayText;
  const scopeText = `${f.lock[scope].toLowerCase()} ${label}`;
  const act = useFinAction((token: string | undefined) =>
    unwrap<ReconOverview>(api.POST(`/api/finance/periods/{provider}/{day}/${kind}`, { params: { path: { provider: s.provider, day: period } }, body: kind === "reopen" ? { reason } : {}, headers: hdr({ idempotencyKey: key, stepUp: token, reason: kind === "reopen" ? reason : undefined }) })));

  async function go() {
    setErr(null);
    if (kind === "reopen" && !reason.trim()) return setErr(r.reopen.required);
    try {
      const out = kind === "reopen" ? await stepUp.run(fill(r.reopen.stepUp, { p: label }), (t) => act.mutateAsync(t)) : await act.mutateAsync(undefined);
      if (!out) return;
      toast({ title: fill(kind === "close" ? r.close.done : r.reopen.done, { p: label }), tone: "success" });
      onClose();
    } catch (e) { setErr(errorCopy(e, locale)); }
  }

  const blockers = scope === "month" ? d.month.blockers : s.needs;
  return (
    <Dialog open onClose={onClose} title={fill(kind === "close" ? r.close.title : r.reopen.title, { scope: scopeText })}
      footer={<>
        <Button variant="outline" onClick={onClose}>{r.wizard.cancel}</Button>
        <Button dots loading={act.isPending} disabled={kind === "close" && blockers > 0} onClick={go} className="m-press">{kind === "close" ? r.close.confirm : r.reopen.confirm}</Button>
      </>}>
      {kind === "close" ? (
        <div className="grid gap-4">
          <ul className="grid gap-2 m-stagger">
            {[
              { ok: !blockers, text: blockers ? fill(r.close.blocked, { n: blockers }) : r.close.checks.matched },
              { ok: scope === "month" || s.difference === 0, text: fill(r.close.checks.difference, { amount: "" }), amount: s.difference },
              { ok: true, text: fill(r.close.checks.period, { p: label }) },
            ].map((c, i) => (
              <li key={i} className="flex items-center gap-2 text-body">
                <span className={cx("flex size-6 items-center justify-center rounded-full m-tick", c.ok ? "bg-success text-white" : "bg-danger-bg text-danger")}><Icon name={c.ok ? "check" : "x"} size={14} aria-hidden /></span>
                {c.text}{c.amount != null && scope === "day" && <Amount value={c.amount} />}
              </li>
            ))}
          </ul>
          <p className="flex items-start gap-3 bg-bg-tint p-3 text-small"><Icon name="lock" size={20} aria-hidden className="shrink-0 text-navy-600" />{r.close.body}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <Field label={r.reopen.reason} hint={r.reopen.reasonHint} error={err === r.reopen.required ? err : undefined}>
            {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} aria-invalid={invalid} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Field>
          <p className="text-small text-fg-muted">{r.reopen.body}</p>
          <p className="flex flex-wrap items-center gap-2 bg-bg-subtle p-3 text-small">{r.reopen.alt}
            <button type="button" onClick={onAdjust} className="font-medium underline underline-offset-4">{r.reopen.altAction}</button></p>
        </div>
      )}
      {err && err !== r.reopen.required && <p role="alert" className="mt-3 bg-danger-bg p-3 text-small text-danger">{err}</p>}
      {stepUp.dialog}
    </Dialog>
  );
}
