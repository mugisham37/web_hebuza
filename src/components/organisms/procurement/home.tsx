"use client";
// H1 Home (board 02 SH1/SH3/PS1): greeting, attention banner, six deep-linking tiles, upcoming obligations, top balances,
// first-run setup checklist. Every panel fails on its own (summary drives tiles+panels; checklist reads settings).
import { useI18n } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { cx, formatDate } from "@/shared/format";
import { useProcSummary } from "@/lib/procurement/api";
import type { ProcAlert } from "@/shared/procurement/types";
import { fill } from "@/content/pages/procurement-common";
import { Icon, type IconName } from "@/components/atoms/icon";
import { useNow } from "@/components/atoms/agent";
import { Amount, Pill, useP } from "@/components/atoms/procurement";
import { PanelErr, ProcLink } from "@/components/molecules/procurement/procurement";
import { useAB } from "@/components/molecules/procurement/procurement";

const KIND_ICON: Record<string, IconName> = { contract_end: "calendar", notice: "clock", rent_due: "building", bill_due: "file", bill_overdue: "zap", deposit_return: "wallet", document: "fileCheck", bank_change: "lock" };

export function ProcHome() {
  const c = useAB().home;
  const p = useP();
  const { user } = useSession();
  const now = useNow();
  const q = useProcSummary();
  const s = q.data;
  const hour = now === null ? 9 : Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Kigali" }).format(now));
  const first = user?.name.split(" ")[0] ?? "";
  const banner = s ? [
    s.banner.leaseDays !== undefined && fill(c.lease, { n: s.banner.leaseDays }),
    s.banner.billsDue > 0 && fill(c.billsDue, { n: s.banner.billsDue }),
    s.banner.requests > 0 && fill(c.requests, { n: s.banner.requests }),
  ].filter(Boolean) as string[] : [];

  return (
    <div className="grid gap-6">
      <h1 className="flex flex-wrap items-center gap-3 text-h3 m-rise">
        {hour < 12 ? c.morning : hour < 17 ? c.afternoon : c.evening}
        {first && <span className="bg-gold-200 px-4 py-1 text-navy-950">{first}</span>}
      </h1>

      {banner.length > 0 && (
        <ProcLink href="/procurement/reports?tab=obligations" className="flex flex-wrap items-center gap-3 border-l-[3px] border-gold-500 bg-gold-50 px-5 py-4 text-navy-950 hover:bg-gold-100 m-rise m-press">
          <Icon name="zap" size={20} aria-hidden />
          <span className="min-w-0 flex-1 text-body font-medium">{banner.join(" · ")}</span>
          <span className="inline-flex items-center gap-1 text-small">{p.common.details}<Icon name="arrowRight" size={14} aria-hidden /></span>
        </ProcLink>
      )}

      {q.isError ? <PanelErr onRetry={() => q.refetch()} /> : s?.firstRun ? <FirstRun checklist={s.checklist} /> : (
        <>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 m-stagger">
            {!s ? [0, 1, 2, 3, 4, 5, 6].map((i) => <li key={i} className="h-28 m-shimmer" />) : (
              <>
                <Tile i={0} icon="calendar" label={c.tiles.contracts} href="/procurement/contracts?status=expiring" value={fill(c.tiles.contractsVal, { n: s.tiles.contracts60 })} sub={fill(c.tiles.contractsSub, { n: s.tiles.contracts90 })} />
                <Tile i={1} icon="file" label={c.tiles.billsWeek} href="/procurement/bills?view=due_week" value={<Amount value={s.tiles.billsDueWeek} size="lg" className="font-semibold" />} sub={String(s.tiles.billsDueWeekCount)} />
                <Tile i={2} icon="zap" tone={s.tiles.overdueCount ? "danger" : undefined} label={c.tiles.overdue} href="/procurement/bills?view=overdue" value={<Amount value={s.tiles.overdue} size="lg" className="font-semibold" />} sub={String(s.tiles.overdueCount)} />
                <Tile i={3} icon="check" label={c.tiles.notInvoiced} href="/procurement/receipts?view=not_invoiced" value={String(s.tiles.notInvoiced)} />
                <Tile i={4} icon="wallet" label={c.tiles.deposits} href="/procurement/deposits?tab=deposit" value={<Amount value={s.tiles.depositsOutstanding} size="lg" className="font-semibold" />} />
                <Tile i={5} icon="chart" label={c.tiles.budget} href="/procurement/reports?tab=spend" value={fill(c.tiles.budgetVal, { pct: s.tiles.budgetUsedPct })} />
                <Tile i={6} icon="fileCheck" label={c.tiles.awaiting} href="/procurement/requests" value={String(s.tiles.awaitingApproval)} />
              </>
            )}
          </ul>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title={c.obligations} href="/procurement/reports?tab=obligations">
              {!s ? <Rows /> : !s.obligations.length ? <p className="py-8 text-center text-small text-fg-muted">{p.empty.obligations}</p> : (
                <ul className="divide-y divide-border">{s.obligations.map((o) => <ObligationRow key={o.id} o={o} />)}</ul>
              )}
            </Panel>
            <Panel title={c.balances} href="/procurement/reports?tab=ageing">
              {!s ? <Rows /> : !s.balances.length ? <p className="py-8 text-center text-small text-fg-muted">{c.noBalances}</p> : (
                <ul className="divide-y divide-border">
                  {s.balances.map((b) => (
                    <li key={b.vendorId}>
                      <ProcLink href={`/procurement/suppliers/${b.vendorId}`} className="flex items-center justify-between gap-3 py-3 hover:text-link">
                        <span className="min-w-0 truncate text-body">{b.name}</span><Amount value={b.balance} className="font-semibold" />
                      </ProcLink>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
        </div>
        </>
      )}
            </div>
  );
}

function Tile({ i, icon, label, value, sub, href, tone }: { i: number; icon: IconName; label: string; value: React.ReactNode; sub?: string; href: string; tone?: "danger" }) {
  return (
    <li style={{ ["--i" as string]: i }}>
      <ProcLink href={href} className={cx("group grid h-full gap-2 border bg-surface p-4 m-lift m-press", tone ? "border-danger/40" : "border-border")}>
        <span className="flex items-center gap-2 text-small text-fg-muted"><Icon name={icon} size={16} aria-hidden className={tone ? "text-danger" : "text-navy-700"} />{label}</span>
        <span className="flex items-end justify-between gap-2">
          <span className="min-w-0 text-card-title font-semibold tabular m-tone">{value}</span>
          <Icon name="arrowRight" size={14} aria-hidden className="shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
        </span>
        {sub && <span className="text-eyebrow text-fg-subtle tabular">{sub}</span>}
      </ProcLink>
    </li>
  );
}
function Panel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  const p = useP();
  return (
    <section className="border border-border bg-surface p-5 m-rise">
      <header className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-card-title">{title}</h2>
        <ProcLink href={href} className="inline-flex items-center gap-1 text-small text-link hover:text-link-hover">{p.common.seeAll}<Icon name="arrowRight" size={14} aria-hidden /></ProcLink>
      </header>
      {children}
    </section>
  );
}
const Rows = () => <div className="grid gap-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 m-shimmer" />)}</div>;

export function ObligationRow({ o }: { o: ProcAlert }) {
  const c = useAB().home;
  const { locale } = useI18n();
  const when = o.days === 0 ? c.today : o.days > 0 ? fill(c.inDays, { n: o.days }) : fill(c.daysAgo, { n: -o.days });
  return (
    <li>
      <ProcLink href={o.href} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-3 hover:text-link">
        <span aria-hidden className="flex size-8 items-center justify-center bg-navy-50 text-navy-700"><Icon name={KIND_ICON[o.kind] ?? "file"} size={15} /></span>
        <span className="min-w-0">
          <span className="block truncate text-body">{o.title}</span>
          <span className="block text-eyebrow text-fg-subtle tabular">{formatDate(o.on, locale)} · {o.ref}{o.amount ? " · " : ""}{o.amount ? <Amount value={o.amount} size="sm" /> : null}</span>
        </span>
        <Pill tone={o.days < 0 || o.kind === "bill_overdue" ? "danger" : o.days <= 7 ? "warning" : "accent"} icon="clock">{c.kinds[o.kind]} · {when}</Pill>
      </ProcLink>
    </li>
  );
}

function FirstRun({ checklist }: { checklist: Record<"landlord" | "lease" | "budgets" | "limits", boolean> }) {
  const c = useAB().home;
  const items: [keyof typeof checklist, string][] = [["landlord", "/procurement/suppliers?sheet=new"], ["lease", "/procurement/contracts?sheet=new"], ["budgets", "/procurement/settings"], ["limits", "/procurement/settings"]];
  return (
    <section className="grid gap-6 border border-border bg-surface p-8 md:grid-cols-2 m-rise">
      <div className="grid place-items-center gap-3 text-center">
        <svg aria-hidden viewBox="0 0 80 80" className="size-20 text-navy-700" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M16 70V22l20-10v58M36 70V30l28 10v30M8 70h64M24 32h4M24 44h4M24 56h4M46 46h8M46 58h8" /><circle cx="62" cy="18" r="9" fill="var(--color-gold-400)" /><path d="M62 14v8M58 18h8" /></svg>
        <h2 className="text-h3">{c.firstTitle}</h2>
        <p className="text-body text-fg-muted">{c.firstBody}</p>
        <ProcLink href="/procurement/suppliers?sheet=new" className="inline-flex h-11 items-center bg-secondary px-5 text-button text-on-secondary hover:bg-secondary-hover m-press">{c.addSupplier}</ProcLink>
          </div>
      <div className="grid content-start gap-2">
        <h3 className="text-card-title">{c.checklist}</h3>
        <ul className="grid gap-1">
          {items.map(([k, href]) => (
            <li key={k}>
              <ProcLink href={href} className="flex h-11 items-center gap-3 px-2 hover:bg-navy-50">
                <span aria-hidden className={cx("flex size-5 items-center justify-center rounded-full border-2", checklist[k] ? "border-success bg-success text-white" : "border-border-strong")}>{checklist[k] && <Icon name="check" size={12} />}</span>
                <span className={cx("text-body", checklist[k] && "text-fg-muted line-through")}>{c.check[k]}</span>
              </ProcLink>
            </li>
          ))}
        </ul>
        </div>
    </section>
  );
}
