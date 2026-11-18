"use client";
// U4 Today (/ops), board 04 v1: TB1 busy morning, TB2 service filter, TB3 calm day, TB4 loading/partial error,
// PT1 phone today, PT2 urgent approval (?approve=<ref>, the push deep link).
import { errorCopy } from "@/lib/api/error-copy";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDate, formatRelative } from "@/shared/format";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { useToday, useCases, useSetStatus, type CaseVM } from "@/lib/ops/api";
import {
  useNeedsYou,
  useNudge,
  useRevert,
  useNow,
  type NeedsYouItem,
} from "@/lib/ops/a";
import { useShortcut } from "@/lib/ops/shortcuts";
import { opsToday } from "@/content/pages/ops-today";
import { opsCommon } from "@/content/pages/ops-common";
import { Icon, type IconName } from "@/components/atoms/icon";
import { ButtonLink, Button } from "@/components/atoms/button";
import { HighlightWord } from "@/components/atoms/brand";
import { Skeleton } from "@/components/atoms/feedback";
import { Dialog } from "@/components/atoms/dialog";
import { useToast } from "@/components/atoms/toast";
import { LiveDot } from "@/components/atoms/tag";
import { SlaChip } from "@/components/atoms/ops";
import {
  KpiTile,
  Panel,
  PanelError,
  EmptyPanel,
  HeatCell,
  MenuButton,
  ReasonDialog,
} from "@/components/molecules/ops/ops";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";

const SEEN = "ops.today.seen";
const noSub = () => () => {};
const readSeen = () => {
  try {
    return localStorage.getItem(SEEN);
  } catch {
    return null;
  }
};

const NEED_ICON: Record<NeedsYouItem["kind"], IconName> = {
  review: "fileCheck",
  reupload: "upload",
  declined: "user",
  quote: "wallet",
  dispute: "megaphone",
};

export function TodayView() {
  const { locale } = useI18n();
  const t = opsToday(locale);
  const c = opsCommon(locale);
  const L = (p: string) => localHref(locale, p);
  const router = useRouter();
  const params = useUrlParams();
  const service = params.get("service");
  const approveRef = params.get("approve");
  const now = useNow();
  const today = useToday();
  const cases = useCases();
  const needs = useNeedsYou();
  const nudge = useNudge();
  const toast = useToast();

  const d = today.data;
  const all = useMemo(() => cases.data?.cases ?? [], [cases.data]);
  const services = useMemo(
    () =>
      [...new Map(all.map((x) => [x.serviceSlug, x.service])).entries()].sort(
        (a, b) => a[1].localeCompare(b[1]),
      ),
    [all],
  );
  const serviceName = services.find(([s]) => s === service)?.[1] ?? service;
  const inService = (x: CaseVM) => !service || x.serviceSlug === service;

  // TB2: tiles recount for one service from the same case list the other pages use.
  const counts = d && {
    intake: service
      ? all.filter((x) => x.status === "received" && inService(x)).length
      : d.intake,
    review: service
      ? all.filter(
          (x) => x.status === "awaiting_internal_review" && inService(x),
        ).length
      : d.awaitingReview,
    overdue: d.overdue.filter(inService).length,
    risk: d.atRisk.filter(inService).length,
    unassigned: service
      ? all.filter(
          (x) =>
            inService(x) &&
            !x.assignees.length &&
            ["under_review", "approved_assigned"].includes(x.status),
        ).length
      : d.unassigned,
    complaints: d.complaints,
  };

  // "Since you last looked": compare with the snapshot saved when the manager last left the page.
  const seenRaw = useSyncExternalStore(noSub, readSeen, () => null);
  const seen = useMemo(() => {
    try {
      return seenRaw ? (JSON.parse(seenRaw) as Record<string, number>) : null;
    } catch {
      return null;
    }
  }, [seenRaw]);
  const latest = useRef(counts);
  useEffect(() => {
    latest.current = counts;
  });
  useEffect(() => {
    const save = () => {
      if (!latest.current || service) return;
      try {
        localStorage.setItem(SEEN, JSON.stringify(latest.current));
      } catch {}
    };
    window.addEventListener("pagehide", save);
    return () => {
      save();
      window.removeEventListener("pagehide", save);
    };
  }, [service]);
  const delta = (k: keyof NonNullable<typeof counts>) => {
    if (!counts || !seen || service || seen[k] === undefined) return null;
    const n = counts[k] - seen[k];
    return n > 0
      ? t.since.replace("{n}", String(n))
      : n < 0
        ? t.sinceDown.replace("{n}", String(-n))
        : null;
  };

  const tiles = counts
    ? ([
        {
          k: "intake",
          icon: "layers",
          href: "/ops/intake",
          tone: "attention",
          spark: d?.sparks.intake,
        },
        {
          k: "review",
          icon: "fileCheck",
          href: "/ops/reviews",
          tone: "neutral",
          spark: d?.sparks.review,
        },
        {
          k: "overdue",
          icon: "clock",
          href: "/ops/cases?view=overdue",
          tone: "danger",
          spark: d?.sparks.overdue,
        },
        {
          k: "risk",
          icon: "zap",
          href: "/ops/cases?view=risk",
          tone: "warning",
          spark: d?.sparks.risk,
        },
        {
          k: "unassigned",
          icon: "user",
          href: "/ops/cases?view=unassigned",
          tone: "neutral",
          spark: d?.sparks.unassigned,
        },
        {
          k: "complaints",
          icon: "megaphone",
          href: "/ops/tickets",
          tone: "neutral",
          spark: d?.sparks.complaints,
        },
      ] as const)
    : [];
  const withService = (href: string) =>
    service && href.startsWith("/ops/") && !href.startsWith("/ops/tickets")
      ? `${href}${href.includes("?") ? "&" : "?"}service=${encodeURIComponent(service)}`
      : href;
  // Keyboard jumps 1–6 to each tile.
  const go = (i: number) =>
    tiles[i] && router.push(L(withService(tiles[i].href)));
  useShortcut("1", t.kpi.intake, () => go(0), "list");
  useShortcut("2", t.kpi.review, () => go(1), "list");
  useShortcut("3", t.kpi.overdue, () => go(2), "list");
  useShortcut("4", t.kpi.risk, () => go(3), "list");
  useShortcut("5", t.kpi.unassigned, () => go(4), "list");
  useShortcut("6", t.kpi.complaints, () => go(5), "list");

  const hour =
    now === null
      ? null
      : Number(formatDate(now, "en", { hour: "numeric", hourCycle: "h23" }));
  const greet =
    hour === null
      ? t.hello
      : hour < 12
        ? t.morning
        : hour < 17
          ? t.afternoon
          : t.evening;
  const first = d?.manager.name.split(" ")[0] ?? "";

  const riskRows = d ? [...d.overdue, ...d.atRisk].filter(inService) : [];
  const riskCols: OpsColumn<CaseVM>[] = [
    {
      key: "ref",
      label: t.cols.ref,
      cell: (r) => (
        <Link
          href={L(`/ops/cases/${r.ref}`)}
          className="font-medium whitespace-nowrap tabular hover:underline"
        >
          {r.ref}
        </Link>
      ),
    },
    {
      key: "service",
      label: t.cols.service,
      cell: (r) => <span className="line-clamp-1">{r.service}</span>,
      sort: (r) => r.service,
    },
    {
      key: "assignee",
      label: t.cols.assignee,
      cell: (r) =>
        r.assignees[0]?.name ?? (
          <span className="text-fg-subtle">{t.unassigned}</span>
        ),
    },
    {
      key: "sla",
      label: t.cols.sla,
      cell: (r) => <SlaChip due={r.dueAt} />,
      sort: (r) => r.dueAt ?? "",
    },
    {
      key: "updated",
      label: t.cols.updated,
      cell: (r) => (
        <span className="text-fg-muted">
          {now ? formatRelative(r.updatedAt, locale, now) : ""}
        </span>
      ),
      card: false,
    },
    {
      key: "action",
      label: t.cols.action,
      align: "right",
      cell: (r) =>
        r.assignees.length ? (
          <Button
            size="sm"
            variant="outline"
            loading={nudge.isPending && nudge.variables === r.ref}
            onClick={(e) => {
              e.stopPropagation();
              nudge.mutate(r.ref, {
                onSuccess: (x) =>
                  toast({
                    tone: "success",
                    title: t.nudged.replace("{name}", x.to),
                  }),
                onError: (err) => toast({ tone: "danger", title: errorCopy(err, locale) }),
              });
            }}
          >
            {t.nudge}
          </Button>
        ) : (
          <Link
            href={L(`/ops/assign/${r.ref}`)}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex h-9 items-center border border-border-strong px-4 text-small font-medium hover:bg-navy-50"
          >
            {t.reassign}
          </Link>
        ),
    },
  ];

  return (
    <div className="grid gap-6 pb-24 lg:pb-8">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-h2">
            {greet} {first && <HighlightWord>{first}</HighlightWord>}
          </h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-fg-muted">
            {now && (
              <span>
                {formatDate(now, locale, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
            {d && <span>· {d.manager.categoryName}</span>}
            <span className="inline-flex items-center gap-1.5">
              <LiveDot />{" "}
              {today.dataUpdatedAt && now
                ? t.updated.replace(
                    "{t}",
                    formatRelative(
                      today.dataUpdatedAt,
                      locale,
                      Math.max(now, today.dataUpdatedAt),
                    ),
                  )
                : t.live}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MenuButton
            label={serviceName ?? t.allServices}
            icon="layers"
            align="right"
            active={!!service}
          >
            {(close) => (
              <ul className="grid max-h-80 overflow-auto">
                {[[null, t.allServices] as const, ...services].map(
                  ([slug, name]) => (
                    <li key={slug ?? "_"}>
                      <button
                        type="button"
                        aria-pressed={service === slug}
                        onClick={() => {
                          setUrlParams({ service: slug });
                          close();
                        }}
                        className={cx(
                          "w-full px-3 py-2 text-left text-small hover:bg-navy-50",
                          service === slug && "font-medium",
                        )}
                      >
                        {name}
                      </button>
                    </li>
                  ),
                )}
              </ul>
            )}
          </MenuButton>
          <ButtonLink href={L("/ops/intake")} dots>
            {t.openIntake}
          </ButtonLink>
        </div>
      </header>
      <p aria-live="polite" className="sr-only">
        {counts ? t.announce.replace("{n}", String(counts.intake)) : ""}
      </p>

      {service && (
        <p className="flex flex-wrap items-center gap-2 bg-navy-50 px-4 py-2.5 text-small text-navy-700">
          <Icon name="layers" size={14} aria-hidden />
          {t.showingOnly.replace("{s}", serviceName ?? "")} ·
          <button
            type="button"
            onClick={() => setUrlParams({ service: null })}
            className="font-medium underline underline-offset-4"
          >
            {c.clear}
          </button>
        </p>
      )}

      {/* KPI strip: grid on desktop, horizontal chips on phones (PT1) */}
      {today.isPending ? (
        <div
          className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
          aria-busy="true"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : today.isError ? (
        <PanelError what={t.title} onRetry={() => today.refetch()} />
      ) : (
        <div
          className="-mx-gutter overflow-x-auto px-gutter sm:mx-0 sm:px-0"
          role="region"
          aria-label={t.title}
          tabIndex={0}
        >
          <div className="grid auto-cols-[minmax(10.5rem,1fr)] grid-flow-col gap-3 sm:grid-flow-row sm:grid-cols-3 xl:grid-cols-6">
            {tiles.map((x) => (
              <KpiTile
                key={x.k}
                label={t.kpi[x.k]}
                value={counts![x.k]}
                href={L(withService(x.href))}
                icon={x.icon}
                tone={
                  x.k === "overdue" && !counts?.overdue ? "neutral" : x.tone
                }
                spark={x.spark}
                note={
                  delta(x.k) ??
                  (x.k === "complaints" && counts?.complaints
                    ? t.complaintsNote
                    : undefined)
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* TB3 calm day */}
      {counts && counts.intake === 0 && (
        <EmptyPanel title={c.empty.intake} body={t.calmBody} />
      )}

      <div className="grid gap-4 xl:grid-cols-12">
        {/* (a) Needs you now — its own query, so it fails independently (TB4) */}
        <Panel title={t.needsYou} className="xl:col-span-5">
          {needs.isPending ? (
            <div className="grid gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : needs.isError ? (
            <PanelError what={t.needsYou} onRetry={() => needs.refetch()} />
          ) : !needs.data.items.length ? (
            <EmptyPanel compact title={t.noNeeds} body={t.noNeedsBody} />
          ) : (
            <ul className="grid gap-2">
              {needs.data.items.map((n) => (
                <li
                  key={n.id}
                  className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 border border-border p-2.5"
                >
                  <span
                    className={cx(
                      "flex size-9 items-center justify-center rounded-full",
                      n.kind === "dispute"
                        ? "bg-danger-bg text-danger"
                        : "bg-navy-50 text-navy-700",
                    )}
                  >
                    <Icon name={NEED_ICON[n.kind]} size={16} aria-hidden />
                  </span>
                  <span className="grid min-w-0 gap-0.5">
                    <span className="line-clamp-2 text-small font-medium">
                      {t.needs[n.kind]}
                    </span>
                    <span className="truncate text-eyebrow text-fg-muted">
                      {n.ref} · {n.client}
                    </span>
                    <SlaChip due={n.dueAt} className="mt-0.5 w-fit" />
                  </span>
                  {n.kind === "review" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setUrlParams({ approve: n.ref })}
                    >
                      {t.act.review}
                    </Button>
                  ) : (
                    <Link
                      href={L(
                        n.kind === "declined"
                          ? `/ops/assign/${n.ref}`
                          : n.kind === "dispute"
                            ? "/ops/tickets"
                            : `/ops/cases/${n.ref}?tab=${n.kind === "quote" ? "billing" : "documents"}`,
                      )}
                      className="inline-flex h-9 items-center border border-border-strong px-4 text-small font-medium hover:bg-navy-50"
                    >
                      {t.act[n.kind]}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* (b) Overdue & at risk */}
        <Panel
          title={t.overdueRisk}
          className="xl:col-span-7"
          action={
            <Link
              href={L(withService("/ops/cases?view=overdue"))}
              className="text-small underline underline-offset-4"
            >
              {t.viewAll}
            </Link>
          }
        >
          <OpsTable
            label={t.overdueRisk}
            rows={riskRows}
            columns={riskCols}
            rowKey={(r) => r.ref}
            loading={today.isPending}
            error={today.error}
            onRetry={() => today.refetch()}
            density="compact"
            pageSize={8}
            rowTone={(r) => (r.breached ? "danger" : null)}
            onOpen={(r) => router.push(L(`/ops/cases/${r.ref}`))}
            empty={
              <EmptyPanel
                compact
                title={c.empty.overdue}
                body={t.noOverdueBody}
              />
            }
          />
        </Panel>

        {/* (c) Workload heatmap */}
        <Panel title={t.workload} className="xl:col-span-8">
          {today.isPending ? (
            <Skeleton className="h-48" />
          ) : today.isError ? (
            <PanelError what={t.workloadWhat} onRetry={() => today.refetch()} />
          ) : (
            <div
              className="overflow-x-auto"
              role="region"
              aria-label={t.workload}
              tabIndex={0}
            >
              <table className="w-full min-w-[30rem] border-separate border-spacing-1 text-small">
                <thead>
                  <tr className="text-eyebrow text-fg-muted">
                    <th scope="col" className="w-44 text-left font-medium">
                      <span className="sr-only">{t.cols.assignee}</span>
                    </th>
                    {t.days.map((day, i) => (
                      <th key={i} scope="col" className="font-medium">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d?.workload.map((a) => (
                    <tr key={a.id}>
                      <th scope="row" className="pr-2 text-left font-normal">
                        <Link
                          href={L(`/ops/workload?agent=${a.id}`)}
                          className="grid hover:underline"
                        >
                          <span className="truncate font-medium">{a.name}</span>
                          <span className="text-eyebrow text-fg-subtle">
                            {t.cap.replace("{n}", String(a.cap))}
                          </span>
                        </Link>
                      </th>
                      {a.days.map((load, i) => (
                        <td
                          key={i}
                          title={load > a.cap ? t.overloaded : undefined}
                        >
                          <HeatCell load={load} cap={a.cap} />
                          {load > a.cap && (
                            <span className="sr-only">{t.overloaded}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="grid content-start gap-4 xl:col-span-4">
          {/* (d) Awaiting my review counts */}
          <Panel title={t.awaitingReview}>
            {today.isPending ? (
              <Skeleton className="h-32" />
            ) : today.isError ? (
              <PanelError
                what={t.awaitingReview}
                onRetry={() => today.refetch()}
              />
            ) : (
              <ul className="grid gap-1">
                {(
                  Object.keys(t.reviewKinds) as (keyof typeof t.reviewKinds)[]
                ).map((k) => (
                  <li key={k}>
                    <Link
                      href={L(
                        k === "deliverables"
                          ? "/ops/reviews"
                          : "/ops/workload?tab=approvals",
                      )}
                      className="flex items-center justify-between px-2 py-1.5 text-small hover:bg-navy-50"
                    >
                      {t.reviewKinds[k]}
                      <span className="bg-bg-subtle px-2 tabular">
                        {d?.reviewBreakdown[k]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* (e) Today's consultations */}
        <Panel title={t.consultations} className="xl:col-span-4">
          {today.isPending ? (
            <Skeleton className="h-28" />
          ) : today.isError ? (
            <PanelError
              what={t.consultations}
              onRetry={() => today.refetch()}
            />
          ) : !d?.consultations.length ? (
            <EmptyPanel compact title={t.noConsultations} />
          ) : (
            <ul className="grid gap-2">
              {d?.consultations.map((x) => (
                <li
                  key={x.time + x.client}
                  className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 text-small"
                >
                  <time className="font-medium tabular">{x.time}</time>
                  <span className="truncate">{x.client}</span>
                  <span className="inline-flex items-center gap-1 bg-ink-100 px-2 py-0.5 text-eyebrow">
                    <Icon
                      name={
                        x.mode === "phone"
                          ? "phone"
                          : x.mode === "meet"
                            ? "laptop"
                            : "building"
                      }
                      size={12}
                      aria-hidden
                    />
                    {t.modes[x.mode]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* (f) Waiting on institutions */}
        <Panel
          title={t.institutions}
          className="xl:col-span-8"
          action={
            <Link
              href={L("/ops/cases?view=institution")}
              className="text-small underline underline-offset-4"
            >
              {t.viewAll}
            </Link>
          }
        >
          {today.isPending ? (
            <Skeleton className="h-20" />
          ) : today.isError ? (
            <PanelError what={t.institutions} onRetry={() => today.refetch()} />
          ) : !d?.institutions.some((i) => i.count) ? (
            <EmptyPanel compact title={t.noInstitutions} />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-3">
              {d?.institutions.map((i) => (
                <li key={i.name}>
                  <Link
                    href={L(
                      `/ops/cases?view=institution&institution=${i.name}`,
                    )}
                    className="grid gap-1 border border-border p-3 hover:border-navy-300"
                  >
                    <span className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Icon name="building" size={14} aria-hidden />
                        {i.name}
                      </span>
                      <span className="text-h3 tabular">{i.count}</span>
                    </span>
                    {i.next && (
                      <span className="text-eyebrow text-fg-muted">
                        {t.nextDecision.replace(
                          "{d}",
                          formatDate(i.next, locale, {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          }),
                        )}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <p className="hidden text-eyebrow text-fg-subtle lg:block">
        {t.jumpHint}
      </p>

      <ApproveSheet
        refCode={approveRef}
        cases={all}
        onClose={() => setUrlParams({ approve: null })}
      />
    </div>
  );
}

/** PT2: deliverable approval opened from a push deep link (bottom sheet on phones, dialog on desktop). */
function ApproveSheet({
  refCode,
  cases,
  onClose,
}: {
  refCode: string | null;
  cases: CaseVM[];
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const t = opsToday(locale).approve;
  const c = opsCommon(locale);
  const setStatus = useSetStatus();
  const revert = useRevert();
  const toast = useToast();
  const [returning, setReturning] = useState(false);
  const x = refCode ? cases.find((k) => k.ref === refCode) : undefined;
  const waiting = x?.status === "awaiting_internal_review";
  const done = (msg: string, ref: string) =>
    toast({
      tone: "success",
      title: msg.replace("{ref}", ref),
      action: { label: c.undo, onClick: () => revert.mutate([ref]) },
    });

  return (
    <>
      <Dialog
        open={!!refCode && !returning}
        onClose={onClose}
        side="bottom"
        className="sm:m-auto sm:max-w-lg"
        title={t.title}
        description={x ? `${x.ref} · ${x.service}` : undefined}
        footer={
          waiting ? (
            <div className="grid w-full grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setReturning(true)}
              >
                {t.ret}
              </Button>
              <Button
                size="lg"
                loading={setStatus.isPending}
                onClick={() =>
                  setStatus.mutate(
                    { ref: x?.ref, status: "completed_delivered" },
                    {
                      onSuccess: () => {
                        done(t.approved, x?.ref);
                        onClose();
                      },
                      onError: (e) =>
                        toast({ tone: "danger", title: errorCopy(e, locale) }),
                    },
                  )
                }
              >
                {t.approve}
              </Button>
            </div>
          ) : undefined
        }
      >
        {!x ? (
          <Skeleton className="h-40" />
        ) : !waiting ? (
          <p role="status" className="text-small text-fg-muted">
            {t.notFound}
          </p>
        ) : (
          <div className="grid gap-3">
            <div
              role="img"
              aria-label={t.preview}
              className="grid aspect-[4/3] place-items-center bg-bg-subtle text-fg-muted"
            >
              <Icon name="file" size={40} aria-hidden />
            </div>
            <p className="text-small">
              {t.by.replace("{name}", x.assignees[0]?.name ?? "—")}
            </p>
            <p className="text-small text-fg-muted">{x.client}</p>
            <SlaChip due={x.dueAt} className="w-fit" />
          </div>
        )}
      </Dialog>
      <ReasonDialog
        open={returning}
        onClose={() => setReturning(false)}
        title={t.returnTitle}
        description={x?.ref}
        asRadios
        options={Object.entries(t.returnReasons).map(([value, label]) => ({
          value,
          label,
        }))}
        noteLabel={t.note}
        confirmLabel={t.ret}
        audited
        onConfirm={async ({ reason, note }) => {
          await setStatus.mutateAsync({
            ref: x?.ref ?? "",
            status: "in_progress",
            reason: note ? `${reason}: ${note}` : reason,
          });
          done(t.returned, x?.ref ?? "");
          onClose();
        }}
      />
    </>
  );
}
