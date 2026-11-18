"use client";
import { useWs } from "@/lib/agent/ws";
// U9 Clients (board 10 CM1, CM2): /agent/clients?f=&q=&page= and /agent/clients/[id]?tab=
// The agent sees a limited 360: only what's shared on their cases, never the client's personal number.
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx, formatDate, formatRelative } from "@/shared/format";
import { localHref } from "@/shared/i18n/config";
import {
  useClients,
  useClient,
  useAddClientNote,
  type ClientRow,
} from "@/lib/agent/d";
import { agentClients } from "@/content/pages/agent-clients";
import { fill } from "@/content/pages/agent-common";
import {
  Countdown,
  PageHead,
  SkeletonRows,
  useNow,
} from "@/components/atoms/agent";
import { OpsStatus } from "@/components/atoms/ops";
import {
  CopyRef,
  EmptyPanel,
  FilterBar,
  PanelError,
  Panel,
} from "@/components/molecules/ops/ops";
import { Button, buttonClass } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { Avatar } from "@/components/atoms/misc";
import { useToast } from "@/components/atoms/toast";
import { Chips } from "@/components/molecules/agent/agent";

const useCC = () => {
  const { locale } = useI18n();
  const { wsHref } = useWs();
  return { c: agentClients(locale), locale };
};
type F = "all" | "dedicated" | "active" | "inactive";
const FS: F[] = ["all", "dedicated", "active", "inactive"];
const PER = 10;
const inF = (r: ClientRow, f: F) =>
  f === "dedicated" ? r.x_agent.dedicated : f === "all" ? true : r.status === f;

export function ClientsView() {
  const { c, locale } = useCC();
  const { wsHref } = useWs();
  const p = useUrlParams();
  const f = (FS.includes(p.get("f") as F) ? p.get("f") : "all") as F;
  const q = p.get("q") ?? "";
  const page = Math.max(1, Number(p.get("page")) || 1);
  const list = useClients();
  const now = useNow();
  const all = list.data ?? [];
  const rows = all.filter(
    (r) => inF(r, f) && (!q || r.name.toLowerCase().includes(q.toLowerCase())),
  );
  const pages = Math.max(1, Math.ceil(rows.length / PER));
  const pg = Math.min(page, pages);
  const shown = rows.slice((pg - 1) * PER, pg * PER);
  const [eT, eB] = q ? c.empty.search : c.empty[f];
  const href = (id: string) => localHref(locale, wsHref(`/agent/clients/${id}`));
  const last = (r: ClientRow) =>
    r.x_agent.lastContactAt && now
      ? formatRelative(r.x_agent.lastContactAt, locale, now)
      : c.none;

  return (
    <div className="pb-24 lg:pb-8">
      <PageHead title={c.title} sub={c.sub} />
      <div className="mb-4 grid gap-3">
        <FilterBar
          search={q}
          onSearch={(v) => setUrlParams({ q: v || null, page: null })}
          placeholder={c.search}
          chips={[]}
        />
        <Chips
          label={c.filterLabel}
          value={f}
          onChange={(v) =>
            setUrlParams({ f: v === "all" ? null : v, page: null })
          }
          options={FS.map((x) => ({
            id: x,
            label: c.filters[x],
            n: list.data ? all.filter((r) => inF(r, x)).length : undefined,
          }))}
        />
      </div>
      {list.isPending ? (
        <SkeletonRows n={5} />
      ) : list.isError ? (
        <PanelError what={c.listErr} onRetry={() => list.refetch()} />
      ) : !rows.length ? (
        <EmptyPanel title={fill(eT, { q })} body={eB} />
      ) : (
        <>
          <div
            className="overflow-x-auto border border-border bg-white max-md:hidden"
            tabIndex={0}
            role="region"
            aria-label={c.title}
          >
            <table className="w-full text-small">
              <thead className="bg-ink-100 text-left text-eyebrow text-fg-muted">
                <tr>
                  {(["client", "type", "open", "next", "last"] as const).map(
                    (k) => (
                      <th
                        key={k}
                        scope="col"
                        className={cx(
                          "px-4 py-3 font-medium",
                          k === "open" && "text-right",
                        )}
                      >
                        {c.cols[k]}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shown.map((r) => (
                  <tr key={r.clientId} className="hover:bg-bg-subtle/50">
                    <td className="px-4 py-3">
                      <Link
                        href={href(r.clientId)}
                        className="flex items-center gap-2 font-medium hover:underline"
                      >
                        <Avatar name={r.name} size="sm" />
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <TypeTags r={r} c={c} />
                    </td>
                    <td className="px-4 py-3 text-right tabular">
                      {r.openCaseCount}
                    </td>
                    <td className="px-4 py-3">
                      {r.x_agent.nextObligation ? (
                        <Next o={r.x_agent.nextObligation} />
                      ) : (
                        c.none
                      )}
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{last(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="grid gap-2 md:hidden m-stagger">
            {shown.map((r, i) => (
              <li
                key={r.clientId}
                style={{ "--i": Math.min(i, 6) } as CSSProperties}
              >
                <Link
                  href={href(r.clientId)}
                  className="grid gap-2 border border-border bg-white p-4 m-press"
                >
                  <span className="flex items-center gap-2">
                    <Avatar name={r.name} size="sm" />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {r.name}
                    </span>
                    <span className="text-eyebrow text-fg-muted">
                      {last(r)}
                    </span>
                  </span>
                  <TypeTags r={r} c={c} />
                  <span className="flex flex-wrap items-center gap-2 text-small text-fg-muted">
                    {c.cols.open}:{" "}
                    <span className="tabular text-fg">{r.openCaseCount}</span>
                    {r.x_agent.nextObligation && (
                      <Next o={r.x_agent.nextObligation} />
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <nav
            aria-label={c.title}
            className="mt-3 flex flex-wrap items-center justify-between gap-2 text-small"
          >
            <span aria-live="polite">
              {fill(c.showing, {
                a: (pg - 1) * PER + 1,
                b: (pg - 1) * PER + shown.length,
                n: rows.length,
              })}
            </span>
            <span className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={pg <= 1}
                aria-label={c.prev}
                onClick={() => setUrlParams({ page: String(pg - 1) })}
              >
                ‹
              </Button>
              {Array.from({ length: pages }, (_, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant={i + 1 === pg ? "secondary" : "ghost"}
                  aria-current={i + 1 === pg ? "page" : undefined}
                  onClick={() =>
                    setUrlParams({ page: i ? String(i + 1) : null })
                  }
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                size="sm"
                variant="outline"
                disabled={pg >= pages}
                aria-label={c.next}
                onClick={() => setUrlParams({ page: String(pg + 1) })}
              >
                ›
              </Button>
            </span>
          </nav>
        </>
      )}
    </div>
  );
}

type CC = ReturnType<typeof agentClients>;
function TypeTags({ r, c }: { r: ClientRow; c: CC }) {
  return (
    <span className="flex flex-wrap gap-1">
      {r.x_agent.dedicated && (
        <span className="bg-navy-100 px-2 py-0.5 text-eyebrow font-medium">
          {c.dedicated}
        </span>
      )}
      <span className="bg-ink-100 px-2 py-0.5 text-eyebrow">
        {c.type[r.x_agent.type]}
      </span>
      {r.status === "inactive" && (
        <span className="border border-border px-2 py-0.5 text-eyebrow text-fg-muted">
          {c.inactive}
        </span>
      )}
    </span>
  );
}
const Next = ({ o }: { o: { label: string; dueAt: string } }) => (
  <span className="inline-flex flex-wrap items-center gap-2">
    <span className="truncate">{o.label}</span>
    <Countdown to={o.dueAt} kind="due" />
  </span>
);

// ---------------------------------------------------------------- CM2 limited 360
const TABS = ["overview", "cases", "documents", "activity"] as const;
type Tab = (typeof TABS)[number];

export function ClientView({ id }: { id: string }) {
  const { c, locale } = useCC();
  const { wsHref } = useWs();
  const p = useUrlParams();
  const tab = (
    TABS.includes(p.get("tab") as Tab) ? p.get("tab") : "overview"
  ) as Tab;
  const q = useClient(id);
  const [dlg, setDlg] = useState<null | "call" | "note">(null);
  const back = (
    <Link
      href={localHref(locale, wsHref("/agent/clients"))}
      className="mb-1 inline-flex items-center gap-1 text-small text-fg-muted hover:text-fg"
    >
      <Icon name="arrowRight"size={14} aria-hidden className="rotate-180" />
      {c.back}
    </Link>
  );
  if (q.isPending)
    return (
      <div className="pb-24 lg:pb-8">
        {back}
        <SkeletonRows n={5} className="mt-4" />
      </div>
    );
  if (q.isError)
    return (
      <div className="pb-24 lg:pb-8">
        {back}
        <div className="mt-4">
          {/isn't on any/i.test(String(q.error)) ? (
            <EmptyPanel title={c.forbidden} body={c.forbiddenBody} />
          ) : (
            <PanelError what={c.clientErr} onRetry={() => q.refetch()} />
          )}
        </div>
      </div>
    );
  const d = q.data;
  const openCase =
    d.cases.find((x) => d.obligations.some((o) => o.ref === x.ref)) ?? null;
  const msgRef = openCase ? openCase.ref : null;
  const counts: Partial<Record<Tab, number>> = {
    cases: d.cases.length,
    documents: d.documents.length,
  };

  return (
    <div className="pb-24 lg:pb-8">
      <PageHead
        back={back}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Avatar name={d.name} size="lg" />
            {d.name}
          </span>
        }
        sub={<TypeTags r={d} c={c} />}
        actions={
          <>
            {msgRef ? (
              <Link
                href={localHref(locale, wsHref(`/agent/inbox?thread=${msgRef}`))}
                className={buttonClass({ size: "sm" })}
              >
                <Icon name="message" size={14} aria-hidden />
                {c.send}
              </Link>
            ) : (
              <Button size="sm" disabled title={c.noOpenCase}>
                {c.send}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setDlg("call")}>
              <Icon name="phone" size={14} aria-hidden />
              {c.call}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDlg("note")}>
              <Icon name="lock" size={14} aria-hidden />
              {c.addNote}
            </Button>
          </>
        }
      />
      <div
        role="tablist"
        aria-label={d.name}
        className="mb-4 flex gap-1 overflow-x-auto border-b border-border"
      >
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setUrlParams({ tab: t === "overview" ? null : t })}
            className={cx(
              "-mb-px flex h-11 shrink-0 items-center gap-1 border-b-2 px-4 text-button",
              tab === t
                ? "border-navy-700"
                : "border-transparent text-fg-subtle hover:text-fg",
            )}
          >
            {c.tabs[t]}
            {counts[t] !== undefined && (
              <span className="tabular">({counts[t]})</span>
            )}
          </button>
        ))}
      </div>
      <p className="mb-4 flex items-center gap-2 bg-tint px-3 py-2 text-small text-navy-800">
        <Icon name="shield" size={16} aria-hidden />
        {c.sharedOnly}
      </p>
      <div className="m-rise"key={tab}>
        {tab === "overview" ? (
          <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <Panel title={c.contact}>
              <dl className="grid gap-2 text-small">
                <div className="flex justify-between gap-2">
                  <dt className="text-fg-muted">{c.language}</dt>
                  <dd className="uppercase">{d.language}</dd>
                </div>
                <div className="text-fg-muted">
                  {fill(c.since, { y: d.since })}
                </div>
                <div className="flex items-start gap-2 bg-bg-subtle/60 p-2 text-eyebrow text-fg-muted">
                  <Icon name="phone" size={14} aria-hidden />
                  {c.phoneHidden}
                </div>
              </dl>
            </Panel>
            <div className="grid content-start gap-4">
              <Panel title={c.obligations}>
                {d.obligations.length ? (
                  <ul className="grid gap-2">
                    {d.obligations.map((o) => (
                      <li
                        key={o.ref}
                        className="flex flex-wrap items-center gap-2 text-small"
                      >
                        <span className="min-w-0 flex-1">
                          {o.label} ·{" "}
                          <span className="text-fg-muted">
                            {formatDate(o.dueAt, locale, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </span>
                        <Countdown to={o.dueAt} kind="due" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-small text-fg-muted">{c.noObligations}</p>
                )}
              </Panel>
              <CasesList d={d} c={c} locale={locale} />
              {d.notes.length > 0 && (
                <Panel title={c.notes}>
                  <ul className="grid gap-2">
                    {d.notes.map((n) => (
                      <li
                        key={n.id}
                        className="border border-dashed border-warning/50 bg-warning-bg px-3 py-2 text-small"
                      >
                        <p className="flex items-center gap-1 text-eyebrow text-warning">
                          <Icon name="lock" size={12} aria-hidden />
                          {n.by} ·{" "}
                          {formatDate(n.at, locale, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                        <p className="whitespace-pre-line">{n.text}</p>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
            </div>
          </div>
        ) : tab === "cases" ? (
          <CasesList d={d} c={c} locale={locale} />
        ) : tab === "documents" ? (
          <Panel title={c.docs}>
            {d.documents.length ? (
              <ul className="divide-y divide-border">
                {d.documents.map((x) => (
                  <li
                    key={x.id}
                    className="flex flex-wrap items-center gap-2 py-2 text-small"
                  >
                    <Icon name="file" size={16} aria-hidden />
                    <span className="min-w-0 flex-1">{x.name}</span>
                    <span className="text-eyebrow text-fg-muted">{x.ref}</span>
                    <span className="bg-ink-100 px-2 text-eyebrow">
                      {c.docState[x.state as keyof CC["docState"]] ?? x.state}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-small text-fg-muted">{c.noDocs}</p>
            )}
          </Panel>
        ) : (
          <Panel title={c.activity}>
            {d.activity.length ? (
              <ol className="grid gap-3">
                {d.activity.map((a, i) => (
                  <li
                    key={i}
                    className="grid gap-0.5 border-l-2 border-border pl-3 text-small"
                  >
                    <span className="text-eyebrow text-fg-muted">
                      {formatDate(a.at, locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      · {a.ref} · {a.who}
                    </span>
                    <span className="break-words">{a.text}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-small text-fg-muted">{c.noActivity}</p>
            )}
          </Panel>
        )}
      </div>
      <CallDialog
        open={dlg === "call"}
        onClose={() => setDlg(null)}
        bridge={d.bridge}
        caseRef={msgRef ?? d.lastCaseCode}
        c={c}
      />
      <NoteDialog
        open={dlg === "note"}
        onClose={() => setDlg(null)}
        id={id}
        c={c}
      />
    </div>
  );
}

function CasesList({
  d,
  c,
  locale,
}: {
  d: {
    cases: {
      ref: string;
      service: string;
      status: Parameters<typeof OpsStatus>[0]["status"];
      dueAt: string;
    }[];
  };
  c: CC;
  locale: Parameters<typeof localHref>[0];
}) {
  const { wsHref } = useWs();
  return (
    <Panel title={c.cases}>
      {d.cases.length ? (
        <ul className="divide-y divide-border">
          {d.cases.map((x) => (
            <li key={x.ref}>
              <Link
                href={localHref(locale, wsHref(`/agent/cases/${x.ref}`))}
                className="flex flex-wrap items-center gap-2 py-2.5 text-small hover:bg-bg-subtle/40"
              >
                <span className="grid min-w-0 flex-1">
                  <span className="font-medium tabular">{x.ref}</span>
                  <span className="text-eyebrow text-fg-muted">
                    {x.service}
                  </span>
                </span>
                <OpsStatus status={x.status} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-small text-fg-muted">{c.noCases}</p>
      )}
    </Panel>
  );
}

function CallDialog({
  open,
  onClose,
  bridge,
  caseRef,
  c,
}: {
  open: boolean;
  onClose: () => void;
  bridge: string;
  caseRef: string | null;
  c: CC;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={c.callTitle}
      description={c.callBody}
      footer={
        <div className="flex justify-end">
          <Button onClick={onClose}>{c.close}</Button>
        </div>
      }
    >
      <dl className="grid gap-3">
        <div className="grid gap-1">
          <dt className="text-eyebrow text-fg-muted">{c.callNumber}</dt>
          <dd className="flex flex-wrap items-center gap-2">
            <a
              href={`tel:${bridge.replace(/\s/g, "")}`}
              className="text-h3 tabular underline-offset-4 hover:underline"
            >
              {bridge}
            </a>
          </dd>
        </div>
        {caseRef && (
          <div className="grid gap-1">
            <dt className="text-eyebrow text-fg-muted">{c.callQuote}</dt>
            <dd>
              <CopyRef value={caseRef} />
            </dd>
          </div>
        )}
      </dl>
    </Dialog>
  );
}

function NoteDialog({
  open,
  onClose,
  id,
  c,
}: {
  open: boolean;
  onClose: () => void;
  id: string;
  c: CC;
}) {
  const toast = useToast();
  const add = useAddClientNote(id);
  const [text, setText] = useState("");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={c.noteTitle}
      description={c.noteHint}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button
            loading={add.isPending}
            disabled={!text.trim()}
            onClick={() =>
              add.mutate(text, {
                onSuccess: () => {
                  toast({ title: c.noteSaved, tone: "success" });
                  setText("");
                  onClose();
                },
                onError: () => toast({ title: c.noteFailed, tone: "danger" }),
              })
            }
          >
            {c.noteSave}
          </Button>
        </div>
      }
    >
      <label className="grid gap-1 text-small font-medium">
        <span className="flex items-center gap-1">
          <Icon name="lock"size={12} aria-hidden className="text-warning" />
          {c.noteLabel}
        </span>
        <Textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="border-dashed border-warning/60 bg-warning-bg/40"
          maxLength={2000}
        />
      </label>
    </Dialog>
  );
}
