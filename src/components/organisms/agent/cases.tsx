"use client";
import { useWs } from "@/lib/agent/ws";
// U5 My cases (/agent/cases): saved views + search + due sort in the URL (?view&q&sort&focus), OpsTable (J/K/Enter,
// phone cards under 768), row → workbench on the contextual tab. Empty state per view and per search.
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { fill } from "@/content/pages/agent-common";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { useMyCases, type AgentCaseVM } from "@/lib/agent/api";
import { rowAction, ACTION_TAB } from "@/shared/agent/core";
import { CASE_VIEWS, inCaseView, type CaseView } from "@/lib/agent/a";
import { Button } from "@/components/atoms/button";
import { OpsStatus, SlaChip } from "@/components/atoms/ops";
import {
  FilterBar,
  SavedViewTabs,
  EmptyPanel,
} from "@/components/molecules/ops/ops";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { useA, useNow, PageHead } from "@/components/atoms/agent";
import { useT } from "@/components/organisms/agent/today";

const PAUSED = new Set([
  "awaiting_client_documents",
  "awaiting_external_institution",
  "awaiting_internal_review",
]);

/** `title`/`sub` let /work relabel it "Jobs" (Stage 8). */
export function CasesView({ title, sub }: { title?: string; sub?: string } = {}) {
  const t = useT();
  const a = useA();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const router = useRouter();
  const p = useUrlParams();
  const now = useNow();
  const q = useMyCases();
  const view = (CASE_VIEWS as readonly string[]).includes(p.get("view") ?? "")
    ? (p.get("view") as CaseView)
    : "all";
  const search = p.get("q") ?? "";
  const dir = p.get("sort") === "-due" ? "desc" : "asc";
  const hrefOf = (c: AgentCaseVM) =>
    localHref(locale, wsHref(`/agent/cases/${c.ref}?tab=${ACTION_TAB[rowAction(c)]}`));

  const all = q.data ?? [];
  const at = now ?? 0;
  const needle = search.trim().toLowerCase();
  const rows = all.filter(
    (c) =>
      inCaseView(view, c, at) &&
      (!needle ||
        [c.ref, c.client, c.service].some((s) =>
          s.toLowerCase().includes(needle),
        )),
  );

  const columns: OpsColumn<AgentCaseVM>[] = [
    {
      key: "ref",
      label: t.cases.cols.ref,
      cell: (c) => <span className="font-medium tabular">{c.ref}</span>,
    },
    { key: "service", label: t.cases.cols.service, cell: (c) => c.service },
    {
      key: "client",
      label: t.cases.cols.client,
      cell: (c) => (
        <span>
          {c.client}
          {c.unread > 0 && (
            <span className="ml-2 text-navy-800">
              · {fill(t.cases.unread, { n: c.unread })}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "status",
      label: t.cases.cols.status,
      cell: (c) => <OpsStatus status={c.status} />,
      wrap: true,
    },
    {
      key: "due",
      label: t.cases.cols.due,
      cell: (c) => (
        <SlaChip
          due={c.dueAt}
          paused={PAUSED.has(c.status)}
          done={view === "completed"}
        />
      ),
      sort: (c) => Date.parse(c.dueAt ?? "") || Number.MAX_SAFE_INTEGER,
    },
    {
      key: "next",
      label: t.cases.cols.next,
      cell: (c) => (
        <span className="font-medium text-navy-800">
          {a.actions[rowAction(c)]}
        </span>
      ),
    },
  ];

  const empty = search ? (
    <EmptyPanel
      compact
      title={fill(t.cases.empty.search, { q: search })}
      action={
        <Button
          size="sm"
          variant="outline"
          onClick={() => setUrlParams({ q: null })}
        >
          {t.cases.clear}
        </Button>
      }
    />
  ) : (
    <EmptyPanel compact={view !== "all"} title={t.cases.empty[view]} />
  );

  return (
    <div className="pb-24 lg:pb-8">
      <PageHead title={title ?? t.cases.title} sub={sub ?? t.cases.sub} />
      <div className="grid gap-4">
        <SavedViewTabs
          views={CASE_VIEWS.map((v) => ({
            key: v,
            label: t.cases.views[v],
            count:
              q.data && now !== null
                ? all.filter((c) => inCaseView(v, c, now)).length
                : undefined,
          }))}
          active={view}
          onChange={(v) =>
            setUrlParams({ view: v === "all" ? null : v, focus: null })
          }
        />
        <FilterBar
          search={search}
          onSearch={(v) => setUrlParams({ q: v || null })}
          placeholder={t.cases.search}
          chips={[]}
          right={
            <Button
              size="sm"
              variant="outline"
              aria-label={`${t.cases.sortDue}: ${dir === "asc" ? t.cases.soonest : t.cases.latest}`}
              onClick={() =>
                setUrlParams({ sort: dir === "asc" ? "-due" : null })
              }
            >
              {t.cases.cols.due} {dir === "asc" ? "↑" : "↓"}
            </Button>
          }
        />
        <OpsTable
          label={title ?? t.cases.title}
          rows={rows}
          columns={columns}
          rowKey={(c) => c.ref}
          rowLabel={(c) => `${c.ref} ${c.client}`}
          loading={q.isPending || now === null}
          error={q.error}
          onRetry={() => q.refetch()}
          empty={empty}
          sort={{ key: "due", dir }}
          onSort={(s) =>
            setUrlParams({
              sort: s?.key === "due" && s.dir === "desc" ? "-due" : null,
            })
          }
          focused={p.get("focus")}
          onFocus={(k) => setUrlParams({ focus: k })}
          onOpen={(c) => router.push(hrefOf(c))}
          shortcuts
          renderCard={(c) => (
            <>
              <span className="flex items-baseline gap-2 text-small">
                <span className="font-medium tabular">{c.ref}</span>
                <span className="min-w-0 truncate">{c.service}</span>
              </span>
              <span className="text-eyebrow text-fg-muted">{c.client}</span>
              <span className="flex flex-wrap items-center gap-2">
                <OpsStatus status={c.status} />
                <SlaChip
                  due={c.dueAt}
                  paused={PAUSED.has(c.status)}
                  done={view === "completed"}
                />
                <span className="text-small font-medium text-navy-800">
                  {a.actions[rowAction(c)]} →
                </span>
              </span>
            </>
          )}
        />
      </div>
    </div>
  );
}
