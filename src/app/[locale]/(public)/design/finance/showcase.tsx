"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { cx } from "@/shared/format";
import { docTotals, depositSplit } from "@/lib/finance/money";
import { manualChain, refundChain, sign } from "@/shared/finance/approvals";
import { BUCKETS } from "@/shared/finance/ageing";
import type { DocLine, MatchState } from "@/shared/finance/types";
import {
  Amount, AmountDelta, DocNumber, FinStatus, TierChip, SignerAvatar, LockChip, MatchChip, AgeingBucketChip, MethodTag,
  VerifyScheduleChip, EbmBadge, SeriesTag, PeriodLabel, FxNote, DemoValue,
} from "@/components/atoms/finance";
import {
  MoneyTile, ApprovalChain, MakerChecker, LineEditor, TotalsPanel, EligibleBreakdown, FiveStatesBar, AgeingBar, DiffList, HistoryTab,
  ReportFrame, ExportMenu, ConflictDialog, NoAccess, useStepUpAction,
} from "@/components/molecules/finance/finance";
import { ArtReconciled, ArtNoRefunds, ArtNothingWaiting, ArtNoBatches, ArtNoOverdue, ArtNoImports, ArtImportFailed } from "@/components/atoms/finance-art";
import { Button } from "@/components/atoms/button";

const T = "2026-11-12T08:00:00Z";
const LOAD = Date.now(); // module scope, never in render
const inMin = (m: number) => new Date(LOAD + m * 60_000).toISOString();
const PAT = { id: "mock-finance", name: "Patrick Niyonzima" };
const SOL = { id: "mock-finance2", name: "Solange Mukeshimana" };
const W1: DocLine[] = [
  { kind: "service_fee", label: "Company registration · standard tier", qty: 1, unit: 50_000 },
  { kind: "urgent_surcharge", label: "Urgent surcharge 20%", qty: 1, unit: 10_000 },
  { kind: "government_fee", label: "RDB registration fee", qty: 1, unit: 0 },
  { kind: "third_party_cost", label: "Notary", qty: 1, unit: 10_000 },
];
const STATUSES = ["draft", "sent", "issued", "partially_paid", "paid", "overdue", "void", "pending_provider", "proof_submitted", "under_verification", "confirmed", "failed", "reversed", "recommended", "awaiting_executive", "refunded", "pending_review", "approved_for_payment", "in_batch", "authorised", "closed"];
const MATCHES: MatchState[] = ["matched", "suggested", "exception", "unmatched", "ignored", "duplicate"];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border border-border bg-white p-6 m-rise">
      <h2 id={id} className="mb-5 text-eyebrow tracking-wide text-fg-subtle uppercase">{title}</h2>
      {children}
    </section>
  );
}
const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid gap-2 py-3 sm:grid-cols-[10rem_1fr] sm:items-center"><p className="text-small text-fg-muted">{label}</p><div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div></div>
);

export function FinanceKitShowcase() {
  const { locale } = useI18n();
  const [still, setStill] = useState(false);
  const [lines, setLines] = useState(W1);
  const [conflict, setConflict] = useState(false);
  const [job, setJob] = useState<{ id: string; status: "queued" | "running" | "ready" | "failed" | "expired"; format: string } | null>(null);
  const { run, dialog } = useStepUpAction();
  const totals = docTotals(lines);
  const half = sign(manualChain(600_000), PAT, T);
  return (
    <div className={cx("mx-auto grid max-w-6xl gap-6 px-gutter pt-[var(--spacing-hero-top)] pb-16", still && "fin-still")}>
      {/* Reduced-motion preview: freezes every m-* animation/transition inside the kit. */}
      <style>{`.fin-still *, .fin-still *::before { animation: none !important; transition: none !important; }`}</style>
      <header className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <p className="text-eyebrow text-fg-subtle uppercase">Stage 5 · Finance Officer</p>
          <h1 className="text-h2">Finance component kit</h1>
          <p className="text-body text-fg-muted">Track every franc — quotation to payout, with a full audit trail.</p>
        </div>
        <nav aria-label="Language" className="flex gap-1">
          {(["rw", "en", "fr"] as const).map((l) => <Link key={l} href={`/${l}/design/finance`} aria-current={l === locale ? "page" : undefined} className="inline-flex h-9 items-center px-3 text-small uppercase text-fg hover:bg-navy-50 aria-[current=page]:bg-secondary aria-[current=page]:text-on-secondary">{l}</Link>)}
        </nav>
        <Button size="sm" variant="outline" aria-pressed={still} onClick={() => setStill(!still)}>Reduced motion: {still ? "on" : "off"}</Button>
      </header>

      <Section id="fk1" title="FK1 · Money">
        <Row label="Amount"><Amount value={80_800} /><Amount value={-9_000} /><Amount value={9_200} credit /><Amount value={0} /><Amount value={472_000} strike /><Amount value={999_999_999_999} size="sm" /></Row>
        <Row label="Delta"><AmountDelta value={12} period="last month" /><AmountDelta value={-4} period="last month" /><AmountDelta value={0} period="yesterday" /></Row>
        <div className="grid gap-3 py-3 sm:grid-cols-2 lg:grid-cols-4">
          <MoneyTile label="Collected today" value={1_284_000} delta={12} deltaPeriod="yesterday" count="14 payments" tone="lavender" icon="chart" spark={[3, 5, 4, 7, 6, 9, 8]} href="#fk1" />
          <MoneyTile label="Pending confirmation" value={2_592_000} count="4 proofs" icon="clock" />
          <MoneyTile label="Unreconciled" value={null} loading />
          <MoneyTile label="Refunds awaiting" value={null} error onRetry={() => {}} />
        </div>
      </Section>

      <Section id="fk2" title="FK2 · Status (icon + text)">
        <Row label="Records">{STATUSES.map((s) => <FinStatus key={s} status={s} />)}</Row>
        <Row label="Documents"><DocNumber no="INV-2026-00042" /><DocNumber no={null} /><DocNumber no="INV-2026-00017" void /><SeriesTag series="standard" /><SeriesTag series="deposit" /><SeriesTag series="plan" /><SeriesTag series="credit" /></Row>
        <Row label="EBM"><EbmBadge required /><EbmBadge no="EBM-0012345" /></Row>
        <Row label="Methods">{["mtn_momo", "airtel_money", "card", "bank_transfer", "cash"].map((m) => <MethodTag key={m} method={m} />)}</Row>
        <Row label="Verify"><VerifyScheduleChip nextAt={inMin(4)} cadence="5m" /><VerifyScheduleChip nextAt={inMin(50)} cadence="1h" /></Row>
      </Section>

      <Section id="fk3" title="FK3 · Maker / checker & approval chains">
        <Row label="Tiers"><TierChip tier="finance" /><TierChip tier="finance_second" limit={500_000} /><TierChip tier="executive" limit={200_000} /><TierChip tier="sm" /></Row>
        <Row label="Signers"><SignerAvatar user={PAT} state="signed" caption="Checker" /><SignerAvatar user={SOL} state="you" /><SignerAvatar user={null} state="waiting" /><SignerAvatar user={PAT} state="blocked" /></Row>
        <div className="grid gap-3 py-3">
          <MakerChecker maker={PAT} checker={SOL} />
          <MakerChecker maker={PAT} checker={PAT} />
          <ApprovalChain steps={half} me={{ id: SOL.id, roles: ["staff:finance"] }} onSign={() => run("approve a manual payment", async () => true)} />
          <ApprovalChain steps={half} me={{ id: PAT.id, roles: ["staff:finance"] }} />
          <ApprovalChain steps={sign(sign(refundChain(250_000), { id: "mock-sm", name: "Diane Mukamana" }, T), PAT, T)} />
        </div>
      </Section>

      <Section id="fk5" title="FK5 · Period lock & reconciliation">
        <Row label="Locks"><LockChip scope="day" state="open" /><LockChip scope="day" state="closed" /><LockChip scope="month" state="closed" /><LockChip scope="day" state="reopened" /></Row>
        <Row label="Match">{MATCHES.map((m) => <MatchChip key={m} state={m} />)}</Row>
        <Row label="Period"><PeriodLabel from="2026-11-01" to="2026-11-30" /></Row>
      </Section>

      <Section id="fk6" title="FK6 · Ageing & money states (table alternatives)">
        <Row label="Buckets">{BUCKETS.map((b) => <AgeingBucketChip key={b} bucket={b} />)}</Row>
        <div className="grid gap-6 py-3 md:grid-cols-2">
          <AgeingBar buckets={{ not_due: 3_200_000, "0_30": 12_000_000, "31_60": 8_000_000, "61_90": 5_000_000, "90_plus": 3_000_000 }} onPick={() => {}} />
          <FiveStatesBar values={{ invoiced: 4_120_000, collected: 3_860_000, allocated: 1_020_000, approved: 840_000, paid: 610_000 }} />
        </div>
      </Section>

      <Section id="fk7" title="FK7 · Lines & totals (QT2 / IN2)">
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <LineEditor lines={lines} onChange={setLines} errors={lines.some((l) => !String(l.label)) ? { [lines.findIndex((l) => !String(l.label))]: "Add a description" } : {}} />
          <TotalsPanel totals={totals} deposit={depositSplit(totals.total) && { ...depositSplit(totals.total)!, pct: "50%" }} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <LineEditor lines={W1} readOnly />
          <EligibleBreakdown eligible={60_000} deductions={[{ kind: "courier", amount: 5_000, note: "Courier" }]} credits={0} netBase={55_000} />
        </div>
      </Section>

      <Section id="fk8" title="FK8 · History / diff">
        <DiffList before={{ vat_bps: 1800, effectiveFrom: "2026-01-01" }} after={{ vat_bps: 1600, effectiveFrom: "2027-01-01" }} />
        <div className="mt-4"><HistoryTab resourceType="setting" resourceId="vat_bps" /></div>
      </Section>

      <Section id="rp" title="Report frame & exports">
        <ReportFrame title="Revenue reconciliation" period={<PeriodLabel from="2026-11-01" to="2026-11-30" />} generatedAt={T} freshness={T}
          definitions={[{ key: "Collected", text: "Confirmed payments minus refunds processed in the period." }]}
          actions={<ExportMenu formats={["csv", "xlsx", "pdf"]} job={job} onPick={(format) => { setJob({ id: "j1", status: "running", format }); setTimeout(() => setJob({ id: "j1", status: "ready", format }), 1200); }} />}>
          <p className="text-small text-fg-muted"><DemoValue>RWF 4,120,000</DemoValue> invoiced · drill rows sum to the tile.</p>
        </ReportFrame>
        <Row label="FX"><FxNote rate={1383.5} at={T} currency="USD" /></Row>
      </Section>

      <Section id="st" title="States, dialogs & art">
        <Row label="Dialogs"><Button size="sm" variant="outline" onClick={() => setConflict(true)}>Conflict</Button><Button size="sm" variant="outline" onClick={() => run("reveal an account number", async () => true)}>Step-up</Button></Row>
        <div className="grid grid-cols-2 gap-4 py-4 text-ink-900 sm:grid-cols-4">
          <ArtReconciled /><ArtNoRefunds /><ArtNothingWaiting /><ArtNoBatches /><ArtNoOverdue /><ArtNoImports /><ArtImportFailed />
        </div>
        <div className="border border-border"><NoAccess /></div>
      </Section>
      <ConflictDialog open={conflict} who="Solange Mukeshimana" when={inMin(-1)} onRefresh={() => setConflict(false)} onClose={() => setConflict(false)} />
      {dialog}
    </div>
  );
}
