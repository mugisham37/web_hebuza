"use client";
// Procurement shell extras (plan 12 H1/SH2/PS1, §8): live nav badges, ⌘K actions + number search, bell with tabs,
// offline banner, G-chords, phone tab bar Home·Requests·Bills·Contracts·More. Consumed by WorkspaceShell via OpsShellCtx.
import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { stripLocale } from "@/shared/i18n/config";
import { useSession } from "@/lib/auth/session";
import { mayEnter } from "@/shared/auth/roles";
import { navFor } from "@/lib/nav";
import { cx, formatRelative } from "@/shared/format";
import { useShortcut } from "@/lib/ops/shortcuts";
import { useProcNotes, useProcSummary } from "@/lib/procurement/api";
import type { ProcNote } from "@/shared/procurement/types";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Dialog } from "@/components/atoms/dialog";
import { OpsShellCtx, ShortcutSheet, type NavBadge, type PaletteItem } from "@/components/organisms/layout/ops-shell";
import { CountBadge } from "@/components/atoms/ops";
import { LocaleSwitcher } from "@/components/organisms/layout/locale-switcher";
import { useOnline } from "@/components/atoms/hooks";
import { useP } from "@/components/atoms/procurement";
import { ProcNoAccess } from "@/components/molecules/procurement/procurement";

const NUMBER = /^(PR|PO|GRN|BL|VP|RA|CT|DP|ADV|V)-[\w-]+$/i;
/** Where a typed document number opens (⌘K prefix search, §8.3). */
export const numberHref = (raw: string) => {
  const n = raw.trim().toUpperCase();
  const p = n.split("-")[0];
  return p === "PR" ? `/procurement/requests/${n}` : p === "PO" ? `/procurement/orders/${n}` : p === "BL" ? `/procurement/bills/${n}`
    : p === "GRN" ? `/procurement/receipts?q=${n}` : p === "CT" ? `/procurement/contracts?q=${n}` : p === "V" ? `/procurement/suppliers?q=${n}`
    : p === "DP" || p === "ADV" ? `/procurement/deposits?q=${n}` : `/procurement/payments?q=${n}`;
};

export function ProcurementProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  const p = useP();
  const router = useRouter();
  const s = useProcSummary().data;
  const L = useMemo(() => (x: string) => localHref(locale, x), [locale]);
  const badges = useMemo<Record<string, NavBadge>>(() => (s ? {
    "/procurement/requests": { n: s.badges.requests, tone: "attention" },
    "/procurement/bills": { n: s.badges.bills, tone: s.badges.bills ? "attention" : undefined },
    "/procurement/deposits": { n: s.badges.deposits, tone: s.badges.deposits ? "danger" : undefined },
  } as Record<string, NavBadge> : {}), [s]);
  const palette = useMemo(() => (q: string): PaletteItem[] => {
    const g = p.shell.actions;
    const actions: PaletteItem[] = [
      { group: g, label: p.shell.newSupplier, hint: "N S", href: L("/procurement/suppliers?sheet=new") },
      { group: g, label: p.shell.newContract, href: L("/procurement/contracts?sheet=new") },
      { group: g, label: p.shell.recordGrn, href: L("/procurement/receipts?sheet=grn") },
      { group: g, label: p.shell.enterBill, hint: "N B", href: L("/procurement/bills/new") },
      { group: g, label: p.shell.goAgeing, href: L("/procurement/reports?tab=ageing") },
      { group: g, label: p.shell.requestPurchase, hint: "R P", href: "?pr=new" },
      { group: g, label: p.shell.myRequests, href: "?pr=mine" },
    ];
    const n = q.trim();
    if (!n) return actions;
    const found: PaletteItem[] = NUMBER.test(n) ? [{ group: p.shell.findNumber, label: n.toUpperCase(), href: L(numberHref(n)) }] : [];
    return [...found, ...actions.filter((x) => x.label.toLowerCase().includes(n.toLowerCase()))];
  }, [p, L]);
  const [help, setHelp] = useState(false);
  useShortcut("g b", p.nav.bills, () => router.push(L("/procurement/bills")));
  useShortcut("g r", p.nav.requests, () => router.push(L("/procurement/requests")));
  useShortcut("g c", p.nav.contracts, () => router.push(L("/procurement/contracts")));
  useShortcut("n b", p.shell.enterBill, () => router.push(L("/procurement/bills/new")));
  useShortcut("?", p.shell.actions, () => setHelp(true));
  const value = useMemo(() => ({ badges, palette, headerExtra: null, bell: <ProcBell />, banner: <ProcBanner />, accountHref: "/settings" }), [badges, palette]);
  return (
    <OpsShellCtx.Provider value={value}>
      {children}
      <ShortcutSheet open={help} onClose={() => setHelp(false)} />
      <ProcTabBar badges={badges} />
    </OpsShellCtx.Provider>
  );
}

/** Client twin of the proxy guard: anyone without the procurement seat gets NoAccess inside the shell. */
export function ProcurementGate({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const path = stripLocale(usePathname());
  return !user || mayEnter(user.roles, "procurement", path) ? children : <ProcNoAccess />;
}

// ---------------------------------------------------------------- bell (§8.2) — tabs All · Contracts · Bills · Requests · Deposits
const BELL_TAB: Record<string, "contracts" | "bills" | "requests" | "deposits"> = {
  contract_end: "contracts", notice: "contracts", rent_due: "contracts", document: "contracts", bank_change: "contracts",
  bill_due: "bills", bill_overdue: "bills", bill_exception: "bills", deposit_return: "deposits", pr_decided: "requests",
};
const NOTE_ICON: Record<string, { icon: IconName; cls: string }> = {
  contracts: { icon: "calendar", cls: "bg-navy-50 text-navy-700" }, bills: { icon: "file", cls: "bg-warning-bg text-warning" },
  requests: { icon: "briefcase", cls: "bg-info-bg text-info" }, deposits: { icon: "wallet", cls: "bg-danger-bg text-danger" },
};
export function ProcBell({ items: given, loading }: { items?: ProcNote[]; loading?: boolean } = {}) {
  const p = useP();
  const { locale } = useI18n();
  const q = useProcNotes(!given);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "contracts" | "bills" | "requests" | "deposits">("all");
  const [read, setRead] = useState<Set<string>>(new Set());
  const list = (given ?? q.data?.items ?? []).map((n) => ({ ...n, read: n.read || read.has(n.id), tab: BELL_TAB[n.kind] ?? "bills" }));
  const shown = list.filter((n) => tab === "all" || n.tab === tab);
  const unread = list.filter((n) => !n.read).length;
  const pending = loading ?? q.isPending;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`${p.shell.notifications}${unread ? ` (${unread})` : ""}`} className="relative flex size-10 items-center justify-center hover:bg-navy-50 m-press">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0" /></svg>
        {unread > 0 && <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center bg-danger text-[0.65rem] font-semibold text-white tabular m-pop">{unread > 9 ? "9+" : unread}</span>}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} side="right" title={p.shell.notifications}
        footer={<button type="button" className="text-small underline underline-offset-4" onClick={() => setRead(new Set(list.map((n) => n.id)))}>{p.shell.markAll}</button>}>
        <div role="tablist" aria-label={p.shell.notifications} className="mb-3 flex gap-1 overflow-x-auto">
          {(["all", "contracts", "bills", "requests", "deposits"] as const).map((t) => (
            <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}
              className={cx("h-8 shrink-0 px-3 text-small m-press", tab === t ? "bg-secondary text-on-navy hover:bg-secondary-hover" : "bg-ink-100 text-ink-700 hover:bg-ink-200")}>{p.shell.bellTabs[t]}</button>
          ))}
        </div>
        {pending ? <div className="grid gap-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 m-shimmer" />)}</div>
          : q.isError && !given ? <p role="alert" className="py-10 text-center text-small text-danger">{p.states.error}</p>
          : !shown.length ? <p className="py-10 text-center text-small text-fg-muted">{p.shell.empty}</p> : (
          <ul className="grid gap-1 m-stagger">
            {shown.map((n, i) => (
              <li key={n.id} style={{ ["--i" as string]: i }}>
                <Link href={localHref(locale, n.href)} onClick={() => { setRead((r) => new Set(r).add(n.id)); setOpen(false); }} className="grid grid-cols-[2rem_1fr_auto] items-start gap-3 p-2.5 hover:bg-navy-50">
                  <span className={cx("flex size-8 items-center justify-center", NOTE_ICON[n.tab].cls)}><Icon name={NOTE_ICON[n.tab].icon} size={15} aria-hidden /></span>
                  <span className="min-w-0"><span className={cx("block text-small", !n.read && "font-medium")}>{n.text}</span>{n.ref && <span className="text-eyebrow text-fg-subtle tabular">{n.ref}</span>}</span>
                  <span className="flex items-center gap-1.5 text-eyebrow text-fg-subtle tabular">{formatRelative(n.at, locale)}{!n.read && <span aria-label="unread" className="size-2 rounded-full bg-navy-700" />}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </>
  );
}

function ProcBanner() {
  const p = useP();
  const online = useOnline();
  if (online) return null;
  return <div role="status" className="mb-5 flex items-center gap-3 bg-ink-900 px-4 py-3 text-small text-white m-rise"><Icon name="globe" size={18} aria-hidden /><p className="min-w-0 flex-1">{p.shell.offline}</p></div>;
}

// ---------------------------------------------------------------- phone tab bar + More sheet (PS1 fix: no Approvals tab)
const TABS: { href: string; key: "home" | "requests" | "bills" | "contracts"; icon: IconName }[] = [
  { href: "/procurement", key: "home", icon: "layers" },
  { href: "/procurement/requests", key: "requests", icon: "briefcase" },
  { href: "/procurement/bills", key: "bills", icon: "file" },
  { href: "/procurement/contracts", key: "contracts", icon: "calendar" },
];
function ProcTabBar({ badges }: { badges: Record<string, NavBadge> }) {
  const p = useP();
  const { locale, t } = useI18n();
  const { user } = useSession();
  const path = stripLocale(usePathname());
  const [more, setMore] = useState(false);
  const all = navFor("procurement", user?.roles ?? []);
  const moreItems = all.filter((i) => !TABS.some((x) => x.href === i.href));
  const on = (h: string) => (h === "/procurement" ? path === h : path === h || path.startsWith(`${h}/`));
  const moreOn = moreItems.some((m) => on(m.href));
  return (
    <>
      <nav aria-label={p.nav.more} data-bottom-bar className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="grid grid-cols-5">
          {TABS.map((x) => (
            <li key={x.href}>
              <Link href={localHref(locale, x.href)} aria-current={on(x.href) ? "page" : undefined}
                className={cx("relative flex h-16 flex-col items-center justify-center gap-1 text-[0.72rem] m-press", on(x.href) ? "font-medium text-navy-700" : "text-fg-subtle")}>
                <span className={cx("relative flex h-7 w-12 items-center justify-center transition-colors duration-200", on(x.href) && "bg-gold-200")}>
                  <Icon name={x.icon} size={20} aria-hidden />
                  {badges[x.href]?.n ? <span className="absolute -top-1 right-0.5"><CountBadge n={badges[x.href].n} tone={badges[x.href].tone ?? "neutral"} /></span> : null}
                </span>
                {p.nav[x.key]}
              </Link>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => setMore(true)} aria-haspopup="dialog" aria-current={moreOn ? "page" : undefined}
              className={cx("flex h-16 w-full flex-col items-center justify-center gap-1 text-[0.72rem] m-press", moreOn ? "font-medium text-navy-700" : "text-fg-subtle")}>
              <span className={cx("flex h-7 w-12 items-center justify-center", moreOn && "bg-gold-200")}><Icon name="menu" size={20} aria-hidden /></span>
              {p.nav.more}
            </button>
          </li>
        </ul>
      </nav>
      <div className="h-16 lg:hidden" aria-hidden />
      <Dialog open={more} onClose={() => setMore(false)} side="bottom" title={p.nav.more}>
        <ul className="grid gap-1">
          {moreItems.map((m) => (
            <li key={m.href}>
              <Link href={localHref(locale, m.href)} onClick={() => setMore(false)} aria-current={on(m.href) ? "page" : undefined} className="flex h-12 items-center gap-3 px-3 hover:bg-navy-50 aria-[current=page]:bg-navy-50 aria-[current=page]:font-medium aria-[current=page]:text-navy-700">
                {t(m.label)}
                {badges[m.href]?.n ? <CountBadge n={badges[m.href].n} tone={badges[m.href].tone ?? "neutral"} /> : null}
                <Icon name="arrowRight" size={14} className="ml-auto text-fg-subtle" aria-hidden />
              </Link>
            </li>
          ))}
          <li>
            <Link href={`${localHref(locale, path)}?pr=new`} onClick={() => setMore(false)} className="flex h-12 items-center gap-3 px-3 text-link hover:text-link-hover hover:bg-navy-50">
              <Icon name="plus" size={16} aria-hidden />{p.shell.requestPurchase}
            </Link>
          </li>
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-small text-fg-muted">{p.shell.language}</span>
          <LocaleSwitcher />
        </div>
      </Dialog>
    </>
  );
}
