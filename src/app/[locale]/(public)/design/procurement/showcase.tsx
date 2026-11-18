"use client";
import type { ReactNode } from "react";
import { Amount, AgeBadge, BudgetBar, ExpiryChip, Fact, LockChip, MatchDot, ProcPill, TolerancePill, VendorTypeIcon, type MatchDotState } from "@/components/atoms/procurement";
import { ConflictBanner, ContractTimeline, PanelErr, ProcNoAccess, SegregationStrip, type SegStep } from "@/components/molecules/procurement/procurement";

// Fixed demo date so the kit renders identically everywhere (no Date.now in render).
const TODAY = "2026-11-12";
const PAT = { id: "mock-finance", name: "Patrick Niyonzima" };
const JOS = { id: "mock-procurement", name: "Josiane Uwera" };
const BILL = ["draft", "submitted", "matched", "match_exception", "approved", "authorised", "partially_paid", "paid", "disputed", "void"];
const PR = ["draft", "submitted", "info_requested", "approved", "rejected", "withdrawn", "ordered"];
const CONTRACT = ["draft", "active", "expiring", "renewed", "terminated", "expired"];
const DOTS: MatchDotState[] = ["matched", "tolerance", "exception", "no_po", "pending", "contract"];
const STEPS: SegStep[] = [
  { role: "prepared", who: JOS, at: "2026-11-10T09:00:00Z", state: "done" },
  { role: "approved", who: PAT, at: "2026-11-11T10:00:00Z", state: "done" },
  { role: "authorised", state: "pending", waitingFor: "Executive" },
  { role: "paid", state: "pending", waitingFor: "Finance" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-border bg-white p-6 m-rise">
      <h2 className="mb-5 text-eyebrow tracking-wide text-fg-subtle uppercase">{title}</h2>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </section>
  );
}

export function ProcurementKitShowcase() {
  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-10">
      <h1 className="text-h2 font-semibold">Procurement kit</h1>
      <Section title="Bill states">{BILL.map((s) => <ProcPill key={s} state={s} machine="bill" />)}</Section>
      <Section title="Purchase request states">{PR.map((s) => <ProcPill key={s} state={s} machine="pr" />)}</Section>
      <Section title="Contract states">{CONTRACT.map((s) => <ProcPill key={s} state={s} machine="contract" />)}</Section>
      <Section title="Match dots">{DOTS.map((s) => <MatchDot key={s} state={s} label />)}</Section>
      <Section title="Chips">
        <LockChip until="2026-11-14T08:00:00Z" /><LockChip until={null} />
        <ExpiryChip date="2026-12-01" today={TODAY} /><ExpiryChip date="2027-06-01" today={TODAY} />
        <TolerancePill delta={1_500} base={100_000} within /><TolerancePill delta={9_000} base={100_000} within={false} />
        <AgeBadge days={3} /><AgeBadge days={45} /><AgeBadge days={95} />
        <VendorTypeIcon type="landlord" withLabel /><VendorTypeIcon type="supplier" withLabel />
      </Section>
      <Section title="Money & budget">
        <Amount value={1_180_000} />
        <div className="w-72"><BudgetBar name="Office supplies" used={420_000} budget={600_000} adding={90_000} /></div>
        <div className="w-72"><BudgetBar name="Printing" used={580_000} budget={600_000} adding={90_000} /></div>
        <Fact label="Supplier">Simba Office Supplies Ltd</Fact>
      </Section>
      <Section title="Segregation strip"><div className="w-full"><SegregationStrip steps={STEPS} me={PAT.id} selfNote="selfApproved" /></div><SegregationStrip steps={STEPS} compact /></Section>
      <Section title="Contract timeline">
        <div className="w-full"><ContractTimeline start="2025-12-01" end="2026-11-30" notice="2026-10-31" today={TODAY} reminders={[{ offset: 90, on: "2026-09-01", sentAt: "2026-09-01T07:00:00Z" }, { offset: 30, on: "2026-10-31" }]} /></div>
      </Section>
      <Section title="Error · forbidden · conflict">
        <div className="w-full"><PanelErr onRetry={() => {}} /></div>
        <div className="w-full"><ProcNoAccess /></div>
        <div className="w-full"><ConflictBanner who="Patrick Niyonzima" when="2026-11-12T07:58:00Z" onReload={() => {}} /></div>
      </Section>
    </main>
  );
}
