"use client";
// U8 All cases (/ops/cases), board 08 v1: AC1 table + saved views + density/columns/export + inline expansion,
// AC2 institution grouping with Nudge, AC3 bulk change via commonMoves + export dialog, AC4 save view + column picker,
// PCS phone stacked cards + sort sheet. Every filter/view/sort/column lives in the URL (shareable).
import { errorCopy } from "@/lib/api/error-copy";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDate, formatMoney, formatRelative } from "@/shared/format";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { useCases, type CaseVM } from "@/lib/ops/api";
import { commonMoves, movesFor } from "@/shared/ops/transitions";
import type { CaseStatus } from "@/shared/domain/case-status";
import {
  CASE_VIEWS,
  inView,
  slaBucket,
  factsOf,
  toCsv,
  downloadCsv,
  useNow,
  useNudge,
  useRecentEvents,
  useBulkStatus,
  useRevert,
  useSavedViews,
  useSaveView,
  useDeleteView,
  type CaseView,
  type SlaBucket,
} from "@/lib/ops/a";
import { opsCases } from "@/content/pages/ops-cases";
import { opsCommon } from "@/content/pages/ops-common";
import { Icon } from "@/components/atoms/icon";
import { Button } from "@/components/atoms/button";
import { Avatar } from "@/components/atoms/misc";
import { Skeleton } from "@/components/atoms/feedback";
import { Dialog } from "@/components/atoms/dialog";
import { Switch } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { OpsStatus, SlaChip, PaymentChip, Kbd } from "@/components/atoms/ops";
import {
  FilterBar,
  MenuButton,
  MenuCheck,
  SavedViewTabs,
  BulkBar,
  BulkAction,
  DensityToggle,
  ColumnPicker,
  EmptyPanel,
  type FilterChip,
  type Density,
} from "@/components/molecules/ops/ops";
import {
  OpsTable,
  sortRows,
  type OpsColumn,
  type SortState,
} from "@/components/molecules/ops/ops-table";

const DEFAULT_COLS = [
  "ref",
  "client",
  "service",
  "status",
  "sla",
  "assignees",
  "institution",
  "amount",
  "payment",
  "created",
  "updated",
];
const INST_COLS = [
  "ref",
  "client",
  "submissionRef",
  "submitted",
  "expected",
  "waiting",
  "assignees",
  "action",
];
const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);
/** URL keys a saved view captures (selection and the open row are not part of a view). */
const VIEW_KEYS = [
  "view",
  "q",
  "status",
  "sla",
  "assignee",
  "service",
  "institution",
  "density",
  "cols",
  "sort",
];
const DAY = 86_400_000;

export function CasesView() {
  const { locale } = useI18n();
  const t = opsCases(locale);
  const c = opsCommon(locale);
  const L = (path: string) => localHref(locale, path); // not `p`: shadowing the outer `p` makes the React Compiler rename <p> tags to <p_0>
  const router = useRouter();
  const p = useUrlParams();
  const now = useNow();
  const toast = useToast();
  const cases = useCases();
  const views = useSavedViews();
  const del = useDeleteView();
  const nudge = useNudge();

  const view = (
    (CASE_VIEWS as readonly string[]).includes(p.get("view") ?? "")
      ? p.get("view")
      : "mine"
  ) as CaseView;
  const custom = p.get("v");
  const q = p.get("q") ?? "";
  const fStatus = list(p.get("status")),
    fSla = list(p.get("sla")),
    fAssignee = list(p.get("assignee")),
    fService = list(p.get("service")),
    fInst = p.get("institution");
  const density: Density =
    p.get("density") === "compact" ? "compact" : "comfortable";
  const grouped = view === "institution";
  const allKeys = grouped ? INST_COLS : DEFAULT_COLS;
  const visible = grouped
    ? INST_COLS
    : list(p.get("cols")).filter((k) => DEFAULT_COLS.includes(k));
  const shownCols = visible.length ? visible : allKeys;
  const order = [
    ...shownCols,
    ...allKeys.filter((k) => !shownCols.includes(k)),
  ];
  const sortParam = p.get("sort");
  const sort: SortState = sortParam
    ? {
        key: sortParam.replace(/^-/, ""),
        dir: sortParam.startsWith("-") ? "desc" : "asc",
      }
    : null;
  const expanded = p.get("open");

  const [selected, setSelected] = useState<string[]>([]);
  const [dialog, setDialog] = useState<
    null | "change" | "export" | "save" | "sort"
  >(null);

  const all = useMemo(() => cases.data?.cases ?? [], [cases.data]);
  const agents = [
    ...new Map(
      all.flatMap((x) => x.assignees.map((a) => [a.id, a.name] as const)),
    ).entries(),
  ];
  const services = [
    ...new Map(all.map((x) => [x.serviceSlug, x.service] as const)).entries(),
  ];
  const filtersMatch = (x: CaseVM) =>
    (!q ||
      `${x.ref} ${x.client} ${x.service} ${x.submissionRef ?? ""}`
        .toLowerCase()
        .includes(q.toLowerCase())) &&
    (!fStatus.length || fStatus.includes(x.status)) &&
    (!fSla.length ||
      (now !== null && fSla.includes(slaBucket(x, now) ?? ""))) &&
    (!fAssignee.length || x.assignees.some((a) => fAssignee.includes(a.id))) &&
    (!fService.length || fService.includes(x.serviceSlug)) &&
    (!fInst || x.institution === fInst);
  const base = all.filter(filtersMatch);
  const rows = base.filter((x) => inView(x, view, now));
  const counts = Object.fromEntries(
    CASE_VIEWS.map((v) => [v, base.filter((x) => inView(x, v, now)).length]),
  );

  // Open the user's default saved view when the page is opened bare.
  const def = views.data?.views.find((v) => v.isDefault);
  useEffect(() => {
    if (def && !window.location.search) applyQuery(def.query, def.id);
  }, [def]);

  const setList = (k: string, v: string[]) =>
    setUrlParams({ [k]: v.join(",") || null });
  const statusOpts = Object.entries(c.status) as [CaseStatus, string][];
  const chips: FilterChip[] = [
    ...fStatus.map((s) => ({
      key: `st${s}`,
      label: c.status[s as CaseStatus] ?? s,
      onRemove: () =>
        setList(
          "status",
          fStatus.filter((x) => x !== s),
        ),
    })),
    ...fSla.map((s) => ({
      key: `sl${s}`,
      label: t.slaStates[s as SlaBucket] ?? s,
      onRemove: () =>
        setList(
          "sla",
          fSla.filter((x) => x !== s),
        ),
    })),
    ...fAssignee.map((s) => ({
      key: `a${s}`,
      label: agents.find(([k]) => k === s)?.[1] ?? s,
      onRemove: () =>
        setList(
          "assignee",
          fAssignee.filter((x) => x !== s),
        ),
    })),
    ...fService.map((s) => ({
      key: `sv${s}`,
      label: services.find(([k]) => k === s)?.[1] ?? s,
      onRemove: () =>
        setList(
          "service",
          fService.filter((x) => x !== s),
        ),
    })),
    ...(fInst
      ? [
          {
            key: "inst",
            label: fInst,
            onRemove: () => setUrlParams({ institution: null }),
          },
        ]
      : []),
  ];
  const multi = (
    key: string,
    label: string,
    cur: string[],
    opts: readonly (readonly [string, string])[],
  ) => (
    <MenuButton label={label} active={cur.length > 0}>
      {() => (
        <div className="grid max-h-80 overflow-auto">
          {opts.map(([v, l]) => (
            <MenuCheck
              key={v}
              checked={cur.includes(v)}
              onChange={(on) =>
                setList(key, on ? [...cur, v] : cur.filter((x) => x !== v))
              }
            >
              {l}
            </MenuCheck>
          ))}
        </div>
      )}
    </MenuButton>
  );

  const nudgeBtn = (r: CaseVM, label = t.nudgeAgent) =>
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
        {label}
      </Button>
    ) : null;
  const lateExpectation = (r: CaseVM) =>
    !!(now && r.expectedDecision && Date.parse(r.expectedDecision) < now);

  const columns: OpsColumn<CaseVM>[] = [
    {
      key: "ref",
      label: t.cols.ref,
      className: "min-w-32",
      sort: (r) => r.ref,
      cell: (r) => (
        <Link
          href={L(`/ops/cases/${r.ref}`)}
          onClick={(e) => e.stopPropagation()}
          className="font-medium whitespace-nowrap tabular hover:underline"
        >
          {r.ref}
        </Link>
      ),
    },
    {
      key: "client",
      label: t.cols.client,
      className: "min-w-48",
      sort: (r) => r.client,
      cell: (r) => <span className="line-clamp-1 min-w-28">{r.client}</span>,
    },
    {
      key: "service",
      label: t.cols.service,
      className: "min-w-44",
      sort: (r) => r.service,
      cell: (r) => <span className="line-clamp-1 min-w-32">{r.service}</span>,
    },
    {
      key: "status",
      label: t.cols.status,
      sort: (r) => r.status,
      cell: (r) => <OpsStatus status={r.status} sub={r.subStatus} />,
    },
    {
      key: "sla",
      label: t.cols.sla,
      sort: (r) => r.dueAt ?? "~",
      cell: (r) => (
        <SlaChip
          due={r.dueAt}
          paused={slaBucket(r, now ?? 0) === "paused"}
          done={[
            "completed_delivered",
            "cancelled",
            "rejected",
            "refunded",
          ].includes(r.status)}
        />
      ),
    },
    {
      key: "assignees",
      label: t.cols.assignees,
      sort: (r) => r.assignees[0]?.name ?? "~",
      cell: (r) =>
        r.assignees.length ? (
          <span
            className="flex items-center -space-x-2"
            title={r.assignees
              .map((a) => `${a.name} (${c.role[a.role]})`)
              .join(", ")}
          >
            {r.assignees.map((a) => (
              <Avatar key={a.id} name={a.name} size="sm" />
            ))}
            <span className="sr-only">
              {r.assignees
                .map((a) => `${a.name} (${c.role[a.role]})`)
                .join(", ")}
            </span>
          </span>
        ) : (
          <span className="text-fg-subtle">{t.unassigned}</span>
        ),
    },
    {
      key: "institution",
      label: t.cols.institution,
      sort: (r) => r.institution ?? "~",
      cell: (r) =>
        r.institution && (
          <span className="inline-flex h-6 items-center gap-1 bg-ink-100 px-2 text-eyebrow">
            <Icon name="building" size={12} aria-hidden />
            {r.institution}
          </span>
        ),
    },
    {
      key: "amount",
      label: t.cols.amount,
      align: "right",
      sort: (r) => r.amount ?? -1,
      cell: (r) =>
        r.amount !== null ? (
          <span className="whitespace-nowrap">
            {formatMoney(r.amount, "RWF", locale)}
          </span>
        ) : (
          ""
        ),
    },
    {
      key: "payment",
      label: t.cols.payment,
      sort: (r) => r.payment,
      cell: (r) => <PaymentChip status={r.payment} />,
    },
    {
      key: "created",
      label: t.cols.created,
      sort: (r) => r.submittedAt,
      card: false,
      cell: (r) => (
        <span className="whitespace-nowrap text-fg-muted">
          {formatDate(r.submittedAt, locale, {
            day: "numeric",
            month: "short",
          })}
        </span>
      ),
    },
    {
      key: "updated",
      label: t.cols.updated,
      sort: (r) => r.updatedAt,
      cell: (r) => (
        <span className="whitespace-nowrap text-fg-muted">
          {now ? formatRelative(r.updatedAt, locale, now) : ""}
        </span>
      ),
    },
    // institution view (AC2)
    {
      key: "submissionRef",
      label: t.cols.submissionRef,
      sort: (r) => r.submissionRef ?? "",
      cell: (r) => <span className="tabular">{r.submissionRef ?? ""}</span>,
    },
    {
      key: "submitted",
      label: t.cols.submitted,
      sort: (r) => r.updatedAt,
      cell: (r) => (
        <span className="whitespace-nowrap">
          {formatDate(r.updatedAt, locale, { day: "numeric", month: "short" })}
        </span>
      ),
    },
    {
      key: "expected",
      label: t.cols.expected,
      sort: (r) => r.expectedDecision ?? "~",
      cell: (r) =>
        r.expectedDecision ? (
          <span
            className={cx(
              "inline-flex items-center gap-1 whitespace-nowrap",
              lateExpectation(r) && "font-medium text-danger",
            )}
          >
            {lateExpectation(r) && <Icon name="clock" size={12} aria-hidden />}
            {formatDate(r.expectedDecision, locale, {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
            {lateExpectation(r) && (
              <span className="text-eyebrow">· {t.late}</span>
            )}
          </span>
        ) : (
          ""
        ),
    },
    {
      key: "waiting",
      label: t.cols.waiting,
      align: "right",
      sort: (r) => r.updatedAt,
      cell: (r) =>
        now
          ? t.daysN.replace(
              "{n}",
              String(
                Math.max(0, Math.floor((now - Date.parse(r.updatedAt)) / DAY)),
              ),
            )
          : "",
    },
    {
      key: "action",
      label: t.cols.action,
      align: "right",
      card: false,
      cell: (r) => nudgeBtn(r),
    },
  ];

  const sorted = sortRows(rows, columns, sort);
  const selectedRows = all.filter((x) => selected.includes(x.ref));

  function applyQuery(query: string, id: string) {
    const next = new URLSearchParams(query);
    setUrlParams({
      ...Object.fromEntries(VIEW_KEYS.map((k) => [k, next.get(k)])),
      v: id,
      open: null,
    });
    setSelected([]);
  }
  const savedTabs = (views.data?.views ?? []).map((v) => ({
    key: `v:${v.id}`,
    label: v.shared ? `${v.name} · ${t.shared}` : v.name,
  }));
  const activeTab = custom ? `v:${custom}` : view;
  const customView = views.data?.views.find((v) => v.id === custom);

  return (
    <div className="grid gap-4 pb-24 lg:pb-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="flex items-center gap-3 text-h2">
          {t.title}
          {cases.data && (
            <span className="bg-ink-100 px-2.5 py-0.5 text-label tabular">
              {cases.data.total}
            </span>
          )}
        </h1>
        <p className="hidden items-center gap-1.5 text-eyebrow text-fg-subtle lg:flex">
          <Kbd>J</Kbd>
          <Kbd>K</Kbd>
          <Kbd>↵</Kbd>
          <Kbd>X</Kbd>
          <span>{t.keys}</span>
        </p>
      </header>

      <SavedViewTabs
        views={[
          ...CASE_VIEWS.map((k) => ({
            key: k,
            label: t.views[k],
            count: cases.data ? counts[k] : undefined,
          })),
          ...savedTabs,
        ]}
        active={activeTab}
        onChange={(k) => {
          if (k.startsWith("v:")) {
            const v = views.data?.views.find((x) => `v:${x.id}` === k);
            if (v) applyQuery(v.query, v.id);
          } else {
            setUrlParams({
              view: k === "mine" ? null : k,
              v: null,
              open: null,
              cols: k === "institution" ? null : p.get("cols"),
            });
            setSelected([]);
          }
        }}
        extra={
          <button data-guide="ops-save-view"
            type="button"
            onClick={() => setDialog("save")}
            className="-mb-px inline-flex h-10 shrink-0 items-center px-3 text-small whitespace-nowrap text-link hover:underline"
          >
            {t.saveView}
          </button>
        }
      />
      {customView && (
        <p className="flex items-center gap-2 text-small text-fg-muted">
          {customView.name}
          <button
            type="button"
            aria-label={t.deleteView.replace("{name}", customView.name)}
            onClick={() =>
              del.mutate(customView.id, {
                onSuccess: () => {
                  setUrlParams({ v: null });
                  toast({ title: t.deleted });
                },
                onError: (e) => toast({ tone: "danger", title: errorCopy(e, locale) }),
              })
            }
            className="flex size-7 items-center justify-center hover:bg-navy-50"
          >
            <Icon name="x" size={14} aria-hidden />
          </button>
        </p>
      )}

      <FilterBar
        search={q}
        onSearch={(v) => setUrlParams({ q: v || null })}
        placeholder={t.search}
        chips={chips}
        addFilter={
          <>
            {multi("status", t.filters.status, fStatus, statusOpts)}
            {multi("sla", t.filters.sla, fSla, Object.entries(t.slaStates))}
            {multi("assignee", t.filters.assignee, fAssignee, agents)}
            {multi("service", t.filters.service, fService, services)}
          </>
        }
      />
      {/* Own wrapping row: FilterBar's `right` slot does not wrap and overflowed at 360px. */}
      <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDialog("sort")}
              className="inline-flex h-8 items-center gap-1.5 border border-border-strong bg-white px-3 text-small md:hidden"
            >
              <Icon name="menu" size={14} aria-hidden />
              {t.sort}
            </button>
            <DensityToggle
              value={density}
              onChange={(d) =>
                setUrlParams({ density: d === "compact" ? "compact" : null })
              }
            />
            {!grouped && (
              <ColumnPicker
                columns={DEFAULT_COLS.map((k) => ({
                  key: k,
                  label: t.cols[k as keyof typeof t.cols],
                  locked: k === "ref",
                }))}
                visible={shownCols}
                order={order}
                onChange={(vis, ord) => {
                  const next = ord.filter((k) => vis.includes(k));
                  setUrlParams({
                    cols:
                      next.join(",") === DEFAULT_COLS.join(",")
                        ? null
                        : next.join(","),
                  });
                }}
              />
            )}
            <Button data-guide="ops-export"
              size="sm"
              variant="outline"
              onClick={() => setDialog("export")}
            >
              <Icon name="upload" size={14} aria-hidden />
              {c.export}
            </Button>
      </div>

      <OpsTable
        label={t.title}
        rows={sorted}
        columns={columns}
        rowKey={(r) => r.ref}
        rowLabel={(r) => `${r.ref} ${r.client}`}
        loading={cases.isPending}
        error={cases.error}
        onRetry={() => cases.refetch()}
        selected={selected}
        onSelect={setSelected}
        density={density}
        visible={shownCols}
        order={order}
        sort={sort}
        onSort={(s) =>
          setUrlParams({
            sort: s ? `${s.dir === "desc" ? "-" : ""}${s.key}` : null,
          })
        }
        focused={p.get("focus")}
        onFocus={(k) => setUrlParams({ focus: k })}
        onOpen={(r) => router.push(L(`/ops/cases/${r.ref}`))}
        shortcuts
        expanded={grouped ? undefined : expanded}
        onExpand={(k) => setUrlParams({ open: k })}
        renderExpanded={
          grouped
            ? undefined
            : (r) => <RowDetail x={r} nudge={nudgeBtn(r, t.nudgeAgent)} />
        }
        groupBy={grouped ? (r) => r.institution ?? t.noInstitution : undefined}
        groupHeader={(g, rs) => {
          const next = rs
            .map((r) => r.expectedDecision)
            .filter((d): d is string => !!d)
            .sort()[0];
          return (
            <span className="flex flex-wrap items-center gap-x-2">
              <Icon name="building" size={14} aria-hidden />
              {t.group.replace("{name}", g).replace("{n}", String(rs.length))}
              {next && (
                <span className="font-normal text-fg-muted">
                  ·{" "}
                  {t.groupNext.replace(
                    "{d}",
                    formatDate(next, locale, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    }),
                  )}
                </span>
              )}
            </span>
          );
        }}
        rowTone={(r) => (grouped && lateExpectation(r) ? "danger" : null)}
        renderCard={(r) => (
          <>
            <span className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{r.client}</span>
              <span className="shrink-0 text-eyebrow text-fg-muted tabular">
                {r.ref}
              </span>
            </span>
            <span className="text-small text-fg-muted">
              {r.service}
              {r.assignees[0] && ` · ${r.assignees[0].name}`}
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <OpsStatus status={r.status} />
              <SlaChip
                due={r.dueAt}
                paused={slaBucket(r, now ?? 0) === "paused"}
              />
            </span>
          </>
        )}
        empty={<EmptyPanel compact title={t.empty} body={t.emptyBody} />}
      />

      <BulkBar count={selected.length} onClear={() => setSelected([])}>
        <BulkAction icon="refresh" onClick={() => setDialog("change")}>
          {t.bulk.change}
        </BulkAction>
        <BulkAction icon="upload" onClick={() => setDialog("export")}>
          {t.bulk.export}
        </BulkAction>
      </BulkBar>

      <BulkChangeDialog
        open={dialog === "change"}
        onClose={() => setDialog(null)}
        rows={selectedRows}
        onDeselect={(refs) =>
          setSelected((s) => s.filter((k) => !refs.includes(k)))
        }
        onDone={(moved) =>
          setSelected((s) => s.filter((k) => !moved.includes(k)))
        }
      />
      <ExportDialog
        open={dialog === "export"}
        onClose={() => setDialog(null)}
        rows={
          selected.length
            ? sorted.filter((x) => selected.includes(x.ref))
            : sorted
        }
        columns={DEFAULT_COLS}
        initial={shownCols.filter((k) => DEFAULT_COLS.includes(k))}
      />
      <SaveViewDialog
        open={dialog === "save"}
        onClose={() => setDialog(null)}
        query={() => {
          const s = new URLSearchParams(window.location.search);
          return new URLSearchParams(
            VIEW_KEYS.flatMap((k) => (s.get(k) ? [[k, s.get(k)!]] : [])),
          ).toString();
        }}
        onSaved={(id) => setUrlParams({ v: id })}
      />
      <SortSheet
        open={dialog === "sort"}
        onClose={() => setDialog(null)}
        sort={sortParam}
      />
    </div>
  );
}

/** AC1 inline expansion: last 3 events + quick actions. */
function RowDetail({ x, nudge }: { x: CaseVM; nudge: React.ReactNode }) {
  const { locale } = useI18n();
  const t = opsCases(locale);
  const c = opsCommon(locale);
  const L = (p: string) => localHref(locale, p);
  const ev = useRecentEvents(x.ref);
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
      <section className="grid gap-2">
        <h3 className="text-eyebrow text-fg-muted uppercase">{t.lastEvents}</h3>
        {ev.isPending ? (
          <Skeleton className="h-16" />
        ) : ev.isError ? (
          <p
            role="alert"
            className="flex items-center gap-2 text-small text-danger"
          >
            {c.loadFailed.replace("{what}", t.lastEvents)}
            <button
              type="button"
              onClick={() => ev.refetch()}
              className="underline underline-offset-4"
            >
              {c.retry}
            </button>
          </p>
        ) : !ev.data.events.length ? (
          <p className="text-small text-fg-muted">{t.noEvents}</p>
        ) : (
          <ol className="grid gap-1.5">
            {ev.data.events.map((e, i) => (
              <li
                key={i}
                className="flex flex-wrap items-baseline gap-x-2 text-small"
              >
                <span className="font-medium">
                  {(t.event[e.code as keyof typeof t.event] ?? e.code).replace(
                    "{s}",
                    e.status ? c.status[e.status] : "",
                  )}
                </span>
                <span className="text-fg-muted">· {e.actor}</span>
                <time className="text-eyebrow text-fg-subtle tabular">
                  {formatDate(e.at, locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
      <div className="flex flex-wrap gap-2">
        <Link
          href={L(`/ops/cases/${x.ref}`)}
          className="inline-flex h-9 items-center bg-secondary px-4 text-small font-medium text-on-secondary hover:bg-secondary-hover"
        >
          {t.open}
        </Link>
        <Link
          href={L(`/ops/assign/${x.ref}`)}
          className="inline-flex h-9 items-center border border-border-strong px-4 text-small font-medium hover:bg-navy-50"
        >
          {t.assign}
        </Link>
        {nudge}
      </div>
    </div>
  );
}

/** AC3: only statuses every selected case can reach are enabled; blocked ones explain how many can't and why. */
function BulkChangeDialog({
  open,
  onClose,
  rows,
  onDeselect,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  rows: CaseVM[];
  onDeselect: (refs: string[]) => void;
  onDone: (moved: string[]) => void;
}) {
  const { locale } = useI18n();
  const t = opsCases(locale);
  const c = opsCommon(locale);
  const bulk = useBulkStatus();
  const revert = useRevert();
  const toast = useToast();
  const [to, setTo] = useState<CaseStatus | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const facts = rows.map(factsOf);
  const { allowed, blockedCount } = commonMoves(facts);
  const options = [...allowed, ...(Object.keys(blockedCount) as CaseStatus[])];
  // A move needs a reason when any selected case's rule says so (hold, reject, cancel, send back…).
  const moveOf = (r: CaseVM, to: CaseStatus) => movesFor(factsOf(r)).find((m) => m.to === to);
  const needsReason = !!to && rows.some((r) => moveOf(r, to)?.reason);
  const why = (s: CaseStatus) => {
    const blockers = rows.filter((r) => { const m = moveOf(r, s); return !m || !!m.blocked; });
    const g = blockers[0] && moveOf(blockers[0], s)?.blocked;
    const text = !blockers[0] ? "" : g ? (c.guard[g as keyof typeof c.guard] ?? g) : t.change.notFrom.replace("{s}", c.status[blockers[0].status]);
    return { blockers, text };
  };
  const close = () => {
    setTo(null);
    setReason("");
    setNote("");
    setErr(null);
    onClose();
  };
  const submit = async () => {
    if (!to) return;
    if (needsReason && !reason) return setErr(t.change.reasonRequired);
    const label = t.change.reasons[reason as keyof typeof t.change.reasons];
    const r = await bulk.mutateAsync({
      refs: rows.map((x) => x.ref),
      status: to,
      reason: needsReason ? (note ? `${label}: ${note}` : label) : undefined,
    });
    onDone(r.moved);
    if (r.moved.length)
      toast({
        tone: "success",
        title: t.moved
          .replace("{n}", String(r.moved.length))
          .replace("{s}", c.status[to]),
        action: {
          label: c.undo,
          onClick: () =>
            revert.mutate(r.moved, {
              onSuccess: () => toast({ title: t.undone }),
            }),
        },
      });
    if (r.failed.length)
      toast({
        tone: "danger",
        title: t.failed.replace("{n}", String(r.failed.length)),
      });
    close();
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title={t.change.title.replace("{n}", String(rows.length))}
      description={t.change.sub}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {t.cancel}
          </Button>
          <Button
            dots
            disabled={!to || !allowed.includes(to)}
            loading={bulk.isPending}
            onClick={submit}
          >
            {t.change.confirm.replace("{n}", String(rows.length))}
          </Button>
        </>
      }
    >
      {!options.length ? (
        <p className="text-small text-fg-muted">{t.change.none}</p>
      ) : (
        <fieldset className="grid gap-2">
          <legend className="sr-only">{t.bulk.change}</legend>
          {options.map((s) => {
            const blocked = !allowed.includes(s);
            const w = blocked ? why(s) : null;
            return (
              <div key={s} className="grid gap-1">
                <label
                  className={cx(
                    "flex items-center gap-3 border px-3.5 py-2.5 text-small",
                    blocked
                      ? "cursor-not-allowed border-border bg-bg-subtle text-fg-subtle"
                      : to === s
                        ? "border-navy-700 bg-bg-tint"
                        : "cursor-pointer border-border hover:border-navy-300",
                  )}
                >
                  <input
                    type="radio"
                    name="bulk-to"
                    disabled={blocked}
                    checked={to === s}
                    onChange={() => setTo(s)}
                    aria-describedby={blocked ? `why-${s}` : undefined}
                    className="size-4 accent-navy-700"
                  />
                  {blocked && <Icon name="lock" size={14} aria-hidden />}
                  {c.status[s]}
                </label>
                {w && (
                  <p
                    id={`why-${s}`}
                    className="flex flex-wrap items-center gap-x-2 pl-3 text-eyebrow text-warning"
                  >
                    {t.change.cant
                      .replace("{n}", String(w.blockers.length))
                      .replace("{s}", c.status[s])
                      .replace("{why}", w.text)}
                    {w.blockers.length < rows.length && (
                      <button
                        type="button"
                        onClick={() => onDeselect(w.blockers.map((b) => b.ref))}
                        className="font-medium underline underline-offset-4"
                      >
                        {t.change.keepMovable}
                      </button>
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </fieldset>
      )}
      {needsReason && (
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1.5">
            <span className="text-label">
              {t.change.reason}{" "}
              <span aria-hidden className="text-danger">
                *
              </span>
            </span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={!!err || undefined}
              className="h-11 border border-border-strong bg-white px-3 text-body"
            >
              <option value="" disabled>

              </option>
              {Object.entries(t.change.reasons).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-label">{t.change.note}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={1000}
              className="border border-border-strong bg-white px-3 py-2 text-body"
            />
          </label>
        </div>
      )}
      {err && (
        <p role="alert" className="mt-2 text-small font-medium text-danger">
          {err}
        </p>
      )}
      <p className="mt-4 flex items-center gap-1.5 text-eyebrow text-fg-subtle">
        <Icon name="shield" size={12} aria-hidden />
        {c.auditNote}
      </p>
    </Dialog>
  );
}

/** AC3 export: columns, created-date range, CSV of the current filter (or the selection). */
function ExportDialog({
  open,
  onClose,
  rows,
  columns,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  rows: CaseVM[];
  columns: string[];
  initial: string[];
}) {
  const { locale } = useI18n();
  const t = opsCases(locale);
  const c = opsCommon(locale);
  const toast = useToast();
  const [cols, setCols] = useState<string[] | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const chosen = cols ?? initial;
  const inRange = rows.filter((r) => {
    const d = r.submittedAt.slice(0, 10);
    return (!from || d >= from) && (!to || d <= to);
  });
  const value = (r: CaseVM, k: string): string | number | null =>
    ({
      ref: r.ref,
      client: r.client,
      service: r.service,
      status: c.status[r.status],
      sla: r.dueAt,
      assignees: r.assignees.map((a) => a.name).join("; "),
      institution: r.institution,
      amount: r.amount,
      payment: (c.payment as Record<string, string>)[r.payment] ?? r.payment,
      created: r.submittedAt,
      updated: r.updatedAt,
    })[k] ?? null;
  const close = () => {
    setCols(null);
    onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title={t.export.title}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {t.cancel}
          </Button>
          <Button
            dots
            disabled={!inRange.length || !chosen.length}
            onClick={() => {
              const keys = columns.filter((k) => chosen.includes(k));
              downloadCsv(
                `hebuza-cases-${new Date().toISOString().slice(0, 10)}`,
                toCsv(
                  keys.map((k) => t.cols[k as keyof typeof t.cols]),
                  inRange.map((r) => keys.map((k) => value(r, k))),
                ),
              );
              toast({
                tone: "success",
                title: t.export.done.replace("{n}", String(inRange.length)),
              });
              close();
            }}
          >
            {inRange.length
              ? t.export.go.replace("{n}", String(inRange.length))
              : t.export.nothing}
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        <fieldset className="grid gap-1">
          <legend className="mb-1 text-label">{t.export.columns}</legend>
          <div className="grid grid-cols-2 gap-x-2">
            {columns.map((k) => (
              <MenuCheck
                key={k}
                checked={chosen.includes(k)}
                onChange={(on) =>
                  setCols(on ? [...chosen, k] : chosen.filter((x) => x !== k))
                }
              >
                {t.cols[k as keyof typeof t.cols]}
              </MenuCheck>
            ))}
          </div>
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-label">{t.export.range}</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-small">
              {t.export.from}
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                className="h-11 border border-border-strong bg-white px-3"
              />
            </label>
            <label className="grid gap-1 text-small">
              {t.export.to}
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                className="h-11 border border-border-strong bg-white px-3"
              />
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1 text-label">{t.export.format}</legend>
          <label className="flex items-center gap-2 text-small">
            <input
              type="radio"
              checked
              readOnly
              className="size-4 accent-navy-700"
            />
            {t.export.csv}
          </label>
        </fieldset>
      </div>
    </Dialog>
  );
}

/** AC4 save view: name, share with team, set as default. Persisted per user (ops_records kind=view). */
function SaveViewDialog({
  open,
  onClose,
  query,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  query: () => string;
  onSaved: (id: string) => void;
}) {
  const { locale } = useI18n();
  const t = opsCases(locale);
  const save = useSaveView();
  const toast = useToast();
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  const [isDefault, setDefault] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const close = () => {
    setName("");
    setShared(false);
    setDefault(false);
    setErr(null);
    onClose();
  };
  const submit = () => {
    if (!name.trim()) return setErr(t.save.nameRequired);
    save.mutate(
      { name: name.trim(), query: query(), shared, isDefault },
      {
        onSuccess: (v) => {
          toast({
            tone: "success",
            title: t.save.saved.replace("{name}", v.name),
          });
          onSaved(v.id);
          close();
        },
        onError: (e) => setErr(errorCopy(e, locale)),
      },
    );
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title={t.save.title}
      description={t.save.what}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {t.cancel}
          </Button>
          <Button dots loading={save.isPending} onClick={submit}>
            {t.save.confirm}
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="grid gap-1.5">
          <span className="text-label">{t.save.name}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.save.namePh}
            maxLength={60}
            aria-invalid={!!err || undefined}
            aria-describedby={err ? "save-view-err" : undefined}
            className="h-11 border border-border-strong bg-white px-3 text-body focus:border-navy-700 focus:ring-3 focus:ring-gold-400/45 hover:border-ink-400 focus:outline-none"
          />
        </label>
        {err && (
          <p
            id="save-view-err"
            role="alert"
            className="text-small font-medium text-danger"
          >
            {err}
          </p>
        )}
        <Switch
          label={t.save.share}
          checked={shared}
          onChange={(e) => setShared(e.target.checked)}
        />
        <Switch
          label={t.save.def}
          checked={isDefault}
          onChange={(e) => setDefault(e.target.checked)}
        />
      </form>
    </Dialog>
  );
}

/** PCS phone sort sheet. */
function SortSheet({
  open,
  onClose,
  sort,
}: {
  open: boolean;
  onClose: () => void;
  sort: string | null;
}) {
  const t = opsCases(useI18n().locale);
  const opts: [keyof typeof t.sortOptions, string][] = [
    ["updated", "-updated"],
    ["sla", "sla"],
    ["created", "-created"],
    ["amount", "-amount"],
  ];
  return (
    <Dialog
      open={open}
      onClose={onClose}
      side="bottom"
      className=""
      title={t.sortBy}
    >
      <fieldset className="grid gap-1">
        <legend className="sr-only">{t.sortBy}</legend>
        {opts.map(([k, v]) => (
          <label
            key={k}
            className="flex h-12 items-center gap-3 px-3 text-body hover:bg-navy-50"
          >
            <input
              type="radio"
              name="sort"
              checked={sort === v}
              onChange={() => {
                setUrlParams({ sort: v });
                onClose();
              }}
              className="size-5 accent-navy-700"
            />
            {t.sortOptions[k]}
          </label>
        ))}
      </fieldset>
    </Dialog>
  );
}
