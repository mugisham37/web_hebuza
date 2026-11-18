"use client";
import type { ReactNode } from "react";
import { ExternalBadge, WorkerStatusChip, SharedChip, LockedCount, EvidenceLine, ReadMeter, WatermarkOverlay, RateLabel, ExpiryChip, FirmRoleTag, WhyNote } from "@/components/atoms/work";
import { OfferEarnings, ContractStatusCard, LicenceStatusCard, ServiceClearanceList, SignDocument, StatementLines, LaneLockedNote } from "@/components/molecules/agent/agent";
import { StatementBar } from "@/components/organisms/agent/work-statement";
import { statementOf } from "@/lib/agent/money";
import type { ContractDoc, WorkerStatus } from "@/lib/work/api";

const D = 86_400_000;
const day = (d: number) => new Date(Date.now() + d * D).toISOString().slice(0, 10);
const STATUSES: WorkerStatus[] = ["cleared", "pending_verification", "onboarding", "changes_requested", "suspended", "terminated"];
const DOC: ContractDoc = {
  id: "demo", kind: "nda", title: "Non-disclosure agreement", version: 1, status: "pending_signature", start: "2026-12-01", end: null, noticeDays: 0,
  terms: ["Client information is used only for the job it was shared for.", "You do not copy or keep client documents after a job closes.", "Downloads are watermarked and logged."],
};
const SIGNED: ContractDoc = { ...DOC, status: "active", signedAt: "2026-11-10T12:32:00Z", evidence: { ip: "127.0.0.1", sha256: "9f2c4e1ab07d5c3e88a1f0b2d6e4c9a7", typedName: "Jean-Paul Nkurunziza" } };
const M6 = { gross: 120_000, adjustments: -9_000, ...statementOf({ gross: 120_000, adjustments: -9_000, licence: 10_000 }) };
const M7 = { gross: 5_000, adjustments: 0, ...statementOf({ gross: 5_000, adjustments: 0, licence: 10_000 }) };

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border border-border bg-white p-6">
      <h2 id={id} className="mb-5 text-eyebrow tracking-wide text-fg-subtle uppercase">{title}</h2>
      {children}
    </section>
  );
}
const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid gap-2 py-3 sm:grid-cols-[10rem_1fr] sm:items-center"><p className="text-small text-fg-muted">{label}</p><div className="flex flex-wrap items-center gap-2">{children}</div></div>
);

export function WorkKitShowcase() {
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-gutter pt-[var(--spacing-hero-top)] pb-16">
      <header>
        <p className="text-eyebrow text-fg-subtle uppercase">Stage 8 · External Agent</p>
        <h1 className="text-h2">External agent component kit</h1>
      </header>
      <Section id="xk1" title="XK1 · Identity & clearance">
        <Row label="Identity"><ExternalBadge /><FirmRoleTag role="admin" /><FirmRoleTag role="member" /></Row>
        <Row label="Status">{STATUSES.map((s) => <WorkerStatusChip key={s} status={s} />)}</Row>
        <ServiceClearanceList fixHref="/work/profile/credentials" services={[
          { slug: "vat", name: "VAT declaration", state: "cleared" },
          { slug: "bp", name: "Business plan", state: "pending" },
          { slug: "cr", name: "Company registration (RDB)", state: "not_cleared", reason: "credentialExpired" },
        ]} />
      </Section>
      <Section id="xk2" title="XK2 · Least-privilege markers">
        <Row label="Sharing"><SharedChip shared /><SharedChip shared={false} /></Row>
        <div className="grid gap-2 py-3"><LockedCount n={3} onRequest={() => {}} /><LockedCount n={1} /></div>
        <Row label="Why"><WhyNote>Finish verification to unlock this.</WhyNote><WhyNote tone="danger">Your access is suspended.</WhyNote></Row>
      </Section>
      <Section id="xk3" title="XK3 · Watermark">
        <div className="relative h-48 overflow-hidden bg-bg-subtle p-4 text-small">Tax clearance certificate.pdf (preview)<WatermarkOverlay name="Jean-Paul Nkurunziza" refId="HBZ-4K2M9Q" at="2026-11-10T12:32:00Z" /></div>
      </Section>
      <Section id="xk4" title="XK4 · Lanes"><LaneLockedNote /></Section>
      <Section id="xk5" title="XK5 · Offer money & contract">
        <div className="grid gap-3 md:grid-cols-2">
          <OfferEarnings earning={15_000} eligible={50_000} rate={{ bps: 3000 }} />
          <OfferEarnings earning={9_000} eligible={50_000} rate={{ flat: 9_000 }} />
          <OfferEarnings earning={15_000} rate={{ bps: 3000 }} showFee={false} compact />
        </div>
        <Row label="Rate"><RateLabel rate={{ bps: 3000 }} /><RateLabel rate={{ flat: 9000 }} /></Row>
        <Row label="Expiry"><ExpiryChip date={day(75)} /><ExpiryChip date={day(45)} /><ExpiryChip date={day(20)} /><ExpiryChip date={day(5)} /><ExpiryChip date={day(0)} /><ExpiryChip date={day(-4)} /><ExpiryChip date={null} /></Row>
        <div className="grid gap-3 md:grid-cols-2">
          {(["active", "expiring", "expired", "notice_given", "pending_signature"] as const).map((s) => (
            <ContractStatusCard key={s} state={s} end={s === "expired" ? day(-3) : day(s === "expiring" ? 20 : 300)} href="/work/contract" />
          ))}
          {(["paid", "due", "overdue", "netted", "waived"] as const).map((s) => (
            <LicenceStatusCard key={s} fee={{ number: "INV-2026-00631", period: "2026-12", amount: 10_000, due: "2026-12-05", status: s }} href="/work/contract?tab=licence" />
          ))}
        </div>
      </Section>
      <Section id="xk6" title="XK6 · Statement block">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-3"><StatementLines s={M6} /><StatementBar s={M6} /></div>
          <div className="grid gap-3"><StatementLines s={M7} /><StatementBar s={M7} /></div>
        </div>
      </Section>
      <Section id="xk7" title="XK7 · E-sign">
        <Row label="Meter"><div className="w-64"><ReadMeter pct={0} /></div><div className="w-64"><ReadMeter pct={80} /></div><div className="w-64"><ReadMeter pct={100} /></div></Row>
        <div className="grid gap-4 md:grid-cols-2">
          <SignDocument doc={DOC} signerName="Jean-Paul Nkurunziza" onSign={() => new Promise((r) => setTimeout(r, 800))} />
          <SignDocument doc={SIGNED} signerName="Jean-Paul Nkurunziza" onSign={async () => {}} />
        </div>
        <EvidenceLine signedAt="2026-11-10T12:32:00Z" ip="127.0.0.1" sha="9f2c4e1ab07d5c3e" compact />
      </Section>
    </div>
  );
}
