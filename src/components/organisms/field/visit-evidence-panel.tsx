"use client";
// U15 visit evidence (board 05 DE1, built inside existing office views): check-in/out + GPS + flags + pin plot, scans,
// receipts (PDF + sha256), custody history, expenses, notes, incidents. Satisfies "disputed visit" evidence.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cx, formatDate, formatMoney } from "@/shared/format";
import { Badge } from "@/components/atoms/tag";
import { Button } from "@/components/atoms/button";
import { Skeleton } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { Panel, EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { fx, fieldKeys } from "@/lib/field/api";
import { distanceM, formatCoords, formatDistance } from "@/lib/field/geo";
import { useFieldCopy, fill } from "@/lib/field/copy";
import { copyF } from "@/lib/field/copy-f";
import type { FieldVisit, CustodyReceipt, CustodyEvent, Expense, Flag, Fix } from "@/shared/field/types";
import { FieldFlagChip, OutcomeChip, hhmm } from "@/components/atoms/field-agent";

type Evidence = {
  visit: FieldVisit; agent: string; receipts: CustodyReceipt[]; custody: { receiptRef: string; items: number; events: CustodyEvent[] }[];
  scans: { id: string; label: string; pages: number; bytes: number; status: "scanning" | "available"; at: string }[];
  incidents: { id: string; type: string; description: string; at: string; by: string }[]; expenses: Expense[];
  flags: { flags: Flag[]; reviewed: boolean }[];
};

/** Pin vs check-in fix on a tiny local projection (metres around the pin). */
function PinPlot({ pin, fix, label, pinLabel, fixLabel }: { pin: { lat: number; lng: number }; fix: Fix; label: string; pinLabel: string; fixLabel: string }) {
  const d = fix ? distanceM(pin, fix) : 0;
  const scale = Math.max(400, d * 1.4); // metres across half the box
  const p = (lat: number, lng: number) => ({ x: 80 + ((lng - pin.lng) * 111_320 * Math.cos((pin.lat * Math.PI) / 180) * 70) / scale, y: 80 - ((lat - pin.lat) * 110_540 * 70) / scale });
  const f = fix ? p(fix.lat, fix.lng) : null;
  const accR = fix ? Math.min(70, (fix.accuracyM * 70) / scale) : 0;
  return (
    <svg viewBox="0 0 160 160" role="img" aria-label={label} className="size-40 shrink-0 bg-bg-subtle">
      <circle cx="80" cy="80" r={(300 * 70) / scale} fill="var(--color-success)" fillOpacity=".08" stroke="var(--color-success)" strokeDasharray="3 3" />
      <path d="M80 66c-6 0-10 4-10 9 0 7 10 15 10 15s10-8 10-15c0-5-4-9-10-9Z" fill="var(--color-navy-700)"><title>{pinLabel}</title></path>
      {f && <><circle cx={f.x} cy={f.y} r={accR} fill="var(--color-info)" fillOpacity=".15" /><circle cx={f.x} cy={f.y} r="5" fill="var(--color-info)" stroke="white" strokeWidth="2"><title>{fixLabel}</title></circle><line x1="80" y1="80" x2={f.x} y2={f.y} stroke="var(--color-ink-500)" strokeDasharray="2 3" /></>}
    </svg>
  );
}

export function VisitEvidencePanel({ visitId }: { visitId: string }) {
  const { c, locale } = useFieldCopy();
  const t = copyF(locale).ev;
  const toast = useToast();
  const q = useQuery({ queryKey: fieldKeys.office(`ev:${visitId}`), queryFn: () => fx<Evidence>("GET", `/api/x_field/ops/visits/${visitId}/evidence`) });
  if (q.isPending) return <Skeleton className="h-64 w-full" />;
  if (q.isError) return <PanelError what={t.title} onRetry={() => void q.refetch()} />;
  const { visit: v, receipts, custody, scans, incidents, expenses } = q.data;
  const flags = [...new Set(q.data.flags.flatMap((f) => f.flags).concat(v.checkin?.flags ?? []))];
  const when = (iso: string) => `${formatDate(iso, locale, { day: "numeric", month: "short" })} ${hhmm(iso, locale)}`;
  const fixline = (fix: Fix) => fix
    ? <span className="tabular">{formatCoords(fix.lat, fix.lng)} · {fill(t.acc, { a: fix.accuracyM })}{v.lat !== null && v.lng !== null && <> · {fill(t.dist, { d: formatDistance(distanceM({ lat: v.lat, lng: v.lng }, fix)) })}</>}</span>
    : <span className="text-danger">{t.noFix}</span>;
  const none = <p className="text-small text-fg-subtle">{t.none}</p>;

  return (
    <div className="grid gap-4">
      <Panel title={`${v.ref} · ${v.title_i18n[locale]}`} action={<span className="text-small text-fg-muted">{q.data.agent}</span>}>
        <div className="flex flex-wrap gap-4">
          {v.lat !== null && v.lng !== null && <PinPlot pin={{ lat: v.lat, lng: v.lng }} fix={v.checkin?.fix ?? null} label={t.plot} pinLabel={t.pin} fixLabel={t.fix} />}
          <dl className="grid min-w-0 flex-1 gap-2 text-small">
            <div><dt className="text-fg-subtle">{t.checkin}</dt><dd>{v.checkin ? <>{when(v.checkin.at)} · {fixline(v.checkin.fix)}{v.checkin.reason && <span className="block">{fill(t.reason, { r: v.checkin.reason })}</span>}</> : ""}</dd></div>
            <div><dt className="text-fg-subtle">{t.checkout}</dt><dd>{v.checkout ? <>{when(v.checkout.at)} · {fixline(v.checkout.fix)}</> : ""}</dd></div>
            {v.checkout && <div><dt className="text-fg-subtle">{t.outcome}</dt><dd><OutcomeChip outcome={v.checkout.outcome} /></dd></div>}
            {flags.length > 0 && <div className="flex flex-wrap gap-1.5">{flags.map((f) => <FieldFlagChip key={f} flag={f} />)}</div>}
          </dl>
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t.photos}>
          {v.checkin?.photoUrl ? <p className="text-small">{t.checkin} · {c.evidence.photo} ✓</p> : none}
        </Panel>
        <Panel title={t.scans}>
          {scans.length ? <ul className="grid gap-2">{scans.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 text-small"><span>{s.label} · {s.pages} p.</span><Badge tone={s.status === "available" ? "success" : "info"}>{t.status[s.status]}</Badge></li>
          ))}</ul> : none}
        </Panel>
        <Panel title={t.receipts}>
          {receipts.length ? <ul className="grid gap-3">{receipts.map((r) => (
            <li key={r.id} className="grid gap-1 text-small">
              <span className="flex flex-wrap items-center gap-2"><span className="font-mono">{r.ref}</span><Badge>{r.direction}</Badge><span className="text-fg-muted">{r.clientName} · {r.signature.method}</span></span>
              <span className="flex flex-wrap items-center gap-2">
                {r.pdfUrl && <a href={r.pdfUrl} className="underline">{t.pdf}</a>}
                {r.sha256 && <><abbr title={r.sha256} className="font-mono no-underline">{t.hash} {r.sha256.slice(0, 12)}…</abbr>
                  <Button size="sm" variant="ghost" onClick={() => void navigator.clipboard?.writeText(r.sha256!).then(() => toast({ title: t.copied, tone: "success" }))}>{t.copy}</Button></>}
              </span>
            </li>
          ))}</ul> : none}
        </Panel>
        <Panel title={t.custody}>
          {custody.length ? <ol className="grid gap-2">{custody.flatMap((cu) => cu.events.map((e, i) => (
            <li key={`${cu.receiptRef}-${i}`} className="flex items-center gap-2 text-small"><span className={cx("size-2 rounded-full", e.stage === "lost" || e.stage === "damaged" ? "bg-danger" : "bg-navy-700")} />{t.stages[e.stage]} · {when(e.at)} · {e.by}</li>
          )))}</ol> : none}
        </Panel>
        <Panel title={t.expenses}>
          {expenses.length ? <ul className="grid gap-1 text-small">{expenses.map((x) => <li key={x.id} className="flex justify-between"><span>{x.ref} · {x.category}</span><span className="tabular">{formatMoney(x.amount, "RWF", locale)}</span></li>)}</ul> : none}
        </Panel>
        <Panel title={t.notes}>
          {v.notes?.length ? <ul className="grid gap-1 text-small">{v.notes.map((n, i) => <li key={i}>{n}</li>)}</ul> : none}
        </Panel>
        <Panel title={t.incidents} className="lg:col-span-2">
          {incidents.length ? <ul className="grid gap-2 text-small">{incidents.map((i) => <li key={i.id}><Badge tone="danger">{i.type}</Badge> {i.description} <span className="text-fg-subtle">· {when(i.at)} · {i.by}</span></li>)}</ul> : none}
        </Panel>
      </div>
    </div>
  );
}

/** Case page Field tab: visits on this case, each expandable to its evidence. */
export function CaseFieldTab({ caseRef }: { caseRef: string }) {
  const { c, locale } = useFieldCopy();
  const t = copyF(locale);
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({ queryKey: fieldKeys.office(`case:${caseRef}`), queryFn: () => fx<FieldVisit[]>("GET", `/api/x_field/ops/case/${encodeURIComponent(caseRef)}/visits`) });
  if (q.isPending) return <Skeleton className="h-32 w-full" />;
  if (q.isError) return <PanelError what={t.tabTitle} onRetry={() => void q.refetch()} />;
  if (!q.data.length) return <EmptyPanel title={t.tabEmpty} compact />;
  return (
    <div className="grid gap-3">
      <h2 className="text-label-lg">{t.tabTitle}</h2>
      {q.data.map((v) => (
        <div key={v.id} className="grid gap-3">
          <button type="button" aria-expanded={open === v.id} onClick={() => setOpen(open === v.id ? null : v.id)}
            className="flex flex-wrap items-center gap-2 border border-border bg-surface px-4 py-3 text-left hover:border-border-strong">
            <span className="font-mono text-small">{v.ref}</span><span className="text-label">{v.title_i18n[locale]}</span>
            <Badge>{c.status[v.status]}</Badge><span className="ml-auto text-small text-fg-muted tabular">{formatDate(v.windowStart, locale, { day: "numeric", month: "short" })} {hhmm(v.windowStart, locale)}</span>
          </button>
          {open === v.id && <VisitEvidencePanel visitId={v.id} />}
        </div>
      ))}
    </div>
  );
}
