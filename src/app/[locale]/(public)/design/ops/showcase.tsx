"use client";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/atoms/button";
import { FilterBar, MenuButton, MenuCheck, SavedViewTabs, BulkBar, BulkAction, DensityToggle, ColumnPicker, ReasonDialog, SplitButton, CopyRef, DocTile, TimelineItem, NoteBubble, KpiTile, HeatCell, EmptyPanel, PanelError, Panel, type Density } from "@/components/molecules/ops/ops";
import { CASE_STATUSES } from "@/shared/domain/case-status";
import { OpsStatus, Kbd, SlaChip, FlagChip, PaymentChip, PriorityDot, MatchRing, CapacityBar, RoleTag, OfferPill, LockLabel, PrecheckBadge, Sparkline } from "@/components/atoms/ops";

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

export function OpsKitShowcase() {
  const [q, setQ] = useState("");
  const [chips, setChips] = useState(["Category: Tax & Accounting", "Status: 3 selected", "SLA: At risk"]);
  const [view, setView] = useState("mine");
  const [density, setDensity] = useState<Density>("comfortable");
  const [cols, setCols] = useState({ visible: ["ref", "client", "status", "sla"], order: ["ref", "client", "status", "sla", "assignee"] });
  const [bulk, setBulk] = useState(0);
  const [dlg, setDlg] = useState<null | "hold" | "reject">(null);
  const [docs, setDocs] = useState<Record<string, "accepted" | "rejected" | null>>({});
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-gutter pt-[var(--spacing-hero-top)] pb-16">
      <header>
        <p className="text-eyebrow text-fg-subtle uppercase">Stage 3 · Service Manager</p>
        <h1 className="text-h2">Staff component kit</h1>
      </header>
      <Section id="k3" title="K3 · Status, SLA & flags">
        <Row label="Statuses">{CASE_STATUSES.map((s) => <OpsStatus key={s} status={s} />)}<OpsStatus status="awaiting_external_institution" sub="Awaiting notary signature" /></Row>
        <Row label="SLA"><SlaChip due={iso(50)} /><SlaChip due={iso(6)} /><SlaChip due={iso(-27)} /><SlaChip due={iso(-5)} paused /><SlaChip due={iso(-5)} done /><SlaChip due={iso(3)} firstResponse /></Row>
        <Row label="Flags">{(["urgent", "vip", "subscriber", "ai", "partner", "duplicate", "dedicated"] as const).map((f) => <FlagChip key={f} flag={f} detail={f === "partner" ? "Bank of Kigali" : undefined} />)}</Row>
        <Row label="Payment & priority">{["paid", "unpaid", "partial", "covered"].map((p) => <PaymentChip key={p} status={p} />)}{([1, 2, 3, 4] as const).map((p) => <PriorityDot key={p} p={p} />)}</Row>
      </Section>
      <Section id="k45" title="K4–K5 · Filters, views & bulk">
        <div className="grid gap-4">
          <FilterBar search={q} onSearch={setQ} placeholder="Search cases, clients, documents…" chips={chips.map((c) => ({ key: c, label: c, onRemove: () => setChips((x) => x.filter((y) => y !== c)) }))}
            addFilter={<MenuButton label="Add filter" icon="plus">{() => ["Client", "Service", "Status", "SLA", "Assignee"].map((f) => <MenuCheck key={f} checked={false} onChange={() => {}}>{f}</MenuCheck>)}</MenuButton>}
            right={<><DensityToggle value={density} onChange={setDensity} /><ColumnPicker columns={[{ key: "ref", label: "Ref", locked: true }, { key: "client", label: "Client" }, { key: "status", label: "Status" }, { key: "sla", label: "SLA" }, { key: "assignee", label: "Assignee" }]} visible={cols.visible} order={cols.order} onChange={(visible, order) => setCols({ visible, order })} /></>} />
          <SavedViewTabs active={view} onChange={setView} views={[{ key: "mine", label: "My category", count: 24 }, { key: "overdue", label: "Overdue", count: 3 }, { key: "client", label: "Waiting on client", count: 11 }, { key: "inst", label: "Waiting on institution", count: 7 }, { key: "review", label: "In review", count: 5 }, { key: "hold", label: "On hold", count: 2 }]} extra={<button type="button" className="ml-1 h-10 shrink-0 px-2 text-small text-link hover:text-link-hover">+ Save view</button>} />
          <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setBulk(12)}>Select 12 rows</Button><SplitButton label="Approve" onClick={() => {}} options={[{ label: "Approve & release" }, { label: "Approve, release after payment", hint: "Client hasn't paid yet" }].map((o) => ({ ...o, onClick: () => {} }))} /><CopyRef value="HBZ-4K2M9Q" /></div>
          <BulkBar count={bulk} onClear={() => setBulk(0)} selectAll={<button type="button" className="text-small underline">Select all 312 matching</button>}>
            <BulkAction icon="user" onClick={() => {}}>Assign</BulkAction><BulkAction icon="refresh" onClick={() => {}}>Change status</BulkAction><BulkAction icon="message" onClick={() => {}}>Message clients</BulkAction><BulkAction icon="arrowUpRight" onClick={() => {}}>Export</BulkAction>
          </BulkBar>
        </div>
      </Section>
      <Section id="k6" title="K6 · Reason & confirm dialogs">
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setDlg("hold")}>Put on hold</Button><Button variant="danger" onClick={() => setDlg("reject")}>Reject request</Button></div>
        <ReasonDialog open={dlg === "hold"} onClose={() => setDlg(null)} title="Put case on hold" options={[{ value: "call", label: "Waiting for client call" }, { value: "inst", label: "Waiting for institution" }, { value: "travel", label: "Client travelling" }, { value: "other", label: "Other" }]} noteLabel="Note (optional)" confirmLabel="Put on hold" onConfirm={() => {}} />
        <ReasonDialog open={dlg === "reject"} onClose={() => setDlg(null)} title="Reject request" asRadios destructive audited options={[{ value: "eligible", label: "Not eligible" }, { value: "scope", label: "Out of scope" }, { value: "dup", label: "Duplicate request" }, { value: "fraud", label: "Fraud suspicion" }, { value: "withdrew", label: "Client withdrew" }]} noteLabel="Message to client" confirmLabel="Reject request"
          notice={<p className="bg-danger-bg px-3.5 py-2.5 text-small text-danger">Client paid RWF 20,000 via MTN MoMo — a refund request will be created for Finance.</p>} onConfirm={() => {}} />
      </Section>
      <Section id="k8b" title="K8 · Documents, timeline & notes">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="grid content-start gap-3">
            {[["National ID (front).jpg", "id", [{ kind: "legible" }, { kind: "expires", detail: "03 Jan 2027" }, { kind: "nameMatch" }]], ["Proof of address.pdf", "pdf", [{ kind: "legible" }, { kind: "mismatch" }]], ["Shareholder ID.jpg", "image", [{ kind: "blurry" }]]].map(([n, k, ch]) => (
              <DocTile key={n as string} name={n as string} kind={k as "id"} checks={ch as { kind: "legible" }[]} state={docs[n as string]} onAccept={() => setDocs((d) => ({ ...d, [n as string]: "accepted" }))} onReject={() => setDocs((d) => ({ ...d, [n as string]: "rejected" }))} />
            ))}
          </div>
          <div className="grid gap-4">
            <ol>
              <TimelineItem kind="status" title="Status changed to In progress" actor="Diane Mukamana" time="Today, 10:30" />
              <TimelineItem kind="document" title="Document uploaded · Proof of address" actor="Aline Uwase" time="Today, 09:45" />
              <TimelineItem kind="assignment" title="Offer accepted by Grace Uwimana" time="Today, 09:20" />
              <TimelineItem kind="payment" title="Payment received · RWF 20,000" meta="MTN MoMo" time="Yesterday, 16:02" last />
            </ol>
            <NoteBubble internal author="Diane Mukamana" time="10:42">@Grace please confirm the final documents before release.</NoteBubble>
            <NoteBubble author="Aline Uwase" time="10:20">When will my certificate be ready?</NoteBubble>
          </div>
        </div>
      </Section>
      <Section id="kdash" title="Dashboard pieces">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile label="Intake" value={12} icon="layers" spark={[6, 8, 7, 10, 9, 11, 12]} note="4 new since 08:00" tone="attention" href="#" />
          <KpiTile label="Awaiting my review" value={5} icon="fileCheck" spark={[3, 4, 6, 5, 4, 5, 5]} href="#" />
          <KpiTile label="Overdue" value={3} icon="clock" tone="danger" spark={[1, 2, 2, 4, 3, 3, 3]} href="#" />
          <KpiTile label="At risk" value={4} icon="zap" tone="warning" spark={[2, 3, 5, 3, 4, 4, 4]} href="#" />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Panel title="Agent workload"><div className="grid grid-cols-5 gap-1">{[3, 5, 7, 9, 6, 2, 4, 8, 6, 5].map((v, i) => <HeatCell key={i} load={v} cap={8} />)}</div></Panel>
          <EmptyPanel title="Intake is clear 🎉" body="No new requests in Tax & Accounting." compact />
          <PanelError what="workload" onRetry={() => {}} />
        </div>
        <div className="mt-4"><EmptyPanel title="Intake is clear 🎉" body="No deliverables waiting · No overdue cases" action={<Button size="sm">View all cases</Button>} /></div>
      </Section>
      <Section id="k7" title="K7 · People & capacity">
        <Row label="Match"><MatchRing value={92} /><MatchRing value={71} /><MatchRing value={48} /></Row>
        <Row label="Capacity"><CapacityBar load={4} cap={8} /><CapacityBar load={7} cap={8} /><CapacityBar load={9} cap={8} /></Row>
        <Row label="Role & offer"><RoleTag /><RoleTag external location="Musanze" />{(["sent", "viewed", "accepted", "declined", "timeout"] as const).map((o) => <OfferPill key={o} state={o} />)}</Row>
      </Section>
      <Section id="k8" title="K8 · Documents & notes">
        <Row label="Pre-checks"><PrecheckBadge kind="legible" /><PrecheckBadge kind="expires" detail="03 Jan 2027" /><PrecheckBadge kind="nameMatch" /><PrecheckBadge kind="mismatch" /><PrecheckBadge kind="blurry" /></Row>
        <Row label="Internal"><LockLabel /></Row>
      </Section>
      <Section id="k2" title="K2 · Keyboard & trends">
        <Row label="Shortcuts">{["J", "K", "A", "E", "⌘K", "?", "Esc"].map((k) => <Kbd key={k}>{k}</Kbd>)}</Row>
        <Row label="Sparkline"><span className="text-navy-700"><Sparkline values={[6, 8, 7, 10, 9, 11, 12]} label="Intake trend" /></span><span className="text-danger"><Sparkline values={[1, 2, 2, 4, 3, 3, 3]} /></span></Row>
      </Section>
    </div>
  );
}
