"use client";
import type { ReactNode } from "react";
import { Countdown, MoneyStatePill, ShareRing, DutyDot, ClearanceBar, Group, ChannelTag, VersionChip, EventDot, MaskedValue, SkillLevel, StarRating, SkeletonRows } from "@/components/atoms/agent";
import { MONEY_STATES } from "@/lib/agent/money";

const H = 3600_000;
const iso = (h: number) => new Date(Date.now() + h * H).toISOString();

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

export function AgentKitShowcase() {
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-gutter pt-[var(--spacing-hero-top)] pb-16">
      <header>
        <p className="text-eyebrow text-fg-subtle uppercase">Stage 4 · Internal Agent</p>
        <h1 className="text-h2">Agent component kit</h1>
      </header>
      <Section id="ak1" title="AK1 · Countdowns">
        <Row label="Respond within"><Countdown to={iso(3.2)} kind="respond" /><Countdown to={iso(0.5)} kind="respond" /><Countdown to={iso(0.1)} kind="respond" /><Countdown to={iso(-1)} kind="respond" /></Row>
        <Row label="Due"><Countdown to={iso(52)} kind="due" /><Countdown to={iso(-30)} kind="due" /><Countdown to={iso(5)} compact /></Row>
      </Section>
      <Section id="ak2" title="AK2 · Money">
        <Row label="States">{MONEY_STATES.map((s) => <MoneyStatePill key={s} state={s} />)}</Row>
        <Row label="Share ring"><ShareRing pct={0.3} amount={4350} eligible={15000} /></Row>
      </Section>
      <Section id="ak5" title="AK5 · Availability & clearance">
        <Row label="Duty"><DutyDot state="on" /><DutyDot state="away" /><DutyDot state="leave" /><DutyDot state="on" pending /></Row>
        <div className="grid gap-2 py-3">
          <ClearanceBar state="in_progress" manager="Diane Mukamana" steps={3} />
          <ClearanceBar state="submitted" manager="Diane Mukamana" />
          <ClearanceBar state="changes_requested" manager="Diane Mukamana" />
        </div>
      </Section>
      <Section id="ak3" title="Groups">
        <Group id="s-over" label="Overdue" count={2} tone="danger"><p className="py-2 text-small">HBZ-8VB2XCQ · Company registration</p></Group>
        <Group id="s-week" label="This week" count={1} defaultOpen={false}><p className="py-2 text-small">HBZ-5HN7KDZ · VAT declaration</p></Group>
      </Section>
      <Section id="ak6" title="AK6 · Conversation & versions">
        <Row label="Channels"><ChannelTag channel="client" /><ChannelTag channel="internal" /><ChannelTag channel="system" /></Row>
        <Row label="Versions"><VersionChip v="v1.0" state="current" /><VersionChip v="v1.0" state="returned" /><VersionChip v="v2.0" state="draft" /><VersionChip v="v2.0" state="approved" /></Row>
      </Section>
      <Section id="ca" title="Calendar & data">
        <Row label="Events"><EventDot kind="deadline" label /><EventDot kind="appointment" label /><EventDot kind="field" label /><EventDot kind="obligation" label /></Row>
        <Row label="Masked"><MaskedValue value="+250 733 200 145" masked="•••• 145" /><MaskedValue value="" masked="" shared={false} /></Row>
        <Row label="Skills"><SkillLevel level="basic" /><SkillLevel level="advanced" /><SkillLevel level="expert" pending /></Row>
        <Row label="Rating"><StarRating value={4.6} /><StarRating value={3} /></Row>
      </Section>
      <Section id="sk" title="Loading"><SkeletonRows n={3} /></Section>
    </div>
  );
}
