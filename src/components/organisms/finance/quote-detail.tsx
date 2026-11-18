"use client";
// U6 Quote builder / detail `/finance/quotes/[no]?v=&tab=` (board 04 QT2–QT4, PQ1) with the board fixes applied:
// eligibility is an indicator (LineEditor), convert shows the accepted version's total, no period-lock chip on quotes.
// Draft autosaves (800 ms debounce, rev-checked → ConflictDialog on 409). Phone: read-only summary + Approve & send.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { newIdempotencyKey, api, type ActionOf } from "@/lib/api/client";
import { cx, formatDate, formatDateTime, formatMoney, formatRelative } from "@/shared/format";
import { docTotals } from "@/lib/finance/money";
import { POLICY } from "@/shared/policy";
import { useBAction, useQuote, type BillKind, type QuoteDetail, type QuoteRec } from "@/lib/finance/b";
import type { DocLine } from "@/shared/finance/types";
import type { Locale } from "@/shared/i18n/config";
import { financeQuotes } from "@/content/pages/finance-quotes";
import { fill } from "@/content/pages/finance-common";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { Dialog } from "@/components/atoms/dialog";
import { Tabs } from "@/components/atoms/tabs";
import { Checkbox, DateInput, Field, Input, Select, Textarea } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { PanelError, ReasonDialog } from "@/components/molecules/ops/ops";
import { usePhone } from "@/components/atoms/step-up";
import { PageHead, SkeletonRows, useNow } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { Amount, DocNumber, FinStatus } from "@/components/atoms/finance";
import { HistoryTab, LineEditor, NoAccess, TotalsPanel } from "@/components/molecules/finance/finance";
import { BackLink, DocumentPreview, ExpiryChip, fresh, useBError } from "@/components/molecules/finance/finance";
import { NewQuoteDialog } from "@/components/organisms/finance/quotes";

type Q = ReturnType<typeof useQuote>;
const LANGS: Locale[] = ["en", "rw", "fr"];
const pct = (bps: number) => `${bps / 100}%`;

export function QuoteView({ no }: { no: string }) {
  const { locale } = useI18n();
  const c = financeQuotes(locale);
  const p = useUrlParams();
  if (no === "new") {
    return (
      <div className="grid gap-5">
        <PageHead back={<BackLink href="/finance/quotes">{c.back}</BackLink>} title={c.newPage.title} sub={c.newPage.sub} />
        <NewQuoteDialog inline preset={p.get("case") ?? ""} onClose={() => {}} />
      </div>
    );
  }
  return <QuoteRecord no={no} />;
}

function QuoteRecord({ no }: { no: string }) {
  const { locale } = useI18n();
  const c = financeQuotes(locale);
  const q = useQuote(no);
  const p = useUrlParams();
  const phone = usePhone();
  const [nonce, setNonce] = useState(0);
  const tab = p.get("tab") === "history" ? "history" : "quote";
  if (q.isPending) return <div className="grid gap-4"><div className="h-16 w-2/3 m-shimmer" /><div className="grid gap-4 lg:grid-cols-[1fr_20rem]"><SkeletonRows n={5} /><div className="h-72 m-shimmer" /></div></div>;
  if (q.isError) {
    const st = (q.error as { status?: number }).status;
    if (st === 403) return <NoAccess />;
    return <div className="grid gap-4"><BackLink href="/finance/quotes">{c.back}</BackLink><PanelError what={no} onRetry={() => q.refetch()} /></div>;
  }
  const d = q.data;
  const latest = d.versions[0];
  const vParam = Number(p.get("v"));
  const viewing = d.versions.find((v) => v.version === vParam) ?? latest;
  const old = viewing !== latest;
  return (
    <div className="grid gap-5">
      <PageHead back={<BackLink href="/finance/quotes">{c.back}</BackLink>}
        title={<span className="flex flex-wrap items-center gap-3"><DocNumber no={latest.no} /><span className="bg-ink-100 px-2.5 py-0.5 text-small tabular">{fill(c.version, { n: viewing.version })}</span><FinStatus status={viewing.status} kind="quote" /></span>}
        sub={<>{latest.clientName} · {latest.caseRef} · {latest.service}</>} />
      <Tabs value={tab} onChange={(id) => setUrlParams({ tab: id === "quote" ? null : id })} tabs={[
        { id: "quote", label: c.summary, content: phone
          ? <PhoneSummary d={d} q={q} />
          : old
            ? <ReadOnly d={d} q={q} rec={viewing} old />
            : latest.status === "draft"
              ? <Builder key={`${latest.version}-${nonce}`} d={d} q={q} rec={latest} onRefresh={() => { q.refetch(); setNonce((n) => n + 1); }} />
              : <ReadOnly d={d} q={q} rec={latest} /> },
        { id: "history", label: c.historyTab, content: <HistoryTab resourceType="quote" resourceId={no} /> },
      ]} />
    </div>
  );
}

// ---------------------------------------------------------------- banners
function Banners({ d, rec }: { d: QuoteDetail; rec: QuoteRec }) {
  const { locale } = useI18n();
  const c = financeQuotes(locale);
  const { user } = useSession();
  const acceptedOther = d.versions.find((v) => v !== rec && (v.status === "accepted" || v.status === "converted"));
  const items: { tone: "warning" | "info" | "danger" | "success"; text: string }[] = [];
  if (acceptedOther && rec.status === "draft") items.push({ tone: "danger", text: fill(c.banners.acceptedOther, { v: acceptedOther.version, d: rec.version }) });
  if (rec.status === "expired") items.push({ tone: "warning", text: fill(c.banners.expired, { d: formatDate(rec.validUntil, locale) }) });
  const prev = d.versions.find((v) => v.version === rec.version - 1);
  const note = rec.responseNote ?? (rec.status === "draft" ? prev?.responseNote : undefined);
  if (rec.status === "declined" && note) items.push({ tone: "danger", text: fill(c.banners.declined, { note }) });
  if ((rec.status === "changes_requested" || (rec.status === "draft" && prev?.status === "superseded")) && note) items.push({ tone: "info", text: fill(c.banners.changes, { note }) });
  if (rec.status === "pending_approval") items.push({ tone: "warning", text: rec.preparedBy.id === user?.id ? c.banners.pendingMine : fill(c.banners.pending, { amount: formatMoney(d.threshold, "RWF", locale) }) });
  if (rec.status === "accepted") items.push({ tone: "success", text: fill(c.banners.accepted, { t: rec.respondedAt ? formatRelative(rec.respondedAt, locale) : "" }) });
  if (rec.status === "converted" && rec.invoiceNos?.length) items.push({ tone: "success", text: fill(c.banners.converted, { nos: rec.invoiceNos.join(", ") }) });
  if (!items.length) return null;
  const cls = { warning: "bg-warning-bg text-warning", info: "bg-info-bg text-info", danger: "bg-danger-bg text-danger", success: "bg-success-bg text-success" };
  return (
    <div className="grid gap-2 m-stagger">
      {items.map((b, i) => (
        <p key={i} style={{ ["--i" as string]: i }} role={b.tone === "danger" ? "alert" : "status"} className={cx("flex items-start gap-2 px-4 py-3 text-small", cls[b.tone])}>
          <Icon name={b.tone === "success" ? "check" : b.tone === "info" ? "message" : "clock"} size={16} aria-hidden className="mt-0.5 shrink-0" />{b.text}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- draft builder (QT2)
type Draft = { lines: DocLine[]; lang: Locale; validUntil: string; kind: BillKind; tin: string; notes: Record<Locale, string>; terms: Record<Locale, string> };

function Builder({ d, q, rec, onRefresh }: { d: QuoteDetail; q: Q; rec: QuoteRec; onRefresh: () => void }) {
  const { locale } = useI18n();
  const c = financeQuotes(locale);
  const online = useOnline();
  const now = useNow();
  const today = now ? new Date(now).toISOString().slice(0, 10) : "";
  const [draft, setDraft] = useState<Draft>({ lines: rec.lines, lang: rec.lang, validUntil: rec.validUntil, kind: rec.kind, tin: rec.orgTin ?? "", notes: rec.notes, terms: rec.terms });
  const [rev, setRev] = useState(rec.rev);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const save = useBAction<QuoteDetail>("patch");
  const { onError, dialog } = useBError(() => (d.changedBy ? { name: d.changedBy.name, at: d.changedAt ?? "" } : null), onRefresh);
  const set = (p: Partial<Draft>) => { setDraft((x) => ({ ...x, ...p })); setDirty(true); };

  // Autosave: 800 ms after the last edit, never while a save is in flight, never offline (nothing is queued).
  const pending = save.isPending;
  useEffect(() => {
    if (!dirty || pending || !online) return;
    const t = setTimeout(() => {
      setDirty(false);
      save.mutate({ req: (h) => api.PATCH("/api/finance/quotations/{no}", { params: { path: { no: rec.no } }, body: { rev, ...draft }, headers: h }) }, {
        onSuccess: (r) => { setRev(r.versions[0].rev); setSaved(new Date().toISOString()); setFailed(false); },
        onError: (e) => { setFailed(true); onError(e); },
      });
    }, 800);
    return () => clearTimeout(t);
  }, [dirty, pending, online, draft, rev, rec.no, save, onError]);

  const totals = docTotals(draft.lines); // preview only; the server recomputes with the same function
  const lbl = (l: DocLine) => (typeof l.label === "string" ? l.label : (l.label.en ?? ""));
  const lineErr: Record<number, string> = {};
  draft.lines.forEach((l, i) => {
    if (!lbl(l).trim()) lineErr[i] = c.blockers.label;
    else if (l.kind === "discount" && lbl(l).trim().length < 4) lineErr[i] = c.blockers.discount;
  });
  const acceptedOther = d.versions.some((v) => v !== rec && (v.status === "accepted" || v.status === "converted"));
  const tinBad = draft.kind === "company" && !!draft.tin && !/^\d{9}$/.test(draft.tin);
  const blockers = [
    !draft.lines.length && c.blockers.noLines,
    draft.lines.length > 0 && totals.total <= 0 && c.blockers.zero,
    !!today && draft.validUntil < today && c.blockers.expired,
    acceptedOther && c.blockers.accepted,
    Object.keys(lineErr).length > 0 && c.blockers.label,
    tinBad && c.tinError,
    !online && c.blockers.offline,
  ].filter((x): x is string => !!x);
  const deposit = rec.deposit && totals.total >= POLICY.depositThreshold ? { ...rec.deposit, pct: pct(POLICY.depositBps) } : null;
  const status = pending ? c.save.saving : failed ? c.save.failed : saved ? fill(c.save.saved, { t: formatDateTime(saved, locale).split(" ").slice(-1)[0] }) : c.save.idle;
  const ready = blockers.length === 0 && !dirty && !pending;

  return (
    <div className="grid gap-5 pt-4">
      <Banners d={d} rec={rec} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-5 m-stagger">
          <section style={{ ["--i" as string]: 0 }} className="grid gap-4 border border-border bg-white p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="grid gap-1.5 md:col-span-2">
              <span className="text-label">{c.billTo}</span>
              <p className="text-body">{rec.clientName}</p>
              <div role="radiogroup" aria-label={c.billTo} className="flex w-fit bg-ink-100 p-1">
                {(["company", "individual"] as const).map((k) => (
                  <button key={k} type="button" role="radio" aria-checked={draft.kind === k} onClick={() => set({ kind: k })}
                    className={cx("h-8 px-3.5 text-small m-press", draft.kind === k ? "bg-secondary text-on-navy" : "text-fg-muted hover:text-fg")}>{c[k]}</button>
                ))}
              </div>
              {draft.kind === "company" && (
                <Field label={c.tin} hint={c.tinHint} error={tinBad ? c.tinError : undefined} className="mt-2 max-w-60">
                  {({ id, describedBy, invalid }) => <Input id={id} inputMode="numeric" maxLength={9} aria-describedby={describedBy} aria-invalid={invalid} value={draft.tin} onChange={(e) => set({ tin: e.target.value.replace(/\D/g, "") })} className="h-10 tabular" />}
                </Field>
              )}
            </div>
            <div className="grid content-start gap-1.5"><span className="text-label">{c.case}</span><span className="text-body tabular">{rec.caseRef}</span><span className="text-small text-fg-muted">{rec.service}</span></div>
            <div className="grid content-start gap-3">
              <Field label={c.language}>
                {({ id }) => <Select id={id} value={draft.lang} onChange={(e) => set({ lang: e.target.value as Locale })} className="h-10">{LANGS.map((l) => <option key={l} value={l}>{c.langs[l]}</option>)}</Select>}
              </Field>
              <Field label={c.validity} error={today && draft.validUntil < today ? c.validityError : undefined}>
                {({ id, describedBy, invalid }) => <DateInput id={id} min={today || undefined} aria-describedby={describedBy} aria-invalid={invalid} value={draft.validUntil} onChange={(e) => set({ validUntil: e.target.value })} className="h-10" />}
              </Field>
            </div>
          </section>
          <section style={{ ["--i" as string]: 1 }} className="grid gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-card-title">{c.lines}</h2><p className="text-small text-fg-subtle">{c.linesHint}</p></div>
            <LineEditor lines={draft.lines} onChange={(lines) => set({ lines })} errors={lineErr} />
          </section>
          <section style={{ ["--i" as string]: 2 }} className="grid gap-4 border border-border bg-white p-4 sm:p-5 md:grid-cols-2">
            <LangText label={c.notes} value={draft.notes} onChange={(notes) => set({ notes })} />
            <LangText label={c.terms} value={draft.terms} onChange={(terms) => set({ terms })} />
          </section>
        </div>
        <aside className="grid content-start gap-4">
          <TotalsPanel totals={totals} deposit={deposit} />
          <p aria-live="polite" className={cx("flex items-center gap-2 text-small", failed ? "text-danger" : "text-fg-muted")}>
            {pending ? <span aria-hidden className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Icon name={failed ? "x" : "check"} size={14} aria-hidden />}{status}
          </p>
          {blockers.length > 0 && (
            <div role="status" className="bg-warning-bg p-4 text-small text-warning">
              <p className="font-medium">{c.blockers.title}</p>
              <ul className="mt-1 list-disc pl-5">{[...new Set(blockers)].map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
          )}
          {totals.total > d.threshold && <p className="bg-bg-tint p-3 text-small text-navy-800">{fill(c.send.over, { amount: formatMoney(d.threshold, "RWF", locale) })}</p>}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <Button variant="outline" onClick={() => setPreview(true)} className="m-press"><Icon name="file" size={16} aria-hidden />{c.actions.preview}</Button>
            <Button onClick={async () => { await fresh(q); setSending(true); }} disabled={!ready} dots className="m-press">{c.actions.send}</Button>
          </div>
          <Revisions d={d} current={rec.version} />
        </aside>
      </div>
      <DocumentPreview open={preview} onClose={() => setPreview(false)} title={c.actions.preview} kindLabel={c.title} no={`${rec.no} · v${rec.version}`}
        billTo={{ name: rec.clientName, tin: draft.kind === "company" ? draft.tin || undefined : undefined }} date={today || rec.validUntil}
        lines={draft.lines} totals={totals} lang={draft.lang}
        extra={<p className="text-eyebrow text-fg-subtle">{c.validity}: {formatDate(draft.validUntil, draft.lang)} · {draft.notes[draft.lang]}</p>}
        footer={<Button onClick={() => { setPreview(false); setSending(true); }} disabled={!ready} className="m-press">{c.actions.send}</Button>} />
      {sending && <SendDialog rec={rec} rev={rev} total={totals.total} threshold={d.threshold} onClose={() => setSending(false)} onError={onError} />}
      {dialog}
    </div>
  );
}

function LangText({ label, value, onChange }: { label: string; value: Record<Locale, string>; onChange: (v: Record<Locale, string>) => void }) {
  const { locale } = useI18n();
  const c = financeQuotes(locale);
  return (
    <div className="grid gap-1.5">
      <span className="text-label">{label}</span>
      <Tabs tabs={LANGS.map((l) => ({
        id: l, label: l.toUpperCase(),
        content: <Textarea aria-label={`${label} · ${c.langs[l]}`} lang={l} value={value[l] ?? ""} onChange={(e) => onChange({ ...value, [l]: e.target.value })} className="mt-2 min-h-24" />,
      }))} />
    </div>
  );
}

// ---------------------------------------------------------------- sent / accepted / expired / old version (QT4)
function ReadOnly({ d, q, rec, old }: { d: QuoteDetail; q: Q; rec: QuoteRec; old?: boolean }) {
  const { locale } = useI18n();
  const c = financeQuotes(locale);
  const [preview, setPreview] = useState(false);
  const latest = d.versions[0];
  return (
    <div className="grid gap-5 pt-4">
      {old ? (
        <p role="status" className="flex flex-wrap items-center gap-3 bg-bg-subtle px-4 py-3 text-small">
          <Icon name="clock" size={16} aria-hidden />{c.revisions.viewing} {fill(c.version, { n: rec.version })}
          <Button size="sm" variant="outline" onClick={() => setUrlParams({ v: null })}>{fill(c.revisions.view, { n: latest.version })}</Button>
        </p>
      ) : <Banners d={d} rec={rec} />}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-5 m-stagger">
          <dl style={{ ["--i" as string]: 0 }} className="grid gap-4 border border-border bg-white p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
            <Info k={c.billTo} v={<>{rec.clientName}<span className="block text-small text-fg-muted">{c[rec.kind]}{rec.orgTin ? ` · TIN ${rec.orgTin}` : ""}</span></>} />
            <Info k={c.case} v={<span className="tabular">{rec.caseRef}</span>} />
            <Info k={c.language} v={c.langs[rec.lang]} />
            <Info k={c.validity} v={<ExpiryChip validUntil={rec.validUntil} label={c.expiresIn} />} />
          </dl>
          <section style={{ ["--i" as string]: 1 }}><LineEditor lines={rec.lines} readOnly /></section>
          {rec.notes[rec.lang] && <p style={{ ["--i" as string]: 2 }} className="bg-bg-subtle p-4 text-small"><span className="text-label">{c.notes}: </span>{rec.notes[rec.lang]}</p>}
        </div>
        <aside className="grid content-start gap-4">
          <TotalsPanel totals={rec.totals} deposit={rec.deposit ? { ...rec.deposit, pct: pct(POLICY.depositBps) } : null} />
          <Button variant="outline" onClick={() => setPreview(true)} className="m-press"><Icon name="file" size={16} aria-hidden />{c.actions.preview}</Button>
          {!old && <Actions d={d} q={q} rec={rec} />}
          <Revisions d={d} current={rec.version} />
        </aside>
      </div>
      <DocumentPreview open={preview} onClose={() => setPreview(false)} title={c.actions.preview} kindLabel={c.title} no={`${rec.no} · v${rec.version}`}
        billTo={{ name: rec.clientName, tin: rec.orgTin }} date={rec.sentAt ?? rec.validUntil} lines={rec.lines} totals={rec.totals} lang={rec.lang} />
    </div>
  );
}

const Info = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="grid min-w-0 content-start gap-0.5"><dt className="text-eyebrow text-fg-subtle">{k}</dt><dd className="text-body">{v}</dd></div>;

function Actions({ d, q, rec, compact }: { d: QuoteDetail; q: Q; rec: QuoteRec; compact?: boolean }) {
  const { locale } = useI18n();
  const c = financeQuotes(locale);
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const { user } = useSession();
  const [key, setKey] = useState(newIdempotencyKey);
  const act = useBAction<QuoteDetail & { invoiceNos?: string[] }>();
  const [withdraw, setWithdraw] = useState(false);
  const [convert, setConvert] = useState(false);
  const { onError, dialog } = useBError(() => (d.changedBy ? { name: d.changedBy.name, at: d.changedAt ?? "" } : null), () => q.refetch());
  const go = (path: ActionOf<"/api/finance/quotations/{no}">, body: Record<string, unknown>, done: string, after?: (r: QuoteDetail & { invoiceNos?: string[] }) => void) =>
    act.mutateAsync({ req: (h) => api.POST(`/api/finance/quotations/{no}/${path}`, { params: { path: { no: rec.no } }, body, headers: h }), key })
      .then((r) => { toast({ title: done, tone: "success" }); setKey(newIdempotencyKey()); after?.(r); })
      .catch((e) => { onError(e); throw e; });
  const mine = rec.preparedBy.id === user?.id;
  const accepted = d.versions.some((v) => v.status === "accepted" || v.status === "converted");
  const canRevise = ["sent", "changes_requested", "expired", "declined", "withdrawn"].includes(rec.status) && !accepted;
  const off = !online ? c.blockers.offline : undefined;
  return (
    <div className={cx("grid gap-2", compact ? "" : "sm:grid-cols-2 lg:grid-cols-1")}>
      {rec.status === "pending_approval" && (
        <>
          <Button dots disabled={mine || !online} title={mine ? c.approve.same : off} loading={act.isPending}
            onClick={async () => { await fresh(q); go("approve", { rev: rec.rev }, fill(c.approve.done, { no: rec.no })).catch(() => {}); }} className="m-press">{c.actions.approveSend}</Button>
          {mine && <p className="text-small text-fg-muted">{c.approve.same}</p>}
        </>
      )}
      {rec.status === "accepted" && <Button dots disabled={!online} title={off} onClick={async () => { await fresh(q); setConvert(true); }} className="m-press">{c.actions.convert}</Button>}
      {canRevise && (
        <Button variant={rec.status === "expired" ? "primary" : "outline"} disabled={!online} title={off} loading={act.isPending}
          onClick={() => go("revise", {}, fill(c.revise.done, { n: rec.version + 1 }), () => setUrlParams({ v: null })).catch(() => {})} className="m-press">
          {rec.status === "expired" || rec.status === "declined" ? c.actions.reviseResend : c.actions.revise}
        </Button>
      )}
      {rec.status === "sent" && !compact && <Button variant="ghost" disabled={!online} title={off} onClick={() => setWithdraw(true)} className="text-danger">{c.actions.withdraw}</Button>}
      {rec.status === "converted" && rec.invoiceNos?.map((n) => (
        <Button key={n} variant="outline" onClick={() => router.push(localHref(locale, `/finance/invoices/${n}`))}><Icon name="arrowUpRight" size={14} aria-hidden />{n}</Button>
      ))}
      <ReasonDialog open={withdraw} onClose={() => setWithdraw(false)} title={fill(c.withdraw.title, { no: rec.no })} description={c.withdraw.body}
        options={Object.entries(c.withdraw.reasons).map(([value, label]) => ({ value, label }))} noteLabel={c.withdraw.reason} confirmLabel={c.withdraw.confirm} destructive audited
        onConfirm={({ reason, note }) => go("withdraw", { rev: rec.rev, reason: `${c.withdraw.reasons[reason]}${note ? `: ${note}` : ""}` }, c.withdraw.done)} />
      {convert && <ConvertDialog rec={rec} onClose={() => setConvert(false)}
        onConfirm={() => go("convert", { rev: rec.rev }, "", (r) => { toast({ title: fill(c.convert.done, { nos: (r.invoiceNos ?? []).join(", ") }), tone: "success" }); setConvert(false); })} busy={act.isPending} />}
      {dialog}
    </div>
  );
}

function ConvertDialog({ rec, onClose, onConfirm, busy }: { rec: QuoteRec; onClose: () => void; onConfirm: () => Promise<void>; busy: boolean }) {
  const { locale } = useI18n();
  const c = financeQuotes(locale);
  return (
    <Dialog open onClose={onClose} title={c.convert.title} footer={<>
      <Button variant="outline" onClick={onClose}>{c.convert.cancel}</Button>
      <Button dots loading={busy} onClick={() => onConfirm().catch(() => {})} className="m-press">{c.convert.confirm}</Button>
    </>}>
      <div className="grid gap-4 bg-bg-tint p-5 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-on-navy m-pop"><Icon name="check" size={22} aria-hidden /></span>
        <p className="text-small text-fg-muted">{fill(c.convert.body, { v: rec.version })}</p>
        <div><p className="text-eyebrow text-navy-800">{c.convert.total}</p><Amount value={rec.totals.total} size="xl" /></div>
        {rec.deposit ? (
          <dl className="grid grid-cols-2 gap-3 text-left">
            <div className="bg-white p-3"><dt className="text-eyebrow text-fg-subtle">{fill(c.convert.deposit, { pct: pct(POLICY.depositBps) })}</dt><dd><Amount value={rec.deposit.deposit} size="lg" /></dd></div>
            <div className="bg-white p-3"><dt className="text-eyebrow text-fg-subtle">{c.convert.balance}</dt><dd><Amount value={rec.deposit.balance} size="lg" /></dd></div>
            <p className="col-span-2 text-small text-navy-800">{c.convert.two}</p>
          </dl>
        ) : <p className="text-small text-navy-800">{fill(c.convert.noDeposit, { amount: formatMoney(POLICY.depositThreshold, "RWF", locale) })}</p>}
      </div>
    </Dialog>
  );
}

function SendDialog({ rec, rev, total, threshold, onClose, onError }: { rec: QuoteRec; rev: number; total: number; threshold: number; onClose: () => void; onError: (e: unknown) => void }) {
  const { locale } = useI18n();
  const c = financeQuotes(locale);
  const toast = useToast();
  const [key] = useState(newIdempotencyKey);
  const [ch, setCh] = useState<string[]>(["email", "portal"]);
  const [msg, setMsg] = useState(c.send.messageDefault);
  const [err, setErr] = useState<string | undefined>();
  const act = useBAction();
  const toggle = (k: string) => { setCh((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k])); setErr(undefined); };
  const submit = () => {
    if (!ch.length) return setErr(c.send.channelError);
    act.mutate({ req: (h) => api.POST("/api/finance/quotations/{no}/send", { params: { path: { no: rec.no } }, body: { rev, channels: ch, message: msg }, headers: h }), key }, {
      onSuccess: () => { toast({ title: fill(c.send.done, { no: rec.no }), tone: "success" }); onClose(); },
      onError: (e) => { onClose(); onError(e); },
    });
  };
  return (
    <Dialog open onClose={onClose} title={c.send.title} description={`${rec.no} · v${rec.version}`} footer={<>
      <Button variant="outline" onClick={onClose}>{c.send.cancel}</Button>
      <Button onClick={submit} loading={act.isPending} className="m-press">{c.send.confirm}</Button>
    </>}>
      <div className="grid gap-4">
        <fieldset className="grid gap-2" aria-describedby={err ? "send-ch-err" : undefined}>
          <legend className="mb-1 text-label">{c.send.channels}</legend>
          {err && <p id="send-ch-err" className="text-small font-medium text-danger">{err}</p>}
          {(["email", "portal", "whatsapp"] as const).map((k) => <Checkbox key={k} label={c.send[k]} checked={ch.includes(k)} onChange={() => toggle(k)} />)}
        </fieldset>
        <Field label={c.send.recipient}>{({ id }) => <Select id={id} className="h-10"><option>{rec.clientName}</option></Select>}</Field>
        <Field label={c.send.message} hint={fill(c.send.count, { n: msg.length })}>
          {({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} maxLength={200} value={msg} onChange={(e) => setMsg(e.target.value)} />}
        </Field>
        {total > threshold && <p className="flex items-start gap-2 bg-warning-bg p-3 text-small text-warning"><Icon name="shield" size={16} aria-hidden className="mt-0.5 shrink-0" />{fill(c.send.over, { amount: formatMoney(threshold, "RWF", locale) })}</p>}
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------- revision timeline (QT4)
function Revisions({ d, current }: { d: QuoteDetail; current: number }) {
  const { locale } = useI18n();
  const c = financeQuotes(locale);
  return (
    <section className="border border-border bg-white p-4">
      <h2 className="mb-3 text-label">{c.revisions.title}</h2>
      {!d.history.length ? <p className="text-small text-fg-muted">{c.revisions.empty}</p> : (
        <ol className="relative grid gap-3 border-l border-border pl-5 m-stagger">
          {d.history.map((h, i) => (
            <li key={i} style={{ ["--i" as string]: i }} className="relative">
              <span aria-hidden className={cx("absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full ring-4 ring-white", h.status === "accepted" ? "bg-success" : h.v === current ? "bg-navy-700" : "bg-border-strong")} />
              <p className="flex flex-wrap items-center gap-2 text-small font-medium">
                <span className="tabular">v{h.v}</span>{fill(c.ev[h.status] ?? h.status, { v: h.v })}
              </p>
              <p className="text-eyebrow text-fg-subtle tabular">{formatDateTime(h.at, locale)}</p>
              {h.note && <p className="mt-1 bg-ink-100 px-2 py-1 text-small">“{h.note}”</p>}
              {h.v !== current && d.versions.some((v) => v.version === h.v) && i === d.history.findIndex((x) => x.v === h.v) && (
                <button type="button" onClick={() => setUrlParams({ v: String(h.v) })} className="mt-1 text-small text-link underline-offset-4 hover:underline">{fill(c.revisions.view, { n: h.v })}</button>
              )}
            </li>
          ))}
        </ol>
      )}
      <button type="button" onClick={() => setUrlParams({ tab: "history" })} className="mt-3 h-10 w-full border border-navy-200 text-small text-link hover:bg-navy-50">{c.actions.history}</button>
    </section>
  );
}

// ---------------------------------------------------------------- phone (PQ1): read-only summary + approve
function PhoneSummary({ d, q }: { d: QuoteDetail; q: Q }) {
  const { locale } = useI18n();
  const c = financeQuotes(locale);
  const rec = d.versions[0];
  return (
    <div className="grid gap-4 pt-4 m-rise">
      <Banners d={d} rec={rec} />
      <section className="grid gap-3 border border-border bg-white p-4">
        <p className="text-eyebrow text-fg-subtle">{c.summary}</p>
        <DocNumber no={rec.no} />
        <p className="text-body">{rec.clientName}</p>
        <Amount value={rec.totals.total} size="xl" />
        {rec.status === "pending_approval" && <p className="flex items-center gap-2 text-small text-success"><Icon name="check" size={16} aria-hidden />{c.readyApproval}</p>}
        <Actions d={d} q={q} rec={rec} compact />
      </section>
      {rec.status === "draft" && <p className="bg-bg-subtle p-3 text-small text-fg-muted">{c.banners.phone}</p>}
      <LineEditor lines={rec.lines} readOnly />
    </div>
  );
}
