"use client";
// System shell extras (plan 06 U0, board 02 SH1–SH4, PS1): live nav badges, ⌘K sources (users, settings keys,
// integrations, templates + actions; never case refs), env pill, alerts drawer (All/Security/Integrations/Ops), banner
// stack (break-glass → impersonation → maintenance → offline), G-chords + "?" help, phone tab bar
// Home · Approvals · Alerts · Users · More. Consumed by WorkspaceShell through the shared OpsShellCtx.
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { stripLocale } from "@/shared/i18n/config";
import { cx, formatRelative } from "@/shared/format";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Dialog } from "@/components/atoms/dialog";
import { useToast } from "@/components/atoms/toast";
import { OpsShellCtx, ShortcutSheet, type NavBadge, type PaletteItem } from "@/components/organisms/layout/ops-shell";
import { CountBadge } from "@/components/atoms/ops";
import { useOnline } from "@/components/atoms/hooks";
import { LocaleSwitcher } from "@/components/organisms/layout/locale-switcher";
import { useShortcut } from "@/lib/ops/shortcuts";
import { sysKeys, useAlerts, useMarkAlerts, useSystemSummary } from "@/lib/system/api";
import type { AlertKind, AlertVM } from "@/shared/system/types";
import { fill, sysError } from "@/content/pages/system-common";
import { EnvPill, useS } from "@/components/atoms/system";
import { BreakGlassBanner, ImpersonationBanner, MaintenanceBanner, OfflineBanner } from "@/components/molecules/system/system";
import { api, unwrap, type ApiCall } from "@/lib/api/client";
import { hdr } from "@/lib/ops/c";

const ENV = (process.env.NEXT_PUBLIC_APP_ENV ?? "development") as "production" | "staging" | "sandbox" | "development";

type Search = { users: { id: string; name: string; email: string; kind: string }[]; settings: { key: string; group: string }[]; integrations: { key: string; name: string }[]; templates: { key: string; channel: string }[] };

/** Alerts drawer is opened from the bell and from the phone tab bar. */
const AlertsCtx = createContext<{ open: () => void }>({ open: () => {} });
export const useAlertsDrawer = () => useContext(AlertsCtx);

export function SystemProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  const s = useS();
  const router = useRouter();
  const summary = useSystemSummary();
  const L = useMemo(() => (p: string) => localHref(locale, p), [locale]);
  const d = summary.data;
  const [q, setQ] = useState("");
  const search = useQuery({ queryKey: [...sysKeys.all, "search", q], queryFn: () => unwrap<Search>(api.GET("/api/staff/x/search", { params: { query: { q: q } } })), enabled: q.trim().length > 1, staleTime: 30_000 });

  // A failed count fetch shows no badge (never "0"): badges only exist once data is in.
  const badges = useMemo<Record<string, NavBadge>>(() => {
    if (!d) return {} as Record<string, NavBadge>;
    return {
      "/system/approvals": { n: d.approvals, tone: "attention" },
      "/system/identity": { n: d.identity, tone: "attention" },
      "/system/integrations": { n: d.degraded, tone: "danger" },
      "/system/access-reviews": { n: d.reviewsDue },
    };
  }, [d]);

  const actions = useMemo<PaletteItem[]>(() => [
    { group: s.shell.groupActions, label: s.shell.inviteUser, hint: "G I", href: L("/system/users?dialog=invite") },
    { group: s.shell.groupActions, label: s.shell.rotateCredential, hint: "G R", href: L("/system/integrations?health=all") },
    { group: s.shell.groupActions, label: s.shell.verifyChain, hint: "G V", href: L("/system/audit/integrity") },
    { group: s.shell.groupActions, label: s.shell.maintenanceOn, href: L("/system/settings/maintenance") },
    { group: s.shell.groupActions, label: s.shell.newIncident, href: L("/system/ops?tab=incidents&dialog=new") },
    { group: s.shell.groupActions, label: s.shell.startReview, href: L("/system/access-reviews") },
  ], [s, L]);
  const palette = useMemo(() => (raw: string): PaletteItem[] => {
    const n = raw.trim().toLowerCase();
    // shortcut: the palette API is sync, so the typed query feeds a cached search on the next tick; make PaletteItem async if lag shows.
    if (n !== q) queueMicrotask(() => setQ(n));
    if (!n) return actions;
    const r = search.data;
    return [
      ...(r?.users ?? []).map((u) => ({ group: s.shell.groupUsers, label: u.name, hint: u.email, href: L(`/system/users/${u.id}`) })),
      ...(r?.settings ?? []).map((x) => ({ group: s.shell.groupSettings, label: x.key, hint: x.group, href: L(`/system/settings/${x.group}#${x.key}`) })),
      ...(r?.integrations ?? []).map((x) => ({ group: s.nav.integrations, label: x.name, href: L(`/system/integrations/${x.key}`) })),
      ...(r?.templates ?? []).map((x) => ({ group: s.nav.notifications, label: x.key, hint: x.channel, href: L(`/system/notifications/templates/${x.key}`) })),
      ...actions.filter((a) => a.label.toLowerCase().includes(n)),
    ];
  }, [actions, search.data, q, s, L]);

  const [help, setHelp] = useState(false);
  const [alerts, setAlerts] = useState(false);
  const k = s.shortcuts;
  useShortcut("g o", k.goOverview, () => router.push(L("/system")));
  useShortcut("g u", k.goUsers, () => router.push(L("/system/users")));
  useShortcut("g a", k.goAudit, () => router.push(L("/system/audit")));
  useShortcut("g s", k.goSettings, () => router.push(L("/system/settings/general")));
  useShortcut("g p", k.goApprovals, () => router.push(L("/system/approvals")));
  useShortcut("g i", k.invite, () => router.push(L("/system/users?dialog=invite")));
  useShortcut("g r", k.rotate, () => router.push(L("/system/integrations")));
  useShortcut("g v", k.verify, () => router.push(L("/system/audit/integrity")));
  useShortcut("?", k.help, () => setHelp(true));

  const value = useMemo(() => ({
    badges, palette,
    headerExtra: <span className="hidden sm:inline-flex"><EnvPill env={ENV} /></span>,
    bell: <SystemBell open={alerts} setOpen={setAlerts} />,
    banner: <SystemBanners />,
    accountHref: d ? `/system/users/${d.me.id}` : "/system",
  }), [badges, palette, alerts, d]);

  return (
    <AlertsCtx.Provider value={{ open: () => setAlerts(true) }}>
      <OpsShellCtx.Provider value={value}>
        {children}
        <ShortcutSheet open={help} onClose={() => setHelp(false)} />
        <SystemTabBar badges={badges} unread={d?.alertsUnread ?? 0} />
      </OpsShellCtx.Provider>
    </AlertsCtx.Provider>
  );
}

// ---------------------------------------------------------------- banner stack (break-glass → impersonation → maintenance → offline)
function SystemBanners() {
  const { locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const qc = useQueryClient();
  const online = useOnline();
  const summary = useSystemSummary();
  const d = summary.data;
  const items: ReactNode[] = [];
  const end = async (req: ApiCall, then?: string) => {
    try {
      await unwrap(req(hdr({ idempotent: true })));
      await qc.invalidateQueries({ queryKey: sysKeys.all });
      if (then) router.push(localHref(locale, then));
    } catch (e) {
      toast({ title: sysError(locale, (e as { errorType?: string }).errorType), tone: "danger" });
    }
  };
  if (d?.breakGlass === "active" && d.breakGlassUntil)
    items.push(<BreakGlassBanner key="bg" until={d.breakGlassUntil} actor={d.me.name} onEnd={() => end((h) => api.POST("/api/staff/x/break-glass/end", { headers: h }))} />);
  if (d?.impersonation)
    items.push(<ImpersonationBanner key="imp" target={d.impersonation.targetName} reason={d.impersonation.reason} until={d.impersonation.until}
      onEnd={() => end((h) => api.DELETE("/api/staff/impersonate", { headers: h }), `/system/users/${d.impersonation!.targetId}`)} />);
  if (d?.maintenance.on) items.push(<MaintenanceBanner key="mnt" message={d.maintenance.message} until={d.maintenance.until} />);
  if (!online) items.push(<OfflineBanner key="off" since={new Date(summary.dataUpdatedAt || 0).toISOString()} />);
  if (!items.length) return null;
  return <div className="mb-5 grid gap-2">{items}</div>;
}

// ---------------------------------------------------------------- alerts drawer (SH3)
const ALERT_ICON: Record<AlertVM["tone"], { icon: IconName; cls: string }> = {
  danger: { icon: "x", cls: "bg-danger-bg text-danger" },
  warning: { icon: "clock", cls: "bg-warning-bg text-warning" },
  success: { icon: "check", cls: "bg-success-bg text-success" },
  info: { icon: "shield", cls: "bg-navy-50 text-navy-700" },
};
const TABS = ["all", "security", "integrations", "ops"] as const;
function SystemBell({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  const s = useS();
  const { locale } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const q = useAlerts();
  const mark = useMarkAlerts();
  const list = q.data?.items ?? [];
  const unread = list.filter((a) => !a.read).length;
  const shown = list.filter((a) => tab === "all" || a.kind === (tab as AlertKind));
  const go = (a: AlertVM) => {
    if (!a.read) mark.mutate([a.id]);
    setOpen(false);
    router.push(localHref(locale, a.href));
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`${s.shell.alerts}${unread ? ` (${unread} ${s.shell.unread})` : ""}`}
        className="relative flex size-10 items-center justify-center hover:bg-navy-50 m-press">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0" /></svg>
        {unread > 0 && <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center bg-danger text-[0.65rem] font-semibold text-white tabular m-pop">{unread}</span>}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} side="right" title={`${s.shell.alerts}${unread ? ` (${unread})` : ""}`}
        footer={
          <div className="grid w-full gap-3">
            <div className="flex items-center justify-between">
              <button type="button" className="text-small underline underline-offset-4 disabled:opacity-50" disabled={!unread || mark.isPending} onClick={() => mark.mutate("all")}>{s.shell.markAll}</button>
              <Link href={localHref(locale, "/system/audit")} onClick={() => setOpen(false)} className="inline-flex items-center gap-1 text-small text-link hover:text-link-hover">{s.shell.viewAll}<Icon name="arrowRight" size={13} aria-hidden /></Link>
            </div>
          </div>
        }>
        <div role="tablist" aria-label={s.shell.alerts} className="-mt-1 mb-3 flex gap-1 overflow-x-auto border-b border-border no-scrollbar">
          {TABS.map((t) => (
            <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}
              className={cx("-mb-px h-10 shrink-0 border-b-2 px-3 text-small transition-colors", tab === t ? "border-gold-400 font-medium text-navy-700" : "border-transparent text-fg-muted")}>
              {s.shell.alertsTabs[t]}
            </button>
          ))}
        </div>
        {q.isPending ? (
          <div className="grid gap-2" aria-busy>{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 m-shimmer" />)}</div>
        ) : q.isError ? (
          <div role="alert" className="grid place-items-center gap-2 py-10 text-center text-small">
            <p className="text-danger">{fill(s.states.loadFailed, { what: s.shell.alerts.toLowerCase() })}</p>
            <button type="button" onClick={() => q.refetch()} className="h-9 border border-border-strong px-4 m-press">{s.states.retry}</button>
          </div>
        ) : !shown.length ? (
          <div className="grid place-items-center gap-2 py-12 text-center"><Icon name="check" size={22} aria-hidden className="text-success" /><p className="text-small text-fg-muted">{s.shell.noAlerts}</p></div>
        ) : (
          <ul className="grid gap-1 m-stagger">
            {shown.map((a, i) => (
              <li key={a.id} style={{ ["--i" as string]: i }}>
                <button type="button" onClick={() => go(a)} className="grid w-full grid-cols-[2rem_1fr_auto] items-start gap-3 p-2.5 text-left hover:bg-navy-50">
                  <span className={cx("flex size-8 items-center justify-center", ALERT_ICON[a.tone].cls)}><Icon name={ALERT_ICON[a.tone].icon} size={15} aria-hidden /></span>
                  <span className="min-w-0">
                    <span className={cx("block text-small", !a.read && "font-medium")}>{a.title}</span>
                    {a.detail && <span className="block truncate text-eyebrow text-fg-subtle">{a.detail}</span>}
                  </span>
                  <span className="flex items-center gap-1.5 text-eyebrow text-fg-subtle tabular">
                    {formatRelative(a.at, locale)}
                    {!a.read && <span aria-label={s.shell.unread} className="size-2 rounded-full bg-navy-700" />}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------- phone tab bar + More (PS1)
const TAB: { href: string; key: "home" | "approvals" | "users"; icon: IconName }[] = [
  { href: "/system", key: "home", icon: "layers" },
  { href: "/system/approvals", key: "approvals", icon: "fileCheck" },
  { href: "/system/users", key: "users", icon: "users" },
];
const MORE: { href: string; key: keyof ReturnType<typeof useS>["nav"]; icon: IconName }[] = [
  { href: "/system/roles", key: "roles", icon: "shield" },
  { href: "/system/access-reviews", key: "accessReviews", icon: "check" },
  { href: "/system/sod", key: "sod", icon: "zap" },
  { href: "/system/identity", key: "identity", icon: "user" },
  { href: "/system/break-glass", key: "breakGlass", icon: "lock" },
  { href: "/system/settings/general", key: "settings", icon: "refresh" },
  { href: "/system/integrations", key: "integrations", icon: "globe" },
  { href: "/system/notifications", key: "notifications", icon: "message" },
  { href: "/system/audit", key: "audit", icon: "file" },
  { href: "/system/privacy", key: "privacy", icon: "lock" },
  { href: "/system/ops", key: "ops", icon: "chart" },
];
function SystemTabBar({ badges, unread }: { badges: Record<string, NavBadge>; unread: number }) {
  const s = useS();
  const { locale } = useI18n();
  const path = stripLocale(usePathname());
  const { open } = useAlertsDrawer();
  const [more, setMore] = useState(false);
  const on = (h: string) => (h === "/system" ? path === "/system" : path === h || path.startsWith(`${h}/`));
  const moreOn = MORE.some((m) => on(m.href));
  const cell = (active: boolean) => cx("relative flex h-16 w-full flex-col items-center justify-center gap-1 text-[0.72rem] m-press", active ? "font-medium text-navy-700" : "text-fg-subtle");
  const pill = (active: boolean) => cx("relative flex h-7 w-12 items-center justify-center transition-colors duration-200", active && "bg-gold-200");
  const tab = (t: (typeof TAB)[number]) => (
    <li key={t.href}>
      <Link href={localHref(locale, t.href)} aria-current={on(t.href) ? "page" : undefined} className={cell(on(t.href))}>
        <span className={pill(on(t.href))}>
          <Icon name={t.icon} size={20} aria-hidden />
          {badges[t.href]?.n ? <span className="absolute -top-1 right-0.5"><CountBadge n={badges[t.href].n} tone={badges[t.href].tone ?? "neutral"} /></span> : null}
        </span>
        {s.nav[t.key]}
      </Link>
    </li>
  );
  return (
    <>
      <nav aria-label={s.nav.more} data-bottom-bar className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="grid grid-cols-5">
          {tab(TAB[0])}
          {tab(TAB[1])}
          <li>
            <button type="button" onClick={open} aria-haspopup="dialog" className={cell(false)}>
              <span className={pill(false)}>
                <Icon name="zap" size={20} aria-hidden />
                {unread > 0 && <span className="absolute -top-1 right-0.5"><CountBadge n={unread} tone="danger" /></span>}
              </span>
              {s.nav.alerts}
            </button>
          </li>
          {tab(TAB[2])}
          <li>
            <button type="button" onClick={() => setMore(true)} aria-haspopup="dialog" aria-current={moreOn ? "page" : undefined} className={cell(moreOn)}>
              <span className={pill(moreOn)}><Icon name="menu" size={20} aria-hidden /></span>
              {s.nav.more}
            </button>
          </li>
        </ul>
      </nav>
      <div className="h-16 lg:hidden" aria-hidden />
      <Dialog open={more} onClose={() => setMore(false)} side="bottom" title={s.nav.more}>
        <div className="mb-3 flex items-center justify-between border border-border bg-bg-subtle p-3"><EnvPill env={ENV} /></div>
        <ul className="grid gap-1 sm:grid-cols-2">
          {MORE.map((m) => (
            <li key={m.href}>
              <Link href={localHref(locale, m.href)} onClick={() => setMore(false)} aria-current={on(m.href) ? "page" : undefined}
                className="flex h-12 items-center gap-3 px-3 hover:bg-navy-50 aria-[current=page]:bg-navy-50 aria-[current=page]:font-medium aria-[current=page]:text-navy-700">
                <Icon name={m.icon} size={18} aria-hidden />{s.nav[m.key]}
                {badges[m.href]?.n ? <span className="ml-auto"><CountBadge n={badges[m.href].n} tone={badges[m.href].tone ?? "neutral"} /></span> : <Icon name="arrowRight" size={14} className="ml-auto text-fg-subtle" aria-hidden />}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-small text-fg-muted">{s.shell.language}</span>
          <LocaleSwitcher />
        </div>
      </Dialog>
    </>
  );
}
