"use client";
// Marketing shell extras (plan 10 U2, board marketing/02 SH1–3, PS1): nav badges, ⌘K actions + id search, bell,
// offline / reviewer banner, G-chords, phone tab bar Home·Leads·Inbox·Campaigns·More. Consumed by WorkspaceShell via OpsShellCtx.
import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { stripLocale } from "@/shared/i18n/config";
import { useSession } from "@/lib/auth/session";
import { cx, formatRelative } from "@/shared/format";
import { navFor } from "@/lib/nav";
import { mayEnter } from "@/shared/auth/roles";
import { useShortcut } from "@/lib/ops/shortcuts";
import { useMktNotes, useMktShell } from "@/lib/marketing/api";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Dialog } from "@/components/atoms/dialog";
import { OpsShellCtx, ShortcutSheet, type NavBadge, type PaletteItem } from "@/components/organisms/layout/ops-shell";
import { CountBadge } from "@/components/atoms/ops";
import { LocaleSwitcher } from "@/components/organisms/layout/locale-switcher";
import { useOnline } from "@/components/atoms/hooks";
import { NoAccess, useM } from "@/components/atoms/marketing";
import { notifCopy } from "@/content/pages/notification-types";

const LEAD = /^LD-\d{4}-\d{3,5}$/i;
const CAMP = /^CP-\d{4}-\d{2,3}$/i;

export function MarketingProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  const m = useM();
  const router = useRouter();
  const { user } = useSession();
  const shell = useMktShell();
  const L = useMemo(() => (p: string) => localHref(locale, p), [locale]);
  const b = shell.data?.badges;
  const member = !!user?.roles.includes("staff:marketing");
  const badges = useMemo<Record<string, NavBadge>>(() => b ? {
    "/marketing/leads": { n: b.leads, tone: b.leads ? "attention" : undefined },
    "/marketing/inbox": { n: b.inbox },
    "/marketing/testimonials": { n: b.testimonials },
    "/marketing/content": { n: b.content, tone: b.content ? "attention" : undefined },
    "/marketing/campaigns": { n: b.campaigns, tone: b.campaigns ? "attention" : undefined },
  } : ({} as Record<string, NavBadge>), [b]);

  const palette = useMemo(() => (q: string): PaletteItem[] => {
    const n = q.trim();
    const g = m.shell.actions;
    const actions: PaletteItem[] = member ? [
      { group: g, label: m.shell.newCampaign, hint: "N C", href: L("/marketing/campaigns/new") },
      { group: g, label: m.shell.newGuide, hint: "G N", href: L("/marketing/knowledge?new=1") },
      { group: g, label: m.shell.newLanding, href: L("/marketing/landing?new=1") },
      { group: g, label: m.shell.newPage, href: L("/marketing/content?new=1") },
      { group: g, label: m.shell.newLead, href: L("/marketing/leads?new=1") },
      { group: g, label: m.shell.goLeads, hint: "G L", href: L("/marketing/leads") },
      { group: g, label: m.shell.goContent, hint: "G C", href: L("/marketing/content") },
      { group: g, label: m.shell.goReports, href: L("/marketing/reports") },
    ] : [{ group: g, label: m.shell.goContent, href: L("/marketing/content") }];
    if (!n) return actions;
    const found: PaletteItem[] = LEAD.test(n) ? [{ group: m.shell.findLead, label: n.toUpperCase(), href: L(`/marketing/leads?lead=${n.toUpperCase()}`) }]
      : CAMP.test(n) ? [{ group: m.shell.findCampaign, label: n.toUpperCase(), href: L(`/marketing/campaigns/${n.toUpperCase()}`) }] : [];
    return [...found, ...actions.filter((x) => x.label.toLowerCase().includes(n.toLowerCase()))];
  }, [m, L, member]);

  const [help, setHelp] = useState(false);
  useShortcut("g l", m.shortcuts.goLeads, () => router.push(L("/marketing/leads")));
  useShortcut("g c", m.shortcuts.goContent, () => router.push(L("/marketing/content")));
  useShortcut("g m", m.shortcuts.goCampaigns, () => router.push(L("/marketing/campaigns")));
  useShortcut("?", m.shortcuts.help, () => setHelp(true));

  const value = useMemo(() => ({ badges, palette, headerExtra: null, bell: <MarketingBell />, banner: <MarketingBanner member={member} />, accountHref: "/settings" }), [badges, palette, member]);
  return (
    <OpsShellCtx.Provider value={value}>
      {children}
      <ShortcutSheet open={help} onClose={() => setHelp(false)} />
      <MarketingTabBar badges={badges} />
    </OpsShellCtx.Provider>
  );
}

/** Client twin of the proxy guard: anyone without access gets NoAccess inside the shell. */
export function MarketingGate({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const path = stripLocale(usePathname());
  return !user || mayEnter(user.roles, "marketing", path) ? children : <NoAccess />;
}

const NOTE_ICON: Record<string, { icon: IconName; cls: string }> = {
  lead: { icon: "user", cls: "bg-info-bg text-info" }, task: { icon: "clock", cls: "bg-warning-bg text-warning" }, review: { icon: "search", cls: "bg-navy-50 text-navy-700" },
  cms: { icon: "file", cls: "bg-ink-100 text-ink-700" }, approval: { icon: "shield", cls: "bg-navy-50 text-navy-700" }, campaign: { icon: "megaphone", cls: "bg-success-bg text-success" },
  budget: { icon: "wallet", cls: "bg-danger-bg text-danger" }, template: { icon: "message", cls: "bg-danger-bg text-danger" }, seo: { icon: "globe", cls: "bg-warning-bg text-warning" },
  testimonial: { icon: "sparkle", cls: "bg-gold-100 text-gold-800" },
};
function MarketingBell() {
  const m = useM();
  const { locale } = useI18n();
  const q = useMktNotes();
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<Set<string>>(new Set());
  const list = (q.data?.items ?? []).map((n) => ({ ...n, read: n.read || read.has(n.id) }));
  const unread = list.filter((n) => !n.read).length;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`${m.shell.notifications}${unread ? ` (${unread})` : ""}`} className="relative flex size-10 items-center justify-center hover:bg-navy-50 m-press">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0" /></svg>
        {unread > 0 && <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center bg-danger text-[0.65rem] font-semibold text-white tabular m-pop">{unread}</span>}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} side="right" title={m.shell.notifications}
        footer={<button type="button" className="text-small underline underline-offset-4" onClick={() => setRead(new Set(list.map((n) => n.id)))}>{m.shell.markAll}</button>}>
        {q.isPending ? <div className="grid gap-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 m-shimmer" />)}</div>
          : q.isError ? <p role="alert" className="py-10 text-center text-small text-danger">{m.states.error}</p>
          : !list.length ? <p className="py-10 text-center text-small text-fg-muted">{m.shell.empty}</p> : (
          <ul className="grid gap-1 m-stagger">
            {list.map((n, i) => {
              const ic = NOTE_ICON[n.kind] ?? NOTE_ICON.cms;
              return (
                <li key={n.id} style={{ ["--i" as string]: i }}>
                  <Link href={localHref(locale, n.href)} onClick={() => { setRead((r) => new Set(r).add(n.id)); setOpen(false); }} className="grid grid-cols-[2rem_1fr_auto] items-start gap-3 p-2.5 hover:bg-navy-50">
                    <span className={cx("flex size-8 items-center justify-center", ic.cls)}><Icon name={ic.icon} size={15} aria-hidden /></span>
                    <span className={cx("min-w-0 text-small", !n.read && "font-medium")}>{notifCopy(locale, (n as { type?: string }).type, (n as { vars?: Record<string, string> }).vars)?.title ?? n.text}</span>
                    <span className="flex items-center gap-1.5 text-eyebrow text-fg-subtle tabular">{formatRelative(n.at, locale)}{!n.read && <span aria-label="unread" className="size-2 rounded-full bg-navy-700" />}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Dialog>
    </>
  );
}

function MarketingBanner({ member }: { member: boolean }) {
  const m = useM();
  const online = useOnline();
  const items: ReactNode[] = [];
  if (!online) items.push(<Bar key="off" cls="bg-ink-900 text-white" icon="globe">{m.shell.offline}</Bar>);
  if (!member) items.push(<Bar key="ro" cls="bg-info-bg text-info" icon="shield">{m.shell.readOnly}</Bar>);
  return items.length ? <div className="mb-5 grid gap-2">{items}</div> : null;
}
function Bar({ cls, icon, children }: { cls: string; icon: IconName; children: ReactNode }) {
  return <div role="status" className={cx("flex items-center gap-3 px-4 py-3 text-small m-rise", cls)}><Icon name={icon} size={18} aria-hidden /><p className="min-w-0 flex-1">{children}</p></div>;
}

const TABS: { href: string; key: "home" | "leads" | "inbox" | "campaigns"; icon: IconName }[] = [
  { href: "/marketing", key: "home", icon: "layers" },
  { href: "/marketing/leads", key: "leads", icon: "users" },
  { href: "/marketing/inbox", key: "inbox", icon: "message" },
  { href: "/marketing/campaigns", key: "campaigns", icon: "megaphone" },
];
function MarketingTabBar({ badges }: { badges: Record<string, NavBadge> }) {
  const m = useM();
  const { locale, t } = useI18n();
  const { user } = useSession();
  const path = stripLocale(usePathname());
  const [more, setMore] = useState(false);
  const nav = navFor("marketing", user?.roles ?? []);
  const allowed = nav.map((i) => i.href);
  const tabs = TABS.filter((x) => allowed.includes(x.href));
  const moreItems = nav.filter((i) => !TABS.some((x) => x.href === i.href));
  const on = (h: string) => (h === "/marketing" ? path === "/marketing" : path === h || path.startsWith(`${h}/`));
  const moreOn = moreItems.some((x) => on(x.href));
  return (
    <>
      <nav aria-label={m.nav.more} data-bottom-bar className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
          {tabs.map((x) => (
            <li key={x.href}>
              <Link href={localHref(locale, x.href)} aria-current={on(x.href) ? "page" : undefined}
                className={cx("relative flex h-16 flex-col items-center justify-center gap-1 text-[0.72rem] m-press", on(x.href) ? "font-medium text-navy-700" : "text-fg-subtle")}>
                <span className={cx("relative flex h-7 w-12 items-center justify-center transition-colors duration-200", on(x.href) && "bg-gold-200")}>
                  <Icon name={x.icon} size={20} aria-hidden />
                  {badges[x.href]?.n ? <span className="absolute -top-1 right-0.5"><CountBadge n={badges[x.href].n} tone={badges[x.href].tone ?? "neutral"} /></span> : null}
                </span>
                <span className="max-w-full truncate px-1">{m.nav[x.key]}</span>
              </Link>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => setMore(true)} aria-haspopup="dialog" aria-current={moreOn ? "page" : undefined}
              className={cx("flex h-16 w-full flex-col items-center justify-center gap-1 text-[0.72rem] m-press", moreOn ? "font-medium text-navy-700" : "text-fg-subtle")}>
              <span className={cx("flex h-7 w-12 items-center justify-center", moreOn && "bg-gold-200")}><Icon name="menu" size={20} aria-hidden /></span>
              {m.nav.more}
            </button>
          </li>
        </ul>
      </nav>
      <div className="h-16 lg:hidden" aria-hidden />
      <Dialog open={more} onClose={() => setMore(false)} side="bottom" title={m.nav.more}>
        <ul className="grid gap-1">
          {moreItems.map((x) => (
            <li key={x.href}>
              <Link href={localHref(locale, x.href)} onClick={() => setMore(false)} aria-current={on(x.href) ? "page" : undefined} className="flex h-12 items-center gap-3 px-3 hover:bg-navy-50 aria-[current=page]:bg-navy-50 aria-[current=page]:font-medium aria-[current=page]:text-navy-700">
                {t(x.label)}
                {badges[x.href]?.n ? <CountBadge n={badges[x.href].n} tone={badges[x.href].tone ?? "neutral"} /> : null}
                <Icon name="arrowRight" size={14} className="ml-auto text-fg-subtle" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-small text-fg-muted">{m.shell.language}</span>
          <LocaleSwitcher />
        </div>
      </Dialog>
    </>
  );
}
