"use client";
import { useWs } from "@/lib/agent/ws";
// U12 Performance (board 12: PR1 KPIs + trend, PR2 by-service + feedback, PR3 early state, PP1 phone).
// Comparisons are against the team median only — no colleague is ever named.
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDate } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import {
  RANGES,
  usePerformance,
  type Performance,
  type Range,
} from "@/lib/agent/e";
import { agentPerformance } from "@/content/pages/agent-performance";
import { fill } from "@/content/pages/agent-common";
import { PageHead, SkeletonRows, StarRating } from "@/components/atoms/agent";
import { EmptyPanel, Panel, PanelError } from "@/components/molecules/ops/ops";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { Sparkline } from "@/components/atoms/ops";
import { buttonClass } from "@/components/atoms/button";
import { Avatar } from "@/components/atoms/misc";

const useP = () => {
  const { locale } = useI18n();
  const { wsHref } = useWs();
  return { p: agentPerformance(locale), locale };
};
const YOU = "var(--color-navy-700)";
const MEDIAN = "var(--color-gold-400)";

export function PerformanceView() {
  const { p, locale } = useP();
  const { wsHref } = useWs();
  const q = useUrlParams();
  const raw = q.get("range");
  const range: Range = RANGES.includes(raw as Range) ? (raw as Range) : "30d";
  const perf = usePerformance(range);
  const d = perf.data;
  return (
    <div className="pb-24 lg:pb-8">
      <PageHead
        title={p.title}
        actions={
          <div
            role="group"
            aria-label={p.range}
            className="flex gap-1 border border-border bg-white p-1"
          >
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={r === range}
                onClick={() => setUrlParams({ range: r === "30d" ? null : r })}
                className={cx(
                  "m-press m-tone h-9 px-3.5 text-label",
                  r === range ? "bg-secondary text-on-navy" : "hover:bg-ink-100",
                )}
              >
                {p.ranges[r]}
              </button>
            ))}
          </div>
        }
      />
      {perf.isError && !d ? (
        <PanelError what={p.what} onRetry={() => perf.refetch()} />
      ) : !d ? (
        <SkeletonRows n={4} />
      ) : d.completed < 3 ? (
        <EmptyPanel
          title={p.earlyTitle}
          body={p.earlyBody}
          action={
            <Link
              href={localHref(locale, wsHref("/agent/offers"))}
              className={buttonClass({ size: "sm" })}
            >
              {p.earlyCta}
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5">
          <Kpis d={d} />
          <Panel title={p.trend}>
            <Trend d={d} />
          </Panel>
          <div className="grid gap-5 lg:grid-cols-2">
            <Services d={d} />
            <Feedback d={d} />
          </div>
        </div>
      )}
    </div>
  );
}

function Kpis({ d }: { d: Performance }) {
  const { p, locale } = useP();
  const { wsHref } = useWs();
  const k = d.kpis;
  const n = (v: number) =>
    new Intl.NumberFormat(locale === "rw" ? "en" : locale).format(v);
  const tiles: { key: keyof typeof k; value: React.ReactNode; note: string }[] =
    [
      {
        key: "completed",
        value: n(k.completed.you),
        note: fill(p.median, { v: n(k.completed.median) }),
      },
      {
        key: "onTime",
        value: `${n(k.onTime.you)}%`,
        note: fill(p.median, { v: `${n(k.onTime.median)}%` }),
      },
      {
        key: "turnaround",
        value: fill(p.days, { n: n(k.turnaround.you) }),
        note: `${fill(p.sla, { v: n(d.sla) })} ${fill(p.median, { v: n(k.turnaround.median) })}`,
      },
      {
        key: "rework",
        value: `${n(k.rework.you)}%`,
        note: fill(p.median, { v: `${n(k.rework.median)}%` }),
      },
      {
        key: "rating",
        value: (
          <span className="inline-flex items-center gap-2">
            {n(k.rating.you)} <StarRating value={k.rating.you} />
          </span>
        ),
        note: fill(p.median, { v: n(k.rating.median) }),
      },
      {
        key: "complaints",
        value: n(k.complaints.you),
        note: fill(p.median, { v: n(k.complaints.median) }),
      },
    ];
  return (
    <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 m-stagger">
      {tiles.map((t, i) => (
        <li
          key={t.key}
          style={{ "--i": i } as React.CSSProperties}
          className="flex min-w-0 flex-col gap-1 border border-border bg-white p-4"
        >
          <span className="text-small text-fg-muted">{p.kpi[t.key]}</span>
          <span className="text-h5 font-semibold tabular-nums">{t.value}</span>
          <span className="text-small text-fg-muted">{t.note}</span>
          <Sparkline
            values={k[t.key].spark}
            label={p.kpi[t.key]}
            className="mt-auto self-end text-navy-700"
          />
        </li>
      ))}
    </ul>
  );
}

const W = 520,
  H = 180,
  PADL = 28,
  PADB = 24,
  PADT = 8;
function Trend({ d }: { d: Performance }) {
  const { p, locale } = useP();
  const { wsHref } = useWs();
  const label = (iso: string) =>
    formatDate(
      iso,
      locale,
      d.range === "30d"
        ? { day: "numeric", month: "short" }
        : { month: "short" },
    );
  const max = Math.max(1, ...d.trend.flatMap((t) => [t.you, t.median]));
  const plotH = H - PADB - PADT;
  const slot = (W - PADL) / d.trend.length;
  const bw = Math.min(36, slot * 0.3);
  const y = (v: number) => PADT + plotH - (v / max) * plotH;
  const grow = (i: number) => ({ animationDelay: `${i * 40}ms` });
  return (
    <div>
      <ul className="mb-3 flex gap-4 text-small"aria-hidden>
        <li className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full"style={{ background: YOU }} />
          {p.you}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{ background: MEDIAN }}
          />
          {p.teamMedian}
        </li>
      </ul>
      <div className="-mx-1 overflow-x-auto px-1"tabIndex={0} role="region"aria-label={p.trend}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto max-h-60 w-full min-w-[30rem]"
        aria-hidden
      >
        {[0, Math.round(max / 2), max].map((v) => (
          <g key={v}>
            <line
              x1={PADL}
              x2={W}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--color-border)"
            />
            <text
              x={PADL - 6}
              y={y(v) + 4}
              textAnchor="end"
              className="fill-fg-muted text-[11px]"
            >
              {v}
            </text>
          </g>
        ))}
        {d.trend.map((t, i) => {
          const c = PADL + slot * i + slot / 2;
          const last = i === d.trend.length - 1;
          return (
            <g key={t.end}>
              {last && (
                <rect
                  x={c - slot / 2 + 2}
                  y={PADT - 4}
                  width={slot - 4}
                  height={plotH + PADB + 4}
                  rx={10}
                  fill="var(--color-navy-50)"
                />
              )}
              <rect
                x={c - bw - 2}
                y={y(t.you)}
                width={bw}
                height={Math.max(1, (t.you / max) * plotH)}
                rx={3}
                fill={YOU}
                style={grow(i)}
                className="m-grow"
              />
              <rect
                x={c + 2}
                y={y(t.median)}
                width={bw}
                height={Math.max(1, (t.median / max) * plotH)}
                rx={3}
                fill={MEDIAN}
                style={grow(i)}
                className="m-grow"
              />
              <text
                x={c}
                y={H - 6}
                textAnchor="middle"
                className="fill-fg-muted text-[12px]"
              >
                {label(t.end)}
              </text>
            </g>
          );
        })}
      </svg>
      </div>
      <div className="sr-only">
        <table>
          <caption>{p.trendLabel}</caption>
          <thead>
            <tr>
              <th scope="col">{p.period}</th>
              <th scope="col">{p.you}</th>
              <th scope="col">{p.teamMedian}</th>
            </tr>
          </thead>
          <tbody>
            {d.trend.map((t) => (
              <tr key={t.end}>
                <th scope="row">{fill(p.ending, { date: label(t.end) })}</th>
                <td>{t.you}</td>
                <td>{t.median}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-small text-fg-muted">{p.footnote}</p>
    </div>
  );
}

type Svc = Performance["services"][number];
function Services({ d }: { d: Performance }) {
  const { p } = useP();
  const cols: OpsColumn<Svc>[] = [
    {
      key: "service",
      label: p.cols.service,
      cell: (r) => r.service,
      sort: (r) => r.service,
      wrap: true,
    },
    {
      key: "cases",
      label: p.cols.cases,
      cell: (r) => r.cases,
      sort: (r) => r.cases,
      align: "right",
    },
    {
      key: "onTime",
      label: p.cols.onTime,
      cell: (r) => `${r.onTime}%`,
      sort: (r) => r.onTime,
      align: "right",
    },
    {
      key: "turnaround",
      label: p.cols.turnaround,
      cell: (r) => fill(p.daysShort, { n: r.turnaround }),
      sort: (r) => r.turnaround,
      align: "right",
    },
    {
      key: "rework",
      label: p.cols.rework,
      cell: (r) => `${r.rework}%`,
      sort: (r) => r.rework,
      align: "right",
    },
  ];
  return (
    <Panel title={p.byService} padded={false}>
      <div className="px-2 pb-2 sm:px-3">
        <OpsTable
          rows={d.services}
          columns={cols}
          rowKey={(r) => r.service}
          label={p.byServiceLabel}
          empty={<EmptyPanel compact title={p.noServices} />}
        />
      </div>
    </Panel>
  );
}

function Feedback({ d }: { d: Performance }) {
  const { p, locale } = useP();
  const { wsHref } = useWs();
  return (
    <Panel title={p.feedback}>
      {d.feedback.length ? (
        <ul className="grid divide-y divide-border">
          {d.feedback.map((f) => (
            <li
              key={f.id}
              className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
            >
              <Avatar name={f.client} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center justify-between gap-2 text-label">
                  {f.client} <StarRating value={f.rating} />
                </p>
                <p className="text-small text-fg-muted">
                  “{p.notes[f.note]}” · {formatDate(f.at, locale)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyPanel compact title={p.noFeedback} />
      )}
    </Panel>
  );
}
