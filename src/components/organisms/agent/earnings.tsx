"use client";
import { useWs } from "@/lib/agent/ws";
// U11 Earnings & statements (board 11: EA1 dashboard, EA2 allocation drawer, EA3 statements/payouts, EA4 question, PE1 phone).
// Every amount comes from lib/agent/money (D3): eligible × share (X-2: no per-case licence), e.g. 15,000 → 4,500. The drawer shows the frozen r.amount.
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDate, formatMoney } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import {
  totals,
  type MoneyTotals,
} from "@/lib/agent/money";
import {
  SERIES,
  matches,
  useEarnings,
  usePayouts,
  useQuestion,
  useStatementDownload,
  useStatements,
  type EarnFilter,
  type EarnRow,
  type MonthBar,
  type Payout,
} from "@/lib/agent/e";
import { agentEarnings } from "@/content/pages/agent-earnings";
import { fill } from "@/content/pages/agent-common";
import {
  MONEY_FILL,
  MoneyStatePill,
  PageHead,
  SkeletonRows,
} from "@/components/atoms/agent";
import { EmptyPanel, Panel, PanelError } from "@/components/molecules/ops/ops";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { usePhone } from "@/components/atoms/step-up";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Radio, Select, Textarea } from "@/components/atoms/field";
import { FileDrop } from "@/components/atoms/file-drop";
import { Icon } from "@/components/atoms/icon";
import { Tabs } from "@/components/atoms/tabs";
import { useToast } from "@/components/atoms/toast";

const useE = () => {
  const { locale } = useI18n();
  const { wsHref } = useWs();
  return { e: agentEarnings(locale), locale };
};
const FILTERS: EarnFilter[] = ["paid", "scheduled", "pending", "deducted"];
const isFilter = (v: string | null): v is EarnFilter =>
  !!v && ["pending", "approved", "scheduled", "paid", "deducted"].includes(v);
/** Pending = accent-soft (allocated/approved fill); the rest map 1:1 onto MONEY_FILL (board-11 fix). */
const FILLS: Record<(typeof SERIES)[number], string> = {
  paid: MONEY_FILL.paid,
  scheduled: MONEY_FILL.scheduled,
  pending: MONEY_FILL.allocated,
  deducted: MONEY_FILL.deducted,
};
const monthName = (
  m: string,
  l: Parameters<typeof formatDate>[1],
  short = false,
) =>
  formatDate(
    `${m}-15T12:00:00Z`,
    l,
    short ? { month: "short" } : { month: "long", year: "numeric" },
  );

/** Stage 8 slots (/work): `head` under the title (tab bar), `replace` swaps the allocations body,
 *  `bottom` replaces statements/payouts/method, `drawerNote` adds to the allocation drawer. /agent passes none. */
export function EarningsView({
  head,
  replace,
  bottom,
  drawerNote,
  title,
}: {
  head?: React.ReactNode;
  replace?: React.ReactNode;
  bottom?: React.ReactNode;
  drawerNote?: (r: EarnRow) => React.ReactNode;
  title?: string;
} = {}) {
  const { e, locale } = useE();
  const { wsHref } = useWs();
  const q = useUrlParams();
  const month = q.get("month") ?? "";
  const stateParam = q.get("state");
  const filter = isFilter(stateParam) ? stateParam : null;
  const openId = q.get("alloc");
  const earnings = useEarnings(month);
  const data = earnings.data;
  const rows = data?.rows ?? [];
  const pct = Math.round((data?.sharePct ?? 0.3) * 100);
  const t = totals(rows);
  const shown = rows.filter((r) => matches(r, filter));
  const open = rows.find((r) => r.id === openId) ?? null;
  const [asking, setAsking] = useState<EarnRow | null>(null);
  const current = data?.month ?? month;

  const pick = (m: string) => setUrlParams({ month: m, alloc: null });
  const setFilter = (f: EarnFilter | null) => setUrlParams({ state: f });

  function exportCsv() {
    const head = [
      e.cols.ref,
      e.cols.service,
      e.cols.client,
      e.cols.eligible,
      fill(e.cols.share, { pct }),
      e.cols.amount,
      e.cols.state,
      e.cols.date,
    ];
    const lines = shown.map((r) => [
      r.ref,
      r.service,
      r.client,
      r.eligible,
      r.amount,
      r.amount,
      r.state,
      r.at.slice(0, 10),
    ]);
    const csv = [head, ...lines]
      .map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    Object.assign(document.createElement("a"), {
      href: url,
      download: `earnings-${current}.csv`,
    }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const months = data?.months ?? [];
  const firstMonth = !!data && months.length <= 1 && rows.length === 0;

  return (
    <div className="pb-24 lg:pb-8">
      <PageHead
        title={title ?? e.title}
        sub={fill(e.sub, { pct })}
        actions={
          <>
            <label className="sr-only"htmlFor="earn-month">
              {e.month}
            </label>
            <Select
              id="earn-month"
              className="h-10 w-auto min-w-44"
              value={current}
              onChange={(ev) => pick(ev.target.value)}
              disabled={!data}
            >
              {!months.some((m) => m.month === current) && current && (
                <option value={current}>{monthName(current, locale)}</option>
              )}
              {[...months].reverse().map((m) => (
                <option key={m.month} value={m.month}>
                  {monthName(m.month, locale)}
                </option>
              ))}
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              disabled={!shown.length}
            >
              <Icon name="file" size={16} aria-hidden /> {e.export}
            </Button>
          </>
        }
      />
      {head}
      {replace ? (
        replace
      ) : earnings.isError && !data ? (
        <PanelError what={e.what.earnings} onRetry={() => earnings.refetch()} />
      ) : !data ? (
        <SkeletonRows n={5} />
      ) : firstMonth ? (
        <EmptyPanel title={e.firstMonth} body={e.firstMonthBody} />
      ) : (
        <div className="grid gap-5">
          <Tiles t={t} filter={filter} onPick={setFilter} />
          <Panel title={e.chart}>
            <MonthChart months={months} selected={current} onSelect={pick} />
          </Panel>
          <Panel padded={false}>
            <div
              className="flex flex-wrap items-center gap-2 p-4 sm:p-5"
              role="group"
              aria-label={e.filterLabel}
            >
              <Chip
                on={!filter}
                onClick={() => setFilter(null)}
                label={e.chips.all}
                n={rows.length}
              />
              {FILTERS.map((f) => (
                <Chip
                  key={f}
                  on={filter === f}
                  onClick={() => setFilter(f)}
                  label={e.chips[f]}
                  n={rows.filter((r) => matches(r, f)).length}
                />
              ))}
              {filter === "approved" && (
                <Chip
                  on
                  onClick={() => setFilter(null)}
                  label={e.chips.approved}
                  n={shown.length}
                />
              )}
            </div>
            <div className="px-2 pb-2 sm:px-3">
              <AllocationsTable
                rows={shown}
                pct={pct}
                month={monthName(current, locale)}
                onOpen={(r) => setUrlParams({ alloc: r.id })}
                empty={
                  rows.length ? (
                    <EmptyPanel
                      compact
                      title={e.emptyFilter}
                      body={e.emptyFilterBody}
                      action={
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setFilter(null)}
                        >
                          {e.showAll}
                        </Button>
                      }
                    />
                  ) : (
                    <EmptyPanel
                      compact
                      title={e.noAllocations}
                      body={e.noAllocationsBody}
                    />
                  )
                }
              />
            </div>
          </Panel>
        </div>
      )}
      {bottom === undefined ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <StatementsAndPayouts />
          <PayoutMethod />
        </div>
      ) : (
        bottom
      )}
      <AllocationDrawer
        row={open}
        pct={pct}
        onClose={() => setUrlParams({ alloc: null })}
        onQuestion={setAsking}
        note={drawerNote}
      />
      <QuestionDialog row={asking} onClose={() => setAsking(null)} />
    </div>
  );
}

function Tiles({
  t,
  filter,
  onPick,
}: {
  t: MoneyTotals;
  filter: EarnFilter | null;
  onPick: (f: EarnFilter | null) => void;
}) {
  const { e, locale } = useE();
  const { wsHref } = useWs();
  const keys = [
    "allocated",
    "approved",
    "scheduled",
    "paid",
    "deducted",
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 m-stagger">
      {keys.map((k, i) => {
        const f = k === "allocated" ? null : k;
        const on = filter === f;
        const v =
          k === "deducted"
            ? `−${formatMoney(t[k], "RWF", locale)}`
            : formatMoney(t[k], "RWF", locale);
        return (
          <button
            key={k}
            type="button"
            style={{ "--i": i } as React.CSSProperties}
            aria-pressed={on}
            title={e.tileHint}
            onClick={() => onPick(f)}
            className={cx(
              "m-press m-tone min-w-0 border bg-white p-4 text-left",
              on
                ? "border-navy-700 ring-2 ring-focus/20"
                : "border-border hover:border-border-strong",
              k === "deducted" && "max-sm:col-span-2",
            )}
          >
            <span className="block text-small text-fg-muted">{e.tiles[k]}</span>
            <span
              key={v}
              aria-live="polite"
              className="mt-1 block truncate text-h5 font-semibold tabular-nums m-pop"
            >
              {v}
            </span>
            {t[k] === 0 &&
              (k === "approved" || k === "scheduled" || k === "paid") && (
                <span className="mt-0.5 block text-small text-fg-muted">
                  {e.zero[k]}
                </span>
              )}
          </button>
        );
      })}
    </div>
  );
}

function Chip({
  on,
  onClick,
  label,
  n,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  n: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx(
        "m-press m-tone inline-flex h-9 items-center gap-1.5 border px-3.5 text-label",
        on
          ? "border-navy-700 bg-secondary text-on-navy"
          : "border-border-strong bg-white hover:bg-ink-100",
      )}
    >
      {label} <span className="tabular-nums opacity-80">({n})</span>
    </button>
  );
}

// ---------------------------------------------------------------- stacked monthly bars (inline SVG + hidden table)
const W = 520,
  H = 200,
  PADL = 44,
  PADB = 24,
  PADT = 8;
function MonthChart({
  months,
  selected,
  onSelect,
}: {
  months: MonthBar[];
  selected: string;
  onSelect: (m: string) => void;
}) {
  const { e, locale } = useE();
  const { wsHref } = useWs();
  const total = (m: MonthBar) => SERIES.reduce((s, k) => s + m[k], 0);
  const max = Math.max(1, ...months.map(total));
  const nice = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / nice) * nice;
  const plotH = H - PADB - PADT;
  const slot = (W - PADL) / Math.max(1, months.length);
  const bw = Math.min(64, slot * 0.6);
  const y = (v: number) => PADT + plotH - (v / top) * plotH;
  const ticks = [0, top / 2, top];
  const money = (v: number) => formatMoney(v, "RWF", locale);
  const compact = (v: number) =>
    new Intl.NumberFormat(locale === "rw" ? "en" : locale, {
      notation: "compact",
    }).format(v);
  return (
    <div>
      <ul
        className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-small"
        aria-hidden
      >
        {SERIES.map((k) => (
          <li key={k} className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ background: FILLS[k] }}
            />
            {e.series[k]}
          </li>
        ))}
      </ul>
      <p className="sr-only">{e.chartHint}</p>
      <div className="-mx-1 overflow-x-auto px-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto max-h-60 w-full min-w-[30rem]"
        role="group"
        aria-label={e.chart}
      >
        {ticks.map((v) => (
          <g key={v} aria-hidden>
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
              className="fill-fg-muted text-[11px] tabular-nums"
            >
              {compact(v)}
            </text>
          </g>
        ))}
        {months.map((m, i) => {
          const cx0 = PADL + slot * i + slot / 2;
          const on = m.month === selected;
          let acc = 0;
          const label = fill(e.barLabel, {
            month: monthName(m.month, locale),
            paid: money(m.paid),
            scheduled: money(m.scheduled),
            pending: money(m.pending),
            deducted: money(m.deducted),
          });
          return (
            <g
              key={m.month}
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-pressed={on}
              onClick={() => onSelect(m.month)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  onSelect(m.month);
                }
              }}
              className="cursor-pointer outline-none [&:focus-visible>rect:first-child]:stroke-navy-700 [&:focus-visible>rect:first-child]:stroke-2"
            >
              <rect
                x={cx0 - slot / 2 + 2}
                y={PADT - 4}
                width={slot - 4}
                height={plotH + PADB + 4}
                rx={10}
                fill={on ? "var(--color-navy-50)" : "transparent"}
                className="m-tone"
              />
              <g className="m-grow"style={{ animationDelay: `${i * 40}ms` }}>
                {SERIES.map((k) => {
                  const v = m[k];
                  const y0 = y(acc + v),
                    h = (v / top) * plotH;
                  acc += v;
                  return v ? (
                    <rect
                      key={k}
                      x={cx0 - bw / 2}
                      y={y0}
                      width={bw}
                      height={Math.max(1, h)}
                      fill={FILLS[k]}
                    />
                  ) : null;
                })}
              </g>
              <text
                x={cx0}
                y={H - 6}
                textAnchor="middle"
                className={cx(
                  "text-[12px]",
                  on ? "fill-navy-700 font-semibold" : "fill-fg-muted",
                )}
                aria-hidden
              >
                {monthName(m.month, locale, true)}
              </text>
            </g>
          );
        })}
      </svg>
      </div>
      <div className="sr-only">
        <table>
          <caption>{e.chart}</caption>
          <thead>
            <tr>
              <th scope="col">{e.tableMonth}</th>
              {SERIES.map((k) => (
                <th key={k} scope="col">
                  {e.series[k]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.month}>
                <th scope="row">{monthName(m.month, locale)}</th>
                {SERIES.map((k) => (
                  <td key={k}>{money(m[k])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- allocations table → phone cards
function QuestionChip({ q }: { q: EarnRow["question"] }) {
  const { e } = useE();
  if (!q) return null;
  return (
    <span className="inline-flex h-6 items-center gap-1 bg-info-bg px-2 text-eyebrow font-medium text-info whitespace-nowrap">
      <Icon name="message" size={12} aria-hidden />
      {q.status === "open" ? e.questionOpen : e.questionAnswered}
    </span>
  );
}

function AllocationsTable({
  rows,
  pct,
  month,
  onOpen,
  empty,
}: {
  rows: EarnRow[];
  pct: number;
  month: string;
  onOpen: (r: EarnRow) => void;
  empty: React.ReactNode;
}) {
  const { e, locale } = useE();
  const { wsHref } = useWs();
  const money = (v: number) => formatMoney(v, "RWF", locale);
  const cols: OpsColumn<EarnRow>[] = [
    {
      key: "ref",
      label: e.cols.ref,
      // Single click opens the drawer (the table row itself only focuses on click).
      cell: (r) => (
        <button
          type="button"
          onClick={() => onOpen(r)}
          className="font-medium text-navy-700 underline-offset-4 hover:underline"
        >
          {r.ref}
        </button>
      ),
      sort: (r) => r.ref,
    },
    {
      key: "service",
      label: e.cols.service,
      cell: (r) => r.service,
      sort: (r) => r.service,
    },
    {
      key: "client",
      label: e.cols.client,
      cell: (r) => r.client,
      sort: (r) => r.client,
    },
    {
      key: "eligible",
      label: e.cols.eligible,
      cell: (r) => money(r.eligible),
      sort: (r) => r.eligible,
      align: "right",
      card: false,
    },
    {
      key: "share",
      label: fill(e.cols.share, { pct }),
      cell: (r) => money(r.amount),
      align: "right",
      card: false,
    },
    {
      key: "amount",
      label: e.cols.amount,
      cell: (r) => <span className="font-semibold">{money(r.amount)}</span>,
      sort: (r) => r.amount,
      align: "right",
    },
    {
      key: "state",
      label: e.cols.state,
      wrap: true,
      cell: (r) => (
        <span className="inline-flex flex-wrap gap-1">
          <MoneyStatePill state={r.state} />
          <QuestionChip q={r.question} />
        </span>
      ),
    },
    {
      key: "date",
      label: e.cols.date,
      cell: (r) =>
        formatDate(r.at, locale, {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
      sort: (r) => r.at,
    },
  ];
  return (
    <OpsTable
      rows={rows}
      columns={cols}
      rowKey={(r) => r.id}
      label={fill(e.tableLabel, { month })}
      rowLabel={(r) => `${r.ref} · ${r.service} · ${money(r.amount)}`}
      onOpen={onOpen}
      shortcuts
      empty={empty}
      renderCard={(r) => (
        <div className="grid gap-1 text-left">
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium">{r.ref}</span>
            <span className="inline-flex flex-wrap justify-end gap-1">
              <MoneyStatePill state={r.state} />
              <QuestionChip q={r.question} />
            </span>
          </div>
          <span className="text-small text-fg-muted">
            {r.service} · {r.client}
          </span>
          <span className="text-h5 font-semibold tabular-nums">
            {money(r.amount)}
          </span>
          <span className="text-small text-fg-muted">
            {formatDate(r.at, locale, {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
      )}
    />
  );
}

// ---------------------------------------------------------------- EA2 drawer
function AllocationDrawer({
  row,
  pct,
  onClose,
  onQuestion,
  note,
}: {
  row: EarnRow | null;
  pct: number;
  onClose: () => void;
  onQuestion: (r: EarnRow) => void;
  note?: (r: EarnRow) => React.ReactNode;
}) {
  const { e, locale } = useE();
  const { wsHref } = useWs();
  const phone = usePhone();
  const money = (v: number) => formatMoney(v, "RWF", locale);
  const day = (iso: string) =>
    formatDate(iso, locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  if (!row)
    return (
      <Dialog
        open={false}
        onClose={onClose}
        title={e.drawer}
        side={phone ? "bottom" : "right"}
      />
    );
  const r = row;
  const q = r.question;
  const steps: { done: boolean; text: string }[] = [
    { done: true, text: `${e.tl.allocated} · ${day(r.at)}` },
    r.approvedAt
      ? {
          done: true,
          text: `${fill(e.tl.approved, { name: r.approvedBy })} · ${day(r.approvedAt)}`,
        }
      : { done: false, text: fill(e.tl.approvedWait, { name: r.approvedBy }) },
    r.payout
      ? { done: true, text: fill(e.tl.scheduled, { date: day(r.payout.date) }) }
      : { done: false, text: e.tl.scheduledWait },
    r.payout && r.payout.status === "paid"
      ? {
          done: true,
          text: fill(e.tl.paid, {
            date: day(r.payout.date),
            ref: r.payout.ref,
          }),
        }
      : { done: false, text: e.tl.paidWait },
  ];
  return (
    <Dialog
      open
      onClose={onClose}
      side={phone ? "bottom" : "right"}
      title={e.drawer}
      description={`${r.ref} – ${r.service}`}
      footer={
        <>
          {r.mine && (
            <Link
              href={localHref(locale, wsHref(`/agent/cases/${r.ref}`))}
              className="inline-flex h-10 items-center px-4 text-label underline underline-offset-4"
            >
              {e.viewCase}
            </Link>
          )}
          {!q && <Button onClick={() => onQuestion(r)}>{e.question}</Button>}
        </>
      }
    >
      <p className="text-body">
        <span className="text-fg-muted">{e.clientLabel}:</span> {r.client}
      </p>
      <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-body tabular-nums">
        <dt>{e.eligible}</dt>
        <dd className="text-right">{money(r.eligible)}</dd>
        <dt className="font-semibold">{fill(e.share, { pct })}</dt>
        <dd
          className="text-right text-h5 font-semibold"
          data-testid="alloc-share"
        >
          {money(r.amount)}
        </dd>
      </dl>
      {note?.(r)}
      <h3 className="mt-6 text-label-lg">{e.timeline}</h3>
      <ol className="mt-3 grid gap-3">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-3 text-body">
            <span
              aria-hidden
              className={cx(
                "flex size-5 shrink-0 items-center justify-center rounded-full",
                s.done
                  ? "bg-success text-white"
                  : "border-2 border-border-strong bg-white",
              )}
            >
              {s.done && <Icon name="check" size={12} strokeWidth={3} />}
            </span>
            <span className={s.done ? "" : "text-fg-muted"}>{s.text}</span>
          </li>
        ))}
      </ol>
      {q && (
        <p
          role="status"
          className="mt-6 bg-info-bg p-3 text-small text-info"
        >
          {fill(e.questionStatus, { ref: q.ref, status: e.qStatus[q.status] })}
        </p>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------- EA4 question dialog
const REASONS = ["share", "missing", "deduction", "other"] as const;
function QuestionDialog({
  row,
  onClose,
}: {
  row: EarnRow | null;
  onClose: () => void;
}) {
  const { e } = useE();
  const toast = useToast();
  const m = useQuestion();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<string | null>(null);
  const [err, setErr] = useState<{ reason?: string; note?: string }>({});
  const [shake, setShake] = useState(0);
  const close = () => {
    setReason("");
    setNote("");
    setFile(null);
    setErr({});
    onClose();
  };
  const id = row ? row.id : "";
  const ref = row ? row.ref : "";
  function submit(ev: FormEvent) {
    ev.preventDefault();
    const next = {
      reason: reason ? undefined : e.reasonRequired,
      note: reason === "other" && !note.trim() ? e.noteRequired : undefined,
    };
    setErr(next);
    if (next.reason || next.note) return setShake((s) => s + 1);
    m.mutate(
      { id, reason, note, file },
      {
        onSuccess: (r) => {
          const q = r.question;
          toast({
            tone: "success",
            title: fill(e.sent, { ref: q ? q.ref : "" }),
          });
          close();
        },
        onError: () => toast({ tone: "danger", title: e.sendFailed }),
      },
    );
  }
  return (
    <Dialog
      open={!!row}
      onClose={close}
      title={e.qTitle}
      description={fill(e.qSub, { ref })}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {e.cancel}
          </Button>
          <Button type="submit" form="earn-question" loading={m.isPending}>
            {e.send}
          </Button>
        </>
      }
    >
      <form
        id="earn-question"
        key={shake}
        onSubmit={submit}
        noValidate
        className={cx("grid gap-4", shake > 0 && "m-shake")}
      >
        <fieldset
          className="grid gap-2"
          aria-describedby={err.reason ? "q-reason-err" : undefined}
        >
          <legend className="mb-1 text-label">{e.reason}</legend>
          {err.reason && (
            <p id="q-reason-err"className="text-small font-medium text-danger">
              {err.reason}
            </p>
          )}
          {REASONS.map((r) => (
            <Radio
              key={r}
              name="reason"
              value={r}
              checked={reason === r}
              onChange={() => setReason(r)}
              label={e.reasons[r]}
            />
          ))}
        </fieldset>
        <Field label={e.note} error={err.note}>
          {({ id: fid, describedBy, invalid }) => (
            <Textarea
              id={fid}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={note}
              onChange={(ev) => setNote(ev.target.value)}
              placeholder={e.notePh}
              rows={3}
              maxLength={1000}
            />
          )}
        </Field>
        <div className="grid gap-1.5">
          <span className="text-label">{e.attach}</span>
          {file ? (
            <p className="flex items-center gap-2 text-small">
              <Icon name="file" size={16} aria-hidden /> {file}
              <button
                type="button"
                className="underline"
                onClick={() => setFile(null)}
                aria-label={`${e.cancel} ${file}`}
              >
                ×
              </button>
            </p>
          ) : (
            <FileDrop
              onFiles={(fs) => setFile(fs[0] ? fs[0].name : null)}
              accept="application/pdf,image/*"
              maxSizeMb={10}
            />
          )}
        </div>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------- EA3 statements + payouts
function StatementsAndPayouts() {
  const { e } = useE();
  const [tab, setTab] = useState("statements");
  return (
    <Panel>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          {
            id: "statements",
            label: e.tabs.statements,
            content: <Statements />,
          },
          { id: "payouts", label: e.tabs.payouts, content: <PayoutHistory /> },
        ]}
      />
    </Panel>
  );
}

function Statements() {
  const { e, locale } = useE();
  const { wsHref } = useWs();
  const s = useStatements();
  const dl = useStatementDownload();
  const toast = useToast();
  if (s.isError)
    return (
      <div className="pt-4">
        <PanelError what={e.what.statements} onRetry={() => s.refetch()} />
      </div>
    );
  if (!s.data) return <SkeletonRows n={3} className="pt-4" />;
  if (!s.data.length)
    return (
      <div className="pt-4">
        <EmptyPanel compact title={e.noStatements} body={e.noStatementsBody} />
      </div>
    );
  return (
    <ul className="grid gap-2 pt-4 sm:grid-cols-2 m-stagger">
      {s.data.map((st, i) => {
        const gen = st.status === "generating";
        const busy = dl.isPending && dl.variables === st.month;
        return (
          <li
            key={st.month}
            style={{ "--i": i } as React.CSSProperties}
            className="flex items-center gap-3 border border-border p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap justify-between gap-x-3 text-label">
                <span>{monthName(st.month, locale)}</span>
                <span className="tabular-nums">
                  {formatMoney(st.total, "RWF", locale)}
                </span>
              </p>
              <p
                className="mt-0.5 inline-flex items-center gap-1.5 text-small text-fg-muted"
                aria-live="polite"
              >
                <span
                  aria-hidden
                  className={cx(
                    "size-2 rounded-full",
                    gen
                      ? "bg-warning m-shimmer"
                      : st.status === "available"
                        ? "bg-success"
                        : "bg-navy-100",
                  )}
                />
                {e.st[st.status]}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={gen}
              loading={busy}
              aria-label={fill(e.download, {
                month: monthName(st.month, locale),
              })}
              onClick={() =>
                dl.mutate(st.month, {
                  onError: () =>
                    toast({ tone: "danger", title: e.downloadFailed }),
                })
              }
            >
              <Icon
                name="upload"
                size={16}
                aria-hidden
                className="rotate-180"
              />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

function PayoutHistory() {
  const { e, locale } = useE();
  const { wsHref } = useWs();
  const p = usePayouts();
  const money = (v: number) => formatMoney(v, "RWF", locale);
  const cols: OpsColumn<Payout>[] = [
    {
      key: "date",
      label: e.pcols.date,
      cell: (r) => formatDate(r.date, locale),
      sort: (r) => r.date,
    },
    { key: "method", label: e.pcols.method, cell: (r) => r.method },
    {
      key: "ref",
      label: e.pcols.ref,
      cell: (r) => <span className="font-mono text-small">{r.ref}</span>,
    },
    {
      key: "amount",
      label: e.pcols.amount,
      cell: (r) => money(r.amount),
      align: "right",
    },
    {
      key: "status",
      label: e.pcols.status,
      cell: (r) => (
        <span
          className={cx(
            "inline-flex h-6 items-center gap-1 px-2.5 text-eyebrow font-medium",
            r.status === "paid"
              ? "bg-success-bg text-success"
              : "bg-warning-bg text-warning",
          )}
        >
          <Icon
            name={r.status === "paid" ? "check" : "clock"}
            size={12}
            aria-hidden
          />
          {e.pstatus[r.status]}
        </span>
      ),
    },
  ];
  if (p.isError)
    return (
      <div className="pt-4">
        <PanelError what={e.what.payouts} onRetry={() => p.refetch()} />
      </div>
    );
  if (!p.data) return <SkeletonRows n={3} className="pt-4" />;
  return (
    <div className="pt-4">
      <OpsTable
        rows={p.data.items}
        columns={cols}
        rowKey={(r) => r.id}
        label={e.payoutsLabel}
        empty={
          <EmptyPanel compact title={e.noPayouts} body={e.noPayoutsBody} />
        }
      />
    </div>
  );
}

function PayoutMethod() {
  const { e, locale } = useE();
  const { wsHref } = useWs();
  const p = usePayouts();
  const m = p.data ? p.data.method : null;
  return (
    <Panel title={e.method} className="self-start">
      {p.isError ? (
        <PanelError what={e.what.payouts} onRetry={() => p.refetch()} />
      ) : !m ? (
        <SkeletonRows n={1} />
      ) : (
        <div className="flex flex-wrap items-center gap-3 bg-tint p-4">
          <span
            className="flex size-10 items-center justify-center bg-white text-navy-700"
            aria-hidden
          >
            <Icon name="phone" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-label-lg">
              {m.label} •••• {m.last4}
            </p>
            <p
              className={cx(
                "inline-flex items-center gap-1 text-small",
                "text-fg",
              )}
            >
              <Icon
                name={m.verified ? "check" : "clock"}
                size={14}
                aria-hidden
              />
              {m.verified ? e.verified : e.unverified}
            </p>
          </div>
          <Link
            href={localHref(locale, wsHref("/agent/onboarding/payout"))}
            aria-describedby="payout-update-hint"
            className="m-press inline-flex h-9 items-center bg-white px-4 text-label hover:bg-ink-100"
          >
            {e.update}
          </Link>
          <p
            id="payout-update-hint"
            className="basis-full text-small text-fg-muted"
          >
            {e.updateHint}
          </p>
        </div>
      )}
    </Panel>
  );
}
