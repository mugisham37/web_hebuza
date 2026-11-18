"use client";
// U3 Finance overview (board 03 v2 with its Fix column): needs-you strip, five drillable tiles, next payout, ageing,
// payables, renewals, cash by account ("as of last import"), work queues. Per-panel loading/error; quiet and executive states.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDate, formatDateTime } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { useFinSummary } from "@/lib/finance/api";
import { useCashPosition, useOverview, usePayablesDue, type Overview } from "@/lib/finance/a";
import { fill, financeCommon } from "@/content/pages/finance-common";
import { financeOverview } from "@/content/pages/finance-overview";
import { Icon, type IconName } from "@/components/atoms/icon";
import { ButtonLink } from "@/components/atoms/button";
import { DateInput } from "@/components/atoms/field";
import { PageHead, useNow } from "@/components/atoms/agent";
import { Panel, PanelError } from "@/components/molecules/ops/ops";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { Amount } from "@/components/atoms/finance";
import { AgeingBar, MoneyTile } from "@/components/molecules/finance/finance";
import { ArtReconciled } from "@/components/atoms/finance-art";

export const useOv = () => financeOverview(useI18n().locale);

/** "Needs you" strip: counts → pre-filtered lists. Hidden when nothing is waiting. */
export function NeedsYouStrip({ items }: { items: { key: string; n: number; href: string }[] }) {
  const c = useOv();
  const { locale } = useI18n();
  const live = items.filter((i) => i.n > 0);
  if (!live.length) return null;
  return (
    <nav aria-label={c.needsYou} className="flex flex-wrap items-center gap-x-3 gap-y-2 border border-warning/30 bg-warning-bg px-4 py-3 m-rise">
      <span className="inline-flex items-center gap-2 text-label"><Icon name="zap" size={16} aria-hidden className="text-warning" />{c.needsYou}</span>
      <ul className="flex flex-1 flex-wrap gap-x-1 gap-y-1">
        {live.map((i, k) => (
          <li key={i.key} className="flex items-center text-small">
            {k > 0 && <span aria-hidden className="px-1.5 text-fg-subtle">·</span>}
            <Link href={localHref(locale, i.href)} className="underline-offset-4 hover:underline tabular">{fill(c.needs[i.key] ?? i.key, { n: i.n })}</Link>
          </li>
        ))}
      </ul>
      <Icon name="arrowRight" size={16} aria-hidden className="hidden text-fg-subtle sm:block" />
    </nav>
  );
}

const TILE_ICON: Record<keyof Overview["tiles"], IconName> = { collected: "check", pending: "clock", unreconciled: "layers", refunds: "refresh", allocations: "users" };

/** Greeting by Kigali hour; the persona's first name sits in a lavender pill (board OV1). */
function Greeting({ now, name }: { now: number | null; name: string }) {
  const c = useOv();
  const h = now ? Number(new Intl.DateTimeFormat("en", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Kigali" }).format(now)) : 9;
  const [pre, post] = (h < 12 ? c.greet.morning : h < 18 ? c.greet.afternoon : c.greet.evening).split("{name}");
  return <>{pre}<span className="bg-gold-200 px-2.5">{name}</span>{post}</>;
}

function TilesSkeleton() {
  return (
    <div aria-hidden className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-32 border border-border bg-white p-4"><div className="h-3 w-24 m-shimmer" /><div className="mt-6 h-8 w-32 m-shimmer" /></div>)}
    </div>
  );
}

function CashPanel() {
  const c = useOv();
  const { locale } = useI18n();
  const q = useCashPosition();
  if (q.isError) return <PanelError what={c.cashFailed} onRetry={() => q.refetch()} />;
  return (
    <Panel title={c.cash}>
      {q.isPending ? <div aria-hidden className="grid gap-2">{[0, 1, 2].map((i) => <div key={i} className="h-5 m-shimmer" />)}</div>
        : !q.data.asOf ? (
          <div className="grid gap-3">
            <p className="text-small text-fg-muted">{c.noCash}</p>
            <ButtonLink href={localHref(locale, "/finance/reconciliation/import")} size="sm" variant="primary" className="w-fit m-press">{c.importCta}</ButtonLink>
          </div>
        ) : (
          <>
            <dl className="grid gap-1.5 text-small">
              {q.data.accounts.map((a) => (
                <div key={a.provider} className="flex items-center justify-between gap-3"><dt className="text-fg-muted">{c.provider[a.provider] ?? a.provider}</dt><dd><Amount value={a.balance} size="sm" /></dd></div>
              ))}
              <div className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-2 font-medium"><dt>{c.cashTotal}</dt><dd><Amount value={q.data.total} size="sm" /></dd></div>
            </dl>
            <p className="mt-2 text-eyebrow text-fg-subtle tabular">{fill(c.asOf, { t: formatDateTime(q.data.asOf, locale) })}</p>
          </>
        )}
    </Panel>
  );
}

function PayablesPanel() {
  const c = useOv();
  const q = usePayablesDue();
  if (q.isError) return <PanelError what={c.payables} onRetry={() => q.refetch()} />;
  return (
    <Panel title={c.payables}>
      {q.isPending ? <div aria-hidden className="h-8 w-20 m-shimmer" /> : (
        <div className="grid gap-1">
          <span key={q.data.total} className="m-rise"><Amount value={q.data.total} size="lg" /></span>
          <span className="text-eyebrow text-fg-subtle tabular">{fill(c.tiles.items, { n: q.data.count })}</span>
        </div>
      )}
      <p className="mt-2 text-eyebrow text-fg-subtle">{c.payablesHint}</p>
    </Panel>
  );
}

type QueueRow = Overview["queues"][number];

export function OverviewView() {
  const c = useOv();
  const { locale } = useI18n();
  const router = useRouter();
  const params = useUrlParams();
  const date = params.get("date") ?? "";
  const now = useNow();
  const sum = useFinSummary();
  const q = useOverview(date);
  const d = q.data;
  const name = sum.data?.me.name.split(" ")[0] ?? "";
  const shownDate = d?.date ?? date;

  const cols: OpsColumn<QueueRow>[] = [
    { key: "queue", label: c.queue, cell: (r) => <span className="font-medium">{c.q[r.key]}</span> },
    { key: "n", label: c.items, align: "right", sort: (r) => r.n, cell: (r) => <span className="tabular">{r.n}</span> },
    { key: "action", label: c.action, align: "right", card: false, cell: (r) => (
      <Link href={localHref(locale, r.href)} onClick={(e) => e.stopPropagation()} className="inline-flex h-8 items-center gap-1.5 bg-navy-50 px-3 text-small font-medium text-navy-800 m-press">
        {c.qAction[r.key]}<Icon name="arrowRight" size={12} aria-hidden />
      </Link>
    ) },
  ];

  return (
    <div className="grid gap-5">
      <PageHead
        title={name ? <Greeting now={now} name={name} /> : c.title}
        sub={shownDate ? fill(c.sub, { date: formatDate(shownDate, locale) }) : undefined}
        actions={
          <label className="flex items-center gap-2 text-small text-fg-muted">
            <span className="sr-only sm:not-sr-only">{c.date}</span>
            <DateInput value={shownDate} max={d?.date && !date ? d.date : undefined} onChange={(e) => setUrlParams({ date: e.target.value || null })} className="w-40" />
          </label>
        }
      />

      {d?.execOnly && (
        <div className="flex flex-wrap items-center gap-3 bg-bg-tint p-4 m-rise">
          <Icon name="shield" size={20} aria-hidden className="text-navy-600" />
          <p className="min-w-0 flex-1 text-small"><span className="font-medium">{c.exec.title}.</span> {c.exec.body}</p>
          <ButtonLink href={localHref(locale, "/finance/approvals")} size="sm" className="m-press">{c.exec.cta}</ButtonLink>
        </div>
      )}

      {!d?.execOnly && sum.data && <NeedsYouStrip items={sum.data.needsYou} />}

      {q.isError ? <PanelError what={c.failed} onRetry={() => q.refetch()} /> : !d ? <TilesSkeleton /> : (
        <>
          {d.quiet && (
            <section className="relative grid place-items-center gap-2 overflow-hidden border border-border bg-white px-6 py-10 text-center m-rise">
              <ArtReconciled />
              <h2 className="text-h3">{c.quiet.title}</h2>
              <p className="text-small text-fg-muted">{c.quiet.body}</p>
              <ButtonLink href={localHref(locale, "/finance/reports")} size="sm" variant="outline" className="mt-1 m-press">{c.quiet.cta}<Icon name="arrowRight" size={14} aria-hidden /></ButtonLink>
            </section>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 m-stagger">
            {(Object.keys(d.tiles) as (keyof Overview["tiles"])[]).map((k, i) => {
              const t = d.tiles[k];
              const noImport = k === "unreconciled" && !d.tiles.unreconciled.hasImport;
              return (
                <div key={k} style={{ ["--i" as string]: i }} className="grid">
                  <MoneyTile
                    label={c.tiles[k]} value={t.total} href={localHref(locale, t.href)} icon={TILE_ICON[k]}
                    spark={k === "collected" ? d.tiles.collected.spark : undefined}
                    delta={k === "collected" ? (d.tiles.collected.delta ?? undefined) : undefined}
                    deltaPeriod={k === "collected" ? financeCommon(locale).money.yesterday : undefined}
                    count={noImport ? c.noImport : fill(k === "collected" || k === "pending" ? c.tiles.payments : k === "unreconciled" ? c.tiles.lines : c.tiles.items, { n: t.count })}
                  />
                </div>
              );
            })}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 m-stagger">
            <Panel title={c.nextPayout}>
              <p className="flex items-center gap-2 text-label-lg tabular"><Icon name="calendar" size={18} aria-hidden className="text-navy-600" />{formatDate(d.nextPayout.date, locale)}</p>
              <p className="mt-2 text-small text-fg-muted">
                {d.nextPayout.agents ? fill(c.projected, { n: d.nextPayout.agents }) : c.noPayout}
              </p>
              {d.nextPayout.agents > 0 && <span key={d.nextPayout.projectedNet} className="mt-1 block m-rise"><Amount value={d.nextPayout.projectedNet} size="lg" /></span>}
            </Panel>
            <Panel title={c.ageing} action={<span className="text-eyebrow text-fg-subtle tabular">{fill(c.current, { pct: d.currentPct })}</span>}>
              <AgeingBar buckets={d.ageing} onPick={(b) => router.push(localHref(locale, `/finance/receivables?bucket=${b}`))} />
              <p className="mt-2 flex items-center gap-1.5 text-eyebrow text-fg-subtle">{c.outstanding.split("{amount}")[0]}<Amount value={d.receivables} size="sm" />{c.outstanding.split("{amount}")[1]}</p>
            </Panel>
            <PayablesPanel />
            <CashPanel />
          </div>

          {(d.renewals.due7 > 0 || d.renewals.pastDue > 0) && (
            <Panel title={c.renewals} action={<Link href={localHref(locale, "/finance/invoices?series=plan")} className="text-small underline underline-offset-4">{c.openRenewals}</Link>}>
              <p className="flex flex-wrap gap-2 text-small">
                <span className="bg-ink-100 px-3 py-1 tabular">{fill(c.due7, { n: d.renewals.due7 })}</span>
                <span className={cx("px-3 py-1 tabular", d.renewals.pastDue ? "bg-danger-bg text-danger" : "bg-ink-100")}>{fill(c.pastDue, { n: d.renewals.pastDue })}</span>
              </p>
            </Panel>
          )}

          {!d.execOnly && (
            <section aria-labelledby="fin-queues" className="grid gap-3 m-rise">
              <h2 id="fin-queues" className="text-label-lg">{c.queues}</h2>
              <OpsTable<QueueRow>
                label={c.queues} rows={d.queues} columns={cols} rowKey={(r) => r.key} rowLabel={(r) => c.q[r.key]}
                onOpen={(r) => router.push(localHref(locale, r.href))} rowTone={(r) => (r.n === 0 ? "muted" : null)}
              />
            </section>
          )}
        </>
      )}

    </div>
  );
}

