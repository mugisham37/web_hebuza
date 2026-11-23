"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { stripLocale } from "@/shared/i18n/config";
import { useSession } from "@/lib/auth/session";
import { ROLE_META, homeFor, mayEnter, type Role, type Workspace } from "@/shared/auth/roles";
import { WORKSPACE_NAV, QUICK_ACTIONS, navFor, type NavItem } from "@/lib/nav";
import { cx } from "@/shared/format";
import { Avatar } from "@/components/atoms/misc";
import { Dialog } from "@/components/atoms/dialog";
import { Spinner } from "@/components/atoms/feedback";
import { Wordmark } from "@/components/organisms/site/site-header";
import { Icon, WhatsAppGlyph, type IconName } from "@/components/atoms/icon";
import { waLink } from "@/content/marketing";
import { useOpsShell } from "@/components/organisms/layout/ops-shell";
import { WorkspaceTabs } from "@/components/molecules/layout/workspace-tabs";
import { LocaleSwitcher } from "@/components/organisms/layout/locale-switcher";
import { SessionExpiryModal } from "@/components/organisms/layout/session-expiry";
import { MfaSuggest } from "@/components/organisms/auth/mfa-suggest";
import { PhoneSuggest } from "@/components/organisms/auth/phone-suggest";
import { WorkerBanner } from "@/components/organisms/layout/worker-banner";
import { PurchaseRequestMount } from "@/components/organisms/procurement/pr-mount";
import { WipeSheet } from "@/components/organisms/field/field-settings";
import { start as startField, engineState, wipeAll } from "@/lib/field/sync";
import { pendingCount } from "@/lib/field/queue";

function WorkspaceLabel({ current }: { current: Workspace }) {
  const { t } = useI18n();
  return <span className="text-label">{t(`workspace.${current}`)}</span>;
}

/** Ctrl/⌘+K command palette: shell extras (ops ids/actions), quick actions, then the workspace's nav (R-18, plan 11 §8.4). */
function CommandPalette({ workspace }: { workspace: Workspace }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const listId = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const roles = user?.roles ?? [];
  const needle = q.trim().toLowerCase();
  const match = (label: string, href: string) => !needle || label.toLowerCase().includes(needle) || href.toLowerCase().includes(needle);
  const member = !roles.length || roles.some((r) => r !== "visitor" && ROLE_META[r as Exclude<Role, "visitor">].workspace === workspace);
  const allowed = (i: NavItem) => member || !!i.grant?.some((g) => roles.includes(g));
  const extras = useOpsShell()?.palette(q) ?? [];
  // Extras carry absolute (already localised) hrefs; quick actions and nav are locale-relative.
  const rows = [
    ...extras.map((r) => ({ key: `x${r.href}${r.label}`, group: r.group, label: r.label, hint: r.hint, href: r.href })),
    ...(QUICK_ACTIONS[workspace] ?? []).filter(allowed).map((i) => ({ key: `q${i.href}`, group: t("palette.quick"), label: t(i.label), hint: undefined, href: localHref(locale, i.href) })),
    ...navFor(workspace, roles).map((i) => ({ key: `n${i.href}`, group: t("palette.pages"), label: t(i.label), hint: undefined, href: localHref(locale, i.href) })),
  ].filter((r, idx, all) => match(r.label, r.href) && all.findIndex((o) => o.href === r.href) === idx);
  const active = Math.min(cursor, Math.max(rows.length - 1, 0));
  const close = () => { setOpen(false); setQ(""); setCursor(0); };
  const go = (href: string) => { close(); router.push(href); };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-keyshortcuts="Control+K Meta+K" className="hidden h-10 items-center gap-3 border border-border-strong bg-surface px-4 text-small text-fg-subtle hover:border-ink-400 md:flex">
        {t("common.search")}… <kbd className="border border-border bg-bg-subtle px-1.5 text-eyebrow text-fg-muted">Ctrl K</kbd>
      </button>
      <button type="button" onClick={() => setOpen(true)} aria-label={t("common.search")} className="flex size-10 items-center justify-center hover:bg-navy-50 md:hidden">
        <Icon name="search" size={20} aria-hidden />
      </button>
      <Dialog open={open} onClose={close} title={t("common.search")}>
        <input autoFocus value={q} placeholder={t("palette.placeholder")} role="combobox" aria-expanded aria-controls={listId}
          aria-activedescendant={rows[active] ? `${listId}-${active}` : undefined} aria-label={t("palette.placeholder")}
          onChange={(e) => { setQ(e.target.value); setCursor(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, rows.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
            else if (e.key === "Enter" && rows[active]) { e.preventDefault(); go(rows[active].href); }
          }}
          className="mb-3 h-12 w-full border border-border-strong bg-surface px-3.5 hover:border-ink-400 focus:border-navy-700" />
        {rows.length ? (
          <ul id={listId} role="listbox" aria-label={t("common.search")} className="grid max-h-[60dvh] gap-1 overflow-y-auto">
            {rows.map((r, i) => (
              <li key={r.key} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                <button type="button" tabIndex={-1} onClick={() => go(r.href)} onMouseMove={() => setCursor(i)}
                  className={cx("flex w-full items-center gap-3 px-3 py-2.5 text-left", i === active ? "bg-navy-50 text-navy-700" : "hover:bg-navy-50")}>
                  <span className="w-20 shrink-0 truncate text-eyebrow text-fg-subtle">{r.group}</span>
                  <span className="min-w-0 flex-1 truncate">{r.label}</span>
                  {r.hint && <span className="text-eyebrow text-fg-subtle">{r.hint}</span>}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p role="status" className="py-8 text-center text-small text-fg-muted">{t("palette.empty", { q })}</p>
        )}
      </Dialog>
    </>
  );
}

function UserMenu() {
  const { t, locale } = useI18n();
  const { user, signOut } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fieldWarn, setFieldWarn] = useState(false);
  if (!user) return null;
  // Field devices hold an offline outbox: never drop unsynced items silently on sign-out (plan 09 §2.6, SY5).
  const onSignOut = async () => {
    setOpen(false);
    let field = false;
    try { field = localStorage.getItem("field.knownAgent") === "1"; } catch {}
    if (field) {
      await startField(user.id);
      if (pendingCount(engineState().ops) > 0) return setFieldWarn(true);
      await wipeAll("signout");
    }
    await signOut();
    router.push(localHref(locale, "/login"));
  };
  return (
    <div className="relative">
      <WipeSheet mode={fieldWarn ? "signout" : null} onClose={() => setFieldWarn(false)} />
      <button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 p-1 hover:bg-navy-50">
        <Avatar name={user.name} size="sm" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-64 border border-border bg-surface p-2 shadow-lg">
          <div className="border-b border-border px-3 py-2">
            <p className="text-label">{user.name}</p>
            <p className="text-small text-fg-subtle">{user.roles.map((r) => t(`role.${r}`)).join(" · ")}</p>
          </div>
          <Link role="menuitem" href={localHref(locale, "/settings")} className="block px-3 py-2 hover:bg-navy-50" onClick={() => setOpen(false)}>{t("wsnav.settings")}</Link>
          <button role="menuitem" type="button" className="w-full px-3 py-2 text-left hover:bg-navy-50"
            onClick={onSignOut}>{t("nav.signOut")}</button>
          <div className="px-3 py-2"><LocaleSwitcher /></div>
        </div>
      )}
    </div>
  );
}

/** Nav icon by route's first segment (WORKSPACE_NAV carries labels only). */
const NAV_ICON: Record<string, IconName> = {
  system: "layers", users: "users", roles: "briefcase", "access-reviews": "check", sod: "refresh", identity: "user", "break-glass": "zap",
  integrations: "globe", audit: "file", privacy: "lock", // Stage 6 (later keys win for shared names like approvals/settings)
  dashboard: "layers", requests: "file", messages: "message", documents: "fileCheck", billing: "wallet", history: "clock",
  bookings: "calendar", orgs: "building", notifications: "zap", help: "search", settings: "user",
  ops: "layers", intake: "upload", cases: "file", workload: "users", sla: "clock", reviews: "fileCheck", tickets: "shield",
  conversations: "message", catalogue: "briefcase", workforce: "graduation", knowledge: "search", statuses: "refresh",
  agent: "layers", offers: "sparkle", inbox: "message", calendar: "calendar", clients: "users", earnings: "wallet", performance: "chart", profile: "user",
  finance: "layers", approvals: "shield", quotes: "file", invoices: "fileCheck", payments: "wallet", reconciliation: "refresh",
  receivables: "clock", refunds: "arrowUpRight", revenue: "chart", payouts: "card", reports: "briefcase", subscriptions: "calendar",
};
const navIcon = (href: string): IconName => NAV_ICON[href.split("/").filter(Boolean).at(-1) ?? ""] ?? NAV_ICON[href.split("/")[1]] ?? "layers";

function SideNav({ workspace, onNavigate, dark }: { workspace: Workspace; onNavigate?: () => void; dark?: boolean }) {
  const { t, locale } = useI18n();
  const path = stripLocale(usePathname());
  const { user } = useSession();
  const shell = useOpsShell();
  const hidden = shell?.hidden;
  const items = useMemo(() => navFor(workspace, user?.roles ?? []).filter((i) => !hidden?.includes(i.href)), [workspace, user?.roles, hidden]);
  const badges = shell?.badges ?? {};
  // Longest matching prefix is active (so /ops/cases doesn't also light up /ops).
  // The workspace home (first item, e.g. /ops) is only active on its exact path, so /ops/assign/… doesn't light up "Today".
  const active = useMemo(() => items.filter((i, idx) => path === i.href || (path.startsWith(`${i.href}/`) && !(idx === 0 && items.some((o, j) => j > 0 && o.href.startsWith(`${i.href}/`))))).sort((a, b) => b.href.length - a.href.length)[0]?.href, [items, path]);
  return (
    <ul className="grid gap-0.5">
      {items.map((i) => (
        <li key={i.href}>
          <Link href={localHref(locale, i.href)} onClick={onNavigate} aria-current={i.href === active ? "page" : undefined}
            className={cx("flex h-11 items-center gap-3 border-l-3 px-4 text-button transition-colors",
              i.href === active ? (dark ? "border-primary bg-primary/12 text-primary" : "border-navy-700 bg-navy-50 text-navy-700") : dark ? "border-transparent text-navy-200 hover:bg-white/5 hover:text-white" : "border-transparent text-fg-muted hover:bg-navy-50 hover:text-navy-700")}>
            <Icon name={navIcon(i.href)} size={18} aria-hidden /><span className="flex-1">{t(i.label)}</span>
            {badges[i.href]?.n ? <span className={cx("inline-flex h-5 min-w-5 items-center justify-center px-1.5 text-[0.7rem] font-semibold tabular", badges[i.href].tone === "danger" ? "bg-danger text-white" : badges[i.href].tone === "attention" ? "bg-gold-400 text-on-gold" : dark ? "bg-white/15 text-white" : "bg-ink-100 text-ink-700")}>{badges[i.href].n}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function AccountCard() {
  const { t, locale } = useI18n();
  const { user } = useSession();
  const href = useOpsShell()?.accountHref ?? "/settings";
  if (!user) return null;
  return (
    <Link href={localHref(locale, href)} className="flex items-center gap-3 border border-white/10 bg-white/5 p-3 hover:bg-white/10">
      <Avatar name={user.name} size="sm" className="ring-navy-900" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label">{user.name}</span>
        <span className="block truncate text-eyebrow text-navy-200">{user.roles.map((r) => t(`role.${r}`)).join(" · ")}</span>
      </span>
      <Icon name="arrowRight" size={14} aria-hidden className="text-navy-200" />
    </Link>
  );
}

/** App shell for every signed-in workspace: sidebar (≥1200px) / drawer, top bar, switcher, palette, bell, user menu. */
export function WorkspaceShell({ workspace, children }: { workspace: Workspace; children: ReactNode }) {
  const { t, locale } = useI18n();
  const { status, user } = useSession();
  const [drawer, setDrawer] = useState(false);
  const ops = useOpsShell();
  const router = useRouter();
  const pathname = usePathname();
  // Client-side twin of the proxy workspace guard: a role that can't use this workspace goes to its own home.
  const blocked = !!user && !mayEnter(user.roles, workspace, stripLocale(pathname));
  useEffect(() => { if (blocked && user) router.replace(localHref(locale, homeFor(user.roles))); }, [blocked, user, router, locale]);

  return (
    <div className="min-h-dvh bg-bg-subtle lg:grid lg:grid-cols-[16rem_1fr]">
      <a href="#main" className="sr-only-focusable bg-secondary px-4 py-2 text-on-navy">{t("common.skipToContent")}</a>
      {/* SH1: navy rail — icon nav, help links, "start a request" card, account card. */}
      <aside className="sticky top-0 theme-dark hidden h-dvh flex-col gap-5 bg-navy-900 p-4 text-white lg:flex">
        <Wordmark href={localHref(locale, "/")} className="px-2 pt-2 text-white" />
        <nav aria-label={t(`workspace.${workspace}`)} className="flex-1 overflow-y-auto"><SideNav workspace={workspace} dark /></nav>
        <div className="grid gap-0.5 border-t border-white/10 pt-3">
          <a href={waLink("Muraho HEBUZA")} target="_blank" rel="noopener" className="flex h-10 items-center gap-3 px-4 text-small text-navy-200 hover:bg-white/5 hover:text-white"><WhatsAppGlyph size={16} />WhatsApp</a>
        </div>
        {workspace === "client" && (
          <Link href={localHref(locale, "/services")} className="group grid gap-2 border-t-3 border-gold-400 bg-navy-800 p-4 text-white">
            <span className="text-label">{t("nav.start")}</span>
            <span className="inline-flex h-8 w-fit items-center gap-1.5 bg-primary px-3 text-eyebrow text-on-gold group-hover:bg-primary-hover">{t("nav.services")}<Icon name="arrowRight" size={14} aria-hidden className="transition-transform group-hover:translate-x-0.5" /></span>
          </Link>
        )}
        <AccountCard />
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-1.5 sm:gap-3 border-b border-border bg-bg/95 px-gutter backdrop-blur pt-[env(safe-area-inset-top)] lg:px-8">
          <button type="button" className="flex size-10 items-center justify-center hover:bg-navy-50 lg:hidden" aria-label={t("common.menu")} onClick={() => setDrawer(true)}>
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <WorkspaceLabel current={workspace} />
          {ops?.headerExtra}
          <div className="ml-auto flex items-center gap-0.5 sm:gap-2">
            <CommandPalette workspace={workspace} />
            <span className="hidden xl:block"><LocaleSwitcher /></span>
            {ops?.bell ?? (
              <Link href={localHref(locale, "/notifications")} aria-label={t("notifications.title")} className="flex size-10 items-center justify-center hover:bg-navy-50">
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0" /></svg>
              </Link>
            )}
            <UserMenu />
          </div>
        </header>
        <WorkspaceTabs current={workspace} />
        <main id="main" className="min-w-0 flex-1 px-gutter py-8 lg:px-8">
          <WorkerBanner />
          {ops?.banner}
          {status === "loading" ? <Spinner /> : children}
        </main>
      </div>
      <Dialog open={drawer} onClose={() => setDrawer(false)} title={t(`workspace.${workspace}`)} side="right">
        <SideNav workspace={workspace} onNavigate={() => setDrawer(false)} />
      </Dialog>
      {workspace !== "client" && <PurchaseRequestMount />}
      <SessionExpiryModal />
      <MfaSuggest />
      <PhoneSuggest />
    </div>
  );
}

/** Placeholder body for routes scheduled in later stages. */
export function PlannedPage({ workspace }: { workspace: Workspace }) {
  const { t } = useI18n();
  const path = stripLocale(usePathname());
  const item = WORKSPACE_NAV[workspace].items.find((i) => i.href === path);
  return (
    <div className="grid gap-4">
      <h1 className="text-h2 text-fg-heading">{item ? t(item.label) : t(`workspace.${workspace}`)}</h1>
      <div className="border border-dashed border-border-strong bg-grad-sky-wash p-8">
        <p className="text-label-lg">{t("placeholder.stage")}</p>
        <p className="mt-1 text-body text-fg-muted">{t("placeholder.plannedIn", { stage: `Stage ${WORKSPACE_NAV[workspace].stage}` })}</p>
      </div>
    </div>
  );
}
