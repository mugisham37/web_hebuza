"use client";
// U7 Invoice detail `/finance/invoices/[no]?tab=` (board 05 IN2–IN4, PI1) with fixes: every line incl. pass-through is listed,
// 5-digit numbers. Side: balance, payments, EBM field, client credit + Apply. Actions: record payment (U8), reminder,
// credit note (U12), void (step-up; hidden with an explanation once a payment is confirmed). Drafts edit + Issue.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { newIdempotencyKey, api } from "@/lib/api/client";
import { cx, formatDate, formatDateTime, formatMoney } from "@/shared/format";
import { useBAction, useInvoice, type InvoiceDetail } from "@/lib/finance/b";
import type { DocLine } from "@/shared/finance/types";
import { financeInvoices } from "@/content/pages/finance-invoices";
import { financeQuotes } from "@/content/pages/finance-quotes";
import { fill } from "@/content/pages/finance-common";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { Dialog } from "@/components/atoms/dialog";
import { Tabs } from "@/components/atoms/tabs";
import { Field, Input, Radio } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { EmptyPanel, PanelError, ReasonDialog } from "@/components/molecules/ops/ops";
import { usePhone } from "@/components/atoms/step-up";
import { PageHead, SkeletonRows } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { Amount, DocNumber, EbmBadge, FinStatus, MethodTag, SeriesTag } from "@/components/atoms/finance";
import { HistoryTab, LineEditor, NoAccess, TotalsPanel, useStepUpAction } from "@/components/molecules/finance/finance";
import { BackLink, DocumentPreview, Meta, fresh, useBError } from "@/components/molecules/finance/finance";

type Q = ReturnType<typeof useInvoice>;
const TABS = ["details", "payments", "credit", "documents", "reminders", "history"] as const;

export function InvoiceView({ no }: { no: string }) {
  const { locale } = useI18n();
  const c = financeInvoices(locale);
  const q = useInvoice(no);
  const p = useUrlParams();
  const phone = usePhone();
  const tab = (TABS as readonly string[]).includes(p.get("tab") ?? "") ? p.get("tab")! : "details";
  const back = <BackLink href="/finance/invoices">{c.back}</BackLink>;
  if (q.isPending) return <div className="grid gap-4">{back}<div className="h-12 w-1/2 m-shimmer" /><div className="grid gap-4 lg:grid-cols-[1fr_21rem]"><SkeletonRows n={5} /><div className="h-80 m-shimmer" /></div></div>;
  if (q.isError) {
    if ((q.error as { status?: number }).status === 403) return <NoAccess />;
    return <div className="grid gap-4">{back}<PanelError what={no} onRetry={() => q.refetch()} /></div>;
  }
  const d = q.data;
  const inv = d.invoice;
  const title = (
    <span className="flex flex-wrap items-center gap-3">
      {inv.no ? <DocNumber no={inv.no} void={inv.status === "void"} /> : <span className="text-fg-muted">{c.views.drafts}</span>}
      <FinStatus status={inv.status} kind="invoice" />
      {inv.overdue && <FinStatus status="overdue" kind="invoice" />}
      {inv.series !== "standard" && <SeriesTag series={inv.series} />}
    </span>
  );
  return (
    <div className="grid gap-5">
      <PageHead back={back} title={title} sub={<>{inv.clientName}{inv.caseRef ? ` · ${inv.caseRef}` : ""}</>} />
      {phone && <PhoneCard d={d} />}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <Tabs className="min-w-0" value={tab} onChange={(id) => setUrlParams({ tab: id === "details" ? null : id })} tabs={[
          { id: "details", label: c.tabs.details, content: <Details d={d} q={q} /> },
          { id: "payments", label: c.tabs.payments, count: d.payments.length, content: <PaymentsTab d={d} /> },
          { id: "credit", label: c.tabs.credit, count: d.creditNotes.length, content: <CreditTab d={d} /> },
          { id: "documents", label: c.tabs.documents, content: <DocsTab d={d} /> },
          { id: "reminders", label: c.tabs.reminders, count: d.reminders.length, content: <RemindersTab d={d} /> },
          { id: "history", label: c.tabs.history, content: <div className="pt-4"><HistoryTab resourceType="invoice" resourceId={inv.key} /></div> },
        ]} />
        <Side d={d} q={q} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- details (IN2 / IN4)
function Details({ d, q }: { d: InvoiceDetail; q: Q }) {
  const { locale } = useI18n();
  const c = financeInvoices(locale);
  const cq = financeQuotes(locale);
  const inv = d.invoice;
  const phone = usePhone();
  return (
    <div className="grid gap-5 pt-4 m-stagger">
      {inv.status === "void" && inv.voidReason && <p style={{ ["--i" as string]: 0 }} role="status" className="bg-bg-subtle px-4 py-3 text-small">{fill(c.voided, { reason: inv.voidReason })}</p>}
      {inv.series === "deposit" && d.quoteNo && <p style={{ ["--i" as string]: 0 }} className="bg-bg-tint px-4 py-3 text-small text-navy-800"><span className="font-medium">{c.deposit.title}. </span>{fill(c.deposit.body, { no: d.quoteNo })}</p>}
      <dl style={{ ["--i" as string]: 1 }} className="grid gap-4 border border-border bg-white p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
        <Meta label={c.fields.client}>{inv.clientName}</Meta>
        <Meta label={c.fields.case}><span className="tabular">{inv.caseRef ?? c.fields.none}</span></Meta>
        <Meta label={c.fields.issued}><span className="tabular">{inv.issuedAt ? formatDate(inv.issuedAt, locale) : c.fields.none}</span></Meta>
        <Meta label={c.fields.due}><span className={cx("tabular", inv.overdue && "font-medium text-danger")}>{inv.dueAt ? formatDate(inv.dueAt, locale) : c.fields.none}</span></Meta>
        <Meta label={c.fields.language}>{cq.langs[d.lang]}</Meta>
        {d.quoteNo && <Meta label={c.fields.quote}><DocNumber no={d.quoteNo} href={localHref(locale, `/finance/quotes/${d.quoteNo}`)} /></Meta>}
      </dl>
      {inv.status === "draft" && !phone ? <DraftEditor key={inv.rev} d={d} q={q} /> : (
        <div style={{ ["--i" as string]: 2 }} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <LineEditor lines={inv.lines} readOnly />
          <TotalsPanel totals={inv.totals} className="lg:static" />
        </div>
      )}
      {inv.status !== "draft" && <Statement d={d} />}
    </div>
  );
}

/** IN4 running statement, figures straight from the API (no client maths). */
function Statement({ d }: { d: InvoiceDetail }) {
  const { locale } = useI18n();
  const c = financeInvoices(locale);
  const inv = d.invoice;
  const confirmed = d.payments.filter((p) => p.state === "confirmed" || p.state === "confirmed_late");
  const rows = [
    ...(inv.issuedAt ? [{ at: inv.issuedAt, label: c.statement.invoiced, amount: inv.totals.total, tone: "" }] : []),
    ...confirmed.map((p) => ({ at: p.at, label: `${c.statement.paid} · ${p.receiptNo ?? p.id}`, amount: -(p.amountReceived ?? p.amountExpected), tone: "text-success" })),
    ...d.statement.map((s) => ({ at: s.at, label: c.statement[s.label as "credit_applied"] ?? s.label, amount: -s.amount, tone: "text-navy-600" })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <section style={{ ["--i" as string]: 3 }} className="border border-border bg-white p-4 sm:p-5">
      <h2 className="mb-3 text-card-title">{c.statement.title}</h2>
      <ol className="grid gap-2 m-stagger">
        {rows.map((r, i) => (
          <li key={i} style={{ ["--i" as string]: i }} className="flex flex-wrap items-center gap-3 px-2 py-1.5 hover:bg-navy-50">
            <Icon name={r.amount < 0 ? "check" : "file"} size={16} aria-hidden className={r.tone || "text-fg-subtle"} />
            <span className="min-w-0 flex-1 text-small">{r.label}<span className="block text-eyebrow text-fg-subtle tabular">{formatDateTime(r.at, locale)}</span></span>
            <Amount value={r.amount} size="sm" />
          </li>
        ))}
      </ol>
      <p className={cx("mt-3 flex items-center justify-between gap-3 px-3 py-2.5 text-small", d.credit > 0 ? "bg-success-bg text-success" : "bg-bg-subtle")}>
        <span className="flex items-center gap-2"><Icon name="wallet" size={16} aria-hidden />{c.statement.running}</span>
        {d.credit > 0 ? <Amount value={d.credit} credit size="sm" /> : <Amount value={inv.balanceDue} size="sm" />}
      </p>
      {d.credit > 0 && <p className="mt-2 text-eyebrow text-fg-subtle">{c.overpay}</p>}
    </section>
  );
}

function DraftEditor({ d, q }: { d: InvoiceDetail; q: Q }) {
  const { locale } = useI18n();
  const c = financeInvoices(locale);
  const toast = useToast();
  const router = useRouter();
  const online = useOnline();
  const inv = d.invoice;
  const [lines, setLines] = useState<DocLine[]>(inv.lines);
  const [dirty, setDirty] = useState(false);
  const [issue, setIssue] = useState(false);
  const act = useBAction<InvoiceDetail>("patch");
  const { onError, dialog } = useBError(() => (d.changedBy ? { name: d.changedBy.name, at: d.changedAt ?? "" } : null), () => q.refetch());
  const save = () => act.mutate({ req: (h) => api.PATCH("/api/finance/invoices/{key}", { params: { path: { key: inv.key } }, body: { rev: inv.rev, lines }, headers: h }) }, {
    onSuccess: () => { setDirty(false); toast({ title: c.new.created, tone: "success" }); }, onError,
  });
  return (
    <div className="grid gap-4">
      <p role="status" className="flex items-center gap-2 bg-info-bg px-4 py-3 text-small text-info"><Icon name="file" size={16} aria-hidden />{c.draftNote}</p>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <LineEditor lines={lines} onChange={(l) => { setLines(l); setDirty(true); }} />
        <div className="grid content-start gap-3">
          <TotalsPanel totals={inv.totals} className="lg:static" />
          <Button variant="outline" disabled={!dirty || !online} loading={act.isPending} onClick={save}>{c.actions.save}</Button>
          <Button dots disabled={dirty || !online} title={!online ? c.offline : undefined} onClick={async () => { await fresh(q); setIssue(true); }} className="m-press">{c.actions.issue}</Button>
        </div>
      </div>
      {issue && <IssueDialog invKey={inv.key} rev={inv.rev} series="INV" onClose={() => setIssue(false)} onIssued={(no) => { setIssue(false); router.replace(localHref(locale, `/finance/invoices/${no}`)); }} />}
      {dialog}
    </div>
  );
}

/** "This assigns INV-YYYY-•••••" → POST issue; the number pops in on the record (DocNumber m-pop). */
export function IssueDialog({ invKey, rev, series, onClose, onIssued }: { invKey: string; rev: number; series: string; onClose: () => void; onIssued: (no: string) => void }) {
  const { locale } = useI18n();
  const c = financeInvoices(locale);
  const toast = useToast();
  const [key] = useState(newIdempotencyKey);
  const act = useBAction<InvoiceDetail>();
  const { onError, dialog } = useBError(() => null, onClose);
  const year = new Date().getFullYear();
  return (
    <Dialog open onClose={onClose} title={c.issue.title} footer={<>
      <Button variant="outline" onClick={onClose}>{c.issue.cancel}</Button>
      <Button dots loading={act.isPending} className="m-press" onClick={() => act.mutate({ req: (h) => api.POST("/api/finance/invoices/{key}/issue", { params: { path: { key: invKey } }, body: { rev }, headers: h }), key }, {
        onSuccess: (r) => { const no = r.invoice.no ?? invKey; toast({ title: fill(c.issue.done, { no }), tone: "success" }); onIssued(no); },
        onError,
      })}>{c.issue.confirm}</Button>
    </>}>
      <div className="grid place-items-center gap-3 bg-bg-tint p-5 text-center">
        <span className="bg-white px-4 py-2 text-card-title tabular m-pop">{series}-{year}-•••••</span>
        <p className="text-small text-navy-800">{fill(c.issue.body, { series: `${series}-${year}` })}</p>
      </div>
      {dialog}
    </Dialog>
  );
}

// ---------------------------------------------------------------- side panel
function Side({ d, q }: { d: InvoiceDetail; q: Q }) {
  const { locale } = useI18n();
  const c = financeInvoices(locale);
  const toast = useToast();
  const online = useOnline();
  const inv = d.invoice;
  const [applyOpen, setApply] = useState(false);
  const [remind, setRemind] = useState(false);
  const [voidOpen, setVoid] = useState(false);
  const [key, setKey] = useState(newIdempotencyKey);
  const act = useBAction<InvoiceDetail>();
  const step = useStepUpAction();
  const { onError, dialog } = useBError(() => (d.changedBy ? { name: d.changedBy.name, at: d.changedAt ?? "" } : null), () => q.refetch());
  const confirmed = d.payments.filter((p) => p.state === "confirmed" || p.state === "confirmed_late");
  const live = inv.status !== "draft" && inv.status !== "void";
  const payable = live && inv.balanceDue > 0;
  const canVoid = inv.status === "issued" && !d.confirmedPayments && inv.amountPaid === 0;
  const off = !online ? c.offline : undefined;
  return (
    <aside className="grid content-start gap-4 lg:sticky lg:top-20">
      <section className="grid gap-4 border border-border bg-white p-4 sm:p-5 m-rise">
        <div>
          <p className="text-small text-fg-muted">{c.side.balance}</p>
          <span key={inv.balanceDue} className="block m-rise"><Amount value={inv.balanceDue} size="xl" className={inv.overdue ? "text-danger" : undefined} /></span>
        </div>
        <div>
          <p className="mb-2 text-label">{c.side.payments}</p>
          {!confirmed.length ? <p className="text-small text-fg-muted">{c.side.noPayments}</p> : (
            <ul className="grid gap-2">
              {confirmed.map((p) => (
                <li key={p.id} className="flex items-start gap-2">
                  <Icon name="check" size={16} aria-hidden className="mt-0.5 text-success" />
                  <span className="grid gap-0.5 text-small"><Amount value={p.amountReceived ?? p.amountExpected} size="sm" className="font-medium" /><span className="flex flex-wrap items-center gap-1.5"><MethodTag method={p.method} /><span className="text-eyebrow text-fg-subtle tabular">{formatDateTime(p.at, locale)}</span></span></span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {live && <EbmField d={d} q={q} />}
        <div className="bg-bg-tint p-3">
          <p className="text-small text-navy-800">{c.side.credit}</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            {d.credit > 0 ? <span className="text-label">{fill(c.side.available, { amount: formatMoney(d.credit, "RWF", locale) })}</span> : <span className="text-small text-fg-muted">{c.side.noCredit}</span>}
            {d.credit > 0 && payable && <Button size="sm" variant="primary" disabled={!online} title={off} onClick={async () => { await fresh(q); setApply(true); }} className="m-press">{c.side.apply}</Button>}
          </div>
        </div>
      </section>
      {live && (
        <section className="grid gap-2">
          {payable && <ButtonLink href={localHref(locale, `/finance/payments?tab=record&invoice=${inv.no}`)} dots aria-disabled={!online} className="m-press">{c.actions.record}</ButtonLink>}
          {payable && <Button variant="outline" disabled={!online} title={off} onClick={() => { setKey(newIdempotencyKey()); setRemind(true); }}>{c.actions.remind}</Button>}
          {(inv.status === "paid" || inv.status === "partially_paid") && <ButtonLink variant="outline" href={localHref(locale, `/finance/refunds?new=credit&invoice=${inv.no}`)}>{c.actions.creditNote}</ButtonLink>}
          {canVoid
            ? <Button variant="ghost" className="text-danger" disabled={!online} title={off} onClick={() => setVoid(true)}>{c.actions.void}</Button>
            : inv.status !== "credited" && <p className="flex items-start gap-2 bg-bg-subtle p-3 text-small text-fg-muted"><Icon name="lock" size={14} aria-hidden className="mt-0.5 shrink-0" />{c.voidBlocked}</p>}
        </section>
      )}
      {applyOpen && <ApplyCreditDialog d={d} onClose={() => setApply(false)} onError={onError} />}
      <Dialog open={remind} onClose={() => setRemind(false)} title={c.remind.title} description={inv.no ?? undefined}>
        <form className="grid gap-4" onSubmit={(e) => {
          e.preventDefault();
          const channel = new FormData(e.currentTarget).get("channel") as "email" | "whatsapp" | "sms"; // radio group values
          act.mutate({ req: (h) => api.POST("/api/finance/invoices/{key}/remind", { params: { path: { key: inv.key } }, body: { channel }, headers: h }), key }, { onSuccess: () => { setRemind(false); toast({ title: c.remind.done, tone: "success" }); }, onError });
        }}>
          <fieldset className="grid gap-2"><legend className="mb-1 text-label">{c.remind.channel}</legend>
            {(["email", "whatsapp", "sms"] as const).map((k, i) => <Radio key={k} name="channel" value={k} defaultChecked={i === 0} label={c.remind.channels[k]} />)}
          </fieldset>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setRemind(false)}>{c.issue.cancel}</Button><Button type="submit" loading={act.isPending}>{c.remind.confirm}</Button></div>
        </form>
      </Dialog>
      <ReasonDialog open={voidOpen} onClose={() => setVoid(false)} title={fill(c.void.title, { no: inv.no ?? "" })} description={c.void.body} destructive audited
        options={Object.entries(c.void.reasons).map(([value, label]) => ({ value, label }))} noteLabel={c.void.note} confirmLabel={c.void.confirm}
        onConfirm={async ({ reason, note }) => {
          if (!note) throw new Error(c.void.note);
          await step.run(c.void.confirm, (token) => act.mutateAsync({ req: (h) => api.POST("/api/finance/invoices/{key}/void", { params: { path: { key: inv.key } }, body: { rev: inv.rev, reason: c.void.reasons[reason], note }, headers: h }), key, stepUp: token }));
          toast({ title: fill(c.void.done, { no: inv.no ?? "" }), tone: "success" });
        }} />
      {step.dialog}
      {dialog}
    </aside>
  );
}

function EbmField({ d, q }: { d: InvoiceDetail; q: Q }) {
  const { locale } = useI18n();
  const c = financeInvoices(locale);
  const toast = useToast();
  const online = useOnline();
  const inv = d.invoice;
  const [v, setV] = useState(inv.ebmReceiptNo ?? "");
  const [err, setErr] = useState<string | undefined>();
  const [key] = useState(newIdempotencyKey);
  const act = useBAction<InvoiceDetail>();
  const { onError, dialog } = useBError(() => (d.changedBy ? { name: d.changedBy.name, at: d.changedAt ?? "" } : null), () => q.refetch());
  const changed = v.trim().toUpperCase() !== (inv.ebmReceiptNo ?? "");
  return (
    <form className="grid gap-2" onSubmit={(e) => {
      e.preventDefault();
      if (!/^[A-Z0-9-]{4,30}$/i.test(v.trim())) return setErr(c.side.ebmError);
      act.mutate({ req: (h) => api.POST("/api/finance/invoices/{key}/ebm", { params: { path: { key: inv.key } }, body: { rev: inv.rev, no: v }, headers: h }), key }, { onSuccess: () => toast({ title: c.side.ebmSaved, tone: "success" }), onError });
    }}>
      <Field label={<span className="flex items-center gap-2">{c.side.ebm}{!inv.ebmReceiptNo && inv.ebmRequired && <EbmBadge required />}</span>} hint={c.side.ebmHint} error={err}>
        {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} value={v} onChange={(e) => { setV(e.target.value); setErr(undefined); }} className="h-10 uppercase tabular" />}
      </Field>
      {changed && <Button type="submit" size="sm" variant="outline" disabled={!online} loading={act.isPending} className="w-fit m-rise">{c.side.ebmSave}</Button>}
      {dialog}
    </form>
  );
}

/** Amount ≤ min(credit, balance); the input clamps, the server re-checks (422 exceeds_credit / exceeds_invoice). */
function ApplyCreditDialog({ d, onClose, onError }: { d: InvoiceDetail; onClose: () => void; onError: (e: unknown) => void }) {
  const { locale } = useI18n();
  const c = financeInvoices(locale);
  const toast = useToast();
  const inv = d.invoice;
  const max = Math.min(d.credit, inv.balanceDue);
  const [amount, setAmount] = useState(String(max));
  const [err, setErr] = useState<string | undefined>();
  const [key] = useState(newIdempotencyKey);
  const act = useBAction<InvoiceDetail>();
  const n = Number(amount);
  const submit = () => {
    if (!Number.isInteger(n) || n <= 0) return setErr(c.credit.error);
    if (n > max) { setAmount(String(max)); return setErr(fill(c.credit.over, { amount: formatMoney(max, "RWF", locale) })); }
    act.mutate({ req: (h) => api.POST("/api/finance/invoices/{key}/apply-credit", { params: { path: { key: inv.key } }, body: { rev: inv.rev, amount: n }, headers: h }), key }, {
      onSuccess: () => { toast({ title: fill(c.credit.done, { amount: formatMoney(n, "RWF", locale) }), tone: "success" }); onClose(); },
      onError: (e) => { onClose(); onError(e); },
    });
  };
  return (
    <Dialog open onClose={onClose} title={c.credit.title} description={c.credit.body} footer={<>
      <Button variant="outline" onClick={onClose}>{c.issue.cancel}</Button>
      <Button loading={act.isPending} onClick={submit} className="m-press">{c.credit.confirm}</Button>
    </>}>
      <div className="grid gap-4">
        <dl className="grid grid-cols-2 gap-3">
          <div className="bg-bg-tint p-3"><dt className="text-eyebrow text-navy-800">{c.credit.available}</dt><dd><Amount value={d.credit} size="lg" /></dd></div>
          <div className="bg-ink-100 p-3"><dt className="text-eyebrow text-fg-subtle">{c.credit.balance}</dt><dd><Amount value={inv.balanceDue} size="lg" /></dd></div>
        </dl>
        <Field label={c.credit.amount} hint={fill(c.credit.max, { amount: formatMoney(max, "RWF", locale) })} error={err}>
          {({ id, describedBy, invalid }) => (
            <div className="flex gap-2">
              <Input id={id} inputMode="numeric" aria-describedby={describedBy} aria-invalid={invalid} value={amount} onChange={(e) => { setAmount(e.target.value.replace(/\D/g, "")); setErr(undefined); }} className="h-11 tabular" />
              <Button variant="secondary" onClick={() => { setAmount(String(max)); setErr(undefined); }}>{c.credit.useMax}</Button>
            </div>
          )}
        </Field>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------- tabs
function PaymentsTab({ d }: { d: InvoiceDetail }) {
  const { locale } = useI18n();
  const c = financeInvoices(locale);
  if (!d.payments.length) return <div className="pt-4"><EmptyPanel compact title={c.paymentsTab.empty} /></div>;
  return (
    <ul className="grid gap-2 pt-4 m-stagger">
      {d.payments.map((p, i) => (
        <li key={p.id} style={{ ["--i" as string]: i }} className="flex flex-wrap items-center gap-3 border border-border bg-white p-3 m-lift">
          <MethodTag method={p.method} />
          <span className="min-w-0 flex-1"><Amount value={p.amountReceived ?? p.amountExpected} className="font-medium" /><span className="block text-eyebrow text-fg-subtle tabular">{formatDateTime(p.at, locale)}{p.receiptNo ? ` · ${c.paymentsTab.receipt} ${p.receiptNo}` : ""}</span></span>
          <FinStatus status={p.state} kind="payment" />
          <a href={localHref(locale, `/finance/payments?id=${p.id}`)} className="text-small text-link hover:text-link-hover underline-offset-4 hover:underline">{c.paymentsTab.open}</a>
        </li>
      ))}
    </ul>
  );
}

function CreditTab({ d }: { d: InvoiceDetail }) {
  const { locale } = useI18n();
  const c = financeInvoices(locale);
  if (!d.creditNotes.length) return <div className="pt-4"><EmptyPanel compact title={c.creditTab.empty} /></div>;
  return (
    <ul className="grid gap-2 pt-4 m-stagger">
      {d.creditNotes.map((n, i) => (
        <li key={n.no} style={{ ["--i" as string]: i }} className="flex flex-wrap items-center gap-3 border border-border bg-white p-3">
          <DocNumber no={n.no} href={localHref(locale, `/finance/credit-notes/${n.no}`)} />
          <span className="min-w-0 flex-1 text-eyebrow text-fg-subtle tabular">{formatDate(n.issuedAt, locale)} · {n.issuedBy.name}</span>
          <Amount value={-n.totals.total} />
        </li>
      ))}
    </ul>
  );
}

function DocsTab({ d }: { d: InvoiceDetail }) {
  const { locale } = useI18n();
  const c = financeInvoices(locale);
  const cq = financeQuotes(locale);
  const [open, setOpen] = useState(false);
  const inv = d.invoice;
  const row = (icon: "file" | "fileCheck", label: string, action: React.ReactNode, k: string) => (
    <li key={k} className="flex items-center gap-3 border border-border bg-white p-3"><Icon name={icon} size={18} aria-hidden className="text-navy-600" /><span className="min-w-0 flex-1 text-small">{label}</span>{action}</li>
  );
  return (
    <>
      <ul className="grid gap-2 pt-4">
        {row("file", fill(c.docsTab.invoice, { lang: cq.langs[d.lang] }), <Button size="sm" variant="outline" onClick={() => setOpen(true)}>{c.docsTab.preview}</Button>, "inv")}
        {d.payments.filter((p) => p.receiptNo).map((p) => row("fileCheck", fill(c.docsTab.receipt, { no: p.receiptNo! }), <a className="text-small text-link hover:text-link-hover" href={localHref(locale, `/finance/payments?id=${p.id}`)}>{c.paymentsTab.open}</a>, p.id))}
        {d.creditNotes.map((n) => row("file", fill(c.docsTab.creditNote, { no: n.no }), <a className="text-small text-link hover:text-link-hover" href={localHref(locale, `/finance/credit-notes/${n.no}`)}>{c.creditTab.open}</a>, n.no))}
      </ul>
      <DocumentPreview open={open} onClose={() => setOpen(false)} title={c.actions.pdf} kindLabel={c.title} no={inv.no} billTo={inv.billTo}
        date={inv.issuedAt ?? inv.dueAt ?? ""} lines={inv.lines} totals={inv.totals} lang={d.lang}
        extra={inv.ebmReceiptNo ? <p className="text-eyebrow text-fg-subtle">EBM {inv.ebmReceiptNo}</p> : undefined} />
    </>
  );
}

function RemindersTab({ d }: { d: InvoiceDetail }) {
  const { locale } = useI18n();
  const c = financeInvoices(locale);
  if (!d.reminders.length) return <div className="pt-4"><EmptyPanel compact title={c.remindersTab.empty} /></div>;
  return (
    <ol className="grid gap-2 pt-4 m-stagger">
      {d.reminders.map((r, i) => (
        <li key={i} style={{ ["--i" as string]: i }} className="flex flex-wrap items-center gap-3 border border-border bg-white p-3">
          <Icon name={r.channel === "email" ? "mail" : "message"} size={16} aria-hidden className="text-navy-600" />
          <span className="min-w-0 flex-1 text-small">{c.remind.channels[r.channel]} · {r.auto ? c.remindersTab.auto : fill(c.remindersTab.by, { who: r.by })}</span>
          <span className="text-eyebrow text-fg-subtle tabular">{formatDateTime(r.at, locale)}</span>
        </li>
      ))}
    </ol>
  );
}

/** PI1: compact phone summary above the tabs. */
function PhoneCard({ d }: { d: InvoiceDetail }) {
  const { locale } = useI18n();
  const c = financeInvoices(locale);
  const inv = d.invoice;
  return (
    <section className="grid gap-2 bg-bg-tint p-4 m-rise">
      <p className="text-small text-navy-800">{c.fields.client}: {inv.clientName}</p>
      <div className="flex items-baseline justify-between"><span className="text-small">{c.cols.total}</span><Amount value={inv.totals.total} /></div>
      <div className="flex items-baseline justify-between"><span className="text-small">{c.cols.balance}</span><Amount value={inv.balanceDue} size="lg" className="font-medium" /></div>
    </section>
  );
}
