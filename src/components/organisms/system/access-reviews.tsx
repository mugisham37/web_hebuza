"use client";
// U7 Access reviews `/system/access-reviews` and `/system/access-reviews/[id]?risk=&role=&reviewer=&q=` (plan 06 §7 U7,
// board 06 v2 AG1/AG2 with §3 fixes: only canonical roles, overdue → escalated banner, reviewer reassignment).
// Decisions save per row, optimistic with rollback; removing a role is immediate (revocation needs no approval).
import { useMemo, useState } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { systemGovernance } from "@/content/pages/system-governance";
import { fill } from "@/content/pages/system-common";
import { cx, formatDate, formatRelative } from "@/shared/format";
import { INACTIVE_DAYS, canReview, reviewProgress } from "@/shared/system/governance";
import { useBulkKeep, useDecideItem, useExportReview, useReview, useReviews, useSignOff, type CampaignRowVM } from "@/lib/system/c";
import type { ReviewCampaignVM, ReviewDecision, ReviewItemVM, RiskFlag } from "@/shared/system/types";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { Icon } from "@/components/atoms/icon";
import { Avatar } from "@/components/atoms/misc";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Input } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { EmptyPanel, Panel } from "@/components/molecules/ops/ops";
import { useNow } from "@/components/atoms/step-up";
import { RoleChip, useRoleLabel, useS } from "@/components/atoms/system";
import { ConflictBanner, SysPageHead } from "@/components/molecules/system/system";
import { Confirm, QueryFail, Skeleton, TABLE, TD, TH, isConflict, useCanMutate, useErrText, useGuarded } from "@/components/molecules/system/system";

const useC = () => systemGovernance(useI18n().locale);
const day = (iso: string, l: Parameters<typeof formatDate>[1]) => formatDate(iso, l, { weekday: "short", day: "numeric", month: "short" });
const plus3m = (iso: string) => { const d = new Date(iso); d.setMonth(d.getMonth() + 3); return d.toISOString(); };

// ---------------------------------------------------------------- list
export function ReviewsView() {
  const c = useC();
  const { locale } = useI18n();
  const q = useReviews();
  const head = <SysPageHead title={c.title} sub={c.reviewsSub} />;
  if (q.isError && !q.data) return <div className="m-rise">{head}<QueryFail error={q.error} what={c.title} onRetry={() => q.refetch()} /></div>;
  if (!q.data) return <div className="m-rise" aria-busy>{head}<Skeleton rows={4} /></div>;
  const current = q.data.items.filter((x) => x.status !== "completed");
  const past = q.data.items.filter((x) => x.status === "completed");
  return (
    <div className="grid gap-6 m-rise">
      {head}
      <section aria-labelledby="cur-h" className="grid gap-3">
        <h2 id="cur-h" className="text-h3">{c.current}</h2>
        {!current.length ? <EmptyPanel title={c.noCurrent} body={c.noCurrentBody} /> : current.map((x) => (
          <Link key={x.id} href={localHref(locale, `/system/access-reviews/${x.id}`)} className="grid gap-3 border border-border bg-surface p-5 m-lift">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-label-lg"><Icon name="calendar" size={18} aria-hidden className="text-navy-700" />{x.name}</span>
              <CampaignPill status={x.status} />
            </span>
            <Progress pct={x.pct} label={fill(c.progress, { done: x.done, total: x.total })} />
            <span className="flex flex-wrap items-center justify-between gap-2 text-small text-fg-muted">
              <span>{fill(c.due, { t: day(x.dueAt, locale) })}</span>
              <span className="inline-flex items-center gap-1 font-medium text-link">{c.open}<Icon name="arrowRight" size={14} aria-hidden /></span>
            </span>
          </Link>
        ))}
      </section>
      <section aria-labelledby="hist-h" className="grid gap-3">
        <h2 id="hist-h" className="text-h3">{c.history}</h2>
        {!past.length ? <EmptyPanel compact title={c.noHistory} /> : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {past.map((x) => <li key={x.id}><PastCard x={x} /></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}

function PastCard({ x }: { x: CampaignRowVM }) {
  const c = useC();
  const { locale } = useI18n();
  return (
    <Link href={localHref(locale, `/system/access-reviews/${x.id}`)} className="grid gap-2 border border-border bg-surface p-4 m-lift">
      <span className="flex items-center justify-between gap-2"><span className="font-medium">{x.name}</span><CampaignPill status={x.status} /></span>
      <span className="text-small text-fg-muted">{fill(c.closed, { t: day(x.dueAt, locale) })}</span>
      <span className="flex flex-wrap gap-3 text-small tabular">
        <span>{x.kept} {c.stats.kept.toLowerCase()}</span><span>{x.removed} {c.stats.removed.toLowerCase()}</span><span>{x.suspended} {c.stats.suspended.toLowerCase()}</span>
      </span>
    </Link>
  );
}

function CampaignPill({ status }: { status: ReviewCampaignVM["status"] }) {
  const c = useC();
  const cls = { scheduled: "bg-ink-100 text-ink-700", open: "bg-navy-50 text-navy-700", overdue: "bg-danger-bg text-danger", completed: "bg-success-bg text-success" }[status];
  const icon = ({ scheduled: "calendar", open: "clock", overdue: "zap", completed: "check" } as const)[status];
  return <span className={cx("inline-flex h-7 items-center gap-1.5 px-2.5 text-eyebrow font-medium", cls)}><Icon name={icon} size={12} aria-hidden />{c.campaignStatus[status]}</span>;
}

function Progress({ pct, label }: { pct: number; label: string }) {
  return (
    <span className="grid gap-1.5">
      <span role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="block h-2.5 overflow-hidden bg-ink-100">
        <span className="block h-full bg-navy-700 m-grow" style={{ width: `${pct}%` }} />
      </span>
      <span className="flex justify-between text-small text-fg-muted tabular"><span>{label}</span><span className="font-medium text-fg">{pct}%</span></span>
    </span>
  );
}

// ---------------------------------------------------------------- campaign
export function ReviewCampaignView({ id }: { id: string }) {
  const c = useC();
  const { locale } = useI18n();
  const q = useReview(id);
  const back = <nav className="mb-3 text-small"><Link href={localHref(locale, "/system/access-reviews")} className="inline-flex items-center gap-1 text-fg-muted hover:text-fg"><Icon name="arrowRight" size={14} aria-hidden className="rotate-180" />{c.allReviews}</Link></nav>;
  if (q.isError && !q.data) return <div className="m-rise">{back}<QueryFail error={q.error} what={c.title} onRetry={() => q.refetch()} /></div>;
  if (!q.data) return <div className="m-rise" aria-busy>{back}<div className="mb-4 h-20 m-shimmer" /><Skeleton rows={8} /></div>;
  const d = q.data;
  return <div className="m-rise">{back}{d.status === "completed" ? <Completion d={d} /> : <Campaign d={d} onReload={() => q.refetch()} />}</div>;
}

function Campaign({ d, onReload }: { d: ReviewCampaignVM; onReload: () => void }) {
  const c = useC();
  const s = useS();
  const { locale } = useI18n();
  const label = useRoleLabel();
  const toast = useToast();
  const errText = useErrText();
  const me = useSession().user;
  const online = useCanMutate();
  const now = useNow(60_000);
  const p = useUrlParams();
  const decide = useDecideItem(d.id);
  const bulk = useBulkKeep(d.id);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [ask, setAsk] = useState<{ it: ReviewItemVM; decision: "role_removed" | "suspended" } | null>(null);
  const [conflict, setConflict] = useState(false);
  const [busyRow, setBusyRow] = useState<string | null>(null);

  const risk = p.get("risk") ?? "";
  const role = p.get("role") ?? "";
  const reviewer = p.get("reviewer") ?? "";
  const needle = (p.get("q") ?? "").trim().toLowerCase();
  const roles = useMemo(() => [...new Set(d.items.map((i) => i.role))], [d.items]);
  const reviewers = useMemo(() => [...new Map(d.items.map((i) => [i.reviewer.id, i.reviewer])).values()], [d.items]);
  const rows = d.items.filter((i) =>
    (!risk || (risk === "flagged" ? i.flags.length > 0 : risk === "none" ? !i.flags.length : i.flags.includes(risk as RiskFlag))) &&
    (!role || i.role === role) && (!reviewer || i.reviewer.id === reviewer) && (!needle || i.userName.toLowerCase().includes(needle)));
  const prog = reviewProgress(d);
  const lowRisk = rows.filter((i) => i.decision === "pending" && !i.flags.length && me && canReview(me.id, i.userId));

  async function save(it: ReviewItemVM, v: { decision?: ReviewDecision; reviewerId?: string }) {
    setBusyRow(it.id);
    try {
      await decide.mutateAsync({ itemId: it.id, version: d.version, ...v });
      toast({ tone: "success", title: fill(c.rowSaved, { name: it.userName }) });
    } catch (e) {
      if (isConflict(e)) setConflict(true);
      else toast({ tone: "danger", title: fill(c.rowFailed, { name: it.userName }), body: errText(e, { last_sysadmin: c.lastSysadmin, self_review: c.selfRow }) });
    } finally { setBusyRow(null); }
  }
  async function keepLow() {
    const ids = lowRisk.filter((i) => !sel.size || sel.has(i.id)).map((i) => i.id);
    if (!ids.length) return toast({ tone: "danger", title: c.bulkNone });
    try {
      await bulk.mutateAsync({ ids, version: d.version });
      setSel(new Set());
      toast({ tone: "success", title: s.states.savedToast, body: fill(c.selected, { n: ids.length }) });
    } catch (e) {
      if (isConflict(e)) setConflict(true);
      else toast({ tone: "danger", title: errText(e, { no_low_risk: c.bulkNone }) });
    }
  }
  const onPick = (it: ReviewItemVM, v: string) => {
    if (v === "role_removed" || v === "suspended") setAsk({ it, decision: v });
    else if (v === "kept") save(it, { decision: "kept" });
  };
  const filtered = !!(risk || role || reviewer || needle);

  return (
    <>
      <header className="mb-4 grid gap-3 bg-info-bg p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="flex items-center gap-2 text-h3"><Icon name="calendar" size={22} aria-hidden className="text-navy-700" />{fill(c.campaignHead, { name: d.name, t: day(d.dueAt, locale), pct: prog.pct })}</h1>
          <CampaignPill status={d.status} />
        </div>
        <Progress pct={prog.pct} label={fill(c.progress, { done: prog.done, total: prog.total })} />
      </header>

      <div className="mb-4 grid gap-3">
        {d.status === "overdue" && d.escalatedTo && (
          <p role="alert" className="flex items-start gap-2 border border-danger/25 bg-danger-bg p-4 text-small m-rise">
            <Icon name="zap" size={16} aria-hidden className="mt-0.5 shrink-0 text-danger" />{fill(c.escalated, { name: d.escalatedTo.name })}
          </p>
        )}
        {conflict && <ConflictBanner by={s.common.system} at={new Date(now || 0).toISOString()} onReload={() => { setConflict(false); onReload(); }} />}
      </div>

      {/* filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <FilterSelect label={c.filters.risk} value={risk} onChange={(v) => setUrlParams({ risk: v || null })}
          options={[{ v: "flagged", l: c.filters.flagged }, { v: "none", l: c.filters.none }, ...(["inactive", "privileged", "sod_waiver", "no_mfa", "never_signed_in"] as const).map((f) => ({ v: f, l: fill(c.flag[f], { n: INACTIVE_DAYS }) }))]} />
        <FilterSelect label={c.filters.role} value={role} onChange={(v) => setUrlParams({ role: v || null })} options={roles.map((r) => ({ v: r, l: label(r) }))} />
        <FilterSelect label={c.filters.reviewer} value={reviewer} onChange={(v) => setUrlParams({ reviewer: v || null })} options={reviewers.map((r) => ({ v: r.id, l: r.name }))} />
        <label className="relative min-w-0 flex-1 basis-48">
          <span className="sr-only">{c.filters.search}</span>
          <Icon name="search" size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
          <Input type="search" defaultValue={p.get("q") ?? ""} placeholder={c.filters.search} className="h-10 pl-9" onChange={(e) => setUrlParams({ q: e.target.value || null })} />
        </label>
        <Button size="sm" disabled={!online || !lowRisk.length} loading={bulk.isPending} onClick={keepLow} title={c.keepLowRiskHint} aria-describedby="klr-hint">
          {c.keepLowRisk}{sel.size > 0 && ` (${sel.size})`}
        </Button>
        <p id="klr-hint" className="sr-only">{c.keepLowRiskHint}</p>
      </div>

      {!rows.length ? (
        <EmptyPanel title={c.noRows} body={c.noRowsBody} action={filtered ? <button type="button" className="text-small font-medium underline underline-offset-4" onClick={() => setUrlParams({ risk: null, role: null, reviewer: null, q: null })}>{c.clearFilters}</button> : undefined} />
      ) : (
        <>
          <p className="mb-2 text-small text-fg-subtle" aria-live="polite">{fill(c.showing, { n: rows.length, total: d.items.length })}</p>
          {/* desktop */}
          <div className="hidden overflow-x-auto border border-border bg-surface lg:block">
            <table className={TABLE}>
              <thead><tr>
                <th className={cx(TH, "w-10")}>
                  <input type="checkbox" aria-label={c.selectAll} className="size-4 accent-navy-700" checked={!!lowRisk.length && lowRisk.every((i) => sel.has(i.id))}
                    onChange={(e) => setSel(e.target.checked ? new Set(lowRisk.map((i) => i.id)) : new Set())} />
                </th>
                <th className={TH}>{c.col.user}</th><th className={TH}>{c.col.role}</th><th className={TH}>{c.col.lastActive}</th>
                <th className={TH}>{c.col.flags}</th><th className={TH}>{c.col.decision}</th><th className={TH}>{c.col.reviewer}</th>
              </tr></thead>
              <tbody>
                {rows.map((it) => {
                  const self = !!me && !canReview(me.id, it.userId);
                  return (
                    <tr key={it.id} className={cx("m-tone", it.decision !== "pending" && "bg-bg-subtle/40")}>
                      <td className={TD}>
                        <input type="checkbox" aria-label={fill(c.selectRow, { name: it.userName })} className="size-4 accent-navy-700" disabled={self || it.decision !== "pending" || !!it.flags.length}
                          checked={sel.has(it.id)} onChange={(e) => setSel((x) => { const n = new Set(x); if (e.target.checked) n.add(it.id); else n.delete(it.id); return n; })} />
                      </td>
                      <td className={TD}><span className="flex items-center gap-2"><Avatar name={it.userName} size="sm" /><span className="font-medium">{it.userName}</span></span></td>
                      <td className={TD}><RoleChip role={it.role} /></td>
                      <td className={cx(TD, "tabular text-fg-muted")}>{it.lastActiveAt ? formatRelative(it.lastActiveAt, locale, now || undefined) : c.flag.never_signed_in}</td>
                      <td className={TD}><Flags flags={it.flags} /></td>
                      <td className={TD}><DecisionCell it={it} self={self} busy={busyRow === it.id} disabled={!online} onPick={(v) => onPick(it, v)} /></td>
                      <td className={TD}><ReviewerCell it={it} reviewers={reviewers} disabled={!online || it.decision !== "pending"} onPick={(rid) => save(it, { reviewerId: rid })} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* phone / tablet: stacked rows */}
          <ul className="grid gap-2 lg:hidden">
            {rows.map((it) => {
              const self = !!me && !canReview(me.id, it.userId);
              return (
                <li key={it.id} className="grid gap-3 border border-border bg-surface p-4 m-tone">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2"><Avatar name={it.userName} size="sm" /><span className="min-w-0"><span className="block truncate font-medium">{it.userName}</span><span className="block text-small text-fg-muted">{it.lastActiveAt ? formatRelative(it.lastActiveAt, locale, now || undefined) : c.flag.never_signed_in}</span></span></span>
                    <RoleChip role={it.role} />
                  </div>
                  <Flags flags={it.flags} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <DecisionCell it={it} self={self} busy={busyRow === it.id} disabled={!online} onPick={(v) => onPick(it, v)} />
                    <ReviewerCell it={it} reviewers={reviewers} disabled={!online || it.decision !== "pending"} onPick={(rid) => save(it, { reviewerId: rid })} />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {prog.done === prog.total && <div className="mt-6"><SignOffPanel d={d} /></div>}

      <Confirm open={!!ask} danger busy={decide.isPending}
        title={ask ? (ask.decision === "role_removed" ? fill(c.removeTitle, { role: label(ask.it.role), name: ask.it.userName }) : fill(c.suspendTitle, { name: ask.it.userName })) : ""}
        body={ask?.decision === "role_removed" ? c.removeBody : c.suspendBody}
        yes={ask?.decision === "role_removed" ? c.removeYes : c.suspendYes}
        onNo={() => setAsk(null)} onYes={async () => { if (ask) { const a = ask; setAsk(null); await save(a.it, { decision: a.decision }); } }} />
    </>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  const c = useC();
  return (
    <label className={cx("inline-flex h-10 items-center gap-1.5 border px-3 text-small", value ? "border-navy-300 bg-navy-50" : "border-border bg-surface")}>
      <span className="text-fg-muted">{label}:</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="max-w-40 bg-transparent font-medium focus:outline-none">
        <option value="">{c.filters.any}</option>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}

const FLAG_TONE: Record<RiskFlag, string> = {
  inactive: "bg-warning-bg text-warning", privileged: "bg-navy-50 text-navy-700", sod_waiver: "bg-navy-50 text-navy-700",
  no_mfa: "bg-danger-bg text-danger", never_signed_in: "bg-warning-bg text-warning",
};
const FLAG_ICON = { inactive: "clock", privileged: "shield", sod_waiver: "layers", no_mfa: "lock", never_signed_in: "user" } as const;
function Flags({ flags }: { flags: RiskFlag[] }) {
  const c = useC();
  if (!flags.length) return <span className="text-fg-subtle">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {flags.map((f) => <span key={f} className={cx("inline-flex h-6 items-center gap-1 px-2 text-eyebrow font-medium whitespace-nowrap", FLAG_TONE[f])}><Icon name={FLAG_ICON[f]} size={11} aria-hidden />{fill(c.flag[f], { n: INACTIVE_DAYS })}</span>)}
    </span>
  );
}

function DecisionCell({ it, self, busy, disabled, onPick }: { it: ReviewItemVM; self: boolean; busy: boolean; disabled: boolean; onPick: (v: string) => void }) {
  const c = useC();
  if (self) return <span className="inline-flex items-center gap-1.5 text-small text-fg-muted"><Icon name="lock" size={13} aria-hidden />{c.selfRow}</span>;
  if (it.decision !== "pending")
    return (
      <span className={cx("inline-flex h-8 items-center gap-1.5 px-3 text-small font-medium m-pop", it.decision === "kept" ? "bg-success-bg text-success" : "bg-danger-bg text-danger")}>
        <Icon name={it.decision === "kept" ? "check" : "x"} size={13} aria-hidden />{c.decided[it.decision]}
      </span>
    );
  return (
    <select aria-label={`${c.col.decision}: ${it.userName}`} value="" disabled={disabled || busy} onChange={(e) => onPick(e.target.value)}
      className={cx("h-9 w-full min-w-32 border border-border-strong bg-surface px-2 text-small", busy && "m-shimmer")}>
      <option value="" disabled>{c.decision.pending}</option>
      <option value="kept">{c.decision.kept}</option>
      <option value="role_removed">{c.decision.role_removed}</option>
      <option value="suspended">{c.decision.suspended}</option>
    </select>
  );
}

function ReviewerCell({ it, reviewers, disabled, onPick }: { it: ReviewItemVM; reviewers: { id: string; name: string }[]; disabled: boolean; onPick: (id: string) => void }) {
  const c = useC();
  return (
    <select aria-label={fill(c.reassignTo, { name: it.userName })} value={it.reviewer.id} disabled={disabled} onChange={(e) => onPick(e.target.value)}
      className="h-9 w-full min-w-32 border border-border bg-surface px-2 text-small">
      {reviewers.filter((r) => r.id !== it.userId).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
    </select>
  );
}

// ---------------------------------------------------------------- AG2 sign-off + completion
function SignOffPanel({ d }: { d: ReviewCampaignVM }) {
  const c = useC();
  const s = useS();
  const { locale } = useI18n();
  const label = useRoleLabel();
  const toast = useToast();
  const errText = useErrText();
  const me = useSession().user;
  const online = useCanMutate();
  const { run, dialog } = useGuarded();
  const sign = useSignOff(d.id);
  const pending = d.items.filter((i) => i.decision === "pending").length;
  const myRole = me?.roles.includes("staff:sysadmin") ? "staff:sysadmin" : me?.roles.includes("staff:executive") ? "staff:executive" : null;
  const signed = !!myRole && d.signOffs.some((x) => x.role === myRole);
  const go = async () => {
    try {
      const r = await run(c.stepUpSignOff, (token) => sign.mutateAsync({ version: d.version, token }));
      if (r) toast({ tone: "success", title: c.signedToast });
    } catch (e) { toast({ tone: "danger", title: errText(e, { items_pending: fill(c.signOffBlocked, { n: pending }) }) }); }
  };
  return (
    <Panel title={c.signOffs}>
      {dialog}
      <ul className="mb-4 grid gap-3 sm:grid-cols-2">
        {(["staff:sysadmin", "staff:executive"] as const).map((r) => {
          const so = d.signOffs.find((x) => x.role === r);
          return (
            <li key={r} className={cx("flex items-center gap-3 border p-3", so ? "border-success/25 bg-success-bg" : "border-dashed border-border-strong")}>
              {so ? <Avatar name={so.by.name} size="sm" /> : <Icon name="clock" size={18} aria-hidden className="text-fg-subtle" />}
              <span className="min-w-0 text-small">
                <span className="block truncate font-medium">{so ? so.by.name : fill(c.needsSignOff, { role: label(r) })}</span>
                <span className="block text-fg-muted">{label(r)}{so && ` · ${formatDate(so.at, locale)}`}</span>
              </span>
              {so && <Icon name="check" size={16} aria-hidden className="ml-auto text-success m-tick" />}
            </li>
          );
        })}
      </ul>
      {myRole && !signed && (
        <Button disabled={!online || pending > 0} loading={sign.isPending} onClick={go}><Icon name="shield" size={15} aria-hidden />{fill(c.signOff, { role: label(myRole) })}</Button>
      )}
      {pending > 0 && <p className="mt-2 text-small text-fg-muted">{fill(c.signOffBlocked, { n: pending })}</p>}
      {!online && <p className="mt-2 text-small text-fg-muted">{s.states.offlineAction}</p>}
    </Panel>
  );
}

function Completion({ d }: { d: ReviewCampaignVM }) {
  const c = useC();
  const { locale } = useI18n();
  const label = useRoleLabel();
  const toast = useToast();
  const errText = useErrText();
  const online = useCanMutate();
  const { run, dialog } = useGuarded();
  const exp = useExportReview(d.id);
  const [ref, setRef] = useState<string | null>(null);
  // shortcut: completed seed campaigns carry no items, so stats fall back to the list row; derive from items once they persist.
  const list = useReviews().data?.items.find((x) => x.id === d.id);
  const stat = d.items.length
    ? { kept: d.items.filter((i) => i.decision === "kept").length, removed: d.items.filter((i) => i.decision === "role_removed").length, suspended: d.items.filter((i) => i.decision === "suspended").length }
    : { kept: list?.kept ?? 0, removed: list?.removed ?? 0, suspended: list?.suspended ?? 0 };
  const doExport = async () => {
    try {
      const r = await run(c.stepUpExport, (token) => exp.mutateAsync(token));
      if (r) { setRef(r.ref); toast({ tone: "success", title: fill(c.exported, { ref: r.ref }) }); }
    } catch (e) { toast({ tone: "danger", title: errText(e) }); }
  };
  return (
    <section className="grid gap-5 border border-border bg-surface p-5 sm:p-7">
      {dialog}
      <header className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-success-bg text-success"><Icon name="check" size={28} aria-hidden className="m-tick" /></span>
        <div><h1 className="text-h2">{c.completeTitle}</h1><p className="text-body text-fg-muted">{fill(c.completeSub, { name: d.name })}</p></div>
      </header>
      <dl className="grid grid-cols-3 gap-3 m-stagger">
        {([["kept", stat.kept], ["removed", stat.removed], ["suspended", stat.suspended]] as const).map(([k, n], i) => (
          <div key={k} style={{ ["--i" as string]: i }} className="border border-border p-4 text-center">
            <dd className="text-h2 tabular">{n}</dd><dt className="text-small text-fg-muted">{c.stats[k]}</dt>
          </div>
        ))}
      </dl>
      <div>
        <h2 className="mb-2 flex items-center gap-2 text-label"><Icon name="check" size={16} aria-hidden className="text-success" />{c.signOffs}</h2>
        <ul className="flex flex-wrap gap-4">
          {d.signOffs.map((so) => (
            <li key={so.role} className="flex items-center gap-2.5"><Avatar name={so.by.name} size="sm" /><span className="text-small"><span className="block font-medium">{so.by.name}</span><span className="text-fg-muted">{label(so.role)}</span></span></li>
          ))}
          {!d.signOffs.length && <li className="text-small text-fg-muted">—</li>}
        </ul>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 text-small text-fg-muted">
        {ref && <span className="inline-flex items-center gap-1.5 m-pop"><Icon name="file" size={14} aria-hidden />{fill(c.exported, { ref })}</span>}
        <span className="inline-flex items-center gap-1.5"><Icon name="calendar" size={14} aria-hidden />{fill(c.nextReview, { t: day(plus3m(d.dueAt), locale) })}</span>
        <Button className="ml-auto" size="sm" disabled={!online} loading={exp.isPending} onClick={doExport}><Icon name="fileCheck" size={15} aria-hidden />{c.exportPdf}</Button>
      </div>
      <ButtonLink href={localHref(locale, "/system/access-reviews")} variant="ghost" size="sm" className="justify-self-start">{c.allReviews}</ButtonLink>
    </section>
  );
}
