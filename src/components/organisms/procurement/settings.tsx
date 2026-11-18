"use client";
// P-SET read-only approval limits + budget categories (F-SET-01). Finance proposes in /finance/payables, executive approves.
import { useI18n } from "@/lib/i18n/provider";
import { formatDate, formatMoney } from "@/shared/format";
import { useProcSettings } from "@/lib/procurement/api";
import { fill } from "@/content/pages/procurement-common";
import { PageHead } from "@/components/atoms/agent";
import { BudgetBar, Fact, Pill } from "@/components/atoms/procurement";
import { PanelErr } from "@/components/molecules/procurement/procurement";
import { useAB } from "@/components/molecules/procurement/procurement";

export function ProcSettingsView() {
  const c = useAB().settings;
  const { locale } = useI18n();
  const q = useProcSettings();
  const d = q.data;
  const m = (n: number) => formatMoney(n, "RWF", locale);
  const pending = d?.proposals.find((x) => x.status === "pending");
  return (
    <div className="grid gap-5">
      <PageHead title={c.title} sub={c.sub} actions={pending && <Pill tone="warning" icon="clock" title={pending.reason}>{c.pending} · {formatDate(pending.effectiveOn, locale)}</Pill>} />
      {q.isError ? <PanelErr onRetry={() => q.refetch()} /> : !d ? <div className="h-64 m-shimmer" /> : (
        <>
          <dl className="grid gap-4 border border-border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-3 m-rise">
            <Fact label={c.limits.financeMax}><span className="text-body font-semibold tabular">{m(d.limits.financeMax)}</span></Fact>
            <Fact label={c.limits.quoteThreshold}><span className="tabular">{m(d.limits.quoteThreshold)} · {d.limits.quotesRequired}</span></Fact>
            <Fact label={c.limits.tolerance}>{fill(c.tolerance, { pct: d.limits.tolerancePct, min: m(d.limits.toleranceMin) })}</Fact>
            <Fact label={c.limits.lockHours}>{fill(c.hours, { n: d.limits.lockHours })}</Fact>
            <Fact label={c.limits.reminderOffsets}>{d.limits.reminderOffsets.map((n) => `−${n}`).join(" · ")}</Fact>
            <Fact label={c.limits.budgetWarnPct}>{d.limits.budgetWarnPct}%</Fact>
          </dl>
          <h2 className="text-card-title">{c.budgets}</h2>
          <ul className="grid gap-3 md:grid-cols-2 m-stagger">
            {d.budgets.map((b, i) => (
              <li key={b.code} style={{ ["--i" as string]: i }} className="grid gap-2 border border-border bg-surface p-4">
                <p className="flex items-center justify-between gap-2"><span className="font-medium">{b.name}</span><span className="text-small tabular">{m(b.annualBudget)}</span></p>
                <BudgetBar used={b.committed + b.actual} budget={b.annualBudget} name={b.name} />
            </li>
          ))}
        </ul>
        </>
      )}
    </div>
  );
}
