"use client";
// U1 Overview `/system` (plan 06 §7 U1, board 03 with §3 fixes): greeting, "Needs you" strip (or the fresh-install
// checklist while setup is incomplete), cards with per-card partial failure (OV3), recent privileged changes, alerts.
// No case content, no money detail beyond channel budgets, no invented metrics (counts and spec targets only).
import type { ReactNode } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { systemOverview } from "@/content/pages/system-overview";
import { fill } from "@/content/pages/system-common";
import { cx, formatDate, formatRelative, TIME_ZONE } from "@/shared/format";
import { errorState, useAlerts, useMarkAlerts, useSetup, useSystemSummary } from "@/lib/system/api";
import { useOverview, type Card, type OverviewVM } from "@/lib/system/a";
import type { AlertVM } from "@/shared/system/types";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Avatar } from "@/components/atoms/misc";
import { Button } from "@/components/atoms/button";
import { HighlightWord } from "@/components/atoms/brand";
import { PanelError } from "@/components/molecules/ops/ops";
import { useNow } from "@/components/atoms/step-up";
import { CategoryChip, HealthPill, LockedContent, useS } from "@/components/atoms/system";
import { BudgetBar, SetupChecklist, resourceHref } from "@/components/molecules/system/system";
import { useAlertsDrawer } from "@/components/organisms/layout/system-shell";

const useC = () => systemOverview(useI18n().locale);
const hhmm = (v: string | number, l: Parameters<typeof formatDate>[1]) => formatDate(v, l, { timeStyle: "short" });
const LINK = "inline-flex min-h-9 items-center gap-1.5 text-small font-medium text-link underline-offset-4 hover:underline";

export function OverviewView() {
  const c = useC();
  const s = useS();
  const { locale } = useI18n();
  const now = useNow(30_000);
  const q = useOverview();
  const sum = useSystemSummary();
  const setup = useSetup();
  const me = useSession().user;
  const name = (sum.data?.me.name ?? me?.name ?? "").split(" ")[0];

  if (q.isError && !q.data) {
    if (errorState(q.error) === "locked") return <LockedContent reason="role" />;
    return <div className="grid gap-6"><Greeting name={name} now={now} /><PanelError what={c.overview} onRetry={() => q.refetch()} /></div>;
  }

  const incomplete = setup.data?.items.some((i) => !i.done);
  const stale = !!now && !!q.dataUpdatedAt && now - q.dataUpdatedAt > 60_000;
  const d = q.data;

  return (
    <div className="grid gap-5" aria-busy={q.isPending}>
      <header className="flex flex-wrap items-end justify-between gap-3 m-rise">
        <div className="min-w-0">
          <Greeting name={name} now={now} />
          <p className="mt-1 text-body text-fg-muted">{c.sub}</p>
        </div>
        {q.dataUpdatedAt > 0 && (
          <p className={cx("flex items-center gap-2 text-small tabular", stale ? "text-warning" : "text-fg-subtle")}>
            {fill(c.updated, { t: hhmm(q.dataUpdatedAt, locale) })}
            <Button size="sm" variant="ghost" onClick={() => { q.refetch(); sum.refetch(); }} loading={q.isFetching}>
              <Icon name="refresh" size={14} aria-hidden />{s.states.refresh}
            </Button>
          </p>
        )}
      </header>

      {incomplete && setup.data ? <SetupChecklist items={setup.data.items} /> : <NeedsYou d={d} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 m-stagger">
        <HealthCard card={d?.health} onRetry={() => q.refetch()} i={0} />
        <ApprovalsCard n={sum.data?.approvals} i={1} />
        <OvCard title={c.users.title} icon="users" card={d?.users} href="/system/users" link={c.users.link} i={2}>
          {(u) => (
            <div className="grid gap-3">
              <p className="flex items-baseline gap-2"><span className="text-h2 tabular">{u.active}</span><span className="text-small text-fg-muted">{c.users.active}</span></p>
              <dl className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-small">
                <Stat n={u.invited} label={c.users.invited} />
                <Stat n={u.locked} label={c.users.locked} tone={u.locked ? "text-danger" : undefined} />
              </dl>
            </div>
          )}
        </OvCard>
        <OvCard title={c.posture.title} icon="shield" card={d?.posture} href="/system/ops?tab=security" link={c.posture.link} i={3}>
          {(p) => (
            <div className="grid gap-2 text-small">
              <p className="text-fg-muted">{c.posture.mfa}</p>
              <p className="text-h3 tabular">{fill(c.posture.of, { n: p.enrolled, total: p.total })}</p>
              {p.pendingFirst > 0 && <p className="text-fg-muted">{fill(c.posture.pending, { n: p.pendingFirst })}</p>}
              <p className="border-t border-border pt-2">{fill(c.posture.noKey, { n: p.withoutKey })}</p>
              <p className={cx("flex items-center gap-1.5", p.ipAllowlist ? "text-success" : "text-warning")}>
                <Icon name={p.ipAllowlist ? "check" : "clock"} size={14} aria-hidden />{p.ipAllowlist ? c.posture.ipOn : c.posture.ipOff}
              </p>
            </div>
          )}
        </OvCard>
        <OvCard title={c.backup.title} icon="layers" card={d?.backup} href="/system/ops?tab=backups" link={c.backup.link} i={4}>
          {(b) => (
            <div className="grid gap-2 text-small">
              {b.lastAt ? (
                <p className="flex items-center gap-2 text-h3 tabular">
                  {hhmm(b.lastAt, locale)}
                  <Icon name={b.ok ? "check" : "x"} size={20} aria-label={b.ok ? s.posture.pass : s.posture.fail} className={b.ok ? "text-success" : "text-danger"} />
                </p>
              ) : <p className="text-fg-muted"></p>}
              {!b.ok && b.lastAt && <p className="font-medium text-danger">{c.backup.failed}</p>}
              {b.nextAt && <p className="text-fg-muted">{fill(c.backup.next, { t: hhmm(b.nextAt, locale) })}</p>}
              <p className="border-t border-border pt-2 text-fg-muted">{b.drillAt ? fill(c.backup.drill, { t: formatDate(b.drillAt, locale) }) : c.backup.noDrill}</p>
            </div>
          )}
        </OvCard>
        <OvCard title={c.integrations.title} icon="zap" card={d?.integrations} href="/system/integrations" link={c.integrations.link} i={5}>
          {(x) => (
            <ul className="grid gap-1.5 text-small">
              <li className="flex items-center gap-2"><Dot cls="bg-success" />{fill(c.integrations.ok, { n: x.ok })}</li>
              <li className={cx("flex items-center gap-2", x.degraded > 0 && "font-medium text-warning")}><Dot cls="bg-warning" />{fill(c.integrations.degraded, { n: x.degraded })}</li>
              <li className="flex items-center gap-2"><Dot cls="bg-ink-400" />{fill(c.integrations.untested, { n: x.untested })}</li>
              <li className="flex items-center gap-2 text-fg-muted"><Dot cls="border border-border-strong" />{fill(c.integrations.notSetUp, { n: x.notSetUp })}</li>
            </ul>
          )}
        </OvCard>
        <ReviewCard card={d?.review} i={6} />
        <OvCard title={c.budgets.title} icon="chart" card={d?.budgets} href="/system/notifications?tab=costs" link={c.budgets.link} i={7}>
          {(bs) => <div className="grid gap-3">{bs.map((b) => <BudgetBar key={b.channel} label={c.budgets[b.channel]} spent={b.spent} budget={b.budget} />)}</div>}
        </OvCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <RecentCard card={d?.recent} now={now} />
        <AlertsCard now={now} />
      </div>
    </div>
  );
}

function Greeting({ name, now }: { name: string; now: number }) {
  const c = useC();
  const h = now ? Number(new Intl.DateTimeFormat("en", { hour: "numeric", hourCycle: "h23", timeZone: TIME_ZONE }).format(now)) : 9;
  const tpl = h < 12 ? c.greeting.morning : h < 18 ? c.greeting.afternoon : c.greeting.evening;
  const [pre, post] = tpl.split("{name}");
  return <h1 className="text-h2">{pre}{name ? <HighlightWord>{name}</HighlightWord> : null}{post}</h1>;
}

const Dot = ({ cls }: { cls: string }) => <span aria-hidden className={cx("size-2 shrink-0 rounded-full", cls)} />;
const Stat = ({ n, label, tone }: { n: number; label: string; tone?: string }) => (
  <div><dt className="sr-only">{label}</dt><dd className={cx("flex items-baseline gap-1.5", tone)}><span className="text-label-lg tabular">{n}</span><span className="text-fg-muted">{label}</span></dd></div>
);

// ---------------------------------------------------------------- "Needs you" strip
function NeedsYou({ d }: { d?: OverviewVM }) {
  const c = useC();
  const { locale } = useI18n();
  const sum = useSystemSummary().data;
  if (!sum) return <div aria-hidden className="h-14 m-shimmer" />;
  const review = d?.review.data;
  const items: { label: string; href: string }[] = [
    ...(sum.approvals ? [{ label: fill(c.needs.approvals, { n: sum.approvals }), href: "/system/approvals" }] : []),
    ...(sum.degraded ? [{ label: fill(c.needs.degraded, { n: sum.degraded }), href: "/system/integrations?health=degraded" }] : []),
    ...(sum.untested ? [{ label: fill(c.needs.untested, { n: sum.untested }), href: "/system/integrations?health=untested" }] : []),
    ...(review && sum.reviewsDue ? [{ label: fill(c.needs.review, { t: formatDate(review.dueAt, locale, { day: "numeric", month: "short" }) }), href: `/system/access-reviews/${review.id}` }] : []),
  ];
  if (!items.length)
    return (
      <p role="status" className="flex items-center gap-2 border border-success/25 bg-success-bg px-4 py-3 text-small text-success m-rise">
        <Icon name="check" size={16} aria-hidden />{c.needs.clear}
      </p>
    );
  return (
    <nav aria-label={c.needs.label} className="flex flex-wrap items-center gap-x-1 gap-y-2 border border-warning/30 bg-warning-bg px-4 py-3 text-small m-rise">
      <span className="mr-1 flex items-center gap-2 font-medium"><Icon name="zap" size={16} aria-hidden className="text-warning" />{c.needs.label}:</span>
      {items.map((it, i) => (
        <span key={it.href} className="flex items-center">
          {i > 0 && <span aria-hidden className="mx-1.5 text-fg-subtle">·</span>}
          <Link href={localHref(locale, it.href)} className="inline-flex min-h-8 items-center px-1.5 font-medium underline decoration-warning/50 underline-offset-4 hover:decoration-fg m-press">{it.label}</Link>
        </span>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------- card shell with OV3 partial failure
function OvCard<T>({ title, icon, card, href, link, i, children, onRetry, className }: {
  title: string; icon: IconName; card?: Card<T>; href?: string; link?: string; i: number; children: (d: T) => ReactNode; onRetry?: () => void; className?: string;
}) {
  const { locale } = useI18n();
  const s = useS().states;
  const c = useC();
  return (
    <section style={{ ["--i" as string]: i }} aria-busy={!card} className={cx("flex min-w-0 flex-col gap-3 border border-border bg-surface p-4 sm:p-5", className)}>
      <h2 className="flex items-center gap-2 text-label-lg"><Icon name={icon} size={18} aria-hidden className="text-navy-700" />{title}</h2>
      {!card ? (
        <div aria-hidden className="grid gap-2"><div className="h-8 w-1/2 m-shimmer" /><div className="h-4 m-shimmer" /><div className="h-4 w-3/4 m-shimmer" /></div>
      ) : (
        <>
          {!card.ok && (
            <div role="alert" className="grid gap-2 border border-danger/25 bg-danger-bg p-3 text-small m-rise">
              <p className="flex items-start gap-2 font-medium text-danger">
                <Icon name="x" size={15} aria-hidden className="mt-0.5 shrink-0" />
                {card.at ? fill(s.lastKnown, { what: c.monitoring, t: hhmm(card.at, locale) }) : fill(s.loadFailed, { what: c.monitoring })}
              </p>
              {onRetry && <Button size="sm" variant="outline" className="justify-self-start" onClick={onRetry}>{s.retry}</Button>}
            </div>
          )}
          {card.data !== null && <div className={cx("flex-1", !card.ok && "opacity-60")}>{children(card.data)}</div>}
        </>
      )}
      {href && link && <Link href={localHref(locale, href)} className={cx(LINK, "mt-auto self-start")}>{link}<Icon name="arrowRight" size={14} aria-hidden /></Link>}
    </section>
  );
}

function HealthCard({ card, onRetry, i }: { card?: OverviewVM["health"]; onRetry: () => void; i: number }) {
  const c = useC();
  return (
    <OvCard title={c.health.title} icon="sparkle" card={card} href="/system/ops?tab=monitoring" link={c.health.link} i={i} onRetry={onRetry} className="max-md:order-first">
      {(cs) => {
        const bad = cs.filter((x) => x.health !== "operational");
        return (
          <div className="grid gap-3">
            <p className={cx("text-label-lg", bad.length ? "text-warning" : "text-success")}>{bad.length ? fill(c.health.some, { n: bad.length }) : c.health.all}</p>
            <ul className="grid gap-1.5">
              {cs.map((x) => (
                <li key={x.key} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-small">
                  <span className="min-w-0">{x.name}{x.detail && <span className="block text-eyebrow text-fg-muted">{x.detail}</span>}</span>
                  <HealthPill health={x.health} />
                </li>
              ))}
            </ul>
          </div>
        );
      }}
    </OvCard>
  );
}

function ApprovalsCard({ n, i }: { n?: number; i: number }) {
  const c = useC();
  const { locale } = useI18n();
  return (
    <Link href={localHref(locale, "/system/approvals")} style={{ ["--i" as string]: i }}
      className="flex min-w-0 flex-col gap-3 border border-border bg-surface p-4 sm:p-5 m-lift max-md:order-first focus-visible:outline-2 focus-visible:outline-focus">
      <span className="flex items-center gap-2 text-label-lg"><Icon name="fileCheck" size={18} aria-hidden className="text-navy-700" />{c.approvalsCard.title}</span>
      {n === undefined ? <span aria-hidden className="h-8 w-1/2 m-shimmer" /> : (
        <span className="flex items-baseline gap-2">
          <span className={cx("text-h2 tabular", n > 0 && "text-link")}>{n}</span>
          <span className="text-small text-fg-muted">{n ? c.state.proposed : c.approvalsCard.none}</span>
        </span>
      )}
      <span className={cx(LINK, "mt-auto")}>{c.approvals}<Icon name="arrowRight" size={14} aria-hidden /></span>
    </Link>
  );
}

function ReviewCard({ card, i }: { card?: OverviewVM["review"]; i: number }) {
  const c = useC();
  const { locale } = useI18n();
  const r = card?.ok ? card.data : null;
  return (
    <OvCard title={c.review.title} icon="calendar" card={card} href={r ? `/system/access-reviews/${r.id}` : "/system/access-reviews"} link={c.review.link} i={i}>
      {(rv) => {
        if (!rv) return <p className="text-small text-fg-muted">{c.review.none}</p>;
        const pct = Math.round((rv.decided / Math.max(1, rv.total)) * 100);
        return (
          <div className="grid gap-2 text-small">
            <p className="font-medium">{rv.name}</p>
            <div role="progressbar" aria-label={rv.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-2 overflow-hidden bg-ink-100">
              <div className="h-full origin-left bg-navy-700 m-grow" style={{ width: `${pct}%` }} />
            </div>
            <p className="flex flex-wrap justify-between gap-2 tabular">
              <span>{fill(c.review.progress, { pct })}</span>
              <span className={rv.status === "overdue" ? "font-medium text-danger" : "text-fg-muted"}>{fill(rv.status === "overdue" ? c.review.overdue : c.review.due, { t: formatDate(rv.dueAt, locale) })}</span>
            </p>
          </div>
        );
      }}
    </OvCard>
  );
}

function RecentCard({ card, now }: { card?: OverviewVM["recent"]; now: number }) {
  const c = useC();
  const { locale } = useI18n();
  return (
    <OvCard title={c.recent.title} icon="lock" card={card} href="/system/audit?privileged=1" link={c.recent.link} i={0}>
      {(rows) => rows.length ? (
        <ul className="divide-y divide-border">
          {rows.map((e) => {
            const href = resourceHref(e.resourceType, e.resourceId);
            const res = `${e.resourceType}:${e.resourceId}`;
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-small">
                <Avatar name={e.actorLabel} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{e.actorLabel} <span className="font-mono text-[0.78rem] font-normal text-fg-muted">{e.action}</span></span>
                  <span className="block truncate font-mono text-[0.75rem] text-fg-subtle">
                    {href ? <Link href={localHref(locale, href)} className="underline-offset-4 hover:underline">{res}</Link> : res}
                  </span>
                </span>
                <CategoryChip category={e.category} />
                <time dateTime={e.at} className="text-eyebrow text-fg-subtle tabular">{now ? formatRelative(e.at, locale, now) : formatDate(e.at, locale)}</time>
              </li>
            );
          })}
        </ul>
      ) : <p className="py-4 text-small text-fg-muted">{c.recent.empty}</p>}
    </OvCard>
  );
}

const TONE: Record<AlertVM["tone"], string> = { danger: "bg-danger", warning: "bg-warning", success: "bg-success", info: "bg-info" };
function AlertsCard({ now }: { now: number }) {
  const c = useC();
  const s = useS().states;
  const { locale } = useI18n();
  const q = useAlerts();
  const mark = useMarkAlerts();
  const drawer = useAlertsDrawer();
  const items = (q.data?.items ?? []).filter((a) => !a.read).slice(0, 4);
  return (
    <section aria-busy={q.isPending} className="flex min-w-0 flex-col gap-3 border border-border bg-surface p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-label-lg"><Icon name="megaphone" size={18} aria-hidden className="text-navy-700" />{c.alerts.title}</h2>
      {q.isPending ? <div aria-hidden className="grid gap-2">{[0, 1, 2].map((k) => <div key={k} className="h-10 m-shimmer" />)}</div>
        : q.isError ? (
          <div role="alert" className="grid justify-items-start gap-2 text-small"><p className="text-danger">{fill(s.loadFailed, { what: c.alerts.title.toLowerCase() })}</p><Button size="sm" variant="outline" onClick={() => q.refetch()}>{s.retry}</Button></div>
        ) : items.length ? (
          <ul className="grid gap-1">
            {items.map((a) => (
              <li key={a.id}>
                <Link href={localHref(locale, a.href)} onClick={() => mark.mutate([a.id])} className="flex items-start gap-3 px-2 py-2 hover:bg-navy-50">
                  <span aria-hidden className={cx("mt-1.5 size-2 shrink-0 rounded-full", TONE[a.tone])} />
                  <span className="min-w-0 flex-1 text-small"><span className="block font-medium">{a.title}</span>{a.detail && <span className="block truncate text-fg-muted">{a.detail}</span>}</span>
                  <time dateTime={a.at} className="text-eyebrow text-fg-subtle tabular">{now ? formatRelative(a.at, locale, now) : ""}</time>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="flex items-center gap-2 py-3 text-small text-fg-muted"><Icon name="check" size={15} aria-hidden className="text-success" />{c.alerts.empty}</p>}
      <button type="button" onClick={drawer.open} className={cx(LINK, "mt-auto self-start")}>{c.alerts.link}<Icon name="arrowRight" size={14} aria-hidden /></button>
    </section>
  );
}
