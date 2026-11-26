"use client";
// U10 Matching workbench (board 07 RC3 + RC4): statement lines ⇄ platform, totals + difference from the API (computed from
// unmatched sums — fixes RC3's "RWF 0 while 3 unmatched"), per-line resolve actions, bulk accept, platform-side list,
// LinkDialog with difference handling. Keys: J/K move, M accept/link, I flag, X ignore. Phone: read-only (D11).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { useShortcut } from "@/lib/ops/shortcuts";
import { cx, formatDateTime } from "@/shared/format";
import { api, newIdempotencyKey, unwrap } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { useFinAction, useImportDetail, useLineCandidates, type ImportDetail, type LineRow } from "@/lib/finance/c";
import type { Method, Provider } from "@/shared/finance/types";
import { Icon } from "@/components/atoms/icon";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Radio, Select, Textarea } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { EmptyPanel, MenuButton, PanelError, ReasonDialog } from "@/components/molecules/ops/ops";
import { Kbd, LockLabel } from "@/components/atoms/ops";
import { PageHead, SkeletonRows } from "@/components/atoms/agent";
import { Amount, FinStatus, LockChip } from "@/components/atoms/finance";
import { ConflictDialog, NoAccess } from "@/components/molecules/finance/finance";
import { ArtReconciled } from "@/components/atoms/finance-art";
import { ManualConfirmForm, type ManualPrefill } from "@/components/organisms/finance/manual-confirm";
import { PaymentDrawer } from "@/components/organisms/finance/payment-drawer";
import { DesktopOnly, PlatformLineRow, StatementLineRow, fill, useConflict, useMoneyGuard, useR } from "@/components/molecules/finance/finance";
import { isForbidden } from "@/components/atoms/hooks";
import { hdr } from "@/lib/finance/api";

const VIEWS = ["needs", "all", "matched", "suggested", "exception", "ignored"] as const;
type View = (typeof VIEWS)[number];
const NEEDS = (l: LineRow) => l.match === "unmatched" || l.match === "suggested" || l.match === "duplicate" || (l.match === "exception" && !l.reason);
const METHOD_OF: Record<Provider, Method> = { mtn_momo: "mtn_momo", airtel_money: "airtel_money", card: "card", bank: "bank_transfer" };
type Act = "link" | "ignore" | "flag" | "fee" | "create";

export function MatchWorkbench({ importId }: { importId: string }) {
  const r = useR();
  const { locale } = useI18n();
  const url = useUrlParams();
  const router = useRouter();
  const toast = useToast();
  const guard = useMoneyGuard();
  const conflict = useConflict();
  const q = useImportDetail(importId);
  const view = (VIEWS.includes(url.get("view") as View) ? url.get("view") : "needs") as View;
  const side = url.get("side") === "platform" ? "platform" : "statement";
  const lineId = url.get("line");
  const [act, setAct] = useState<{ kind: Act; line: LineRow } | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [payment, setPayment] = useState<string | null>(null);
  const [key, setKey] = useState(newIdempotencyKey);
  const lineAction = useFinAction((v: { id: string; action: string; body: object }) =>
    unwrap<{ line: LineRow; refundNo?: string }>(api.POST("/api/finance/statements/lines/{id}/{action}", { params: { path: { id: v.id, action: v.action } }, body: v.body, headers: hdr({ idempotencyKey: key }) })));
  const bulk = useFinAction((ids: string[]) => unwrap<{ done: number; skipped: number }>(api.POST("/api/finance/statements/lines/bulk-accept", { body: { ids }, headers: hdr({ idempotencyKey: key }) })));

  const d = q.data;
  const lines = (d?.lines ?? []).filter((l) => (view === "all" ? true : view === "needs" ? NEEDS(l) || l.id === leaving : l.match === view));
  const sel = lines.find((l) => l.id === lineId) ?? null;
  const idx = sel ? lines.indexOf(sel) : -1;
  const move = (n: number) => { const x = lines[Math.min(lines.length - 1, Math.max(0, idx + n))]; if (x) setUrlParams({ line: x.id }); };
  const suggested = (d?.lines ?? []).filter((l) => l.match === "suggested" && !l.locked);
  const editable = guard.can;

  async function resolved(id: string, msg: string) {
    setKey(newIdempotencyKey());
    if (view === "needs") setLeaving(id);
    toast({ title: msg, tone: "success" });
    await q.refetch();
    setLeaving(null);
  }
  async function quick(l: LineRow, action: string, body: object, msg: string) {
    try {
      const out = await lineAction.mutateAsync({ id: l.id, action, body: { rev: l.rev, ...body } });
      if (out.refundNo) {
        setKey(newIdempotencyKey());
        toast({ title: fill(r.refund.done, { no: out.refundNo }), tone: "success", action: { label: r.refund.open, onClick: () => router.push(localHref(locale, `/finance/refunds/${out.refundNo}`)) } });
        await q.refetch();
      } else await resolved(l.id, msg);
    } catch (e) { if (!conflict.take(e)) toast({ title: errorCopy(e, locale), tone: "danger" }); }
  }
  const accept = (l: LineRow) => l.suggestionId && quick(l, "match", { paymentId: l.suggestionId, handling: "none" }, r.link.done);
  const primary = (l: LineRow) => {
    if (!editable || l.locked) return;
    if (l.match === "suggested" && !l.diff) accept(l);
    else if (l.match !== "matched" && l.match !== "ignored" && l.match !== "duplicate") setAct({ kind: "link", line: l });
  };

  useShortcut("j", r.bench.lineLabel, () => move(1), "list");
  useShortcut("k", r.bench.lineLabel, () => move(-1), "list");
  useShortcut("m", r.shortcuts.match, () => sel && primary(sel), "list");
  useShortcut("i", r.shortcuts.investigate, () => sel && editable && !sel.locked && setAct({ kind: "flag", line: sel }), "list");
  useShortcut("x", r.shortcuts.ignore, () => sel && editable && !sel.locked && setAct({ kind: "ignore", line: sel }), "list");

  if (isForbidden(q.error)) return <NoAccess />;
  const provider = d?.import.provider;
  const anyLocked = !!d?.lines.some((l) => l.locked);
  const needs = d ? d.lines.filter(NEEDS).length : 0;

  return (
    <div className="grid gap-5">
      <PageHead
        back={<ButtonLink href={localHref(locale, `/finance/reconciliation${provider ? `?provider=${provider}` : ""}`)} variant="ghost" size="sm" className="-ml-3 mb-1"><Icon name="arrowRight" size={14} className="rotate-180" aria-hidden />{r.bench.back}</ButtonLink>}
        title={r.workbenchTitle}
        sub={d ? `${r.providers[d.import.provider]} · ${d.import.fileName || d.import.id} · ${d.import.from === d.import.to ? d.import.from : `${d.import.from} → ${d.import.to}`}` : undefined}
        actions={d && <>
          {anyLocked && <LockChip scope="day" state="closed" />}
          {!!suggested.length && (
            <Button variant="secondary" size="sm" disabled={!editable} loading={bulk.isPending} className="m-press hidden md:inline-flex" onClick={async () => {
              try { const x = await bulk.mutateAsync(suggested.map((l) => l.id)); setKey(newIdempotencyKey()); toast({ title: fill(r.bench.bulkDone, { n: x.done, m: x.skipped }), tone: "success" }); q.refetch(); }
              catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
            }}><Icon name="sparkle" size={14} aria-hidden />{fill(r.bench.bulk, { n: suggested.length })}</Button>
          )}
        </>}
      />
      <DesktopOnly text={r.bench.phone} />

      {q.isPending ? <SkeletonRows n={6} /> : q.error ? <PanelError what={r.bench.err} onRetry={() => q.refetch()} /> : !d ? <EmptyPanel title={r.bench.notFound} /> : (
        <>
          <Totals d={d} />
          {anyLocked && <p className="flex items-center gap-2 text-small text-fg-muted"><LockLabel />{r.bench.locked}</p>}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div role="toolbar" aria-label={r.bench.lineLabel} className="no-scrollbar -mx-gutter flex gap-1.5 overflow-x-auto px-gutter sm:mx-0 sm:px-0">
              {VIEWS.map((v) => (
                <button key={v} type="button" aria-pressed={v === view} onClick={() => setUrlParams({ view: v === "needs" ? null : v })}
                  className={cx("inline-flex h-8 shrink-0 items-center gap-1.5 px-3 text-small", v === view ? "bg-secondary text-on-navy" : "bg-bg-subtle hover:bg-border-strong")}>
                  {r.bench.filter[v]}
                  {v === "needs" && <span className="tabular">{needs}</span>}
                </button>
              ))}
            </div>
            <p className="hidden items-center gap-3 text-eyebrow text-fg-subtle lg:flex">
              <span><Kbd>M</Kbd> {r.bench.keys.match}</span><span><Kbd>I</Kbd> {r.bench.keys.investigate}</span><span><Kbd>⌘K</Kbd> {r.bench.keys.search}</span>
            </p>
          </div>

          {/* Narrow screens: one side at a time (?side=); lg: both. */}
          <div role="tablist" aria-label={r.workbenchTitle} className="flex gap-1 bg-ink-100 p-1 lg:hidden">
            {(["statement", "platform"] as const).map((s) => (
              <button key={s} role="tab" type="button" aria-selected={side === s} onClick={() => setUrlParams({ side: s === "statement" ? null : s })}
                className={cx("h-9 flex-1 text-small", side === s ? "bg-white font-medium shadow-sm" : "text-fg-muted")}>
                {s === "statement" ? fill(r.bench.statement, { provider: r.providers[d.import.provider] }) : r.bench.platform} · <span className="tabular">{s === "statement" ? needs : d.platform.length}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <section aria-label={r.bench.lineLabel} className={cx("min-w-0", side !== "statement" && "hidden lg:block")}>
              <h2 className="mb-2 hidden items-center gap-2 text-label lg:flex">
                <span className="bg-gold-100 text-gold-800 px-3 py-1">{fill(r.bench.statement, { provider: r.providers[d.import.provider] })}, {fill(r.bench.unmatchedN, { n: needs })}</span>
              </h2>
              {!lines.length ? (
                view === "needs"
                  ? <EmptyPanel title={r.bench.emptyNeeds[0]} body={r.bench.emptyNeeds[1]} action={<span className="text-success"><ArtReconciled /></span>} />
                  : <EmptyPanel compact title={r.bench.emptyFilter[0]} body={r.bench.emptyFilter[1]} />
              ) : (
                <ul className="grid gap-2">
                  {lines.slice(0, view === "all" || view === "matched" ? 60 : undefined).map((l) => (
                    <StatementLineRow key={l.id} line={l} selected={l.id === lineId} leaving={l.id === leaving}
                      onSelect={() => setUrlParams({ line: l.id })}
                      actions={<LineActions l={l} disabled={!editable || l.locked || lineAction.isPending}
                        onAccept={() => accept(l)} onAct={(kind) => setAct({ kind, line: l })}
                        onRefund={() => quick(l, "refund-proposal", {}, "")} onOpen={(id) => setPayment(id)} />} />
                  ))}
                </ul>
              )}
            </section>
            <section aria-label={r.bench.platformLabel} className={cx("grid min-w-0 content-start gap-2", side !== "platform" && "hidden lg:grid")}>
              <h2 className="mb-0 hidden text-label lg:block"><span className="bg-navy-50 px-3 py-1 text-navy-800">{r.bench.platform}, {fill(r.bench.platformN, { n: d.platform.length })}</span></h2>
              <p className="text-eyebrow text-fg-subtle">{r.bench.platformHint}</p>
              {!d.platform.length ? <EmptyPanel compact title={r.bench.platformEmpty} /> : (
                <ul className="grid gap-2">
                  {d.platform.map((p) => <PlatformLineRow key={p.id} row={p} action={<Button size="sm" variant="ghost" onClick={() => setPayment(p.id)}>{r.bench.actions.open}</Button>} />)}
                </ul>
              )}
            </section>
          </div>
        </>
      )}


      {act?.kind === "link" && <LinkDialog line={act.line} onClose={() => setAct(null)} onDone={() => { const id = act.line.id; setAct(null); resolved(id, r.link.done); }} onConflict={conflict.take} />}
      <ReasonDialog open={act?.kind === "ignore"} onClose={() => setAct(null)} title={r.ignore.title} description={r.ignore.body} audited
        options={Object.entries(r.ignore.reasons).map(([value, label]) => ({ value, label }))} confirmLabel={r.ignore.confirm} noteLabel={r.link.note}
        onConfirm={async (v) => {
          const l = act!.line;
          try { await lineAction.mutateAsync({ id: l.id, action: "ignore", body: { rev: l.rev, reason: r.ignore.reasons[v.reason] ?? v.reason, note: v.note } }); }
          catch (e) { if (conflict.take(e)) return; throw e; }
          await resolved(l.id, r.ignore.done);
        }} />
      {act?.kind === "flag" && <FlagDialog line={act.line} onClose={() => setAct(null)} onSubmit={async (note) => {
        const l = act.line; setAct(null); await quick(l, "flag", { note }, r.flag.done);
      }} />}
      {act?.kind === "fee" && (
        <Dialog open onClose={() => setAct(null)} title={r.fee.title} footer={<>
          <Button variant="outline" onClick={() => setAct(null)}>{r.link.cancel}</Button>
          <Button dots className="m-press" onClick={async () => { const l = act.line; setAct(null); await quick(l, "fee", {}, r.fee.done); }}>{r.fee.confirm}</Button>
        </>}>
          <p className="text-body">{fill(r.fee.body, { amount: "" })}<Amount value={act.line.amount} /></p>
        </Dialog>
      )}
      <ManualConfirmForm open={act?.kind === "create"} onClose={() => setAct(null)}
        prefill={act?.kind === "create" && provider ? {
          amount: act.line.amount, bankReference: act.line.externalRef, receivedAt: act.line.occurredAt, lineId: act.line.id, method: METHOD_OF[provider],
        } satisfies ManualPrefill : undefined}
        onDone={(id) => { const l = act?.line; setAct(null); setPayment(id); if (l) resolved(l.id, r.link.done); }} />
      <PaymentDrawer id={payment} onClose={() => setPayment(null)} />
      <ConflictDialog open={!!conflict.conflict} who={sel?.by?.name ?? ""} when={conflict.conflict?.at ?? new Date(0).toISOString()}
        onClose={conflict.clear} onRefresh={() => { conflict.clear(); setKey(newIdempotencyKey()); q.refetch(); }} />
    </div>
  );
}

function Totals({ d }: { d: ImportDetail }) {
  const r = useR();
  const t = d.totals;
  return (
    <dl className="grid gap-3 border border-border bg-white p-4 sm:grid-cols-3">
      <div className="grid gap-0.5"><dt className="text-eyebrow text-fg-subtle">{r.bench.totals.statement}</dt><dd><Amount value={t.statement} size="lg" /></dd></div>
      <div className="grid gap-0.5"><dt className="text-eyebrow text-fg-subtle">{r.bench.totals.platform}</dt><dd><Amount value={t.platform} size="lg" /></dd></div>
      <div className="grid gap-0.5">
        <dt className="text-eyebrow text-fg-subtle" title={r.bench.differenceHint}>{r.bench.totals.difference}</dt>
        <dd className="flex items-center gap-2">
          <Amount key={t.difference} value={t.difference} size="lg" className="m-rise" />
          <span className={cx("flex size-6 items-center justify-center rounded-full m-tick", t.difference === 0 ? "bg-success text-white" : "bg-warning-bg text-warning")}>
            <Icon name={t.difference === 0 ? "check" : "zap"} size={14} aria-hidden />
          </span>
        </dd>
        <p className="text-eyebrow text-fg-subtle">{r.bench.differenceHint}</p>
      </div>
    </dl>
  );
}

function LineActions({ l, disabled, onAccept, onAct, onRefund, onOpen }: {
  l: LineRow; disabled: boolean; onAccept: () => void; onAct: (k: Act) => void; onRefund: () => void; onOpen: (paymentId: string) => void;
}) {
  const r = useR();
  const a = r.bench.actions;
  if (l.match === "matched" || l.match === "ignored") return l.payment ? <Button size="sm" variant="ghost" onClick={() => onOpen(l.payment!.id)}>{a.open}</Button> : null;
  if (l.match === "duplicate") return (
    <span className="hidden flex-wrap gap-1.5 md:flex">
      <Button size="sm" variant="outline" disabled={disabled} onClick={onRefund} className="m-press">{a.refund}</Button>
      {l.payment && <Button size="sm" variant="ghost" onClick={() => onOpen(l.payment!.id)}>{a.open}</Button>}
    </span>
  );
  return (
    <span className="hidden flex-wrap items-center gap-1.5 md:flex">
      {l.match === "suggested" && !l.diff
        ? <Button size="sm" variant="primary" disabled={disabled} onClick={onAccept} className="m-press">{a.accept}</Button>
        : <Button size="sm" variant="secondary" disabled={disabled} onClick={() => onAct("link")} className="m-press">{a.link}</Button>}
      {!disabled && (
        <MenuButton label={<span className="sr-only sm:not-sr-only">…</span>} align="right">
          {(close) => (
            <div className="grid">
              {([
                ...(l.match === "suggested" ? [["link", a.link]] : []),
                ...(l.match === "unmatched" ? [["create", a.create], ["fee", a.fee]] : []),
                ["flag", a.flag], ["ignore", a.ignore],
              ] as [Act, string][]).map(([k, label]) => (
                <button key={k} type="button" onClick={() => { close(); onAct(k); }} className="px-3 py-2 text-left text-small hover:bg-navy-50">{label}</button>
              ))}
              {l.payment && <button type="button" onClick={() => { close(); onOpen(l.payment!.id); }} className="px-3 py-2 text-left text-small hover:bg-navy-50">{a.open}</button>}
            </div>
          )}
        </MenuButton>
      )}
    </span>
  );
}

// ---------------------------------------------------------------- LinkDialog (RC4)
function LinkDialog({ line, onClose, onDone, onConflict }: { line: LineRow; onClose: () => void; onDone: () => void; onConflict: (e: unknown) => boolean }) {
  const r = useR();
  const { locale } = useI18n();
  const c = useLineCandidates(line.id);
  const [key] = useState(newIdempotencyKey);
  const [pick, setPick] = useState<string | null>(line.suggestionId ?? line.paymentId ?? null);
  const [handling, setHandling] = useState<"none" | "provider_fee" | "partial" | "exception">("none");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const link = useFinAction(() => unwrap(api.POST("/api/finance/statements/lines/{id}/{action}", { params: { path: { id: line.id, action: "match" } }, body: { rev: line.rev, paymentId: pick ?? undefined, handling, note: note.trim() || undefined }, headers: hdr({ idempotencyKey: key }) })));
  const chosen = c.data?.items.find((x) => x.id === pick);
  async function go() {
    setErr(null);
    if (!pick) return setErr(r.link.pick);
    if (chosen?.diff && handling === "none") return setErr(r.link.diffNeeds);
    if (handling === "exception" && !note.trim()) return setErr(r.link.noteRequired);
    try { await link.mutateAsync(undefined); onDone(); }
    catch (e) { if (onConflict(e)) return onClose(); setErr(errorCopy(e, locale)); }
  }
  return (
    <Dialog open onClose={onClose} title={r.link.title} footer={<>
      <Button variant="outline" onClick={onClose}>{r.link.cancel}</Button>
      <Button dots loading={link.isPending} onClick={go} className="m-press">{r.link.confirm}</Button>
    </>}>
      <div className="grid gap-4">
        <div className="grid gap-1">
          <p className="text-label">{r.link.statementRef}</p>
          <p className="flex flex-wrap items-center gap-2 border border-border-strong px-3.5 py-3 text-body tabular">{line.externalRef} · <Amount value={line.amount} /></p>
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-label">{r.link.candidates}</legend>
          {c.isPending ? <SkeletonRows n={3} /> : c.error ? <PanelError what={r.bench.err} onRetry={() => c.refetch()} /> : !c.data?.items.length ? <p className="text-small text-fg-muted">{r.link.noCandidates}</p> : (
            <ul className="grid max-h-64 gap-1.5 overflow-y-auto">
              {c.data.items.map((x) => (
                <li key={x.id} className={cx("border p-2.5", x.id === pick ? "border-secondary bg-navy-50" : "border-border")}>
                  <Radio name="cand" checked={x.id === pick} onChange={() => { setPick(x.id); setHandling(x.diff ? "provider_fee" : "none"); }}
                    label={<span className="grid gap-0.5">
                      <span className="text-small font-medium">{x.invoiceNo} · {x.clientName}</span>
                      <span className="flex flex-wrap items-center gap-2 text-eyebrow text-fg-muted"><Amount value={x.amount} size="sm" /><FinStatus status={x.state} kind="payment" /><span className="tabular">{formatDateTime(x.at, locale)}</span></span>
                    </span>} />
                </li>
              ))}
            </ul>
          )}
        </fieldset>
        {chosen && (
          <p className={cx("flex items-center gap-2 p-3 text-small", chosen.diff ? "bg-warning-bg text-warning" : "bg-navy-50 text-navy-800")}>
            <Icon name={chosen.diff ? "zap" : "check"} size={16} aria-hidden />
            {chosen.diff ? <>{fill(r.link.diff, { amount: "" })}<Amount value={chosen.diff} sign="always" /></> : r.link.match}
          </p>
        )}
        {!!chosen?.diff && (
          <Field label={r.link.handling}>
            {({ id }) => (
              <Select id={id} value={handling} onChange={(e) => setHandling(e.target.value as typeof handling)}>
                {(["provider_fee", "partial", "exception"] as const).map((h) => <option key={h} value={h}>{r.link.handlings[h]}</option>)}
              </Select>
            )}
          </Field>
        )}
        {handling === "exception" && (
          <Field label={r.link.note}>{({ id }) => <Textarea id={id} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
        )}
        {err && <p role="alert" className="bg-danger-bg p-3 text-small text-danger">{err}</p>}
      </div>
    </Dialog>
  );
}

function FlagDialog({ line, onClose, onSubmit }: { line: LineRow; onClose: () => void; onSubmit: (note: string) => void }) {
  const r = useR();
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <Dialog open onClose={onClose} title={r.flag.title} description={r.flag.body} footer={<>
      <Button variant="outline" onClick={onClose}>{r.link.cancel}</Button>
      <Button className="m-press" onClick={() => (note.trim() ? onSubmit(note.trim()) : setErr(r.flag.required))}>{r.flag.confirm}</Button>
    </>}>
      <p className="mb-3 text-small text-fg-muted tabular">{line.externalRef}</p>
      <Field label={r.flag.note} error={err ?? undefined}>{({ id, invalid }) => <Textarea id={id} aria-invalid={invalid} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
    </Dialog>
  );
}
