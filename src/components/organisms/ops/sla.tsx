"use client";
// U12 SLA & escalations (board 12 v2 SL1–SL4 + PL1). Columns come from the shared case list + slaColumns (business hours,
// paused excluded); ladder from escalations(); extend calls the real PATCH /api/admin/applications/{code}/due.
import { useState } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx, formatDate, formatDateTime } from "@/shared/format";
import { useShortcut } from "@/lib/ops/shortcuts";
import { useCases, type CaseVM } from "@/lib/ops/api";
import {
  escalations,
  formatDuration,
  HOLIDAYS_2026,
  BUSINESS,
} from "@/lib/ops/sla";
import {
  slaColumns,
  useSlaHealth,
  useSlaRules,
  useExtendDue,
  useEscalate,
  PAUSED,
} from "@/lib/ops/c";
import { opsSla } from "@/content/pages/ops-sla";
import { opsCommon } from "@/content/pages/ops-common";
import { SlaChip, OpsStatus } from "@/components/atoms/ops";
import {
  KpiTile,
  Panel,
  PanelError,
  EmptyPanel,
  ReasonDialog,
} from "@/components/molecules/ops/ops";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Avatar } from "@/components/atoms/misc";
import { Icon } from "@/components/atoms/icon";
import { DateInput, Switch } from "@/components/atoms/field";
import { Skeleton } from "@/components/atoms/feedback";
import { Dialog } from "@/components/atoms/dialog";
import { useToast } from "@/components/atoms/toast";
import { usePhone, useNow } from "@/components/atoms/step-up";

const useS = () => {
  const { locale } = useI18n();
  return { c: opsSla(locale), common: opsCommon(locale), locale };
};
const fill = (s: string, v: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
type Col = "risk" | "today" | "breach";
const COLS: Col[] = ["risk", "today", "breach"];
const COL_STYLE: Record<Col, string> = {
  risk: "text-warning",
  today: "text-link",
  breach: "text-danger",
};

export function SlaView() {
  const { c } = useS();
  const p = useUrlParams();
  const cases = useCases();
  const now = useNow(30_000);
  const phone = usePhone();
  const selected = p.get("case");
  const showRules = p.get("rules") === "1";
  const col = (
    COLS.includes(p.get("col") as Col) ? p.get("col") : "risk"
  ) as Col;
  const cols = cases.data && now ? slaColumns(cases.data.cases, now) : null;
  const flat = cols ? [...cols.breach, ...cols.today, ...cols.risk] : [];
  const idx = flat.findIndex((x) => x.ref === selected);
  useShortcut(
    "j",
    "Next case",
    () =>
      flat.length &&
      setUrlParams({ case: flat[Math.min(flat.length - 1, idx + 1)].ref }),
    "list",
  );
  useShortcut(
    "k",
    "Previous case",
    () => flat.length && setUrlParams({ case: flat[Math.max(0, idx - 1)].ref }),
    "list",
  );
  const current =
    flat.find((x) => x.ref === selected) ??
    cases.data?.cases.find((x) => x.ref === selected) ??
    (!selected && !phone ? (flat[0] ?? null) : null); // desktop opens on the most urgent case (breached first), like board SL2

  return (
    <div className="grid gap-5 pb-24 lg:pb-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-h2">{c.title}</h1>
          <p className="text-body text-fg-muted">{c.lede}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          aria-expanded={showRules}
          onClick={() => setUrlParams({ rules: showRules ? null : "1" })}
        >
          <Icon name="file" size={14} aria-hidden />
          {showRules ? c.hideRules : c.rules}
        </Button>
      </header>
      <HealthTiles />
      {showRules && <RulesTable />}
      {cases.isError ? (
        <PanelError what={c.loadErr.cases} onRetry={() => cases.refetch()} />
      ) : !cols ? (
        <div className="grid gap-3 md:grid-cols-3" aria-busy>
          {COLS.map((k) => (
            <Skeleton key={k} className="h-72" />
          ))}
        </div>
      ) : (
        <>
          <p className="sr-only" aria-live="polite">
            {fill(c.live, { n: cols.risk.length + cols.breach.length })}
          </p>
          {/* Phone column switcher (PL1) */}
          <div
            role="tablist"
            aria-label={c.title}
            className="flex gap-1 overflow-x-auto md:hidden"
          >
            {COLS.map((k) => (
              <button
                key={k}
                role="tab"
                type="button"
                aria-selected={col === k}
                onClick={() => setUrlParams({ col: k === "risk" ? null : k })}
                className={cx(
                  "h-9 shrink-0 px-3.5 text-small",
                  col === k
                    ? "bg-secondary text-on-secondary"
                    : "border border-border bg-white",
                )}
              >
                {c.cols[k]} ({cols[k].length})
              </button>
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
            <div className="grid gap-4 md:grid-cols-3">
              {COLS.map((k) => (
                <section
                  key={k}
                  aria-labelledby={`col-${k}`}
                  className={cx(
                    "grid content-start gap-2 bg-ink-100 p-3",
                    !phone || col === k ? "" : "hidden",
                  )}
                >
                  <h2
                    id={`col-${k}`}
                    className="flex items-center justify-between gap-2 px-1 text-label"
                  >
                    <span
                      className={cx("flex items-center gap-1.5", COL_STYLE[k])}
                    >
                      <Icon
                        name={
                          k === "breach"
                            ? "clock"
                            : k === "today"
                              ? "calendar"
                              : "zap"
                        }
                        size={15}
                        aria-hidden
                      />
                      <span className="text-fg">{c.cols[k]}</span>
                    </span>
                    <span className="bg-white px-2 text-eyebrow tabular">
                      {cols[k].length}
                    </span>
                  </h2>
                  <p className="px-1 text-eyebrow text-fg-subtle">
                    {c.colHelp[k]}
                  </p>
                  {cols[k].length === 0 ? (
                    <EmptyPanel compact title={c.empty[k]} />
                  ) : (
                    <ul className="grid gap-2">
                      {cols[k].map((x) => (
                        <li key={x.ref}>
                          <SlaCard x={x} active={x.ref === current?.ref} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
              <p className="flex items-center gap-2 text-small text-fg-muted md:col-span-3">
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="size-4"
                  fill="currentColor"
                >
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
                {fill(c.paused, { n: cols.paused })}
              </p>
            </div>
            {phone ? (
              <Dialog
                open={!!current}
                onClose={() => setUrlParams({ case: null })}
                side="bottom"
                title={c.ladder}
              >
                {current && <Ladder x={current} />}
              </Dialog>
            ) : (
              <Panel title={c.ladder} className="h-fit">
                {current ? (
                  <Ladder x={current} />
                ) : (
                  <p className="text-small text-fg-muted">{c.pick}</p>
                )}
              </Panel>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SlaCard({ x, active }: { x: CaseVM; active: boolean }) {
  const { c } = useS();
  const lead = x.assignees.find((a) => a.role === "lead");
  return (
    <button
      type="button"
      onClick={() => setUrlParams({ case: x.ref })}
      aria-pressed={active}
      className={cx(
        "grid w-full gap-2 border bg-white p-3 text-left transition-colors",
        active
          ? "border-navy-700 ring-2 ring-navy-700/15"
          : "border-border hover:border-navy-300",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-medium tabular">{x.ref}</span>
        {lead ? (
          <Avatar name={lead.name} size="sm" />
        ) : (
          <span className="text-eyebrow text-fg-subtle">—</span>
        )}
      </span>
      <span className="truncate text-small text-fg-muted">{x.service}</span>
      <span className="flex flex-wrap items-center gap-1.5">
        <SlaChip due={x.dueAt} />
        <span className="text-eyebrow text-fg-subtle">{c.leftBiz}</span>
      </span>
    </button>
  );
}

function HealthTiles() {
  const { c } = useS();
  const h = useSlaHealth();
  if (h.isError)
    return <PanelError what={c.loadErr.health} onRetry={() => h.refetch()} />;
  if (!h.data)
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile label={c.tiles.met} value={`${h.data.metPct}%`} icon="check" />
      <KpiTile
        label={c.tiles.firstResponse}
        value={formatDuration(h.data.avgFirstResponseMs)}
        icon="clock"
      />
      <KpiTile
        label={c.tiles.breaches}
        value={h.data.breaches}
        tone={h.data.breaches ? "danger" : "neutral"}
        icon="zap"
      />
      <KpiTile
        label={c.tiles.trend}
        value={`${h.data.trend.at(-1)}%`}
        spark={h.data.trend}
        icon="chart"
      />
    </div>
  );
}

function Ladder({ x }: { x: CaseVM }) {
  const { c, locale } = useS();
  const toast = useToast();
  const now = useNow(30_000);
  const escalate = useEscalate();
  const [extend, setExtend] = useState(false);
  useShortcut("e", "Extend deadline", () => setExtend(true), "case");
  if (!x.dueAt) return null;
  const lead = x.assignees.find((a) => a.role === "lead");
  const due = Date.parse(x.dueAt);
  const steps = escalations(due);
  const paused = PAUSED.includes(x.status);
  const label = {
    warn: fill(c.steps.warn, { a: lead?.name ?? c.unassigned }),
    manager: fill(c.steps.manager, { m: "Diane Mukamana" }),
    senior: c.steps.senior,
  };
  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <Link
          href={localHref(locale, `/ops/cases/${x.ref}`)}
          className="font-medium tabular underline-offset-4 hover:underline"
        >
          {x.ref}
        </Link>
        <span className="text-small text-fg-muted">
          {x.service} · {x.client}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <OpsStatus status={x.status} sub={x.subStatus} />
          <SlaChip due={x.dueAt} paused={paused} />
        </span>
      </div>
      <ol className="grid gap-0">
        {steps.map((s, i) => {
          const passed = now >= s.at;
          const isNow =
            passed && (i === steps.length - 1 || now < steps[i + 1].at);
          return (
            <li
              key={s.step}
              className="relative grid grid-cols-[1.5rem_1fr] gap-3 pb-4 last:pb-0"
            >
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cx(
                    "absolute top-6 left-[0.7rem] h-[calc(100%-1.25rem)] w-0.5",
                    passed ? "bg-navy-700" : "bg-border",
                  )}
                />
              )}
              <span
                aria-hidden
                className={cx(
                  "mt-0.5 flex size-6 items-center justify-center rounded-full",
                  isNow
                    ? "bg-gold-400 text-on-gold ring-2 ring-navy-700"
                    : passed
                      ? "bg-navy-700 text-white"
                      : "border-2 border-border-strong bg-white",
                )}
              >
                {passed && <Icon name={isNow ? "zap" : "check"} size={12} />}
              </span>
              <span className="grid">
                <span className="text-small font-medium">{label[s.step]}</span>
                <span className="text-eyebrow text-fg-subtle">
                  {formatDateTime(s.at, locale)} ·{" "}
                  {isNow ? c.now : passed ? c.done : c.next}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          size="sm"
          dots
          onClick={() => setExtend(true)}
          className="sm:col-span-2"
        >
          {c.actions.extend}
        </Button>
        <ButtonLink
          size="sm"
          variant="outline"
          href={localHref(locale, `/ops/assign/${x.ref}`)}
        >
          {c.actions.reassign}
        </ButtonLink>
        <ButtonLink
          size="sm"
          variant="outline"
          href={localHref(locale, `/ops/conversations?case=${x.ref}`)}
        >
          {c.actions.message}
        </ButtonLink>
        <Button
          size="sm"
          variant="ghost"
          className="sm:col-span-2"
          loading={escalate.isPending}
          onClick={() =>
            escalate.mutate(
              { ref: x.ref, reason: "manual escalation from SLA board" },
              {
                onSuccess: () =>
                  toast({
                    title: fill(c.escalated, { r: x.ref }),
                    tone: "success",
                  }),
                onError: () => toast({ title: c.failed, tone: "danger" }),
              },
            )
          }
        >
          {c.actions.escalate}
        </Button>
      </div>
      <ExtendDialog x={x} open={extend} onClose={() => setExtend(false)} />
    </div>
  );
}

const ymd = (t: number) =>
  new Date(t + 2 * 3600_000).toISOString().slice(0, 10);
const isWorkday = (d: string) =>
  BUSINESS.days.includes(new Date(`${d}T12:00:00Z`).getUTCDay()) &&
  !HOLIDAYS_2026.has(d);

function ExtendDialog({
  x,
  open,
  onClose,
}: {
  x: CaseVM;
  open: boolean;
  onClose: () => void;
}) {
  const { c, locale } = useS();
  const toast = useToast();
  const extend = useExtendDue();
  const now = useNow(60_000);
  const [date, setDate] = useState("");
  const [notify, setNotify] = useState(true);
  const [why, setWhy] = useState("");
  const dateOk = !!date && date > ymd(now) && isWorkday(date);
  const reasons = Object.entries(c.extend.reasons).map(([value, label]) => ({
    value,
    label,
  }));
  return (
    // Radios live inside ReasonDialog; catch their change here so the client preview shows the picked reason.
    <div
      className="contents"
      onChange={(e) => {
        const t = e.target as HTMLInputElement;
        if (t.type === "radio") setWhy(t.value);
      }}
    >
    <ReasonDialog
      open={open}
      onClose={onClose}
      title={c.extend.title}
      description={fill(c.extend.current, {
        d: formatDateTime(x.dueAt!, locale),
      })}
      options={reasons}
      asRadios
      noteLabel={c.extend.note}
      audited
      confirmLabel={c.extend.confirm}
      extra={
        <div className="grid gap-3">
          <label className="grid gap-1.5">
            <span className="text-label">{c.extend.date}</span>
            <DateInput
              value={date}
              min={ymd(now + 86_400_000)}
              onChange={(e) => setDate(e.target.value)}
              aria-invalid={(!!date && !dateOk) || undefined}
            />
            {date && !dateOk && (
              <span className="text-small font-medium text-danger">
                {c.extend.dateErr}
              </span>
            )}
          </label>
          <Switch
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            label={<span className="text-small">{c.extend.notify}</span>}
          />
          {notify && (
            <figure className="grid gap-1 bg-bg-subtle p-3">
              <figcaption className="text-eyebrow text-fg-subtle">
                {c.extend.preview}
              </figcaption>
              <p className="text-small">
                {fill(c.extend.message, {
                  c: x.client.split(" ")[0],
                  s: x.service,
                  r: x.ref,
                  d: date
                    ? formatDate(`${date}T15:00:00Z`, locale, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })
                    : "…",
                  why: (why && c.extend.reasons[why]) || "…",
                })}
              </p>
            </figure>
          )}
        </div>
      }
      onConfirm={async ({ reason, note }) => {
        setWhy(reason);
        if (!dateOk) throw new Error(c.extend.dateErr);
        const old = ymd(Date.parse(x.dueAt!));
        const label = c.extend.reasons[reason];
        await extend.mutateAsync({
          ref: x.ref,
          dueDate: date,
          reason: label,
          note,
          notify,
        });
        toast({
          title: fill(c.extend.done, {
            r: x.ref,
            d: formatDate(`${date}T15:00:00Z`, locale),
          }),
          tone: "success",
          action: {
            label: c.undo,
            onClick: () =>
              extend.mutate({
                ref: x.ref,
                dueDate: old,
                reason: `undo: ${label}`,
                note: "",
                notify: false,
              }),
          },
        });
        setDate("");
      }}
    />
    </div>
  );
}

function RulesTable() {
  const { c, common, locale } = useS();
  const q = useSlaRules();
  if (q.isError)
    return <PanelError what={c.loadErr.rules} onRetry={() => q.refetch()} />;
  return (
    <Panel
      title={c.rulesTable.title}
      action={
        <span className="text-eyebrow text-fg-subtle">
          {c.rulesTable.readOnly}
        </span>
      }
    >
      {!q.data ? (
        <Skeleton className="h-48" />
      ) : (
        <>
          <div
            className="overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label={c.rulesTable.title}
          >
            <table className="w-full min-w-[40rem] text-small">
              <thead className="sticky top-0 bg-white text-left text-eyebrow text-fg-subtle">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">
                    {c.rulesTable.service}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    {c.rulesTable.first}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    {c.rulesTable.completion}
                  </th>
                  <th className="py-2 pl-3 font-medium">
                    {c.rulesTable.pauses}
                  </th>
                </tr>
              </thead>
              <tbody>
                {q.data.rules.map((r) => (
                  <tr
                    key={r.service}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-2.5 pr-3 font-medium">{r.name}</td>
                    <td className="px-3 py-2.5 text-right tabular">
                      {fill(c.rulesTable.hours, { n: r.firstResponseH })}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular">
                      {fill(c.rulesTable.days, { n: r.completionDays })}
                    </td>
                    <td className="py-2.5 pl-3 text-fg-muted">
                      {r.pauses.map((s) => common.status[s]).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-small text-fg-muted">
            <Icon name="clock" size={14} aria-hidden />
            {c.rulesTable.business}
          </p>
          <details className="mt-2 text-small">
            <summary className="cursor-pointer underline underline-offset-4">
              {c.rulesTable.holidays}
            </summary>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {[
                ...HOLIDAYS_2026,
                ...q.data.holidays.filter((d) => !HOLIDAYS_2026.has(d)),
              ].map((d) => (
                <li
                  key={d}
                  className="bg-bg-subtle px-2.5 py-0.5 tabular"
                >
                  {formatDate(`${d}T12:00:00Z`, locale, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </Panel>
  );
}
