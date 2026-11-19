"use client";
// U14 Tickets & disputes (board 14 v2): TK1 queue, TK2 detail, TK3 resolve, TK4 breach + escalation, PK2 phone.
import { errorCopy } from "@/lib/api/error-copy";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx, formatDate, formatDateTime, formatMoney } from "@/shared/format";
import { formatDuration } from "@/lib/ops/sla";
import { useShortcut } from "@/lib/ops/shortcuts";
import {
  useTickets,
  useTicket,
  useTicketAction,
  useNewTicket,
  type Ticket,
  type TicketDetail,
  type TicketTab,
  type TicketAction,
} from "@/lib/ops/d";
import { opsTickets, type TicketsCopy } from "@/content/pages/ops-tickets";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { useStepUp, useNow, StepUpCancelled } from "@/components/atoms/step-up";
import { SlaChip, LockLabel } from "@/components/atoms/ops";
import {
  Panel,
  EmptyPanel,
  PanelError,
  CopyRef,
} from "@/components/molecules/ops/ops";
import { Tabs } from "@/components/atoms/tabs";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Input, Textarea, Select, Switch } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { Avatar } from "@/components/atoms/misc";
import { Skeleton } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { useWorkload } from "@/lib/ops/c";

const TABS: TicketTab[] = ["complaints", "disputes", "enquiries", "resolved"];
const useT = () => {
  const { locale } = useI18n();
  return { c: opsTickets(locale), locale };
};

const STATUS_TONE: Record<Ticket["status"], string> = {
  open: "bg-navy-50 text-navy-700",
  waiting_client: "bg-warning-bg text-warning",
  escalated: "bg-danger-bg text-danger",
  confirming: "bg-info-bg text-info",
  resolved: "bg-success-bg text-success",
};
const PRIO_TONE = {
  high: "bg-danger-bg text-danger",
  medium: "bg-warning-bg text-warning",
  low: "bg-bg-subtle text-fg-muted",
};
const Chip = ({ tone, children }: { tone: string; children: ReactNode }) => (
  <span
    className={cx(
      "inline-flex items-center px-2.5 py-0.5 text-eyebrow font-medium whitespace-nowrap",
      tone,
    )}
  >
    {children}
  </span>
);
export const TicketStatus = ({
  s,
  c,
}: {
  s: Ticket["status"];
  c: TicketsCopy;
}) => <Chip tone={STATUS_TONE[s]}>{c.status[s]}</Chip>;
const Face = ({ name }: { name: string }) => (
  <span aria-hidden>
    <Avatar name={name} size="sm" />
  </span>
);
const isOpen = (t: Ticket) =>
  t.status !== "resolved" && t.status !== "confirming";

// ---------------------------------------------------------------- TK1 queue
export function TicketQueue() {
  const { c, locale } = useT();
  const router = useRouter();
  const p = useUrlParams();
  const tab = (
    TABS.includes(p.get("tab") as TicketTab) ? p.get("tab") : "complaints"
  ) as TicketTab;
  const q = p.get("q") ?? "";
  const [focused, setFocused] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const data = useTickets(tab);
  const counts = data.data?.counts;
  const items = (data.data?.items ?? []).filter(
    (t) =>
      !q ||
      [t.ref, t.client, t.caseRef].some((x) =>
        x.toLowerCase().includes(q.toLowerCase()),
      ),
  );
  const open = (t: Ticket) =>
    router.push(localHref(locale, `/ops/tickets/${t.ref}`));
  useShortcut("n", c.newTicket, () => setCreating(true), "list");

  const cols: OpsColumn<Ticket>[] = [
    {
      key: "ref",
      label: c.cols.ref,
      className: "min-w-36",
      cell: (t) => (
        <Link
          href={localHref(locale, `/ops/tickets/${t.ref}`)}
          className="font-medium underline-offset-4 hover:underline"
        >
          {t.ref}
        </Link>
      ),
      sort: (t) => t.ref,
    },
    {
      key: "category",
      label: c.cols.category,
      className: "min-w-28",
      cell: (t) => c.category[t.category],
    },
    {
      key: "client",
      label: c.cols.client,
      wrap: true,
      className: "min-w-40",
      cell: (t) => t.client,
      sort: (t) => t.client,
    },
    {
      key: "case",
      label: c.cols.case,
      className: "min-w-32",
      cell: (t) => <span className="font-mono text-eyebrow">{t.caseRef}</span>,
    },
    {
      key: "priority",
      label: c.cols.priority,
      className: "min-w-24",
      cell: (t) => (
        <Chip tone={PRIO_TONE[t.priority]}>{c.priority[t.priority]}</Chip>
      ),
      sort: (t) => ["high", "medium", "low"].indexOf(t.priority),
    },
    {
      key: "sla",
      label: c.cols.sla,
      className: "min-w-40",
      cell: (t) => (
        <SlaChip
          due={t.responseDueAt}
          firstResponse={!t.responded}
          done={!isOpen(t)}
        />
      ),
      sort: (t) => t.responseDueAt,
    },
    {
      key: "owner",
      label: c.cols.owner,
      className: "min-w-40",
      cell: (t) => (
        <span className="inline-flex items-center gap-2">
          <Face name={t.owner.name} />
          {t.owner.name}
        </span>
      ),
    },
    {
      key: "status",
      label: c.cols.status,
      className: "min-w-36",
      cell: (t) => <TicketStatus s={t.status} c={c} />,
    },
  ];

  return (
    <div className="grid gap-5 pb-24 lg:pb-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-h2">{c.title}</h1>
          <p className="text-body text-fg-muted">{c.lede}</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Icon name="plus" size={16} aria-hidden />
          {c.newTicket}
        </Button>
      </header>
      <label className="relative block max-w-sm">
        <span className="sr-only">{c.search}</span>
        <Icon
          name="search"
          size={16}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle"
        />
        <Input
          type="search"
          value={q}
          placeholder={c.search}
          className="pl-9"
          onChange={(e) => setUrlParams({ q: e.target.value || null })}
        />
      </label>
      <Tabs
        value={p.get("tab") === "register" ? "register" : tab}
        onChange={(id) =>
          setUrlParams({ tab: id === "complaints" ? null : id })
        }
        tabs={TABS.map((id) => ({
          id,
          label: c.tabs[id],
          count: id === "resolved" ? undefined : counts?.[id],
          content:
            id !== tab ? null : (
              <div className="grid gap-2 pt-3">
                <OpsTable
                  label={c.table}
                  rows={items}
                  columns={cols}
                  rowKey={(t) => t.ref}
                  loading={data.isPending}
                  error={data.isError ? data.error : undefined}
                  onRetry={() => data.refetch()}
                  empty={
                    <EmptyPanel
                      title={q ? c.noMatch.replace("{q}", q) : c.empty[tab]}
                      compact={!!q}
                    />
                  }
                  focused={focused}
                  onFocus={setFocused}
                  onOpen={open}
                  shortcuts
                  rowTone={(t) =>
                    isOpen(t) && t.status === "escalated" ? "danger" : null
                  }
                  renderCard={(t) => (
                    <>
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{t.ref}</span>
                        <TicketStatus s={t.status} c={c} />
                      </span>
                      <span className="text-small">
                        {t.client} · {c.category[t.category]}
                      </span>
                      <span className="flex flex-wrap items-center gap-2">
                        <Chip tone={PRIO_TONE[t.priority]}>
                          {c.priority[t.priority]}
                        </Chip>
                        <SlaChip
                          due={t.responseDueAt}
                          firstResponse={!t.responded}
                          done={!isOpen(t)}
                        />
                      </span>
                    </>
                  )}
                />
                {!data.isPending && !data.isError && (
                  <p className="text-small text-fg-muted" aria-live="polite">
                    {c.showing
                      .replace("{n}", String(items.length))
                      .replace("{t}", String(data.data?.items.length ?? 0))}
                  </p>
                )}
              </div>
            ),
        })).concat([{ id: "register", label: c.register.tab, count: undefined, content: p.get("tab") === "register" ? <Register /> : null }])}
      />
      <NewTicketDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => setUrlParams({ tab: null })}
      />
    </div>
  );
}

function NewTicketDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { c } = useT();
  const toast = useToast();
  const m = useNewTicket();
  const [kind, setKind] = useState<Ticket["kind"]>("complaint");
  const [category, setCategory] = useState<Ticket["category"]>("delay");
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<{ ref?: string; note?: string }>({});
  const submit = () => {
    const e = {
      ref: /^HBZ-[A-Z0-9]{6,7}$/i.test(ref.trim()) ? undefined : c.caseErr,
      note: note.trim() ? undefined : c.noteErr,
    };
    setErr(e);
    if (e.ref || e.note) return;
    m.mutate(
      { kind, category, caseRef: ref.trim().toUpperCase(), note: note.trim() },
      {
        onSuccess: () => {
          toast({ title: c.created, tone: "success" });
          setRef("");
          setNote("");
          onCreated();
          onClose();
        },
        onError: (x) =>
          toast({
            title: c.failed,
            body: String((x as Error).message),
            tone: "danger",
          }),
      },
    );
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={c.newTitle}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button loading={m.isPending} onClick={submit}>
            {c.newTicket}
          </Button>
        </div>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => (e.preventDefault(), submit())}
      >
        <Field label={c.kindLabel}>{(f) => (
<Select id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined}
            value={kind}
            onChange={(e) => setKind(e.target.value as Ticket["kind"])}
          >
            {(["complaint", "dispute", "enquiry"] as const).map((k) => (
              <option key={k} value={k}>
                {c.kind[k]}
              </option>
            ))}
          </Select>
)}</Field>
        <Field label={c.cols.category}>{(f) => (
<Select id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined}
            value={category}
            onChange={(e) => setCategory(e.target.value as Ticket["category"])}
          >
            {(Object.keys(c.category) as Ticket["category"][]).map((k) => (
              <option key={k} value={k}>
                {c.category[k]}
              </option>
            ))}
          </Select>
)}</Field>
        <Field label={c.caseLabel} error={err.ref}>{(f) => (
<Input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined}
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="HBZ-4K2M9Q"
            autoCapitalize="characters"
          />
)}</Field>
        <Field label={c.noteLabel} error={err.note}>{(f) => (
<Textarea id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
)}</Field>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------- TK2 detail
type Modal = null | "call" | "refund" | "reassign" | "escalate" | "resolve";
type RegRow = { source: "ops" | "chat" | "help_desk" | "website"; ref: string; kind: string; subject: string; client: string; caseRef: string | null; status: string; at: string; href: string | null };
/** F-FBK-03/04/05: every complaint channel in one register (ops, chat disputes, help desk, website enquiries). */
function Register() {
  const { c, locale } = useT();
  const r = c.register;
  const q = useQuery({
    queryKey: ["ops", "register"],
    queryFn: () => unwrap<{ items: RegRow[] }>(api.GET("/api/admin/ops/register")).then((d) => d.items),
  });
  if (q.isPending) return <div className="pt-3"><Skeleton className="h-24 w-full" /></div>;
  if (q.isError) return <div className="pt-3"><PanelError what={r.tab} onRetry={() => void q.refetch()} /></div>;
  if (!q.data.length) return <div className="pt-3"><EmptyPanel compact title={r.empty} /></div>;
  return (
    <div className="overflow-x-auto pt-3">
      <table className="w-full min-w-[40rem] text-small">
        <thead className="text-left text-fg-subtle"><tr className="border-b border-border">
          <th className="p-2">{r.cols.ref}</th><th className="p-2">{r.cols.source}</th><th className="p-2">{r.cols.kind}</th>
          <th className="p-2">{r.cols.subject}</th><th className="p-2">{r.cols.client}</th><th className="p-2">{r.cols.status}</th><th className="p-2">{r.cols.at}</th>
        </tr></thead>
        <tbody>
          {q.data.map((x) => (
            <tr key={`${x.source}:${x.ref}`} className="border-b border-border last:border-0">
              <td className="p-2 font-mono">{x.href ? <a className="underline" href={localHref(locale, x.href)}>{x.ref}</a> : x.ref}{x.caseRef ? <span className="block text-fg-subtle">{x.caseRef}</span> : null}</td>
              <td className="p-2">{r.sources[x.source]}</td>
              <td className="p-2">{r.kinds[x.kind] ?? x.kind}</td>
              <td className="p-2">{x.subject}</td>
              <td className="p-2">{x.client}</td>
              <td className="p-2">{x.status === "resolved" ? r.resolved : r.open}</td>
              <td className="p-2 tabular">{formatDate(x.at, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TicketView({ ticketRef }: { ticketRef: string }) {
  const { c, locale } = useT();
  const q = useTicket(ticketRef);
  const t = q.data;
  if (q.isPending)
    return (
      <div className="grid gap-4 pb-24 lg:pb-8" aria-busy>
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96" />
      </div>
    );
  if (q.isError || !t)
    return (
      <div className="grid gap-4 pb-24 lg:pb-8">
        <BackLink c={c} locale={locale} />
        {/not.?found/i.test(String(q.error)) ? (
          <EmptyPanel title={c.notFound} />
        ) : (
          <PanelError what={c.loadErrDetail} onRetry={() => q.refetch()} />
        )}
      </div>
    );
  return <TicketBody t={t} />;
}
const BackLink = ({
  c,
  locale,
}: {
  c: TicketsCopy;
  locale: Parameters<typeof localHref>[0];
}) => (
  <Link
    href={localHref(locale, "/ops/tickets")}
    className="inline-flex w-fit items-center gap-1.5 text-small text-fg-muted hover:text-fg"
  >
    <Icon name="arrowRight" size={14} aria-hidden className="rotate-180" />
    {c.back}
  </Link>
);

function TicketBody({ t }: { t: TicketDetail }) {
  const { c, locale } = useT();
  const toast = useToast();
  const act = useTicketAction({ ref: t.ref, disputeId: t.disputeId });
  const { request, reset, dialog } = useStepUp();
  const now = useNow(60_000);
  const [modal, setModal] = useState<Modal>(null);
  const [tab, setTab] = useState("conversation");
  const [internal, setInternal] = useState(false);
  const [draft, setDraft] = useState("");
  const open = isOpen(t);
  const overdue =
    now && open && !t.responded ? now - Date.parse(t.responseDueAt) : 0;
  const escalatedAt = t.escalatedAt;
  const refund = t.refundRequest;

  const run = (a: TicketAction, done: string, undo?: TicketAction) =>
    act.mutateAsync(a).then(
      () => {
        toast({
          title: done,
          tone: "success",
          action: undo
            ? {
                label: c.undo,
                onClick: () =>
                  act.mutate(undo, {
                    onSuccess: () => toast({ title: c.reopened }),
                  }),
              }
            : undefined,
        });
        setModal(null);
        return true;
      },
      (e: Error) => {
        toast({ title: c.failed, body: errorCopy(e, locale), tone: "danger" });
        return false;
      },
    );
  const respond = () => {
    setTab("conversation");
    setInternal(false);
    requestAnimationFrame(() => document.getElementById("tk-compose")?.focus());
  };
  const sendMsg = async () => {
    const body = draft.trim();
    if (!body) return;
    if (
      await run(
        { action: "message", body, internal },
        internal ? c.sendNote : c.sendReply,
      )
    )
      setDraft("");
  };
  const refundFlow = async (amount: number, reason: string) => {
    try {
      const token = await request(c.proposeRefund);
      const okd = await run(
        { action: "refund", amount, reason, stepUp: token },
        c.refundDone,
      );
      if (!okd) reset();
    } catch (e) {
      if (!(e instanceof StepUpCancelled)) throw e;
    }
  };
  useShortcut("r", c.respond, respond, "case", open);
  useShortcut(
    "e",
    c.escalate,
    () => setModal("escalate"),
    "case",
    open && !escalatedAt,
  );

  const resolveBlocked = !t.responded ? c.resolveNeedsReply : null;
  const actions: {
    label: string;
    onClick: () => void;
    reason?: string | null;
    primary?: boolean;
  }[] = [
    { label: c.respond, onClick: respond, primary: true },
    { label: c.logCall, onClick: () => setModal("call") },
    {
      label: c.proposeRefund,
      onClick: () => setModal("refund"),
      reason: refund
        ? c.refundPending
            .replace("{s}", refund.status)
            .replace("{n}", formatMoney(refund.amount, "RWF", locale))
        : !t.paid
          ? c.refundNone
          : null,
    },
    {
      label: c.apology,
      onClick: () => run({ action: "credit" }, c.apologyDone),
      reason: t.credits ? c.apologyGiven : null,
    },
    { label: c.reassign, onClick: () => setModal("reassign") },
    {
      label: c.escalate,
      onClick: () => setModal("escalate"),
      reason: escalatedAt ? c.escalated : null,
    },
    {
      label: c.resolve,
      onClick: () => setModal("resolve"),
      reason: resolveBlocked,
    },
  ];

  return (
    <div className="grid gap-4 pb-24 lg:pb-8">
      <BackLink c={c} locale={locale} />
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-h3">{t.ref}</h1>
        <SlaChip
          due={t.responseDueAt}
          firstResponse={!t.responded}
          done={!open}
        />
        <TicketStatus s={t.status} c={c} />
        <span className="text-small text-fg-muted">
          {c.kind[t.kind]} · {c.category[t.category]}
        </span>
      </header>

      {overdue > 0 && (
        <div
          role="alert"
          className="grid gap-2 border border-danger/25 bg-danger-bg p-4"
        >
          <p className="flex items-center gap-2 font-medium text-danger">
            <Icon name="zap" size={18} aria-hidden />
            {c.breached.replace("{d}", formatDuration(overdue))}
          </p>
          {escalatedAt && (
            <p className="flex items-center gap-2 text-small">
              <Icon name="megaphone" size={16} aria-hidden />
              {c.autoEscalated} · {formatDateTime(escalatedAt, locale)}
            </p>
          )}
        </div>
      )}

      {t.status === "confirming" && (
        <ConfirmLoop
          c={c}
          onAnswer={(okd, score) =>
            run(
              { action: "confirm", ok: okd, score },
              okd ? c.resolved : c.reopened,
            )
          }
        />
      )}

      {/* PK2: the three phone actions sit under the header */}
      {open && (
        <div className="flex gap-2 md:hidden">
          <Button size="sm" onClick={respond}>
            {c.respond}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setModal("call")}>
            {c.logCall}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!!resolveBlocked}
            title={resolveBlocked ?? undefined}
            onClick={() => setModal("resolve")}
          >
            {c.resolve}
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem_15rem]">
        <Panel padded={false}>
          <Tabs
            value={tab}
            onChange={setTab}
            className="px-2"
            tabs={[
              {
                id: "conversation",
                label: c.tabsDetail.conversation,
                content: (
                  <div className="grid gap-3 p-4">
                    <ol className="grid gap-3" aria-live="polite">
                      {t.messages.map((m) => (
                        <li key={m.id} className="flex gap-3">
                          <Face name={m.author} />
                          <div className="grid min-w-0 gap-1">
                            <p className="flex flex-wrap items-center gap-2 text-eyebrow text-fg-muted">
                              {m.author} ·{" "}
                              {formatDate(m.at, locale, { timeStyle: "short" })}
                              {m.internal && <LockLabel />}
                            </p>
                            {m.kind === "call" ? (
                              <p className="flex items-center gap-2 text-small">
                                <Icon name="phone" size={14} aria-hidden />
                                {c.call
                                  .replace("{d}", `${m.body} min`)
                                  .replace(
                                    "{t}",
                                    formatDate(m.at, locale, {
                                      timeStyle: "short",
                                    }),
                                  )}
                              </p>
                            ) : (
                              <p
                                className={cx(
                                  "w-fit max-w-prose px-3 py-2 text-small break-words",
                                  m.internal
                                    ? "border border-dashed border-warning/50 bg-warning-bg"
                                    : "bg-bg-subtle",
                                )}
                              >
                                {m.body}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                    {open && (
                      <form
                        className="grid gap-2 border-t border-border pt-3"
                        onSubmit={(e) => (e.preventDefault(), sendMsg())}
                      >
                        <div
                          role="radiogroup"
                          aria-label={c.addNote}
                          className="flex gap-2"
                        >
                          {[false, true].map((v) => (
                            <button
                              key={String(v)}
                              type="button"
                              role="radio"
                              aria-checked={internal === v}
                              onClick={() => setInternal(v)}
                              className={cx(
                                "h-8 px-3 text-small",
                                internal === v
                                  ? v
                                    ? "bg-warning-bg text-warning"
                                    : "bg-secondary text-on-secondary"
                                  : "text-fg-muted hover:bg-navy-50",
                              )}
                            >
                              {v ? c.internalNote : c.replyToClient}
                            </button>
                          ))}
                        </div>
                        <label className="sr-only" htmlFor="tk-compose">
                          {c.addNote}
                        </label>
                        <Textarea
                          id="tk-compose"
                          rows={2}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          placeholder={c.addNote}
                          className={cx(
                            internal && "border-warning/50 bg-warning-bg/40",
                          )}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          className="justify-self-end"
                          loading={act.isPending}
                          disabled={!draft.trim()}
                        >
                          {internal ? c.sendNote : c.sendReply}
                        </Button>
                      </form>
                    )}
                  </div>
                ),
              },
              {
                id: "files",
                label: c.tabsDetail.files,
                count: t.files.length,
                content: (
                  <div className="p-4">
                    {t.files.length ? (
                      <ul className="grid gap-2">
                        {t.files.map((f) => (
                          <li
                            key={f.name}
                            className="flex items-center gap-2 text-small"
                          >
                            <Icon name="file" size={16} aria-hidden />
                            {f.name}
                            <span className="text-fg-muted">{f.size}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <EmptyPanel compact title={c.noFiles} />
                    )}
                  </div>
                ),
              },
              {
                id: "activity",
                label: c.tabsDetail.activity,
                content: (
                  <ol className="grid gap-2 p-4 text-small">
                    {t.activity.map((a, i) => (
                      <li key={i} className="flex flex-wrap gap-x-2">
                        <span className="text-fg-muted">
                          {formatDateTime(a.at, locale)}
                        </span>
                        {a.text}
                      </li>
                    ))}
                  </ol>
                ),
              },
            ]}
          />
        </Panel>

        <div className="grid content-start gap-4">
          <Panel title={c.linkedCase}>
            <CopyRef value={t.caseRef} />
            <p className="mt-1 text-small text-fg-muted">{t.service}</p>
            <p className="mt-2 flex items-center gap-2 text-small">
              <Face name={t.owner.name} />
              {t.owner.name}
            </p>
            <p className="mt-2 text-small">{t.client}</p>
            {t.satisfaction !== null && (
              <p className="mt-2 text-small font-medium">
                {c.satisfaction.replace("{n}", String(t.satisfaction))}
              </p>
            )}
          </Panel>
          <Panel title={c.history.replace("{n}", String(t.history.length))}>
            {t.history.length ? (
              <ul className="grid gap-2 text-small">
                {t.history.map((h) => (
                  <li
                    key={h.ref}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <Link
                      href={localHref(locale, `/ops/tickets/${h.ref}`)}
                      className="underline underline-offset-4"
                    >
                      {h.ref}
                    </Link>
                    <TicketStatus s={h.status} c={c} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-small text-fg-muted">{c.noHistory}</p>
            )}
          </Panel>
        </div>

        <Panel title={c.actions} className={cx(!open && "opacity-80")}>
          <ul className="grid gap-2">
            {actions.map((a, ai) => (
              <li key={a.label} className="grid gap-1">
                <Button
                  size="sm"
                  variant={a.primary ? "primary" : "outline"}
                  className="h-auto min-h-9 w-full justify-start py-2 text-left whitespace-normal"
                  disabled={!open || !!a.reason}
                  onClick={a.onClick}
                  aria-describedby={
                    a.reason ? `why-${ai}` : undefined
                  }
                >
                  {a.label}
                </Button>
                {a.reason && open && (
                  <span
                    id={`why-${ai}`}
                    className="text-eyebrow text-fg-muted"
                  >
                    {a.reason}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {!open && t.status === "resolved" && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-3 w-full"
              onClick={() => run({ action: "reopen" }, c.reopened)}
            >
              {c.reopen}
            </Button>
          )}
        </Panel>
      </div>

      <CallDialog
        open={modal === "call"}
        c={c}
        onClose={() => setModal(null)}
        onSave={(min) =>
          run(
            {
              action: "message",
              body: String(min),
              internal: true,
              kind: "call",
            },
            c.callSaved,
          )
        }
      />
      <RefundDialog
        open={modal === "refund"}
        c={c}
        paid={t.paid}
        locale={locale}
        onClose={() => setModal(null)}
        onSave={refundFlow}
      />
      <ReassignDialog
        open={modal === "reassign"}
        c={c}
        current={t.owner.id}
        onClose={() => setModal(null)}
        onSave={(id, name) =>
          run(
            { action: "reassign", agentId: id },
            c.reassigned.replace("{n}", name),
            { action: "reassign", agentId: t.owner.id },
          )
        }
      />
      <EscalateDialog
        open={modal === "escalate"}
        c={c}
        onClose={() => setModal(null)}
        onSave={(note) => run({ action: "escalate", note }, c.escalateDone)}
      />
      <ResolveDialog
        open={modal === "resolve"}
        c={c}
        onClose={() => setModal(null)}
        onSave={(r) =>
          run(
            { action: "resolve", ...r },
            r.askConfirm ? c.sentForConfirm : c.resolved,
            { action: "reopen" },
          )
        }
      />
      {dialog}
    </div>
  );
}

function ConfirmLoop({
  c,
  onAnswer,
}: {
  c: TicketsCopy;
  onAnswer: (ok: boolean, score: number | null) => void;
}) {
  const [score, setScore] = useState("5");
  return (
    <section
      aria-label={c.recordReply}
      className="flex flex-wrap items-end gap-3 border border-info/25 bg-info-bg p-4"
    >
      <p className="w-full text-small font-medium">{c.confirming}</p>
      <Field label={c.score} className="w-32">{(f) => (
<Select id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} value={score} onChange={(e) => setScore(e.target.value)}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </Select>
)}</Field>
      <Button size="sm" onClick={() => onAnswer(true, Number(score))}>
        {c.clientOk}
      </Button>
      <Button size="sm" variant="outline" onClick={() => onAnswer(false, null)}>
        {c.clientNotOk}
      </Button>
    </section>
  );
}

type DlgProps<A extends unknown[]> = {
  open: boolean;
  c: TicketsCopy;
  onClose: () => void;
  onSave: (...a: A) => unknown;
};
function Footer({
  c,
  onClose,
  label,
  onSave,
  busy,
}: {
  c: TicketsCopy;
  onClose: () => void;
  label: string;
  onSave: () => void;
  busy?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={onClose}>
        {c.cancel}
      </Button>
      <Button loading={busy} onClick={onSave}>
        {label}
      </Button>
    </div>
  );
}
function CallDialog({ open, c, onClose, onSave }: DlgProps<[number]>) {
  const [min, setMin] = useState("4");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={c.logCall}
      footer={
        <Footer
          c={c}
          onClose={onClose}
          label={c.logCall}
          onSave={() => Number(min) > 0 && onSave(Number(min))}
        />
      }
    >
      <Field label={c.callMinutes}>{(f) => (
<Input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined}
          type="number"
          min={1}
          value={min}
          onChange={(e) => setMin(e.target.value)}
        />
)}</Field>
    </Dialog>
  );
}
function RefundDialog({
  open,
  c,
  paid,
  locale,
  onClose,
  onSave,
}: DlgProps<[number, string]> & {
  paid: number;
  locale: Parameters<typeof formatMoney>[2];
}) {
  const [amount, setAmount] = useState("20000");
  const [reason, setReason] = useState("");
  const n = Number(amount);
  const err =
    n > paid
      ? c.refundOver.replace("{n}", formatMoney(paid, "RWF", locale))
      : undefined;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={c.proposeRefund}
      description={c.refundNote}
      footer={
        <Footer
          c={c}
          onClose={onClose}
          label={c.refundCreate}
          onSave={() =>
            n > 0 && !err && reason.trim() && onSave(n, reason.trim())
          }
        />
      }
    >
      <div className="grid gap-4">
        <Field label={c.refundAmount} error={err}>{(f) => (
<Input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined}
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
)}</Field>
        <Field label={c.refundReason}>{(f) => (
<Textarea id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined}
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
)}</Field>
      </div>
    </Dialog>
  );
}
function ReassignDialog({
  open,
  c,
  current,
  onClose,
  onSave,
}: DlgProps<[string, string]> & { current: string }) {
  const agents = useWorkload(0).data?.agents ?? [];
  const others = agents.filter((a) => a.id !== current);
  const [picked, setId] = useState("");
  const id = picked || (others[0]?.id ?? "");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={c.reassign}
      footer={
        <Footer
          c={c}
          onClose={onClose}
          label={c.reassign}
          onSave={() =>
            onSave(id, agents.find((a) => a.id === id)?.name ?? id)
          }
        />
      }
    >
      <Field label={c.reassignTo}>{(f) => (
<Select id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} value={id} onChange={(e) => setId(e.target.value)}>
          {others.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
)}</Field>
    </Dialog>
  );
}
function EscalateDialog({ open, c, onClose, onSave }: DlgProps<[string]>) {
  const [note, setNote] = useState("");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={c.escalateTitle}
      footer={
        <Footer
          c={c}
          onClose={onClose}
          label={c.confirmEscalation}
          onSave={() => onSave(note.trim())}
        />
      }
    >
      <Field label={c.escalateNote}>{(f) => (
<Textarea id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined}
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
)}</Field>
    </Dialog>
  );
}
function ResolveDialog({
  open,
  c,
  onClose,
  onSave,
}: DlgProps<
  [
    {
      summary: string;
      resolutionKind: string;
      rootCause: string;
      preventive: string;
      askConfirm: boolean;
    },
  ]
>) {
  const [summary, setSummary] = useState("");
  const [rootCause, setRootCause] = useState("agent_delay");
  const [kind, setKind] = useState("fixed");
  const [preventive, setPreventive] = useState("");
  const [askConfirm, setAsk] = useState(true);
  const [err, setErr] = useState<string>();
  const save = () => {
    if (!summary.trim()) return setErr(c.summaryErr);
    setErr(undefined);
    onSave({
      summary: summary.trim(),
      resolutionKind: kind,
      rootCause,
      preventive: preventive.trim(),
      askConfirm,
    });
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={c.resolveTitle}
      footer={
        <Footer c={c} onClose={onClose} label={c.resolve} onSave={save} />
      }
    >
      <div className="grid gap-4">
        <Field label={`${c.summary} *`} error={err}>{(f) => (
<Textarea id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined}
            rows={2}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
)}</Field>
        <Field label={c.resolutionKind}>{(f) => (
          <Select id={f.id} aria-describedby={f.describedBy} value={kind} onChange={(e) => setKind(e.target.value)}>
            {Object.entries(c.resolutionKinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        )}</Field>
        <Field label={c.rootCause}>{(f) => (
<Select id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined}
            value={rootCause}
            onChange={(e) => setRootCause(e.target.value)}
          >
            {Object.entries(c.rootCauses).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
)}</Field>
        <Field label={c.preventive}>{(f) => (
<Textarea id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined}
            rows={2}
            value={preventive}
            onChange={(e) => setPreventive(e.target.value)}
          />
)}</Field>
        <Switch
          label={c.askConfirm}
          checked={askConfirm}
          onChange={(e) => setAsk(e.target.checked)}
        />
      </div>
    </Dialog>
  );
}
