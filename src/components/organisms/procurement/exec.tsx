"use client";
// X1 executive procurement approvals (thin, Stage 14 restyles): phone-first cards (board 11 PAP1, board 04 PCT1),
// step-up on every decision; reject needs a reason; segregation override flagged in audit.
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { formatDate, formatMoney, formatRelative } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { newIdempotencyKey } from "@/lib/api/client";
import { useDecideSettings, useProcApprovals, useProcSettings } from "@/lib/procurement/api";
import { useBillAction, useBills, useContractFor, useForfeitDecision, usePrDecision, useRenewalDecision } from "@/lib/procurement/de";
import type { ProcApproval } from "@/shared/procurement/types";
import { fill } from "@/content/pages/procurement-common";
import { SavedViewTabs } from "@/components/molecules/ops/ops";
import { useOnline } from "@/components/atoms/hooks";
import { useStepUpAction } from "@/components/molecules/finance/finance";
import { Button } from "@/components/atoms/button";
import { Textarea } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { Amount, DocNo, Pill, useP } from "@/components/atoms/procurement";
import { PanelErr } from "@/components/molecules/procurement/procurement";
import { useDE } from "@/components/organisms/procurement/bills";

const TABS = ["pr", "bills", "exceptions", "renewals", "settings", "overrides"] as const;
type Tab = (typeof TABS)[number];
const tabOf = (i: ProcApproval): Tab =>
  i.kind === "pr" ? "pr" : i.kind === "bill_approve" || i.kind === "bill_authorise" ? "bills" : i.kind === "renewal" ? "renewals" : i.kind === "settings" ? "settings" : "exceptions";

export function ExecProcApprovals() {
  const c = useDE();
  const u = useUrlParams();
  const q = useProcApprovals();
  const bills = useBills();
  const tab = (TABS as readonly string[]).includes(u.get("type") ?? "") ? (u.get("type") as Tab) : "pr";
  const items = (q.data?.items ?? []).filter((i) => i.href.startsWith("/exec"));
  const overrides = (bills.data?.items ?? []).filter((b) => b.override);
  return (
    <section aria-labelledby="proc-exec" className="grid gap-4">
      <header><h2 id="proc-exec" className="text-h3">{c.exec.title}</h2><p className="text-small text-fg-muted">{c.exec.sub}</p></header>
      <SavedViewTabs active={tab} onChange={(k) => setUrlParams({ type: k === "pr" ? null : k, item: null })}
        views={TABS.map((t) => ({ key: t, label: c.exec.tabs[t], count: t === "overrides" ? overrides.length : q.data ? items.filter((i) => tabOf(i) === t).length : undefined }))} />
      {q.isPending ? <div className="grid gap-3 sm:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-40 m-shimmer" />)}</div>
        : q.isError ? <PanelErr onRetry={() => q.refetch()} />
        : tab === "overrides" ? (overrides.length ? (
          <ul className="grid gap-2">{overrides.map((b) => <li key={b.no} className="border border-warning bg-surface p-4 text-small"><DocNo kind="BL" no={b.no} /> · {b.vendorName} · {b.override?.by.name}: {b.override?.reason}</li>)}</ul>
        ) : <p className="py-8 text-center text-small text-fg-muted">{c.exec.overrides}</p>)
        : (() => {
          const list = items.filter((i) => tabOf(i) === tab);
          return list.length ? <ul className="grid gap-3 sm:grid-cols-2 m-stagger">{list.map((i, k) => <li key={i.id} style={{ ["--i" as string]: k }}><Card item={i} /></li>)}</ul>
            : <p className="py-8 text-center text-small text-fg-muted">{c.exec.none}</p>;
        })()}
    </section>
  );
}

function Card({ item }: { item: ProcApproval }) {
  const c = useDE();
  const p = useP();
  const { locale } = useI18n();
  const toast = useToast();
  const online = useOnline();
  const { run, dialog } = useStepUpAction();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [override, setOverride] = useState(false);
  const prA = usePrDecision("approve"), prR = usePrDecision("reject");
  const billA = useBillAction(item.kind === "bill_authorise" ? "authorise" : "approve"), billR = useBillAction("reject");
  const exc = useBillAction("exception");
  const ren = useRenewalDecision(), forf = useForfeitDecision(), set = useDecideSettings();
  const contract = useContractFor(item.kind === "renewal" ? item.ref : null);
  const settings = useProcSettings();
  const busy = prA.isPending || prR.isPending || billA.isPending || billR.isPending || exc.isPending || ren.isPending || forf.isPending || set.isPending;
  const idem = newIdempotencyKey;

  async function decide(decision: "approve" | "reject") {
    const r = decision === "reject" ? reason : override ? reason : undefined;
    const fn = (t: string) => {
      const base = { stepUp: t, idempotencyKey: idem() };
      switch (item.kind) {
        case "pr": return (decision === "approve" ? prA : prR).mutateAsync({ no: item.ref, reason: r, ...base });
        case "bill_approve": case "bill_authorise": return decision === "approve" ? billA.mutateAsync({ no: item.ref, override: override ? reason : undefined, ...base }) : billR.mutateAsync({ no: item.ref, reason: r, ...base });
        case "exception": return exc.mutateAsync({ no: item.ref, decision, reason: r || "Approved by executive", ...base });
        case "forfeit": return forf.mutateAsync({ no: item.ref, decision, reason: r, ...base });
        case "renewal": return ren.mutateAsync({ id: contract.data?.contract.id ?? item.ref, decision, reason: r, ...base });
        case "settings": return set.mutateAsync({ id: item.ref, decision, reason: r, ...base });
        default: return Promise.resolve(undefined);
      }
    };
    try { const res = await run(decision === "approve" ? c.exec.approve : c.exec.reject, fn); if (res !== undefined) toast({ title: c.exec.done, tone: "success" }); } catch { /* toasted */ }
  }
  const proposal = item.kind === "settings" ? settings.data?.proposals.find((x) => x.id === item.ref) : undefined;
  const needsOverride = item.blockedSelf && item.kind === "bill_approve";
  return (
    <article className="grid gap-3 border border-border bg-surface p-4">
      {dialog}
      <header className="flex items-start justify-between gap-2">
        <span className="grid min-w-0"><DocNo no={item.ref} /><span className="truncate text-small text-fg-muted" title={item.title}>{item.title}</span></span>
        <span className="text-eyebrow text-fg-subtle">{formatRelative(item.at, locale)}</span>
      </header>
      {item.amount != null && <Amount value={item.amount} size="xl" className="font-semibold" />}
      <div className="flex flex-wrap gap-1.5">
        {item.reasons.map((r) => <Pill key={r} tone="warning" icon="zap">{p.reasons[r] ?? r}</Pill>)}
        <Pill tone="neutral" icon="user">{item.maker.name}</Pill>
      </div>
      {item.kind === "renewal" && contract.data?.contract.renewal && (
        <p className="text-small">{fill(c.exec.renewal, { amount: formatMoney(contract.data.contract.renewal.amount, "RWF", locale), date: formatDate(contract.data.contract.renewal.endOn, locale) })} · {contract.data.contract.renewal.reason}</p>
      )}
      {proposal && <p className="text-small">{fill(c.exec.settings, { name: proposal.by.name, date: formatDate(proposal.effectiveOn, locale) })} · {proposal.reason}</p>}
      {needsOverride && (
        <label className="flex items-start gap-2 bg-warning-bg p-3 text-small text-warning">
          <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="mt-1" />
          <span><strong>{c.exec.override}</strong>, {c.exec.overrideHint}</span>
        </label>
      )}
      {(rejecting || override) && <label className="grid gap-1 text-small m-rise">{c.exec.reason}<Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></label>}
      {online ? (
        <div className="flex flex-wrap gap-2">
          <Button loading={busy} disabled={(needsOverride && (!override || !reason.trim())) || (rejecting)} onClick={() => decide("approve")} className="flex-1 m-press">{c.exec.approve}</Button>
          {rejecting ? <Button variant="secondary" disabled={!reason.trim()} onClick={() => decide("reject")} className="flex-1">{c.exec.reject}</Button>
            : <Button variant="secondary" onClick={() => setRejecting(true)} className="flex-1">{c.exec.reject}</Button>}
        </div>
      ) : <p className="text-small text-fg-muted">{p.states.offlineMoney}</p>}
    </article>
  );
}
