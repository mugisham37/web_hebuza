"use client";
// CS5 timeline + internal notes, audit tab, messages and billing (read-only staff views).
import { errorCopy } from "@/lib/api/error-copy";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cx, formatDate, formatDateTime, formatMoney } from "@/shared/format";
import { opsCommon } from "@/content/pages/ops-common";
import { opsCase, fill } from "@/content/pages/ops-case";
import {
  TimelineItem,
  NoteBubble,
  EmptyPanel,
  PanelError,
  Panel,
} from "@/components/molecules/ops/ops";
import { PaymentChip, LockLabel, Kbd } from "@/components/atoms/ops";
import { Button } from "@/components/atoms/button";
import { Skeleton } from "@/components/atoms/feedback";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import {
  useAudit,
  useTimeline,
  useAddNote,
  useAgents,
  useRecord,
  type OpsEvent,
} from "@/lib/ops/b";
import type { CaseDetailVM } from "@/lib/ops/api";
import type { Locale } from "@/shared/i18n/config";

/** Human title for an event, in the viewer's language. */
export function evTitle(e: OpsEvent, locale: Locale) {
  const c = opsCase(locale).timeline,
    st = opsCommon(locale).status as Record<string, string>;
  const money = (v?: string) => formatMoney(Number(v ?? 0), "RWF", locale);
  switch (e.kind) {
    case "status":
      return e.from
        ? fill(c.ev.status, {
            from: st[e.from] ?? e.from,
            to: st[e.to!] ?? e.to!,
          })
        : c.ev.statusNew;
    case "document":
      return e.to
        ? fill(c.ev.documentDecision, {
            t: e.text ?? "",
            to:
              e.to === "accepted"
                ? opsCase(locale).docs.accepted
                : e.to === "rejected"
                  ? opsCase(locale).triage.states.rejected
                  : e.to,
          })
        : fill(c.ev.document, { t: e.text ?? "" });
    case "message":
      return e.to === "request"
        ? fill(c.ev.request, { t: e.text ?? "" })
        : fill(c.ev.message, { t: (e.text ?? "").slice(0, 60) });
    case "assignment":
      return e.to === "offer"
        ? fill(c.ev.offer, { t: e.text ?? "" })
        : e.from
          ? fill(c.ev.reassign, { from: e.from, t: e.text ?? "" })
          : fill(c.ev.assignment, { t: e.text ?? "" });
    case "payment":
      return fill(e.to === "quote" ? c.ev.quote : c.ev.payment, {
        amount: money(e.text),
      });
    case "note":
      return c.ev.note;
    default: {
      const [k, ...rest] = (e.text ?? "").split(":");
      return c.sys[k] ? [c.sys[k], ...rest].join(" · ") : (e.text ?? "");
    }
  }
}

const FILTERS = [
  "all",
  "status",
  "document",
  "message",
  "assignment",
  "payment",
  "note",
] as const;

export function TimelineTab({
  c: kase,
  composerRef,
  locked,
}: {
  c: CaseDetailVM;
  composerRef: React.RefObject<HTMLTextAreaElement | null>;
  locked: boolean;
}) {
  const { locale } = useI18n();
  const t = opsCase(locale).timeline;
  const q = useTimeline(kase.ref);
  const [f, setF] = useState<(typeof FILTERS)[number]>("all");
  const list = (q.data ?? []).filter((e) => f === "all" || e.kind === f);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <Panel>
        <div
          role="group"
          aria-label={t.filters.all}
          className="mb-4 flex flex-wrap gap-1.5"
        >
          {FILTERS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={f === k}
              onClick={() => setF(k)}
              className={cx(
                "h-8 border px-3 text-small",
                f === k
                  ? "border-secondary bg-secondary text-on-secondary"
                  : "border-border-strong hover:border-navy-300",
              )}
            >
              {t.filters[k]}
            </button>
          ))}
        </div>
        {q.isPending ? (
          <div className="grid gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : q.isError ? (
          <PanelError
            what={opsCase(locale).tabs.timeline}
            onRetry={() => q.refetch()}
          />
        ) : !list.length ? (
          <EmptyPanel compact title={t.empty} />
        ) : (
          <ol aria-live="polite">
            {list.map((e, i) => (
              <TimelineItem
                key={e.id}
                kind={e.kind}
                title={evTitle(e, locale)}
                actor={e.actor}
                time={formatDateTime(e.at, locale)}
                last={i === list.length - 1}
              >
                {e.kind === "note" && (
                  <NoteBubble
                    internal
                    author={e.actor}
                    time={formatDateTime(e.at, locale)}
                  >
                    {e.text}
                  </NoteBubble>
                )}
              </TimelineItem>
            ))}
          </ol>
        )}
      </Panel>
      <div className="grid content-start gap-4">
        <NoteComposer refId={kase.ref} inputRef={composerRef} locked={locked} />
        {kase.status === "completed_delivered" && <Snapshot c={kase} />}
      </div>
    </div>
  );
}

function NoteComposer({
  refId,
  inputRef,
  locked,
}: {
  refId: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  locked: boolean;
}) {
  const { locale } = useI18n();
  const t = opsCase(locale).timeline;
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const add = useAddNote();
  const agents = useAgents();
  const toast = useToast();
  const mentioning = /(^|\s)@\w*$/.test(body);
  const query = mentioning
    ? body.slice(body.lastIndexOf("@") + 1).toLowerCase()
    : "";
  const people = mentioning
    ? (agents.data ?? [])
        .filter((a) => a.name.toLowerCase().includes(query))
        .slice(0, 5)
    : [];
  const submit = () => {
    if (!body.trim()) return setErr(t.placeholder);
    setErr(null);
    add.mutate(
      { ref: refId, body },
      {
        onSuccess: () => {
          setBody("");
          toast({ title: t.posted, tone: "success" });
        },
        onError: (e) => setErr(errorCopy(e, locale)),
      },
    );
  };
  return (
    <section
      className="grid gap-3 border border-warning/25 bg-warning-bg p-4"
      aria-labelledby="note-h"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="note-h" className="text-label-lg">
          {t.composer}
        </h2>
        <LockLabel />
      </div>
      <label className="sr-only" htmlFor="note-body">
        {t.composer}
      </label>
      <textarea
        id="note-body"
        ref={inputRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t.placeholder}
        rows={4}
        maxLength={2000}
        disabled={locked}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
        }}
        aria-invalid={!!err || undefined}
        aria-describedby={err ? "note-err" : undefined}
        className="border border-border-strong bg-white px-3 py-2.5 text-small focus:border-navy-700 focus:ring-3 focus:ring-gold-400/45 hover:border-ink-400 focus:outline-none"
      />
      {people.length > 0 && (
        <ul
          className="flex flex-wrap gap-1.5"
          aria-label={t.filters.assignment}
        >
          {people.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  setBody(body.replace(/@\w*$/, `@${p.name.split(" ")[0]} `));
                  inputRef.current?.focus();
                }}
                className="h-8 border border-border-strong bg-white px-3 text-small hover:border-navy-700"
              >
                {fill(t.mention, { name: p.name })}
              </button>
            </li>
          ))}
        </ul>
      )}
      {err && (
        <p
          id="note-err"
          role="alert"
          className="text-small font-medium text-danger"
        >
          {err}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-eyebrow text-fg-subtle">
          <Kbd>N</Kbd> · <Kbd>⌘</Kbd>
          <Kbd>↵</Kbd>
        </span>
        <Button
          size="sm"
          onClick={submit}
          loading={add.isPending}
          disabled={locked}
        >
          {t.post}
        </Button>
      </div>
    </section>
  );
}

function Snapshot({ c }: { c: CaseDetailVM }) {
  const { locale } = useI18n();
  const t = opsCase(locale).timeline;
  const rows: [string, string][] = [
    [t.submitted, formatDate(c.submittedAt, locale)],
    [t.completed, formatDate(c.updatedAt, locale)],
    [t.slaMet, c.breached ? "✕" : "✓"],
    [t.assignee, c.assignees[0]?.name ?? "—"],
    [t.deliverables, `v${Math.max(1, c.deliverables)}`],
    [t.rating, "★ 5"],
    [t.revenue, "✓"],
  ];
  return (
    <Panel title={t.snapshot}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-small">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-fg-muted">{k}</dt>
            <dd className="text-right font-medium tabular">{v}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

export function AuditTab({ refId }: { refId: string }) {
  const { locale } = useI18n();
  const t = opsCase(locale).audit;
  const st = opsCommon(locale).status as Record<string, string>;
  const q = useAudit(refId);
  if (q.isPending)
    return (
      <div className="grid gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-11" />
        ))}
      </div>
    );
  if (q.isError)
    return <PanelError what={t.title} onRetry={() => q.refetch()} />;
  if (!q.data.length) return <EmptyPanel title={t.empty} />;
  const change = (e: OpsEvent) =>
    e.from || e.to
      ? `${st[e.from ?? ""] ?? e.from ?? "—"} → ${st[e.to ?? ""] ?? e.to ?? "—"}`
      : "—";
  return (
    <Panel title={t.title} padded={false}>
      <div
        tabIndex={0}
        role="region"
        aria-label={t.region}
        className="max-md:hidden overflow-x-auto"
      >
        <table className="w-full text-small">
          <thead className="sticky top-0 bg-ink-100 text-left text-eyebrow text-fg-muted">
            <tr>
              <th className="px-4 py-2 font-medium">{t.who}</th>
              <th className="px-4 py-2 font-medium">{t.what}</th>
              <th className="px-4 py-2 font-medium">{t.change}</th>
              <th className="px-4 py-2 font-medium">{t.ip}</th>
              <th className="px-4 py-2 text-right font-medium">{t.when}</th>
            </tr>
          </thead>
          <tbody>
            {q.data.map((e) => (
              <tr
                key={e.id}
                className="border-t border-border hover:bg-navy-50"
              >
                <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                  {e.actor}
                </td>
                <td className="px-4 py-2.5">{evTitle(e, locale)}</td>
                <td className="px-4 py-2.5 text-fg-muted">{change(e)}</td>
                <td className="px-4 py-2.5 font-mono text-eyebrow tabular">
                  {e.ip ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap tabular">
                  {formatDateTime(e.at, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="grid gap-2 p-4 md:hidden">
        {q.data.map((e) => (
          <li
            key={e.id}
            className="grid gap-0.5 border border-border p-3 text-small"
          >
            <span className="font-medium">{evTitle(e, locale)}</span>
            <span className="text-fg-muted">
              {e.actor} · {change(e)}
            </span>
            <span className="text-eyebrow text-fg-subtle tabular">
              {formatDateTime(e.at, locale)} · {e.ip ?? "—"}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function MessagesTab({
  refId,
  clientName,
}: {
  refId: string;
  clientName: string;
}) {
  const { locale } = useI18n();
  const t = opsCase(locale).messages;
  const q = useTimeline(refId);
  if (q.isPending) return <Skeleton className="h-40" />;
  if (q.isError)
    return (
      <PanelError
        what={opsCase(locale).tabs.messages}
        onRetry={() => q.refetch()}
      />
    );
  const msgs = q.data.filter((e) => e.kind === "message").reverse();
  return (
    <div className="grid max-w-3xl gap-3">
      <p className="flex items-center gap-2 text-small text-fg-muted">
        <Icon name="lock" size={14} aria-hidden />
        {t.readonly}
      </p>
      {!msgs.length ? (
        <EmptyPanel title={t.empty} />
      ) : (
        msgs.map((m) => (
          <div
            key={m.id}
            className={cx("max-w-[85%]", !m.client && "justify-self-end")}
          >
            <NoteBubble
              author={
                m.client
                  ? `${clientName} · ${t.client}`
                  : `${m.actor} · ${t.staff}`
              }
              time={formatDateTime(m.at, locale)}
            >
              {m.to === "request" ? evTitle(m, locale) : m.text}
            </NoteBubble>
          </div>
        ))
      )}
    </div>
  );
}

export function BillingTab({ c }: { c: CaseDetailVM }) {
  const { locale } = useI18n();
  const t = opsCase(locale).billing;
  const r = useRecord(c.ref);
  const money = (n: number) => formatMoney(n, "RWF", locale);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel title={t.price}>
        <p className="text-h3 tabular">
          {c.amount != null ? money(c.amount) : "—"}
        </p>
        <div className="mt-2">
          <PaymentChip status={c.payment} />
        </div>
      </Panel>
      <Panel title={t.quote}>
        {r.isPending ? (
          <Skeleton className="h-16" />
        ) : r.isError ? (
          <PanelError what={t.quote} onRetry={() => r.refetch()} />
        ) : r.data.quote ? (
          <dl className="grid grid-cols-2 gap-y-1 text-small">
            {r.data.quote.lines.map((l) => (
              <div key={l.label} className="contents">
                <dt>
                  {l.label} × {l.qty}
                </dt>
                <dd className="text-right tabular">{money(l.qty * l.unit)}</dd>
              </div>
            ))}
            <dt className="font-medium">{opsCase(locale).quote.total}</dt>
            <dd className="text-right font-medium tabular">
              {money(r.data.quote.total)}
            </dd>
          </dl>
        ) : (
          <p className="text-small text-fg-muted">{t.noQuote}</p>
        )}
      </Panel>
      <Panel title={t.payments} className="md:col-span-2">
        {r.isPending ? (
          <Skeleton className="h-12" />
        ) : r.isError ? (
          <PanelError what={t.payments} onRetry={() => r.refetch()} />
        ) : !r.data.payments.length ? (
          <p className="text-small text-fg-muted">{t.none}</p>
        ) : (
          <ul className="grid gap-2">
            {r.data.payments.map((p) => (
              <li
                key={p.at}
                className="flex flex-wrap items-center justify-between gap-2 border border-border px-3 py-2 text-small"
              >
                <span>
                  {p.label} ·{" "}
                  <span className="text-fg-muted">
                    {t.method}: {p.method}
                  </span>
                </span>
                <span className="tabular">
                  {money(p.amount)} · {formatDateTime(p.at, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

