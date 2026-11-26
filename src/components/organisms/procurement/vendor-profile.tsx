"use client";
import { todayIso } from "@/components/molecules/procurement/procurement";
// S3 supplier profile (board 03 SU2/SU4/SU5, fixes: procurement only requests bank changes — finance verifies; "Call" is a
// tel: link with the number shown as text). Tabs: Overview · Contracts · Documents · Bills · Payments · Statement · History.
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { formatDate, formatDateTime } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { newIdempotencyKey } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { useProcSettings } from "@/lib/procurement/api";
import { useAddDocument, useBankChange, useReveal, useVendor, useVendorStatus } from "@/lib/procurement/ab";
import type { BankKind } from "@/shared/procurement/types";
import { fill } from "@/content/pages/procurement-common";
import { PageHead } from "@/components/atoms/agent";
import { MenuButton, ReasonDialog, SavedViewTabs } from "@/components/molecules/ops/ops";
import { useStepUpAction } from "@/components/molecules/finance/finance";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { DateInput, Input, Select, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { Amount, DocNo, ExpiryChip, Fact, LockChip, ProcPill, VendorTypeIcon, useP } from "@/components/atoms/procurement";
import { BankDetailsCard, HistoryList, ProcLink } from "@/components/molecules/procurement/procurement";
import { StatementView } from "@/components/organisms/procurement/reports";
import { VendorForm } from "@/components/organisms/procurement/vendors";
import { QueryFail, useAB } from "@/components/molecules/procurement/procurement";

const TABS = ["overview", "contracts", "documents", "bills", "payments", "statement", "history"] as const;
type Tab = (typeof TABS)[number];

export function VendorProfile({ id }: { id: string }) {
  const c = useAB().vendors;
  const p = useP();
  const { locale } = useI18n();
  const toast = useToast();
  const u = useUrlParams();
  const tab = (TABS as readonly string[]).includes(u.get("tab") ?? "") ? (u.get("tab") as Tab) : "overview";
  const q = useVendor(id);
  const budgets = useProcSettings().data?.budgets ?? [];
  const status = useVendorStatus();
  const reveal = useReveal();
  const [tinAsk, setTinAsk] = useState(false);
  const [tin, setTin] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | "edit" | "bank" | "block" | "inactive" | "doc">(null);
  if (q.isError) return <QueryFail error={q.error} onRetry={() => q.refetch()} notFound={c.notFound} />;
  if (!q.data) return <div className="grid gap-4"><div className="h-20 m-shimmer" /><div className="h-64 m-shimmer" /></div>;
  const { vendor: v, contracts, bills, payments, bankChange } = q.data;
  const contact = v.contacts[0];
  const setStatus = async (to: "active" | "inactive" | "blocked", reason: string, done: string) => {
    try {
      await status.mutateAsync({ id: v.id, to, reason, idempotencyKey: newIdempotencyKey() });
      toast({ title: fill(done, { name: v.legalName }), tone: "success" });
    } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); throw e; }
  };
  return (
    <div className="grid gap-5">
      <PageHead
        back={<ProcLink href="/procurement/suppliers" className="mb-2 inline-flex items-center gap-1 text-small text-fg-muted hover:text-fg"><Icon name="arrowRight" size={14} aria-hidden className="rotate-180" />{c.title}</ProcLink>}
        title={<span className="flex flex-wrap items-center gap-3"><VendorTypeIcon type={v.type} /><span className="min-w-0 break-words">{v.legalName}</span></span>}
        sub={<span className="flex flex-wrap items-center gap-2"><DocNo kind="V" no={v.code} copy />· {p.vendorType[v.type]} · <ProcPill state={v.status} machine="vendor" />{v.locked && <LockChip until={v.lockUntil ?? null} compact />}</span>}
        actions={
          <>
            <div className="grid justify-items-end bg-surface px-4 py-2"><span className="text-eyebrow text-fg-subtle">{c.overview.balance}</span><Amount value={v.balance} size="lg" className="font-semibold" /></div>
            <MenuButton label={c.actions.label} icon="menu" align="right">{(close) => (
              <ul className="grid text-small">
                {([["edit", c.actions.edit], ["bank", c.actions.bank], ["doc", c.docs.add]] as const).map(([k, l]) => (
                  <li key={k}><button type="button" className="h-10 w-full px-3 text-left hover:bg-navy-50" onClick={() => { close(); setDialog(k); }}>{l}</button></li>
                ))}
                {v.status === "active" && <li><button type="button" className="h-10 w-full px-3 text-left hover:bg-navy-50" onClick={() => { close(); setDialog("inactive"); }}>{c.actions.inactive}</button></li>}
                {v.status !== "blocked" && <li><button type="button" className="h-10 w-full px-3 text-left text-danger hover:bg-danger-bg" onClick={() => { close(); setDialog("block"); }}>{c.actions.block}</button></li>}
                {v.status !== "active" && <li><button type="button" className="h-10 w-full px-3 text-left hover:bg-navy-50" onClick={() => { close(); setStatus("active", "", c.activated).catch(() => {}); }}>{v.status === "blocked" ? c.actions.unblock : c.actions.activate}</button></li>}
              </ul>
            )}</MenuButton>
          </>
        }
      />
      {v.status === "blocked" && <p role="alert" className="flex items-center gap-2 bg-danger-bg px-4 py-3 text-small text-danger"><Icon name="lock" size={16} aria-hidden />{fill(c.overview.blocked, { reason: v.blockReason ?? "" })}</p>}
      <SavedViewTabs active={tab} onChange={(k) => setUrlParams({ tab: k === "overview" ? null : k })} views={TABS.map((t) => ({ key: t, label: c.tabs[t], count: t === "bills" ? v.openBills : t === "contracts" ? contracts.length : undefined }))} />

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] m-rise">
          <dl className="grid content-start gap-4 border border-border bg-surface p-5 sm:grid-cols-2">
            <Fact label={c.overview.contact}>
              {contact ? <span className="grid"><span className="font-medium">{contact.name}{contact.role ? ` · ${contact.role}` : ""}</span>
                {contact.phone && <span className="tabular">{contact.phone} <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="text-link underline underline-offset-4 hover:text-link-hover">{c.actions.call}</a></span>}
                {contact.email && <span className="break-all">{contact.email}</span>}</span> : ""}
            </Fact>
            <Fact label={c.overview.address}>{v.address ?? ""}</Fact>
            <Fact label={c.cols.tin}>
              <span className="tabular">{v.tinMasked}</span>{" "}
              {tin ? <span className="tabular font-medium">· {tin}</span> : <button type="button" className="text-link underline underline-offset-4 hover:text-link-hover" onClick={() => setTinAsk((x) => !x)}>{p.bank.reveal}</button>}
              {tinAsk && (
                <form className="mt-2 flex gap-2" onSubmit={async (e) => {
                  e.preventDefault();
                  const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
                  if (!reason.trim()) return;
                  try {
                    const r = await reveal.mutateAsync({ id: v.id, field: "tin", reason, idempotencyKey: newIdempotencyKey() });
                    setTin(r.value); setTinAsk(false); setTimeout(() => setTin(null), 30_000); // PLACEHOLDER(bank-remask-seconds)
                  } catch (x) { toast({ title: errorCopy(x, locale), tone: "danger" }); }
                }}>
                  <Input name="reason" aria-label={p.bank.revealReason} placeholder={p.bank.revealReason} className="h-9" required />
                  <Button size="sm" type="submit">{p.bank.reveal}</Button>
                </form>
              )}
            </Fact>
            <Fact label={c.overview.rdb}>{v.rdbNumber ?? ""}</Fact>
            <Fact label={c.overview.terms}>{fill(c.overview.termsVal, { n: v.paymentTermsDays })}</Fact>
            <Fact label={c.overview.vat}>{v.vatRegistered ? c.overview.yes : c.overview.no}</Fact>
            <Fact label={c.cols.categories}>{v.categories.map((k) => budgets.find((b) => b.code === k)?.name ?? k).join(", ") || ""}</Fact>
            <Fact label={c.overview.rating}>{v.rating ? <span aria-label={`${v.rating} / 5`} className="text-warning">{"★".repeat(v.rating)}<span className="text-border-strong">{"★".repeat(5 - v.rating)}</span></span> : ""}</Fact>
            <Fact label={c.overview.openBills}><span className="tabular">{v.openBills}</span></Fact>
            <Fact label={c.overview.lastPayment}>{v.lastPaymentAt ? formatDate(v.lastPaymentAt, locale) : ""}</Fact>
          </dl>
          <BankDetailsCard vendor={v} lastChange={bankChange} onRequest={() => setDialog("bank")}
            onReveal={async (reason) => (await reveal.mutateAsync({ id: v.id, field: "bank", reason, idempotencyKey: newIdempotencyKey() })).value} />
        </div>
      )}
      {tab === "contracts" && (
        <List empty={c.noContracts} items={contracts.map((ct) => (
          <ProcLink key={ct.id} href={`/procurement/contracts/${ct.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-navy-50">
            <span className="grid"><span className="font-medium">{ct.title}</span><span className="text-eyebrow text-fg-subtle tabular">{ct.ref} · {formatDate(ct.endOn, locale)}</span></span>
            <span className="flex items-center gap-2"><Amount value={ct.amount} size="sm" /><ProcPill state={ct.status} machine="contract" /></span>
          </ProcLink>
        ))} />
      )}
      {tab === "documents" && (
        <div className="grid gap-3">
          <Button size="sm" variant="secondary" className="w-fit" onClick={() => setDialog("doc")}><Icon name="plus" size={14} aria-hidden />{c.docs.add}</Button>
          <List empty={c.docs.none} items={v.documents.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <span className="flex items-center gap-2"><Icon name="file" size={16} aria-hidden className="text-navy-700" />{d.name}</span>
              <span className="flex items-center gap-3">
                {d.expiresOn && <ExpiryChip date={d.expiresOn} today={todayIso()} />}
                {d.key && <a className="text-small text-link underline underline-offset-2" target="_blank" rel="noopener" href={`/api/procurement/vendors/${encodeURIComponent(v.id)}/documents/${encodeURIComponent(d.id)}/file`}>{c.docs.open}</a>}
              </span>
            </div>
          ))} />
        </div>
      )}
      {tab === "bills" && (
        <List empty={c.noBills} items={bills.map((b) => (
          <ProcLink key={b.no} href={`/procurement/bills/${b.no}`} className="grid grid-cols-[1fr_auto] items-center gap-3 p-4 hover:bg-navy-50">
            <span className="grid"><DocNo kind="BL" no={b.no} /><span className="text-eyebrow text-fg-subtle tabular">{b.vendorInvoiceNo} · {formatDate(b.dueOn, locale)}</span></span>
            <span className="flex items-center gap-2"><Amount value={b.open || b.total} size="sm" /><ProcPill state={b.status} machine="bill" /></span>
          </ProcLink>
        ))} />
      )}
      {tab === "payments" && (
        <List empty={c.noPayments} items={payments.map((pay) => (
          <div key={pay.id} className="grid grid-cols-[1fr_auto] items-center gap-3 p-4">
            <span className="grid"><DocNo kind="VP" no={pay.no} /><span className="text-eyebrow text-fg-subtle tabular">{formatDateTime(pay.paidAt, locale)} · {pay.reference} · {pay.allocations.map((a) => a.billNo).join(", ")}</span></span>
            <span className="flex items-center gap-2"><Amount value={pay.amount} size="sm" className="font-medium" /><ProcPill state={pay.remittance.status} machine="remittance" /></span>
          </div>
        ))} />
      )}
      {tab === "statement" && <StatementView vendorId={v.id} />}
      {tab === "history" && <HistoryList kind="vendor" id={v.id} />}

      {dialog === "edit" && <VendorForm vendor={v} onClose={() => setDialog(null)} />}
      {dialog === "bank" && <BankChangeSheet vendorId={v.id} name={v.legalName} onClose={() => setDialog(null)} />}
      {dialog === "doc" && <DocDialog vendorId={v.id} onClose={() => setDialog(null)} />}
      <ReasonDialog open={dialog === "block"} onClose={() => setDialog(null)} title={fill(c.block.title, { name: v.legalName })} destructive audited asRadios
        options={(["fraud", "quality", "duplicate", "other"] as const).map((k) => ({ value: c.block.reasons[k], label: c.block.reasons[k] }))} noteLabel={c.block.note}
        notice={<p className="bg-warning-bg px-3 py-2 text-small text-warning">{c.block.effects}</p>} confirmLabel={c.block.confirm}
        onConfirm={async ({ reason, note }) => { await setStatus("blocked", note ? `${reason}: ${note}` : reason, c.block.done); setDialog(null); }} />
      <ReasonDialog open={dialog === "inactive"} onClose={() => setDialog(null)} title={fill(c.inactive.title, { name: v.legalName })} description={c.inactive.body} asRadios audited
        options={(["duplicate", "quality", "other"] as const).map((k) => ({ value: c.block.reasons[k], label: c.block.reasons[k] }))} noteLabel={c.block.note} confirmLabel={c.actions.inactive}
        onConfirm={async ({ reason, note }) => { await setStatus("inactive", note ? `${reason}: ${note}` : reason, c.inactive.done); setDialog(null); }} />
    </div>
  );
}

function List({ items, empty }: { items: React.ReactNode[]; empty: string }) {
  return items.length ? <div className="divide-y divide-border border border-border bg-surface m-rise">{items}</div>
    : <p className="border border-dashed border-border-strong p-8 text-center text-small text-fg-muted">{empty}</p>;
}

/** S6 bank-detail change: new details + reason + bank letter → step-up → vendor locked until finance verifies (R-7). */
function BankChangeSheet({ vendorId, name, onClose }: { vendorId: string; name: string; onClose: () => void }) {
  const c = useAB().vendors;
  const p = useP();
  const toast = useToast();
  const lockHours = useProcSettings().data?.limits.lockHours ?? 24;
  const m = useBankChange();
  const { run, dialog } = useStepUpAction();
  const [key] = useState(newIdempotencyKey);
  const [f, setF] = useState({ kind: "bank" as BankKind, label: "", number: "", reason: "", doc: "" });
  const [err, setErr] = useState<string | null>(null);
  async function submit() {
    if (!f.number.trim() || !f.reason.trim()) return setErr(c.form.required);
    setErr(null);
    const r = await run(`${c.bankSheet.title} · ${name}`, (stepUp) => m.mutateAsync({ id: vendorId, ...f, label: f.label || c.bankKinds[f.kind], stepUp, idempotencyKey: key })).catch(() => undefined);
    if (r) { toast({ title: c.bankSheet.done, tone: "success" }); onClose(); }
  }
  return (
    <Dialog open onClose={onClose} side="right" title={c.bankSheet.title} description={fill(c.bankSheet.body, { h: lockHours })}
      footer={<Button onClick={submit} loading={m.isPending} dots className="m-press"><Icon name="shield" size={14} aria-hidden />{c.bankSheet.submit}</Button>}>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {err && <p role="alert" className="bg-danger-bg px-3 py-2 text-small text-danger">{err}</p>}
        <label className="grid gap-1 text-small">{c.form.bankKind}<Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as BankKind })}>{(["bank", "momo", "airtel"] as const).map((k) => <option key={k} value={k}>{c.bankKinds[k]}</option>)}</Select></label>
        {f.kind === "bank" && <label className="grid gap-1 text-small">{c.form.bankLabel}<Input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></label>}
        <label className="grid gap-1 text-small">{c.form.bankNo}<Input autoComplete="off" inputMode="numeric" value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} required /></label>
        <label className="grid gap-1 text-small">{c.bankSheet.reason}<Textarea rows={3} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} required /></label>
        <label className="grid gap-1 text-small">{c.bankSheet.doc}<Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setF({ ...f, doc: e.target.files?.[0]?.name ?? "" })} /></label>
        <LockChip until={null} />
        <p className="sr-only">{p.lock.pending}</p>
      </form>
      {dialog}
    </Dialog>
  );
}

function DocDialog({ vendorId, onClose }: { vendorId: string; onClose: () => void }) {
  const c = useAB().vendors;
  const toast = useToast();
  const { locale } = useI18n();
  const m = useAddDocument();
  const [name, setName] = useState("");
  const [exp, setExp] = useState("");
  return (
    <Dialog open onClose={onClose} title={c.docs.add} footer={<Button disabled={!name} loading={m.isPending} onClick={async () => {
      try { await m.mutateAsync({ id: vendorId, name, expiresOn: exp || undefined, idempotencyKey: newIdempotencyKey() }); toast({ title: c.docs.added, tone: "success" }); onClose(); }
      catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
    }}>{c.docs.add}</Button>}>
      <div className="grid gap-4">
        <label className="grid gap-1 text-small">{c.docs.name}<Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setName(e.target.files?.[0]?.name ?? "")} /></label>
        <label className="grid gap-1 text-small">{c.docs.expires}<DateInput value={exp} onChange={(e) => setExp(e.target.value)} /></label>
      </div>
    </Dialog>
  );
}
