"use client";
import { useWs } from "@/lib/agent/ws";
// U3 Today (/agent), board 04: TD1 busy, TD2 empty new agent, TD3 loading + per-panel error, TD4 Away/leave
// (shell banner + paused strip), PT1 phone (offer carousel, stacked work cards). Live: a new offer rises into the strip
// and is announced. Keyboard: J/K move through work rows, Enter opens the case.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDate, formatMoney } from "@/shared/format";
import { fill } from "@/content/pages/agent-common";
import { opsCommon } from "@/content/pages/ops-common";
import { agentToday } from "@/content/pages/agent-today";
import { useSummary, useMyCases, type AgentCaseVM } from "@/lib/agent/api";
import { useEarnings } from "@/lib/agent/e";
import { rowAction, ACTION_TAB } from "@/shared/agent/core";
import {
  useStripOffers,
  useCalendar,
  useMetrics,
  workGroups,
  eventKind,
  TODAY_GROUPS,
  type StripOffer,
} from "@/lib/agent/a";
import { useShortcut } from "@/lib/ops/shortcuts";
import { Icon } from "@/components/atoms/icon";
import { Button, ButtonLink } from "@/components/atoms/button";
import { useToast } from "@/components/atoms/toast";
import { SlaChip, Kbd, Sparkline } from "@/components/atoms/ops";
import { Panel, PanelError, EmptyPanel } from "@/components/molecules/ops/ops";
import {
  useA,
  useNow,
  Countdown,
  ClearanceBar,
  Group,
  EventDot,
  SkeletonRows,

} from "@/components/atoms/agent";

const TONE = { overdue: "danger", today: "warning", week: "info" } as const;
const PAUSED = new Set([
  "awaiting_client_documents",
  "awaiting_external_institution",
  "awaiting_internal_review",
]);

export const useT = () => agentToday(useI18n().locale);

export function TodayView() {
  const t = useT();
  const a = useA();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const L = (p: string) => localHref(locale, wsHref(p));
  const now = useNow();
  const summary = useSummary();
  const s = summary.data;
  const cleared = !s || s.clearance === "cleared";
  const paused = !!s && (s.duty === "away" || s.onLeaveNow);
  const hour = now === null ? 9 : new Date(now).getHours();
  const hello = hour < 12 ? t.morning : hour < 18 ? t.afternoon : t.evening;
  const first = s?.me.name.split(" ")[0];

  return (
    <div className="pb-24 lg:pb-8">
      <header className="mb-5 flex flex-wrap items-end gap-3 m-rise">
        <div className="min-w-0 flex-1">
          <h1 className="text-h3">
            {hello}{" "}
            {first ? (
              <mark className="bg-navy-100 px-1.5 text-fg">
                {first}
              </mark>
            ) : (
              <span
                aria-hidden
                className="inline-block h-7 w-20 align-middle m-shimmer"
              />
            )}
          </h1>
          <p className="mt-1 text-body text-fg-muted">
            {now === null
              ? " "
              : formatDate(now, locale, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
          </p>
        </div>
      </header>

      {s && !cleared && (
        <div className="mb-5">
          <ClearanceBar
            state={s.clearance}
            manager={s.me.manager}
            action={
              <ButtonLink
                size="sm"
                variant="primary"
                href={L("/agent/onboarding")}
              >
                {s.clearance === "changes_requested"
                  ? a.clearance.review
                  : a.clearance.continue}
              </ButtonLink>
            }
          />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 content-start gap-5">
          <OfferStrip cleared={cleared} paused={paused} />
          <MyWork />
        </div>
        <aside
          className="grid min-w-0 content-start gap-5"
          aria-label={t.title}
        >
          <Messages />
          <CalendarStrip />
          <Kpis />
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- offers strip
function OfferStrip({
  cleared,
  paused,
}: {
  cleared: boolean;
  paused: boolean;
}) {
  const t = useT();
  const a = useA();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const q = useStripOffers(cleared);
  const offers = q.data;
  // Live arrival: compare against the previous id list during render (no effect), mark new ones + announce.
  const ids = offers?.map((o) => o.id).join(",");
  const [prev, setPrev] = useState(ids);
  const [fresh, setFresh] = useState<string[]>([]);
  if (ids !== prev) {
    setPrev(ids);
    if (prev !== undefined && ids) {
      const old = new Set(prev.split(","));
      setFresh(ids.split(",").filter((i) => !old.has(i)));
    }
  }
  const announced = offers?.find((o) => o.id === fresh[0]);

  const head = (
    <div className="flex items-center gap-2">
      <Icon name="sparkle"size={18} aria-hidden className="text-navy-700" />
      <h2 className="text-label">
        {!cleared || !offers?.length
          ? a.nav.offers
          : offers.length === 1
            ? t.offers.one
            : fill(t.offers.title, { n: offers.length })}
      </h2>
      <Link
        href={localHref(locale, wsHref("/agent/offers"))}
        className="ml-auto inline-flex items-center gap-1 text-small text-navy-800 hover:underline"
      >
        {a.common.viewAll} <Icon name="arrowRight" size={14} aria-hidden />
      </Link>
    </div>
  );

  let body;
  if (!cleared)
    body = <p className="text-small text-fg-muted">{t.offers.notCleared}</p>;
  else if (q.isPending) body = <SkeletonRows n={1} className="h-24" />;
  else if (q.error)
    body = <PanelError what={t.offers.what} onRetry={() => q.refetch()} />;
  else if (!offers?.length)
    body = (
      <p className="text-small text-fg-muted">
        {t.offers.none} — {t.offers.noneBody}
      </p>
    );
  else
    body = (
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-3">
        {offers.map((o, i) => (
          <OfferCard
            key={o.id}
            o={o}
            paused={paused}
            fresh={fresh.includes(o.id)}
            i={i}
          />
        ))}
      </ul>
    );

  return (
    <section
      aria-label={a.nav.offers}
      className={cx(
        " p-4 m-rise",
        cleared && offers?.length
          ? "bg-warning-bg"
          : "border border-border bg-white",
      )}
    >
      {head}
      {paused && cleared && (
        <p className="mt-2 text-small text-warning">{t.offers.paused}</p>
      )}
      <div className="mt-3">{body}</div>
      <p aria-live="polite"className="sr-only">
        {announced
          ? fill(t.offers.arrived, {
              s: announced.service,
              c: announced.client,
            })
          : ""}
      </p>
    </section>
  );
}

function OfferCard({
  o,
  paused,
  fresh,
  i,
}: {
  o: StripOffer;
  paused: boolean;
  fresh: boolean;
  i: number;
}) {
  const t = useT();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const href = (act: string) =>
    localHref(
      locale,
      wsHref(`/agent/offers?offer=${encodeURIComponent(o.id)}&act=${act}`),
    );
  return (
    <li
      className={cx(
        "grid w-[85%] shrink-0 snap-start gap-2 border border-border bg-white p-3 sm:w-auto",
        fresh ? "m-rise" : "m-stagger",
      )}
      style={{ ["--i" as string]: i }}
    >
      <div className="flex items-start gap-2">
        <Icon
          name="file"
          size={18}
          aria-hidden
          className="mt-0.5 text-navy-700"
        />
        <div className="min-w-0">
          <p className="truncate text-small font-medium">{o.service}</p>
          <p className="truncate text-small text-fg-muted">{o.client}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Countdown to={o.expiresAt} kind="respond" />
        <span className="text-small text-fg-muted tabular">
          {fill(t.offers.share, { v: formatMoney(o.share, "RWF", locale) })}
        </span>
      </div>
      <div className="flex gap-2">
        {paused ? (
          <Button
            size="sm"
            disabled
            title={t.offers.paused}
            className="flex-1 justify-center"
          >
            {t.offers.accept}
          </Button>
        ) : (
          <ButtonLink
            size="sm"
            href={href("accept")}
            className="flex-1 justify-center"
            aria-label={`${t.offers.accept} — ${o.service}, ${o.client}`}
          >
            {t.offers.accept}
          </ButtonLink>
        )}
        <ButtonLink
          size="sm"
          variant="outline"
          href={href("decline")}
          className="flex-1 justify-center"
          aria-label={`${t.offers.decline} — ${o.service}, ${o.client}`}
        >
          {t.offers.decline}
        </ButtonLink>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------- my work
export function MyWork() {
  const t = useT();
  const a = useA();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const router = useRouter();
  const now = useNow();
  const q = useMyCases();
  const [focus, setFocus] = useState(-1);
  const groups = q.data && now !== null ? workGroups(q.data, now) : null;
  const flat = groups ? TODAY_GROUPS.flatMap((g) => groups.get(g) ?? []) : [];
  const activeRef = focus >= 0 && focus < flat.length ? flat[focus].ref : null;
  const hrefOf = (c: AgentCaseVM) =>
    localHref(locale, wsHref(`/agent/cases/${c.ref}?tab=${ACTION_TAB[rowAction(c)]}`));
  const move = (d: number) => {
    if (!flat.length) return;
    const n = Math.max(0, Math.min(flat.length - 1, focus + d));
    setFocus(n);
    document.getElementById(`wr-${flat[n].ref}`)?.focus();
  };
  useShortcut("j", t.work.next, () => move(1), "list", flat.length > 0);
  useShortcut("k", t.work.prev, () => move(-1), "list", flat.length > 0);
  useShortcut(
    "enter",
    t.work.open,
    () => {
      const c = flat[focus];
      if (c) router.push(hrefOf(c));
    },
    "list",
    focus >= 0,
  );

  let body;
  if (q.isPending || (q.data && now === null)) body = <SkeletonRows n={5} />;
  else if (q.error)
    body = <PanelError what={t.work.what} onRetry={() => q.refetch()} />;
  else if (!q.data?.length)
    body = (
      <EmptyPanel
        title={t.work.empty}
        body={t.work.emptyBody}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <ButtonLink
              dots
              size="sm"
              href={localHref(locale, wsHref("/agent/profile/skills"))}
            >
              {t.work.skills}
            </ButtonLink>
            <ButtonLink
              size="sm"
              variant="outline"
              href={localHref(locale, wsHref("/agent/profile/availability"))}
            >
              {t.work.availability}
            </ButtonLink>
          </div>
        }
      />
    );
  else if (!flat.length) body = <EmptyPanel compact title={t.work.allClear} />;
  else
    body = (
      <div className="grid gap-1">
        {TODAY_GROUPS.map((g) => {
          const rows = groups?.get(g) ?? [];
          if (!rows.length) return null;
          return (
            <Group
              key={g}
              id={g}
              label={a.groups[g]}
              count={rows.length}
              tone={g in TONE ? TONE[g as keyof typeof TONE] : "neutral"}
            >
              <ul className="grid">
                {rows.map((c, i) => (
                  <WorkRow
                    key={c.ref}
                    c={c}
                    i={i}
                    href={hrefOf(c)}
                    active={activeRef === c.ref}
                    onFocus={() => setFocus(flat.indexOf(c))}
                  />
                ))}
              </ul>
            </Group>
          );
        })}
      </div>
    );

  return (
    <Panel
      className="m-rise"
      title={t.work.title}
      action={
        <span className="flex items-center gap-3">
          <span className="hidden items-center gap-1 text-eyebrow text-fg-subtle lg:inline-flex">
            <Kbd>J</Kbd>
            <Kbd>K</Kbd>
            <Kbd>↵</Kbd>
            <span className="sr-only">{t.work.keys}</span>
          </span>
          <Link
            href={localHref(locale, wsHref("/agent/cases"))}
            className="inline-flex items-center gap-1 text-small text-navy-800 hover:underline"
          >
            {a.common.viewAll} <Icon name="arrowRight" size={14} aria-hidden />
          </Link>
        </span>
      }
    >
      {body}
    </Panel>
  );
}

function WorkRow({
  c,
  i,
  href,
  active,
  onFocus,
}: {
  c: AgentCaseVM;
  i: number;
  href: string;
  active: boolean;
  onFocus: () => void;
}) {
  const a = useA();
  const t = useT();
  const act = rowAction(c);
  const status = opsCommon(useI18n().locale).status[c.status];
  return (
    <li
      className={cx(
        "relative flex flex-wrap items-center gap-x-3 gap-y-2 px-2 py-2.5 m-stagger hover:bg-bg-subtle",
        active && "bg-tint",
      )}
      style={{ ["--i" as string]: i }}
    >
      <div className="min-w-0 flex-1 basis-56">
        <p className="flex min-w-0 items-baseline gap-2 text-small">
          <Link
            id={`wr-${c.ref}`}
            href={href}
            onFocus={onFocus}
            className="shrink-0 font-medium tabular after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-focus"
          >
            {c.ref}
          </Link>
          <span className="min-w-0 truncate">{c.service}</span>
        </p>
        <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-eyebrow text-fg-muted">
          <span className="min-w-0 truncate">{c.client}</span>
          <span aria-hidden>·</span>
          <span className="bg-ink-100 px-2 font-medium text-fg">
            {status}
          </span>
          {c.unread > 0 && (
            <span className="inline-flex items-center gap-1 bg-secondary px-1.5 text-white tabular">
              <Icon name="message" size={11} aria-hidden />
              {c.unread}
              <span className="sr-only">
                {fill(t.cases.unread, { n: c.unread })}
              </span>
            </span>
          )}
        </p>
      </div>
      <SlaChip due={c.dueAt} paused={PAUSED.has(c.status)} />
      <ButtonLink
        size="sm"
        variant={act === "view" || act === "track" ? "outline" : "primary"}
        href={href}
        className="relative z-10 h-8 min-w-20 justify-center"
      >
        {a.actions[act]}
      </ButtonLink>
    </li>
  );
}

// ---------------------------------------------------------------- right column
export function Messages() {
  const t = useT();
  const a = useA();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const q = useMyCases();
  const rows = (q.data ?? []).filter((c) => c.unread > 0);
  const total = rows.reduce((s, c) => s + c.unread, 0);
  return (
    <Panel
      className="m-rise"
      title={
        <>
          {t.messages.title}
          {total > 0 && (
            <span className="ml-1.5 text-fg-subtle tabular">({total})</span>
          )}
        </>
      }
      action={
        <Link
          href={localHref(locale, wsHref("/agent/inbox"))}
          className="text-small text-navy-800 hover:underline"
        >
          {a.common.viewAll}
        </Link>
      }
    >
      {q.isPending ? (
        <SkeletonRows n={3} />
      ) : q.error ? (
        <PanelError what={t.messages.what} onRetry={() => q.refetch()} />
      ) : !rows.length ? (
        <p className="text-small text-fg-muted">{t.messages.none}</p>
      ) : (
        <ul className="grid gap-1">
          {rows.map((c, i) => (
            <li
              key={c.ref}
              className="m-stagger"
              style={{ ["--i" as string]: i }}
            >
              <Link
                href={localHref(locale, wsHref(`/agent/inbox?thread=${c.ref}`))}
                className="flex items-center gap-3 px-2 py-2 hover:bg-bg-subtle"
              >
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-tint text-eyebrow font-semibold text-navy-800"
                >
                  {c.client
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-small font-medium">
                    {c.client}
                  </span>
                  <span className="block truncate text-eyebrow text-fg-muted">
                    {c.ref} · {c.service}
                  </span>
                </span>
                <span className="bg-secondary px-2 text-eyebrow text-white tabular">
                  {c.unread}
                  <span className="sr-only">
                    {" "}
                    {fill(t.messages.count, { n: c.unread })}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function CalendarStrip() {
  const t = useT();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const now = useNow();
  const q = useCalendar();
  const next =
    now === null
      ? []
      : (q.data?.items ?? [])
          .filter((i) => Date.parse(i.dueAt ?? i.dueDate) >= now)
          .slice(0, 3);
  return (
    <Panel
      className="m-rise"
      title={t.calendar.title}
      action={
        <Link
          href={localHref(locale, wsHref("/agent/calendar"))}
          className="text-small text-navy-800 hover:underline"
        >
          {t.calendar.open}
        </Link>
      }
    >
      {q.isPending || now === null ? (
        <SkeletonRows n={3} />
      ) : q.error ? (
        <PanelError what={t.calendar.what} onRetry={() => q.refetch()} />
      ) : !next.length ? (
        <p className="text-small text-fg-muted">{t.calendar.none}</p>
      ) : (
        <ul className="grid gap-1">
          {next.map((e, i) => {
            const when = e.dueAt ?? e.dueDate;
            return (
              <li
                key={e.id}
                className="m-stagger"
                style={{ ["--i" as string]: i }}
              >
                <Link
                  href={localHref(locale, wsHref(`/agent/calendar?event=${e.id}`))}
                  className="flex items-start gap-3 px-2 py-2 hover:bg-bg-subtle"
                >
                  <span className="w-14 shrink-0 text-eyebrow text-fg-muted tabular">
                    {formatDate(when, locale, {
                      weekday: "short",
                      day: "numeric",
                    })}
                    <span className="block">
                      {eventKind(e) === "deadline" ||
                      eventKind(e) === "obligation"
                        ? t.calendar.due
                        : formatDate(when, locale, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                    </span>
                  </span>
                  <span className="mt-1.5">
                    <EventDot kind={eventKind(e)} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-small font-medium">
                      {e.title}
                    </span>
                    <span className="block truncate text-eyebrow text-fg-muted">
                      {[e.code, e.note ?? e.clientName]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function Kpis() {
  const t = useT();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const q = useMetrics();
  const m = q.data;
  // F-RPT-09: earnings this month (paid + scheduled + pending, before deductions) from the earnings API.
  const e = useEarnings("").data;
  const bar = e?.months.find((b) => b.month === e.month);
  if (q.error)
    return <PanelError what={t.kpi.what} onRetry={() => q.refetch()} />;
  if (!m) return <SkeletonRows n={1} className="h-24" />;
  return (
    <Link
      href={localHref(locale, wsHref("/agent/performance"))}
      className="grid gap-3 border border-border bg-white p-4 m-rise m-lift"
    >
      <span className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <span>
          <span className="block text-eyebrow text-fg-muted">
            {t.kpi.onTime}
          </span>
          <span className="text-card-title tabular">{m.onTimeSLAPercent}%</span>
        </span>
        <span>
          <span className="block text-eyebrow text-fg-muted">
            {t.kpi.rating}
          </span>
          <span className="inline-flex items-center gap-1 text-card-title tabular">
            {m.clientRating.toFixed(1)}
            <span aria-hidden className="text-warning">
              ★
            </span>
          </span>
        </span>
        <span>
          <span className="block text-eyebrow text-fg-muted">
            {t.kpi.cases}
          </span>
          <span className="text-card-title tabular">{m.completedCount}</span>
        </span>
        <span>
          <span className="block text-eyebrow text-fg-muted">
            {t.kpi.earnings}
          </span>
          <span className="text-card-title tabular">
            {bar ? formatMoney(bar.paid + bar.scheduled + bar.pending, "RWF", locale) : "—"}
          </span>
        </span>
      </span>
      <span className="flex items-center justify-between gap-2 text-eyebrow text-fg-muted">
        {fill(t.kpi.month, { n: m.completedCount })}
        <Sparkline
          values={m.weeklyBars.map((b) => b.count)}
          label={fill(t.kpi.month, { n: m.completedCount })}
          className="h-6 w-20"
        />
      </span>
    </Link>
  );
}
