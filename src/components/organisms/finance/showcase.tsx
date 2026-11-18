"use client";
import { NeedsYouStrip } from "@/components/organisms/finance/overview";
import { MineChip, SlaCell } from "@/components/organisms/finance/approvals";
import { ReportCard } from "@/components/organisms/finance/reports";
import { BalanceCard } from "@/components/organisms/finance/accounting-export";
import { useState } from "react";
import { docTotals, payoutLine } from "@/lib/finance/money";
import { type DocLine } from "@/shared/finance/types";
import { Button } from "@/components/atoms/button";
import { DocumentPreview, ExpiryChip, Meta } from "@/components/molecules/finance/finance";
import { type LineRow, type PlatformRow } from "@/lib/finance/c";
import { PlatformLineRow, ProofPreview, StatementLineRow } from "@/components/molecules/finance/finance";
import { ChannelPreview, ExecSteps, ImpactTable } from "@/components/molecules/finance/refunds";
import { type LineView } from "@/lib/finance/e";
import { DesktopOnly, LaneBanner, Steps, useP, useR } from "@/components/molecules/finance/revenue";
import { LineDetails, TotalsStrip } from "@/components/organisms/finance/payouts";
import { PendingPanel, type Pending } from "@/components/organisms/finance/settings";

// Lane A showcase section for /design/finance (mounted by the integrator): lane-only molecules in their states.
export function KitA() {
  const soon = "2099-01-01T00:00:00Z";
  return (
    <section aria-label="Finance lane A" className="grid gap-6">
      <NeedsYouStrip items={[{ key: "unmatched", n: 3, href: "/finance/reconciliation" }, { key: "proofs", n: 4, href: "/finance/payments/proofs" }, { key: "allocations", n: 23, href: "/finance/revenue?tab=allocations" }]} />
      <div className="flex flex-wrap items-center gap-3">
        <MineChip mine="sign" /><MineChip mine="waiting" /><MineChip mine="blocked" />
        <SlaCell at={soon} /><SlaCell at="2000-01-01T00:00:00Z" /><SlaCell />
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        <ReportCard k="fin.revenue_reconciliation" lastRun="2026-11-10T14:32:00Z" />
        <ReportCard k="fin.collections" lastRun={null} />
        <ReportCard k="fin.vat" lastRun={undefined} />
      </ul>
      <div className="grid gap-3 sm:grid-cols-2">
        <BalanceCard debits={2_946_350} credits={2_946_350} balanced count={42} />
        <BalanceCard debits={2_946_351} credits={2_946_350} balanced={false} count={43} />
      </div>
    </section>
  );
}

// Lane B showcase for /design/finance (integrator mounts it): expiry chip, document preview, record meta.
const LINES: DocLine[] = [
  { kind: "service_fee", label: "Company registration · standard tier", qty: 1, unit: 50_000 },
  { kind: "urgent_surcharge", label: "Urgent surcharge 20%", qty: 1, unit: 10_000 },
  { kind: "government_fee", label: "RDB registration fee", qty: 1, unit: 0 },
  { kind: "third_party_cost", label: "Notary", qty: 1, unit: 10_000 },
];

export function KitB() {
  const [open, setOpen] = useState(false);
  return (
    <section aria-label="Lane B" className="grid gap-4 border border-border bg-white p-5">
      <h3 className="text-card-title">Quotes & invoices</h3>
      <dl className="flex flex-wrap gap-6">
        <Meta label="Valid until (≤ 48 h)"><ExpiryChip validUntil="2026-11-14" label="Expires {t}" /></Meta>
        <Meta label="Valid until"><ExpiryChip validUntil="2026-12-30" label="Expires {t}" /></Meta>
      </dl>
      <Button variant="outline" className="w-fit" onClick={() => setOpen(true)}>Document preview (80,800)</Button>
      <DocumentPreview open={open} onClose={() => setOpen(false)} title="Preview" kindLabel="Quotation" no="QUO-2026-00001 · v3"
        billTo={{ name: "Kigali Fresh Foods Ltd", tin: "108245671" }} date="2026-11-10" lines={LINES} totals={docTotals(LINES)} lang="en" />
    </section>
  );
}

// Lane C showcase for /design/finance (integrator mounts KitC): ProofPreview states + workbench rows.
const AT = "2026-11-09T09:12:00.000Z";
const line = (id: string, match: LineRow["match"], extra: Partial<LineRow> = {}): LineRow => ({
  id, importId: "imp-demo", externalRef: `MP261109.${id}`, amount: 40_400, fee: 404, occurredAt: AT, match, rev: 1, day: "2026-11-09", locked: false, ...extra,
});
const PLATFORM: PlatformRow = { id: "pay-demo", at: AT, ref: "BK FT26314XQ7", invoiceNo: "INV-2026-00123", clientName: "Umucyo Logistics Ltd", amount: 600_000, state: "confirmed" };

export function KitC() {
  return (
    <section aria-label="Lane C" className="grid gap-6">
      <h2 className="text-h3">Payments & reconciliation</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <ProofPreview fileName="BK-FT26314XQ7.pdf" amount={600_000} bankRef="BK FT26314XQ7"
          candidate={{ lineId: "l1", importId: "imp-demo", externalRef: "BK FT26314XQ7", amount: 600_000, at: AT, exactAmount: true, refFound: true }} />
        <ProofPreview fileName="receipt.jpg" amount={472_000} bankRef="BK FT26314XR2"
          candidate={{ lineId: "l2", importId: "imp-demo", externalRef: "BK FT26314XR9", amount: 472_000, at: AT, exactAmount: true, refFound: false }} />
        <ProofPreview amount={320_000} bankRef="BK FT26314XS4" candidate={null} />
      </div>
      <ul className="grid gap-2">
        <StatementLineRow line={line("1001", "matched", { payment: { id: "pay-1", invoiceNo: "INV-2026-00123", clientName: "Aline Uwase", amount: 40_400, state: "confirmed" }, by: { name: "Patrick Niyonzima", at: AT } })} />
        <StatementLineRow selected line={line("1211", "exception", { diff: 400, payment: { id: "pay-2", invoiceNo: "INV-2026-00124", clientName: "Kigali Fresh Foods Ltd", amount: 40_000, state: "confirmed" } })} />
        <StatementLineRow line={line("9001", "unmatched", { payer: "2507••••901" })} />
        <StatementLineRow line={line("1212", "suggested", { locked: true })} />
      </ul>
      <ul className="grid gap-2"><PlatformLineRow row={PLATFORM} /></ul>
    </section>
  );
}

// Lane D showcase for /design/finance (mounted by the integrator): impact table, payout steps, reminder previews.
export function KitD() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <ImpactTable rows={[
        { workerId: "kit-1", name: "Eric Habimana", allocated: 18_000, reversal: -9_000, net: 9_000, paidOut: true, voided: false },
        { workerId: "kit-2", name: "Aline Uwase", allocated: 6_000, reversal: -6_000, net: 0, paidOut: false, voided: true },
      ]} />
      <div className="grid gap-6">
        <ExecSteps states={["done", "active", "todo"]} />
        <ExecSteps states={["done", "failed", "todo"]} />
      </div>
      <ChannelPreview channel="whatsapp" text="Muraho. Turabibutsa kwishyura inyemezabuguzi INV-2026-00119." time="14:24" />
      <ChannelPreview channel="sms" text="Hello, a friendly reminder that invoice INV-2026-00119 is due." time="14:24" />
    </div>
  );
}

// Lane E showcase for /design/finance (integrator mounts KitE): builder steps, payout totals strip (W13 numbers from
// payoutLine), line breakdown, desktop-only builder card, offline banner.
export function KitE() {
  const p = useP();
  const r = useR();
  // W13: external agent, gross 120,000, adjustment −9,000, licence 10,000 → net 84,350 (computed by money.ts).
  const w = payoutLine({ gross: 120_000, adjustments: -9_000, fees: 10_000, external: true });
  const line: LineView = {
    id: "kit", workerId: "ag-patrick", name: "Patrick Mugisha", kind: "external", gross: 120_000, adjustments: -9_000, fees: w.fees, wht: w.wht, net: w.net,
    carryForward: w.carryForward, taxable: w.taxable, carriedIn: 0, method: "bank", destination: { masked: "EQ •••• 9902", verified: true }, status: "pending",
    parts: { allocations: [{ id: "a1", caseRef: "HBZ-4K2M9Q", amount: 120_000 }], adjustments: [{ id: "j1", amount: -9_000, reason: "correction" }], fees: [{ id: "f1", month: "2026-10", amount: 10_000 }] },
  };
  return (
    <section className="grid gap-6">
      <h2 className="text-h3">Finance · lane E (revenue & payouts)</h2>
      <Steps steps={p.builder.steps} current={1} />
      <TotalsStrip t={{ gross: 120_000, adjustments: -9_000, fees: w.fees, wht: w.wht, net: w.net, carried: w.carryForward }} />
      <div className="border border-border bg-white p-4"><LineDetails l={line} /></div>
      <LaneBanner offline={p.offline} />
      <DesktopOnly title={r.wizard.phone} body={r.wizard.phoneBody} back={null} />
    </section>
  );
}

// Lane F showcase for /design/finance (mounted by the integrator): pending-change card + section nav states.
const SAMPLE: Pending[] = [
  { id: "kit-1", label: "VAT rate", old: "18%", next: "18%", effectiveAt: "2026-12-01", status: "proposed", by: { id: "kit", name: "Patrick Niyonzima" }, reason: "Sample value", core: true },
  { id: "kit-2", label: "Invoice · Prefix", old: "INV-", next: "FAC-", effectiveAt: "2027-01-01", status: "scheduled", by: { id: "kit", name: "Solange Mukeshimana" }, reason: "Sample value", core: false },
];

export function KitF() {
  return <PendingPanel items={SAMPLE} />;
}
