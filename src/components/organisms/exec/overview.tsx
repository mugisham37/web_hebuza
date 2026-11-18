"use client";
// Executive overview (/exec): one read of GET /api/reports/exec-summary (cached 60 s server-side) → money tiles, ageing,
// cases by status, SLA breaches, bookings, lead conversion and AI spend. Read-only; approvals live under /exec/approvals.
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { formatDate, formatMoney, formatNumber } from "@/shared/format";
import { fill } from "@/content/pages/agent-common";
import { execOverview } from "@/content/pages/exec-overview";
import { ButtonLink } from "@/components/atoms/button";
import { Icon, type IconName } from "@/components/atoms/icon";
import { PageHead } from "@/components/atoms/agent";
import { StatusPill } from "@/components/atoms/domain";
import { Panel, PanelError } from "@/components/molecules/ops/ops";
import { AgeingBar, MoneyTile } from "@/components/molecules/finance/finance";

type Summary = components["schemas"]["ExecSummaryResponse"];
type CaseStatus = Parameters<typeof StatusPill>[0]["status"];

function CountTile({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  icon: IconName;
  tone?: "danger";
}) {
  return (
    <div className="grid min-h-32 content-between gap-3 border border-border bg-surface p-4">
      <span className="flex items-center justify-between gap-2 text-small text-fg-muted">
        {label}
        <Icon
          name={icon}
          size={18}
          aria-hidden
          className={tone ? "text-danger" : "text-link"}
        />
      </span>
      <span className="text-h3 tabular m-rise">{value}</span>
      <span className="text-small text-fg-muted">{hint}</span>
    </div>
  );
}

export function ExecOverview() {
  const { locale } = useI18n();
  const c = execOverview(locale);
  const q = useQuery({
    queryKey: ["reports", "exec-summary"],
    queryFn: () => unwrap<Summary>(api.GET("/api/reports/exec-summary")),
    refetchInterval: 60_000,
  });
  const s = q.data;
  const num = (n: number) => formatNumber(n, locale);
  return (
    <div className="grid gap-6">
      <PageHead
        title={c.title}
        sub={s ? fill(c.sub, { date: formatDate(s.date, locale) }) : undefined}
        actions={
          <ButtonLink
            href={localHref(locale, "/exec/approvals")}
            size="sm"
            variant="secondary"
          >
            {c.approvals}
          </ButtonLink>
        }
      />
      {q.isError ? (
        <PanelError what={c.failed} onRetry={() => q.refetch()} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MoneyTile
              label={c.revenue}
              value={s?.revenue}
              loading={q.isPending}
              icon="chart"
              count={
                s &&
                fill(c.revenueAll, {
                  amount: formatMoney(s.revenueAll, "RWF", locale),
                })
              }
            />
            <MoneyTile
              label={c.collections}
              value={s?.collections}
              loading={q.isPending}
              icon="check"
            />
            <MoneyTile
              label={c.receivables}
              value={s?.receivables}
              loading={q.isPending}
              icon="clock"
              tone="lavender"
            />
          </div>
          {s && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <CountTile
                label={c.sla}
                value={num(s.slaBreaches)}
                hint={c.slaHint}
                icon="zap"
                tone={s.slaBreaches ? "danger" : undefined}
              />
              <CountTile
                label={c.bookings}
                value={num(s.bookings.total)}
                icon="calendar"
                hint={fill(c.bookingsHint, {
                  n: num(
                    s.bookings.byStatus.find((b) => b.status === "completed")
                      ?.n ?? 0,
                  ),
                })}
              />
              <CountTile
                label={c.conversion}
                value={`${Math.round(s.conversion.rate * 100)}%`}
                icon="users"
                hint={fill(c.conversionHint, {
                  won: num(s.conversion.won),
                  leads: num(s.conversion.leads),
                })}
              />
              <CountTile
                label={c.ai}
                value={`$${s.ai.usd.toFixed(2)}`}
                hint={fill(c.aiHint, { n: num(s.ai.calls) })}
                icon="sparkle"
              />
            </div>
          )}
          {s && (
            <div className="grid gap-3 lg:grid-cols-2">
              <Panel title={c.ageing}>
                <AgeingBar buckets={s.ageing} />
              </Panel>
              <Panel
                title={c.cases}
                action={
                  <span className="text-small text-fg-muted tabular">
                    {fill(c.casesTotal, { n: num(s.cases.total) })}
                  </span>
                }
              >
                <ul className="grid gap-2">
                  {s.cases.byStatus.map((r) => (
                    <li
                      key={r.status}
                      className="flex items-center justify-between gap-3 text-small"
                    >
                      <StatusPill status={r.status as CaseStatus} />
                      <span className="tabular">{num(r.n)}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          )}
        </>
      )}
    </div>
  );
}
