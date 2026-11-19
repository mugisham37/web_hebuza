"use client";
// W1 Talent directory (F-WRK-14, board 10 WF1/PWF1 in the ops shell). All filters live in the URL.
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { formatDate } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { useWorkers } from "@/lib/workforce";
import type { WorkerRow } from "@/shared/procurement/types";
import { opsWorkforce, fill } from "@/content/pages/ops-workforce";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { CapacityBar } from "@/components/atoms/ops";
import { EmptyPanel, FilterBar, SavedViewTabs, type FilterChip } from "@/components/molecules/ops/ops";
import { PageHead, StarRating } from "@/components/atoms/agent";
import { ProcPill, useP } from "@/components/atoms/procurement";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { Input, Select } from "@/components/atoms/field";
import { usePublicServices } from "@/lib/work/a";

export const useW = () => opsWorkforce(useI18n().locale);
const SEGS = ["all", "internal", "external", "field"] as const;
const F = ["service", "expertise", "language", "district", "available", "rating", "status"] as const;
export const canAdmin = (roles: readonly string[]) => roles.includes("staff:service_manager");
export const WorkforceDenied = () => {
  const c = useW();
  return <div role="alert" className="mx-auto grid max-w-md place-items-center gap-3 py-16 text-center"><Icon name="lock" size={28} aria-hidden /><p className="text-body">{c.denied}</p></div>;
};

export function WorkforceView() {
  const c = useW();
  const { locale } = useI18n();
  const { user } = useSession();
  const router = useRouter();
  const p = useUrlParams();
  const status = useP().status;
  const q = useWorkers(); // unfiltered: filter options + segment counts
  const SERVICES = usePublicServices().data?.items ?? [];
  const seg = (SEGS as readonly string[]).includes(p.get("seg") ?? "") ? p.get("seg")! : "all";
  const v = Object.fromEntries(F.map((k) => [k, p.get(k) ?? ""])) as Record<(typeof F)[number], string>;
  const search = (p.get("q") ?? "").toLowerCase();
  const found = useWorkers({ service: v.service, language: v.language, district: v.district, minRating: v.rating ? Number(v.rating) : undefined, q: search || undefined });
  if (user && !user.roles.some((r) => r === "staff:service_manager" || r === "staff:executive")) return <WorkforceDenied />;

  const all = q.data?.items ?? [];
  const opt = (pick: (w: WorkerRow) => string[]) => [...new Set(all.flatMap(pick))].sort();
  const svcName = (s: string) => SERVICES.find((x) => x.slug === s)?.name ?? s;
  // Service, language, district, rating and text search are filtered by the API; the rest are view-only refinements.
  const rows = (found.data?.items ?? []).filter((w) =>
    (seg === "all" || (seg === "field" ? w.field : w.type === seg)) &&
    (!v.expertise || w.expertise.includes(v.expertise)) &&
    (!v.available || !w.availableFrom || w.availableFrom <= v.available) &&
    (!v.status || w.status === v.status));
  const chips: FilterChip[] = F.filter((k) => v[k]).map((k) => ({ key: k, label: `${c.filters[k]}: ${k === "service" ? svcName(v[k]) : v[k]}`, onRemove: () => setUrlParams({ [k]: null }) }));
  const filtered = !!search || F.some((k) => v[k]);
  const clearAll = () => setUrlParams({ q: null, ...Object.fromEntries(F.map((k) => [k, null])) });
  const sel = (k: (typeof F)[number], options: string[], label = (x: string) => x) => (
    <label key={k} className="grid gap-1 text-eyebrow text-fg-subtle">{c.filters[k]}
      <Select value={v[k]} onChange={(e) => setUrlParams({ [k]: e.target.value || null })} className="h-9 text-small">
        <option value="">{c.filters.any}</option>{options.map((o) => <option key={o} value={o}>{label(o)}</option>)}
      </Select>
    </label>
  );
  const cols: OpsColumn<WorkerRow>[] = [
    { key: "name", label: c.cols.name, sort: (w) => w.name, cell: (w) => <span className="grid"><span className="font-medium">{w.name}</span><span className="text-eyebrow text-fg-subtle">{w.role}</span></span> },
    { key: "type", label: c.cols.type, cell: (w) => <span className="text-small">{c.type[w.type]}{w.field ? ` · ${c.type.field}` : ""}</span> },
    { key: "status", label: c.cols.status, sort: (w) => w.status, cell: (w) => <ProcPill state={w.status} machine="worker" /> },
    { key: "services", label: c.cols.services, wrap: true, card: false, cell: (w) => <span className="text-small text-fg-muted">{w.services.map(svcName).join(", ") || "—"}</span> },
    { key: "load", label: c.cols.load, sort: (w) => w.load.open / w.load.cap, cell: (w) => <span className="flex items-center gap-2"><CapacityBar load={w.load.open} cap={w.load.cap} className="w-20" /><span className="text-eyebrow tabular">{w.load.open}/{w.load.cap}</span></span> },
    { key: "onTime", label: c.cols.onTime, align: "right", sort: (w) => w.onTimePct ?? -1, cell: (w) => <span className="tabular">{w.onTimePct != null ? `${w.onTimePct}%` : "—"}</span> },
    { key: "rating", label: c.cols.rating, sort: (w) => w.rating ?? -1, cell: (w) => (w.rating ? <StarRating value={w.rating} /> : <span className="text-fg-subtle">—</span>) },
    { key: "end", label: c.cols.contractEnd, sort: (w) => w.contractEnd ?? "", cell: (w) => <span className="text-small tabular">{w.contractEnd ? formatDate(w.contractEnd, locale) : "—"}</span> },
  ];

  return (
    <div className="grid gap-5">
      <PageHead title={c.title} sub={c.sub} actions={<>
        <ButtonLink variant="secondary" href={localHref(locale, "/ops/workload?tab=approvals")}>{c.approvals}</ButtonLink>
        <ButtonLink variant="secondary" href={localHref(locale, "/ops/workforce/applications")}>{c.apps.link}</ButtonLink>
        {user && canAdmin(user.roles) && <ButtonLink href={localHref(locale, "/ops/workforce/new")} dots><Icon name="plus" size={16} aria-hidden />{c.add}</ButtonLink>}
      </>} />
      <SavedViewTabs active={seg} onChange={(k) => setUrlParams({ seg: k === "all" ? null : k })}
        views={SEGS.map((s) => ({ key: s, label: c.seg[s], count: s === "all" ? all.length : all.filter((w) => (s === "field" ? w.field : w.type === s)).length }))} />
      <FilterBar search={p.get("q") ?? ""} onSearch={(x) => setUrlParams({ q: x || null })} placeholder={c.search} chips={chips}
        right={<span className="text-small text-fg-muted tabular" aria-live="polite">{fill(c.shown, { n: rows.length })}</span>} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {sel("service", opt((w) => w.services), svcName)}
        {sel("expertise", opt((w) => w.expertise))}
        {sel("language", opt((w) => w.languages))}
        {sel("district", opt((w) => w.districts))}
        <label className="grid gap-1 text-eyebrow text-fg-subtle">{c.filters.available}<Input type="date" value={v.available} onChange={(e) => setUrlParams({ available: e.target.value || null })} className="h-9 text-small" /></label>
        {sel("rating", ["3", "4", "4.5"], (x) => `≥ ${x}`)}
        {sel("status", ["invited", "onboarding", "cleared", "suspended", "terminated"], (x) => status[x] ?? x)}
        {filtered && <Button variant="ghost" size="sm" className="self-end" onClick={clearAll}>{c.filters.clear}</Button>}
      </div>
      <div className="border border-border bg-white m-rise">
        <OpsTable rows={rows} columns={cols} rowKey={(w) => w.id} rowLabel={(w) => w.name} label={c.title} loading={q.isPending || found.isPending} error={q.isError ? q.error : found.isError ? found.error : undefined}
          onRetry={() => q.refetch()} shortcuts rowTone={(w) => (w.status === "suspended" || w.status === "terminated" ? "muted" : null)}
          onOpen={(w) => router.push(localHref(locale, `/ops/workforce/${w.id}`))}
          empty={<div className="p-4"><EmptyPanel title={c.empty[0]} body={c.empty[1]} action={filtered ? <Button variant="outline" size="sm" onClick={clearAll}>{c.filters.clear}</Button> : undefined} /></div>} />
      </div>
    </div>
  );
}
