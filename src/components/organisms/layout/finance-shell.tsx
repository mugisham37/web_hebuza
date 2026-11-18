"use client";
// Finance shell extras (plan 05 U1, board 02 SH1–SH4, PS1): live nav badges, ⌘K actions + number search, approvals tray
// in the top bar (Open only — signing happens on the record, D4), finance bell, offline/executive banner, G-chords,
// phone tab bar Home·Approvals·Payments·Recon·More. Consumed by WorkspaceShell through the shared OpsShellCtx.
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
import { useApprovals, useFinNotes, useFinSummary } from "@/lib/finance/api";
import { fill } from "@/content/pages/finance-common";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Dialog } from "@/components/atoms/dialog";
import { OpsShellCtx, ShortcutSheet, type NavBadge, type PaletteItem } from "@/components/organisms/layout/ops-shell";
import { CountBadge } from "@/components/atoms/ops";
import { LocaleSwitcher } from "@/components/organisms/layout/locale-switcher";
import { useOnline } from "@/components/atoms/hooks";
import { Amount, useF } from "@/components/atoms/finance";
import { ArtNothingWaiting } from "@/components/atoms/finance-art";
import { NoAccess } from "@/components/molecules/finance/finance";

const NUMBER = /^(INV|QUO|RCPT|CN|RFD|PB)-\d{4}-\d{2,5}(-\d)?$/i;
/** Where a typed document number opens (palette "Find by number", §8.3). */
const numberHref = (no: string) => {
  const n = no.toUpperCase();
  const p = n.split("-")[0];
  return p === "INV" ? `/finance/invoices/${n}` : p === "QUO" ? `/finance/quotes/${n}` : p === "CN" ? `/finance/credit-notes/${n}`
    : p === "RFD" ? `/finance/refunds/${n}` : p === "PB" ? `/finance/payouts/${n}` : `/finance/payments?q=${n}`;
};

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  const f = useF();
  const router = useRouter();
  const summary = useFinSummary();
  const L = useMemo(() => (p: string) => localHref(locale, p), [locale]);
  const s = summary.data;
  const badges = useMemo<Record<string, NavBadge>>(() => {
    if (!s) return {} as Record<string, NavBadge>;
    return {
      "/finance/approvals": { n: s.badges.approvals, tone: "attention" },
      "/finance/payments": { n: s.badges.proofs, tone: s.badges.proofs ? "attention" : undefined },
      "/finance/reconciliation": { n: s.badges.unmatched, tone: s.badges.unmatched ? "danger" : undefined },
      "/finance/refunds": { n: s.badges.refunds },
    };
  }, [s]);

  const palette = useMemo(
    () => (q: string): PaletteItem[] => {
      const n = q.trim();
      const g = f.shell.actions;
      const actions: PaletteItem[] = s?.me.executiveOnly
        ? [{ group: g, label: f.shell.goApprovals, hint: "G A", href: L("/finance/approvals") }]
        : [
            { group: g, label: f.shell.newInvoice, hint: "N I", href: L("/finance/invoices/new") },
            { group: g, label: f.shell.newQuote, href: L("/finance/quotes?new=1") },
            { group: g, label: f.shell.importStatement, hint: "I", href: L("/finance/reconciliation/import") },
            { group: g, label: f.shell.openRecon, hint: "G R", href: L("/finance/reconciliation") },
            { group: g, label: f.shell.proofs, hint: "G P", href: L("/finance/payments/proofs") },
            { group: g, label: f.shell.goApprovals, hint: "G A", href: L("/finance/approvals") },
            { group: g, label: f.shell.buildBatch, href: L("/finance/payouts/new") },
            { group: g, label: f.shell.openReport, href: L("/finance/reports") },
            { group: g, label: f.shell.settings, href: L("/finance/settings/tax") },
          ];
      if (!n) return actions;
      const found: PaletteItem[] = NUMBER.test(n) ? [{ group: f.shell.findNumber, label: n.toUpperCase(), href: L(numberHref(n)) }] : [];
      return [...found, ...actions.filter((x) => x.label.toLowerCase().includes(n.toLowerCase()))];
    },
    [f, L, s?.me.executiveOnly],
  );

  const [help, setHelp] = useState(false);
  useShortcut("g a", f.shortcuts.goApprovals, () => router.push(L("/finance/approvals")));
  useShortcut("g r", f.shortcuts.goRecon, () => router.push(L("/finance/reconciliation")));
  useShortcut("g p", f.shortcuts.goProofs, () => router.push(L("/finance/payments/proofs")));
  useShortcut("?", f.shortcuts.help, () => setHelp(true));

  const value = useMemo(
    () => ({ badges, palette, headerExtra: <ApprovalsTray />, bell: <FinanceBell />, banner: <FinanceBanner />, accountHref: "/settings" }),
    [badges, palette],
  );

  return (
    <OpsShellCtx.Provider value={value}>
      {children}
      <ShortcutSheet open={help} onClose={() => setHelp(false)} />
      <FinanceTabBar badges={badges} />
    </OpsShellCtx.Provider>
  );
}

/** Client twin of the proxy guard (X-6): anyone without access gets the role-aware NoAccess page inside the shell. */
export function FinanceGate({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const path = stripLocale(usePathname());
  return !user || mayEnter(user.roles, "finance", path) ? children : <NoAccess />;
}

// ---------------------------------------------------------------- approvals tray (SH3): list + Open, never inline approve
function ApprovalsTray() {
  const f = useF();
  const { locale } = useI18n();
  const q = useApprovals();
  const [open, setOpen] = useState(false);
  const mine = (q.data?.items ?? []).filter((i) => i.mine === "sign");
  if (q.isPending) return <span aria-hidden className="hidden h-9 w-32 m-shimmer sm:block" />;
  return (
    <div className="relative hidden sm:block">
      <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={cx("inline-flex h-9 items-center gap-2 px-3 text-small whitespace-nowrap m-press m-tone", mine.length ? "bg-gold-100 text-gold-800" : "border border-border-strong bg-surface")}>
        <Icon name="shield" size={15} aria-hidden />
        {mine.length ? fill(f.shell.approvalsTray, { n: mine.length }) : f.shell.approvalsNone}
      </button>
      {open && (
        <div role="dialog" aria-label={f.nav.approvals} onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          className="absolute left-0 top-full z-40 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] border border-border bg-surface p-2 shadow-md m-pop">
          {mine.length === 0 ? (
            <div className="grid place-items-center gap-2 px-3 py-6 text-center text-fg-muted"><ArtNothingWaiting /><p className="text-small">{f.shell.approvalsNone}</p></div>
          ) : (
            <ul className="grid max-h-80 gap-1 overflow-y-auto m-stagger">
              {mine.slice(0, 6).map((i, k) => (
                <li key={i.id} style={{ ["--i" as string]: k }} className="flex items-center gap-3 p-2.5 hover:bg-navy-50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-small font-medium tabular">{i.record}</span>
                    <span className="block truncate text-eyebrow text-fg-subtle">{i.maker.name} · {formatRelative(i.at, locale)}</span>
                  </span>
                  {i.amount != null && <Amount value={i.amount} size="sm" />}
                  <Link href={localHref(locale, i.href)} onClick={() => setOpen(false)} className="inline-flex h-8 items-center bg-secondary px-3 text-eyebrow text-on-navy hover:bg-secondary-hover m-press">{f.shell.open}</Link>
                </li>
              ))}
            </ul>
          )}
          <Link href={localHref(locale, "/finance/approvals")} onClick={() => setOpen(false)} className="mt-1 flex h-10 items-center justify-center text-small text-link hover:text-link-hover hover:bg-navy-50">{f.shell.seeAll}</Link>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- bell (§8.2)
const NOTE_ICON: Record<string, { icon: IconName; cls: string }> = {
  proof: { icon: "upload", cls: "bg-info-bg text-info" }, approval: { icon: "shield", cls: "bg-navy-50 text-navy-700" },
  recon: { icon: "refresh", cls: "bg-warning-bg text-warning" }, refund: { icon: "wallet", cls: "bg-danger-bg text-danger" },
  batch: { icon: "layers", cls: "bg-success-bg text-success" }, setting: { icon: "zap", cls: "bg-ink-100 text-ink-700" },
};
function FinanceBell() {
  const f = useF();
  const { locale } = useI18n();
  const q = useFinNotes();
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<Set<string>>(new Set());
  const list = (q.data?.items ?? []).map((n) => ({ ...n, read: n.read || read.has(n.id) }));
  const unread = list.filter((n) => !n.read).length;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`${f.shell.notifications}${unread ? ` (${unread})` : ""}`} className="relative flex size-10 items-center justify-center hover:bg-navy-50 m-press">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0" /></svg>
        {unread > 0 && <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center bg-danger text-[0.65rem] font-semibold text-white tabular m-pop">{unread}</span>}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} side="right" title={f.shell.notifications}
        footer={<button type="button" className="text-small underline underline-offset-4" onClick={() => setRead(new Set(list.map((n) => n.id)))}>{f.shell.markAll}</button>}>
        {q.isPending ? <div className="grid gap-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 m-shimmer" />)}</div>
          : q.isError ? <p role="alert" className="py-10 text-center text-small text-danger">{f.states.error}</p>
          : !list.length ? <p className="py-10 text-center text-small text-fg-muted">{f.shell.empty}</p> : (
          <ul className="grid gap-1 m-stagger">
            {list.map((n, i) => (
              <li key={n.id} style={{ ["--i" as string]: i }}>
                <Link href={localHref(locale, n.href)} onClick={() => { setRead((r) => new Set(r).add(n.id)); setOpen(false); }} className="grid grid-cols-[2rem_1fr_auto] items-start gap-3 p-2.5 hover:bg-navy-50">
                  <span className={cx("flex size-8 items-center justify-center", (NOTE_ICON[n.kind] ?? NOTE_ICON.approval).cls)}><Icon name={(NOTE_ICON[n.kind] ?? NOTE_ICON.approval).icon} size={15} aria-hidden /></span>
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

// ---------------------------------------------------------------- banner: offline (money actions off) + executive read-only
function FinanceBanner() {
  const f = useF();
  const online = useOnline();
  const s = useFinSummary().data;
  const items: ReactNode[] = [];
  if (!online) items.push(<Bar key="off" cls="bg-ink-900 text-white" icon="globe">{f.shell.offline}</Bar>);
  if (s?.me.executiveOnly) items.push(<Bar key="exec" cls="bg-info-bg text-info" icon="shield">{f.shell.execReadOnly}</Bar>);
  return items.length ? <div className="mb-5 grid gap-2">{items}</div> : null;
}
function Bar({ cls, icon, children }: { cls: string; icon: IconName; children: ReactNode }) {
  return <div role="status" className={cx("flex items-center gap-3 px-4 py-3 text-small m-rise", cls)}><Icon name={icon} size={18} aria-hidden /><p className="min-w-0 flex-1">{children}</p></div>;
}

// ---------------------------------------------------------------- phone tab bar + More sheet (PS1)
const TABS: { href: string; key: "home" | "approvals" | "payments" | "recon"; icon: IconName }[] = [
  { href: "/finance", key: "home", icon: "layers" },
  { href: "/finance/approvals", key: "approvals", icon: "shield" },
  { href: "/finance/payments", key: "payments", icon: "wallet" },
  { href: "/finance/reconciliation", key: "recon", icon: "refresh" },
];
function FinanceTabBar({ badges }: { badges: Record<string, NavBadge> }) {
  const f = useF();
  const { locale, t } = useI18n();
  const { user } = useSession();
  const path = stripLocale(usePathname());
  const [more, setMore] = useState(false);
  const allowed = navFor("finance", user?.roles ?? []).map((i) => i.href);
  const tabs = TABS.filter((x) => allowed.includes(x.href));
  const moreItems = navFor("finance", user?.roles ?? []).filter((i) => !TABS.some((x) => x.href === i.href));
  const on = (h: string) => (h === "/finance" ? path === "/finance" : path === h || path.startsWith(`${h}/`));
  const moreOn = moreItems.some((m) => on(m.href));
  return (
    <>
      <nav aria-label={f.nav.more} data-bottom-bar className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
          {tabs.map((x) => (
            <li key={x.href}>
              <Link href={localHref(locale, x.href)} aria-current={on(x.href) ? "page" : undefined}
                className={cx("relative flex h-16 flex-col items-center justify-center gap-1 text-[0.72rem] m-press", on(x.href) ? "font-medium text-navy-700" : "text-fg-subtle")}>
                <span className={cx("relative flex h-7 w-12 items-center justify-center transition-colors duration-200", on(x.href) && "bg-gold-200")}>
                  <Icon name={x.icon} size={20} aria-hidden />
                  {badges[x.href]?.n ? <span className="absolute -top-1 right-0.5"><CountBadge n={badges[x.href].n} tone={badges[x.href].tone ?? "neutral"} /></span> : null}
                </span>
                {f.nav[x.key]}
              </Link>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => setMore(true)} aria-haspopup="dialog" aria-current={moreOn ? "page" : undefined}
              className={cx("flex h-16 w-full flex-col items-center justify-center gap-1 text-[0.72rem] m-press", moreOn ? "font-medium text-navy-700" : "text-fg-subtle")}>
              <span className={cx("flex h-7 w-12 items-center justify-center", moreOn && "bg-gold-200")}><Icon name="menu" size={20} aria-hidden /></span>
              {f.nav.more}
            </button>
          </li>
        </ul>
      </nav>
      <div className="h-16 lg:hidden" aria-hidden />
      <Dialog open={more} onClose={() => setMore(false)} side="bottom" title={f.nav.more}>
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
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-small text-fg-muted">{f.shell.language}</span>
          <LocaleSwitcher />
        </div>
      </Dialog>
    </>
  );
}
