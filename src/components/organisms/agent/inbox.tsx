"use client";
import { useWs } from "@/lib/agent/ws";
// U10 Inbox (board 10 CM3, PM1): /agent/inbox?filter=unread|waiting|mentions&thread=<ref>&q=
// Three panes ≥1280 (list / thread / case context), two panes 768–1279, stacked on phones.
import Link from "next/link";
import { useEffect, type CSSProperties } from "react";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx, formatDate } from "@/shared/format";
import { localHref } from "@/shared/i18n/config";
import { useShortcut } from "@/lib/ops/shortcuts";
import { useThreads, type InboxFilter, type ThreadRow } from "@/lib/agent/d";
import { useOutbox, pendingCount } from "@/lib/agent/outbox";
import { fill } from "@/content/pages/agent-common";
import { Countdown, PageHead, SkeletonRows, useNow } from "@/components/atoms/agent";
import { CountBadge, OpsStatus } from "@/components/atoms/ops";
import { EmptyPanel, FilterBar, PanelError } from "@/components/molecules/ops/ops";
import { buttonClass } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { Avatar } from "@/components/atoms/misc";
import { Conversation, useIC } from "@/components/organisms/agent/thread";
import { Chips } from "@/components/molecules/agent/agent";

const FILTERS: InboxFilter[] = ["all", "unread", "waiting", "mentions"];

export function InboxView() {
  const { c, locale } = useIC();
  const { wsHref } = useWs();
  const p = useUrlParams();
  const filter = (
    FILTERS.includes(p.get("filter") as InboxFilter) ? p.get("filter") : "all"
  ) as InboxFilter;
  const q = p.get("q") ?? "";
  const sel = p.get("thread");
  const list = useThreads(filter, q);
  const now = useNow();
  const items = list.data?.items ?? [];
  const counts = list.data?.counts;
  const outbox = pendingCount(useOutbox());
  const tplParam = p.get("tpl");
  const first = items[0]?.ref;
  useEffect(() => {
    if (tplParam && !sel && first) setUrlParams({ thread: first });
  }, [tplParam, sel, first]);
  const current = items.find((t) => t.ref === sel) ?? null;
  const idx = items.findIndex((t) => t.ref === sel);
  const move = (d: number) => {
    const next = items[Math.min(items.length - 1, Math.max(0, idx + d))];
    if (next) {
      setUrlParams({ thread: next.ref });
      document
        .getElementById(`th-${next.ref}`)
        ?.focus({ preventScroll: false });
    }
  };
  useShortcut("j", c.keys.next, () => move(1), "list", items.length > 0);
  useShortcut("k", c.keys.prev, () => move(-1), "list", items.length > 0);
  const [eTitle, eBody] = q ? c.empty.search : c.empty[filter];

  return (
    <div className="pb-24 lg:pb-8">
      <PageHead
        title={c.title}
        sub={c.sub}
        actions={
          <Link
            href={localHref(locale, wsHref("/agent/inbox/templates"))}
            className={buttonClass({ variant: "outline", size: "sm" })}
          >
            {c.templatesLink}
            {outbox > 0 && <CountBadge n={outbox} tone="attention" />}
          </Link>
        }
      />
      <div className={cx("mb-3 grid gap-3", sel && "max-md:hidden")}>
        <FilterBar
          search={q}
          onSearch={(v) => setUrlParams({ q: v || null })}
          placeholder={c.search}
          chips={[]}
        />
        <Chips
          label={c.filterLabel}
          value={filter}
          onChange={(f) => setUrlParams({ filter: f === "all" ? null : f })}
          options={FILTERS.map((f) => ({
            id: f,
            label: c.filters[f],
            n: counts?.[f],
          }))}
        />
      </div>
      <div className="grid gap-3 md:h-[calc(100dvh-15rem)] md:min-h-[32rem] md:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)_17rem]">
        <nav
          aria-label={c.title}
          className={cx(
            "min-h-0 overflow-y-auto border border-border bg-white",
            sel && "max-md:hidden",
          )}
        >
          {list.isPending ? (
            <SkeletonRows n={5} className="p-3" />
          ) : list.isError ? (
            <div className="p-3">
              <PanelError what={c.listErr} onRetry={() => list.refetch()} />
            </div>
          ) : !items.length ? (
            <div className="p-3">
              <EmptyPanel compact title={fill(eTitle, { q })} body={eBody} />
            </div>
          ) : (
            <ul className="divide-y divide-border m-stagger">
              {items.map((t, i) => (
                <li
                  key={t.ref}
                  style={{ "--i": Math.min(i, 6) } as CSSProperties}
                >
                  <Row t={t} now={now} active={t.ref === sel} locale={locale} c={c} />
                </li>
              ))}
            </ul>
          )}
        </nav>
        <div className={cx("min-h-0", !sel && "max-md:hidden")}>
          {sel ? (
            <div className="h-[calc(100dvh-12rem)] min-h-[28rem] md:h-full">
              <Conversation
                key={sel}
                caseRef={sel}
                onBack={() => setUrlParams({ thread: null, lane: null })}
                head={
                  <div className="grid min-w-0">
                    <p className="truncate text-label">
                      {current?.client ?? sel}
                    </p>
                    <Link
                      href={localHref(
                        locale,
                        wsHref(`/agent/cases/${sel}?tab=conversation`),
                      )}
                      className="text-eyebrow text-navy-700 underline-offset-2 hover:underline xl:hidden"
                    >
                      {sel} · {c.openCase}
                    </Link>
                    <span className="max-xl:hidden text-eyebrow text-fg-muted">
                      {sel}
                    </span>
                  </div>
                }
              />
            </div>
          ) : (
            <div className="grid h-full place-items-center">
              <EmptyPanel title={c.pick} body={c.pickBody} />
            </div>
          )}
        </div>
        {current && <Context t={current} c={c} locale={locale} />}
      </div>
    </div>
  );
}

function Row({
  t,
  now,
  active,
  locale,
  c,
}: {
  t: ThreadRow;
  now: number | null;
  active: boolean;
  locale: Parameters<typeof localHref>[0];
  c: ReturnType<typeof useIC>["c"];
}) {
  const today = now !== null && now - Date.parse(t.lastAt) < 18 * 3600_000;
  return (
    <button
      id={`th-${t.ref}`}
      type="button"
      aria-current={active || undefined}
      onClick={() => setUrlParams({ thread: t.ref })}
      className={cx(
        "flex w-full items-start gap-3 px-3 py-3 text-left m-press",
        active ? "bg-tint" : "hover:bg-bg-subtle/60",
      )}
    >
      <span className="relative">
        <Avatar name={t.client} size="sm" />
        {t.unread > 0 && (
          <span
            className="absolute -top-0.5 -left-0.5 size-2.5 rounded-full bg-navy-700 ring-2 ring-white"
            aria-hidden
          />
        )}
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex items-baseline gap-2">
          <span
            className={cx(
              "truncate text-small",
              t.unread ? "font-semibold" : "font-medium",
            )}
          >
            {t.client}
          </span>
          <time
            dateTime={t.lastAt}
            className="ml-auto shrink-0 text-eyebrow text-fg-subtle tabular"
          >
            {formatDate(
              t.lastAt,
              locale,
              today ? { timeStyle: "short" } : { weekday: "short" },
            )}
          </time>
        </span>
        <span className="text-eyebrow text-fg-muted">{t.ref}</span>
        <span className="flex items-center gap-2">
          {t.previewLane === "internal" && (
            <Icon
              name="lock"
              size={12}
              aria-hidden
              className="shrink-0 text-warning"
            />
          )}
          <span className="truncate text-small text-fg-muted">{t.preview}</span>
          <span className="ml-auto flex shrink-0 gap-1">
            {t.unread > 0 && (
              <span className="sr-only">
                {fill(c.unreadN, { n: t.unread })}
              </span>
            )}
            <CountBadge n={t.unread} />
            {t.mentions > 0 && (
              <span
                className="bg-ink-100 px-1.5 text-eyebrow"
                title={fill(c.mentionN, { n: t.mentions })}
              >
                @
              </span>
            )}
          </span>
        </span>
        {t.waiting && !t.readOnly && t.waitingSince && (
          <span className="w-fit bg-warning-bg px-2 text-eyebrow text-warning">
            {fill(c.waitingSince, {
              t: formatDate(t.waitingSince, locale, { timeStyle: "short" }),
            })}
          </span>
        )}
      </span>
    </button>
  );
}

function Context({
  t,
  c,
  locale,
}: {
  t: ThreadRow;
  c: ReturnType<typeof useIC>["c"];
  locale: Parameters<typeof localHref>[0];
}) {
  const { wsHref } = useWs();
  return (
    <aside
      aria-label={c.context}
      className="hidden min-h-0 content-start gap-4 overflow-y-auto border border-border bg-white p-4 xl:grid"
    >
      <h2 className="text-label-lg">{c.context}</h2>
      <dl className="grid gap-3 text-small">
        <div className="grid gap-0.5">
          <dt className="text-eyebrow text-fg-muted">{c.client}</dt>
          <dd className="flex items-center gap-2">
            <Avatar name={t.client} size="sm" />
            {t.client}
          </dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-eyebrow text-fg-muted">{c.service}</dt>
          <dd>{t.service}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-eyebrow text-fg-muted">{c.status}</dt>
          <dd>
            <OpsStatus status={t.status} />
          </dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-eyebrow text-fg-muted">{c.due}</dt>
          <dd>
            <Countdown to={t.dueAt} kind="due" />
          </dd>
        </div>
      </dl>
      <div className="grid gap-2">
        <Link
          href={localHref(locale, wsHref(`/agent/cases/${t.ref}?tab=conversation`))}
          className={buttonClass({ size: "sm" })}
        >
          {c.openCase}
        </Link>
        <Link
          href={localHref(locale, wsHref(`/agent/clients/${t.clientId}`))}
          className={buttonClass({ size: "sm", variant: "outline" })}
        >
          {c.viewClient}
        </Link>
      </div>
    </aside>
  );
}
