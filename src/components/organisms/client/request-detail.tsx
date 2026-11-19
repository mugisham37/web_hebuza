"use client";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { formatDate, cx } from "@/shared/format";
import { ApiError } from "@/lib/api/client";
import { Tabs } from "@/components/atoms/tabs";
import { Timeline } from "@/components/atoms/misc";
import { Money, OutcomePill, StatusPill } from "@/components/atoms/domain";
import { ButtonLink } from "@/components/atoms/button";
import { EmptyState, ErrorState, Skeleton } from "@/components/atoms/feedback";
import { Icon } from "@/components/atoms/icon";
import { c2Copy, fill } from "@/content/pages/c2";
import { Thread } from "@/components/organisms/client/thread";
import { toStatus, useRequest, type RequestDetail } from "@/components/molecules/client/requests-data";
import { NeedRow } from "@/components/molecules/client/client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Textarea } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";

const TAB_IDS = [
  "overview",
  "timeline",
  "payments",
  "deliverables",
  "messages",
] as const;
type TabId = (typeof TAB_IDS)[number];
const panel = "border border-border bg-surface p-5 sm:p-6";
const kb = (n: number) =>
  n >= 1e6
    ? `${(n / 1e6).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;

/** C07 detail: header + tabs. The tab lives in ?tab= so dashboard/inbox can deep-link to Messages. */
export function RequestDetailView() {
  const { locale } = useI18n();
  const c = c2Copy(locale).req;
  const code = decodeURIComponent(useParams<{ ref: string }>().ref);
  const sp = useSearchParams();
  const router = useRouter();
  const q = useRequest(code);
  const tab: TabId = (TAB_IDS as readonly string[]).includes(
    sp.get("tab") ?? "",
  )
    ? (sp.get("tab") as TabId)
    : "overview";

  const back = (
    <Link
      href={localHref(locale, "/requests")}
      className="inline-flex items-center gap-1 text-small text-fg-muted hover:text-fg"
    >
      <span aria-hidden>←</span>
      {c.back}
    </Link>
  );

  if (q.isPending)
    return (
      <div className="grid gap-4" aria-busy>
        {back}
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-64 w-full " />
      </div>
    );
  if (q.isError) {
    return (
      <div className="grid gap-4">
        {back}
        {q.error instanceof ApiError && q.error.isNotFound ? (
          <EmptyState title={c.notFound} body={c.notFoundBody} />
        ) : (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        )}
      </div>
    );
  }

  const r = q.data;
  const needs = (r.needs ?? []).filter((n) => !n.done);
  const content: Record<TabId, React.ReactNode> = {
    overview: <Overview r={r} />,
    timeline: (
      <section className={panel}>
        <Steps r={r} />
      </section>
    ),
    payments: <Payments r={r} />,
    deliverables: <Deliverables r={r} />,
    messages: <Thread code={r.code} />,
  };

  return (
    <div className="grid gap-6">
      {back}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-small text-fg-subtle tabular">{r.code}</p>
          <h1 className="text-fg-heading text-h3">{r.service_name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-small text-fg-muted">
            <StatusPill status={toStatus(r.status)} />
            <span>
              {fill(c.submitted, { date: formatDate(r.submitted_at, locale) })}
            </span>
            {r.assignee_name && (
              <span>
                · {c.handler} {r.assignee_name}
              </span>
            )}
          </p>
        </div>
      </header>
      <Tabs
        value={tab}
        onChange={(id) => router.replace(`?tab=${id}`, { scroll: false })}
        tabs={TAB_IDS.map((id) => ({
          id,
          label: c.detailTabs[id],
          content: content[id],
          count: id === "overview" && needs.length ? needs.length : undefined,
        }))}
      />
    </div>
  );
}

function Overview({ r }: { r: RequestDetail }) {
  const { locale } = useI18n();
  const c = c2Copy(locale).req;
  const needs = (r.needs ?? []).filter((n) => !n.done);
  return (
    <div className="grid gap-6 pt-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-6">
        <section
          aria-labelledby="need-h"
          className={cx(
            "p-5 sm:p-6",
            needs.length ? "border-l-3 border-gold-400 bg-gold-50" : "bg-bg-subtle",
          )}
        >
          <h2 id="need-h" className="text-fg-heading text-card-title">
            {c.needed}
          </h2>
          {needs.length ? (
            <ul className="mt-2 divide-y divide-border">
              {needs.map((n) => (
                <NeedRow key={n.id} need={n} tone="band" />
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-body">{c.neededNone}</p>
          )}
        </section>
        <section aria-labelledby="tl-h" className={panel}>
          <h2 id="tl-h" className="text-fg-heading mb-4 text-card-title">
            {c.timeline}
          </h2>
          <Steps r={r} />
        </section>
      </div>
      <div className="grid content-start gap-4">
        {/* F-REQ-09: HEBUZA's status and the institution's decision are never merged. */}
        <section className={panel}>
          <h2 className="text-small text-fg-subtle">{c.hebuza}</h2>
          <div className="mt-2">
            <StatusPill status={toStatus(r.status)} />
          </div>
        </section>
        {r.outcome && r.outcome !== "none" && (
          <section className={panel}>
            <h2 className="text-small text-fg-subtle">{c.institution}</h2>
            <div className="mt-2">
              <OutcomePill outcome={r.outcome} />
            </div>
            {(r.outcome_institution || r.outcome_ref) && (
              <p className="mt-2 text-small text-fg-muted">
                {[r.outcome_institution, r.outcome_ref && fill(c.outcomeRef, { ref: r.outcome_ref }), r.outcome_at && formatDate(r.outcome_at, locale)].filter(Boolean).join(" · ")}
              </p>
            )}
          </section>
        )}
        <Deliverables r={r} compact />
        {r.cancel_mode && <CancelPanel code={r.code} mode={r.cancel_mode} />}
      </div>
    </div>
  );
}

function Steps({ r }: { r: RequestDetail }) {
  const { locale } = useI18n();
  const c = c2Copy(locale).req;
  const steps = r.timeline ?? [];
  if (!steps.length)
    return <p className="text-body text-fg-muted">{c.noTimeline}</p>;
  return (
    <Timeline
      items={steps.map((s) => ({
        id: s.id,
        current: s.state === "current",
        title: (
          <span className={cx(s.state === "upcoming" && "text-fg-subtle")}>
            {s.title}
          </span>
        ),
        meta: s.at ? (
          <time dateTime={s.at}>
            {formatDate(s.at, locale, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </time>
        ) : undefined,
      }))}
    />
  );
}

function Payments({ r }: { r: RequestDetail }) {
  const { locale } = useI18n();
  const c = c2Copy(locale).req;
  const list = r.payments ?? [];
  if (!list.length)
    return <EmptyState className="mt-6" body={c.paymentsNone} />;
  return (
    <ul className={cx(panel, "mt-6")}>
      {list.map((p) => (
        <li
          key={p.id}
          className="flex flex-wrap items-center gap-3 border-b border-border py-3 last:border-0"
        >
          <span className="min-w-0 flex-1 text-body">
            {p.label}
            <span className="block text-small text-fg-subtle">
              {p.status === "paid" && p.paidAt
                ? fill(c.paidOn, { date: formatDate(p.paidAt, locale) })
                : p.dueAt
                  ? fill(c2Copy(locale).dash.due, {
                      date: formatDate(p.dueAt, locale),
                    })
                  : null}
            </span>
          </span>
          <Money amount={p.amount} className="font-medium" />
          {p.status === "due" ? (
            <ButtonLink
              size="sm"
              href={localHref(
                locale,
                `/pay/${encodeURIComponent(r.code)}`,
              )}
            >
              {c.payNow}
            </ButtonLink>
          ) : (
            <a
              className="text-small underline underline-offset-4"
              href={`/api/applications/${encodeURIComponent(r.code)}/payment/receipt`}
            >
              {c.receipt}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

function Deliverables({ r, compact }: { r: RequestDetail; compact?: boolean }) {
  const { locale, t } = useI18n();
  const c = c2Copy(locale).req;
  const list = r.deliverables ?? [];
  if (!list.length)
    return compact ? null : (
      <EmptyState className="mt-6" body={c.deliverablesNone} />
    );
  return (
    <section
      aria-label={c.deliverables}
      className={cx(panel, !compact && "mt-6")}
    >
      {compact && <h2 className="text-fg-heading mb-2 text-card-title">{c.deliverables}</h2>}
      <ul>
        {list.map((d) => (
          <li
            key={d.id}
            className="flex items-center gap-3 border-b border-border py-3 last:border-0"
          >
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center bg-bg-tint"
            >
              <Icon name={d.released ? "fileCheck" : "lock"} size={18} />
            </span>
            <span className="min-w-0 flex-1 text-body">
              <span className="block truncate">{d.name}</span>
              <span className="text-small text-fg-subtle">
                {d.released ? kb(d.size) : c.locked}
              </span>
            </span>
            {/* shortcut: preview is a download link; C09 owns the in-page viewer. */}
            {d.released && (
              <a
                className="text-small underline underline-offset-4"
                href={`/api/deliverables/${d.id}/download`}
              >
                {t("common.download")}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** REQ-11: cancel before work starts; afterwards only a request a manager decides. */
function CancelPanel({ code, mode }: { code: string; mode: "cancel" | "request" }) {
  const { locale } = useI18n();
  const c = c2Copy(locale).req.cancel;
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const m = useMutation({
    mutationFn: () => unwrap<{ state: "cancelled" | "requested" }>(api.POST("/api/applications/{code}/cancel", { params: { path: { code } }, body: { reason } })),
    onSuccess: (r) => {
      setOpen(false);
      toast({ title: r.state === "cancelled" ? c.done : c.asked, tone: "success" });
      void qc.invalidateQueries({ queryKey: ["c2"] });
    },
    onError: () => toast({ title: c.failed, tone: "danger" }),
  });
  const ask = mode === "request";
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="justify-center">{ask ? c.ask : c.open}</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={ask ? c.askTitle : c.title}
        description={ask ? c.askLede : c.lede}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>{c.keep}</Button>
            <Button onClick={() => m.mutate()} loading={m.isPending} disabled={reason.trim().length < 3}>{c.confirm}</Button>
          </div>
        }
      >
        <Field label={c.reason}>
          {({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
      </Dialog>
    </>
  );
}
