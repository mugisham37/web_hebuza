"use client";
// U11 Receivables & ageing (board 08 with the Fix column: no IDs in UI, "90+ days", navy shell, seed dates).
// Tiles · ageing bar (+ table) · client table (not yet due + 4 buckets, D-11) · client drawer · reminder composer · phone glance.
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cx, formatDate, formatDateTime, formatMoney, formatRelative } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { newIdempotencyKey } from "@/lib/api/client";
import { BUCKETS, type Bucket } from "@/shared/finance/ageing";
import { useArClient, useArNote, useReceivables, useRemind, type ArClient, type ArClientDetail, type ArInvoice, type Channel } from "@/lib/finance/d";
import type { Locale } from "@/shared/i18n/config";
import { localHref } from "@/shared/i18n/config";
import { useShortcut } from "@/lib/ops/shortcuts";
import { REMINDER_TEMPLATES } from "@/content/pages/finance-receivables";
import { Amount, AgeingBucketChip, DocNumber, FinStatus, MethodTag, useF } from "@/components/atoms/finance";
import { AgeingBar, MoneyTile, NoAccess } from "@/components/molecules/finance/finance";
import { ArtNoOverdue } from "@/components/atoms/finance-art";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { EmptyPanel, Panel, PanelError } from "@/components/molecules/ops/ops";
import { usePhone } from "@/components/atoms/step-up";
import { PageHead, SkeletonRows, useNow } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { Dialog } from "@/components/atoms/dialog";
import { Tabs } from "@/components/atoms/tabs";
import { Button } from "@/components/atoms/button";
import { DateInput, Field, Input, Select, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { ChannelPreview, Reason, errorCopy, fill, isForbidden, useRC } from "@/components/molecules/finance/refunds";
import { errType } from "@/components/atoms/hooks";

const KIGALI_H = (ms: number) => (new Date(ms).getUTCHours() + 2) % 24;

export function ReceivablesView() {
  const c = useRC();
  const f = useF();
  const { locale } = useI18n();
  const q = useReceivables();
  const p = useUrlParams();
  const bucket = (BUCKETS as readonly string[]).includes(p.get("bucket") ?? "") ? (p.get("bucket") as Bucket) : null;
  const clientId = p.get("client");
  const search = p.get("q") ?? "";
  const [focused, setFocused] = useState<string | null>(null);
  const L = (s: string) => localHref(locale, s);
  useShortcut("/", c.search, () => document.querySelector<HTMLInputElement>('input[type="search"]')?.focus(), "list");

  if (q.isError && isForbidden(q.error)) return <NoAccess />;
  const d = q.data;
  const rows = (d?.clients ?? []).filter((r) => (!bucket || r.buckets[bucket] > 0) && (!search || r.name.toLowerCase().includes(search.toLowerCase())));
  const over90 = d?.clients.filter((x) => x.buckets["90_plus"] > 0).length ?? 0;
  // Display ratio only (not money): share of the receivable that is overdue 31+.
  const pct = d && d.total ? new Intl.NumberFormat(locale, { style: "percent" }).format(d.overdue31 / d.total) : "";

  const cols: OpsColumn<ArClient>[] = [
    { key: "client", label: c.cols.client, wrap: true, sort: (r) => r.name, cell: (r) => (
      <span className="grid"><span className="font-medium">{r.name}</span><span className="text-eyebrow text-fg-subtle tabular">{r.invoices} × {c.inv.no.toLowerCase()}</span></span>
    ) },
    { key: "outstanding", label: c.cols.outstanding, align: "right", sort: (r) => r.outstanding, cell: (r) => <Amount value={r.outstanding} className="font-semibold" /> },
    ...BUCKETS.map((b): OpsColumn<ArClient> => ({
      key: b, label: f.bucket[b], align: "right", card: false, sort: (r) => r.buckets[b],
      cell: (r) => (r.buckets[b] ? <Amount value={r.buckets[b]} size="sm" className={b === "90_plus" ? "text-danger" : undefined} /> : <span className="text-fg-subtle"></span>),
    })),
    { key: "oldest", label: c.cols.oldest, sort: (r) => r.oldestDays, cell: (r) => (
      <span className="flex items-center gap-2"><AgeingBucketChip bucket={r.bucket} />{r.oldestDays > 0 && <span className="text-eyebrow text-fg-subtle tabular">{fill(c.days, { n: r.oldestDays })}</span>}</span>
    ) },
    { key: "credit", label: c.cols.credit, align: "right", cell: (r) => (r.credit ? <Amount value={r.credit} credit size="sm" /> : <span className="text-fg-subtle"></span>) },
    { key: "reminder", label: c.cols.reminder, cell: (r) => (r.lastReminder ? <span className="text-small">{formatRelative(r.lastReminder.at, locale)} · {c.rem.channels[r.lastReminder.channel]}</span> : <span className="text-small text-fg-subtle">{c.drawer.noReminder}</span>) },
    { key: "promise", label: c.cols.promise, wrap: true, cell: (r) => (r.promise ? <span className="inline-flex items-center gap-1 bg-navy-50 px-2 py-0.5 text-eyebrow text-navy-800"><Icon name="calendar" size={12} aria-hidden />{formatDate(r.promise.at, locale)}</span> : <span className="text-fg-subtle"></span>) },
  ];

  const emptyCopy = !d?.clients.length ? c.empty : search ? c.emptySearch : c.emptyBucket;
  const vars = { q: search, bucket: bucket ? f.bucket[bucket] : "" };

  return (
    <div className="grid gap-6">
      <PageHead
        title={c.title}
        sub={<>{c.sub}{d && <span className="ml-2 text-small text-fg-subtle">· {fill(c.asOf, { t: formatDateTime(d.asOf, locale) })}</span>}</>}
      />

      {/* PA1 phone glance */}
      {d && d.total > 0 && (
        <section aria-label={c.title} className="grid gap-2 theme-dark bg-navy-900 p-5 text-fg md:hidden m-rise">
          <span className="text-small opacity-80">{c.tiles.total}</span>
          <span key={d.total} className="m-rise"><Amount value={d.total} size="xl" /></span>
          <span className="text-small text-gold-400">{fill(c.phone.overdue, { pct })}</span>
          {over90 > 0 && (
            <button type="button" onClick={() => setUrlParams({ bucket: "90_plus" })} className="mt-2 flex items-center gap-2 bg-white/10 px-3 py-2.5 text-left text-small m-press">
              <Icon name="zap" size={16} aria-hidden className="text-warning" />{fill(c.phone.over90, { n: over90 })}
            </button>
          )}
        </section>
      )}

      <section aria-label={c.ageing} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 m-stagger max-md:hidden">
        {([
          ["total", c.tiles.total, d?.total, "wallet", null],
          ["overdue", c.tiles.overdue, d?.overdue31, "zap", "31_60"],
          ["due", c.tiles.due0_30, d?.due0_30, "clock", "0_30"],
          ["over90", c.tiles.over90, d?.over90, "lock", "90_plus"],
        ] as const).map(([k, label, value, icon, b], i) => (
          <div key={k} style={{ ["--i" as string]: i }}>
            <MoneyTile label={label} value={value} icon={icon} loading={q.isPending} error={q.isError} onRetry={() => q.refetch()} tone={k === "total" ? "lavender" : "white"}
              count={k === "total" && d ? fill(c.tiles.clients, { n: d.clients.length }) : undefined}
              href={b ? `${L("/finance/receivables")}?bucket=${b}` : undefined} />
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <Panel title={c.ageing} className="m-rise">
          {q.isPending ? <SkeletonRows n={2} /> : q.isError ? <PanelError what={c.ageing} onRetry={() => q.refetch()} /> : (
            <AgeingBar buckets={d!.buckets} onPick={(b) => setUrlParams({ bucket: b === bucket ? null : b })} />
          )}
        </Panel>

        <Panel title={c.clients} padded={false} className="m-rise" action={
          <div className="flex flex-wrap items-center gap-2 px-4 sm:px-0">
            {bucket && (
              <button type="button" onClick={() => setUrlParams({ bucket: null })} className="inline-flex h-9 items-center gap-1.5 bg-navy-50 px-3 text-small text-navy-800 m-press">
                {fill(c.showing, { bucket: f.bucket[bucket] })}<Icon name="x" size={12} aria-hidden /><span className="sr-only">{c.clear}</span>
              </button>
            )}
            <label className="relative">
              <span className="sr-only">{c.search}</span>
              <Icon name="search" size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
              <Input type="search" defaultValue={search} placeholder={c.search} onChange={(e) => setUrlParams({ q: e.target.value || null })} className="h-9 w-56 max-w-full pl-9 text-small" />
            </label>
          </div>
        }>
          <div className="px-0 pb-2">
            <OpsTable
              rows={rows} columns={cols} rowKey={(r) => r.clientId} rowLabel={(r) => r.name} label={c.clients}
              loading={q.isPending} error={q.isError ? q.error : undefined} onRetry={() => q.refetch()}
              focused={focused} onFocus={setFocused} onOpen={(r) => setUrlParams({ client: r.clientId })} shortcuts
              rowTone={(r) => (r.buckets["90_plus"] > 0 ? "danger" : null)}
              empty={
                <div className="p-4">
                  <EmptyPanel title={fill(emptyCopy[0], vars)} body={fill(emptyCopy[1], vars)}
                    action={!d?.clients.length ? <ArtNoOverdue /> : <Button size="sm" variant="outline" onClick={() => setUrlParams({ bucket: null, q: null })}>{c.clear}</Button>} />
                </div>
              }
            />
          </div>
        </Panel>
      </div>

      <ClientDrawer id={clientId} onClose={() => setUrlParams({ client: null })} />
    </div>
  );
}

// ---------------------------------------------------------------- AR2 client drawer
function ClientDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const c = useRC();
  const q = useArClient(id);
  const phone = usePhone();
  const [tab, setTab] = useState("overview");
  const [remind, setRemind] = useState<ArInvoice | null>(null);
  const online = useOnline();
  const d = q.data;
  return (
    <>
      <Dialog open={!!id} onClose={onClose} side={phone ? "bottom" : "right"} className={phone ? "max-h-[90dvh]" : "max-w-xl"}
        title={d ? d.client.name : c.clientWhat}
        description={d ? `${d.client.type} · ${c.drawer.lang}: ${d.client.language.toUpperCase()}` : undefined}>
        {q.isPending ? <SkeletonRows n={4} /> : q.isError ? <PanelError what={c.clientWhat} onRetry={() => q.refetch()} /> : d && (
          <Tabs value={tab} onChange={setTab} tabs={[
            { id: "overview", label: c.drawer.tabs.overview, content: <Overview d={d} online={online} onRemind={setRemind} /> },
            { id: "invoices", label: c.drawer.tabs.invoices, count: d.invoices.length, content: <InvoiceList d={d} online={online} onRemind={setRemind} /> },
            { id: "payments", label: c.drawer.tabs.payments, count: d.payments.length, content: <Payments d={d} /> },
            { id: "credits", label: c.drawer.tabs.credits, count: d.credits.length, content: <Credits d={d} /> },
            { id: "notes", label: c.drawer.tabs.notes, count: d.notes.length, content: <Notes d={d} online={online} /> },
          ]} />
        )}
      </Dialog>
      {remind && d && <ReminderComposer invoice={remind} client={d.client} onClose={() => setRemind(null)} />}
    </>
  );
}

function Overview({ d, online, onRemind }: { d: ArClientDetail; online: boolean; onRemind: (i: ArInvoice) => void }) {
  const c = useRC();
  const f = useF();
  const { locale } = useI18n();
  const s = d.summary;
  const last = d.invoices.reduce<ArInvoice | undefined>((m, i) => (!m || (i.issuedAt ?? "") > (m.issuedAt ?? "") ? i : m), undefined);
  const oldest = d.invoices.filter((i) => i.balanceDue > 0).sort((a, b) => b.days - a.days)[0];
  return (
    <div className="grid gap-5 m-stagger">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3" style={{ ["--i" as string]: 0 }}>
        <div className="border border-border p-3"><dt className="text-eyebrow text-fg-muted">{c.drawer.outstanding}</dt><dd className="mt-1"><Amount value={s.outstanding} size="lg" /></dd></div>
        <div className={cx("p-3", s.oldestDays > 60 ? "bg-danger-bg" : "border border-border")}>
          <dt className="text-eyebrow text-fg-muted">{c.drawer.oldest}</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2"><span className="text-card-title tabular">{s.oldestDays > 0 ? s.oldestDays : 0}</span><AgeingBucketChip bucket={s.bucket} /></dd>
        </div>
        <div className="border border-border p-3 max-sm:col-span-2">
          <dt className="text-eyebrow text-fg-muted">{last ? c.drawer.lastInvoice : c.drawer.credit}</dt>
          <dd className="mt-1">{last ? <span className="grid"><span className="text-small font-medium">{last.issuedAt ? formatDate(last.issuedAt, locale) : ""}</span><Amount value={last.totals.total} size="sm" /></span> : <Amount value={s.credit} credit />}</dd>
        </div>
      </dl>
      <div style={{ ["--i" as string]: 1 }}><AgeingBar buckets={s.buckets} /></div>
      {s.credit > 0 && <p className="flex items-center gap-2 bg-success-bg px-3 py-2 text-small text-success" style={{ ["--i" as string]: 2 }}><Icon name="wallet" size={14} aria-hidden />{c.drawer.credit}: <Amount value={s.credit} credit size="sm" /></p>}
      {s.promise && <p className="flex items-center gap-2 bg-bg-tint px-3 py-2 text-small text-navy-800" style={{ ["--i" as string]: 3 }}><Icon name="calendar" size={14} aria-hidden />{fill(c.notes.promised, { d: formatDate(s.promise.at, locale) })} · {s.promise.note}</p>}
      <dl className="grid gap-3 bg-bg-subtle p-4 text-small sm:grid-cols-2" style={{ ["--i" as string]: 4 }}>
        <div><dt className="text-fg-muted">{c.drawer.contact}</dt><dd className="tabular">{d.client.phone} · {d.client.email}</dd></div>
        <div><dt className="text-fg-muted">{c.drawer.consent}</dt><dd className="flex flex-wrap gap-1.5">
          {(Object.keys(d.client.consent) as Channel[]).map((ch) => (
            <span key={ch} className={cx("inline-flex items-center gap-1 px-2 py-0.5 text-eyebrow", d.client.consent[ch] ? "bg-success-bg text-success" : "bg-ink-100 text-fg-subtle line-through")}>
              <Icon name={d.client.consent[ch] ? "check" : "x"} size={10} aria-hidden />{c.rem.channels[ch]}
            </span>
          ))}
        </dd></div>
        <div className="sm:col-span-2"><dt className="text-fg-muted">{c.cols.reminder}</dt><dd>{s.lastReminder ? `${formatRelative(s.lastReminder.at, locale)} · ${fill(c.rem.by, { who: s.lastReminder.by, ch: c.rem.channels[s.lastReminder.channel] })}` : c.drawer.noReminder}</dd></div>
      </dl>
      {oldest && (
        <div className="grid gap-2" style={{ ["--i" as string]: 5 }}>
          <Button data-guide="finance-rcv-remind" onClick={() => onRemind(oldest)} disabled={!online} className="w-fit m-press" dots>
            <Icon name="message" size={16} aria-hidden />{c.drawer.remind} · {oldest.no}
          </Button>
          {!online && <Reason>{c.offline}</Reason>}
          <span className="sr-only">{f.bucket[oldest.bucket]}</span>
        </div>
      )}
    </div>
  );
}

function InvoiceList({ d, online, onRemind }: { d: ArClientDetail; online: boolean; onRemind: (i: ArInvoice) => void }) {
  const c = useRC();
  const { locale } = useI18n();
  if (!d.invoices.length) return <p className="text-small text-fg-muted">{c.drawer.noInvoices}</p>;
  return (
    <ul className="grid gap-2 m-stagger">
      {d.invoices.map((i, k) => (
        <li key={i.no} style={{ ["--i" as string]: Math.min(k, 6) }} className="grid gap-2 border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <DocNumber no={i.no} href={localHref(locale, `/finance/invoices/${i.no}`)} />
            <FinStatus status={i.overdue ? "overdue" : i.status} kind="invoice" />
          </div>
          <dl className="grid grid-cols-3 gap-2 text-small">
            <div><dt className="text-eyebrow text-fg-subtle">{c.inv.due}</dt><dd className="tabular">{i.dueAt ? formatDate(i.dueAt, locale) : ""}</dd></div>
            <div><dt className="text-eyebrow text-fg-subtle">{c.inv.total}</dt><dd><Amount value={i.totals.total} size="sm" /></dd></div>
            <div><dt className="text-eyebrow text-fg-subtle">{c.inv.balance}</dt><dd><Amount value={i.balanceDue} size="sm" className="font-semibold" /></dd></div>
          </dl>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-eyebrow text-fg-subtle">
              {i.balanceDue > 0 && <AgeingBucketChip bucket={i.bucket} />}
              {i.reminders.length ? fill(c.drawer.reminders, { n: i.reminders.length }) : c.drawer.noReminder}
            </span>
            {i.balanceDue > 0 && <Button size="sm" variant="outline" disabled={!online} onClick={() => onRemind(i)} className="m-press">{c.inv.remind}</Button>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Payments({ d }: { d: ArClientDetail }) {
  const c = useRC();
  const { locale } = useI18n();
  if (!d.payments.length) return <p className="text-small text-fg-muted">{c.drawer.noPayments}</p>;
  return (
    <ul className="grid gap-2">
      {d.payments.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border border-border p-3">
          <span className="grid gap-1">
            <span className="flex items-center gap-2"><MethodTag method={p.method} /><span className="text-eyebrow text-fg-subtle tabular">{p.providerRef ?? p.bankReference ?? p.id}</span></span>
            <span className="text-eyebrow text-fg-subtle">{formatDate(p.at, locale)} · {p.invoiceNo}</span>
          </span>
          <span className="grid justify-items-end gap-1"><Amount value={p.amountReceived ?? p.amountExpected} size="sm" className="font-semibold" /><FinStatus status={p.state} kind="payment" /></span>
        </li>
      ))}
    </ul>
  );
}

function Credits({ d }: { d: ArClientDetail }) {
  const c = useRC();
  const { locale } = useI18n();
  if (!d.credits.length) return <p className="text-small text-fg-muted">{c.drawer.noCredits}</p>;
  return (
    <ul className="grid gap-2">
      {d.credits.map((n) => (
        <li key={n.no} className="flex flex-wrap items-center justify-between gap-2 border border-border p-3">
          <span className="grid gap-1"><DocNumber no={n.no} href={localHref(locale, `/finance/credit-notes/${n.no}`)} /><span className="text-eyebrow text-fg-subtle">{n.invoiceNo} · {formatDate(n.issuedAt, locale)}</span></span>
          <Amount value={n.totals.total} size="sm" className="font-semibold" />
        </li>
      ))}
    </ul>
  );
}

function Notes({ d, online }: { d: ArClientDetail; online: boolean }) {
  const c = useRC();
  const { locale } = useI18n();
  const toast = useToast();
  const m = useArNote();
  const [key, setKey] = useState(newIdempotencyKey);
  const [text, setText] = useState("");
  const [promise, setPromise] = useState("");
  const [err, setErr] = useState<string | null>(null);
  async function save() {
    if (!text.trim()) return setErr(c.notes.need);
    setErr(null);
    try {
      await m.mutateAsync({ clientId: d.client.id, text, promiseAt: promise || undefined, idempotencyKey: key });
      setText(""); setPromise(""); setKey(newIdempotencyKey());
      toast({ title: c.notes.saved, tone: "success" });
    } catch (e) { setErr(errorCopy(e, locale)); }
  }
  return (
    <div className="grid gap-5">
      <form className="grid gap-3 bg-bg-subtle p-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <Field label={c.notes.text} error={err ?? undefined}>{(a) => <Textarea id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} rows={3} value={text} onChange={(e) => setText(e.target.value)} />}</Field>
        <Field label={c.notes.promise} hint={c.notes.promiseHint}>{(a) => <DateInput id={a.id} aria-describedby={a.describedBy} value={promise} onChange={(e) => setPromise(e.target.value)} className="max-w-48" />}</Field>
        <Button type="submit" size="sm" loading={m.isPending} disabled={!online} className="w-fit m-press">{c.notes.save}</Button>
      </form>
      {d.notes.length ? (
        <ul className="grid gap-2">
          {d.notes.map((n) => (
            <li key={n.id} className="grid gap-1 border border-border p-3 m-rise">
              <p className="text-small">{n.text}</p>
              <p className="flex flex-wrap gap-2 text-eyebrow text-fg-subtle">{n.by} · {formatRelative(n.at, locale)}{n.promiseAt && <span className="text-navy-800">· {fill(c.notes.promised, { d: formatDate(n.promiseAt, locale) })}</span>}</p>
            </li>
          ))}
        </ul>
      ) : <p className="text-small text-fg-muted">{c.notes.empty}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- AR3 reminder composer
type Tpl = "standard" | "firm" | "final";
const SMS_MAX = 320;
function ReminderComposer({ invoice, client, onClose }: { invoice: ArInvoice; client: ArClientDetail["client"]; onClose: () => void }) {
  const c = useRC();
  const { locale } = useI18n();
  const toast = useToast();
  const m = useRemind();
  const online = useOnline();
  const now = useNow();
  const [key] = useState(newIdempotencyKey); // one key per composer opening
  const firstChannel = (["whatsapp", "sms", "email"] as Channel[]).find((x) => client.consent[x]) ?? "email";
  const [lang, setLang] = useState<Locale>(client.language);
  const [tpl, setTpl] = useState<Tpl>(invoice.days > 60 ? "final" : invoice.days > 30 ? "firm" : "standard");
  const [channel, setChannel] = useState<Channel>(firstChannel);
  const compose = (l: Locale, t: Tpl) => fill(REMINDER_TEMPLATES[l][t], {
    client: client.name, no: invoice.no ?? "", amount: formatMoney(invoice.balanceDue, "RWF", l), due: invoice.dueAt ? formatDate(invoice.dueAt, l) : "",
  });
  const [text, setText] = useState(() => compose(client.language, tpl));
  const [err, setErr] = useState<string | null>(null);
  const quiet = now != null && (KIGALI_H(now) >= 21 || KIGALI_H(now) < 7);
  const tooLong = channel === "sms" && text.length > SMS_MAX;
  const pick = (l: Locale, t: Tpl) => { setLang(l); setTpl(t); setText(compose(l, t)); };

  async function send() {
    if (!text.trim()) return setErr(c.rem.needText);
    if (tooLong) return setErr(c.rem.tooLong);
    setErr(null);
    try {
      const r = await m.mutateAsync({ invoiceNo: invoice.no!, channel, lang, template: tpl, text, idempotencyKey: key });
      toast({ title: r.scheduledFor ? c.rem.queued : fill(c.rem.sent, { client: client.name }), tone: "success" });
      onClose();
    } catch (e) { setErr(errType(e) === "no_consent" ? c.rem.noConsentErr : errorCopy(e, locale)); }
  }

  return (
    <Dialog open onClose={onClose} className="max-w-3xl" title={c.rem.title}
      description={fill(c.rem.sub, { no: invoice.no ?? "", amount: formatMoney(invoice.balanceDue, "RWF", locale), d: invoice.dueAt ? formatDate(invoice.dueAt, locale) : "" })}
      footer={<>
        <Button variant="outline" onClick={onClose}>{f_cancel(locale)}</Button>
        <Button onClick={send} loading={m.isPending} disabled={!online} dots className="m-press">{c.rem.send}</Button>
      </>}>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid content-start gap-4">
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-label">{c.rem.lang}</legend>
            <div className="flex flex-wrap gap-2">
              {(["rw", "en", "fr"] as Locale[]).map((l) => (
                <button key={l} type="button" aria-pressed={lang === l} onClick={() => pick(l, tpl)}
                  className={cx("h-10 border px-4 text-small m-press", lang === l ? "border-secondary bg-secondary text-on-navy font-medium" : "border-border-strong bg-white")}>
                  {l === "rw" ? "Kinyarwanda" : l === "en" ? "English" : "Français"}
                </button>
              ))}
            </div>
          </fieldset>
          <Field label={c.rem.template}>{(a) => (
            <Select id={a.id} value={tpl} onChange={(e) => pick(lang, e.target.value as Tpl)}>
              {(["standard", "firm", "final"] as Tpl[]).map((t) => <option key={t} value={t}>{c.rem.templates[t]}</option>)}
            </Select>
          )}</Field>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-label">{c.rem.channel}</legend>
            <div className="flex flex-wrap gap-2">
              {(["whatsapp", "sms", "email"] as Channel[]).map((ch) => {
                const ok = client.consent[ch];
                return (
                  <label key={ch} className={cx("flex h-10 items-center gap-2 border px-3 text-small", !ok ? "cursor-not-allowed border-border bg-bg-subtle text-fg-subtle" : channel === ch ? "border-secondary bg-navy-50 font-medium" : "border-border-strong bg-white cursor-pointer")}>
                    <input type="radio" name="rem-channel" value={ch} checked={channel === ch} disabled={!ok} onChange={() => setChannel(ch)} className="accent-navy-700" />
                    {c.rem.channels[ch]}{!ok && <span className="sr-only">· {c.rem.noConsent}</span>}
                    {!ok && <Icon name="lock" size={12} aria-hidden />}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <Field label={c.rem.message} error={err ?? undefined}
            hint={channel === "sms" ? `${fill(c.rem.chars, { n: text.length, max: SMS_MAX })} · ${fill(c.rem.parts, { n: Math.max(1, Math.ceil(text.length / 160)) })}` : fill(c.rem.chars, { n: text.length, max: "∞" })}>
            {(a) => <Textarea id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid || tooLong} rows={6} lang={lang} value={text} onChange={(e) => setText(e.target.value)} />}
          </Field>
          <p className="flex items-center gap-2 bg-bg-tint px-3 py-2 text-small text-navy-800"><Icon name="message" size={14} aria-hidden />{fill(c.rem.via, { ch: c.rem.channels[channel] })}</p>
          {quiet && <p role="status" className="flex items-start gap-2 bg-warning-bg px-3 py-2 text-small text-warning"><Icon name="clock" size={14} aria-hidden className="mt-0.5" />{c.rem.quiet}</p>}
          {!online && <Reason>{c.offline}</Reason>}
        </div>
        <div className="grid content-start gap-3">
          <p className="text-label">{c.rem.preview}</p>
          <ChannelPreview channel={channel} text={text} time={now ? formatDate(now, locale, { timeStyle: "short" }) : ""} />
          <div className="grid gap-2">
            <p className="text-label">{c.rem.history}</p>
            {invoice.reminders.length ? (
              <ul className="grid gap-1.5 text-small">
                {invoice.reminders.map((r) => (
                  <li key={r.at} className="flex items-center justify-between gap-2 bg-bg-subtle px-3 py-2">
                    <span>{fill(c.rem.by, { who: r.by, ch: c.rem.channels[r.channel] })} · {r.lang.toUpperCase()}</span>
                    <span className="text-eyebrow text-fg-subtle tabular">{formatRelative(r.at, locale)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-small text-fg-subtle">{c.rem.never}</p>}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
// shortcut: Cancel label inline (finance-common has no generic cancel key), move to copy when finance-common grows one.
const f_cancel = (l: Locale) => (l === "rw" ? "Reka" : l === "fr" ? "Annuler" : "Cancel");

