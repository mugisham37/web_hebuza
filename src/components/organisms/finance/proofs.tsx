"use client";
// U9 Transfer proofs (board 06 PY3): queue (client, amount, bank ref, received, lock owner) ⇄ ProofPreview | Bank statement
// tab with match confidence, CheckerPanel (lock, chain, step-up, reject). J/K + Enter over the queue; ?id= selects.
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { useShortcut } from "@/lib/ops/shortcuts";
import { cx, formatDateTime, formatRelative } from "@/shared/format";
import { usePayment, usePayments } from "@/lib/finance/c";
import { Icon } from "@/components/atoms/icon";
import { Button } from "@/components/atoms/button";
import { Tabs } from "@/components/atoms/tabs";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { PageHead, SkeletonRows, useNow } from "@/components/atoms/agent";
import { Amount } from "@/components/atoms/finance";
import { NoAccess } from "@/components/molecules/finance/finance";
import { ArtNothingWaiting } from "@/components/atoms/finance-art";
import { CheckerPanel, PaymentDrawer } from "@/components/organisms/finance/payment-drawer";
import { DesktopOnly, ProofPreview, fill, useP } from "@/components/molecules/finance/finance";
import { isForbidden } from "@/components/atoms/hooks";

export function ProofsView() {
  const p = useP();
  const { locale } = useI18n();
  const url = useUrlParams();
  const now = useNow();
  const list = usePayments("tab=verification");
  const items = (list.data?.items ?? []).filter((r) => r.method === "bank_transfer" || r.state === "under_verification" || r.state === "proof_submitted");
  const id = url.get("id") ?? items[0]?.id ?? null;
  const [drawer, setDrawer] = useState<string | null>(null);
  const idx = items.findIndex((r) => r.id === id);
  const go = (d: number) => { const n = items[Math.min(items.length - 1, Math.max(0, idx + d))]; if (n) setUrlParams({ id: n.id }); };
  useShortcut("j", p.proofs.pickBody, () => go(1), "list");
  useShortcut("k", p.proofs.pickBody, () => go(-1), "list");

  if (isForbidden(list.error)) return <NoAccess />;
  return (
    <div className="grid gap-5">
      <PageHead title={p.proofsTitle} sub={p.proofsSub} />
      <DesktopOnly text={p.proofs.phone} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <section aria-label={p.proofs.queueLabel} className="min-w-0 border border-border bg-white p-3">
          <h2 className="mb-2 px-1 text-label">{fill(p.proofs.queue, { n: items.length })}</h2>
          {list.isPending ? <SkeletonRows n={4} /> : list.error ? <PanelError what={p.proofs.err} onRetry={() => list.refetch()} /> : !items.length ? (
            <EmptyPanel compact title={p.proofs.empty[0]} body={p.proofs.empty[1]} action={<span className="text-navy-600"><ArtNothingWaiting /></span>} />
          ) : (
            <ul className="grid gap-2 m-stagger">
              {items.map((r) => (
                <li key={r.id}>
                  <button type="button" aria-current={r.id === id} onClick={() => setUrlParams({ id: r.id })} onDoubleClick={() => setDrawer(r.id)}
                    className={cx("m-lift flex w-full items-center gap-3 border p-3 text-left transition-colors",
                      r.id === id ? "border-secondary bg-navy-50" : "border-border hover:bg-navy-50")}>
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="truncate text-small font-medium">{r.clientName}</span>
                      <Amount value={r.amount} size="lg" />
                      <span className="truncate text-eyebrow text-fg-muted tabular">{r.ref ?? "—"}</span>
                      <span className="text-eyebrow text-fg-subtle">{fill(p.proofs.received, { t: now ? formatRelative(r.at, locale, now) : formatDateTime(r.at, locale) })}</span>
                    </span>
                    {r.state === "under_verification" && <Icon name="lock" size={14} aria-label={p.tabs.verification} className="text-navy-600" />}
                    <Icon name="arrowRight" size={16} aria-hidden className="text-fg-subtle" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <div className="min-w-0">
          {id ? <ProofDetail key={id} id={id} onOpen={() => setDrawer(id)} /> : !list.isPending && (
            <EmptyPanel title={p.proofs.pick} body={p.proofs.pickBody} />
          )}
        </div>
      </div>
      <PaymentDrawer id={drawer} onClose={() => setDrawer(null)} />
    </div>
  );
}

function ProofDetail({ id, onOpen }: { id: string; onOpen: () => void }) {
  const p = useP();
  const { locale } = useI18n();
  const q = usePayment(id);
  const [tab, setTab] = useState("preview");
  if (q.isPending) return <SkeletonRows n={6} />;
  if (q.error || !q.data) return <PanelError what={p.proofs.err} onRetry={() => q.refetch()} />;
  const d = q.data;
  const pay = d.payment;
  const open = pay.state === "proof_submitted" || pay.state === "under_verification";
  return (
    <section aria-label={pay.clientName} className="grid gap-4 border border-border bg-white p-4 m-rise">
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: "preview", label: p.proofs.tabPreview, content: (
          <ProofPreview fileName={d.evidence} href={d.evidenceHref} amount={pay.amountExpected} bankRef={pay.bankReference} candidate={d.candidates[0] ?? null}
            action={<Button size="sm" variant="ghost" className="w-fit" onClick={onOpen}>{p.proofs.open}<Icon name="arrowUpRight" size={14} aria-hidden /></Button>} />
        ) },
        { id: "statement", label: p.proofs.tabStatement, count: d.candidates.length, content: d.candidates.length ? (
          <div role="region" aria-label={p.proofs.tabStatement} tabIndex={0} className="overflow-x-auto">
            <table className="w-full text-small">
              <thead><tr className="text-left text-eyebrow text-fg-subtle"><th className="py-2 pr-3">{p.proofs.ref}</th><th className="pr-3">{p.cols.at}</th><th className="pr-3 text-right">{p.cols.amount}</th><th>{p.cols.state}</th></tr></thead>
              <tbody>
                {d.candidates.map((c) => (
                  <tr key={c.lineId} className="border-t border-border">
                    <td className="py-2 pr-3 tabular">{c.externalRef}</td>
                    <td className="pr-3 tabular">{formatDateTime(c.at, locale)}</td>
                    <td className="pr-3 text-right"><Amount value={c.amount} size="sm" /></td>
                    <td className="text-eyebrow">
                      <span className={c.exactAmount ? "text-success" : "text-warning"}>{c.exactAmount ? p.checker.exact : p.checker.amountOff}</span> · <span className={c.refFound ? "text-success" : "text-warning"}>{c.refFound ? p.checker.refFound : p.checker.refMissing}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-small text-fg-muted">{p.checker.noLine}</p> },
      ]} />
      {open ? <CheckerPanel d={d} q={q} compact /> : <p className="text-small text-fg-muted">{p.checker.readonly}</p>}
    </section>
  );
}
