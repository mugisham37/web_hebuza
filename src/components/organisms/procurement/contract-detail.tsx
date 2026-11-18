"use client";
import { todayIso } from "@/components/molecules/procurement/procurement";
// S8 contract detail + S10 renewal alert + S11 renewal wizard + S12 termination (board 04 CT2–CT5; fix: reminder dates
// computed by reminderDates(), never hand-written). ?renew=1 (notification deep link) opens the wizard.
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { formatDate, formatMoney } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { newIdempotencyKey } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { addDays, daysBetween } from "@/shared/procurement/rules";
import { useContract, useRenewal, useSnooze, useTerminate } from "@/lib/procurement/ab";
import { fill } from "@/content/pages/procurement-common";
import { PageHead } from "@/components/atoms/agent";
import { MenuButton, SavedViewTabs } from "@/components/molecules/ops/ops";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Checkbox, DateInput, Input, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { Stepper } from "@/components/atoms/misc";
import { useToast } from "@/components/atoms/toast";
import { Amount, DocNo, ExpiryChip, Fact, Pill, ProcPill, useP } from "@/components/atoms/procurement";
import { ContractTimeline, DepositCard, HistoryList, ProcLink } from "@/components/molecules/procurement/procurement";
import { ContractForm } from "@/components/organisms/procurement/contracts";
import { QueryFail, useAB } from "@/components/molecules/procurement/procurement";

const TABS = ["overview", "documents", "reminders", "bills", "versions", "history"] as const;
type Tab = (typeof TABS)[number];

export function ContractDetail({ id }: { id: string }) {
  const c = useAB().contracts;
  const p = useP();
  const { locale } = useI18n();
  const u = useUrlParams();
  const tab = (TABS as readonly string[]).includes(u.get("tab") ?? "") ? (u.get("tab") as Tab) : "overview";
  const q = useContract(id);
  const [dialog, setDialog] = useState<null | "edit" | "terminate">(null);
  if (q.isError) return <QueryFail error={q.error} onRetry={() => q.refetch()} notFound={c.notFound} />;
  if (!q.data) return <div className="grid gap-4"><div className="h-20 m-shimmer" /><div className="h-64 m-shimmer" /></div>;
  const { contract: ct, vendor, deposit, bills, versions, escalated } = q.data;
  const today = todayIso();
  const live = ct.status === "active" || ct.status === "expiring";
  return (
    <div className="grid gap-5">
      <PageHead
        back={<ProcLink href="/procurement/contracts" className="mb-2 inline-flex items-center gap-1 text-small text-fg-muted hover:text-fg"><Icon name="arrowRight" size={14} aria-hidden className="rotate-180" />{c.title}</ProcLink>}
        title={ct.title}
        sub={<span className="flex flex-wrap items-center gap-2"><DocNo kind="CT" no={ct.ref} copy />· {vendor ? <ProcLink href={`/procurement/suppliers/${vendor.id}`} className="underline-offset-4 hover:underline">{vendor.legalName}</ProcLink> : null}
          <ProcPill state={ct.status} machine="contract" />{ct.escalationPercent > 0 && <Pill tone="accent" icon="chart">+{ct.escalationPercent}%</Pill>}</span>}
        actions={live && (
          <MenuButton label={p.shell.actions} icon="menu" align="right">{(close) => (
            <ul className="grid text-small">
              <li><button type="button" className="h-10 w-full px-3 text-left hover:bg-navy-50" onClick={() => { close(); setDialog("edit"); }}>{c.edit}</button></li>
              <li><button type="button" className="h-10 w-full px-3 text-left hover:bg-navy-50" onClick={() => { close(); setUrlParams({ renew: "1" }); }}>{c.alert.renew}</button></li>
              <li><button type="button" className="h-10 w-full px-3 text-left text-danger hover:bg-danger-bg" onClick={() => { close(); setDialog("terminate"); }}>{c.alert.terminate}</button></li>
            </ul>
          )}</MenuButton>
        )}
      />
      {live && <RenewalAlert id={ct.id} title={ct.title} endOn={ct.endOn} noticeOn={ct.noticeOn} pct={ct.escalationPercent} escalated={escalated} snoozed={ct.snoozed}
        renewal={ct.renewal} force={u.get("renew") === "1"} onTerminate={() => setDialog("terminate")} />}
      <SavedViewTabs active={tab} onChange={(k) => setUrlParams({ tab: k === "overview" ? null : k })} views={TABS.map((t) => ({ key: t, label: c.tabs[t], count: t === "bills" ? bills.length : undefined }))} />

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] m-rise">
          <section className="grid gap-5 border border-border bg-surface p-5">
            <ContractTimeline start={ct.startOn} end={ct.endOn} notice={ct.noticeOn} today={today} reminders={ct.reminders} />
            {ct.noticeOn < today && live && <p role="alert" className="bg-warning-bg px-3 py-2 text-small text-warning">{c.alert.noticePassed}</p>}
            <dl className="grid gap-4 sm:grid-cols-3">
              <Fact label={c.cols.amount}><Amount value={ct.amount} className="font-semibold" /> · {c.freq[ct.frequency]}</Fact>
              <Fact label={c.overview.escalated}>{ct.escalationPercent ? <Amount value={escalated} /> : "—"}</Fact>
              <Fact label={c.cols.notice}>{fill(c.days, { n: ct.noticeDays })}</Fact>
              <Fact label={c.overview.noticeOn}><span className="tabular">{formatDate(ct.noticeOn, locale)}</span></Fact>
              <Fact label={c.cols.end}><span className="flex flex-wrap items-center gap-2 tabular">{formatDate(ct.endOn, locale)}{live && <ExpiryChip date={ct.endOn} today={today} />}</span></Fact>
              <Fact label={c.overview.autoRenew}>{ct.autoRenew ? c.overview.yes : c.overview.no}</Fact>
              {ct.dueDay && <Fact label={c.form.dueDay}>{fill(c.overview.dueDay, { n: ct.dueDay })}</Fact>}
              <Fact label={c.kinds.lease}>{c.kinds[ct.kind]}</Fact>
            </dl>
          </section>
          <div className="grid content-start gap-3">
            <h2 className="text-card-title">{c.overview.deposit}</h2>
            {deposit ? <DepositCard deposit={deposit} today={today} href={`/procurement/deposits?q=${deposit.no}`} /> : <p className="text-small text-fg-muted">—</p>}
          </div>
        </div>
      )}
      {tab === "documents" && (
        <ul className="grid gap-2 m-rise">
          {ct.documents.length ? ct.documents.map((d) => <li key={d.id} className="flex items-center gap-2 border border-border bg-surface p-3 text-small"><Icon name="file" size={16} aria-hidden className="text-navy-700" />{d.name}</li>)
            : <li className="border border-dashed border-border-strong p-8 text-center text-small text-fg-muted">—</li>}
        </ul>
      )}
      {tab === "reminders" && (
        <div className="overflow-x-auto border border-border bg-surface m-rise">
          <table className="w-full min-w-[32rem] text-small">
            <thead className="bg-ink-100 text-left text-eyebrow text-ink-700"><tr><th className="px-4 py-2">{c.reminders.offset}</th><th className="px-4 py-2">{c.reminders.on}</th><th className="px-4 py-2">{c.reminders.channel}</th><th className="px-4 py-2">{c.reminders.state}</th></tr></thead>
            <tbody>
              {ct.reminders.map((r) => (
                <tr key={r.key} className="border-t border-border">
                  <td className="px-4 py-2 tabular">−{r.offset} d</td><td className="px-4 py-2 tabular">{formatDate(r.on, locale)}</td>
                  <td className="px-4 py-2">{c.reminders.inApp} · {c.reminders.recipients}</td>
                  <td className="px-4 py-2"><Pill tone={r.sentAt || r.on <= today ? "success" : "neutral"} icon={r.sentAt || r.on <= today ? "check" : "clock"}>{r.sentAt || r.on <= today ? c.reminders.sent : c.reminders.scheduled}</Pill></td>
                </tr>
              ))}
              <tr className="border-t border-border bg-warning-bg/30"><td className="px-4 py-2">{c.overview.noticeOn}</td><td className="px-4 py-2 tabular">{formatDate(ct.noticeOn, locale)}</td><td colSpan={2} className="px-4 py-2 text-fg-muted">{p.timeline.notice}</td></tr>
            </tbody>
          </table>
        </div>
      )}
      {tab === "bills" && (
        bills.length ? (
          <ul className="divide-y divide-border border border-border bg-surface m-rise">
            {bills.map((b) => <li key={b.no}><ProcLink href={`/procurement/bills/${b.no}`} className="flex items-center justify-between gap-3 p-4 hover:bg-navy-50"><span className="grid"><DocNo kind="BL" no={b.no} /><span className="text-eyebrow text-fg-subtle">{formatDate(b.invoiceDate, locale)}</span></span><span className="flex items-center gap-2"><Amount value={b.total} size="sm" /><ProcPill state={b.status} machine="bill" /></span></ProcLink></li>)}
          </ul>
        ) : <p className="border border-dashed border-border-strong p-8 text-center text-small text-fg-muted">{c.noBills}</p>
      )}
      {tab === "versions" && (
        versions.length ? (
          <ol className="grid gap-2 m-rise">
            {versions.map((x) => <li key={x.id}><ProcLink href={`/procurement/contracts/${x.id}`} className="flex flex-wrap items-center justify-between gap-3 border border-border bg-surface p-3 hover:bg-navy-50"><DocNo kind="CT" no={x.ref} /><span className="text-small tabular">{formatDate(x.startOn, locale)} → {formatDate(x.endOn, locale)}</span><Amount value={x.amount} size="sm" /><ProcPill state={x.status} machine="contract" /></ProcLink></li>)}
          </ol>
        ) : <p className="border border-dashed border-border-strong p-8 text-center text-small text-fg-muted">{c.noVersions}</p>
      )}
      {tab === "history" && <HistoryList kind="contract" id={ct.id} />}

      {dialog === "edit" && <ContractForm contract={ct} onClose={() => setDialog(null)} />}
      {dialog === "terminate" && <TerminationDialog id={ct.id} ctRef={ct.ref} hasDeposit={!!deposit} onClose={() => setDialog(null)} />}
    </div>
  );
}

/** S10 alert card. Snooze hides the card for this user only; reminders still fire (−30/−7 never suppressed). */
function RenewalAlert({ id, title, endOn, noticeOn, pct, escalated, snoozed, renewal, force, onTerminate }: {
  id: string; title: string; endOn: string; noticeOn: string; pct: number; escalated: number; snoozed: boolean;
  renewal?: { amount: number; endOn: string; status: string }; force: boolean; onTerminate: () => void;
}) {
  const c = useAB().contracts;
  const { locale } = useI18n();
  const toast = useToast();
  const snooze = useSnooze();
  const today = todayIso();
  const days = daysBetween(today, endOn);
  if (renewal?.status === "requested")
    return <p role="status" className="flex items-center gap-2 bg-info-bg px-4 py-3 text-small text-info m-rise"><Icon name="clock" size={16} aria-hidden />{fill(c.alert.pending, { amount: formatMoney(renewal.amount, "RWF", locale), date: formatDate(renewal.endOn, locale) })}</p>;
  const due = days <= 90;
  if (!force && (!due || snoozed)) return snoozed && due ? <p className="text-small text-fg-muted">{fill(c.alert.snoozed, { date: formatDate(addDays(today, 7), locale) })}</p> : null;
  return (
    <section className="grid gap-3 border-l-[3px] border-gold-500 bg-gold-50 p-5 m-rise" aria-labelledby={`ra-${id}`}>
      <h2 id={`ra-${id}`} className="flex items-center gap-2 text-card-title"><Icon name="calendar" size={18} aria-hidden />{fill(c.alert.title, { name: title, n: Math.max(0, days) })}</h2>
      <p className="text-body">{fill(c.alert.body, { date: formatDate(noticeOn, locale), pct, amount: formatMoney(escalated, "RWF", locale) })}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setUrlParams({ renew: "1", wizard: "1" })} className="m-press">{c.alert.renew}</Button>
        <Button variant="secondary" onClick={onTerminate}>{c.alert.terminate}</Button>
        <Button variant="secondary" loading={snooze.isPending} onClick={async () => {
          try { await snooze.mutateAsync({ id, idempotencyKey: newIdempotencyKey() }); setUrlParams({ renew: null }); } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
        }}>{c.alert.snooze}</Button>
      </div>
      <RenewalWizard id={id} title={title} endOn={endOn} escalated={escalated} />
    </section>
  );
}

/** S11 three steps: New terms → Approval (executive, PLACEHOLDER(renewal-approver)) → Complete (addendum after approval). */
function RenewalWizard({ id, title, endOn, escalated }: { id: string; title: string; endOn: string; escalated: number }) {
  const c = useAB().contracts;
  const p = useP();
  const { locale } = useI18n();
  const u = useUrlParams();
  const m = useRenewal();
  const [key] = useState(newIdempotencyKey);
  const [f, setF] = useState({ amount: String(escalated), endOn: addDays(endOn, 365), noticeDays: "90", reason: "" });
  const [err, setErr] = useState<string | null>(null);
  const step = Number(u.get("step") ?? 0);
  const open = u.get("wizard") === "1";
  const close = () => setUrlParams({ wizard: null, step: null, renew: null });
  const differs = Number(f.amount) !== escalated;
  async function submit() {
    if (!(Number(f.amount) > 0) || f.endOn <= endOn) return setErr(c.form.endAfter);
    if (differs && !f.reason.trim()) return setErr(c.wizard.reason);
    setErr(null);
    try { await m.mutateAsync({ id, amount: Math.round(Number(f.amount)), endOn: f.endOn, noticeDays: Number(f.noticeDays), reason: f.reason, idempotencyKey: key }); setUrlParams({ step: "2" }); }
    catch (e) { setErr(errorCopy(e, locale)); }
  }
  return (
    <Dialog open={open} onClose={close} side="right" title={fill(c.wizard.title, { name: title })}
      footer={step === 0 ? <Button onClick={() => setUrlParams({ step: "1" })}>{p.common.next}</Button>
        : step === 1 ? <span className="flex gap-2"><Button variant="secondary" onClick={() => setUrlParams({ step: null })}>{p.common.back}</Button><Button loading={m.isPending} onClick={submit} className="m-press">{c.wizard.submit}</Button></span>
        : <Button onClick={close}>{p.common.close}</Button>}>
      <div className="grid gap-5">
        <Stepper steps={c.wizard.steps} current={step} />
        {err && <p role="alert" className="bg-danger-bg px-3 py-2 text-small text-danger">{err}</p>}
        {step === 0 && (
          <div className="grid gap-4 m-rise">
            <label className="grid gap-1 text-small">{c.wizard.amount}<span className="text-eyebrow text-fg-subtle">{c.wizard.amountHint}: {formatMoney(escalated, "RWF", locale)}</span>
              <Input type="number" min={0} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></label>
            {differs && <label className="grid gap-1 text-small m-rise">{c.wizard.reason}<Textarea rows={2} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></label>}
            <label className="grid gap-1 text-small">{c.wizard.end}<DateInput value={f.endOn} min={addDays(endOn, 1)} onChange={(e) => setF({ ...f, endOn: e.target.value })} /></label>
            <label className="grid gap-1 text-small">{c.wizard.notice}<Input type="number" min={0} value={f.noticeDays} onChange={(e) => setF({ ...f, noticeDays: e.target.value })} /></label>
          </div>
        )}
        {step === 1 && (
          <div className="grid gap-3 m-rise">
            <dl className="grid gap-3 bg-bg-subtle p-4 sm:grid-cols-3">
              <Fact label={c.wizard.amount}><Amount value={Number(f.amount)} className="font-semibold" /></Fact>
              <Fact label={c.wizard.end}>{formatDate(f.endOn, locale)}</Fact>
              <Fact label={c.wizard.notice}>{fill(c.days, { n: f.noticeDays })}</Fact>
            </dl>
            <p className="flex items-center gap-2 bg-info-bg px-3 py-2 text-small text-info"><Icon name="shield" size={14} aria-hidden />{c.wizard.route}</p>
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-3 m-rise">
            <p role="status" className="flex items-center gap-2 text-body font-medium text-success"><Icon name="check" size={18} aria-hidden className="m-tick" />{c.wizard.sent}</p>
            <p className="text-small text-fg-muted">{c.wizard.waiting}</p>
            <label className="grid gap-1 text-small">{c.wizard.addendum}<span className="text-eyebrow text-fg-subtle">{c.wizard.addendumHint}</span><Input type="file" disabled accept=".pdf" /></label>
          </div>
        )}
      </div>
    </Dialog>
  );
}

/** S12 checklist → terminated at the effective date; deposit return obligation (R-10) + recurring bills stop. */
function TerminationDialog({ id, ctRef, hasDeposit, onClose }: { id: string; ctRef: string; hasDeposit: boolean; onClose: () => void }) {
  const c = useAB().contracts;
  const { locale } = useI18n();
  const toast = useToast();
  const m = useTerminate();
  const [key] = useState(newIdempotencyKey);
  const [effectiveOn, setEff] = useState(todayIso);
  const [reason, setReason] = useState("");
  const items = (["notice", "handover", "deposit", "bills"] as const).filter((k) => k !== "deposit" || hasDeposit);
  const [done, setDone] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Dialog open onClose={onClose} title={c.term.title} footer={<Button variant="danger" loading={m.isPending} className="m-press" onClick={async () => {
      if (!reason.trim()) return setErr(c.term.reason);
      try { await m.mutateAsync({ id, effectiveOn, reason, checklist: done, idempotencyKey: key }); toast({ title: fill(c.term.done, { ref: ctRef }), tone: "success" }); onClose(); }
      catch (e) { setErr(errorCopy(e, locale)); }
    }}>{c.term.confirm}</Button>}>
      <div className="grid gap-4">
        {err && <p role="alert" className="bg-danger-bg px-3 py-2 text-small text-danger">{err}</p>}
        <label className="grid gap-1 text-small">{c.term.effective}<DateInput value={effectiveOn} onChange={(e) => setEff(e.target.value)} /></label>
        <label className="grid gap-1 text-small">{c.term.reason}<Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} required /></label>
        <fieldset className="grid gap-1.5"><legend className="mb-1 text-label">{c.term.checklist}</legend>
          {items.map((k) => <Checkbox key={k} label={c.term.items[k]} checked={done.includes(k)} onChange={(e) => setDone(e.target.checked ? [...done, k] : done.filter((x) => x !== k))} />)}
        </fieldset>
      </div>
    </Dialog>
  );
}
