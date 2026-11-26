"use client";
// Staff AI (plan 11 §7.14, boards 08–09): KB sources + review, assistant console (sessions, transcript, unanswered,
// evals, spend, handoffs), copilot panel (agent workbench), queue copilot card (ops Today).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx } from "@/shared/format";
import { errorCopy } from "@/lib/api/error-copy";
import {
  BkgError, bk, idem, copilot, useAiSessions, useAiSettings, useClusters, useEvals, useHandoffs, useKb, useKbOne, useTranscript,
} from "@/lib/booking/api";
import { api } from "@/lib/api/client";
import { formatDay, formatTime } from "@/shared/booking/rules";
import type { CopilotResult, KbSource } from "@/shared/booking/types";
import type { Locale } from "@/shared/i18n/config";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { DateInput, Field, Input, Radio, Select, Switch, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { Tabs } from "@/components/atoms/tabs";
import { useToast } from "@/components/atoms/toast";
import { AssistantPanel, useAssistant } from "@/components/organisms/booking/assistant";
import { AiLabel, IllusKbEmpty, KbStatusPill, SkeletonList, StatePanel, fill, useBkg } from "@/components/atoms/booking";

const forbidden = (e: unknown) => e instanceof BkgError && (e.status === 403 || e.status === 404);

// ---------------------------------------------------------------- KB sources (KB1)
export function KbSources({ base }: { base: "/ops" | "/marketing" }) {
  const { c, locale } = useBkg();
  const toast = useToast();
  const qc = useQueryClient();
  const p = useUrlParams();
  const tab = p.get("tab") ?? "all";
  const q = useKb();
  const [job, setJob] = useState<{ id: string; pct: number } | null>(null);
  const [now] = useState(Date.now);
  useEffect(() => {
    if (!job || job.pct >= 100) return;
    const t = setTimeout(async () => {
      const r = await bk<{ pct: number; done: boolean }>(api.GET("/api/admin/kb-sources/reindex/{job}", { params: { path: { job: job.id } } })).catch(() => ({ pct: 100, done: true }));
      setJob({ ...job, pct: r.pct });
      if (r.done) { toast({ title: c.staff.reindexed, tone: "success" }); qc.invalidateQueries({ queryKey: ["aia"] }); }
    }, 500);
    return () => clearTimeout(t);
  }, [job, toast, qc, c.staff.reindexed]);
  if (q.isPending) return <SkeletonList n={6} h="h-12" />;
  if (q.isError) return <StatePanel title={forbidden(q.error) ? c.staff.noApprove : errorCopy(q.error, locale)} />;
  const { items, canReindex, canFacts } = q.data;
  const s = (p.get("q") ?? "").toLowerCase();
  const rows = items.filter((k) => (tab === "all" || k.kind === tab) && (!p.get("locale") || k.locale === p.get("locale")) && (!p.get("status") || k.status === p.get("status")) && (!p.get("stale") || k.status === "stale") && (!s || k.title.toLowerCase().includes(s)));
  const table = !rows.length ? <StatePanel art={<IllusKbEmpty />} title={c.staff.kbEmpty} /> : (
    <div className="overflow-x-auto border border-border bg-surface">
      <table className="w-full min-w-[48rem] text-small">
        <thead className="bg-bg-subtle text-left text-eyebrow uppercase tracking-wide text-fg-subtle">
          <tr>{Object.values(c.staff.kbCols).map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>{rows.map((k) => (
          <tr key={k.id} className="border-t border-border hover:bg-bg-subtle">
            <td className="max-w-[18rem] px-3 py-2.5">{k.cms ? <span className="font-medium">{k.title} <span className="text-eyebrow text-fg-subtle">· CMS</span></span> : <Link href={localHref(locale, `${base}/knowledge/${k.id}`)} className="font-medium underline-offset-4 hover:underline">{k.title}</Link>}</td>
            <td className="px-3 py-2.5">{c.staff.kbTabs[k.kind]}</td>
            <td className="px-3 py-2.5 uppercase">{k.locale}</td>
            <td className="px-3 py-2.5"><KbStatusPill status={k.status} /></td>
            <td className="px-3 py-2.5 text-fg-muted">{k.factsBy ?? ""}</td>
            <td className={cx("px-3 py-2.5 tabular-nums", k.reviewBy && Date.parse(k.reviewBy) < now && "text-warning")}>{k.reviewBy ? formatDay(`${k.reviewBy}T10:00:00Z`, locale) : ""}</td>
            <td className="px-3 py-2.5 tabular-nums text-fg-muted">{k.lastIndexedAt ? formatDay(k.lastIndexedAt, locale) : ""}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-h3">{c.staff.kbTitle}</h1><p className="text-small text-fg-muted">{c.staff.kbLead}</p></div>
        {canReindex && (job && job.pct < 100
          ? <span role="status" className="bg-bg-tint px-3 py-2 text-small tabular-nums">{fill(c.staff.reindexing, { pct: job.pct })}</span>
          : <Button variant="secondary" onClick={async () => { try { const r = await bk<{ jobId: string }>(api.POST("/api/admin/kb-sources/reindex", { body: {}, headers: idem() })); setJob({ id: r.jobId, pct: 0 }); } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); } }}><Icon name="refresh" size={16} aria-hidden />{c.staff.reindex}</Button>)}
      </header>
      {!canFacts && <p className="bg-info-bg px-4 py-2.5 text-small text-info">{c.staff.toneOnly}</p>}
      <div className="flex flex-wrap items-end gap-3">
        <Field label={c.common.search} className="min-w-[12rem] flex-1">{(f) => <Input id={f.id} type="search" className="h-10" defaultValue={p.get("q") ?? ""} onKeyDown={(e) => e.key === "Enter" && setUrlParams({ q: (e.target as HTMLInputElement).value || null })} />}</Field>
        <Field label={c.staff.kbCols.locale}>{(f) => <Select id={f.id} className="h-10" value={p.get("locale") ?? ""} onChange={(e) => setUrlParams({ locale: e.target.value || null })}><option value="">{c.common.all}</option>{(["rw", "en", "fr"] as Locale[]).map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}</Select>}</Field>
        <Field label={c.staff.kbCols.status}>{(f) => <Select id={f.id} className="h-10" value={p.get("status") ?? ""} onChange={(e) => setUrlParams({ status: e.target.value || null })}><option value="">{c.common.all}</option>{Object.entries(c.staff.kbStatus).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>}</Field>
        <Switch label={c.staff.staleOnly} checked={!!p.get("stale")} onChange={(e) => setUrlParams({ stale: e.target.checked ? "1" : null })} />
      </div>
      <Tabs value={tab} onChange={(t) => setUrlParams({ tab: t })} tabs={Object.entries(c.staff.kbTabs).map(([id, label]) => ({ id, label, count: id === "all" ? items.length : items.filter((k) => k.kind === id).length, content: table }))} />
      {base === "/ops" && <KbTestConsole />}
    </div>
  );
}

// ---------------------------------------------------------------- KB review (KB2)
export function KbReview({ id, base }: { id: string; base: "/ops" | "/marketing" }) {
  const { c, locale } = useBkg();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useKbOne(id);
  const [action, setAction] = useState<"approve_facts" | "approve_tone" | "exclude" | "request_changes" | "">("");
  const [comment, setComment] = useState("");
  const [reviewBy, setReviewBy] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [withdraw, setWithdraw] = useState(false);
  const [now] = useState(Date.now);
  const back = <Link href={localHref(locale, `${base}/knowledge`)} className="inline-flex w-fit items-center gap-1 text-small text-fg-muted hover:text-fg"><Icon name="arrowRight" size={14} className="rotate-180" aria-hidden />{c.staff.kbTitle}</Link>;
  if (q.isPending) return <SkeletonList n={4} h="h-24" />;
  if (q.isError) return <div className="grid gap-4">{back}<StatePanel title={forbidden(q.error) ? c.common.notFound : errorCopy(q.error, locale)} /></div>;
  const { item: k, canFacts, canTone } = q.data;
  async function act(a: "approve_facts" | "approve_tone" | "exclude" | "request_changes" | "withdraw", extra: object = {}) {
    setBusy(true); setErr(null);
    try { await bk<KbSource>(api.PATCH("/api/admin/kb-sources/{id}", { params: { path: { id: k.id } }, body: { action: a, version: k.version, ...extra }, headers: idem() })); toast({ title: c.common.saved, tone: "success" }); qc.invalidateQueries({ queryKey: ["aia"] }); setAction(""); setComment(""); }
    catch (e) { setErr(e instanceof BkgError && e.errorType === "version_conflict" ? c.manage.changedByStaff : errorCopy(e, locale)); if (e instanceof BkgError && e.errorType === "version_conflict") q.refetch(); }
    finally { setBusy(false); }
  }
  const sixMonths = new Date(now + 182 * 86_400_000).toISOString().slice(0, 10); // PLACEHOLDER(kb-review-interval): +6 months default
  return (
    <div className="grid gap-5">
      {back}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-eyebrow uppercase tracking-wide text-fg-subtle">{c.staff.kbTabs[k.kind]} · {k.locale.toUpperCase()} · {k.owner}</p><h1 className="text-h3">{k.title}</h1></div>
        <KbStatusPill status={k.status} />
      </header>
      <div className="grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="grid gap-5">
          <section className="border border-border bg-surface p-5"><h2 className="mb-3 text-label">{c.staff.preview}</h2><div className="whitespace-pre-line text-body">{k.body}</div></section>
          <section className="border border-border bg-surface p-5">
            <h2 className="mb-3 text-label">{c.staff.diff}</h2>
            {k.previous ? <Diff a={k.previous} b={k.body} /> : <p className="text-small text-fg-muted">{c.staff.noDiff}</p>}
          </section>
          {k.flags.length > 0 && (
            <section className="bg-warning-bg p-5 text-warning">
              <h2 className="mb-2 text-label">{c.staff.flags}</h2>
              <ul className="grid gap-2 text-small">{k.flags.map((f, i) => <li key={i}><span className="font-medium">{c.staff.flagWhy[f.why]}:</span> “{f.text}”</li>)}</ul>
            </section>
          )}
        </div>
        <aside className="grid gap-4 border border-border bg-surface p-5 lg:sticky lg:top-24">
          <dl className="grid gap-1 text-small">
            <div className="flex justify-between"><dt>{c.staff.facts}</dt><dd>{k.factsBy ?? c.staff.pending}</dd></div>
            <div className="flex justify-between"><dt>{c.staff.tone}</dt><dd>{k.toneBy ?? c.staff.pending}</dd></div>
            <div className="flex justify-between"><dt>{c.staff.reviewByDate}</dt><dd className="tabular-nums">{k.reviewBy || ""}</dd></div>
          </dl>
          {k.comment && <p className="bg-bg-subtle p-3 text-small">{k.comment}</p>}
          {!canFacts && !canTone ? <p className="text-small text-fg-muted">{c.staff.noApprove}</p> : (
            <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); if (!action) return; if (action === "request_changes" && !comment.trim()) { setErr(c.staff.commentReq); return; } void act(action, { comment: comment || undefined, review_by: reviewBy || (action === "approve_facts" ? sixMonths : undefined) }); }}>
              <fieldset className="grid gap-2"><legend className="mb-1 text-label">{c.staff.action}</legend>
                {canFacts && <Radio name="kba" label={c.staff.approveFacts} checked={action === "approve_facts"} onChange={() => setAction("approve_facts")} />}
                {canTone && <Radio name="kba" label={c.staff.approveTone} checked={action === "approve_tone"} onChange={() => setAction("approve_tone")} />}
                {canFacts && <Radio name="kba" label={c.staff.exclude} checked={action === "exclude"} onChange={() => setAction("exclude")} />}
                <Radio name="kba" label={c.staff.requestChanges} checked={action === "request_changes"} onChange={() => setAction("request_changes")} />
              </fieldset>
              {!canFacts && <p className="text-eyebrow text-fg-subtle">{c.staff.toneOnly}</p>}
              <Field label={c.staff.comment} optional={action === "request_changes" ? undefined : c.common.optional}>{(f) => <Textarea id={f.id} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />}</Field>
              {action === "approve_facts" && <Field label={c.staff.reviewByDate}>{(f) => <DateInput id={f.id} value={reviewBy || sixMonths} onChange={(e) => setReviewBy(e.target.value)} />}</Field>}
              {err && <p role="alert" className="text-small text-danger">{err}</p>}
              <Button type="submit" disabled={!action} loading={busy}>{c.staff.submit}</Button>
              {canFacts && k.status !== "withdrawn" && <Button type="button" variant="ghost" onClick={() => setWithdraw(true)}>{c.staff.withdraw}</Button>}
            </form>
          )}
        </aside>
      </div>
      <Dialog open={withdraw} onClose={() => setWithdraw(false)} title={c.staff.withdrawTitle} description={c.staff.withdrawBody}
        footer={<><Button variant="ghost" onClick={() => setWithdraw(false)}>{c.common.cancel}</Button><Button variant="danger" disabled={!comment.trim()} loading={busy} onClick={() => { setWithdraw(false); void act("withdraw", { comment }); }}>{c.staff.withdraw}</Button></>}>
        <Field label={c.common.reason}>{(f) => <Textarea id={f.id} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />}</Field>
      </Dialog>
    </div>
  );
}

/** Line diff (added = success, removed = struck). shortcut: line-level only, swap for word diff if editors ask. */
function Diff({ a, b }: { a: string; b: string }) {
  const A = a.split("\n"), B = b.split("\n");
  const setA = new Set(A), setB = new Set(B);
  return (
    <div className="grid gap-0.5 font-mono text-small">
      {A.filter((l) => !setB.has(l)).map((l, i) => <p key={`r${i}`} className="bg-danger-bg px-2 text-danger line-through">− {l}</p>)}
      {B.filter((l) => !setA.has(l)).map((l, i) => <p key={`a${i}`} className="bg-success-bg px-2">+ {l}</p>)}
    </div>
  );
}

function KbTestConsole() {
  const { c, locale } = useBkg();
  const api = useAssistant("staff_test", locale);
  const evals = useEvals();
  const last = evals.data?.[0];
  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-h4">{c.staff.test}</h2>
        {last && <Link href={localHref(locale, "/ops/assistant?tab=evals")} className="text-small underline underline-offset-4 tabular-nums">{fill(c.staff.regression, { passed: last.passed, total: last.total })}</Link>}
      </div>
      <div className="h-[28rem] overflow-hidden border border-border"><AssistantPanel api={api} variant="staff" /></div>
    </section>
  );
}

// ---------------------------------------------------------------- Assistant console (/ops/assistant)
export function AssistantConsole() {
  const { c } = useBkg();
  const p = useUrlParams();
  const tab = p.get("tab") ?? "sessions";
  return (
    <div className="grid gap-5">
      <header><h1 className="text-h3">{c.staff.consoleTitle}</h1><p className="text-small text-fg-muted">{c.staff.consoleLead}</p></header>
      <Tabs value={tab} onChange={(t) => setUrlParams({ tab: t })} tabs={[
        { id: "sessions", label: c.staff.cTabs.sessions, content: <Sessions /> },
        { id: "handoffs", label: c.staff.cTabs.handoffs, content: <Handoffs /> },
        { id: "unanswered", label: c.staff.cTabs.unanswered, content: <Unanswered /> },
        { id: "evals", label: c.staff.cTabs.evals, content: <Evals /> },
        { id: "spend", label: c.staff.cTabs.spend, content: <Spend /> },
      ]} />
    </div>
  );
}

function Sessions() {
  const { c, locale } = useBkg();
  const p = useUrlParams();
  const qs = new URLSearchParams(Object.entries({ outcome: p.get("outcome"), lang: p.get("lang"), handoff: p.get("handoff"), rating: p.get("rating") }).filter(([, v]) => v) as [string, string][]).toString();
  const q = useAiSessions(qs);
  const sel = (k: string, label: string, opts: [string, string][]) => (
    <Field label={label}>{(f) => <Select id={f.id} className="h-10" value={p.get(k) ?? ""} onChange={(e) => setUrlParams({ [k]: e.target.value || null })}><option value="">{c.common.all}</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
  );
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-3">
        {sel("outcome", c.staff.sCols.outcome, Object.entries(c.staff.outcome))}
        {sel("lang", c.staff.sCols.lang, [["rw", "RW"], ["en", "EN"], ["fr", "FR"]])}
        {sel("rating", c.staff.sCols.rating, [["1", "👍"], ["-1", "👎"]])}
        {sel("handoff", c.staff.cTabs.handoffs, [["true", "✓"], ["false", ""]])}
      </div>
      {q.isPending ? <SkeletonList n={5} h="h-12" /> : q.isError ? <StatePanel title={errorCopy(q.error, locale)} /> : !q.data.length ? <StatePanel title={c.staff.noSessions} /> : (
        <div className="overflow-x-auto border border-border bg-surface">
          <table className="w-full min-w-[44rem] text-small">
            <thead className="bg-bg-subtle text-left text-eyebrow uppercase tracking-wide text-fg-subtle"><tr>{[c.staff.sCols.started, "", c.staff.sCols.lang, c.staff.sCols.outcome, c.staff.sCols.rating, c.staff.sCols.turns, c.staff.sCols.context].map((h, i) => <th key={i} className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>{q.data.map((s) => (
              <tr key={s.id} className="border-t border-border hover:bg-bg-subtle">
                <td className="px-3 py-2.5 tabular-nums">{formatDay(s.startedAt, locale)} {formatTime(s.startedAt, locale)}</td>
                <td className="max-w-[18rem] truncate px-3 py-2.5"><Link className="underline-offset-4 hover:underline" href={localHref(locale, `/ops/assistant/sessions/${s.id}`)}>{s.title}</Link></td>
                <td className="px-3 py-2.5 uppercase">{s.lang}</td>
                <td className="px-3 py-2.5">{c.staff.outcome[s.outcome]}</td>
                <td className="px-3 py-2.5">{s.rating === 1 ? "👍" : s.rating === -1 ? "👎" : ""}</td>
                <td className="px-3 py-2.5 tabular-nums">{s.turns}</td>
                <td className="px-3 py-2.5 text-fg-muted">{s.context}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function TranscriptViewer({ id }: { id: string }) {
  const { c, locale } = useBkg();
  const q = useTranscript(id);
  const back = <Link href={localHref(locale, "/ops/assistant")} className="inline-flex w-fit items-center gap-1 text-small text-fg-muted hover:text-fg"><Icon name="arrowRight" size={14} className="rotate-180" aria-hidden />{c.staff.consoleTitle}</Link>;
  if (q.isPending) return <SkeletonList n={5} h="h-16" />;
  if (q.isError) return <div className="grid gap-4">{back}<StatePanel title={c.common.notFound} /></div>;
  const t = q.data;
  return (
    <div className="grid gap-5">
      {back}
      <header><p className="text-eyebrow uppercase tracking-wide text-fg-subtle">{c.staff.transcript} · {t.lang.toUpperCase()} · {c.staff.outcome[t.outcome]}</p><h1 className="text-h3">{t.title}</h1><p className="text-small text-fg-muted">{c.staff.masked}</p></header>
      <div className="grid gap-5 lg:grid-cols-[1fr_18rem] lg:items-start">
        <ol className="grid gap-3">{t.messages.map((m, i) => (
          <li key={i} className={cx("grid gap-1 p-4 text-small", m.role === "user" ? "bg-secondary text-on-navy" : m.role === "tool" ? "border border-dashed border-border font-mono text-eyebrow" : "bg-bg-subtle")}>
            <span className="text-eyebrow uppercase opacity-70">{m.role}</span>
            <p className="whitespace-pre-line">{m.text}</p>
            {m.sources?.length ? <p className="text-eyebrow opacity-70">{c.aia.sources}: {m.sources.join(", ")}</p> : null}
            {m.flags?.length ? <p className="text-eyebrow text-warning">{m.flags.join(", ")}</p> : null}
          </li>
        ))}</ol>
        <aside className="border border-border bg-surface p-5">
          <h2 className="mb-3 text-label">{c.staff.meta}</h2>
          <dl className="grid gap-1 text-small tabular-nums">{Object.entries(t.meta).map(([k, v]) => <div key={k} className="flex justify-between gap-2"><dt className="text-fg-subtle">{k}</dt><dd>{String(v)}</dd></div>)}</dl>
        </aside>
      </div>
    </div>
  );
}

function Handoffs() {
  const { c, locale } = useBkg();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useHandoffs();
  if (q.isPending) return <SkeletonList n={3} />;
  if (q.isError) return <StatePanel title={forbidden(q.error) ? c.common.forbidden : errorCopy(q.error, locale)} />;
  if (!q.data.length) return <StatePanel title={c.staff.noHandoffs} />;
  return (
    <ul className="grid gap-3 m-stagger">{q.data.map((h) => (
      <li key={h.id} className="grid gap-2 border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-label">{h.who} <span className="font-normal text-fg-muted">· {h.lang.toUpperCase()} · {c.staff.reasonCode}: {h.reason}</span></p>
          <span className="text-eyebrow text-fg-subtle tabular-nums">{formatDay(h.at, locale)} {formatTime(h.at, locale)}</span>
        </div>
        <div className="bg-bg-tint p-3 text-small"><AiLabel /><p className="mt-1">{h.summary}</p></div>
        <div className="flex flex-wrap gap-2">
          {h.claimedBy ? <span className="text-small text-fg-muted">{fill(c.staff.claimed, { who: h.claimedBy })}</span> : (
            <Button size="sm" onClick={async () => { try { await bk(api.POST("/api/admin/assistant/handoffs/{id}/claim", { params: { path: { id: h.id } }, headers: idem() })); qc.invalidateQueries({ queryKey: ["aia"] }); } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); qc.invalidateQueries({ queryKey: ["aia"] }); } }}>{c.staff.claim}</Button>
          )}
          <ButtonLink size="sm" variant="outline" href={localHref(locale, `/ops/assistant/sessions/${h.sessionId}`)}>{c.staff.viewTranscript}</ButtonLink>
          <ButtonLink size="sm" variant="ghost" href={localHref(locale, `/ops/conversations?f=handoff`)}>{c.aia.card.continueMsgs}</ButtonLink>
        </div>
      </li>
    ))}</ul>
  );
}

function Unanswered() {
  const { c, locale } = useBkg();
  const toast = useToast();
  const q = useClusters();
  if (q.isPending) return <SkeletonList n={3} />;
  if (q.isError) return <StatePanel title={errorCopy(q.error, locale)} />;
  return (
    <div className="grid gap-3">
      <h2 className="text-label">{c.staff.unanswered}</h2>
      <ul className="grid gap-3 md:grid-cols-2 m-stagger">{q.data.map((k) => (
        <li key={k.id} className="grid gap-2 border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-2"><p className="text-label">{k.label}</p><span className="bg-bg-subtle px-2 py-0.5 text-eyebrow tabular-nums">{fill(c.staff.asked, { n: k.count })}</span></div>
          <ul className="grid gap-1 text-small text-fg-muted">{k.sample.map((s) => <li key={s}>“{s}”</li>)}</ul>
          <ButtonLink size="sm" variant="secondary" className="w-fit" onClick={() => toast({ title: fill(c.staff.faqCreated, { label: k.label }), tone: "success" })}
            href={`${localHref(locale, "/marketing/faqs")}?new=1&q=${encodeURIComponent(k.label)}`}>{c.staff.createFaq}</ButtonLink>
        </li>
      ))}</ul>
    </div>
  );
}

function Evals() {
  const { c, locale } = useBkg();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useEvals();
  const [busy, setBusy] = useState(false);
  if (q.isPending) return <SkeletonList n={3} />;
  if (q.isError) return <StatePanel title={errorCopy(q.error, locale)} />;
  const blocked = q.data[0]?.deployBlocked;
  return (
    <div className="grid gap-4">
      {blocked && <p role="alert" className="bg-danger-bg p-3 text-small text-danger">{c.staff.blocked}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-label">{c.staff.evals}</h2>
        <Button size="sm" loading={busy} onClick={async () => { setBusy(true); try { await bk(api.POST("/api/admin/assistant/evals/run", { headers: idem() })); qc.invalidateQueries({ queryKey: ["aia"] }); } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); } finally { setBusy(false); } }}>{busy ? c.staff.running : c.staff.runEvals}</Button>
      </div>
      <ul className="grid gap-2">{q.data.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-3 border border-border bg-surface p-3 text-small">
          <span className="tabular-nums text-fg-muted">{formatDay(r.at, locale)} {formatTime(r.at, locale)}</span>
          <span className="flex-1">{r.trigger}</span>
          <span className="tabular-nums">{fill(c.staff.pass, { passed: r.passed, total: r.total })}</span>
          <span aria-hidden className="h-2 w-24 overflow-hidden bg-bg-subtle"><span className={cx("block h-full", r.prohibited ? "bg-danger" : "bg-success")} style={{ width: `${(r.passed / r.total) * 100}%` }} /></span>
          <span className={cx("px-2 py-0.5 text-eyebrow", r.prohibited ? "bg-danger-bg text-danger" : "bg-success-bg text-success")}>{fill(c.staff.prohibited, { n: r.prohibited })}</span>
        </li>
      ))}</ul>
      <p className="text-eyebrow text-fg-subtle">{c.staff.authoring}</p>
    </div>
  );
}

function Spend() {
  const { c, locale } = useBkg();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useAiSettings();
  const [draft, setDraft] = useState<{ enabled: boolean; amount: number } | null>(null);
  const [busy, setBusy] = useState(false);
  if (q.isPending) return <SkeletonList n={2} h="h-24" />;
  if (q.isError) return <StatePanel title={errorCopy(q.error, locale)} />;
  const s = q.data;
  const v = draft ?? { enabled: s.enabled, amount: s.monthlyBudget.amount };
  const pct = Math.min(1, s.spent / s.monthlyBudget.amount);
  const usd = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(n);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <figure className="border border-border bg-surface p-5">
        <figcaption className="mb-3 text-label">{c.staff.spend}</figcaption>
        <p className="text-h3 tabular-nums">{usd(s.spent)}</p>
        <p className="text-small text-fg-muted">{fill(c.staff.spentOf, { spent: usd(s.spent), budget: usd(s.monthlyBudget.amount) })}</p>
        <div className="relative mt-4 h-4 bg-bg-subtle" role="img" aria-label={`${Math.round(pct * 100)}%`}>
          <span className={cx("m-grow absolute inset-y-0 left-0", pct >= 1 ? "bg-danger" : pct >= 0.8 ? "bg-warning" : "bg-navy-700")} style={{ width: `${pct * 100}%` }} />
          <span aria-hidden className="absolute inset-y-[-4px] left-[80%] w-0.5 bg-ink-500" />
        </div>
        {pct >= 1 ? <p className="mt-3 bg-danger-bg p-3 text-small text-danger">{c.staff.stopped}</p> : pct >= 0.8 ? <p className="mt-3 bg-warning-bg p-3 text-small text-warning">{c.staff.warn}</p> : null}
      </figure>
      <form className="grid gap-4 border border-border bg-surface p-5" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true);
        try { await bk(api.PUT("/api/admin/assistant/settings", { body: { enabled: v.enabled, amount: v.amount, version: s.version }, headers: idem() })); setDraft(null); qc.invalidateQueries({ queryKey: ["aia"] }); toast({ title: c.common.saved, tone: "success" }); }
        catch (x) { toast({ title: errorCopy(x, locale), tone: "danger" }); } finally { setBusy(false); }
      }}>
        <fieldset disabled={!s.canEdit} className="grid gap-4">
          <Switch label={c.staff.killSwitch} checked={v.enabled} onChange={(e) => setDraft({ ...v, enabled: e.target.checked })} />
          <Field label={c.staff.budgetEdit}>{(f) => <Input id={f.id} type="number" min={0} className="tabular-nums" value={v.amount} onChange={(e) => setDraft({ ...v, amount: Math.max(0, Math.round(+e.target.value)) })} />}</Field>
        </fieldset>
        {s.canEdit ? <Button type="submit" loading={busy} className="w-fit">{c.staff.saveSettings}</Button> : <p className="text-small text-fg-muted">{c.staff.readOnly}</p>}
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- Copilot (CO1/CO2/CO4) + queue card (CO3)
export function CopilotPanel({ caseCode, clientLang = "en", aiCheckConsent = false, onInsert }: { caseCode: string; clientLang?: Locale; aiCheckConsent?: boolean; onInsert?: (text: string) => void }) {
  const { c, locale } = useBkg();
  const toast = useToast();
  const [kind, setKind] = useState<"summary" | "draft-reply" | "completeness" | null>(null);
  const [lang, setLang] = useState<Locale>(clientLang);
  const [res, setRes] = useState<CopilotResult | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  async function run(k: NonNullable<typeof kind>) {
    setKind(k); setBusy(true); setErr(null);
    try { setRes(await copilot(k, { case_code: caseCode, lang })); } catch (e) { setErr(e); setRes(null); } finally { setBusy(false); }
  }
  const off = err instanceof BkgError && (err.errorType === "ai_disabled" || err.errorType === "budget_stopped");
  const scope = err instanceof BkgError && err.status === 404;
  return (
    <section aria-label={c.staff.copilot} className="grid gap-3 border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2"><h2 className="inline-flex items-center gap-2 text-label"><Icon name="sparkle" size={16} className="text-navy-700" aria-hidden />{c.staff.copilot}</h2>
        <Select aria-label={c.staff.lang} className="h-8 w-20 text-eyebrow" value={lang} onChange={(e) => setLang(e.target.value as Locale)}>{(["rw", "en", "fr"] as Locale[]).map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}</Select>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={kind === "summary" ? "primary" : "secondary"} loading={busy && kind === "summary"} onClick={() => run("summary")}>{c.staff.summarise}</Button>
        <Button size="sm" variant={kind === "draft-reply" ? "primary" : "secondary"} loading={busy && kind === "draft-reply"} onClick={() => run("draft-reply")}>{c.staff.draftReply}</Button>
        <Button size="sm" variant={kind === "completeness" ? "primary" : "secondary"} loading={busy && kind === "completeness"} onClick={() => run("completeness")}>{c.staff.completeness}</Button>
      </div>
      {busy && <SkeletonList n={2} h="h-10" />}
      {!busy && off && <p className="bg-bg-subtle p-3 text-small text-fg-muted">{c.staff.copilotOff}</p>}
      {!busy && scope && <p className="bg-bg-subtle p-3 text-small text-fg-muted">{c.staff.outOfScope}</p>}
      {!busy && !!err && !off && !scope && <p role="alert" className="bg-danger-bg p-3 text-small text-danger">{errorCopy(err, locale)} <button type="button" className="underline" onClick={() => kind && run(kind)}>{c.common.retry}</button></p>}
      {!busy && res && (
        <div className="grid gap-2 bg-bg-tint p-3 m-pop">
          <AiLabel />
          <p className="whitespace-pre-line text-small">{res.text}</p>
          {res.items && <ul className="grid gap-1 text-small">{res.items.map((i) => <li key={i.label} className="flex gap-2"><Icon name={i.ok ? "check" : "x"} size={14} className={cx("mt-0.5 shrink-0", i.ok ? "text-success" : "text-danger")} aria-hidden />{i.label}</li>)}</ul>}
          {kind === "completeness" && !aiCheckConsent && <p className="text-eyebrow text-fg-subtle">{c.staff.noConsent}</p>}
          <div className="flex flex-wrap gap-2">
            {kind === "draft-reply" && onInsert && <Button size="sm" onClick={() => { onInsert(res.text); toast({ title: c.staff.inserted }); }}>{c.staff.insert}</Button>}
            <Button size="sm" variant="ghost" onClick={() => { void navigator.clipboard?.writeText(res.text); }}>{c.staff.copy}</Button>
            <Button size="sm" variant="ghost" onClick={() => kind && run(kind)}>{c.staff.regenerate}</Button>
          </div>
        </div>
      )}
    </section>
  );
}

export function QueueCopilotCard() {
  const { c, locale } = useBkg();
  const [res, setRes] = useState<CopilotResult | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  return (
    <section className="grid gap-3 border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-label"><Icon name="sparkle" size={16} className="text-navy-700" aria-hidden />{c.staff.copilot}</h2>
        <Button size="sm" variant="secondary" loading={busy} onClick={async () => { setBusy(true); setErr(null); try { setRes(await copilot("queue-summary", { lang: locale })); } catch (e) { setErr(e); } finally { setBusy(false); } }}>{c.staff.queue}</Button>
      </div>
      {!!err && <p className="text-small text-fg-muted">{err instanceof BkgError && (err.errorType === "ai_disabled" || err.errorType === "budget_stopped") ? c.staff.copilotOff : errorCopy(err, locale)}</p>}
      {res && <div className="grid gap-2 bg-bg-tint p-3 m-pop"><AiLabel /><p className="whitespace-pre-line text-small">{res.text}</p></div>}
    </section>
  );
}
