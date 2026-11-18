"use client";
// O1 PO builder (?from=PR-…), O2 list by status, O3 detail with GRN history, cancel/short-close, resend, ?print=1 view (board 06).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { newIdempotencyKey } from "@/lib/api/client";
import { formatDate, formatDateTime, formatMoney, formatRelative } from "@/shared/format";
import { addDays, lineTolerance, quotesRequired, totals } from "@/shared/procurement/rules";
import { usePo, usePoAction, usePos, usePr, usePrs, useCreatePo, useVendorOptions, type PoDetail } from "@/lib/procurement/c";
import type { PoStatus } from "@/shared/procurement/types";
import { fill } from "@/content/pages/procurement-common";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { EmptyPanel, SavedViewTabs } from "@/components/molecules/ops/ops";
import { PageHead } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Checkbox, DateInput, Field, Input, Select, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { Amount, DocNo, ProcPill, useP } from "@/components/atoms/procurement";
import { EvidenceTile, PanelErr, ProcLink, ProcNoAccess, QuoteCompare, VatLines, type DraftLine } from "@/components/molecules/procurement/procurement";
import { GrnSheet } from "@/components/organisms/procurement/receipts";
import { isNotFound, useC, useErr } from "@/components/molecules/procurement/procurement";
import { isForbidden } from "@/components/atoms/hooks";

const TABS = ["all", "issued", "partially_received", "received", "closed", "cancelled"] as const;
const DEFAULT_ADDRESS = "HEBUZA office, KN 3 Rd, Kigali"; // PLACEHOLDER(office-address)

function ReceivedBar({ pct }: { pct: number }) {
  return (
    <span className="flex items-center gap-2">
      <span role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${pct}%`} className="relative h-1.5 w-20 overflow-hidden bg-ink-100">
        <span className="absolute inset-y-0 left-0 bg-success m-grow" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-eyebrow tabular">{pct}%</span>
    </span>
  );
}

export function OrdersView() {
  const c = useC();
  const { locale } = useI18n();
  const router = useRouter();
  const u = useUrlParams();
  const tab = (TABS as readonly string[]).includes(u.get("tab") ?? "") ? (u.get("tab") as (typeof TABS)[number]) : "all";
  const from = u.get("from");
  const q = usePos();
  const prs = usePrs(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [pick, setPick] = useState(false);
  if (q.isError && isForbidden(q.error)) return <ProcNoAccess />;
  const all = q.data?.items ?? [];
  const rows = all.filter((r) => tab === "all" || r.status === tab);
  const approved = (prs.data?.items ?? []).filter((r) => r.status === "approved");
  const cols: OpsColumn<PoDetail>[] = [
    { key: "no", label: c.po.cols.no, sort: (r) => r.no, cell: (r) => <DocNo kind="PO" no={r.no} /> },
    { key: "supplier", label: c.po.cols.supplier, wrap: true, sort: (r) => r.vendorName, cell: (r) => <span className="font-medium">{r.vendorName}</span> },
    { key: "pr", label: c.po.cols.pr, card: false, cell: (r) => <span className="text-small text-fg-muted tabular">{r.prNo}</span> },
    { key: "total", label: c.po.cols.total, align: "right", sort: (r) => r.total, cell: (r) => <Amount value={r.total} className="font-semibold" /> },
    { key: "received", label: c.po.cols.received, sort: (r) => r.receivedPct, cell: (r) => <ReceivedBar pct={r.receivedPct} /> },
    { key: "date", label: c.po.cols.date, sort: (r) => r.issuedAt, cell: (r) => <span className="text-small text-fg-muted">{formatRelative(r.issuedAt, locale)}</span> },
    { key: "state", label: c.po.cols.state, cell: (r) => <ProcPill state={r.status} machine="po" /> },
  ];
  return (
    <div className="grid gap-5">
      <PageHead title={c.po.title} sub={c.po.sub} actions={<Button variant="primary" onClick={() => setPick(true)} dots className="m-press"><Icon name="plus" size={16} aria-hidden />{c.po.newFrom}</Button>} />
      <SavedViewTabs active={tab} onChange={(k) => setUrlParams({ tab: k === "all" ? null : k })}
        views={TABS.map((t) => ({ key: t, label: c.po.tabs[t], count: t === "all" ? all.length : all.filter((r) => r.status === t).length }))} />
      <div className="border border-border bg-surface m-rise">
        {q.isError ? <PanelErr onRetry={() => q.refetch()} /> : (
          <OpsTable rows={rows} columns={cols} rowKey={(r) => r.no} rowLabel={(r) => `${r.no} · ${r.vendorName}`} label={c.po.title} loading={q.isPending} focused={focused} onFocus={setFocused} shortcuts
            rowTone={(r) => (r.status === "cancelled" ? "muted" : null)} empty={<div className="p-4"><EmptyPanel title={c.grn.none} /></div>}
            onOpen={(r) => router.push(localHref(locale, `/procurement/orders/${r.no}`))} />
        )}
      </div>
      {pick && (
        <Dialog open onClose={() => setPick(false)} title={c.po.newFrom}>
          {prs.isPending ? <div className="h-24 m-shimmer" /> : !approved.length ? <p className="text-small text-fg-muted">{c.po.noApproved}</p> : (
            <ul className="grid gap-2">
              {approved.map((r) => (
                <li key={r.no}><button type="button" onClick={() => { setPick(false); setUrlParams({ from: r.no }); }} className="flex w-full items-center justify-between gap-3 border border-border p-3 text-left hover:border-navy-300 m-press">
                  <span className="min-w-0"><DocNo kind="PR" no={r.no} /><span className="block truncate text-small">{r.title}</span></span><Amount value={r.estimatedTotal} size="sm" />
                </button></li>
              ))}
            </ul>
          )}
        </Dialog>
      )}
      {from && <PoBuilder prNo={from} onClose={() => setUrlParams({ from: null })} onDone={(no) => router.push(localHref(locale, `/procurement/orders/${no}`))} />}
    </div>
  );
}

function PoBuilder({ prNo, onClose, onDone }: { prNo: string; onClose: () => void; onDone: (no: string) => void }) {
  const c = useC();
  const p = useP();
  const { locale } = useI18n();
  const toast = useToast();
  const err = useErr();
  const online = useOnline();
  const pr = usePr(prNo);
  const vendors = useVendorOptions();
  const create = useCreatePo();
  const [key] = useState(newIdempotencyKey);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState<{ vendorId: string; lines: DraftLine[] | null; mode: "excl" | "incl"; address: string; terms: number | null; neededBy: string; send: boolean }>(
    { vendorId: "", lines: null, mode: "excl", address: DEFAULT_ADDRESS, terms: null, neededBy: "", send: true });
  const [error, setError] = useState<string | null>(null);
  const r = pr.data;
  const vs = vendors.data?.items ?? [];
  const vendorId = form.vendorId || r?.vendorId || "";
  const v = vs.find((x) => x.id === vendorId);
  const lines: DraftLine[] = form.lines ?? (r?.lines ?? []).map((l) => ({ id: l.id, description: l.description, qty: l.qty, unitPrice: l.unitPrice, vatable: true }));
  const net = totals(lines.map((l) => { const n = Math.round(l.qty * l.unitPrice); return { net: n, vat: 0, total: n }; })).subtotal;
  const over = r ? net > r.estimatedTotal + lineTolerance(r.estimatedTotal) : false;
  const terms = form.terms ?? v?.paymentTermsDays ?? 30;
  const neededBy = form.neededBy || r?.neededBy || addDays(today, 7);
  async function submit() {
    setError(null);
    if (!r || !v) return setError(c.po.supplier);
    try {
      const out = await create.mutateAsync({ idempotencyKey: key, prNo, vendorId: v.id, lines: lines.map(({ id, description, qty, unitPrice }) => ({ id, description, qty, unitPrice })),
        deliveryAddress: form.address, paymentTermsDays: terms, neededBy, send: form.send && !!v.email });
      toast({ title: out.sentTo ? fill(c.po.sentTo, { no: out.no, name: out.vendorName }) : fill(c.po.created, { no: out.no }), tone: "success" });
      onDone(out.no);
    } catch (x) { setError(err(x, { amount: formatMoney(r.estimatedTotal, "RWF", locale) })); }
  }
  return (
    <Dialog open onClose={onClose} side="right" title={c.po.builder} description={r ? `${r.no} · ${r.title}` : undefined} className="sm:max-w-2xl"
      footer={<Button onClick={submit} loading={create.isPending} disabled={!online || !r || r.status !== "approved" || over || !v} dots className="m-press">{c.po.create}</Button>}>
      {pr.isPending ? <div className="h-60 m-shimmer" /> : pr.isError ? <p role="alert" className="text-small text-danger">{err(pr.error)}</p> : r && (
        <form className="grid gap-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {r.status !== "approved" && <p role="alert" className="bg-warning-bg px-3 py-2 text-small text-warning">{p.status[r.status]}</p>}
          {error && <p role="alert" className="bg-danger-bg px-3 py-2 text-small text-danger">{error}</p>}
          <Field label={c.po.supplier}>{(a) => (
            <Select id={a.id} value={vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })}>
              <option value="">{c.sheet.choose}</option>
              {vs.map((x) => <option key={x.id} value={x.id} disabled={x.status !== "active"}>{x.name}{x.status !== "active" ? ` — ${p.status[x.status]}${x.blockReason ? `: ${x.blockReason}` : ""}` : ""}</option>)}
            </Select>
          )}</Field>
          <VatLines lines={lines} mode={form.mode} onMode={(m) => setForm({ ...form, mode: m })} onChange={(l) => setForm({ ...form, lines: l })} vatRegistered={v?.vatRegistered ?? true} />
          {over && <p role="alert" className="bg-warning-bg px-3 py-2 text-small text-warning m-shake">{fill(c.po.overPr, { amount: formatMoney(r.estimatedTotal, "RWF", locale) })}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={c.po.terms}>{(a) => <Input id={a.id} type="number" min={0} value={terms} onChange={(e) => setForm({ ...form, terms: Number(e.target.value) })} />}</Field>
            <Field label={c.po.needed}>{(a) => <DateInput id={a.id} min={today} value={neededBy} onChange={(e) => setForm({ ...form, neededBy: e.target.value })} />}</Field>
          </div>
          <Field label={c.po.address}>{(a) => <Textarea id={a.id} rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />}</Field>
          {r.quotes.length > 0 && <section className="grid gap-2"><h3 className="text-label">{c.po.quotesRO}</h3><QuoteCompare readOnly quotes={r.quotes} chosenId={r.chosenQuoteId} reason={r.chosenReason} required={quotesRequired(r.estimatedTotal)} /></section>}
          {v?.email ? (
            <div className="grid gap-1"><Checkbox label={c.po.send} checked={form.send} onChange={(e) => setForm({ ...form, send: e.target.checked })} /><p className="pl-7 text-eyebrow text-fg-muted">{fill(c.po.sendTo, { email: v.email })}</p></div>
          ) : v && <p className="text-small text-fg-muted">{c.po.noEmail}</p>}
        </form>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------- O3 detail
export function PoDetailView({ no }: { no: string }) {
  const c = useC();
  const p = useP();
  const { locale } = useI18n();
  const toast = useToast();
  const err = useErr();
  const online = useOnline();
  const u = useUrlParams();
  const q = usePo(no);
  const act = usePoAction();
  const [dlg, setDlg] = useState<"cancel" | "close" | null>(null);
  const [reason, setReason] = useState("");
  const [key, setKey] = useState(newIdempotencyKey);
  const [grn, setGrn] = useState(false);
  if (q.isPending) return <div className="grid gap-4"><div className="h-24 m-shimmer" /><div className="h-72 m-shimmer" /></div>;
  if (q.isError) return isNotFound(q.error) ? <EmptyPanel title={fill(c.po.detail.notFound, { no })} action={<ProcLink href="/procurement/orders" className="underline">{c.po.detail.back}</ProcLink>} />
    : isForbidden(q.error) ? <ProcNoAccess /> : <PanelErr onRetry={() => q.refetch()} />;
  const po = q.data;
  if (u.get("print") === "1") return <PoDocument po={po} />;
  async function run(action: "send" | "cancel" | "close") {
    try {
      await act.mutateAsync({ no: po.no, action, reason: reason || undefined, idempotencyKey: key });
      toast({ title: fill(action === "send" ? c.po.detail.resent : action === "cancel" ? c.po.detail.cancelled : c.po.detail.closed, { no: po.no }), tone: "success" });
      setDlg(null); setReason(""); setKey(newIdempotencyKey());
    } catch (x) { toast({ title: err(x), tone: "danger" }); }
  }
  const canReceive = ["issued", "partially_received"].includes(po.status);
  return (
    <div className="grid gap-6">
      <PageHead back={<ProcLink href="/procurement/orders" className="mb-2 inline-flex items-center gap-1 text-small text-fg-muted hover:text-fg"><Icon name="arrowRight" size={14} className="rotate-180" aria-hidden />{c.po.detail.back}</ProcLink>}
        title={<span className="flex flex-wrap items-center gap-3"><DocNo kind="PO" no={po.no} copy />{po.vendorName}</span>}
        sub={<span className="flex flex-wrap items-center gap-2"><ProcPill state={po.status} machine="po" /><ReceivedBar pct={po.receivedPct} />
          {po.sentAt ? fill(c.po.detail.sent, { when: formatRelative(po.sentAt, locale), to: po.sentTo ?? "" }) : c.po.detail.notSent}</span>}
        actions={<>
          {canReceive && <Button onClick={() => setGrn(true)} disabled={!online} dots className="m-press"><Icon name="check" size={16} aria-hidden />{c.po.detail.record}</Button>}
          <Button variant="secondary" onClick={() => { setUrlParams({ print: "1" }); }}><Icon name="file" size={14} aria-hidden />{c.po.detail.print}</Button>
          {po.vendorEmail && po.status !== "cancelled" && <Button variant="secondary" loading={act.isPending && !dlg} onClick={() => run("send")}><Icon name="mail" size={14} aria-hidden />{c.po.detail.resend}</Button>}
          {po.status === "issued" && !po.grns.length && <Button variant="secondary" className="text-danger" onClick={() => setDlg("cancel")}>{c.po.detail.cancel}</Button>}
          {["partially_received", "received"].includes(po.status) && <Button variant="secondary" onClick={() => setDlg("close")}>{c.po.detail.close}</Button>}
        </>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-6">
          <section className="grid gap-3">
            <h2 className="text-card-title">{c.po.detail.lines}</h2>
            <div className="overflow-x-auto border border-border">
              <table className="w-full min-w-[32rem] text-small">
                <thead className="bg-ink-100 text-left text-eyebrow text-ink-700"><tr><th className="px-3 py-2">{p.vat.line}</th><th className="px-3 py-2 text-right">{c.po.detail.ordered}</th><th className="px-3 py-2 text-right">{c.po.detail.got}</th><th className="px-3 py-2 text-right">{c.po.detail.outstanding}</th><th className="px-3 py-2 text-right">{p.vat.total}</th></tr></thead>
                <tbody>{po.lines.map((l) => (
                  <tr key={l.id} className="border-t border-border"><td className="px-3 py-2">{l.description}</td><td className="px-3 py-2 text-right tabular">{l.qty}</td><td className="px-3 py-2 text-right tabular">{l.received}</td><td className="px-3 py-2 text-right tabular font-medium">{Math.max(0, l.qty - l.received)}</td><td className="px-3 py-2 text-right"><Amount value={l.total} size="sm" /></td></tr>
                ))}</tbody>
                <tfoot className="border-t border-border-strong bg-bg-subtle"><tr><td colSpan={4} className="px-3 py-2 text-right text-fg-muted">{p.vat.subtotal} · {p.vat.vat}</td><td className="px-3 py-2 text-right"><Amount value={po.subtotal} size="sm" /> · <Amount value={po.vat} size="sm" /></td></tr>
                  <tr><td colSpan={4} className="px-3 py-2 text-right font-semibold">{p.vat.total}</td><td className="px-3 py-2 text-right"><Amount value={po.total} className="font-semibold" /></td></tr></tfoot>
              </table>
            </div>
          </section>
          <section className="grid gap-3">
            <h2 className="text-card-title">{c.po.detail.grns}</h2>
            {!po.grns.length ? <p className="text-small text-fg-muted">{c.po.detail.noGrn}</p> : (
              <ul className="grid gap-2 m-stagger">{po.grns.map((g, i) => (
                <li key={g.no} style={{ ["--i" as string]: i }} className="grid gap-1">
                  <span className="flex items-center gap-2 text-small"><DocNo kind="GRN" no={g.no} />{g.reverses && <span className="text-eyebrow text-fg-subtle">{fill(c.grn.reverses, { no: g.reverses })}</span>}</span>
                  <EvidenceTile photo={g.evidence} receivedBy={g.receivedBy.name} at={g.receivedAt} qty={g.lines.map((l) => `${l.qty} × ${po.lines.find((x) => x.id === l.lineId)?.description ?? ""}${l.condition !== "good" ? ` (${c.grn.conditions[l.condition]})` : ""}`).join(", ")} />
                </li>
              ))}</ul>
            )}
          </section>
        </div>
        <aside className="grid content-start gap-4">
          {po.pr && (
            <section className="grid gap-1 border border-border bg-surface p-4 text-small">
              <p className="text-eyebrow text-fg-subtle">{c.po.cols.pr}</p><DocNo kind="PR" no={po.pr.no} href={`/procurement/requests/${po.pr.no}`} />
              <p>{po.pr.title}</p><p className="text-fg-muted">{po.pr.requester.name} · <Amount value={po.pr.total} size="sm" /></p>
            </section>
          )}
          <section className="grid gap-1 border border-border bg-surface p-4 text-small">
            <p>{fill(c.po.print.terms, { n: po.paymentTermsDays })}</p><p>{fill(c.po.print.needed, { date: formatDate(po.neededBy, locale) })}</p>
            <p className="text-fg-muted">{po.deliveryAddress}</p><p className="text-eyebrow text-fg-subtle">{fill(c.po.print.issuedBy, { name: po.issuedBy.name })} · {formatDateTime(po.issuedAt, locale)}</p>
            {po.closeReason && <p className="text-fg-muted">{p.common.reason}: {po.closeReason}</p>}
          </section>
          <section className="grid gap-2 border border-border bg-surface p-4">
            <h2 className="text-card-title">{c.po.detail.bills}</h2>
            {!po.bills.length ? <p className="text-small text-fg-muted">{c.po.detail.noBills}</p> : po.bills.map((b) => (
              <p key={b.no} className="flex items-center justify-between gap-2 text-small"><DocNo kind="BL" no={b.no} href={`/procurement/bills/${b.no}`} /><ProcPill state={b.status} machine="bill" /><Amount value={b.total} size="sm" /></p>
            ))}
          </section>
        </aside>
      </div>
      {dlg && (
        <Dialog open onClose={() => setDlg(null)} title={dlg === "cancel" ? c.po.detail.cancel : c.po.detail.close} description={dlg === "cancel" ? c.po.detail.cancelBody : c.po.detail.closeBody}
          footer={<Button loading={act.isPending} disabled={!reason.trim()} className={dlg === "cancel" ? "bg-danger" : undefined} onClick={() => run(dlg)}>{p.common.confirm}</Button>}>
          <label className="grid gap-1 text-small">{p.common.reason}<Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required /></label>
        </Dialog>
      )}
      {grn && <GrnSheet poNo={po.no} onClose={() => setGrn(false)} />}
    </div>
  );
}

/** shortcut: HTML print view for the PO, upgrade when backend /pdf exists. */
function PoDocument({ po }: { po: PoDetail }) {
  const c = useC();
  const p = useP();
  const { locale } = useI18n();
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="secondary" onClick={() => setUrlParams({ print: null })}><Icon name="arrowRight" size={14} className="rotate-180" aria-hidden />{p.common.back}</Button>
        <Button onClick={() => window.print()}><Icon name="file" size={14} aria-hidden />{p.common.print}</Button>
      </div>
      <article className="mx-auto grid w-full max-w-3xl gap-6 border border-border bg-surface p-8 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-h3 font-semibold">HEBUZA</p><p className="text-small text-fg-muted">{DEFAULT_ADDRESS}</p></div>
          <div className="text-right"><h1 className="text-card-title">{c.po.print.title}</h1><p className="tabular font-medium">{po.no}</p><p className="text-small text-fg-muted">{formatDate(po.issuedAt, locale)}</p></div>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 text-small">
          <div><p className="text-eyebrow text-fg-subtle">{c.po.print.to}</p><p className="font-medium">{po.vendorName}</p>{po.vendorEmail && <p>{po.vendorEmail}</p>}</div>
          <div><p className="text-eyebrow text-fg-subtle">{c.po.print.ship}</p><p>{po.deliveryAddress}</p></div>
        </div>
        <VatLines readOnly lines={po.lines} mode="excl" />
        <p className="text-small">{fill(c.po.print.terms, { n: po.paymentTermsDays })} · {fill(c.po.print.needed, { date: formatDate(po.neededBy, locale) })} · {po.prNo}</p>
        <footer className="mt-8 grid grid-cols-2 gap-8 text-small">
          <p>{fill(c.po.print.issuedBy, { name: po.issuedBy.name })}</p>
          <p className="border-t border-fg pt-2 text-fg-muted">{c.po.print.sign}</p>
        </footer>
        <p className="text-eyebrow text-fg-subtle">{formatMoney(po.total, "RWF", locale)}</p>
      </article>
    </div>
  );
}
