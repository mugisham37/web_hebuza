"use client";
// U9 assign (AS1–AS5 + PS3): case rail, ranked suggestions with reasons, ineligible list, external terms,
// co-assignment shares, nobody-eligible state. Steps after assignment live in handoff.tsx (U10).
import { errorCopy } from "@/lib/api/error-copy";
import { useState } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx, formatDate, formatMoney } from "@/shared/format";
import { opsCommon } from "@/content/pages/ops-common";
import { opsAssign } from "@/content/pages/ops-assign";
import { fill } from "@/content/pages/ops-case";
import {
  useCase,
  useSuggestions,
  useAssign,
  useSetStatus,
  type CaseDetailVM,
} from "@/lib/ops/api";
import {
  useAssignContext,
  useAssignTerms,
  useAssignOverride,
  sharesState,
  type AssignContext,
} from "@/lib/ops/b";
import { WEIGHTS, type Suggestion, type Ineligible } from "@/shared/ops/ranking";
import { useShortcut } from "@/lib/ops/shortcuts";
import {
  MatchRing,
  CapacityBar,
  RoleTag,
  Kbd,
  OpsStatus,
  SlaChip,
  PaymentChip,
  FlagChip,
} from "@/components/atoms/ops";
import {
  ReasonDialog,
  EmptyPanel,
  PanelError,
  CopyRef,
} from "@/components/molecules/ops/ops";
import { Button } from "@/components/atoms/button";
import { Select, Switch } from "@/components/atoms/field";
import { Skeleton, ErrorState } from "@/components/atoms/feedback";
import { Avatar } from "@/components/atoms/misc";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { BriefStep, ScopeStep, OfferStep, RulesStep } from "@/components/organisms/ops/handoff";

const STEPS = ["suggest", "brief", "scope", "offer", "rules"] as const;
type Step = (typeof STEPS)[number];
const inp =
  "h-10 w-full border border-border-strong bg-white px-3 text-small focus:border-navy-700 focus:ring-3 focus:ring-gold-400/45 hover:border-ink-400 focus:outline-none aria-invalid:border-danger";

export function AssignView({ refId }: { refId: string }) {
  const { locale } = useI18n();
  const t = opsAssign(locale);
  const p = useUrlParams();
  const step: Step = (STEPS as readonly string[]).includes(p.get("step") ?? "")
    ? (p.get("step") as Step)
    : "suggest";
  const q = useCase(refId);
  if (q.isPending)
    return (
      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <Skeleton className="h-96" />
        <Skeleton className="h-[32rem]" />
      </div>
    );
  if (q.isError)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const c = q.data;
  return (
    <div className="grid gap-4 pb-24 lg:pb-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={localHref(locale, `/ops/cases/${c.ref}`)}
          className="inline-flex items-center gap-1.5 text-small text-fg-muted hover:text-fg"
        >
          <Icon
            name="arrowRight"
            size={14}
            className="rotate-180"
            aria-hidden
          />
          {t.backToCase}
        </Link>
        <h1 className="text-h3">{fill(t.title, { ref: c.ref })}</h1>
      </div>
      <nav
        aria-label={t.title.replace("{ref}", "")}
        className="-mx-1 overflow-x-auto px-1"
      >
        <ol className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                aria-current={s === step ? "step" : undefined}
                onClick={() =>
                  setUrlParams({ step: s === "suggest" ? null : s })
                }
                className={cx(
                  "inline-flex h-9 items-center gap-2 border px-3.5 text-small whitespace-nowrap",
                  s === step
                    ? "border-secondary bg-secondary text-on-secondary"
                    : "border-border-strong bg-white hover:border-navy-300",
                )}
              >
                <span className="tabular opacity-70">{i + 1}</span>
                {t.steps[s]}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <div className="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <CaseRail c={c} />
        {step === "suggest" ? (
          <Suggest c={c} />
        ) : step === "brief" ? (
          <BriefStep c={c} />
        ) : step === "scope" ? (
          <ScopeStep c={c} />
        ) : step === "offer" ? (
          <OfferStep c={c} />
        ) : (
          <RulesStep c={c} />
        )}
      </div>
    </div>
  );
}

function CaseRail({ c }: { c: CaseDetailVM }) {
  const { locale } = useI18n();
  const t = opsAssign(locale).summary;
  const ctx = useAssignContext(c.ref);
  const rows: [string, React.ReactNode][] = [
    [t.service, c.service],
    [t.client, c.client],
    [
      t.deadline,
      c.dueAt ? (
        <span className="grid justify-items-start gap-1">
          <span>
            {formatDate(c.dueAt, locale, {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </span>
          <SlaChip due={c.dueAt} />
        </span>
      ) : (
        "—"
      ),
    ],
    [t.language, ctx.data?.language ?? c.clientInfo?.language ?? "—"],
    [t.location, ctx.data?.location ?? "—"],
    [t.payment, <PaymentChip key="p" status={c.payment} />],
    [t.current, c.assignees[0]?.name ?? "—"],
  ];
  return (
    <aside
      aria-label={t.title}
      className="grid gap-3 border border-border bg-white p-4 lg:sticky lg:top-20"
    >
      <div className="flex flex-wrap items-center gap-2">
        <CopyRef value={c.ref} />
        <OpsStatus status={c.status} />
      </div>
      {c.flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {c.flags.map((f) => (
            <FlagChip key={f} flag={f} />
          ))}
        </div>
      )}
      <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-2 text-small max-lg:grid-cols-2 max-sm:grid-cols-[6.5rem_1fr]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-fg-muted">{k}</dt>
            <dd className="min-w-0 break-words">{v}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

type Helper = { id: string; role: string; share: number; deadline: string };

function Suggest({ c }: { c: CaseDetailVM }) {
  const { locale } = useI18n();
  const t = opsAssign(locale);
  const p = useUrlParams();
  const external = p.get("external") === "1";
  const showInel = p.get("ineligible") === "1";
  const sort = p.get("sort") ?? "score";
  const sq = useSuggestions(c.ref, external);
  const ctx = useAssignContext(c.ref);
  const assign = useAssign();
  const terms = useAssignTerms();
  const setStatus = useSetStatus();
  const override = useAssignOverride();
  const toast = useToast();
  const [showAll, setShowAll] = useState(false);
  const [co, setCo] = useState(false);
  const [reviewer, setReviewer] = useState("");
  const [leadShare, setLeadShare] = useState(100);
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [price, setPrice] = useState<number | "">("");
  const [ovr, setOvr] = useState(false);
  const [agencyPct, setAgencyPct] = useState(70);
  const [ovrReason, setOvrReason] = useState("");
  const [overriding, setOverriding] = useState(false);
  const [tried, setTried] = useState(false);

  const list = [...(sq.data?.suggestions ?? [])].sort((a, b) =>
    sort === "load"
      ? a.agent.load / a.agent.cap - b.agent.load / b.agent.cap
      : sort === "rating"
        ? b.agent.rating - a.agent.rating
        : b.score - a.score,
  );
  const pickId = p.get("pick") ?? list[0]?.agent.id ?? null;
  const picked = list.find((s) => s.agent.id === pickId) ?? list[0];
  const pick = (i: number) =>
    list[i] && setUrlParams({ pick: list[i].agent.id });
  useShortcut("1", t.kbd.pick, () => pick(0), "case");
  useShortcut("2", t.kbd.pick, () => pick(1), "case");
  useShortcut("3", t.kbd.pick, () => pick(2), "case");
  useShortcut("4", t.kbd.pick, () => pick(3), "case");
  useShortcut("5", t.kbd.pick, () => pick(4), "case");

  const isExt = !!picked?.agent.external;
  const contract = picked && ctx.data?.contracts[picked.agent.id];
  const shares = sharesState([leadShare, ...helpers.map((h) => h.share)]);
  const problems = [
    co && helpers.length && !shares.ok ? t.co.must : null,
    co && helpers.some((h) => !h.id) ? t.co.pick : null,
    isExt && !price ? t.external.priceRequired : null,
    isExt && !contract ? t.external.noContract : null,
    isExt && ovr && !ovrReason.trim() ? t.external.reasonRequired : null,
  ].filter(Boolean) as string[];

  function submit() {
    if (!picked) return;
    setTried(true);
    if (problems.length) return;
    const hs = co ? helpers : [];
    assign.mutate(
      { ref: c.ref, agentId: picked.agent.id, helpers: hs.map((h) => h.id), reviewerId: reviewer || null },
      {
        onSuccess: () => {
          if (hs.length || isExt)
            terms.mutate(
              {
                ref: c.ref,
                lead: {
                  id: picked.agent.id,
                  share: hs.length ? leadShare : 100,
                },
                helpers: hs,
                price: isExt ? Number(price) : undefined,
                override:
                  isExt && ovr
                    ? { agency: agencyPct, reason: ovrReason }
                    : undefined,
              },
              { onError: (e) => toast({ title: errorCopy(e, locale), tone: "danger" }) },
            );
          toast({
            title: fill(t.assigned, { name: picked.agent.name }),
            tone: "success",
          });
          setUrlParams({ step: "brief" });
        },
        onError: (e) => toast({ title: errorCopy(e, locale), tone: "danger" }),
      },
    );
  }

  useShortcut("mod+enter", t.kbd.assign, () => submit(), "case");

  if (sq.isPending)
    return (
      <div className="grid gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  if (sq.isError)
    return <PanelError what={t.suggested} onRetry={() => sq.refetch()} />;
  const inel = sq.data.ineligible.filter((x) => external || !x.agent.external);
  const hold = c.moves.find((m) => m.to === "on_hold");

  return (
    <section aria-labelledby="sg-h" className="grid gap-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border border-border bg-white p-3 sm:p-4">
        <h2 id="sg-h" className="text-label-lg">
          {t.suggested}
        </h2>
        <Switch
          label={t.includeExternal}
          checked={external}
          onChange={(e) =>
            setUrlParams({
              external: e.target.checked ? "1" : null,
              pick: null,
            })
          }
          className="text-small"
        />
        <Switch
          label={fill(t.showIneligible, { n: inel.length })}
          checked={showInel}
          onChange={(e) =>
            setUrlParams({ ineligible: e.target.checked ? "1" : null })
          }
          className="text-small"
        />
        <label className="flex items-center gap-2 text-small">
          {t.sort.label}
          <select
            value={sort}
            onChange={(e) =>
              setUrlParams({
                sort: e.target.value === "score" ? null : e.target.value,
              })
            }
            className="h-9 border border-border-strong bg-white px-2 text-small"
          >
            {(["score", "load", "rating"] as const).map((k) => (
              <option key={k} value={k}>
                {t.sort[k]}
              </option>
            ))}
          </select>
        </label>
        <details className="relative ml-auto text-small">
          <summary className="cursor-pointer font-medium text-link">
            {t.why}
          </summary>
          <div className="theme-dark absolute right-0 z-30 mt-2 grid w-72 gap-2 bg-navy-900 p-4 text-fg shadow-md">
            <p>{t.whyIntro}</p>
            <ul className="grid gap-1">
              {Object.entries(WEIGHTS).map(([k, w]) => (
                <li key={k} className="flex justify-between gap-3">
                  <span>{t.weights[k]}</span>
                  <span className="tabular">{Math.round(w * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      </div>

      {!list.length ? (
        <Nobody
          inel={inel}
          external={external}
          onOverride={() => setOverriding(true)}
          onHold={
            hold
              ? () =>
                  setStatus.mutate(
                    {
                      ref: c.ref,
                      status: "on_hold",
                      reason: t.nobody.holdReason,
                      subStatus: t.nobody.holdReason,
                    },
                    {
                      onSuccess: () =>
                        toast({ title: t.nobody.held, tone: "success" }),
                      onError: (e) =>
                        toast({ title: errorCopy(e, locale), tone: "danger" }),
                    },
                  )
              : undefined
          }
        />
      ) : (
        <>
          <ol className="grid gap-3" aria-live="polite">
            {list.map((s, i) => (
              <li
                key={s.agent.id}
                className={cx(i >= 3 && !showAll && "max-sm:hidden")}
              >
                <AgentCard
                  s={s}
                  i={i}
                  selected={s.agent.id === picked?.agent.id}
                  onPick={() => setUrlParams({ pick: s.agent.id })}
                  ctx={ctx.data}
                />
              </li>
            ))}
          </ol>
          {list.length > 3 && !showAll && (
            <Button
              variant="outline"
              size="sm"
              className="sm:hidden"
              onClick={() => setShowAll(true)}
            >
              +{list.length - 3}
            </Button>
          )}

          {picked && isExt && (
            <section
              aria-labelledby="ext-h"
              className="grid gap-3 border border-border bg-white p-4"
            >
              <h3 id="ext-h" className="text-label-lg">
                {t.external.title} · {picked.agent.name}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-label">
                  {t.external.price}
                  <input
                    className={cx(inp, "tabular")}
                    type="number"
                    min={0}
                    step={1000}
                    value={price}
                    placeholder={String(picked.agent.cost ?? "")}
                    onChange={(e) =>
                      setPrice(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    aria-invalid={(tried && !price) || undefined}
                  />
                  {ctx.data && (
                    <span className="text-eyebrow font-normal text-fg-muted">
                      {fill(t.external.internal, {
                        amount: formatMoney(
                          ctx.data.internalCost,
                          "RWF",
                          locale,
                        ),
                      })}
                    </span>
                  )}
                </label>
                <div className="grid content-start gap-2 text-small">
                  <span className="text-label">{t.external.rule}</span>
                  <span>
                    {ctx.data
                      ? fill(t.external.ruleDefault, {
                          a: ctx.data.revenueRule.agency,
                          b: ctx.data.revenueRule.agent,
                        })
                      : "—"}
                  </span>
                  <Switch
                    label={t.external.override}
                    checked={ovr}
                    onChange={(e) => setOvr(e.target.checked)}
                    className="text-small"
                  />
                </div>
              </div>
              {ovr && (
                <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
                  <label className="grid gap-1 text-label">
                    {t.external.agency}
                    <input
                      className={cx(inp, "tabular")}
                      type="number"
                      min={0}
                      max={100}
                      value={agencyPct}
                      onChange={(e) => setAgencyPct(Number(e.target.value))}
                    />
                  </label>
                  <label className="grid gap-1 text-label">
                    {t.external.overrideReason}
                    <input
                      className={inp}
                      value={ovrReason}
                      onChange={(e) => setOvrReason(e.target.value)}
                      aria-invalid={(tried && !ovrReason.trim()) || undefined}
                    />
                  </label>
                </div>
              )}
              <p className="flex items-start gap-2 bg-info-bg px-3 py-2.5 text-small text-info">
                <Icon
                  name="shield"
                  size={16}
                  aria-hidden
                  className="mt-0.5 shrink-0"
                />
                {t.external.notice}
              </p>
              <p
                className={cx(
                  "text-small font-medium",
                  contract ? "text-success" : "text-danger",
                )}
              >
                <Icon
                  name={contract ? "fileCheck" : "x"}
                  size={14}
                  aria-hidden
                  className="mr-1 inline"
                />
                {contract
                  ? fill(t.external.contract, {
                      d: formatDate(contract.until, locale, {
                        month: "short",
                        year: "numeric",
                      }),
                    })
                  : t.external.noContract}
              </p>
            </section>
          )}

          {picked && (
            <>
            <label className="grid gap-1 text-small">
              {t.reviewer}
              <Select value={reviewer} onChange={(e) => setReviewer(e.target.value)}>
                <option value="">{t.reviewerNone}</option>
                {list.filter((x) => x.agent.id !== picked?.agent.id && !helpers.some((h) => h.id === x.agent.id)).map((x) => <option key={x.agent.id} value={x.agent.id}>{x.agent.name}</option>)}
              </Select>
            </label>
            <section
              aria-labelledby="co-h"
              className="grid gap-3 border border-border bg-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="co-h" className="text-label-lg">
                  {t.co.title}
                </h3>
                <Switch
                  label={t.co.toggle}
                  checked={co}
                  onChange={(e) => {
                    setCo(e.target.checked);
                    if (e.target.checked && !helpers.length) {
                      setLeadShare(60);
                      setHelpers([
                        { id: "", role: "", share: 40, deadline: "" },
                      ]);
                    }
                  }}
                  className="text-small"
                />
              </div>
              {co && (
                <CoBuilder
                  lead={picked}
                  leadShare={leadShare}
                  setLeadShare={setLeadShare}
                  helpers={helpers}
                  setHelpers={setHelpers}
                  pool={list}
                  shares={shares}
                />
              )}
            </section>
            </>
          )}

          {showInel && <IneligibleList inel={inel} service={c.service} />}

          <div className="sticky bottom-16 z-10 flex flex-wrap items-center gap-3 border border-border bg-white p-3 shadow-md lg:bottom-4">
            <span className="text-eyebrow text-fg-subtle max-sm:hidden">
              <Kbd>1</Kbd>–<Kbd>5</Kbd> · <Kbd>⌘</Kbd>
              <Kbd>↵</Kbd>
            </span>
            {tried && problems.length > 0 && (
              <p role="alert" className="text-small font-medium text-danger">
                {problems.join(" · ")}
              </p>
            )}
            <Button
              dots
              className="ml-auto max-sm:w-full max-sm:justify-center"
              loading={assign.isPending}
              onClick={submit}
              disabled={!picked}
            >
              {picked
                ? fill(t.assignTo, { name: picked.agent.name })
                : t.co.pick}
            </Button>
          </div>
        </>
      )}
      {!list.length && (
        <IneligibleList inel={inel} service={c.service} />
      )}

      <ReasonDialog
        open={overriding}
        onClose={() => setOverriding(false)}
        title={t.nobody.overrideTitle}
        description={t.nobody.overrideBody}
        audited
        options={Object.values(t.nobody.reasons).map((v) => ({
          value: v,
          label: v,
        }))}
        confirmLabel={t.nobody.override}
        extra={
          <label className="grid gap-1.5 text-label">
            {t.nobody.agent}
            <select id="ovr-agent" className={inp}>
              {inel.map((x) => (
                <option key={x.agent.id} value={x.agent.id}>
                  {x.agent.name}
                </option>
              ))}
            </select>
          </label>
        }
        onConfirm={async ({ reason }) => {
          const id = (
            document.getElementById("ovr-agent") as HTMLSelectElement | null
          )?.value;
          if (!id) throw new Error(t.co.pick);
          await override.mutateAsync({ ref: c.ref, agentId: id, reason });
          toast({ title: t.nobody.done, tone: "success" });
          setUrlParams({ step: "brief" });
        }}
      />
    </section>
  );
}

function AgentCard({
  s,
  i,
  selected,
  onPick,
  ctx,
}: {
  s: Suggestion;
  i: number;
  selected: boolean;
  onPick: () => void;
  ctx?: AssignContext;
}) {
  const { locale } = useI18n();
  const t = opsAssign(locale);
  const a = s.agent as Suggestion["agent"] & { role?: string };
  const reason = (r: string) => {
    const [k, v] = r.split(":");
    return fill(t.reasons[k] ?? k, { v: v ?? "" });
  };
  const week = ctx?.week[a.id];
  return (
    <article
      className={cx(
        "grid gap-3 border bg-white p-4 transition-colors",
        selected
          ? "border-navy-700 ring-2 ring-navy-700/15"
          : "border-border hover:border-navy-300",
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <MatchRing value={s.score} />
        <Avatar name={a.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-label">
            {a.name}
            <RoleTag external={a.external} location={a.location} />
          </p>
          <p className="text-eyebrow text-fg-muted">
            {a.role ?? ""}
            {a.external
              ? ` · ${fill(t.agreed, { amount: formatMoney(a.cost ?? 0, "RWF", locale) })}`
              : ` · ${t.internalCost}`}
          </p>
        </div>
        <div className="w-28 max-sm:w-full">
          <CapacityBar load={a.load} cap={a.cap} />
        </div>
        <Button
          size="sm"
          variant={selected ? "primary" : "outline"}
          aria-pressed={selected}
          onClick={onPick}
          className="max-sm:w-full max-sm:justify-center"
        >
          {selected ? (
            <>
              <Icon name="check" size={14} aria-hidden />
              {t.selected}
            </>
          ) : (
            <>
              {fill(t.select, { name: a.name.split(" ")[0] })}
              {i < 5 && <Kbd className="max-sm:hidden">{i + 1}</Kbd>}
            </>
          )}
        </Button>
      </div>
      <ul className="flex flex-wrap gap-1.5" aria-label={t.why}>
        {s.reasons.map((r, k) => (
          <li
            key={r}
            className={cx(
              "inline-flex h-6 items-center px-2.5 text-eyebrow",
              r === "dedicated"
                ? "bg-secondary text-on-secondary"
                : "bg-ink-100 text-ink-700",
              k >= 3 && "max-sm:hidden",
            )}
          >
            {reason(r)}
          </li>
        ))}
      </ul>
      {selected && week && (
        <div className="grid gap-1.5">
          <p className="text-eyebrow text-fg-muted">
            {fill(t.week, { name: a.name.split(" ")[0] })}
          </p>
          <ol className="grid grid-cols-5 gap-1.5">
            {week.map((n, d) => (
              <li key={d} className="grid gap-1 text-center text-eyebrow">
                <span className="relative h-10 overflow-hidden bg-bg-subtle">
                  <span
                    className={cx(
                      "absolute inset-x-0 bottom-0",
                      n >= a.cap
                        ? "bg-danger"
                        : n / a.cap >= 0.8
                          ? "bg-warning"
                          : "bg-success",
                    )}
                    style={{ height: `${Math.min(100, (n / a.cap) * 100)}%` }}
                  />
                </span>
                <span>
                  {t.days[d]}{" "}
                  <span className="tabular text-fg-muted">
                    {n}/{a.cap}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}

function CoBuilder({
  lead,
  leadShare,
  setLeadShare,
  helpers,
  setHelpers,
  pool,
  shares,
}: {
  lead: Suggestion;
  leadShare: number;
  setLeadShare: (n: number) => void;
  helpers: Helper[];
  setHelpers: (h: Helper[]) => void;
  pool: Suggestion[];
  shares: { total: number; ok: boolean };
}) {
  const { locale } = useI18n();
  const t = opsAssign(locale).co;
  const set = (i: number, p: Partial<Helper>) =>
    setHelpers(helpers.map((h, k) => (k === i ? { ...h, ...p } : h)));
  const options = pool.filter((s) => s.agent.id !== lead.agent.id);
  return (
    <div className="grid gap-3">
      <div className="grid items-end gap-2 bg-bg-subtle p-3 sm:grid-cols-[1fr_7rem]">
        <p className="text-small">
          <span className="text-eyebrow text-fg-muted">{t.lead}</span>
          <br />
          <span className="font-medium">{lead.agent.name}</span>
        </p>
        <label className="grid gap-1 text-eyebrow text-fg-muted">
          {t.share}
          <input
            className={cx(inp, "tabular")}
            type="number"
            min={1}
            max={100}
            value={leadShare}
            onChange={(e) => setLeadShare(Number(e.target.value))}
          />
        </label>
      </div>
      {helpers.map((h, i) => (
        <div
          key={i}
          className="grid items-end gap-2 border border-border p-3 sm:grid-cols-[1fr_1fr_6rem_9rem_auto]"
        >
          <label className="grid gap-1 text-eyebrow text-fg-muted">
            {t.helper}
            <select
              className={inp}
              value={h.id}
              onChange={(e) => set(i, { id: e.target.value })}
              aria-invalid={!h.id || undefined}
            >
              <option value="">{t.pick}</option>
              {options.map((s) => (
                <option
                  key={s.agent.id}
                  value={s.agent.id}
                  disabled={helpers.some(
                    (x, k) => k !== i && x.id === s.agent.id,
                  )}
                >
                  {s.agent.name}
                  {s.agent.external ? ` (${s.agent.location ?? ""})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-eyebrow text-fg-muted">
            {t.role}
            <input
              className={inp}
              value={h.role}
              placeholder={t.rolePh}
              onChange={(e) => set(i, { role: e.target.value })}
            />
          </label>
          <label className="grid gap-1 text-eyebrow text-fg-muted">
            {t.share}
            <input
              className={cx(inp, "tabular")}
              type="number"
              min={1}
              max={100}
              value={h.share}
              onChange={(e) => set(i, { share: Number(e.target.value) })}
            />
          </label>
          <label className="grid gap-1 text-eyebrow text-fg-muted">
            {t.deadline}
            <input
              className={inp}
              type="date"
              value={h.deadline}
              onChange={(e) => set(i, { deadline: e.target.value })}
            />
          </label>
          <button
            type="button"
            aria-label={fill(t.remove, {
              name:
                options.find((s) => s.agent.id === h.id)?.agent.name ??
                String(i + 1),
            })}
            onClick={() => setHelpers(helpers.filter((_, k) => k !== i))}
            className="flex size-10 items-center justify-center hover:bg-navy-50"
          >
            <Icon name="x" size={16} aria-hidden />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={helpers.length >= options.length}
          onClick={() =>
            setHelpers([
              ...helpers,
              { id: "", role: "", share: 0, deadline: "" },
            ])
          }
        >
          <Icon name="plus" size={14} aria-hidden />
          {t.add}
        </Button>
        <p
          role="status"
          className={cx(
            "text-small font-medium tabular",
            shares.ok ? "text-success" : "text-danger",
          )}
        >
          <Icon
            name={shares.ok ? "check" : "x"}
            size={14}
            aria-hidden
            className="mr-1 inline"
          />
          {fill(t.total, { n: shares.total })}
          {!shares.ok && ` · ${t.must}`}
        </p>
      </div>
    </div>
  );
}

function IneligibleList({
  inel,
  service,
}: {
  inel: Ineligible[];
  service: string;
}) {
  const { locale } = useI18n();
  const t = opsAssign(locale);
  if (!inel.length) return null;
  return (
    <section aria-labelledby="in-h" className="grid gap-2">
      <h3 id="in-h" className="text-label">
        {t.ineligible} ({inel.length})
      </h3>
      <ul className="grid gap-2 sm:grid-cols-2">
        {inel.map((x) => (
          <li
            key={x.agent.id}
            className="flex items-center gap-3 border border-dashed border-border-strong bg-bg-subtle p-3 text-fg-muted"
          >
            <Avatar name={x.agent.name} size="sm" />
            <div className="min-w-0">
              <p className="text-small font-medium text-fg">{x.agent.name}</p>
              <p className="flex items-center gap-1 text-eyebrow">
                <Icon name="lock" size={12} aria-hidden />
                {fill(t.inel[x.reason], {
                  service,
                  d: x.agent.onLeaveUntil
                    ? formatDate(x.agent.onLeaveUntil, locale, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })
                    : "—",
                  load: x.agent.load,
                  cap: x.agent.cap,
                })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Nobody({
  inel,
  external,
  onOverride,
  onHold,
}: {
  inel: Ineligible[];
  external: boolean;
  onOverride: () => void;
  onHold?: () => void;
}) {
  const { locale } = useI18n();
  const t = opsAssign(locale).nobody;
  const counts = inel.reduce<Record<string, number>>(
    (m, x) => ({ ...m, [x.reason]: (m[x.reason] ?? 0) + 1 }),
    {},
  );
  const summary = Object.entries(counts)
    .map(([k, n]) => fill(t.parts[k], { n }))
    .join(", ");
  return (
    <EmptyPanel
      title={t.title}
      body={summary || opsCommon(locale).empty.generic}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          {!external && (
            <Button
              size="sm"
              dots
              onClick={() => setUrlParams({ external: "1" })}
            >
              {t.searchExternal}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onOverride}
            disabled={!inel.length}
          >
            {t.override}
          </Button>
          {onHold && (
            <Button size="sm" variant="ghost" onClick={onHold}>
              {t.hold}
            </Button>
          )}
        </div>
      }
    />
  );
}

