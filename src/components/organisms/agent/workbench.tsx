"use client";
import { useWs } from "@/lib/agent/ws";
// U6 Workbench (boards 06 v2 layout + v1 QC detail, 07): header, tabs in ?tab=, state banners, phone action bar, keys.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx } from "@/shared/format";
import { fill } from "@/content/pages/agent-workbench";
import { useShortcut } from "@/lib/ops/shortcuts";
import { ApiError } from "@/lib/api/client";
import { OpsStatus, SlaChip } from "@/components/atoms/ops";
import { MenuButton } from "@/components/molecules/ops/ops";
import { Button, ButtonLink } from "@/components/atoms/button";
import { ErrorState } from "@/components/atoms/feedback";
import { Icon } from "@/components/atoms/icon";
import { Countdown, SkeletonRows, useNow } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { CaseConversation } from "@/components/organisms/agent/case-conversation";
import { CopilotPanel } from "@/components/organisms/booking/staff-ai";
import { CaseDeliverables } from "@/components/organisms/agent/deliverables";
import {
  useWorkbench,
  useSetStatus,
  nextAction,
  type WorkbenchVM,
  type NextAction,
} from "@/lib/agent/b";
import {
  useW,
  StatusDialog,
  OutcomeDialog,
  ProposeDialog,
  FieldVisitDialog,
  FlagDialog,
  DisputeDialog,
} from "@/components/organisms/agent/workbench-dialogs";
import { useExternal, useJobScope, type JobScope } from "@/lib/work/api";
import { can, scopeOf, why as whyOf } from "@/lib/work/limits";
import { workCommon } from "@/content/pages/work-common";
import { OfferEarnings } from "@/components/molecules/agent/agent";
import {
  AccessEnded,
  DocsTop,
  DownloadButton,
  ExternalHeaderBits,
  HandBackDialog,
  HandbackBanner,
  InstructionsBar,
  NotAssigned,
  UploadLock,
  ViewerWatermark,
  useJ,
} from "@/components/organisms/agent/work-scoped";
import type { Watermark } from "@/lib/work/d";
import {
  BriefTab,
  DocumentsTab,
  TimelineTab,
  TimeTab,
  MoneyTab,
} from "@/components/organisms/agent/workbench-panels";

const TABS = [
  "brief",
  "documents",
  "conversation",
  "deliverables",
  "timeline",
  "time",
  "money",
] as const;
type Tab = (typeof TABS)[number];
type Open =
  null | "status" | "outcome" | "propose" | "field" | "flag" | "dispute" | "handback";

export function Workbench({ refId }: { refId: string }) {
  const { locale } = useI18n();
  const { wsHref, external } = useWs();
  const w = useW();
  const q = useWorkbench(refId);
  // Stage 8: externals get the job scope (shared docs/fields, lanes, access ended) and no Time tab.
  const sq = useJobScope(refId, external);
  const scope = sq.data;
  const { ext, data: summary } = useExternal();
  const [mark, setMark] = useState<Watermark | null>(null);
  const tabs = external ? TABS.filter((t) => t !== "time") : TABS;
  const params = useUrlParams();
  const raw = params.get("tab") ?? "";
  const tab: Tab = (tabs as readonly string[]).includes(raw)
    ? (raw as Tab)
    : "brief";
  const go = (t: Tab) => setUrlParams({ tab: t });
  const [open, setOpen] = useState<Open>(null);
  const c = q.data;
  const online = useOnline();
  const locked =
    !c ||
    !!c.readOnly ||
    c.status === "completed_delivered" ||
    ["cancelled", "rejected", "refunded"].includes(c.status);

  useShortcut("1", `${w.keys.tab}: ${w.tabs.brief}`, () => go("brief"), "case");
  useShortcut("2", `${w.keys.tab}: ${w.tabs.documents}`, () => go("documents"), "case");
  useShortcut("3", `${w.keys.tab}: ${w.tabs.conversation}`, () => go("conversation"), "case");
  useShortcut("4", `${w.keys.tab}: ${w.tabs.deliverables}`, () => go("deliverables"), "case");
  useShortcut("5", `${w.keys.tab}: ${w.tabs.timeline}`, () => go("timeline"), "case");
  useShortcut("6", `${w.keys.tab}: ${w.tabs.time}`, () => go(external ? "money" : "time"), "case");
  useShortcut("7", `${w.keys.tab}: ${w.tabs.money}`, () => go("money"), "case");
  useShortcut("s", w.keys.status, () => !locked && setOpen("status"), "case");
  useShortcut("d", w.keys.propose, () => !locked && setOpen("propose"), "case");
  useShortcut("f", w.keys.flag, () => !locked && setOpen("flag"), "case");

  if (external && sq.isError) return <NotAssigned />;
  if (external && scope && !scope.active)
    return <AccessEnded refId={refId} scope={scope} manager={ext?.manager ?? ""} />;
  if (q.isPending || (external && sq.isPending))
    return (
      <div aria-busy className="grid gap-4">
        <div className="h-24 m-shimmer" />
        <div className="h-11 m-shimmer" />
        <SkeletonRows n={5} />
      </div>
    );
  if (q.isError || !c) {
    if (q.error instanceof ApiError && q.error.status === 404 && external)
      return <NotAssigned />;
    if (q.error instanceof ApiError && q.error.status === 404)
      return (
        <div className="mx-auto grid max-w-md justify-items-center gap-3 py-16 text-center m-rise">
          <Icon name="lock"size={28} aria-hidden className="text-fg-muted" />
          <h1 className="text-h4">{w.states.notMine}</h1>
          <p className="text-small text-fg-muted">{w.states.notMineBody}</p>
          <ButtonLink href={localHref(locale, wsHref("/agent/cases"))}>
            {w.states.toCases}
          </ButtonLink>
        </div>
      );
    return (
      <ErrorState
        error={q.error ?? w.states.error}
        onRetry={() => q.refetch()}
      />
    );
  }

  const xs = external && scope ? scope : null;
  const serviceState = ext?.services.find((x) => x.slug === c.serviceSlug)?.state;
  const uploadWhy = xs ? whyOf(scopeOf(ext, { active: xs.active, serviceState }), "upload") : null;
  const panels: Record<Tab, React.ReactNode> = {
    brief: (
      <>
        {xs && <InstructionsBar refId={c.ref} version={xs.instructionsVersion} manager={c.manager} at={c.instructionsAt} />}
        <BriefTab c={c} locked={locked} />
      </>
    ),
    documents: xs ? (
      <DocumentsTab
        c={c}
        locked={locked}
        top={<DocsTop refId={c.ref} scope={xs} manager={c.manager} />}
        docAction={(id) => <DownloadButton refId={c.ref} docId={id} onWatermark={setMark} />}
        watermark={<ViewerWatermark name={mark?.name ?? summary?.me.name ?? ""} refId={c.ref} at={mark?.at} />}
      />
    ) : (
      <DocumentsTab c={c} locked={locked} />
    ),
    conversation: (
      <div className="grid gap-4 xl:grid-cols-[1fr_20rem] xl:items-start">
        <CaseConversation caseRef={c.ref} />
        <CopilotPanel caseCode={c.ref} onInsert={(t) => window.dispatchEvent(new CustomEvent("copilot:insert", { detail: t }))} />
      </div>
    ),
    deliverables: (
      <>
        {uploadWhy && uploadWhy !== "accessEnded" && <div className="mb-4"><UploadLock reason={workCommon(locale).why[uploadWhy]} /></div>}
        <CaseDeliverables caseRef={c.ref} />
      </>
    ),
    timeline: <TimelineTab c={c} />,
    time: <TimeTab c={c} locked={locked} />,
    money: xs ? (
      <div className="grid max-w-xl gap-4">
        <OfferEarnings earning={xs.agreed.amount} eligible={c.share.eligible} rate={{ bps: xs.agreed.bps, flat: xs.agreed.flat }} />
        <MoneyTab c={c} />
      </div>
    ) : (
      <MoneyTab c={c} />
    ),
  };
  const close = () => setOpen(null);
  return (
    <div className="pb-44 sm:pb-24 lg:pb-8">
      <Header c={c} locked={locked} onOpen={setOpen} scope={xs} />
      <div className="mt-3 grid gap-2">
        {xs && <HandbackBanner refId={c.ref} scope={xs} manager={c.manager} />}
        {!online && (
          <Banner tone="warn" icon="globe">
            {w.states.offline}
          </Banner>
        )}
        {c.readOnly && (
          <Banner tone="warn" icon="lock">
            {w.states.reassigned}
          </Banner>
        )}
        {c.status === "on_hold" && (
          <Banner tone="info" icon="clock">
            {w.states.onHold}
          </Banner>
        )}
        {c.status === "completed_delivered" && (
          <Banner
            tone="ok"
            icon="check"
            action={
              <Link
                className="underline underline-offset-4"
                href={localHref(locale, wsHref("/agent/earnings"))}
              >
                {w.states.viewEarnings}
              </Link>
            }
          >
            {w.states.completed}
          </Banner>
        )}
        {c.dispute && (
          <Banner
            tone="danger"
            icon="shield"
            action={
              <Button
                size="sm"
                variant="outline"
                disabled={!!c.readOnly}
                onClick={() => setOpen("dispute")}
              >
                {w.dispute.respond}
              </Button>
            }
          >
            <strong className="block">
              {fill(w.dispute.title, { m: c.manager.split(" ")[0] })}
            </strong>
            {fill(w.dispute.body, { id: c.dispute.id, t: c.dispute.text })}
          </Banner>
        )}
      </div>

      <nav
        aria-label={w.tabsLabel}
        className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        <ul className="flex min-w-max gap-1 border-b border-border max-sm:gap-1.5 max-sm:border-0 max-sm:py-2">
          {tabs.map((t, i) => {
            const count =
              t === "documents"
                ? c.docsToCheck
                : t === "conversation"
                  ? c.unread
                  : 0;
            return (
              <li key={t}>
                <button
                  type="button"
                  aria-current={t === tab ? "page" : undefined}
                  onClick={() => go(t)}
                  title={`${i + 1}`}
                  className={cx(
                    "m-press flex h-11 items-center gap-1.5 px-3 text-button whitespace-nowrap transition-colors sm:-mb-px sm:border-b-2",
                    t === tab
                      ? "sm:border-navy-700 text-fg max-sm:bg-secondary max-sm:text-on-navy"
                      : "text-fg-subtle hover:text-fg sm:border-transparent max-sm:bg-ink-100",
                  )}
                >
                  {w.tabs[t]}
                  {count > 0 && (
                    <span className="bg-navy-700 px-1.5 text-eyebrow text-white">
                      {count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div key={tab} className="pt-5 m-rise">
        {panels[tab]}
      </div>

      <PhoneBar c={c} locked={locked} onOutcome={() => setOpen("outcome")} />

      {!locked && (
        <>
          <StatusDialog
            key={`s-${c.status}`}
            c={c}
            open={open === "status"}
            onClose={close}
          />
          <ProposeDialog c={c} open={open === "propose"} onClose={close} />
          <FieldVisitDialog c={c} open={open === "field"} onClose={close} />
          <FlagDialog c={c} open={open === "flag"} onClose={close} />
          {c.status === "awaiting_external_institution" && (
            <OutcomeDialog c={c} open={open === "outcome"} onClose={close} />
          )}
          {xs && <HandBackDialog refId={c.ref} manager={c.manager} open={open === "handback"} onClose={close} />}
        </>
      )}
      {c.dispute && (
        <DisputeDialog c={c} open={open === "dispute"} onClose={close} />
      )}
    </div>
  );
}

function Banner({
  tone,
  icon,
  action,
  children,
}: {
  tone: "warn" | "info" | "ok" | "danger";
  icon: "globe" | "lock" | "clock" | "check" | "shield";
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const cls = {
    warn: "bg-warning-bg text-warning",
    info: "bg-info-bg text-info",
    ok: "bg-success-bg text-success",
    danger: "bg-danger-bg text-danger",
  }[tone];
  return (
    <div
      role={tone === "danger" || tone === "warn" ? "alert" : "status"}
      className={cx(
        "flex flex-wrap items-center gap-3 px-4 py-3 text-small m-rise",
        cls,
      )}
    >
      <Icon name={icon} size={18} aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------- header (WB1); collapses on phone scroll
function Header({
  c,
  locked,
  onOpen,
  scope,
}: {
  c: WorkbenchVM;
  locked: boolean;
  onOpen: (o: Open) => void;
  scope?: JobScope | null;
}) {
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const w = useW();
  const j = useJ();
  const phone = c.answers.find((a) => a.key === "phone");
  const [small, setSmall] = useState(false);
  useEffect(() => {
    // hysteresis: collapsing changes page height, which would otherwise flip scrollY back and forth
    const on = () => setSmall((was) => window.innerWidth < 640 && window.scrollY > (was ? 24 : 120));
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const o = c.outcome;
  const now = useNow();
  return (
    <header
      className={cx(
        "sticky top-0 z-30 -mx-4 bg-bg-subtle/95 px-4 pt-2 pb-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 m-rise",
        small && "shadow-sm",
      )}
    >
      <Link
        href={localHref(locale, wsHref("/agent/cases"))}
        className="inline-flex items-center gap-1 text-small text-fg-muted hover:text-fg"
      >
        <Icon name="arrowRight"size={14} aria-hidden className="rotate-180" />
        {w.back}
      </Link>
      <div className="mt-1 flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-h3 tabular">{c.ref}</h1>
            <button type="button"aria-label={`Copy ${c.ref}`} title="Copy"onClick={() => void navigator.clipboard?.writeText(c.ref)} className="m-press p-1.5 text-fg-muted hover:bg-ink-100 hover:text-fg">
              <Icon name="layers" size={16} aria-hidden />
            </button>
            <OpsStatus status={c.status} />
            {c.readOnly && (
              <span className="bg-ink-100 px-2 text-eyebrow">
                {w.states.readOnly}
              </span>
            )}
          </div>
          <p
            className={cx(
              "mt-1 text-body text-fg-muted",
              small && "max-sm:hidden",
            )}
          >
            {c.service} · {c.client}
          </p>
          {scope && !small && (
            <ExternalHeaderBits
              phone={phone?.masked ?? null}
              scope={scope}
              onMessage={() => setUrlParams({ tab: "conversation", lane: scope.clientLane ? "client" : "internal" })}
            />
          )}
        </div>
        {!locked && (
          <div
            className={cx(
              "flex flex-wrap items-center gap-2",
              small && "max-sm:hidden",
            )}
          >
            <Button size="sm" onClick={() => onOpen("status")}>
              {w.actions.status}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpen("propose")}
            >
              <Icon name="calendar" size={14} aria-hidden />
              {w.actions.propose}
            </Button>
            <MenuButton label={w.actions.more} icon="menu" align="right">
              {(close) =>
                (scope
                  ? ([
                      ["flag", w.actions.flag, "megaphone"],
                      ["handback", j.handback.menu, "refresh"],
                    ] as const)
                  : ([
                      ["field", w.actions.field, "mapPin"],
                      ["flag", w.actions.flag, "megaphone"],
                      ["time", w.actions.time, "clock"],
                    ] as const)
                ).map(([k, label, icon]) => (
                  <button
                    key={k}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-small hover:bg-bg-subtle"
                    onClick={() => {
                      close();
                      if (k === "time") setUrlParams({ tab: "time" });
                      else onOpen(k);
                    }}
                  >
                    <Icon name={icon} size={16} aria-hidden />
                    {label}
                  </button>
                ))
              }
            </MenuButton>
          </div>
        )}
      </div>
      <div
        className={cx(
          "mt-2 flex flex-wrap items-center gap-2",
          small && "max-sm:hidden",
        )}
      >
        {c.dueAt && now !== null && Date.parse(c.dueAt) > now && <Countdown to={c.dueAt} kind="due" />}
        <SlaChip
          due={c.dueAt}
          paused={c.slaPaused}
          done={c.status === "completed_delivered"}
        />
        <button
          type="button"
          disabled={locked || c.status !== "awaiting_external_institution"}
          onClick={() => onOpen("outcome")}
          aria-label={`${w.outcome.label}: ${o ? w.outcome[o.state] : w.outcome.none}`}
          className={cx(
            "inline-flex h-6 items-center gap-1.5 border px-2.5 text-eyebrow font-medium m-tone enabled:hover:border-navy-700/40",
            !o
              ? "border-border text-fg-subtle"
              : o.state === "approved"
                ? "border-success/40 bg-success-bg text-success"
                : o.state === "rejected"
                  ? "border-danger/40 bg-danger-bg text-danger"
                  : "border-warning/40 bg-warning-bg text-warning",
          )}
        >
          {w.outcome.label}: {o ? w.outcome[o.state] : w.outcome.none}
          {c.institution && ` · ${c.institution}`}
        </button>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------- phone sticky action bar (above the tab bar)
function PhoneBar({
  c,
  locked,
  onOutcome,
}: {
  c: WorkbenchVM;
  locked: boolean;
  onOutcome: () => void;
}) {
  const w = useW();
  const set = useSetStatus(c.ref);
  const a: NextAction = locked ? "none" : nextAction(c);
  if (a === "none") return null;
  const run = () => {
    if (a === "start") set.mutate({ status: "in_progress" });
    else if (a === "check") setUrlParams({ tab: "documents" });
    else if (a === "upload") setUrlParams({ tab: "deliverables" });
    else if (a === "reply") setUrlParams({ tab: "conversation" });
    else onOutcome();
  };
  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-white/95 p-3 backdrop-blur sm:hidden">
      <Button
        dots
        loading={set.isPending}
        className="w-full justify-between"
        onClick={run}
      >
        {w.next[a]}
        <Icon name="arrowRight" size={16} aria-hidden />
      </Button>
    </div>
  );
}
