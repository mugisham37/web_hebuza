"use client";
// U11 Customers list + 360 (board marketing/08 CU1–CU2). Marketing view: totals only, masked phone, no documents,
// invoice lines or case links (§10.2, D-14). Search lives in component state (no PII in URLs).
import { useMemo, useState } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { formatDate, formatMoney } from "@/shared/format";
import { useCustomer, useCustomers, type Customer360 } from "@/lib/marketing/crm";
import type { Channel } from "@/shared/marketing/types";
import { DataTable } from "@/components/atoms/data-table";
import { Input } from "@/components/atoms/field";
import { Tabs } from "@/components/atoms/tabs";
import { Icon } from "@/components/atoms/icon";
import { CopyRef, EmptyPanel, Panel, PanelError, TimelineItem } from "@/components/molecules/ops/ops";
import { Sparkline } from "@/components/atoms/ops";
import { ConsentChip, PageHead, StaffName, useM } from "@/components/atoms/marketing";
import { AttributionTab, NotesTab } from "@/components/organisms/marketing/leads";
import { serviceLabel, useC, useStaffMap } from "@/components/molecules/marketing/crm";

const CH: Channel[] = ["email", "whatsapp", "sms"];

export function CustomersView() {
  const c = useC();
  const m = useM();
  const { locale } = useI18n();
  const q = useCustomers();
  const [search, setSearch] = useState("");
  const rows = useMemo(() => (q.data?.items ?? []).filter((r) => !search || [r.name, r.org, r.customerId].some((x) => x?.toLowerCase().includes(search.toLowerCase()))), [q.data, search]);
  return (
    <div className="grid gap-5">
      <PageHead title={c.customers.title} sub={c.customers.sub} />
      <label className="relative sm:max-w-sm"><span className="sr-only">{c.customers.search}</span>
        <Icon name="search" size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" aria-hidden />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={c.customers.search} className="pl-9" />
      </label>
      <DataTable rows={rows} rowKey={(r) => r.id} loading={q.isPending} error={q.error} onRetry={() => q.refetch()}
        empty={<EmptyPanel title={search ? m.states.filteredEmpty : c.customers.empty} />}
        onRowClick={(r) => window.location.assign(localHref(locale, `/marketing/customers/${r.id}`))}
        columns={[
          { key: "name", header: c.customers.cols.name, sortValue: (r) => r.name, cell: (r) => <Link href={localHref(locale, `/marketing/customers/${r.id}`)} className="block max-w-60 truncate font-medium hover:underline" title={r.name}>{r.name}</Link> },
          { key: "id", header: c.customers.cols.id, cell: (r) => <span className="tabular text-fg-muted">{r.customerId ?? "—"}</span> },
          { key: "lang", header: c.customers.cols.lang, cell: (r) => m.locale[r.language] },
          { key: "sector", header: c.customers.cols.sector, cell: (r) => r.sector },
          { key: "lifetime", header: c.customers.cols.lifetime, sortValue: (r) => r.lifetime, cell: (r) => <span className="tabular">{formatMoney(r.lifetime, "RWF", locale)}</span> },
          { key: "last", header: c.customers.cols.last, sortValue: (r) => r.lastActiveAt, cell: (r) => formatDate(r.lastActiveAt, locale) },
          { key: "consent", header: c.customers.cols.consent, cell: (r) => <span className="flex gap-1">{CH.map((ch) => <ConsentChip key={ch} channel={ch} state={r.consent[ch]} />)}</span> },
        ]} />
    </div>
  );
}

export function Customer360View({ id }: { id: string }) {
  const c = useC();
  const m = useM();
  const { locale } = useI18n();
  const params = useUrlParams();
  const tab = params.get("tab") ?? "timeline";
  const q = useCustomer(id);
  const staff = useStaffMap();
  if (q.isError) return <PanelError what={c.customers.notFound} onRetry={() => q.refetch()} />;
  const d = q.data;
  if (!d) return <div className="grid gap-4"><div className="h-28 m-shimmer" /><div className="grid gap-4 lg:grid-cols-[16rem_1fr_16rem]">{[0, 1, 2].map((i) => <div key={i} className="h-80 m-shimmer" />)}</div></div>;
  return (
    <div className="grid gap-5">
      <PageHead eyebrow={<Link href={localHref(locale, "/marketing/customers")} className="hover:underline">{c.customers.title}</Link>} title={d.name}
        sub={<span className="flex flex-wrap items-center gap-2 text-small">{d.customerId && <CopyRef value={d.customerId} />}<span>{[d.sector, d.size, m.locale[d.language], d.subscription].filter(Boolean).join(" · ")}</span></span>}
        actions={<span className="flex flex-wrap items-center gap-1.5">{CH.map((ch) => <ConsentChip key={ch} channel={ch} state={d.consent[ch]} />)}</span>} />
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr_16rem]">
        <div className="grid content-start gap-4">
          <Panel title={c.customers.lifetime}>
            <p className="text-h3 tabular m-tick">{formatMoney(d.lifetime, "RWF", locale)}</p>
            <Sparkline values={d.spark} />
          </Panel>
          <Panel title={c.customers.tabs.details}>
            <dl className="grid gap-2 text-small">
              <Row k={c.customers.owner} v={<StaffName staff={staff.of(d.ownerId)} />} />
              <Row k={c.customers.phone} v={<span className="tabular" title={c.customers.phoneMasked}>{d.phoneMasked}</span>} />
              <Row k={c.customers.district} v={d.district} />
              <Row k={c.customers.size} v={d.size} />
            </dl>
          </Panel>
        </div>
        <div className="min-w-0 border border-border bg-white p-4">
          <Tabs value={tab} onChange={(t) => setUrlParams({ tab: t === "timeline" ? null : t })} tabs={[
            { id: "timeline", label: c.customers.tabs.timeline, content: <Timeline d={d} /> },
            { id: "cases", label: c.customers.tabs.cases, count: d.cases.length, content: d.cases.length ? (
              <ul className="grid gap-2">{d.cases.map((k) => <li key={k.ref} className="flex flex-wrap items-center gap-2 border border-border p-3 text-small"><span className="tabular font-medium">{k.ref}</span><span>{serviceLabel(k.service)}</span><span className="ml-auto text-eyebrow text-fg-subtle">{k.status} · {formatDate(k.at, locale)}</span></li>)}</ul>
            ) : <p className="py-6 text-center text-small text-fg-muted">{c.customers.noCases}</p> },
            { id: "communications", label: c.customers.tabs.communications, count: d.comms.length, content: d.comms.length ? (
              <ul className="grid gap-2">{d.comms.map((x) => <li key={x.id} className="flex items-center gap-2 border border-border p-3 text-small"><span className="min-w-0 flex-1 truncate">{x.subject}</span><span className="text-eyebrow text-fg-subtle">{x.channel} · {formatDate(x.at, locale)}</span></li>)}</ul>
            ) : <p className="py-6 text-center text-small text-fg-muted">{c.customers.noComms}</p> },
            { id: "notes", label: c.customers.tabs.notes, count: d.notes.length, content: <NotesTab d={{ notes: d.notes, id: d.id }} subject="customer" /> },
            { id: "tasks", label: c.customers.tabs.tasks, count: d.tasks.length, content: <ul className="grid gap-2">{d.tasks.map((t) => <li key={t.id} className="flex gap-2 border border-border p-3 text-small"><span className="flex-1">{t.title}</span><span className="text-eyebrow text-fg-subtle">{formatDate(t.dueAt, locale)}</span></li>)}</ul> },
            { id: "attribution", label: c.customers.tabs.attribution, content: <AttributionTab lead={d} /> },
          ]} />
        </div>
        <div className="grid content-start gap-4">
          <Panel title={c.customers.related}>
            <dl className="grid grid-cols-2 gap-2 text-small">
              {(["cases", "messages", "ratings", "campaigns"] as const).map((k) => <div key={k} className="bg-bg-subtle p-2"><dt className="text-eyebrow text-fg-subtle">{c.customers[k]}</dt><dd className="text-label tabular">{d.related[k]}</dd></div>)}
            </dl>
          </Panel>
          <Panel title={c.customers.recommended}>
            <ul className="grid gap-1.5 text-small">{d.recommended.map((s) => <li key={s} className="flex items-center gap-2"><Icon name="sparkle" size={13} className="text-link" aria-hidden />{serviceLabel(s)}</li>)}</ul>
          </Panel>
          {d.leadIds.length > 0 && <Panel title={m.nav.leads}>
            <ul className="grid gap-1 text-small">{d.leadIds.map((l) => <li key={l}><Link className="tabular text-link hover:underline" href={localHref(locale, `/marketing/leads?lead=${l}`)}>{l}</Link></li>)}</ul>
          </Panel>}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-2"><dt className="text-fg-subtle">{k}</dt><dd className="min-w-0 truncate">{v}</dd></div>;
}

function Timeline({ d }: { d: Customer360 }) {
  const { locale } = useI18n();
  const kind = (k: string) => (k === "payment" || k === "invoice" ? "payment" : k === "note" ? "note" : k === "case" || k === "status" ? "status" : k === "message" || k === "campaign" ? "message" : "system") as "payment" | "note" | "status" | "message" | "system";
  return <ol className="grid">{d.timeline.map((e, i) => <TimelineItem key={e.id} kind={kind(e.kind)} title={e.title} meta={e.meta} time={formatDate(e.at, locale)} last={i === d.timeline.length - 1} />)}</ol>;
}
