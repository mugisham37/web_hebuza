"use client";
// Agent shell extras (board 02 SH1–SH4, PS1–PS2): live nav badges, ⌘K sources + actions, duty pill (On duty / Away /
// leave), Away/leave/offline banner, notifications drawer, G-chords, phone tab bar Today·Offers·Cases·Inbox·More.
// Consumed by WorkspaceShell through the shared OpsShellCtx.
import {
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { stripLocale } from "@/shared/i18n/config";
import { cx, formatDate, formatRelative } from "@/shared/format";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Dialog } from "@/components/atoms/dialog";
import { useToast } from "@/components/atoms/toast";
import {
  OpsShellCtx,
  ShortcutSheet,
  type NavBadge,
  type PaletteItem,
} from "@/components/organisms/layout/ops-shell";
import { CountBadge } from "@/components/atoms/ops";
import { useOpsShell } from "@/components/organisms/layout/ops-shell";
import { opsCommon } from "@/content/pages/ops-common";
import { LocaleSwitcher } from "@/components/organisms/layout/locale-switcher";
import { useShortcut } from "@/lib/ops/shortcuts";
import {
  agentKeys,
  useMyCases,
  useSetDuty,
  useSummary,
} from "@/lib/agent/api";
import { fill } from "@/content/pages/agent-common";
import { DutyDot, useA } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { useOutbox, pendingCount } from "@/lib/agent/outbox";
import { WS, WsCtx, swapBase, useWs, type WsKey } from "@/lib/agent/ws";
import { notifCopy } from "@/content/pages/notification-types";
import { api, unwrap } from "@/lib/api/client";

/** `ws="work"` mounts the same workspace at /work for external agents (Stage 8 §0.3); `banner`/`hidden` are its extras. */
export function AgentProvider({
  children,
  ws: wsKey = "agent",
  banner,
  hidden,
}: {
  children: ReactNode;
  ws?: WsKey;
  banner?: ReactNode;
  hidden?: string[];
}) {
  const ws = WS[wsKey];
  const W = useMemo(() => (p: string) => swapBase(ws, p), [ws]);
  const { locale } = useI18n();
  const a = useA();
  const router = useRouter();
  const summary = useSummary();
  const cases = useMyCases();
  const L = useMemo(() => (p: string) => localHref(locale, W(p)), [locale, W]);
  const s = summary.data;

  const outbox = pendingCount(useOutbox());
  const badges = useMemo<Record<string, NavBadge>>(() => {
    if (!s) return {} as Record<string, NavBadge>;
    return {
      [W("/agent/offers")]: { n: s.offers, tone: "attention" },
      [W("/agent/cases")]: s.overdue
        ? { n: s.overdue, tone: "danger" }
        : { n: s.cases },
      // Unread + messages still waiting in this device's offline outbox.
      [W("/agent/inbox")]: { n: s.unread + outbox, tone: outbox ? "attention" : undefined },
    };
  }, [s, outbox, W]);

  const palette = useMemo(
    () =>
      (q: string): PaletteItem[] => {
        const n = q.trim().toLowerCase();
        const st = opsCommon(locale).status;
        const actions: PaletteItem[] = [
          {
            group: a.shell.actions,
            label: a.shell.acceptNext,
            hint: "A",
            href: L("/agent/offers"),
          },
          {
            group: a.shell.actions,
            label: a.shell.uploadDeliverable,
            hint: "U",
            href: L("/agent/cases?view=in_progress"),
          },
          {
            group: a.shell.actions,
            label: a.shell.goEarnings,
            hint: "G E",
            href: L("/agent/earnings"),
          },
        ];
        if (!n) return actions;
        const list = cases.data ?? [];
        const hits = list
          .filter((x) =>
            `${x.ref} ${x.client} ${x.service}`.toLowerCase().includes(n),
          )
          .slice(0, 6);
        const clients = [
          ...new Map(
            list
              .filter((x) => x.client.toLowerCase().includes(n))
              .map((x) => [x.clientId, x]),
          ).values(),
        ].slice(0, 3);
        return [
          ...hits.map((x) => ({
            group: a.shell.searchCases,
            label: `${x.ref} · ${x.service}`,
            hint: st[x.status],
            href: L(`/agent/cases/${x.ref}`),
          })),
          ...clients.map((x) => ({
            group: a.shell.searchClients,
            label: x.client,
            href: L(`/agent/clients/${x.clientId}`),
          })),
          ...actions.filter((x) => x.label.toLowerCase().includes(n)),
        ];
      },
    [cases.data, a, L, locale],
  );

  const [help, setHelp] = useState(false);
  useShortcut("g t", a.shortcuts.goToday, () => router.push(L("/agent")));
  useShortcut("g o", a.shortcuts.goOffers, () =>
    router.push(L("/agent/offers")),
  );
  useShortcut("g c", a.shortcuts.goCases, () => router.push(L("/agent/cases")));
  useShortcut("g i", a.shortcuts.goInbox, () => router.push(L("/agent/inbox")));
  useShortcut("g k", a.shortcuts.goCalendar, () =>
    router.push(L("/agent/calendar")),
  );
  useShortcut("g e", a.shortcuts.goEarnings, () =>
    router.push(L("/agent/earnings")),
  );
  useShortcut("?", a.shortcuts.help, () => setHelp(true));

  const value = useMemo(
    () => ({
      badges,
      palette,
      headerExtra: <DutyMenu />,
      bell: <AgentBell />,
      banner: (
        <>
          <AgentBanner />
          {banner}
        </>
      ),
      accountHref: W("/agent/profile"),
      hidden,
    }),
    [badges, palette, banner, hidden, W],
  );

  return (
    <WsCtx.Provider value={ws}>
      <OpsShellCtx.Provider value={value}>
        {children}
        <ShortcutSheet open={help} onClose={() => setHelp(false)} />
        <AgentTabBar badges={badges} />
      </OpsShellCtx.Provider>
    </WsCtx.Provider>
  );
}

// ---------------------------------------------------------------- duty pill + menu (SH1/SH3, AK5)
function DutyMenu() {
  const a = useA();
  const { locale } = useI18n();
  const toast = useToast();
  const { data } = useSummary();
  const set = useSetDuty();
  const { wsHref } = useWs();
  const [open, setOpen] = useState(false);
  if (!data)
    return <span aria-hidden className="h-9 w-28 m-shimmer" />;
  const state = data.onLeaveNow ? "leave" : data.duty;
  const choose = (on: boolean, hours?: number | "eod") => {
    setOpen(false);
    let until: string | null = null;
    if (hours === "eod") {
      const d = new Date();
      d.setHours(17, 0, 0, 0);
      until = d.toISOString();
    } else if (hours)
      until = new Date(Date.now() + hours * 3600_000).toISOString();
    const prev = data.duty;
    set.mutate(
      { state: on ? "on" : "away", until },
      {
        onSuccess: () =>
          toast({
            title: on ? a.duty.nowOn : a.duty.nowAway,
            tone: "success",
            action: {
              label: a.common.undo,
              onClick: () => set.mutate({ state: prev, until: data.awayUntil }),
            },
          }),
        onError: () => toast({ title: a.duty.failed, tone: "danger" }),
      },
    );
  };
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={state === "leave"}
        title={state === "leave" ? a.duty.lockedLeave : undefined}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-2 border border-border-strong bg-surface px-3 text-small whitespace-nowrap m-press disabled:opacity-70"
      >
        <span className="sr-only">{a.duty.label}: </span>
        <DutyDot state={state} pending={set.isPending} />
        {state !== "leave" && (
          <Icon
            name="chevronDown"
            size={14}
            aria-hidden
            className={cx(
              "transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-40 mt-2 w-64 border border-border bg-surface p-1.5 shadow-md m-pop"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <MenuItem onClick={() => choose(true)} checked={data.duty === "on"}>
            <DutyDot state="on" />
          </MenuItem>
          <p className="px-3 pt-2 pb-1 text-eyebrow text-fg-subtle uppercase">
            {a.duty.awayFor}
          </p>
          <MenuItem onClick={() => choose(false, 1)}>{a.duty.oneHour}</MenuItem>
          <MenuItem onClick={() => choose(false, "eod")}>
            {a.duty.endOfDay}
          </MenuItem>
          <MenuItem
            onClick={() => choose(false)}
            checked={data.duty === "away" && !data.awayUntil}
          >
            {a.duty.untilBack}
          </MenuItem>
          <div className="my-1 border-t border-border" />
          <Link
            role="menuitem"
            href={localHref(locale, wsHref("/agent/profile/availability"))}
            onClick={() => setOpen(false)}
            className="flex h-10 items-center gap-2 px-3 text-small hover:bg-navy-50"
          >
            <Icon name="calendar" size={16} aria-hidden />
            {a.duty.requestLeave}
          </Link>
        </div>
      )}
    </div>
  );
}
function MenuItem({
  onClick,
  checked,
  children,
}: {
  onClick: () => void;
  checked?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={!!checked}
      onClick={onClick}
      className="flex h-10 w-full items-center gap-2 px-3 text-left text-small hover:bg-navy-50"
    >
      <span className="flex-1">{children}</span>
      {checked && (
        <Icon name="check" size={16} aria-hidden className="text-navy-700" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------- banner (Away / leave / offline)
function AgentBanner() {
  const a = useA();
  const { locale } = useI18n();
  const online = useOnline();
  const { data } = useSummary();
  const set = useSetDuty();
  const items: ReactNode[] = [];
  if (!online)
    items.push(
      <Bar key="off" tone="ink" icon="globe">
        {a.common.offline}
      </Bar>,
    );
  if (data?.onLeaveNow && data.leave)
    items.push(
      <Bar key="leave" tone="info" icon="calendar">
        {fill(a.duty.leaveBanner, {
          d: formatDate(data.leave.to, locale),
          m: data.me.manager,
        })}
      </Bar>,
    );
  else if (data?.duty === "away")
    items.push(
      <Bar
        key="away"
        tone="warning"
        icon="clock"
        action={
          <button
            type="button"
            onClick={() => set.mutate({ state: "on" })}
            className="h-8 shrink-0 bg-secondary px-3 text-small text-on-navy hover:bg-secondary-hover m-press"
          >
            {a.duty.switchOn}
          </button>
        }
      >
        {data.awayUntil
          ? `${fill(a.duty.awayUntil, { t: formatRelative(data.awayUntil, locale) })} — `
          : ""}
        {a.duty.awayBanner}
      </Bar>,
    );
  if (!items.length) return null;
  return <div className="mb-5 grid gap-2">{items}</div>;
}
function Bar({
  tone,
  icon,
  action,
  children,
}: {
  tone: "warning" | "info" | "ink";
  icon: IconName;
  action?: ReactNode;
  children: ReactNode;
}) {
  const cls = {
    warning: "bg-warning-bg",
    info: "bg-info-bg text-info",
    ink: "bg-ink-900 text-white",
  }[tone];
  return (
    <div
      role="status"
      className={cx(
        "flex flex-wrap items-center gap-3 px-4 py-3 text-small m-rise",
        cls,
      )}
    >
      <Icon name={icon} size={18} aria-hidden />
      <p className="min-w-0 flex-1">{children}</p>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------- notifications drawer (SH2)
type Note = {
  id: string;
  kind: "offer" | "client" | "review" | "deadline" | "money" | "contract" | "booking";
  type?: string;
  vars?: Record<string, string>;
  text: string;
  ref?: string;
  href: string;
  at: string;
  read: boolean;
};
const NOTE_ICON: Record<Note["kind"], { icon: IconName; cls: string }> = {
  offer: { icon: "sparkle", cls: "bg-navy-50 text-navy-700" },
  client: { icon: "upload", cls: "bg-info-bg text-info" },
  review: { icon: "fileCheck", cls: "bg-danger-bg text-danger" },
  deadline: { icon: "clock", cls: "bg-warning-bg text-warning" },
  money: { icon: "wallet", cls: "bg-success-bg text-success" },
  contract: { icon: "shield", cls: "bg-ink-100 text-ink-700" },
  booking: { icon: "calendar", cls: "bg-navy-50 text-navy-700" },
};
const TAB_KINDS = {
  all: null,
  offers: ["offer"],
  clients: ["client"],
  reviews: ["review"],
} as const;
function AgentBell() {
  const a = useA();
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<keyof typeof TAB_KINDS>("all");
  const { wsHref } = useWs();
  const [read, setRead] = useState<Set<string>>(new Set());
  const q = useQuery({
    queryKey: [...agentKeys.all, "notes"],
    queryFn: () => unwrap<{ items: Note[] }>(api.GET("/api/agent/x/notifications")),
    refetchInterval: 60_000,
  });
  const list = (q.data?.items ?? []).map((n) => ({
    ...n,
    read: n.read || read.has(n.id),
  }));
  const unread = list.filter((n) => !n.read).length;
  const kinds = TAB_KINDS[tab] as readonly string[] | null;
  const shown = list.filter((n) => !kinds || kinds.includes(n.kind));
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${a.shell.notifications}${unread ? ` (${unread})` : ""}`}
        className="relative flex size-10 items-center justify-center hover:bg-navy-50 m-press"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center bg-danger text-[0.65rem] font-semibold text-white tabular m-pop">
            {unread}
          </span>
        )}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        side="right"
        title={a.shell.notifications}
        footer={
          <div className="flex w-full justify-between">
            <button
              type="button"
              className="text-small underline underline-offset-4"
              onClick={() => setRead(new Set(list.map((n) => n.id)))}
            >
              {a.shell.markAll}
            </button>
            <Link
              href={localHref(locale, wsHref("/agent/profile/notifications"))}
              onClick={() => setOpen(false)}
              className="text-small text-link hover:text-link-hover"
            >
              {a.shell.settings}
            </Link>
          </div>
        }
      >
        <div
          role="tablist"
          aria-label={a.shell.notifications}
          className="-mt-1 mb-3 flex gap-1 overflow-x-auto border-b border-border no-scrollbar"
        >
          {(Object.keys(TAB_KINDS) as (keyof typeof TAB_KINDS)[]).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cx(
                "-mb-px h-10 shrink-0 border-b-2 px-3 text-small transition-colors",
                tab === t
                  ? "border-gold-400 font-medium text-navy-700"
                  : "border-transparent text-fg-muted",
              )}
            >
              {a.shell.tabs[t]}
            </button>
          ))}
        </div>
        {q.isPending ? (
          <div className="grid gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 m-shimmer" />
            ))}
          </div>
        ) : !shown.length ? (
          <p className="py-10 text-center text-small text-fg-muted">
            {a.shell.empty}
          </p>
        ) : (
          <ul className="grid gap-1 m-stagger">
            {shown.map((n, i) => (
              <li key={n.id} style={{ ["--i" as string]: i }}>
                <Link
                  href={localHref(locale, wsHref(n.href))}
                  onClick={() => {
                    setRead((r) => new Set(r).add(n.id));
                    setOpen(false);
                  }}
                  className="grid grid-cols-[2rem_1fr_auto] items-start gap-3 p-2.5 hover:bg-navy-50"
                >
                  <span
                    className={cx(
                      "flex size-8 items-center justify-center",
                      NOTE_ICON[n.kind].cls,
                    )}
                  >
                    <Icon name={NOTE_ICON[n.kind].icon} size={15} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cx(
                        "block text-small",
                        !n.read && "font-medium",
                      )}
                    >
                      {notifCopy(locale, n.type, n.vars)?.title ?? n.text}
                    </span>
                    {n.ref && (
                      <span className="text-eyebrow text-fg-subtle tabular">
                        {n.ref}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5 text-eyebrow text-fg-subtle tabular">
                    {formatRelative(n.at, locale)}
                    {!n.read && (
                      <span
                        aria-label="unread"
                        className="size-2 rounded-full bg-navy-700"
                      />
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------- phone tab bar + More sheet (PS1/PS2)
const TABS: {
  href: string;
  key: "today" | "offers" | "cases" | "inbox";
  icon: IconName;
}[] = [
  { href: "/agent", key: "today", icon: "layers" },
  { href: "/agent/offers", key: "offers", icon: "sparkle" },
  { href: "/agent/cases", key: "cases", icon: "briefcase" },
  { href: "/agent/inbox", key: "inbox", icon: "message" },
];
const MORE: {
  href: string;
  key: "calendar" | "clients" | "earnings" | "performance" | "profile";
  icon: IconName;
}[] = [
  { href: "/agent/calendar", key: "calendar", icon: "calendar" },
  { href: "/agent/clients", key: "clients", icon: "users" },
  { href: "/agent/earnings", key: "earnings", icon: "wallet" },
  { href: "/agent/performance", key: "performance", icon: "chart" },
  { href: "/agent/profile", key: "profile", icon: "user" },
];
// PS1 for /work: Home·Offers·Jobs·Earnings·More (labels from the shared wsnav dictionary).
const WORK_TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/work", label: "wsnav.home", icon: "layers" },
  { href: "/work/offers", label: "wsnav.offers", icon: "sparkle" },
  { href: "/work/jobs", label: "wsnav.jobs", icon: "briefcase" },
  { href: "/work/earnings", label: "wsnav.earnings", icon: "wallet" },
];
const WORK_MORE: { href: string; label: string; icon: IconName }[] = [
  { href: "/work/inbox", label: "wsnav.messages", icon: "message" },
  { href: "/work/contract", label: "wsnav.contract", icon: "shield" },
  { href: "/work/profile", label: "wsnav.profile", icon: "user" },
  { href: "/work/team", label: "wsnav.team", icon: "users" },
];
function AgentTabBar({ badges }: { badges: Record<string, NavBadge> }) {
  const a = useA();
  const { locale, t: tr } = useI18n();
  const ws = useWs();
  const hidden = useOpsShell()?.hidden ?? [];
  const path = stripLocale(usePathname());
  const work = ws.key === "work";
  const tabs = work
    ? WORK_TABS.map((x) => ({ ...x, text: tr(x.label as never) }))
    : TABS.map((x) => ({ ...x, text: a.nav[x.key] }));
  const more = (
    work
      ? WORK_MORE.map((x) => ({ ...x, text: tr(x.label as never) }))
      : MORE.map((x) => ({ ...x, text: a.nav[x.key] }))
  ).filter((x) => !hidden.includes(x.href));
  const [moreOpen, setMore] = useState(false);
  const { data } = useSummary();
  const set = useSetDuty();
  const on = (h: string) =>
    h === ws.base ? path === ws.base : path === h || path.startsWith(`${h}/`);
  const moreOn = more.some((m) => on(m.href));
  return (
    <>
      <nav
        aria-label={a.nav.more}
        data-bottom-bar
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {tabs.map((t) => (
            <li key={t.href}>
              <Link
                href={localHref(locale, t.href)}
                aria-current={on(t.href) ? "page" : undefined}
                className={cx(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[0.72rem] m-press",
                  on(t.href) ? "font-medium text-navy-700" : "text-fg-subtle",
                )}
              >
                <span
                  className={cx(
                    "relative flex h-7 w-12 items-center justify-center transition-colors duration-200",
                    on(t.href) && "bg-gold-200",
                  )}
                >
                  <Icon name={t.icon} size={20} aria-hidden />
                  {badges[t.href]?.n ? (
                    <span className="absolute -top-1 right-0.5">
                      <CountBadge
                        n={badges[t.href].n}
                        tone={badges[t.href].tone ?? "neutral"}
                      />
                    </span>
                  ) : null}
                </span>
                {t.text}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setMore(true)}
              aria-haspopup="dialog"
              aria-current={moreOn ? "page" : undefined}
              className={cx(
                "flex h-16 w-full flex-col items-center justify-center gap-1 text-[0.72rem] m-press",
                moreOn ? "font-medium text-navy-700" : "text-fg-subtle",
              )}
            >
              <span
                className={cx(
                  "flex h-7 w-12 items-center justify-center",
                  moreOn && "bg-gold-200",
                )}
              >
                <Icon name="menu" size={20} aria-hidden />
              </span>
              {a.nav.more}
            </button>
          </li>
        </ul>
      </nav>
      <div className="h-16 lg:hidden" aria-hidden />
      <Dialog
        open={moreOpen}
        onClose={() => setMore(false)}
        side="bottom"
        title={a.nav.more}
      >
        {data && !data.onLeaveNow && !work && (
          <div className="mb-3 flex items-center justify-between border border-border bg-bg-subtle p-3">
            <DutyDot state={data.duty} />
            <button
              type="button"
              onClick={() =>
                set.mutate({ state: data.duty === "on" ? "away" : "on" })
              }
              className="h-9 bg-secondary px-4 text-small text-on-navy hover:bg-secondary-hover m-press"
            >
              {data.duty === "on" ? a.duty.away : a.duty.switchOn}
            </button>
          </div>
        )}
        <ul className="grid gap-1">
          {more.map((m) => (
            <li key={m.href}>
              <Link
                href={localHref(locale, m.href)}
                aria-current={on(m.href) ? "page" : undefined}
                className="flex h-12 items-center gap-3 px-3 hover:bg-navy-50 aria-[current=page]:bg-navy-50 aria-[current=page]:font-medium aria-[current=page]:text-navy-700"
              >
                <Icon name={m.icon} size={18} aria-hidden />
                {m.text}
                <Icon
                  name="arrowRight"
                  size={14}
                  className="ml-auto text-fg-subtle"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-small text-fg-muted">{a.shell.language}</span>
          <LocaleSwitcher />
        </div>
      </Dialog>
    </>
  );
}
