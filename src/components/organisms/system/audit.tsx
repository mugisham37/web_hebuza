"use client";
// U13 Audit log `/system/audit` (plan 06 §7 U13, board 11 AU1/AU2/PAU1 with §3 fixes: catalogue codes not verbs,
// no "viewed audit_log" rows, case refs never linked). Filters + query syntax live in the URL; drawer is `?entry=`.
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { systemAudit } from "@/content/pages/system-audit";
import { fill } from "@/content/pages/system-common";
import { cx, formatDateTime } from "@/shared/format";
import { errorState } from "@/lib/system/api";
import { shortHash } from "@/shared/system/audit";
import { AUDIT_CATEGORIES } from "@/shared/system/audit-catalogue";
import { download, useAudit, useAuditEntry, useExportAudit, useVerifyEntry, type ExportJob } from "@/lib/system/e";
import type { AuditEntryVM } from "@/shared/system/types";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Input, Select, Switch, DateInput, Radio } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { Skeleton } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { usePhone, useStepUp, StepUpCancelled } from "@/components/atoms/step-up";
import { CategoryChip, ChainBadge, LockedContent, useRoleLabel, useS } from "@/components/atoms/system";
import { AuditRow, DiffView, SysPageHead, resourceHref } from "@/components/molecules/system/system";
import { AuditNav, TH, useErrText, useParamState } from "@/components/molecules/system/audit";
import { useOnline } from "@/components/atoms/hooks";
import { errType } from "@/components/atoms/hooks";

const useC = () => systemAudit(useI18n().locale);
const FILTER_KEYS = ["category", "actor", "action", "resource_type", "resource_id", "ip", "from", "to", "privileged", "q"] as const;

export function AuditView() {
  const c = useC();
  const { locale } = useI18n();
  const [sp, set] = useParamState();
  const qs = new URLSearchParams(FILTER_KEYS.flatMap((k) => (sp.get(k) ? [[k, sp.get(k)!]] : []))).toString();
  const q = useAudit(qs);
  const [exporting, setExporting] = useState(false);
  const entry = sp.get("entry");

  if (q.isError && !q.data && errorState(q.error) === "locked") return <LockedContent reason="role" />;
  const first = q.data?.pages[0];
  const rows = q.data?.pages.flatMap((p) => p.items) ?? [];
  const chain = first?.chain;

  return (
    <div className="m-rise">
      <SysPageHead title={c.title} sub={c.sub} actions={<>
        {chain ? <ChainBadge state={chain.state} entries={chain.entries} hash={chain.hash} brokenAt={chain.brokenAt} /> : <ChainBadge state="checking" />}
        <Button size="sm" variant="primary" data-guide="system-audit-export" onClick={() => setExporting(true)} disabled={!first}><Icon name="file" size={15} aria-hidden />{c.ex.button}</Button>
      </>} />
      <AuditNav />
      {chain?.state === "broken" && (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 border border-danger/30 bg-danger-bg p-4 text-small m-rise">
          <Icon name="zap" size={18} aria-hidden className="text-danger" />
          <p className="min-w-0 flex-1 font-medium text-danger">{fill(c.chainBrokenBanner, { id: chain.brokenAt ?? "?" })}</p>
          <Link href={localHref(locale, "/system/audit/integrity")} className="font-medium underline underline-offset-4">{c.openIntegrity}</Link>
        </div>
      )}
      <FilterBar key={qs} sp={sp} set={set} />
      <div className="mt-4" aria-busy={q.isFetching}>
        {q.isPending ? <TableSkeleton /> : q.isError && !q.data ? <PanelError what={c.what} onRetry={() => q.refetch()} /> : !rows.length ? (
          <EmptyPanel title={c.emptyTitle} body={c.emptyBody} action={qs ? <Button size="sm" variant="outline" onClick={() => set(Object.fromEntries(FILTER_KEYS.map((k) => [k, null])))}>{c.clearFilters}</Button> : undefined} />
        ) : (
          <>
            <AuditTable rows={rows} onOpen={(id) => set({ entry: id })} />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-small text-fg-muted tabular" aria-live="polite">{fill(c.showing, { n: rows.length, total: first?.total ?? 0 })}</p>
              {q.hasNextPage && <Button size="sm" variant="outline" loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>{c.loadMore}</Button>}
            </div>
          </>
        )}
      </div>
      <AuditDrawer id={entry} onClose={() => set({ entry: null })} />
      <ExportDialog open={exporting} onClose={() => setExporting(false)} qs={qs} total={first?.total ?? 0} />
    </div>
  );
}

// ---------------------------------------------------------------- filters (AU1)
function FilterBar({ sp, set }: { sp: URLSearchParams; set: (p: Record<string, string | null>) => void }) {
  const c = useC();
  const s = useS();
  const extra = ["actor", "action", "ip", "from", "to"].some((k) => sp.get(k));
  const [more, setMore] = useState(extra);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    set({ q: String(f.get("q") ?? "").trim() || null, ...Object.fromEntries(["actor", "action", "ip", "from", "to"].map((k) => [k, String(f.get(k) ?? "").trim() || null])) });
  };
  return (
    <form onSubmit={submit} role="search" className="grid gap-3 border border-border bg-surface p-3 sm:p-4">
      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-0 flex-[1_1_16rem]">
          <span className="sr-only">{c.search}</span>
          <Icon name="search" size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-fg-subtle" />
          <Input name="q" data-guide="system-audit-search" defaultValue={sp.get("q") ?? ""} placeholder={c.search} className="h-11 pl-10 font-mono text-[0.85rem]" />
        </label>
        <Select aria-label={c.f.category} value={sp.get("category") ?? ""} onChange={(e) => set({ category: e.target.value || null })} className="h-11 w-auto min-w-0 flex-[0_1_12rem]">
          <option value="">{c.f.anyCategory}</option>
          {AUDIT_CATEGORIES.map((k) => <option key={k} value={k}>{s.category[k]}</option>)}
        </Select>
        <Button type="button" size="sm" variant="outline" className="h-11" aria-expanded={more} onClick={() => setMore((m) => !m)}>
          {c.f.more}<Icon name="chevronDown" size={14} aria-hidden className={cx("transition-transform", more && "rotate-180")} />
        </Button>
        <Button type="submit" size="sm" className="h-11">{c.f.apply}</Button>
      </div>
      {more && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 m-rise">
          {(["actor", "action", "ip"] as const).map((k) => (
            <label key={k} className="grid gap-1 text-small"><span className="text-fg-subtle">{c.f[k]}</span><Input name={k} defaultValue={sp.get(k) ?? ""} className="h-10" /></label>
          ))}
          {(["from", "to"] as const).map((k) => (
            <label key={k} className="grid gap-1 text-small"><span className="text-fg-subtle">{c.f[k]}</span><DateInput name={k} defaultValue={sp.get(k) ?? ""} className="h-10" /></label>
          ))}
        </div>
      )}
      <Switch label={c.f.privileged} checked={sp.get("privileged") === "1"} onChange={(e) => set({ privileged: e.target.checked ? "1" : null })} />
    </form>
  );
}

// ---------------------------------------------------------------- table (desktop) / stacked rows (phone)
function AuditTable({ rows, onOpen }: { rows: AuditEntryVM[]; onOpen: (id: string) => void }) {
  const c = useC();
  const { locale } = useI18n();
  // shortcut: plain list + "Load older" instead of virtualisation, fine to a few thousand rows; virtualise when real volumes land.
  return (
    <>
      <div className="hidden overflow-x-auto border border-border bg-surface md:block">
        <table className="w-full min-w-[52rem]">
          <thead className="border-b border-border bg-bg-subtle"><tr>
            {(["time", "actor", "action", "category", "resource", "ip"] as const).map((k) => <th key={k} scope="col" className={TH}>{c.col[k]}</th>)}
          </tr></thead>
          <tbody>{rows.map((r) => <AuditRow key={r.id} entry={r} onOpen={onOpen} />)}</tbody>
        </table>
      </div>
      <ul className="grid gap-2 md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => onOpen(r.id)} className="grid w-full gap-1.5 border border-border bg-surface p-4 text-left m-press">
              <span className="flex items-center justify-between gap-2 text-eyebrow text-fg-subtle tabular">{formatDateTime(r.at, locale)}<CategoryChip category={r.category} /></span>
              <span className="font-mono text-[0.8rem] break-all">{r.action}</span>
              <span className="text-small text-fg-muted">{r.actorLabel}{r.impersonatorId && ` (${c.as})`}{r.breakGlass && ` · ${c.bg}`} · <span className="font-mono">{r.resourceType}:{r.resourceId}</span></span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
const TableSkeleton = () => <div className="grid gap-2 border border-border bg-surface p-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-9" />)}</div>;

// ---------------------------------------------------------------- AU2 drawer
function AuditDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const c = useC().dr;
  const { locale } = useI18n();
  const role = useRoleLabel();
  const phone = usePhone();
  const q = useAuditEntry(id);
  const v = useVerifyEntry();
  const e = q.data;
  const href = e ? resourceHref(e.resourceType, e.resourceId) : null;
  return (
    <Dialog open={!!id} onClose={() => { v.reset(); onClose(); }} side={phone ? "bottom" : "right"} title={c.title} description={e?.id}>
      {q.isPending ? <div className="grid gap-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
        : q.isError || !e ? <PanelError what={c.title} onRetry={() => q.refetch()} />
        : (
          <div className="grid gap-5">
            <p className="font-mono text-[0.85rem] break-all">{e.action}</p>
            {e.breakGlass && <p className="flex items-center gap-2 bg-danger-bg px-3 py-2 text-small font-medium text-danger"><Icon name="zap" size={14} aria-hidden />{c.breakGlass}</p>}
            <dl className="grid gap-3 sm:grid-cols-2">
              <Row k={c.actor}>{e.actorLabel}</Row>
              <Row k={c.role}>{role(e.actorRole)}</Row>
              {e.impersonatorId && <Row k={c.impersonator}><span className="text-danger">{e.impersonatorId}</span></Row>}
              <Row k={c.when}>{formatDateTime(e.at, locale)}</Row>
              <Row k={c.category}><CategoryChip category={e.category} /></Row>
              <Row k={c.resource} mono>
                {e.resourceType}:{e.resourceId}
                {href && <Link href={localHref(locale, href)} className="ml-2 font-sans text-small font-medium text-link underline underline-offset-4">{c.openResource}</Link>}
              </Row>
              <Row k={c.ip} mono>{e.ip}</Row>
              <Row k={c.ua}>{e.userAgent}</Row>
              <Row k={c.request} mono>{e.requestId}</Row>
              <Row k={c.session} mono>{e.sessionId}</Row>
              {e.approvalRef && <Row k={c.approval} mono><Link href={localHref(locale, `/system/approvals?id=${e.approvalRef}`)} className="underline underline-offset-4">{e.approvalRef}</Link></Row>}
              {e.batchId && <Row k={c.batch} mono>{e.batchId}</Row>}
            </dl>
            {e.resourceType === "case" && <p className="bg-bg-subtle px-3 py-2 text-small text-fg-muted">{c.caseText}</p>}
            {e.details.reason && <Row k={c.reason}>{e.details.reason}</Row>}
            {e.details.before !== undefined || e.details.after !== undefined
              ? <div className="grid gap-1"><DiffView title={c.diff} before={e.details.before ?? {}} after={e.details.after ?? {}} /><p className="text-eyebrow text-fg-subtle">{c.redacted}</p></div>
              : <p className="text-small text-fg-muted">{c.noDiff}</p>}
            <dl className="grid gap-3 border border-border p-3 sm:grid-cols-2">
              <Row k={c.prev} mono><span title={e.prevHash}>{shortHash(e.prevHash)}</span></Row>
              <Row k={c.hash} mono><span title={e.hash}>{shortHash(e.hash)}</span></Row>
            </dl>
            <div className="grid gap-2">
              <Button variant="outline" loading={v.isPending} onClick={() => v.mutate(e.id)} className="justify-self-start">
                <Icon name="shield" size={15} aria-hidden />{v.isPending ? c.verifying : c.verify}
              </Button>
              {v.data && (
                <p role="status" className={cx("flex items-center gap-2 px-3 py-2 text-small font-medium m-tone", v.data.ok ? "bg-success-bg text-success" : "bg-danger-bg text-danger")}>
                  <Icon name={v.data.ok ? "check" : "x"} size={14} aria-hidden />{v.data.ok ? c.ok : c.bad}
                </p>
              )}
            </div>
          </div>
        )}
    </Dialog>
  );
}

// ---------------------------------------------------------------- export (step-up → job → download)
function ExportDialog({ open, onClose, qs, total }: { open: boolean; onClose: () => void; qs: string; total: number }) {
  const c = useC().ex;
  const s = useS();
  const { t } = useI18n();
  const phone = usePhone();
  const toast = useToast();
  const errText = useErrText();
  const online = useOnline();
  const [format, setFormat] = useState<"csv" | "pdf">("csv");
  const [job, setJob] = useState<ExportJob | null>(null);
  const ex = useExportAudit();
  const stepUp = useStepUp();
  const close = () => { setJob(null); ex.reset(); onClose(); };
  const filters = [...new URLSearchParams(qs)].map(([k, v]) => `${k}=${v}`);

  const run = async (retry = true): Promise<void> => {
    try {
      const token = await stepUp.request(c.stepUp);
      const r = await ex.mutateAsync({ qs, format, token });
      setJob(r);
      toast({ title: c.ready, body: fill(c.readyBody, { n: r.rows, h: shortHash(r.sha256) }), tone: "success" });
    } catch (e) {
      if (e instanceof StepUpCancelled) return;
      if (errType(e) === "step_up_required" && retry) { stepUp.reset(); return run(false); }
      toast({ title: errText(e), tone: "danger" });
    }
  };
  const save = () => job && download(`audit-${job.id}.${job.format === "csv" ? "csv" : "txt"}`, job.content, job.format === "csv" ? "text/csv" : "text/plain");

  return (
    <>
      <Dialog open={open} onClose={close} side={phone ? "bottom" : undefined} title={c.title}
        footer={job
          ? <><Button variant="outline" onClick={close}>{t("common.close")}</Button><Button onClick={save}><Icon name="file" size={15} aria-hidden />{c.download}</Button></>
          : <><Button variant="outline" onClick={close}>{s.secret.cancel}</Button><Button dots loading={ex.isPending} disabled={!online} onClick={() => run()}>{c.start}</Button></>}>
        {job ? (
          <div role="status" className="grid place-items-center gap-3 py-4 text-center m-rise">
            <span className="flex size-12 items-center justify-center rounded-full bg-success-bg text-success"><Icon name="check" size={22} aria-hidden /></span>
            <p className="text-h3">{c.ready}</p>
            <p className="font-mono text-small break-all text-fg-muted">{fill(c.readyBody, { n: job.rows, h: job.sha256 })}</p>
          </div>
        ) : ex.isPending ? (
          <p role="status" className="py-6 text-center text-small text-fg-muted m-shimmer">{c.working}</p>
        ) : (
          <div className="grid gap-4">
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-label">{c.format}</legend>
              <Radio name="fmt" label={c.csv} checked={format === "csv"} onChange={() => setFormat("csv")} />
              <Radio name="fmt" label={c.pdf} checked={format === "pdf"} onChange={() => setFormat("pdf")} />
            </fieldset>
            <div className="grid gap-1 text-small">
              <p className="text-label">{c.filters}</p>
              {filters.length ? <ul className="flex flex-wrap gap-1.5">{filters.map((f) => <li key={f} className="bg-ink-100 px-2.5 py-0.5 font-mono text-[0.78rem]">{f}</li>)}</ul> : <p className="text-fg-muted">{c.none}</p>}
            </div>
            <p className="text-label tabular">{fill(c.rows, { n: total.toLocaleString() })}</p>
            {total >= 1000 && <p role="alert" className="flex gap-2 border border-warning/30 bg-warning-bg p-3 text-small"><Icon name="zap" size={15} aria-hidden className="mt-0.5 shrink-0 text-warning" />{c.mass}</p>}
            <p className="flex gap-2 text-eyebrow text-fg-subtle"><Icon name="shield" size={12} aria-hidden className="mt-0.5 shrink-0" />{c.audited}</p>
            {!online && <p className="text-small text-warning">{s.states.offlineAction}</p>}
          </div>
        )}
      </Dialog>
      {stepUp.dialog}
    </>
  );
}

function Row({ k, children, mono }: { k: string; children: React.ReactNode; mono?: boolean }) {
  return <div className="grid gap-0.5"><dt className="text-eyebrow text-fg-subtle">{k}</dt><dd className={cx("text-small break-words", mono && "font-mono text-[0.8rem]")}>{children}</dd></div>;
}
