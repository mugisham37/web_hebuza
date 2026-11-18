"use client";
// U5 Intake (/ops/intake), board 05 v1: IQ1 list + quick look, IQ2 duplicate compare/merge, IQ3 bulk triage + Undo,
// IQ4 empty + live "N new" banner, PI1 phone cards + full-screen quick-look sheet. Claim lock via useClaim (409).
import { errorCopy } from "@/lib/api/error-copy";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDate, formatMoney, formatRelative } from "@/shared/format";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import {
  useCase,
  useClaim,
  type CaseVM,
  type Flag,
} from "@/lib/ops/api";
import {
  useIntakeCases,
  useIntakePulse,
  useBulkStatus,
  useRevert,
  useDuplicates,
  useResolveDuplicate,
  useNow,
} from "@/lib/ops/a";
import { useShortcut } from "@/lib/ops/shortcuts";
import { ApiError } from "@/lib/api/client";
import { opsIntake } from "@/content/pages/ops-intake";
import { opsCommon } from "@/content/pages/ops-common";
import { Icon } from "@/components/atoms/icon";
import { Button } from "@/components/atoms/button";
import { Avatar } from "@/components/atoms/misc";
import { Skeleton, ErrorState } from "@/components/atoms/feedback";
import { Dialog } from "@/components/atoms/dialog";
import { useToast } from "@/components/atoms/toast";
import {
  FlagChip,
  PaymentChip,
  SlaChip,
  OpsStatus,
  LockLabel,
  Kbd,
} from "@/components/atoms/ops";
import {
  FilterBar,
  MenuButton,
  MenuCheck,
  SavedViewTabs,
  BulkBar,
  BulkAction,
  EmptyPanel,
  ReasonDialog,
  type FilterChip,
} from "@/components/molecules/ops/ops";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";

const ME = "Diane Mukamana"; // shortcut: session user name is not on the client session yet; read it from /api/auth/session when ops personas carry it.
const TABS = ["all", "urgent", "vip", "duplicates", "partner"] as const;
type Tab = (typeof TABS)[number];
const inTab = (x: CaseVM, tab: Tab) =>
  tab === "all" ||
  (tab === "urgent" && x.flags.includes("urgent")) ||
  (tab === "vip" &&
    (x.flags.includes("vip") || x.flags.includes("subscriber"))) ||
  (tab === "duplicates" && x.flags.includes("duplicate")) ||
  (tab === "partner" && (x.flags.includes("partner") || !!x.partner));
const list = (v: string | null) => (v ? v.split(",") : []);

export function IntakeView() {
  const { locale } = useI18n();
  const t = opsIntake(locale);
  const c = opsCommon(locale);
  const L = (p: string) => localHref(locale, p);
  const router = useRouter();
  const p = useUrlParams();
  const tab = (TABS as readonly string[]).includes(p.get("tab") ?? "")
    ? (p.get("tab") as Tab)
    : "all";
  const q = p.get("q") ?? "";
  const flags = list(p.get("flag")),
    svc = list(p.get("service")),
    pay = list(p.get("payment"));
  const sel = p.get("sel");
  const dup = p.get("dup");
  const now = useNow();
  const toast = useToast();

  const cases = useIntakeCases();
  const pulse = useIntakePulse();
  const bulk = useBulkStatus();
  const revert = useRevert();
  const claim = useClaim();
  const [selected, setSelected] = useState<string[]>([]);
  const [holdFor, setHoldFor] = useState<string[] | null>(null);

  const all = useMemo(() => cases.data ?? [], [cases.data]);
  const fresh =
    pulse.data && cases.data
      ? Math.max(0, pulse.data.received - all.length)
      : 0;
  const matches = (x: CaseVM) =>
    (!q ||
      `${x.ref} ${x.client} ${x.service}`
        .toLowerCase()
        .includes(q.toLowerCase())) &&
    (!flags.length || flags.some((f) => x.flags.includes(f as Flag))) &&
    (!svc.length || svc.includes(x.serviceSlug)) &&
    (!pay.length || pay.includes(x.payment));
  const filtered = all.filter(matches);
  const rows = filtered.filter((x) => inTab(x, tab));
  const current = rows.find((x) => x.ref === sel) ?? null;
  const services = [
    ...new Map(all.map((x) => [x.serviceSlug, x.service])).entries(),
  ];
  const scope = "Tax & Accounting"; // shortcut: mirrors the shell's scope select default; wire to its state when the shell exposes it.

  const setList = (k: string, v: string[]) =>
    setUrlParams({ [k]: v.join(",") || null });
  const chips: FilterChip[] = [
    ...flags.map((f) => ({
      key: `f${f}`,
      label: c.flags[f as Flag],
      onRemove: () =>
        setList(
          "flag",
          flags.filter((x) => x !== f),
        ),
    })),
    ...svc.map((s) => ({
      key: `s${s}`,
      label: services.find(([k]) => k === s)?.[1] ?? s,
      onRemove: () =>
        setList(
          "service",
          svc.filter((x) => x !== s),
        ),
    })),
    ...pay.map((s) => ({
      key: `p${s}`,
      label: (c.payment as Record<string, string>)[s] ?? s,
      onRemove: () =>
        setList(
          "payment",
          pay.filter((x) => x !== s),
        ),
    })),
  ];
  const multi = (
    key: string,
    label: string,
    cur: string[],
    opts: [string, string][],
  ) => (
    <MenuButton label={label} active={cur.length > 0}>
      {() =>
        opts.map(([v, l]) => (
          <MenuCheck
            key={v}
            checked={cur.includes(v)}
            onChange={(on) =>
              setList(key, on ? [...cur, v] : cur.filter((x) => x !== v))
            }
          >
            {l}
          </MenuCheck>
        ))
      }
    </MenuButton>
  );

  const errMsg = (e: unknown) => errorCopy(e, locale);
  /** Claim, then open triage. A 409 means another manager holds the lock. */
  const openTriage = (x: CaseVM) =>
    claim.mutate(
      { ref: x.ref },
      {
        onSuccess: () => router.push(L(`/ops/cases/${x.ref}?tab=triage`)),
        onError: (e) =>
          toast({
            tone: "danger",
            title:
              e instanceof ApiError && e.status === 409
                ? t.claimedBy.replace("{name}", x.claimedBy ?? "—")
                : errMsg(e),
          }),
      },
    );
  useShortcut(
    "h",
    c.shortcuts.hold,
    () => current && setHoldFor([current.ref]),
    "list",
    !!current,
  );

  const statusLabel = (s: keyof typeof c.status) => c.status[s];
  const bulkMove = async (
    refs: string[],
    status: "under_review" | "on_hold",
    reason?: string,
  ) => {
    const r = await bulk.mutateAsync({ refs, status, reason });
    setSelected((s) => s.filter((k) => !r.moved.includes(k)));
    if (r.moved.length)
      toast({
        tone: "success",
        title:
          r.moved.length === 1
            ? t.movedOne
                .replace("{ref}", r.moved[0])
                .replace("{status}", statusLabel(status))
            : t.moved
                .replace("{n}", String(r.moved.length))
                .replace("{status}", statusLabel(status)),
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
  };

  const cols: OpsColumn<CaseVM>[] = [
    {
      key: "ref",
      label: t.cols.ref,
      wrap: true,
      className: "min-w-36",
      sort: (r) => r.ref,
      cell: (r) => (
        <span className="grid gap-0.5">
          <span className="font-medium tabular">{r.ref}</span>
          {r.claimedBy && (
            <span className="inline-flex items-center gap-1 text-eyebrow text-warning">
              <Icon name="lock" size={11} aria-hidden />
              {r.claimedBy === ME
                ? t.yours
                : t.claimedBy.replace("{name}", r.claimedBy)}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "received",
      label: t.cols.received,
      sort: (r) => r.submittedAt,
      cell: (r) => (
        <span className="whitespace-nowrap tabular">
          {formatDate(r.submittedAt, locale, {
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
          })}
          {now && (
            <span className="text-fg-muted">
              {" "}
              · {formatRelative(r.submittedAt, locale, now)}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "client",
      label: t.cols.client,
      className: "min-w-48",
      sort: (r) => r.client,
      cell: (r) => (
        <span className="flex min-w-0 items-center gap-2">
          <Avatar name={r.client} size="sm" />
          <span className="grid min-w-0">
            <span className="truncate font-medium">{r.client}</span>
            <span className="text-eyebrow text-fg-subtle">
              {t.clientType[r.clientType]}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "service",
      label: t.cols.service,
      className: "min-w-44",
      sort: (r) => r.service,
      cell: (r) => <span className="line-clamp-2 min-w-32">{r.service}</span>,
    },
    {
      key: "flags",
      label: t.cols.flags,
      wrap: true,
      className: "min-w-52",
      cell: (r) => (
        <span className="flex max-w-64 flex-wrap gap-1">
          {r.flags.map((f) => (
            <FlagChip
              key={f}
              flag={f}
              detail={f === "partner" ? r.partner : null}
            />
          ))}
        </span>
      ),
    },
    {
      key: "completeness",
      label: t.cols.completeness,
      sort: (r) =>
        r.completeness ? r.completeness.done / r.completeness.total : 0,
      cell: (r) => <Meter c={r.completeness} label={t.items} />,
    },
    {
      key: "precheck",
      label: t.cols.precheck,
      card: false,
      cell: (r) =>
        r.precheck && (
          <span
            className="inline-flex items-center gap-2 text-eyebrow tabular"
            title={t.precheckSummary
              .replace("{ok}", String(r.precheck.ok))
              .replace("{warn}", String(r.precheck.warn))}
          >
            <span className="inline-flex items-center gap-0.5 text-success">
              <Icon name="check" size={12} aria-hidden />
              {r.precheck.ok}
            </span>
            {r.precheck.warn > 0 && (
              <span className="text-warning">⚠ {r.precheck.warn}</span>
            )}
            <span className="sr-only">
              {t.precheckSummary
                .replace("{ok}", String(r.precheck.ok))
                .replace("{warn}", String(r.precheck.warn))}
            </span>
          </span>
        ),
    },
    {
      key: "payment",
      label: t.cols.payment,
      sort: (r) => r.payment,
      cell: (r) => <PaymentChip status={r.payment} />,
    },
    {
      key: "sla",
      label: t.cols.sla,
      sort: (r) => r.firstResponseDueAt ?? "",
      cell: (r) => (
        <SlaChip
          due={r.firstResponseDueAt ?? r.dueAt}
          firstResponse={!!r.firstResponseDueAt}
        />
      ),
    },
    {
      key: "action",
      label: t.cols.action,
      align: "right",
      card: false,
      cell: (r) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            setUrlParams({ sel: r.ref });
          }}
        >
          {t.review}
        </Button>
      ),
    },
  ];

  const tabCounts = Object.fromEntries(
    TABS.map((k) => [k, filtered.filter((x) => inTab(x, k)).length]),
  );
  const one = selected.length === 1;
  const queue = (refs: string[]) =>
    refs.length > 1 ? `&queue=${refs.slice(1).join(",")}` : "";

  return (
    <div className="grid gap-4 pb-24 lg:pb-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-h2">
            {t.title}
            {cases.data && (
              <span className="bg-gold-400 px-2.5 py-0.5 text-label text-on-gold tabular">
                {t.countNew.replace("{n}", String(all.length))}
              </span>
            )}
          </h1>
          <p className="text-small text-fg-muted">
            {t.sub.replace("{scope}", scope)}
          </p>
        </div>
        <p className="hidden items-center gap-1.5 text-eyebrow text-fg-subtle lg:flex">
          <Kbd>J</Kbd>
          <Kbd>K</Kbd>
          <Kbd>↵</Kbd>
          <Kbd>X</Kbd>
          <span>{t.keys}</span>
        </p>
      </header>

      <SavedViewTabs
        views={TABS.map((k) => ({
          key: k,
          label: t.tabs[k],
          count: cases.data ? tabCounts[k] : undefined,
        }))}
        active={tab}
        onChange={(k) =>
          setUrlParams({ tab: k === "all" ? null : k, sel: null })
        }
      />
      <FilterBar
        search={q}
        onSearch={(v) => setUrlParams({ q: v || null })}
        placeholder={t.search}
        chips={chips}
        addFilter={
          <>
            {multi("flag", t.filters.flags, flags, Object.entries(c.flags))}
            {multi("service", t.filters.service, svc, services)}
            {multi(
              "payment",
              t.filters.payment,
              pay,
              Object.entries(c.payment),
            )}
          </>
        }
      />
      <p aria-live="polite" className="sr-only">
        {fresh ? t.newBanner.replace("{n}", String(fresh)) : ""}
      </p>

      <div
        className={cx(
          "grid min-w-0 gap-4",
          current && "lg:grid-cols-[minmax(0,1fr)_27.5rem]",
        )}
      >
        <OpsTable
          label={t.title}
          rows={rows}
          columns={cols}
          rowKey={(r) => r.ref}
          rowLabel={(r) => `${r.ref} ${r.client}`}
          loading={cases.isPending}
          error={cases.error}
          onRetry={() => cases.refetch()}
          selected={selected}
          onSelect={setSelected}
          focused={sel}
          onFocus={(k) => setUrlParams({ sel: k })}
          onOpen={openTriage}
          shortcuts
          cardAction="focus"
          sort={
            p.get("sort")
              ? {
                  key: p.get("sort")!.replace(/^-/, ""),
                  dir: p.get("sort")!.startsWith("-") ? "desc" : "asc",
                }
              : null
          }
          onSort={(s) =>
            setUrlParams({
              sort: s ? `${s.dir === "desc" ? "-" : ""}${s.key}` : null,
            })
          }
          rowTone={(r) => (r.claimedBy && r.claimedBy !== ME ? "muted" : null)}
          banner={
            fresh > 0 && (
              <div className="flex items-center justify-center gap-3 border-b border-border bg-gold-200 px-4 py-2 text-small">
                <Icon name="sparkle" size={14} aria-hidden />
                {t.newBanner.replace("{n}", String(fresh))}
                <button
                  type="button"
                  onClick={() => cases.refetch()}
                  className="font-medium underline underline-offset-4"
                >
                  {t.show}
                </button>
              </div>
            )
          }
          renderCard={(r) => (
            <>
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{r.client}</span>
                <span className="shrink-0 text-eyebrow text-fg-muted tabular">
                  {r.ref}
                </span>
              </span>
              <span className="text-small text-fg-muted">{r.service}</span>
              <span className="flex flex-wrap gap-1">
                {r.flags.map((f) => (
                  <FlagChip key={f} flag={f} />
                ))}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <Meter c={r.completeness} label={t.items} />
                <SlaChip
                  due={r.firstResponseDueAt ?? r.dueAt}
                  firstResponse={!!r.firstResponseDueAt}
                />
              </span>
              {r.claimedBy && r.claimedBy !== ME && (
                <span className="text-eyebrow text-warning">
                  {t.claimedBy.replace("{name}", r.claimedBy)}
                </span>
              )}
            </>
          )}
          empty={
            all.length ? (
              <EmptyPanel compact title={t.noMatch} body={t.noMatchBody} />
            ) : (
              <EmptyPanel title={c.empty.intake} body={t.emptyBody} />
            )
          }
        />
        {current && (
          <aside className="hidden lg:block">
            <div className="sticky top-4">
              <QuickLook
                x={current}
                onTriage={openTriage}
                onHold={() => setHoldFor([current.ref])}
                claimPending={claim.isPending}
              />
            </div>
          </aside>
        )}
      </div>

      {/* Phone/tablet: quick look as a full-screen bottom sheet */}
      <PhoneQuickLook
        x={current}
        onTriage={openTriage}
        onHold={() => current && setHoldFor([current.ref])}
        claimPending={claim.isPending}
      />

      <BulkBar count={selected.length} onClear={() => setSelected([])}>
        <BulkAction
          icon="user"
          onClick={() =>
            router.push(
              L(`/ops/assign/${selected[0]}?from=intake${queue(selected)}`),
            )
          }
        >
          {t.bulk.assign}
        </BulkAction>
        {one ? (
          <BulkAction
            icon="file"
            onClick={() =>
              router.push(L(`/ops/cases/${selected[0]}?tab=triage&request=1`))
            }
          >
            {t.bulk.request}
          </BulkAction>
        ) : (
          <span
            title={t.bulk.oneAtATime}
            className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 px-3 text-small opacity-50"
          >
            <Icon name="file" size={14} aria-hidden />
            {t.bulk.request}
            <span className="sr-only">— {t.bulk.oneAtATime}</span>
          </span>
        )}
        <BulkAction icon="clock" onClick={() => setHoldFor(selected)}>
          {t.bulk.hold}
        </BulkAction>
        <BulkAction
          icon="check"
          onClick={() => bulkMove(selected, "under_review")}
        >
          {t.bulk.review}
        </BulkAction>
      </BulkBar>

      <ReasonDialog
        open={!!holdFor}
        onClose={() => setHoldFor(null)}
        title={t.holdTitle}
        description={holdFor?.join(", ")}
        asRadios
        options={Object.entries(t.holdReasons).map(([value, label]) => ({
          value,
          label,
        }))}
        noteLabel={t.holdNote}
        confirmLabel={t.hold}
        audited
        onConfirm={async ({ reason, note }) => {
          const label =
            t.holdReasons[reason as keyof typeof t.holdReasons] ?? reason;
          await bulkMove(
            holdFor!,
            "on_hold",
            note ? `${label}: ${note}` : label,
          );
        }}
      />
      <DuplicateDialog
        refCode={dup}
        onClose={() => setUrlParams({ dup: null })}
      />
    </div>
  );
}

function Meter({ c, label }: { c: CaseVM["completeness"]; label: string }) {
  if (!c) return null;
  const pct = Math.round((c.done / c.total) * 100);
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span
        aria-hidden
        className="h-1.5 w-14 overflow-hidden bg-ink-100"
      >
        <span
          className={cx(
            "block h-full",
            pct === 100 ? "bg-success" : "bg-navy-700",
          )}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="text-eyebrow tabular">
        {label
          .replace("{done}", String(c.done))
          .replace("{total}", String(c.total))}
      </span>
    </span>
  );
}

type QLProps = {
  x: CaseVM;
  onTriage: (x: CaseVM) => void;
  onHold: () => void;
  claimPending: boolean;
};

function QuickLookBody({ x, onTriage, onHold, claimPending }: QLProps) {
  const { locale } = useI18n();
  const t = opsIntake(locale);
  const c = opsCommon(locale);
  const d = useCase(x.ref);
  const claim = useClaim();
  const toast = useToast();
  const lockedByOther = x.claimedBy && x.claimedBy !== ME;
  const info = d.data?.clientInfo;
  const fields: [string, string | null][] = [
    [t.fields.service, x.service],
    [t.fields.type, t.clientType[x.clientType]],
    [
      t.fields.submitted,
      formatDate(x.submittedAt, locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    ],
    [
      t.fields.amount,
      x.amount !== null ? formatMoney(x.amount, "RWF", locale) : null,
    ],
    [t.fields.partner, x.partner],
    [t.fields.language, info?.language?.toUpperCase() ?? null],
    [t.fields.past, info ? String(info.past) : null],
  ];
  return (
    <div className="grid gap-4">
      {lockedByOther && (
        <p
          role="status"
          className="flex items-center gap-2 bg-warning-bg px-3 py-2 text-small text-warning"
        >
          <Icon name="lock" size={14} aria-hidden />
          {t.claimedBy.replace("{name}", x.claimedBy!)}
        </p>
      )}
      {/* Client card */}
      <div className="flex items-center gap-3 bg-bg-subtle p-3">
        <Avatar name={x.client} />
        <div className="grid min-w-0 flex-1">
          <span className="truncate font-medium">{x.client}</span>
          <span className="text-eyebrow text-fg-muted">
            {info?.phone ?? x.clientPhone ?? ""}
          </span>
        </div>
        {(info?.phone ?? x.clientPhone) && (
          <a
            href={`tel:${(info?.phone ?? x.clientPhone)!.replace(/\s/g, "")}`}
            aria-label={t.call.replace("{name}", x.client)}
            className="flex size-10 items-center justify-center border border-border bg-white hover:border-navy-300"
          >
            <Icon name="phone" size={16} aria-hidden />
          </a>
        )}
        {info?.email && (
          <a
            href={`mailto:${info.email}`}
            aria-label={t.message.replace("{name}", x.client)}
            className="flex size-10 items-center justify-center border border-border bg-white hover:border-navy-300"
          >
            <Icon name="mail" size={16} aria-hidden />
          </a>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        <OpsStatus status={x.status} sub={x.subStatus} />
        {x.flags.map((f) => (
          <FlagChip
            key={f}
            flag={f}
            detail={f === "partner" ? x.partner : null}
          />
        ))}
      </div>
      <section className="grid gap-2">
        <h3 className="text-label">{t.answers}</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-small">
          {fields
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-fg-muted">{k}</dt>
                <dd className="min-w-0 truncate text-right">{v}</dd>
              </div>
            ))}
        </dl>
      </section>
      <section className="grid gap-2">
        <h3 className="flex items-center justify-between text-label">
          {t.documents}
          <Meter c={x.completeness} label={t.items} />
        </h3>
        {d.isPending ? (
          <Skeleton className="h-24" />
        ) : d.isError ? (
          <ErrorState error={d.error} onRetry={() => d.refetch()} />
        ) : (
          <ul className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {d.data.checklist.map((i) => (
              <li
                key={i.key}
                className={cx(
                  "grid w-28 shrink-0 gap-1 border p-2 text-eyebrow",
                  i.state === "missing"
                    ? "border-dashed border-danger/40 bg-danger-bg/40"
                    : i.state === "check"
                      ? "border-warning/40"
                      : "border-border",
                )}
              >
                <Icon
                  name={i.state === "missing" ? "x" : "file"}
                  size={16}
                  aria-hidden
                  className={
                    i.state === "missing" ? "text-danger" : "text-fg-muted"
                  }
                />
                <span className="line-clamp-2 text-fg">{i.label}</span>
                <span
                  className={
                    i.state === "missing"
                      ? "text-danger"
                      : i.state === "check"
                        ? "text-warning"
                        : "text-success"
                  }
                >
                  {t.docState[i.state as keyof typeof t.docState] ?? i.state}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {x.flags.includes("duplicate") && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setUrlParams({ dup: x.ref })}
        >
          <Icon name="layers" size={14} aria-hidden />
          {t.compare}
        </Button>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          className="sm:col-span-2"
          dots
          loading={claimPending}
          disabled={!!lockedByOther}
          onClick={() => onTriage(x)}
        >
          {t.openTriage}
        </Button>
        <Button
          variant="outline"
          loading={claim.isPending}
          disabled={!!x.claimedBy}
          onClick={() =>
            claim.mutate(
              { ref: x.ref },
              {
                onSuccess: () =>
                  toast({
                    tone: "success",
                    title: t.claimed.replace("{ref}", x.ref),
                  }),
                onError: (e) =>
                  toast({
                    tone: "danger",
                    title:
                      e instanceof ApiError && e.status === 409
                        ? t.claimedBy.replace("{name}", x.claimedBy ?? "—")
                        : errorCopy(e, locale),
                  }),
              },
            )
          }
        >
          {x.claimedBy === ME ? t.yours : t.claim}
        </Button>
        <Button variant="outline" disabled={!!lockedByOther} onClick={onHold}>
          {t.hold}
        </Button>
      </div>
      {lockedByOther && <LockLabel className="justify-self-center" />}
      <p className="sr-only">{c.shortcuts.hold}: H</p>
    </div>
  );
}

function QuickLook(p: QLProps) {
  const t = opsIntake(useI18n().locale);
  return (
    <section
      aria-label={t.quickLook}
      className="grid gap-3 border border-border bg-white p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-label-lg">
          {t.quickLook} · <span className="tabular">{p.x.ref}</span>
        </h2>
        <button
          type="button"
          onClick={() => setUrlParams({ sel: null })}
          aria-label={t.closeQuickLook}
          className="flex size-8 items-center justify-center hover:bg-navy-50"
        >
          <Icon name="x" size={16} aria-hidden />
        </button>
      </div>
      <QuickLookBody key={p.x.ref} {...p} />
    </section>
  );
}

/** Below lg the quick look is a full-height bottom sheet (PI1). Opens when a card is tapped. */
function PhoneQuickLook(p: Omit<QLProps, "x"> & { x: CaseVM | null }) {
  const t = opsIntake(useI18n().locale);
  const wide = useMedia("(min-width: 1024px)");
  return (
    <Dialog
      open={!!p.x && !wide}
      onClose={() => setUrlParams({ sel: null })}
      side="bottom"
      className="max-h-[92dvh]"
      title={`${t.quickLook} · ${p.x?.ref ?? ""}`}
    >
      {p.x && <QuickLookBody key={p.x.ref} {...p} x={p.x} />}
    </Dialog>
  );
}

function useMedia(q: string) {
  return useSyncExternalStore(
    (fn) => {
      const m = window.matchMedia(q);
      m.addEventListener("change", fn);
      return () => m.removeEventListener("change", fn);
    },
    () => window.matchMedia(q).matches,
    () => true,
  );
}

/** IQ2: side-by-side compare with merge / not a duplicate / reject as duplicate (all undoable). */
function DuplicateDialog({
  refCode,
  onClose,
}: {
  refCode: string | null;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const t = opsIntake(locale);
  const c = opsCommon(locale);
  const q = useDuplicates(refCode);
  const resolve = useResolveDuplicate();
  const revert = useRevert();
  const toast = useToast();
  const s = q.data?.source,
    m = q.data?.match;
  const rows: [string, (d: NonNullable<typeof s>) => string][] = [
    [t.dup.rows.client, (d) => d.client],
    [t.dup.rows.phone, (d) => d.phone],
    [t.dup.rows.service, (d) => d.service],
    [
      t.dup.rows.submitted,
      (d) => formatDate(d.submittedAt, locale, { dateStyle: "medium" }),
    ],
    [
      t.dup.rows.amount,
      (d) => (d.amount !== null ? formatMoney(d.amount, "RWF", locale) : "—"),
    ],
    [
      t.dup.rows.payment,
      (d) => (c.payment as Record<string, string>)[d.payment] ?? d.payment,
    ],
    [t.dup.rows.documents, (d) => String(d.documents)],
    [t.dup.rows.status, (d) => c.status[d.status]],
  ];
  const act = (action: "merge" | "dismiss" | "reject") =>
    resolve.mutate(
      { ref: refCode!, action, into: m?.ref },
      {
        onSuccess: () => {
          const msg =
            action === "merge"
              ? t.dup.merged
              : action === "dismiss"
                ? t.dup.dismissed
                : t.dup.rejected;
          toast({
            tone: "success",
            title: msg
              .replace("{ref}", refCode!)
              .replace("{into}", m?.ref ?? ""),
            action:
              action === "dismiss"
                ? undefined
                : { label: c.undo, onClick: () => revert.mutate([refCode!]) },
          });
          onClose();
        },
        onError: (e) => toast({ tone: "danger", title: errorCopy(e, locale) }),
      },
    );
  return (
    <Dialog
      open={!!refCode}
      onClose={onClose}
      title={t.dup.title}
      description={t.dup.sub}
      className="max-w-2xl"
      footer={
        q.data && (
          <div className="flex w-full flex-wrap justify-end gap-2">
            <Button
              variant="danger"
              size="sm"
              disabled={resolve.isPending}
              onClick={() => act("reject")}
            >
              {t.dup.reject}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={resolve.isPending}
              onClick={() => act("dismiss")}
            >
              {t.dup.dismiss}
            </Button>
            {m && (
              <Button
                size="sm"
                dots
                loading={
                  resolve.isPending && resolve.variables?.action === "merge"
                }
                onClick={() => act("merge")}
              >
                {t.dup.merge.replace("{ref}", m.ref)}
              </Button>
            )}
          </div>
        )
      }
    >
      {q.isPending ? (
        <Skeleton className="h-64" />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !m ? (
        <p className="text-small text-fg-muted">{t.dup.none}</p>
      ) : (
        <div
          className="overflow-x-auto"
          role="region"
          aria-label={t.dup.title}
          tabIndex={0}
        >
          <table className="w-full min-w-[28rem] text-small">
            <thead className="bg-ink-100 text-left text-eyebrow text-fg-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t.dup.field}
                </th>
                <th scope="col" className="px-3 py-2 font-medium tabular">
                  {s?.ref}
                </th>
                <th scope="col" className="px-3 py-2 font-medium tabular">
                  {m.ref}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  <span className="sr-only">{t.dup.match}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, f]) => {
                const same = f(s!) === f(m);
                return (
                  <tr
                    key={label}
                    className={cx(
                      "border-t border-border",
                      same && "bg-navy-50",
                    )}
                  >
                    <th
                      scope="row"
                      className="px-3 py-2 text-left font-normal text-fg-muted"
                    >
                      {label}
                    </th>
                    <td className="px-3 py-2">{f(s!)}</td>
                    <td className="px-3 py-2">{f(m)}</td>
                    <td className="px-3 py-2 text-eyebrow">
                      {same ? (
                        <span className="inline-flex items-center gap-1 text-link">
                          <Icon name="check" size={12} aria-hidden />
                          {t.dup.match}
                        </span>
                      ) : (
                        <span className="text-fg-subtle">{t.dup.differs}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Dialog>
  );
}
