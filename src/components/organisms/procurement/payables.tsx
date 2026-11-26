"use client";
// F1–F4 Finance payables (plan 12 §7, board 11 AP1–AP4 + board 08 PA2/PA3 moved to finance): approve · authorise · pay ·
// bank changes · limits & budgets. Decisions carry step-up; same-person steps are shown locked, never hidden.
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { cx, formatDate, formatDateTime, formatMoney, formatRelative } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { ApiError, newIdempotencyKey } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { budgetMeter, guardPay, quotesRequired } from "@/shared/procurement/rules";
import { useProcApprovals, useProcSettings, useProposeSettings } from "@/lib/procurement/api";
import {
  billSteps, useBankChanges, useBill, useBillAction, usePay, usePayments, usePrDecision, usePrFor, useSendRemittance, useVerifyBank, type BankChangeRow, type BillRow,
} from "@/lib/procurement/de";
import type { PayMethod, ProcApproval, VendorPayment } from "@/shared/procurement/types";
import { fill } from "@/content/pages/procurement-common";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { EmptyPanel, SavedViewTabs } from "@/components/molecules/ops/ops";
import { PageHead } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { NoAccess, useStepUpAction } from "@/components/molecules/finance/finance";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/atoms/field";
import { FileDrop } from "@/components/atoms/file-drop";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { Amount, BudgetBar, DocNo, LockChip, Pill, ProcPill, useP } from "@/components/atoms/procurement";
import { MatchIndicator, PanelErr, QuoteCompare, RemittanceCard, SegregationStrip, VatLines } from "@/components/molecules/procurement/procurement";
import { useDE } from "@/components/organisms/procurement/bills";
import { ArtNothingWaiting } from "@/components/atoms/finance-art";

const TABS = ["approve", "authorise", "pay", "bank", "settings"] as const;
type Tab = (typeof TABS)[number];
const key = newIdempotencyKey;

export function PayablesView() {
  const c = useDE();
  const u = useUrlParams();
  const { user } = useSession();
  const tab = (TABS as readonly string[]).includes(u.get("tab") ?? "") ? (u.get("tab") as Tab) : "approve";
  const q = useProcApprovals();
  if (user && !user.roles.includes("staff:finance")) return <NoAccess />;
  const items = q.data?.items ?? [];
  const counts: Record<Tab, number | undefined> = {
    approve: items.filter((i) => (i.kind === "pr" || i.kind === "bill_approve") && i.href.startsWith("/finance")).length,
    authorise: items.filter((i) => i.kind === "bill_authorise").length, pay: undefined, bank: items.filter((i) => i.kind === "bank").length, settings: undefined,
  };
  return (
    <div className="grid gap-5">
      <PageHead title={c.payables.title} sub={c.payables.sub} />
      <SavedViewTabs active={tab} onChange={(k) => setUrlParams({ tab: k === "approve" ? null : k, item: null })} views={TABS.map((t) => ({ key: t, label: c.payables.tabs[t], count: counts[t] }))} />
      {tab === "approve" && <QueueTab kinds={["pr", "bill_approve"]} q={q} />}
      {tab === "authorise" && <QueueTab kinds={["bill_authorise"]} q={q} />}
      {tab === "pay" && <PayTab />}
      {tab === "bank" && <BankTab />}
      {tab === "settings" && <SettingsTab />}
    </div>
  );
}

// ---------------------------------------------------------------- approve / authorise queue + bulk + drawer
function QueueTab({ kinds, q }: { kinds: ProcApproval["kind"][]; q: ReturnType<typeof useProcApprovals> }) {
  const c = useDE();
  const p = useP();
  const { locale } = useI18n();
  const toast = useToast();
  const online = useOnline();
  const u = useUrlParams();
  const [sel, setSel] = useState<string[]>([]);
  const { run, dialog } = useStepUpAction();
  const approve = useBillAction("approve");
  const rows = (q.data?.items ?? []).filter((i) => kinds.includes(i.kind) && i.href.startsWith("/finance"));
  const open = u.get("item");
  const bulkable = rows.filter((i) => i.kind === "bill_approve" && !i.blockedSelf && !i.reasons.length);
  async function bulk() {
    const chosen = rows.filter((r) => sel.includes(r.id));
    let okN = 0;
    const skipped: string[] = [];
    await run(fill(c.payables.bulk, { n: chosen.length }), async (t) => {
      for (const r of chosen) {
        if (r.blockedSelf || r.kind !== "bill_approve") { skipped.push(fill(c.payables.bulkSkip, { no: r.ref })); continue; }
        try { await approve.mutateAsync({ no: r.ref, stepUp: t, idempotencyKey: key() }); okN++; } catch (e) { skipped.push(`${r.ref}: ${errorCopy(e, locale)}`); }
      }
      return true;
    }).catch(() => undefined);
    setSel([]);
    toast({ title: fill(c.payables.bulkDone, { ok: okN, skip: skipped.length }), body: skipped.join(" · ") || undefined, tone: skipped.length ? "info" : "success" });
  }
  const cols: OpsColumn<ProcApproval>[] = [
    { key: "ref", label: c.payables.cols.ref, cell: (i) => <DocNo kind={i.kind === "pr" ? "PR" : "BL"} no={i.ref} /> },
    { key: "what", label: c.payables.cols.what, wrap: true, cell: (i) => <span className="grid gap-0.5"><span className="max-w-[18rem] truncate font-medium" title={i.title}>{i.title}</span>{i.locked && <LockChip until={i.locked === "pending" ? null : i.locked} compact />}</span> },
    { key: "amount", label: c.payables.cols.amount, align: "right", sort: (i) => i.amount ?? 0, cell: (i) => (i.amount != null ? <Amount value={i.amount} className="font-semibold" /> : "") },
    { key: "maker", label: c.payables.cols.maker, cell: (i) => <span className="text-small">{i.maker.name}</span> },
    { key: "reasons", label: c.payables.cols.reasons, wrap: true, cell: (i) => <span className="flex flex-wrap gap-1">{i.blockedSelf && <Pill tone="danger" icon="lock">{p.seg.self.split(", ")[0]}</Pill>}{i.reasons.map((r) => <Pill key={r} tone="warning" icon="zap">{p.reasons[r] ?? r}</Pill>)}</span> },
    { key: "age", label: c.payables.cols.age, sort: (i) => i.at, cell: (i) => <span className="text-small text-fg-muted">{formatRelative(i.at, locale)}</span> },
  ];
  return (
    <div className="grid gap-3 m-rise">
      {dialog}
      {!online && <p role="status" className="border-l-[3px] border-warning bg-warning-bg px-4 py-3 text-small text-warning">{p.states.offlineMoney}</p>}
      {kinds.includes("bill_approve") && bulkable.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setSel(sel.length ? [] : bulkable.map((b) => b.id))}>{p.common.all}</Button>
          <Button size="sm" disabled={!sel.length || !online} loading={approve.isPending} onClick={bulk}>{fill(c.payables.bulk, { n: sel.length })}</Button>
        </div>
      )}
      <div className="border border-border bg-surface">
        <OpsTable rows={rows} columns={cols} rowKey={(i) => i.id} label={c.payables.tabs.approve} loading={q.isPending} error={q.isError ? q.error : undefined} onRetry={() => q.refetch()}
          selected={kinds.includes("bill_approve") ? sel : undefined} onSelect={kinds.includes("bill_approve") ? (ks) => setSel(ks.filter((k) => bulkable.some((b) => b.id === k))) : undefined}
          rowTone={(i) => (i.blockedSelf ? "muted" : null)} onOpen={(i) => setUrlParams({ item: i.ref })} shortcuts
          empty={<div className="grid place-items-center gap-2 p-8 text-center text-fg-muted"><ArtNothingWaiting /><p className="text-small">{c.payables.nothing}</p></div>} />
      </div>
      {open && (open.startsWith("PR-") ? <PrDrawer no={open} /> : <BillDrawer no={open} authorise={kinds.includes("bill_authorise")} />)}
    </div>
  );
}

function Drawer({ title, children, footer }: { title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return <Dialog open onClose={() => setUrlParams({ item: null })} side="right" title={title} footer={footer} className="sm:max-w-2xl">{children}</Dialog>;
}
/** Reject / ask-info reason prompt inline in the drawer footer. */
function ReasonRow({ label, onSubmit, busy }: { label: string; onSubmit: (r: string) => void; busy?: boolean }) {
  const p = useP();
  const [r, setR] = useState("");
  return (
    <form className="grid w-full gap-2 m-rise" onSubmit={(e) => { e.preventDefault(); if (r.trim()) onSubmit(r); }}>
      <label className="grid gap-1 text-small">{label}<Textarea rows={2} value={r} onChange={(e) => setR(e.target.value)} required maxLength={500} /></label>
      <Button type="submit" size="sm" loading={busy} disabled={!r.trim()} className="w-fit">{p.common.confirm}</Button>
    </form>
  );
}

function PrDrawer({ no }: { no: string }) {
  const c = useDE();
  const p = useP();
  const { locale } = useI18n();
  const { user } = useSession();
  const toast = useToast();
  const online = useOnline();
  const q = usePrFor(no);
  const { run, dialog } = useStepUpAction();
  const approve = usePrDecision("approve"), reject = usePrDecision("reject"), info = usePrDecision("request-info");
  const [mode, setMode] = useState<"reject" | "info" | null>(null);
  if (q.isPending) return <Drawer title={no}><div className="h-64 m-shimmer" /></Drawer>;
  if (q.isError) return <Drawer title={no}><PanelErr onRetry={() => q.refetch()} /></Drawer>;
  const { pr, budget, limits } = q.data;
  const self = pr.requester.id === user?.id;
  const done = (t: string) => { toast({ title: t, tone: "success" }); setUrlParams({ item: null }); };
  const fail = (e: unknown) => toast({ title: errorCopy(e, locale), tone: "danger" });
  return (
    <Drawer title={<span className="flex items-center gap-2"><DocNo kind="PR" no={pr.no} /><ProcPill state={pr.status} machine="pr" /></span>}
      footer={pr.status === "submitted" && online ? (
        <div className="grid w-full gap-3">
          {self && <p className="text-small text-danger">{p.seg.self}</p>}
          <div className="flex flex-wrap gap-2">
            <Button disabled={self} loading={approve.isPending} onClick={() => run(c.payables.approve, (t) => approve.mutateAsync({ no, stepUp: t, idempotencyKey: key() })).then((r) => r !== undefined && done(fill(c.payables.done.approve, { no }))).catch(() => {})}>{c.payables.approve}</Button>
            <Button variant="secondary" onClick={() => setMode("info")}>{c.payables.askInfo}</Button>
            <Button variant="secondary" onClick={() => setMode("reject")}>{c.payables.reject}</Button>
          </div>
          {mode === "reject" && <ReasonRow label={c.payables.reason} busy={reject.isPending} onSubmit={(r) => reject.mutateAsync({ no, reason: r, idempotencyKey: key() }).then(() => done(fill(c.payables.done.reject, { no })), fail)} />}
          {mode === "info" && <ReasonRow label={c.payables.infoTitle} busy={info.isPending} onSubmit={(r) => info.mutateAsync({ no, reason: r, idempotencyKey: key() }).then(() => done(c.payables.done.info), fail)} />}
        </div>
      ) : undefined}>
      {dialog}
      <div className="grid gap-4">
        <h3 className="text-card-title">{pr.title}</h3>
        <p className="text-small text-fg-muted">{c.payables.requester}: {pr.requester.name} · {c.payables.neededBy} {formatDate(pr.neededBy, locale)}</p>
        <VatLines lines={pr.lines} mode="excl" readOnly vatRegistered={false} />
        {budget && <div className="grid gap-1"><p className="text-eyebrow text-fg-subtle">{c.payables.budgetImpact} · {budget.name}</p><BudgetBar used={budget.committed + budget.actual} budget={budget.annualBudget} adding={pr.estimatedTotal} name={budget.name} /></div>}
        {pr.quotes.length > 0 && <div className="grid gap-1"><p className="text-eyebrow text-fg-subtle">{c.payables.quotes}</p><QuoteCompare quotes={pr.quotes} chosenId={pr.chosenQuoteId} reason={pr.chosenReason} required={quotesRequired(pr.estimatedTotal, limits)} readOnly /></div>}
        <div className="grid gap-1"><p className="text-eyebrow text-fg-subtle">{c.payables.justification}</p><p className="text-small">{pr.justification}</p></div>
        <div className="flex flex-wrap gap-1">{pr.routeReasons.map((r) => <Pill key={r} tone="warning" icon="zap">{p.reasons[r]}</Pill>)}</div>
      </div>
    </Drawer>
  );
}

function BillDrawer({ no, authorise }: { no: string; authorise: boolean }) {
  const c = useDE();
  const p = useP();
  const { locale } = useI18n();
  const { user } = useSession();
  const toast = useToast();
  const online = useOnline();
  const q = useBill(no);
  const { run, dialog } = useStepUpAction();
  const act = useBillAction(authorise ? "authorise" : "approve");
  const reject = useBillAction("reject");
  const [rejecting, setRejecting] = useState(false);
  if (q.isPending) return <Drawer title={no}><div className="h-64 m-shimmer" /></Drawer>;
  if (q.isError) return <Drawer title={no}><PanelErr onRetry={() => q.refetch()} /></Drawer>;
  const { bill: b, grns, limits } = q.data;
  const self = authorise ? b.approvedBy?.id === user?.id || b.preparedBy?.id === user?.id : b.preparedBy?.id === user?.id;
  const done = (t: string) => { toast({ title: t, tone: "success" }); setUrlParams({ item: null }); };
  const label = authorise ? c.payables.authorise : c.payables.approve;
  return (
    <Drawer title={<span className="flex items-center gap-2"><DocNo kind="BL" no={b.no} /><ProcPill state={b.status} machine="bill" /></span>}
      footer={online ? (
        <div className="grid w-full gap-3">
          {self && <p className="text-small text-danger">{c.payables.selfLock}</p>}
          <div className="flex flex-wrap gap-2">
            <Button disabled={self} loading={act.isPending} onClick={() => run(label, (t) => act.mutateAsync({ no, stepUp: t, idempotencyKey: key() })).then((r) => r !== undefined && done(fill(authorise ? c.payables.done.authorise : c.payables.done.approve, { no }))).catch(() => {})}>{label}</Button>
            {!authorise && <Button variant="secondary" onClick={() => setRejecting(true)}>{c.payables.reject}</Button>}
          </div>
          {rejecting && <ReasonRow label={c.payables.reason} busy={reject.isPending} onSubmit={(r) => reject.mutateAsync({ no, reason: r, idempotencyKey: key() }).then(() => done(fill(c.payables.done.reject, { no })), (e) => toast({ title: errorCopy(e, locale), tone: "danger" }))} />}
        </div>
      ) : <p className="text-small">{p.states.offlineMoney}</p>}>
      {dialog}
      <div className="grid gap-4">
        <p className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{b.vendorName} · {b.vendorInvoiceNo}</span><Amount value={b.total} size="lg" className="font-semibold" /></p>
        {b.locked && <LockChip until={b.lockUntil} />}
        <SegregationStrip steps={billSteps(b, limits.financeMax)} me={user?.id} selfNote={self ? (authorise ? "selfApproved" : "self") : null} />
        <MatchIndicator po={b.poNo} grn={grns.map((g) => g.no).join(", ") || undefined} bill={b.no} result={b.match?.result ?? "pending"} lines={b.match?.lines ?? []} />
        <VatLines lines={b.lines} mode={b.vatMode} readOnly vatRegistered={q.data.vendor.vatRegistered} />
        {b.noPoJustification && <p className="text-small text-fg-muted">{c.detail.noPo}: {b.noPoJustification}</p>}
      </div>
    </Drawer>
  );
}

// ---------------------------------------------------------------- pay (grouped by vendor, partial amounts, proof, step-up, remittance)
function PayTab() {
  const c = useDE();
  const p = useP();
  const { locale } = useI18n();
  const { user } = useSession();
  const online = useOnline();
  const q = usePayments();
  const [vendor, setVendor] = useState<string | null>(null);
  const [remit, setRemit] = useState<VendorPayment | null>(null);
  if (q.isPending) return <div className="grid gap-3">{[0, 1].map((i) => <div key={i} className="h-28 m-shimmer" />)}</div>;
  if (q.isError) return <PanelErr onRetry={() => q.refetch()} />;
  const groups = new Map<string, BillRow[]>();
  for (const b of q.data.waiting) groups.set(b.vendorId, [...(groups.get(b.vendorId) ?? []), b]);
  if (!groups.size) return <EmptyPanel title={c.payables.nothing} />;
  const me = user ? { id: user.id, roles: user.roles } : null;
  return (
    <div className="grid gap-3 m-stagger">
      {[...groups.entries()].map(([vid, bills], i) => {
        const locked = bills[0].locked;
        const total = bills.reduce((s, b) => s + b.payable - b.amountPaid, 0);
        return (
          <section key={vid} style={{ ["--i" as string]: i }} className={cx("grid gap-3 border bg-surface p-4", locked ? "border-danger/40" : "border-border")}>
            <header className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-card-title">{fill(c.payables.payGroup, { name: bills[0].vendorName, n: bills.length })}</h3>
              <span className="flex items-center gap-3"><Amount value={total} className="font-semibold" />
                <Button size="sm" disabled={locked || !online} onClick={() => setVendor(vid)}>{c.payables.select}</Button></span>
            </header>
            {locked && <p className="flex flex-wrap items-center gap-2 text-small text-danger"><Icon name="lock" size={14} aria-hidden />{c.payables.lockedRow}<LockChip until={bills[0].lockUntil} /></p>}
            <ul className="grid gap-1 text-small">
              {bills.map((b) => {
                const g = me ? guardPay(b, me, { status: b.vendorStatus, lockUntil: b.lockUntil ?? undefined, bankStatus: b.locked ? "unverified" : "verified" }, Date.now()) : null;
                return (
                  <li key={b.no} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-1.5">
                    <span className="flex items-center gap-2"><DocNo kind="BL" no={b.no} />{b.vendorInvoiceNo}<span className="text-fg-muted">· {formatDate(b.dueOn, locale)}</span></span>
                    <span className="flex items-center gap-2">{g === "segregation_violation" && <Pill tone="danger" icon="lock">{c.payables.selfLock.split(", ")[0]}</Pill>}<Amount value={b.payable - b.amountPaid} size="sm" /></span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {vendor && <PayDialog bills={groups.get(vendor) ?? []} onClose={() => setVendor(null)} onPaid={(x) => { setVendor(null); setRemit(x); }} />}
      {remit && <RemitDialog payment={remit} onClose={() => setRemit(null)} />}
    </div>
  );
}

function PayDialog({ bills, onClose, onPaid }: { bills: BillRow[]; onClose: () => void; onPaid: (p: VendorPayment) => void }) {
  const c = useDE();
  const { locale } = useI18n();
  const { user } = useSession();
  const toast = useToast();
  const pay = usePay();
  const { run, dialog } = useStepUpAction();
  const [idem] = useState(newIdempotencyKey);
  const [now] = useState(Date.now);
  const me = user ? { id: user.id, roles: user.roles } : null;
  const eligible = bills.filter((b) => me && !guardPay(b, me, { status: b.vendorStatus, lockUntil: b.lockUntil ?? undefined, bankStatus: b.locked ? "unverified" : "verified" }, now));
  const [amounts, setAmounts] = useState<Record<string, number>>(() => Object.fromEntries(eligible.map((b) => [b.no, b.payable - b.amountPaid])));
  const [method, setMethod] = useState<PayMethod>("bank");
  const [reference, setReference] = useState("");
  const [proof, setProof] = useState<{ id: string; name: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const allocations = eligible.filter((b) => (amounts[b.no] ?? 0) > 0).map((b) => ({ billNo: b.no, amount: amounts[b.no] }));
  const total = allocations.reduce((s, a) => s + a.amount, 0);
  const bad = eligible.some((b) => (amounts[b.no] ?? 0) > b.payable - b.amountPaid || (amounts[b.no] ?? 0) < 0);
  async function go() {
    setErr(null);
    if (!reference.trim() || !proof || !allocations.length || bad) return setErr(`${c.payables.reference} · ${c.payables.proof}`);
    try {
      const r = await run(c.payables.markPaid, (t) => pay.mutateAsync({ allocations, method, reference, proof, stepUp: t, idempotencyKey: idem }));
      if (r) { toast({ title: fill(c.payables.paidDone, { no: r.no }), tone: "success" }); onPaid(r); }
    } catch (e) { setErr(errorCopy(e, locale)); }
  }
  return (
    <Dialog open onClose={onClose} title={fill(c.payables.payGroup, { name: bills[0]?.vendorName ?? "", n: bills.length })} className="sm:max-w-2xl"
      footer={<div className="flex w-full flex-wrap items-center justify-between gap-2"><span className="text-small tabular">{fill(c.payables.total, { amount: formatMoney(total, "RWF", locale) })}</span>
        <Button onClick={go} loading={pay.isPending} disabled={!allocations.length || bad} dots className="m-press">{c.payables.markPaid}</Button></div>}>
      {dialog}
      <div className="grid gap-4">
        {err && <p role="alert" className="bg-danger-bg px-3 py-2 text-small text-danger">{err}</p>}
        <ul className="grid gap-3">
          {bills.map((b) => {
            const ok = eligible.includes(b);
            return (
              <li key={b.no} className={cx("grid gap-2 border border-border p-3", !ok && "opacity-60")}>
                <p className="flex flex-wrap items-center justify-between gap-2 text-small"><span className="flex items-center gap-2"><DocNo kind="BL" no={b.no} />{b.vendorInvoiceNo}</span><Amount value={b.payable - b.amountPaid} size="sm" /></p>
                <SegregationStrip compact steps={billSteps(b, Number.MAX_SAFE_INTEGER)} />
                {ok ? (
                  <label className="grid gap-1 text-small">{c.payables.amount}
                    <Input type="number" inputMode="numeric" min={0} max={b.payable - b.amountPaid} value={amounts[b.no] ?? 0} onChange={(e) => setAmounts({ ...amounts, [b.no]: Math.round(Number(e.target.value)) })} aria-invalid={(amounts[b.no] ?? 0) > b.payable - b.amountPaid} className="h-10" />
                  </label>
                ) : <p className="text-small text-danger">{c.payables.stripIncomplete}</p>}
              </li>
            );
          })}
        </ul>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={c.payables.method}>{(a) => (
            <Select id={a.id} value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
              {(["bank", "mtn_momo", "airtel_money"] as const).map((m) => <option key={m} value={m}>{c.pay.method[m]}</option>)}
            </Select>
          )}</Field>
          <Field label={c.payables.reference}>{(a) => <Input id={a.id} value={reference} maxLength={60} onChange={(e) => setReference(e.target.value)} required />}</Field>
        </div>
        <Field label={c.payables.proof}>{() => proof ? (
          <p className="flex items-center justify-between bg-bg-subtle px-3 py-2 text-small"><span className="truncate">{proof.name}</span><button type="button" className="underline" onClick={() => setProof(null)}>×</button></p>
        ) : <FileDrop accept="application/pdf,image/*" maxSizeMb={10} onFiles={(f) => f[0] && setProof({ id: `pf-${f[0].size}`, name: f[0].name })} />}</Field>
      </div>
    </Dialog>
  );
}

/** PA3 fix: advice lists each bill's stored net/VAT/total; masked account only. */
function RemitDialog({ payment, onClose }: { payment: VendorPayment; onClose: () => void }) {
  const c = useDE();
  const p = useP();
  const toast = useToast();
  const { locale } = useI18n();
  const send = useSendRemittance();
  const [idem] = useState(newIdempotencyKey);
  const [cur, setCur] = useState(payment);
  return (
    <Dialog open onClose={onClose} title={fill(c.payables.remitTitle, { no: cur.remittance.no })}
      footer={<div className="flex gap-2"><Button variant="secondary" onClick={() => window.print()}>{p.common.print}</Button>
        <Button loading={send.isPending} disabled={cur.remittance.status === "sent"} onClick={async () => {
          try { const r = await send.mutateAsync({ no: cur.no, idempotencyKey: idem }); setCur(r); toast({ title: c.payables.sent, tone: "success" }); } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
        }}>{c.payables.send}</Button></div>}>
      <div className="grid gap-3 text-small">
        <p>{cur.remittance.to ? fill(c.payables.remitTo, { email: cur.remittance.to }) : c.payables.remitNoEmail}</p>
        <RemitLines payment={cur} />
        <p className="text-eyebrow text-fg-subtle">{c.payables.remitVat}</p>
        <RemittanceCard payment={cur} />
      </div>
    </Dialog>
  );
}
function RemitLines({ payment }: { payment: VendorPayment }) {
  const c = useDE();
  return (
    <table className="w-full text-small">
      <tbody>
        {payment.allocations.map((a) => <RemitLine key={a.billNo} billNo={a.billNo} amount={a.amount} />)}
        <tr className="border-t border-border-strong font-semibold"><td className="py-2">{c.detail.total}</td><td /><td className="py-2 text-right"><Amount value={payment.amount} /></td></tr>
      </tbody>
    </table>
  );
}
function RemitLine({ billNo, amount }: { billNo: string; amount: number }) {
  const q = useBill(billNo);
  const b = q.data?.bill;
  return (
    <tr className="border-t border-border">
      <td className="py-2"><DocNo kind="BL" no={billNo} /> {b && <span className="text-fg-muted">· {b.vendorInvoiceNo}</span>}</td>
      <td className="py-2 text-fg-muted tabular">{b ? `${formatMoney(b.subtotal, "RWF")} + VAT ${formatMoney(b.vat, "RWF")}` : ""}</td>
      <td className="py-2 text-right"><Amount value={amount} /></td>
    </tr>
  );
}

// ---------------------------------------------------------------- bank changes (call-back checklist)
function BankTab() {
  const c = useDE();
  const { locale } = useI18n();
  const q = useBankChanges();
  const [open, setOpen] = useState<BankChangeRow | null>(null);
  const cols: OpsColumn<BankChangeRow>[] = [
    { key: "supplier", label: c.payables.bank.cols.supplier, wrap: true, cell: (x) => <span className="font-medium">{x.vendorName} <span className="text-eyebrow text-fg-subtle">{x.vendorCode}</span></span> },
    { key: "requested", label: c.payables.bank.cols.requested, sort: (x) => x.requestedAt, cell: (x) => <span className="text-small">{formatDateTime(x.requestedAt, locale)}</span> },
    { key: "by", label: c.payables.bank.cols.by, cell: (x) => <span className="text-small">{x.requestedBy.name}</span> },
    { key: "new", label: c.payables.bank.cols.new, cell: (x) => <span className="text-small tabular">{x.newLabel} {x.newMasked}</span> },
    { key: "state", label: c.payables.bank.cols.state, cell: (x) => <ProcPill state={x.status} machine="bank" /> },
  ];
  return (
    <div className="border border-border bg-surface m-rise">
      <OpsTable rows={q.data?.items ?? []} columns={cols} rowKey={(x) => x.id} label={c.payables.tabs.bank} loading={q.isPending} error={q.isError ? q.error : undefined} onRetry={() => q.refetch()}
        onOpen={(x) => x.status === "requested" && setOpen(x)} empty={<div className="p-4"><EmptyPanel title={c.payables.bank.none} compact /></div>} />
      {open && <BankVerifyDialog change={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
function BankVerifyDialog({ change, onClose }: { change: BankChangeRow; onClose: () => void }) {
  const c = useDE();
  const p = useP();
  const { locale } = useI18n();
  const { user } = useSession();
  const toast = useToast();
  const m = useVerifyBank();
  const { run, dialog } = useStepUpAction();
  const [idem] = useState(newIdempotencyKey);
  const [holder, setHolder] = useState(false), [last4, setLast4] = useState(false);
  const [answeredBy, setAnsweredBy] = useState(""), [reason, setReason] = useState("");
  const self = change.requestedBy.id === user?.id;
  const callback = { calledNumber: change.callbackNumber ?? "", holderConfirmed: holder, last4Confirmed: last4, answeredBy };
  async function decide(decision: "verify" | "reject") {
    try {
      const r = await run(decision === "verify" ? c.payables.bank.verify : c.payables.bank.reject, (t) => m.mutateAsync({ id: change.id, decision, reason, callback, stepUp: t, idempotencyKey: idem }));
      if (r) { toast({ title: decision === "verify" ? fill(c.payables.bank.done, { when: formatDateTime((r as { lockUntil?: string }).lockUntil ?? new Date().toISOString(), locale) }) : c.payables.bank.rejected, tone: "success" }); onClose(); }
    } catch { /* toasted by useStepUpAction */ }
  }
  return (
    <Dialog open onClose={onClose} title={`${c.payables.bank.title}, ${change.vendorName}`} description={c.payables.bank.sub}
      footer={<div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={self || !reason.trim()} onClick={() => decide("reject")}>{c.payables.bank.reject}</Button>
        <Button disabled={self || !holder || !last4 || !answeredBy.trim()} loading={m.isPending} onClick={() => decide("verify")}>{c.payables.bank.verify}</Button>
      </div>}>
      {dialog}
      <div className="grid gap-4">
        {self && <p role="alert" className="text-small text-danger">{c.payables.selfLock}</p>}
        <dl className="grid grid-cols-2 gap-3 bg-bg-subtle p-3 text-small">
          <div><dt className="text-eyebrow text-fg-subtle">{p.bank.title}</dt><dd className="tabular">{change.oldMasked} → <strong>{change.newLabel} {change.newMasked}</strong></dd></div>
          <div><dt className="text-eyebrow text-fg-subtle">{c.payables.bank.calledNumber}</dt><dd className="tabular">{change.callbackNumber ?? ""}</dd></div>
          <div className="col-span-2"><dt className="text-eyebrow text-fg-subtle">{p.common.reason}</dt><dd>{change.reason}</dd></div>
          {change.doc && <div className="col-span-2"><dt className="text-eyebrow text-fg-subtle">{c.payables.bank.doc}</dt><dd>{change.doc.name}</dd></div>}
        </dl>
        <Checkbox checked={holder} onChange={(e) => setHolder(e.target.checked)} label={c.payables.bank.holder} />
        <Checkbox checked={last4} onChange={(e) => setLast4(e.target.checked)} label={fill(c.payables.bank.last4, { masked: change.newMasked })} />
        <Field label={c.payables.bank.answeredBy}>{(a) => <Input id={a.id} value={answeredBy} onChange={(e) => setAnsweredBy(e.target.value)} />}</Field>
        <Field label={p.common.reason} optional={c.payables.bank.reject}>{(a) => <Textarea id={a.id} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------- settings (F-SET-02: finance proposes, executive approves)
function SettingsTab() {
  const c = useDE();
  const p = useP();
  const { locale } = useI18n();
  const toast = useToast();
  const q = useProcSettings();
  const m = useProposeSettings();
  const [idem] = useState(newIdempotencyKey);
  const [financeMax, setFinanceMax] = useState<number | null>(null);
  const [quoteThreshold, setQuoteThreshold] = useState<number | null>(null);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [effectiveOn, setEffectiveOn] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  if (q.isPending) return <div className="h-64 m-shimmer" />;
  if (q.isError) return q.error instanceof ApiError && q.error.isForbidden ? <NoAccess /> : <PanelErr onRetry={() => q.refetch()} />;
  const { limits, budgets: cats, proposals } = q.data;
  const pending = proposals.find((x) => x.status === "pending");
  async function propose() {
    try {
      await m.mutateAsync({
        limits: { ...(financeMax != null && { financeMax }), ...(quoteThreshold != null && { quoteThreshold }) },
        budgets: Object.entries(budgets).map(([code, annualBudget]) => ({ code, annualBudget })), effectiveOn, reason, idempotencyKey: idem,
      });
      toast({ title: c.payables.settings.done, tone: "success" });
    } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
  }
  return (
    <form className="grid gap-5 m-rise" onSubmit={(e) => { e.preventDefault(); propose(); }}>
      <header><h2 className="text-card-title">{c.payables.settings.title}</h2><p className="text-small text-fg-muted">{c.payables.settings.sub}</p></header>
      {pending && <p role="status" className="flex items-center gap-2 bg-warning-bg px-3 py-2 text-small text-warning"><Icon name="clock" size={14} aria-hidden />{c.payables.settings.pending} · {pending.by.name} · {formatDate(pending.effectiveOn, locale)}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={c.payables.settings.financeMax}>{(a) => <Input id={a.id} type="number" inputMode="numeric" disabled={!!pending} value={financeMax ?? limits.financeMax} onChange={(e) => setFinanceMax(Math.round(Number(e.target.value)))} />}</Field>
        <Field label={c.payables.settings.quoteThreshold}>{(a) => <Input id={a.id} type="number" inputMode="numeric" disabled={!!pending} value={quoteThreshold ?? limits.quoteThreshold} onChange={(e) => setQuoteThreshold(Math.round(Number(e.target.value)))} />}</Field>
      </div>
      <div className="overflow-x-auto border border-border bg-surface">
        <table className="w-full min-w-[32rem] text-small">
          <thead className="bg-ink-100 text-left text-eyebrow text-ink-700"><tr><th className="px-3 py-2"><span className="sr-only">{c.payables.settings.budget}</span></th><th className="px-3 py-2">{c.payables.settings.used}</th><th className="w-48 px-3 py-2">{c.payables.settings.budget}</th></tr></thead>
          <tbody>
            {cats.map((b) => {
              const meter = budgetMeter(b, 0, limits);
              return (
                <tr key={b.code} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{b.name}</td>
                  <td className="px-3 py-2"><span className="flex items-center gap-2 tabular"><span className="w-24"><BudgetBar used={meter.used} budget={b.annualBudget} name={b.name} compact /></span>{meter.pct}%</span></td>
                  <td className="px-3 py-2"><Input aria-label={`${c.payables.settings.budget} ${b.name}`} type="number" inputMode="numeric" disabled={!!pending} className="h-9" value={budgets[b.code] ?? b.annualBudget} onChange={(e) => setBudgets({ ...budgets, [b.code]: Math.round(Number(e.target.value)) })} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <Field label={c.payables.settings.effective}>{(a) => <Input id={a.id} type="date" disabled={!!pending} value={effectiveOn} onChange={(e) => setEffectiveOn(e.target.value)} />}</Field>
        <Field label={c.payables.settings.reason}>{(a) => <Textarea id={a.id} rows={2} disabled={!!pending} value={reason} onChange={(e) => setReason(e.target.value)} required />}</Field>
      </div>
      <Button type="submit" disabled={!!pending || !reason.trim()} loading={m.isPending} className="w-fit m-press">{c.payables.settings.propose}</Button>
    </form>
  );
}
