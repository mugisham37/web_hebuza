"use client";
// U11 Workload (board 11 WL1–WL4 + PW1): team table + heatmap, agent drawer, approvals, rebalance preview → apply with undo.
import { errorCopy } from "@/lib/api/error-copy";
import { useState } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx, formatDate } from "@/shared/format";
import { useShortcut } from "@/lib/ops/shortcuts";
import { opsWorkload } from "@/content/pages/ops-workload";
import { opsCommon } from "@/content/pages/ops-common";
import {
  useWorkload,
  useAgentDetail,
  useSetCap,
  useRebalance,
  useApprovals,
  useDecideApproval,
  planRebalance,
  type WorkloadAgent,
  type AgentDetail,
  type Approval,
  type AgentCase,
  PAUSED,
} from "@/lib/ops/c";
import {
  CapacityBar,
  SlaChip,
  Sparkline,
  RoleTag,
} from "@/components/atoms/ops";
import {
  HeatCell,
  Panel,
  PanelError,
  EmptyPanel,
} from "@/components/molecules/ops/ops";
import { Tabs } from "@/components/atoms/tabs";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Avatar } from "@/components/atoms/misc";
import { Icon } from "@/components/atoms/icon";
import { Field, Input, Select, Switch, Checkbox } from "@/components/atoms/field";
import { Skeleton } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { useStepUp, StepUpCancelled, usePhone, useNow } from "@/components/atoms/step-up";
import { ApiError } from "@/lib/api/client";

const useW = () => {
  const { locale } = useI18n();
  return { c: opsWorkload(locale), common: opsCommon(locale), locale };
};
const fill = (s: string, v: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const kigaliDay = (t: number | string) =>
  new Date((typeof t === "string" ? Date.parse(t) : t) + 2 * 3600_000)
    .toISOString()
    .slice(0, 10);

export function WorkloadView() {
  const { c } = useW();
  const p = useUrlParams();
  const tab = p.get("tab") === "approvals" ? "approvals" : "load";
  const approvals = useApprovals();
  const pending = approvals.data?.approvals.filter(
    (a) => a.state === "pending",
  ).length;
  return (
    <div className="grid gap-5 pb-24 lg:pb-8">
      <header className="grid gap-1">
        <h1 className="text-h2">{c.title}</h1>
        <p className="text-body text-fg-muted">
          {fill(c.lede, { team: "Tax & Accounting" })}
        </p>
      </header>
      <Tabs
        value={tab}
        onChange={(id) =>
          setUrlParams({ tab: id === "load" ? null : id, agent: null })
        }
        tabs={[
          { id: "load", label: c.tabs.load, content: <LoadTab /> },
          {
            id: "approvals",
            label: c.tabs.approvals,
            count: pending,
            content: <ApprovalsTab />,
          },
        ]}
      />
      <AgentDrawer id={p.get("agent")} />
    </div>
  );
}

// ---------------------------------------------------------------- WL1 + WL4
function LoadTab() {
  const { c, locale } = useW();
  const p = useUrlParams();
  const week = Number(p.get("week") ?? 0) || 0;
  const skill = p.get("skill") ?? "";
  const type = p.get("type") ?? "";
  const q = useWorkload(week);
  const [focus, setFocus] = useState(0);
  const agents = (q.data?.agents ?? []).filter(
    (a) =>
      (!skill || a.skillsLabel.includes(skill)) &&
      (!type || (type === "external") === a.external),
  );
  const skills = [
    ...new Set((q.data?.agents ?? []).flatMap((a) => a.skillsLabel)),
  ].sort();
  const open = (id: string) => setUrlParams({ agent: id });
  useShortcut(
    "j",
    "Next agent",
    () => setFocus((f) => Math.min(agents.length - 1, f + 1)),
    "list",
  );
  useShortcut(
    "k",
    "Previous agent",
    () => setFocus((f) => Math.max(0, f - 1)),
    "list",
  );
  useShortcut(
    "enter",
    "Open agent",
    () => agents[focus] && open(agents[focus].id),
    "list",
  );
  const weekStart = q.data ? Date.parse(q.data.weekStart) : null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-small">
          <span className="sr-only">{c.filters.skill}</span>
          <Select
            value={skill}
            onChange={(e) => setUrlParams({ skill: e.target.value || null })}
            className="h-10 min-w-40"
          >
            <option value="">{c.filters.allSkills}</option>
            {skills.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </label>
        <div
          role="radiogroup"
          aria-label={c.filters.type}
          className="inline-flex border border-border bg-white p-1"
        >
          {(["", "internal", "external"] as const).map((t) => (
            <button
              key={t || "all"}
              type="button"
              role="radio"
              aria-checked={type === t}
              onClick={() => setUrlParams({ type: t || null })}
              className={cx(
                "h-8 px-3 text-small",
                type === t ? "bg-secondary text-on-secondary" : "hover:bg-navy-50",
              )}
            >
              {c.filters[t || "all"]}
            </button>
          ))}
        </div>
        <div
          className="inline-flex items-center gap-1 border border-border bg-white p-1"
          role="group"
          aria-label={c.filters.week}
        >
          <button
            type="button"
            aria-label={c.filters.prev}
            onClick={() => setUrlParams({ week: String(week - 1) })}
            className="flex size-8 items-center justify-center hover:bg-navy-50"
          >
            <Icon
              name="chevronDown"
              size={16}
              className="rotate-90"
              aria-hidden
            />
          </button>
          <span className="flex items-center gap-1.5 px-2 text-small tabular">
            <Icon name="calendar" size={14} aria-hidden />
            {weekStart
              ? `${formatDate(weekStart, locale, { day: "numeric" })}–${formatDate(weekStart + 4 * 86_400_000, locale, { day: "numeric", month: "short" })}`
              : "…"}
          </span>
          <button
            type="button"
            aria-label={c.filters.next}
            onClick={() => setUrlParams({ week: String(week + 1) })}
            className="flex size-8 items-center justify-center hover:bg-navy-50"
          >
            <Icon
              name="chevronDown"
              size={16}
              className="-rotate-90"
              aria-hidden
            />
          </button>
        </div>
      </div>

      {q.data && <RebalanceBanner agents={q.data.agents} />}

      {q.isPending ? (
        <div className="grid gap-2" aria-busy>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : q.isError ? (
        <PanelError what={c.loadErr} onRetry={() => q.refetch()} />
      ) : agents.length === 0 ? (
        <EmptyPanel
          title={c.empty}
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => setUrlParams({ skill: null, type: null })}
            >
              {c.clear}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 2xl:grid-cols-[1fr_22rem]">
          <p className="sr-only" aria-live="polite">
            {fill(c.live, { n: agents.length })}
          </p>
          {/* Desktop table */}
          <div
            className="hidden min-w-0 overflow-x-auto border border-border bg-white md:block"
            tabIndex={0}
            role="region"
            aria-label={c.table}
          >
            <table className="w-full text-small">
              <thead className="sticky top-0 bg-white text-left text-eyebrow text-fg-subtle">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-medium">{c.cols.agent}</th>
                  <th className="px-3 py-3 font-medium">{c.cols.capacity}</th>
                  <th className="px-3 py-3 text-right font-medium">
                    {c.cols.dueWeek}
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    {c.cols.overdue}
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    {c.cols.onTime}
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    {c.cols.rating}
                  </th>
                  <th className="px-3 py-3 font-medium">{c.cols.status}</th>
                  <th className="px-3 py-3 font-medium">
                    <span className="sr-only">{c.cols.actions}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a, i) => (
                  <tr
                    key={a.id}
                    className={cx(
                      "border-b border-border last:border-0",
                      i === focus && "bg-navy-50",
                    )}
                    aria-current={i === focus || undefined}
                  >
                    <td className="min-w-64 px-4 py-3">
                      <span className="flex items-center gap-3">
                        <Avatar name={a.name} size="sm" />
                        <span className="grid">
                          <span className="font-medium whitespace-nowrap">{a.name}</span>
                          <span className="flex flex-wrap items-center gap-1 text-eyebrow text-fg-subtle">
                            {a.role} · {a.skillsLabel.join(", ")}
                            {a.external && <RoleTag external />}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="min-w-44 px-3 py-3">
                      <CapacityBar load={a.load} cap={a.cap} />
                    </td>
                    <td className="px-3 py-3 text-right tabular">
                      {a.dueWeek}
                    </td>
                    <td
                      className={cx(
                        "px-3 py-3 text-right tabular",
                        a.overdue > 0 && "font-semibold text-danger",
                      )}
                    >
                      {a.overdue}
                    </td>
                    <td className="px-3 py-3 text-right tabular">
                      {Math.round(a.onTime * 100)}%
                    </td>
                    <td className="px-3 py-3 text-right tabular">
                      ★ {a.rating.toFixed(1)}
                    </td>
                    <td className="px-3 py-3">
                      <Availability a={a} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => open(a.id)}
                      >
                        {c.view}
                        <span className="sr-only"> {a.name}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Phone cards (PW1) */}
          <ul className="grid gap-3 md:hidden">
            {agents.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => open(a.id)}
                  className="grid w-full gap-2 border border-border bg-white p-4 text-left"
                >
                  <span className="flex items-center gap-3">
                    <Avatar name={a.name} size="sm" />
                    <span className="grid flex-1">
                      <span className="font-medium">{a.name}</span>
                      <span className="text-eyebrow text-fg-subtle">
                        {a.role}
                      </span>
                    </span>
                    <Availability a={a} />
                  </span>
                  <CapacityBar load={a.load} cap={a.cap} />
                  <span className="flex items-center gap-1.5 text-small text-fg-muted">
                    <Icon name="calendar" size={14} aria-hidden />
                    {a.dueWeek} {c.cols.dueWeek.toLowerCase()}
                    {a.overdue > 0 && (
                      <span className="font-semibold text-danger">
                        {" "}
                        · {a.overdue} {c.cols.overdue.toLowerCase()}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Panel title={c.heat}>
            <div
              className="overflow-x-auto"
              tabIndex={0}
              role="region"
              aria-label={c.heat}
            >
              <table className="w-full border-separate border-spacing-1 text-eyebrow">
                <thead>
                  <tr>
                    <th className="text-left font-medium text-fg-subtle">
                      <span className="sr-only">{c.cols.agent}</span>
                    </th>
                    {c.days.map((d, i) => (
                      <th key={i} className="font-medium text-fg-subtle">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a) => (
                    <tr key={a.id}>
                      <th
                        scope="row"
                        className="max-w-24 truncate pr-1 text-left font-normal"
                      >
                        {a.name.split(" ")[0]}
                      </th>
                      {a.days.map((d, i) => (
                        <td key={i} className="min-w-9">
                          <HeatCell load={d} cap={a.cap} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 flex flex-wrap gap-3 text-eyebrow text-fg-muted">
              <span className="flex items-center gap-1">
                <span
                  aria-hidden
                  className="size-2.5 bg-bg-tint"
                />
                {c.heatLegend.ok}
              </span>
              <span className="flex items-center gap-1">
                <span
                  aria-hidden
                  className="size-2.5 bg-warning-bg"
                />
                {c.heatLegend.risk}
              </span>
              <span className="flex items-center gap-1">
                <span
                  aria-hidden
                  className="size-2.5 bg-danger-bg"
                />
                {c.heatLegend.over}
              </span>
            </p>
          </Panel>
        </div>
      )}
    </div>
  );
}

function Availability({ a }: { a: WorkloadAgent }) {
  const { c, locale } = useW();
  const cls =
    a.status === "available"
      ? "bg-success-bg text-success"
      : a.status === "leave"
        ? "bg-warning-bg text-warning"
        : "bg-navy-50 text-navy-700";
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1 px-2.5 text-eyebrow font-medium whitespace-nowrap",
        cls,
      )}
    >
      <Icon
        name={
          a.status === "available"
            ? "check"
            : a.status === "leave"
              ? "calendar"
              : "clock"
        }
        size={12}
        aria-hidden
      />
      {a.status === "leave"
        ? a.onLeaveUntil
          ? fill(c.status.leave, {
              d: formatDate(a.onLeaveUntil, locale, {
                day: "numeric",
                month: "short",
              }),
            })
          : c.status.leaveShort
        : c.status[a.status]}
    </span>
  );
}

function RebalanceBanner({ agents }: { agents: WorkloadAgent[] }) {
  const { c } = useW();
  const toast = useToast();
  const over = agents.find((a) => a.load > a.cap);
  const detail = useAgentDetail(over?.id ?? null);
  const rebalance = useRebalance();
  const [openPreview, setOpenPreview] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [skip, setSkip] = useState<string[]>([]);
  const plan = detail.data
    ? planRebalance(agents, (id) =>
        id === detail.data.id
          ? detail.data.cases.filter((x) => !PAUSED.includes(x.status))
          : [],
      )
    : null;
  if (!plan || dismissed === plan.from.id) return null;
  const chosen = plan.cases
    .filter((x) => !skip.includes(x.ref))
    .map((x) => x.ref);
  const apply = () => {
    if (!chosen.length)
      return toast({ title: c.rebalance.pickOne, tone: "danger" });
    rebalance.mutate(
      { from: plan.from.id, to: plan.to.id, refs: chosen },
      {
        onSuccess: (r) => {
          setOpenPreview(false);
          toast({
            title: fill(c.rebalance.applied, {
              n: r.moved.length,
              to: plan.to.name,
            }),
            tone: "success",
            action: {
              label: c.undo,
              onClick: () =>
                rebalance.mutate({
                  from: plan.to.id,
                  to: plan.from.id,
                  refs: r.moved,
                }),
            },
          });
        },
        onError: () => toast({ title: c.failed, tone: "danger" }),
      },
    );
  };
  return (
    <section
      className="grid gap-4 border border-navy-100 bg-bg-tint p-4"
      aria-labelledby="rb-title"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-navy-700 text-white"
        >
          <Icon name="zap" size={16} />
        </span>
        <p id="rb-title" className="min-w-0 flex-1 text-body font-medium">
          {fill(c.rebalance.banner, {
            from: plan.from.name.split(" ")[0],
            fl: plan.from.load,
            fc: plan.from.cap,
            n: plan.cases.length,
            s: plan.cases.length === 1 ? "" : "s",
            to: plan.to.name.split(" ")[0],
            tl: plan.to.load,
            tc: plan.to.cap,
          })}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            aria-expanded={openPreview}
            onClick={() => setOpenPreview((o) => !o)}
          >
            {openPreview ? c.rebalance.hide : c.rebalance.preview}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(plan.from.id)}
          >
            {c.rebalance.dismiss}
          </Button>
        </div>
      </div>
      {openPreview && (
        <div className="grid gap-4 bg-white p-4">
          <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <MoveCard
              label={c.rebalance.from}
              a={plan.from}
              delta={-chosen.length}
            />
            <Icon
              name="arrowRight"
              size={20}
              aria-hidden
              className="mx-auto max-sm:rotate-90"
            />
            <MoveCard
              label={c.rebalance.to}
              a={plan.to}
              delta={chosen.length}
            />
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-label">{c.rebalance.cases}</legend>
            {plan.cases.map((x) => (
              <Checkbox
                key={x.ref}
                checked={!skip.includes(x.ref)}
                onChange={(e) =>
                  setSkip((s) =>
                    e.target.checked
                      ? s.filter((r) => r !== x.ref)
                      : [...s, x.ref],
                  )
                }
                label={
                  <span className="flex flex-wrap items-center gap-2 text-small">
                    <span className="font-medium tabular">{x.ref}</span>{" "}
                    {x.service} <SlaChip due={x.dueAt} />
                  </span>
                }
              />
            ))}
          </fieldset>
          <div className="flex justify-end gap-2">
            <Button dots loading={rebalance.isPending} onClick={apply}>
              {c.rebalance.apply}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
function MoveCard({
  label,
  a,
  delta,
}: {
  label: string;
  a: WorkloadAgent;
  delta: number;
}) {
  return (
    <div className="grid gap-1.5 border border-border p-3">
      <span className="text-eyebrow text-fg-subtle">{label}</span>
      <span className="flex items-center gap-2 font-medium">
        <Avatar name={a.name} size="sm" />
        {a.name}
      </span>
      <CapacityBar load={a.load + delta} cap={a.cap} />
    </div>
  );
}

// ---------------------------------------------------------------- WL2 agent drawer
const CAP_REASONS = ["demand", "training", "wellbeing", "schedule"];
function AgentDrawer({ id }: { id: string | null }) {
  const { c } = useW();
  const phone = usePhone();
  const q = useAgentDetail(id);
  const close = () => setUrlParams({ agent: null });
  return (
    <Dialog
      open={!!id}
      onClose={close}
      side={phone ? "bottom" : "right"}
      title={q.data?.name ?? "…"}
      description={q.data ? `${q.data.role} · Tax & Accounting` : undefined}
      className="md:max-w-lg"
    >
      {q.isPending ? (
        <div className="grid gap-3" aria-busy>
          <Skeleton className="h-20" />
          <Skeleton className="h-32" />
          <Skeleton className="h-40" />
        </div>
      ) : q.isError ? (
        <PanelError what={c.drawer.loadErr} onRetry={() => q.refetch()} />
      ) : (
        <DrawerBody a={q.data} />
      )}
    </Dialog>
  );
}

function DrawerBody({ a }: { a: AgentDetail }) {
  const { c, locale } = useW();
  const toast = useToast();
  const stepUp = useStepUp();
  const setCap = useSetCap();
  const rebalance = useRebalance();
  const all = useWorkload(0);
  const now = useNow(60_000);
  const [cap, setCapV] = useState(a.cap);
  const [perDay, setPerDay] = useState(a.dailyCap != null ? String(a.dailyCap) : "");
  const perDayN = perDay.trim() ? Number(perDay) : null;
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const today = now
    ? a.cases.filter(
        (x) =>
          kigaliDay(x.dueAt) === kigaliDay(now) && !PAUSED.includes(x.status),
      )
    : [];

  const saveCap = async () => {
    if (cap === a.cap && perDayN === (a.dailyCap ?? null)) return setErr(c.drawer.capSame);
    if (perDayN !== null && (!Number.isInteger(perDayN) || perDayN < 1 || perDayN > 100)) return setErr(c.drawer.perDayErr);
    if (!reason) return setErr(c.drawer.capReasonErr);
    setErr(null);
    const old = a.cap;
    try {
      const token = await stepUp.request(c.drawer.cap);
      const label = c.drawer.capReasons[reason];
      await setCap.mutateAsync({ id: a.id, cap, perDay: perDayN, reason: label, token });
      toast({
        title: fill(c.drawer.capSaved, { n: a.name.split(" ")[0], c: cap }),
        tone: "success",
        action: {
          label: c.undo,
          onClick: () =>
            setCap.mutate({
              id: a.id,
              cap: old,
              reason: `undo: ${label}`,
              token,
            }),
        },
      });
    } catch (e) {
      if (e instanceof StepUpCancelled) return;
      if (e instanceof ApiError && e.errorType === "step_up_required")
        stepUp.reset();
      setErr(errorCopy(e, locale));
    }
  };
  const reassignToday = async () => {
    const pool = (all.data?.agents ?? []).filter(
      (x) => x.id !== a.id && x.status === "available" && !x.external,
    );
    const groups = new Map<string, string[]>();
    const room = new Map(pool.map((x) => [x.id, x.cap - x.load]));
    for (const k of today) {
      const to = pool
        .filter(
          (x) =>
            x.services.includes(k.serviceSlug) && (room.get(x.id) ?? 0) > 0,
        )
        .sort((x, y) => x.load / x.cap - y.load / y.cap)[0];
      if (!to) continue;
      room.set(to.id, room.get(to.id)! - 1);
      groups.set(to.id, [...(groups.get(to.id) ?? []), k.ref]);
    }
    if (!groups.size)
      return toast({ title: c.drawer.noTarget, tone: "danger" });
    try {
      const done = await Promise.all(
        [...groups].map(([to, refs]) =>
          rebalance
            .mutateAsync({ from: a.id, to, refs })
            .then((r) => ({ to, refs: r.moved })),
        ),
      );
      toast({
        title: fill(c.drawer.reassigned, {
          n: done.reduce((s, d) => s + d.refs.length, 0),
        }),
        tone: "success",
        action: {
          label: c.undo,
          onClick: () =>
            done.forEach((d) =>
              rebalance.mutate({ from: d.to, to: a.id, refs: d.refs }),
            ),
        },
      });
    } catch {
      toast({ title: c.failed, tone: "danger" });
    }
  };

  return (
    <div className="grid gap-6">
      {stepUp.dialog}
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={a.name} />
        <Availability a={a} />
        <CapacityBar load={a.load} cap={a.cap} className="flex-1" />
      </div>
      <section className="grid gap-2">
        <h3 className="text-label">{c.drawer.skills}</h3>
        <ul className="grid gap-2">
          {a.skills.map((s) => (
            <li
              key={s.name}
              className="grid grid-cols-[1fr_6rem_auto] items-center gap-3 text-small"
            >
              <span className="truncate">{s.name}</span>
              <span
                className="h-1.5 overflow-hidden bg-ink-100"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(s.level * 100)}
                aria-label={s.name}
              >
                <span
                  className="block h-full bg-navy-700"
                  style={{ width: `${s.level * 100}%` }}
                />
              </span>
              <span className="w-20 text-right text-eyebrow text-fg-muted">
                {c.drawer.levels[Math.min(3, Math.floor(s.level * 4))]}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="grid gap-2">
        <h3 className="text-label">
          {fill(c.drawer.cases, { n: a.cases.length })}
        </h3>
        {a.cases.length === 0 ? (
          <p className="text-small text-fg-muted">{c.drawer.noCases}</p>
        ) : (
          <ul className="grid gap-1.5">
            {a.cases.map((x: AgentCase) => (
              <li
                key={x.ref}
                className="flex flex-wrap items-center justify-between gap-2 border border-border px-3 py-2 text-small"
              >
                <Link
                  href={localHref(locale, `/ops/cases/${x.ref}`)}
                  className="grid underline-offset-4 hover:underline"
                >
                  <span className="font-medium tabular">{x.ref}</span>
                  <span className="text-eyebrow text-fg-subtle">
                    {x.service}
                  </span>
                </Link>
                <SlaChip due={x.dueAt} paused={PAUSED.includes(x.status)} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="grid gap-2">
        <h3 className="text-label">{c.drawer.perf}</h3>
        <span className="flex items-center gap-3 text-link">
          <Sparkline
            values={a.spark}
            label={`${c.drawer.perf}: ${Math.round(a.onTime * 100)}%`}
            className="h-10 w-full"
          />
          <span className="text-label text-fg tabular">
            {Math.round(a.onTime * 100)}%
          </span>
        </span>
      </section>
      <LeaveCalendar a={a} />
      <section className="grid gap-3 border border-border p-4">
        <h3 className="text-label">{c.drawer.cap}</h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center border border-border-strong">
            <button
              type="button"
              aria-label={c.drawer.dec}
              disabled={cap <= 1}
              onClick={() => setCapV((v) => v - 1)}
              className="flex size-10 items-center justify-center hover:bg-navy-50 disabled:opacity-40"
            >
              <Icon name="minus" size={16} aria-hidden />
            </button>
            <output
              aria-live="polite"
              className="w-10 text-center text-label tabular"
            >
              {cap}
            </output>
            <button
              type="button"
              aria-label={c.drawer.inc}
              disabled={cap >= 20}
              onClick={() => setCapV((v) => v + 1)}
              className="flex size-10 items-center justify-center hover:bg-navy-50 disabled:opacity-40"
            >
              <Icon name="plus" size={16} aria-hidden />
            </button>
          </div>
          <Select
            aria-label={c.drawer.capReason}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-10 min-w-0 flex-1"
          >
            <option value="">{c.drawer.capReason}…</option>
            {CAP_REASONS.map((r) => (
              <option key={r} value={r}>
                {c.drawer.capReasons[r]}
              </option>
            ))}
          </Select>
        </div>
        <Field label={c.drawer.perDay} hint={fill(c.drawer.perDayHint, { n: a.assignedToday ?? 0 })}>
          {(f) => <Input id={f.id} aria-describedby={f.describedBy} type="number" min={1} max={100} inputMode="numeric" className="max-w-32" value={perDay} onChange={(e) => setPerDay(e.target.value)} />}
        </Field>
        {err && (
          <p role="alert" className="text-small font-medium text-danger">
            {err}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          loading={setCap.isPending}
          onClick={saveCap}
        >
          <Icon name="lock" size={14} aria-hidden />
          {c.drawer.save}
        </Button>
      </section>
      <Button
        dots
        disabled={!today.length}
        loading={rebalance.isPending}
        onClick={reassignToday}
        title={today.length ? undefined : c.drawer.reassignNone}
      >
        {today.length
          ? `${c.drawer.reassign} (${today.length})`
          : c.drawer.reassignNone}
      </Button>
    </div>
  );
}

function LeaveCalendar({ a }: { a: AgentDetail }) {
  const { c, locale } = useW();
  const base = new Date(
    Date.parse(a.leave[0]?.from ?? a.cases[0]?.dueAt ?? "2026-11-01"),
  );
  const [offset, setOffset] = useState(0);
  const first = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offset, 1),
  );
  const days = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const state = (d: number) => {
    const k = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), d))
      .toISOString()
      .slice(0, 10);
    return a.leave.find(
      (l) => k >= l.from.slice(0, 10) && k <= l.to.slice(0, 10),
    )?.state;
  };
  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-label">{c.drawer.leave}</h3>
        <span className="flex items-center gap-1">
          <button
            type="button"
            aria-label={c.filters.prev}
            onClick={() => setOffset((o) => o - 1)}
            className="flex size-8 items-center justify-center hover:bg-navy-50"
          >
            <Icon
              name="chevronDown"
              size={16}
              className="rotate-90"
              aria-hidden
            />
          </button>
          <span className="min-w-24 text-center text-small">
            {formatDate(first, locale, { month: "short", year: "numeric" })}
          </span>
          <button
            type="button"
            aria-label={c.filters.next}
            onClick={() => setOffset((o) => o + 1)}
            className="flex size-8 items-center justify-center hover:bg-navy-50"
          >
            <Icon
              name="chevronDown"
              size={16}
              className="-rotate-90"
              aria-hidden
            />
          </button>
        </span>
      </div>
      <ol className="grid grid-cols-7 gap-1 text-center text-eyebrow tabular">
        {Array.from({ length: lead }, (_, i) => (
          <li key={`x${i}`} aria-hidden />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const s = state(i + 1);
          return (
            <li
              key={i}
              className={cx(
                "py-1.5",
                s === "approved"
                  ? "bg-navy-700 text-white"
                  : s === "pending"
                    ? "bg-navy-50 text-navy-700 ring-1 ring-navy-400 ring-dashed"
                    : "bg-bg-subtle",
              )}
            >
              {i + 1}
              {s && (
                <span className="sr-only">
                  {" "}
                  {s === "approved"
                    ? c.drawer.leaveApproved
                    : c.drawer.leavePending}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="flex gap-3 text-eyebrow text-fg-muted">
        <span className="flex items-center gap-1">
          <span aria-hidden className="size-2.5 bg-navy-700" />
          {c.drawer.leaveApproved}
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden className="size-2.5 bg-navy-200" />
          {c.drawer.leavePending}
        </span>
      </p>
    </section>
  );
}

// ---------------------------------------------------------------- WL3 approvals
function ApprovalsTab() {
  const { c } = useW();
  const q = useApprovals();
  const p = useUrlParams();
  const kind = p.get("kind") ?? "all";
  if (q.isPending)
    return (
      <div className="grid gap-3" aria-busy>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  if (q.isError)
    return (
      <PanelError what={c.approvals.loadErr} onRetry={() => q.refetch()} />
    );
  const list = q.data.approvals;
  const count = (k: string) =>
    list.filter((a) => a.state === "pending" && (k === "all" || a.kind === k))
      .length;
  const shown = list.filter((a) => kind === "all" || a.kind === kind);
  return (
    <div className="grid gap-4">
      <div
        role="tablist"
        aria-label={c.tabs.approvals}
        className="flex flex-wrap gap-1"
      >
        {(["all", "leave", "skill", "due", "cancel"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={kind === k}
            onClick={() => setUrlParams({ kind: k === "all" ? null : k })}
            className={cx(
              "h-9 px-3.5 text-small",
              kind === k
                ? "bg-secondary text-on-secondary"
                : "border border-border bg-white hover:bg-navy-50",
            )}
          >
            {c.approvals.tabs[k]} ({count(k)})
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyPanel title={c.approvals.empty} />
      ) : (
        <ul className="grid gap-3" aria-live="polite">
          {shown.map((a) => (
            <ApprovalCard key={a.id} a={a} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ApprovalCard({ a }: { a: Approval }) {
  const { c, locale } = useW();
  const toast = useToast();
  const decide = useDecideApproval();
  const [notify, setNotify] = useState(true);
  const kindLabel = c.approvals[a.kind];
  const d = (s?: string) =>
    s
      ? formatDate(s, locale, {
          weekday: "short",
          day: "numeric",
          month: "short",
        })
      : "";
  const run = (decision: "approve" | "decline") =>
    decide.mutate(
      {
        id: a.id,
        decision,
        notifyClient: a.kind === "due" ? notify : undefined,
      },
      {
        onSuccess: () =>
          toast({
            title: fill(
              decision === "approve"
                ? c.approvals.doneApprove
                : c.approvals.doneDecline,
              { k: `${kindLabel} · ${a.agentName.split(" ")[0]}` },
            ),
            tone: "success",
            action: {
              label: c.undo,
              onClick: () => decide.mutate({ id: a.id, decision: "pending" }),
            },
          }),
        onError: () => toast({ title: c.failed, tone: "danger" }),
      },
    );
  const icon =
    a.kind === "leave"
      ? "calendar"
      : a.kind === "skill"
        ? "graduation"
        : a.kind === "cancel"
          ? "x"
          : "refresh";
  return (
    <li className="grid gap-3 border border-border bg-white p-4 sm:grid-cols-[2.5rem_1fr_auto] sm:items-start">
      <span
        aria-hidden
        className="flex size-10 items-center justify-center rounded-full bg-navy-50 text-navy-700"
      >
        <Icon name={icon} size={18} />
      </span>
      <div className="grid min-w-0 gap-1">
        <p className="flex flex-wrap items-center gap-2 text-label">
          {a.agentName} – {kindLabel}
          <span
            className={cx(
              "px-2 py-0.5 text-eyebrow",
              a.state === "pending"
                ? "bg-warning-bg text-warning"
                : a.state === "approved"
                  ? "bg-success-bg text-success"
                  : "bg-danger-bg text-danger",
            )}
          >
            {c.approvals[a.state]}
          </span>
        </p>
        {a.kind === "leave" && (
          <>
            <p className="text-small text-fg-muted">
              {d(a.from)} – {d(a.to)} · {a.reason}
            </p>
            {!!a.impact?.length && (
              <p className="flex flex-wrap items-center gap-1.5 text-small">
                <Icon
                  name="clock"
                  size={14}
                  aria-hidden
                  className="text-warning"
                />
                {fill(c.approvals.impact, { n: a.impact.length })}:
                {a.impact.map((r) => (
                  <Link
                    key={r}
                    href={localHref(locale, `/ops/cases/${r}`)}
                    className="tabular underline underline-offset-2"
                  >
                    {r}
                  </Link>
                ))}
              </p>
            )}
          </>
        )}
        {a.kind === "skill" && (
          <>
            <p className="text-small text-fg-muted">
              {fill(c.approvals.add, { s: a.skill ?? "" })} · {a.reason}
            </p>
            {a.certificate && (
              <span className="flex w-fit items-center gap-2 border border-border px-3 py-2 text-small">
                <Icon
                  name="fileCheck"
                  size={16}
                  aria-hidden
                  className="text-link"
                />
                <span className="sr-only">{c.approvals.certificate}:</span>
                {a.certificate}
              </span>
            )}
          </>
        )}
        {a.kind === "cancel" && (
          <p className="text-small text-fg-muted">
            <Link href={localHref(locale, `/ops/cases/${a.ref}`)} className="tabular underline underline-offset-2">{a.ref}</Link> · {a.service} · {a.reason}
          </p>
        )}
        {a.kind === "due" && (
          <>
            <p className="text-small text-fg-muted">
              <span className="tabular">{a.ref}</span> · {a.service} ·{" "}
              {d(a.currentDue)} → {d(a.proposedDue)} · {a.reason}
            </p>
            <Switch
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              disabled={a.state !== "pending"}
              label={<span className="text-small">{c.approvals.notify}</span>}
            />
          </>
        )}
      </div>
      {a.state === "pending" && (
        <div className="flex gap-2 sm:justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => run("decline")}
            disabled={decide.isPending}
          >
            {c.approvals.decline}
          </Button>
          <Button
            size="sm"
            onClick={() => run("approve")}
            loading={
              decide.isPending && decide.variables?.decision === "approve"
            }
          >
            {c.approvals.approve}
          </Button>
        </div>
      )}
    </li>
  );
}
