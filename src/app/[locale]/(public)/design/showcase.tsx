"use client";
import { useState } from "react";
import { Button, ButtonLink, ArrowLink, Dots } from "@/components/atoms/button";
import { Tag, Badge, LiveDot } from "@/components/atoms/tag";
import { Heading, Eyebrow, Container, Section } from "@/components/atoms/typography";
import { Card } from "@/components/atoms/card";
import { Field, Input, Textarea, Select, Checkbox, Radio, Switch, DateInput, ErrorSummary } from "@/components/atoms/field";
import { FileDrop } from "@/components/atoms/file-drop";
import { Dialog, Sheet } from "@/components/atoms/dialog";
import { Tabs } from "@/components/atoms/tabs";
import { useToast } from "@/components/atoms/toast";
import { Skeleton, Spinner, EmptyState, ErrorState } from "@/components/atoms/feedback";
import { Tooltip, Avatar, AvatarStack, Stepper, Timeline } from "@/components/atoms/misc";
import { Money, MaskedValue, StatusPill, OutcomePill, CountdownSLA } from "@/components/atoms/domain";
import { DataTable } from "@/components/atoms/data-table";
import { CASE_STATUSES, EXTERNAL_OUTCOMES } from "@/shared/domain/case-status";
import { images } from "@/lib/assets";
import { PersonaSwitcher } from "./personas";

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const SCALES = ["navy", "gold", "sky", "ink"] as const;
const ROLES = ["bg", "bg-subtle", "bg-tint", "surface", "border", "border-strong", "rule", "fg", "fg-heading", "fg-muted", "fg-subtle", "fg-disabled", "primary", "primary-hover", "secondary", "secondary-hover", "link", "focus", "selection", "success", "success-bg", "warning", "warning-bg", "danger", "danger-bg", "info", "info-bg"];
const GRADS = ["navy-depth", "night-fade", "sky-wash", "gold-shine", "gold-metallic", "gold-glow"] as const;
const VARIANTS = ["primary", "secondary", "outline", "ghost", "danger"] as const;
const SHADOWS = ["shadow-sm", "shadow-md", "shadow-lg"] as const;
const TYPE = ["wordmark", "display", "cta", "h2", "statement-xl", "statement", "h3", "card-title", "lead", "label-lg", "label", "button", "body", "small", "eyebrow"] as const;
const ROWS = [
  { ref: "HBZ-4K2M9Q", service: "Company registration (RDB)", status: "in_progress" as const, fee: 45000, due: new Date(Date.now() + 3 * 3600_000).toISOString() },
  { ref: "HBZ-7PX31A", service: "VAT return", status: "awaiting_client_documents" as const, fee: 30000, due: new Date(Date.now() - 86400_000).toISOString() },
  { ref: "HBZ-2RT8LW", service: "Business plan", status: "completed_delivered" as const, fee: 250000, due: new Date(Date.now() + 5 * 86400_000).toISOString() },
];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="grid gap-4 border-t border-border py-10 [&>*]:min-w-0"><h2 className="eyebrow text-fg-subtle">{title}</h2>{children}</section>;
}

export function DesignShowcase() {
  const toast = useToast();
  const [dlg, setDlg] = useState(false);
  const [sheet, setSheet] = useState(false);
  return (
    <Container className="pt-[var(--spacing-hero-top)] pb-24">
      <Heading as="h1" size="display">Design system</Heading>
      <p className="mt-3 max-w-2xl text-lead text-fg-muted">Hebuza colours (navy, gold, sky, ink) on a white-first page, sharp corners everywhere. Source of truth: src/app/globals.css · Hebuza Color System &amp; Theme Guide.md · THEME-MIGRATION-PLAN.md</p>

      <Block title="Mock personas (dev)"><PersonaSwitcher /></Block>

      <Block title="Colour scales (guide §10)">
        <div className="grid gap-3">
          {SCALES.map((s) => (
            <div key={s} className="grid grid-cols-[4rem_1fr] items-center gap-3">
              <p className="text-label text-fg-heading">{s}</p>
              <div className="grid grid-cols-11 border border-border">
                {STEPS.map((n) => <div key={n} title={`-`} className="flex h-14 items-end p-1 text-[0.625rem] tabular" style={{ background: `var(--color--)`, color: n >= 500 ? "#fff" : "var(--color-ink-900)" }}>{n}</div>)}
              </div>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Roles (what components use)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {ROLES.map((c) => (
            <div key={c} className="overflow-hidden border border-border bg-surface">
              <div className="h-14 border-b border-border" style={{ background: `var(--color-)` }} />
              <p className="p-2 text-small">{c}</p>
            </div>
          ))}
        </div>
        <p className="text-small text-fg-muted">Gold is for action only: one gold button per view. Headings navy-700, body ink-900, muted ink-600, captions ink-500. Focus ring navy-700 (gold-400 inside .theme-dark).</p>
      </Block>

      <Block title="Gradients (max one per view)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {GRADS.map((g) => <div key={g} className="border border-border"><div className={`h-20 bg-grad-`} /><p className="p-2 text-small">{g}</p></div>)}
        </div>
        <div className="theme-dark bg-ink-950 p-6"><p className="text-grad-gold font-display text-display">Hebuza</p></div>
      </Block>

      <Block title="Corners, rules & shadows">
        <div className="flex flex-wrap items-end gap-6">
          <div className="grid justify-items-start gap-2"><div className="size-20 border border-border-strong bg-bg-subtle" /><p className="text-small">radius 0 · every box</p></div>
          <div className="grid justify-items-start gap-2"><div data-round className="size-20 rounded-full bg-navy-700" /><p className="text-small">circle · avatars, dots, seal only</p></div>
          {SHADOWS.map((s) => <div key={s} className="grid justify-items-start gap-2"><div className={`size-20 border border-border bg-surface `} /><p className="text-small">{s}</p></div>)}
          <div className="grid gap-2"><span className="block h-[3px] w-12 bg-gold-400" /><p className="text-small">heading accent bar</p></div>
        </div>
      </Block>

      <Block title="Typography (fluid 390 → 1200px)">
        <div className="grid gap-4">{TYPE.map((t) => <p key={t} className={t === "wordmark" ? "font-display text-wordmark uppercase" : t === "eyebrow" ? "eyebrow" : `text-${t}`}>{t} — Serivisi z&apos;ubucuruzi</p>)}</div>
      </Block>

      <Block title="Buttons (variant × state)">
        <div className="overflow-x-auto">
          <table className="text-small">
            <thead><tr className="text-left text-fg-subtle"><th className="p-2 font-medium">variant</th><th className="p-2 font-medium">default</th><th className="p-2 font-medium">dots</th><th className="p-2 font-medium">disabled</th><th className="p-2 font-medium">loading</th><th className="p-2 font-medium">icon</th></tr></thead>
            <tbody>
              {VARIANTS.map((v) => (
                <tr key={v}>
                  <th scope="row" className="p-2 text-left font-medium">{v}</th>
                  <td className="p-2"><Button variant={v}>Label</Button></td>
                  <td className="p-2"><Button variant={v} dots>Label</Button></td>
                  <td className="p-2"><Button variant={v} disabled>Label</Button></td>
                  <td className="p-2"><Button variant={v} loading>Saving</Button></td>
                  <td className="p-2"><Button variant={v} size="icon" aria-label="Next">→</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button><Button size="lg" variant="primary" dots>Large</Button>
          <ButtonLink href="#" variant="outline">Link</ButtonLink><ArrowLink href="#" label="Next" /><Dots />
        </div>
        <div className="theme-dark flex flex-wrap gap-3 bg-grad-night-fade p-6"><Button variant="primary" dots>Primary on dark</Button><Button variant="secondary">Secondary</Button><Button variant="outline-dark">Outline dark</Button><Button variant="inverse">Inverse</Button></div>
      </Block>

      <Block title="Tags & badges">
        <div className="flex flex-wrap gap-2"><Tag>Neutral</Tag><Tag variant="navy">Navy</Tag><Tag variant="selected">Selected</Tag><Tag variant="new">New</Tag><Tag variant="featured">Featured</Tag><Tag variant="shine">Gold shine</Tag><Tag dot>With dot</Tag><span className="inline-flex items-center gap-2"><LiveDot />Live</span></div>
        <div className="theme-dark flex flex-wrap gap-2 bg-bg p-4"><Tag variant="glass">Glass</Tag><Tag variant="outline-dark">Outline dark</Tag><Tag variant="dark">Dark</Tag></div>
        <div className="flex flex-wrap gap-2">{CASE_STATUSES.map((s) => <StatusPill key={s} status={s} />)}</div>
        <div className="flex flex-wrap gap-2">{EXTERNAL_OUTCOMES.map((o) => <OutcomePill key={o} outcome={o} />)}</div>
        <div className="flex flex-wrap gap-2"><Badge tone="info">info</Badge><Badge tone="success">success</Badge><Badge tone="warning">warning</Badge><Badge tone="danger">danger</Badge><Badge tone="accent">accent</Badge></div>
      </Block>

      <Block title="Cards & sections">
        <div className="grid gap-4 md:grid-cols-3">
          <Card interactive><p className="text-card-title">Surface card</p><p className="text-small text-fg-muted">1px border · hover navy-300 + shadow-md</p></Card>
          <Card tone="featured"><p className="text-card-title">Featured</p><p className="text-small text-fg-muted">3px gold left border</p></Card>
          <Card tone="subtle" stacked><p className="text-card-title">Stacked (navy-tinted plate)</p></Card>
          <Card tone="tint"><p className="text-card-title">Tint (sky-50)</p></Card>
          <Card tone="navy"><p className="text-card-title">Navy panel</p><p className="text-small text-fg-muted">.theme-dark inside</p></Card>
        </div>
        <Section tone="sky" className="px-6"><Eyebrow>Section</Eyebrow><Heading className="mt-3">Sky Wash section, h2</Heading></Section>
        <Section tone="night" className="px-6"><Eyebrow variant="outline-dark">Dark band</Eyebrow><Heading className="mt-3">Night section, h2</Heading></Section>
      </Block>

      <Block title="Forms">
        <ErrorSummary title="There is a problem" errors={[{ field: "phone", message: "Enter a valid Rwandan phone number" }]} />
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Full name" hint="As on your ID">{(a) => <Input id={a.id} aria-describedby={a.describedBy} />}</Field>
          <Field label="Phone" error="Enter a valid Rwandan phone number">{(a) => <Input id="phone" inputMode="tel" aria-invalid={a.invalid} aria-describedby={a.describedBy} />}</Field>
          <Field label="Service" optional="optional">{(a) => <Select id={a.id}><option>Company registration</option><option>VAT return</option></Select>}</Field>
          <Field label="Deadline">{(a) => <DateInput id={a.id} />}</Field>
          <Field label="Notes" className="md:col-span-2">{(a) => <Textarea id={a.id} />}</Field>
          <div className="grid gap-3"><Checkbox label="I accept the service terms" /><Radio name="tier" label="Standard" defaultChecked /><Radio name="tier" label="Urgent (+50%)" /><Switch label="WhatsApp notifications" defaultChecked /></div>
          <FileDrop camera onFiles={(f) => toast({ title: `${f.length} file(s) selected`, tone: "success" })} accept="application/pdf,image/*" />
        </div>
      </Block>

      <Block title="Overlays & feedback">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setDlg(true)}>Open dialog</Button>
          <Button variant="secondary" onClick={() => setSheet(true)}>Open sheet</Button>
          <Button variant="secondary" onClick={() => toast({ title: "Saved", body: "Your changes were saved.", tone: "success" })}>Toast</Button>
          <Button variant="secondary" onClick={() => toast({ title: "Payment failed", tone: "danger" })}>Error toast</Button>
          <Tooltip content="Fees include 18% VAT"><Button variant="ghost">Tooltip</Button></Tooltip>
        </div>
        <Dialog open={dlg} onClose={() => setDlg(false)} title="Confirm payment" description="MoMo will prompt you on your phone." footer={<><Button variant="ghost" onClick={() => setDlg(false)}>Cancel</Button><Button variant="primary" dots>Pay <Money amount={45000} /></Button></>}>
          <p>You&apos;ll receive a USSD prompt. Enter your PIN to approve.</p>
        </Dialog>
        <Sheet open={sheet} onClose={() => setSheet(false)} title="Case HBZ-4K2M9Q"><p>Side sheet content.</p></Sheet>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-5 w-1/2" /><Spinner /></div>
          <EmptyState />
          <ErrorState onRetry={() => {}} />
        </div>
      </Block>

      <Block title="Domain">
        <div className="flex flex-wrap items-center gap-4"><Money amount={1250000} /><Money amount={120} currency="USD" /><MaskedValue label="TIN" value="102345678" onReveal={() => {}} /><CountdownSLA dueAt={ROWS[0].due} /><CountdownSLA dueAt={ROWS[1].due} /><CountdownSLA dueAt={ROWS[0].due} paused /></div>
        <div className="flex flex-wrap items-center gap-4"><Avatar name="Aline Uwase" /><Avatar name="Maya Chen" src={images.testimonialMayaChen} /><AvatarStack people={[{ name: "A B", src: images.facesFace01 }, { name: "C D", src: images.facesFace02 }, { name: "E F", src: images.facesFace03 }]} /></div>
        <Stepper steps={["Details", "Documents", "Review", "Pay"]} current={1} />
        <Tabs tabs={[{ id: "o", label: "Overview", content: <p>Overview panel</p> }, { id: "t", label: "Timeline", count: 3, content: <Timeline items={[{ id: "1", title: "Request received", meta: "Today 09:12" }, { id: "2", title: "Under review", meta: "Today 10:40", current: true }]} /> }, { id: "d", label: "Documents", content: <EmptyState /> }]} />
        <DataTable rows={ROWS} rowKey={(r) => r.ref} exportName="cases" columns={[
          { key: "ref", header: "Reference", cell: (r) => <span className="tabular font-medium">{r.ref}</span>, sortValue: (r) => r.ref, csv: (r) => r.ref },
          { key: "service", header: "Service", cell: (r) => r.service, sortValue: (r) => r.service, csv: (r) => r.service },
          { key: "status", header: "Status", cell: (r) => <StatusPill status={r.status} />, csv: (r) => r.status },
          { key: "fee", header: "Fee", cell: (r) => <Money amount={r.fee} />, sortValue: (r) => r.fee, csv: (r) => r.fee },
          { key: "due", header: "SLA", cell: (r) => <CountdownSLA dueAt={r.due} /> },
        ]} />
      </Block>
    </Container>
  );
}
