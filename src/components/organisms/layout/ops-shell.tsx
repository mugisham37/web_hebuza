"use client";
// Ops shell extras (board 02): live nav badges, palette sources, notifications drawer, scope select,
// shortcut sheet, G-chord navigation, phone tab bar + More sheet. Consumed by WorkspaceShell via context.
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { stripLocale } from "@/shared/i18n/config";
import { cx, formatRelative } from "@/shared/format";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Dialog } from "@/components/atoms/dialog";
import { opsCommon } from "@/content/pages/ops-common";
import { useCases, useToday, useOpsBookingNotes } from "@/lib/ops/api";
import { notifCopy } from "@/content/pages/notification-types";
import { useShortcut, useShortcutList, displayKeys } from "@/lib/ops/shortcuts";
import { Kbd, CountBadge } from "@/components/atoms/ops";

// ---------------------------------------------------------------- context consumed by WorkspaceShell
export type NavBadge = { n: number; tone?: "neutral" | "attention" | "danger" };
export type PaletteItem = {
  group: string;
  label: string;
  hint?: string;
  href: string;
};
export type ShellCtx = {
  badges: Record<string, NavBadge>;
  palette: (q: string) => PaletteItem[];
  headerExtra: ReactNode;
  bell: ReactNode;
  /** Workspace-wide banner shown above page content (e.g. agent Away / on leave). */
  banner?: ReactNode;
  /** Where the sidebar account card links (default /settings). */
  accountHref?: string;
  /** Nav hrefs to hide for this user (e.g. /work/team for firm members). */
  hidden?: string[];
};
type Ctx = ShellCtx;
/** Shared by every staff workspace provider (ops, agent) — WorkspaceShell reads it. */
export const OpsShellCtx = createContext<Ctx | null>(null);
export const useOpsShell = () => useContext(OpsShellCtx);

export function OpsProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  const c = opsCommon(locale);
  const router = useRouter();
  const today = useToday();
  const cases = useCases();
  const L = useMemo(() => (p: string) => localHref(locale, p), [locale]);

  const badges = useMemo<Record<string, NavBadge>>(() => {
    const d = today.data;
    if (!d) return {} as Record<string, NavBadge>;
    return {
      "/ops/intake": { n: d.intake, tone: "attention" },
      "/ops/sla": { n: d.overdue.length, tone: "danger" },
      "/ops/reviews": { n: d.awaitingReview },
      "/ops/tickets": { n: d.complaints },
    };
  }, [today.data]);

  const palette = useMemo(
    () =>
      (q: string): PaletteItem[] => {
        const n = q.trim().toLowerCase();
        if (!n) return [];
        const list = cases.data?.cases ?? [];
        const hits = list
          .filter(
            (x) =>
              x.ref.toLowerCase().includes(n) ||
              x.client.toLowerCase().includes(n) ||
              x.service.toLowerCase().includes(n),
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
            group: c.shell.searchCases,
            label: `${x.ref} · ${x.service}`,
            hint: c.status[x.status],
            href: L(`/ops/cases/${x.ref}`),
          })),
          ...clients.map((x) => ({
            group: c.shell.searchClients,
            label: x.client,
            hint: x.clientType,
            href: L(`/ops/cases?q=${encodeURIComponent(x.client)}`),
          })),
        ];
      },
    [cases.data, c, L],
  );

  // Global navigation chords (G then a letter) + help.
  const [help, setHelp] = useState(false);
  useShortcut("g i", c.shortcuts.goIntake, () => router.push(L("/ops/intake")));
  useShortcut("g c", c.shortcuts.goCases, () => router.push(L("/ops/cases")));
  useShortcut("g r", c.shortcuts.goReviews, () =>
    router.push(L("/ops/reviews")),
  );
  useShortcut("g t", c.shortcuts.goTickets, () =>
    router.push(L("/ops/tickets")),
  );
  useShortcut("g s", c.shortcuts.goSla, () => router.push(L("/ops/sla")));
  useShortcut("?", c.shortcuts.help, () => setHelp(true));

  const value = useMemo<Ctx>(
    () => ({
      badges,
      palette,
      headerExtra: <ScopeSelect />,
      bell: <OpsBell />,
    }),
    [badges, palette],
  );
  return (
    <OpsShellCtx.Provider value={value}>
      {children}
      <ShortcutSheet open={help} onClose={() => setHelp(false)} />
      <OpsTabBar badges={badges} />
    </OpsShellCtx.Provider>
  );
}

// ---------------------------------------------------------------- scope select (category)
function ScopeSelect() {
  const { locale } = useI18n();
  const c = opsCommon(locale).shell;
  const [v, setV] = useState("tax");
  return (
    <label className="hidden items-center md:flex">
      <span className="sr-only">{c.scope}</span>
      <select
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="h-9 border border-border bg-surface px-3 text-small"
      >
        <option value="tax">Tax &amp; Accounting</option>
        <option value="gov">Online &amp; Government</option>
        <option value="inv">Investment &amp; Finance</option>
        <option value="all">{c.allCategories}</option>
      </select>
    </label>
  );
}

// ---------------------------------------------------------------- notifications drawer (SH4)
type Note = {
  id: string;
  icon: IconName;
  tone: "info" | "success" | "danger" | "warning";
  text: string;
  ref?: string;
  href?: string;
  at: string;
  action?: boolean;
  mention?: boolean;
  read?: boolean;
};
const NOTES = (now: number): Note[] => [
  {
    id: "n1",
    icon: "layers",
    tone: "info",
    text: "New request in Tax & Accounting",
    ref: "HBZ-1ZQ9YU",
    at: new Date(now - 12 * 60_000).toISOString(),
    action: true,
  },
  {
    id: "n2",
    icon: "upload",
    tone: "success",
    text: "Client uploaded 2 documents — ready to review",
    ref: "HBZ-4K2M9Q",
    at: new Date(now - 50 * 60_000).toISOString(),
    action: true,
  },
  {
    id: "n3",
    icon: "x",
    tone: "danger",
    text: "Grace declined an offer — over capacity",
    ref: "HBZ-3MJ6TR",
    at: new Date(now - 95 * 60_000).toISOString(),
    action: true,
  },
  {
    id: "n4",
    icon: "fileCheck",
    tone: "info",
    text: "Deliverable submitted for review — VAT declaration",
    ref: "HBZ-6LP4WS",
    at: new Date(now - 3 * 3600_000).toISOString(),
    action: true,
  },
  {
    id: "n5",
    icon: "clock",
    tone: "warning",
    text: "Complaint SLA breach in 2h — TKT-2026-00142",
    at: new Date(now - 4 * 3600_000).toISOString(),
    action: true,
  },
  {
    id: "n6",
    icon: "message",
    tone: "info",
    text: "Grace mentioned you on HBZ-4K2M9Q",
    ref: "HBZ-4K2M9Q",
    at: new Date(now - 26 * 3600_000).toISOString(),
    mention: true,
    read: true,
  },
  {
    id: "n7",
    icon: "wallet",
    tone: "success",
    text: "Quotation accepted — RWF 405,000",
    at: new Date(now - 30 * 3600_000).toISOString(),
    read: true,
  },
];
function OpsBell() {
  const { locale } = useI18n();
  const c = opsCommon(locale).shell;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "action" | "mentions">("all");
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [openedAt, setOpenedAt] = useState(0); // time captured on open (no clock reads during render)
  const booking = useOpsBookingNotes(notes !== null);
  const bookingNotes: Note[] = (booking.data?.items ?? []).map((b) => ({
    id: b.id,
    icon: b.type === "ai.handoff" ? "message" : b.type === "booking.no_show" ? "x" : "calendar",
    tone: b.type === "booking.no_show" ? "danger" : b.type === "ai.handoff" ? "warning" : "info",
    text: notifCopy(locale, b.type, b.vars)?.title ?? b.text,
    ref: b.vars.ref,
    href: b.href,
    at: b.at,
    action: !b.read,
    read: b.read || readIds.has(b.id),
  }));
  const list = [...bookingNotes, ...(notes ?? [])].sort((a, b) => b.at.localeCompare(a.at));
  const unread = notes ? list.filter((n) => !n.read).length : 5;
  const shown = list.filter(
    (n) => tab === "all" || (tab === "action" ? n.action : n.mention),
  );
  const day = 24 * 3600_000;
  const groups = [
    [c.today, shown.filter((n) => openedAt - Date.parse(n.at) < day)],
    [c.earlier, shown.filter((n) => openedAt - Date.parse(n.at) >= day)],
  ] as const;
  const toneCls = {
    info: "bg-navy-50 text-navy-700",
    success: "bg-success-bg text-success",
    danger: "bg-danger-bg text-danger",
    warning: "bg-warning-bg text-warning",
  };
  return (
    <>
      <button
        type="button"
        onClick={() => {
          { const now = Date.now(); setOpenedAt(now); setNotes((n) => n ?? NOTES(now)); }
          setOpen(true);
        }}
        aria-label={`${c.notifications}${unread ? ` (${unread})` : ""}`}
        className="relative flex size-10 items-center justify-center hover:bg-navy-50"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center bg-danger text-[0.65rem] font-semibold text-white tabular">
            {unread}
          </span>
        )}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        side="right"
        title={c.notifications}
        footer={
          <div className="flex w-full justify-between">
            <button
              type="button"
              className="text-small underline underline-offset-4"
              onClick={() =>
                {
                  setNotes((n) => n?.map((x) => ({ ...x, read: true })) ?? n);
                  setReadIds(new Set(list.map((x) => x.id)));
                }
              }
            >
              {c.markAll}
            </button>
            <Link
              href={localHref(locale, "/settings/notifications")}
              className="text-small text-link hover:text-link-hover"
            >
              {c.settings}
            </Link>
          </div>
        }
      >
        <div
          role="tablist"
          aria-label={c.notifications}
          className="-mt-1 mb-3 flex gap-1 border-b border-border"
        >
          {(["all", "action", "mentions"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cx(
                "-mb-px h-10 border-b-2 px-3 text-small",
                tab === t
                  ? "border-gold-400 font-medium text-navy-700"
                  : "border-transparent text-fg-muted",
              )}
            >
              {c.tabs[t]}
              {t === "action" && (
                <span className="ml-1 tabular">
                  ({list.filter((n) => n.action && !n.read).length})
                </span>
              )}
            </button>
          ))}
        </div>
        {!shown.length ? (
          <p className="py-10 text-center text-small text-fg-muted">
            {c.empty}
          </p>
        ) : (
          groups.map(
            ([label, items]) =>
              items.length > 0 && (
                <div key={label} className="mb-4">
                  <p className="mb-2 text-eyebrow text-fg-subtle uppercase">
                    {label}
                  </p>
                  <ul className="grid gap-1">
                    {items.map((n) => (
                      <li key={n.id}>
                        <Link
                          href={localHref(
                            locale,
                            n.href ??
                              (n.ref ? `/ops/cases/${n.ref}` : "/ops/tickets"),
                          )}
                          onClick={() => {
                            setReadIds((r) => new Set(r).add(n.id));
                            setNotes(
                              (xs) =>
                                xs?.map((x) =>
                                  x.id === n.id ? { ...x, read: true } : x,
                                ) ?? xs,
                            );
                            setOpen(false);
                          }}
                          className="grid grid-cols-[2rem_1fr_auto] items-start gap-3 p-2.5 hover:bg-navy-50"
                        >
                          <span
                            className={cx(
                              "flex size-8 items-center justify-center",
                              toneCls[n.tone],
                            )}
                          >
                            <Icon name={n.icon} size={15} aria-hidden />
                          </span>
                          <span className="min-w-0">
                            <span
                              className={cx(
                                "block text-small",
                                !n.read && "font-medium",
                              )}
                            >
                              {n.text}
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
                </div>
              ),
          )
        )}
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------- shortcut sheet ("?")
export function ShortcutSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const c = opsCommon(locale);
  const list = useShortcutList();
  const all = [
    { keys: "mod+k", label: c.shortcuts.palette, group: "global" as const },
    ...list,
  ];
  const groups = (["global", "list", "case"] as const)
    .map((g) => [g, all.filter((s) => s.group === g)] as const)
    .filter(([, xs]) => xs.length);
  return (
    <Dialog open={open} onClose={onClose} title={c.shortcuts.title}>
      <div className="grid gap-5 sm:grid-cols-2">
        {groups.map(([g, xs]) => (
          <dl key={g} className="grid content-start gap-2">
            <dt className="text-eyebrow text-fg-subtle uppercase">{g}</dt>
            {xs.map((s) => (
              <dd
                key={s.keys}
                className="flex items-center justify-between gap-3 text-small"
              >
                {s.label}
                <span className="flex gap-1">
                  {displayKeys(s.keys).map((k, i) => (
                    <Kbd key={i}>{k}</Kbd>
                  ))}
                </span>
              </dd>
            ))}
          </dl>
        ))}
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------- phone tab bar + More sheet (PS1/PS2)
const TABS: {
  href: string;
  key: "today" | "intake" | "reviews" | "conversations";
  icon: IconName;
}[] = [
  { href: "/ops", key: "today", icon: "layers" },
  { href: "/ops/intake", key: "intake", icon: "upload" },
  { href: "/ops/reviews", key: "reviews", icon: "fileCheck" },
  { href: "/ops/conversations", key: "conversations", icon: "message" },
];
const MORE: {
  href: string;
  label:
    | "cases"
    | "workload"
    | "sla"
    | "tickets"
    | "bookings"
    | "catalogue"
    | "statuses";
  icon: IconName;
}[] = [
  { href: "/ops/cases", label: "cases", icon: "file" },
  { href: "/ops/workload", label: "workload", icon: "users" },
  { href: "/ops/sla", label: "sla", icon: "clock" },
  { href: "/ops/tickets", label: "tickets", icon: "shield" },
  { href: "/ops/bookings", label: "bookings", icon: "calendar" },
  { href: "/ops/catalogue", label: "catalogue", icon: "briefcase" },
  { href: "/ops/settings/statuses", label: "statuses", icon: "refresh" },
];
function OpsTabBar({ badges }: { badges: Record<string, NavBadge> }) {
  const { t, locale } = useI18n();
  const c = opsCommon(locale).shell;
  const path = stripLocale(usePathname());
  const [more, setMore] = useState(false);
  const on = (h: string) =>
    h === "/ops" ? path === "/ops" : path === h || path.startsWith(`${h}/`);
  const label = (k: string) =>
    k === "conversations" ? c.inbox : t(`wsnav.${k}` as never);
  return (
    <>
      <nav
        aria-label="Ops"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {TABS.map((tab) => (
            <li key={tab.href}>
              <Link
                href={localHref(locale, tab.href)}
                aria-current={on(tab.href) ? "page" : undefined}
                className={cx(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[0.72rem]",
                  on(tab.href) ? "font-medium text-navy-700" : "text-fg-subtle",
                )}
              >
                <span
                  className={cx(
                    "relative flex h-7 w-12 items-center justify-center",
                    on(tab.href) && "bg-gold-200",
                  )}
                >
                  <Icon name={tab.icon} size={20} aria-hidden />
                  {badges[tab.href]?.n ? (
                    <span className="absolute -top-1 right-0.5">
                      <CountBadge
                        n={badges[tab.href].n}
                        tone={badges[tab.href].tone ?? "neutral"}
                      />
                    </span>
                  ) : null}
                </span>
                {label(tab.key)}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setMore(true)}
              aria-haspopup="dialog"
              className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[0.72rem] text-fg-subtle"
            >
              <span className="flex h-7 w-12 items-center justify-center">
                <Icon name="menu" size={20} aria-hidden />
              </span>
              {c.more}
            </button>
          </li>
        </ul>
      </nav>
      <div className="h-16 lg:hidden" aria-hidden />
      <Dialog
        open={more}
        onClose={() => setMore(false)}
        side="bottom"
        title={c.more}
      >
        <ul className="grid gap-1">
          {MORE.map((m) => (
            <li key={m.href}>
              <Link
                href={localHref(locale, m.href)}
                onClick={() => setMore(false)}
                className="flex h-12 items-center gap-3 px-3 hover:bg-navy-50"
              >
                <Icon name={m.icon} size={18} aria-hidden />
                {t(`wsnav.${m.label}` as never)}
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
      </Dialog>
    </>
  );
}
