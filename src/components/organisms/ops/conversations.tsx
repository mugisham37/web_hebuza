"use client";
import { useSession } from "@/lib/auth/session";
// U15 Conversations console (board 15): CV1 3-pane inbox, CV2 templates, CV3 staff DM + @mentions, CV4 transcript export, PV1 phone.
// URL: ?f=<filter>&c=<conversation id>&lane=client|internal&q=. Phones show the list, then the thread full-width.
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { api, ApiError, unwrap } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { bk, idem, useHandoffs } from "@/lib/booking/api";
import { formatDay, formatTime } from "@/shared/booking/rules";
import { AiLabel, fill, useBkg } from "@/components/atoms/booking";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx, formatDate } from "@/shared/format";
import { formatDuration } from "@/lib/ops/sla";
import { useShortcut } from "@/lib/ops/shortcuts";
import {
  useConv,
  useConvs,
  useConvCounts,
  useThread,
  useChatMetrics,
  useTemplates,
  useMentionCandidates,
  useSendMsg,
  useClaim,
  renderTemplate,
  downloadTranscript,
  replySla,
  type AdminConv,
  type ConvFilter,
  type ChatMsg,
  type Template,
  dKeys,
} from "@/lib/ops/d";
import {
  opsConversations,
  type ConversationsCopy,
} from "@/content/pages/ops-conversations";
import { usePhone, useStepUp, useNow, StepUpCancelled } from "@/components/atoms/step-up";
import { LockLabel, CountBadge } from "@/components/atoms/ops";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import {
  Field,
  Input,
  Textarea,
  DateInput,
  Switch,
  Radio,
} from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { Avatar } from "@/components/atoms/misc";
import { Skeleton } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { complaintCopy } from "@/content/pages/chat-complaint";
import { useConvOp, useDeleteTemplate, useLinkConv, usePinMsg, useRefCandidates, useSaveTemplate, useStartDm, type ConvOp } from "@/lib/chat";
import { useWorkers } from "@/lib/workforce";

const FILTERS: ConvFilter[] = [
  "unassigned",
  "mine",
  "waiting_us",
  "waiting_client",
  "handoff",
  "dms",
];
/** The signed-in staff member's id (claims and message authorship are by id). */
const useMeId = () => useSession().user?.id ?? "";
const useC = () => {
  const { locale } = useI18n();
  return { c: opsConversations(locale), locale };
};
const Face = ({ name }: { name: string }) => (
  <span aria-hidden>
    <Avatar name={name} size="sm" />
  </span>
);

export function SlaBadge({
  since,
  now,
  c,
}: {
  since: string | null;
  now: number;
  c: ConversationsCopy;
}) {
  const s = replySla(since, now);
  if (!s) return null;
  const [tone, text, icon] =
    s.state === "overdue"
      ? [
          "bg-danger-bg text-danger",
          c.overdue.replace("{d}", formatDuration(s.left)),
          "zap" as const,
        ]
      : s.state === "due"
        ? [
            "bg-warning-bg text-warning",
            c.replyDue.replace("{d}", formatDuration(s.left)),
            "clock" as const,
          ]
        : ["bg-success-bg text-success", c.onTrack, "check" as const];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 px-2 py-0.5 text-eyebrow font-medium whitespace-nowrap",
        tone,
      )}
    >
      <Icon name={icon} size={12} aria-hidden />
      {text}
    </span>
  );
}

export function ConversationsConsole() {
  const ME = useMeId();
  const { c, locale } = useC();
  const p = useUrlParams();
  const f = (
    FILTERS.includes(p.get("f") as ConvFilter) ? p.get("f") : "unassigned"
  ) as ConvFilter;
  const q = p.get("q") ?? "";
  const chosen = p.get("c");
  const now = useNow(30_000);
  const phone = usePhone();
  const list = useConvs(f, q);
  const counts = useConvCounts().data;
  const m = useChatMetrics().data;
  const rows = list.data?.conversations ?? [];
  // Desktop opens the first conversation (board CV1); phones keep the list first.
  const first = rows.length ? rows[0].conversation_id : null;
  const id = chosen ?? (phone ? null : first);
  const at = rows.findIndex((r) => r.conversation_id === id);
  const pick = (cid: string | null) => setUrlParams({ c: cid, lane: null });
  const move = (d: 1 | -1) => {
    const r = rows[Math.max(0, Math.min(rows.length - 1, at + d))];
    if (r) pick(r.conversation_id);
  };
  useShortcut("j", "Next conversation", () => move(1), "list");
  useShortcut("k", "Previous conversation", () => move(-1), "list");
  const current = at >= 0 ? rows[at] : null;

  return (
    <div className="grid gap-4 pb-24 lg:pb-8">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-h2">{c.title}</h1>
        {m && (
          <p className="text-small text-fg-muted">
            {c.metrics
              .replace("{w}", String(m.waiting_for_reply))
              .replace("{d}", String(m.open_disputes))
              .replace("{b}", String(m.breached_disputes))}
          </p>
        )}
      </header>
      <div className="grid min-h-[34rem] overflow-hidden border border-border bg-white md:grid-cols-[20rem_minmax(0,1fr)]">
        <section
          aria-label={c.list}
          className={cx(
            "grid content-start border-border md:border-r",
            id && "max-md:hidden",
          )}
        >
          <nav
            aria-label={c.list}
            className="flex flex-wrap gap-1 border-b border-border p-2"
          >
            {FILTERS.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={f === k}
                onClick={() =>
                  setUrlParams({ f: k === "unassigned" ? null : k, c: null })
                }
                className={cx(
                  "inline-flex h-8 items-center gap-1.5 px-3 text-small",
                  f === k
                    ? "bg-secondary font-medium text-on-secondary"
                    : "text-fg-muted hover:bg-navy-50",
                )}
              >
                {c.filters[k]}
                <CountBadge
                  n={counts?.[k] ?? 0}
                  tone={k === "waiting_us" ? "attention" : "neutral"}
                />
              </button>
            ))}
          </nav>
          {f === "dms" && <NewDm onStarted={pick} />}
          <label className="relative block border-b border-border p-2">
            <span className="sr-only">{c.search}</span>
            <Icon
              name="search"
              size={14}
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-fg-subtle"
            />
            <Input
              type="search"
              value={q}
              placeholder={c.search}
              className="h-9 pl-8"
              onChange={(e) => setUrlParams({ q: e.target.value || null })}
            />
          </label>
          {list.isPending ? (
            <div className="grid gap-2 p-3" aria-busy>
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : list.isError ? (
            <div className="p-3">
              <PanelError what={c.loadErr} onRetry={() => list.refetch()} />
            </div>
          ) : !rows.length ? (
            <div className="p-3">
              <EmptyPanel
                compact
                title={q ? c.noMatch.replace("{q}", q) : c.empty[f]}
              />
            </div>
          ) : (
            <ul aria-live="polite">
              {rows.map((r) => (
                <li
                  key={r.conversation_id}
                  className="border-b border-border last:border-b-0"
                >
                  <button
                    type="button"
                    aria-current={r.conversation_id === id || undefined}
                    onClick={() => pick(r.conversation_id)}
                    className={cx(
                      "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-3 py-3 text-left hover:bg-navy-50",
                      r.conversation_id === id &&
                        "bg-bg-tint shadow-[inset_3px_0_0_var(--color-navy-700)]",
                    )}
                  >
                    <Face name={r.title ?? "?"} />
                    <span className="grid min-w-0 gap-1">
                      <span className="truncate text-small font-medium">
                        {r.title}
                      </span>
                      {r.code && (
                        <span className="font-mono text-eyebrow text-fg-muted">
                          {r.code}
                        </span>
                      )}
                      <span className="truncate text-eyebrow text-fg-muted">
                        {r.last_message_preview}
                      </span>
                      <span className="flex flex-wrap gap-1">
                        <SlaBadge since={r.waiting_since} now={now} c={c} />
                        {r.has_dispute && (
                          <span className="bg-danger-bg px-2 py-0.5 text-eyebrow text-danger">
                            {c.dispute}
                          </span>
                        )}
                        {r.claimed_by_name &&
                          r.claimed_by !== ME &&
                          f !== "dms" && (
                            <span className="text-eyebrow text-fg-subtle">
                              {c.claimedBy.replace("{n}", r.claimed_by_name)}
                            </span>
                          )}
                      </span>
                    </span>
                    <span className="grid justify-items-end gap-1 text-eyebrow text-fg-muted">
                      {r.last_message_at
                        ? formatDate(r.last_message_at, locale, {
                            timeStyle: "short",
                          })
                        : null}
                      {r.unread_for_admin > 0 && (
                        <span
                          className="size-2 rounded-full bg-navy-700"
                          aria-label={String(r.unread_for_admin)}
                          role="img"
                        />
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section
          aria-label={current?.title ?? c.pick}
          className={cx("min-w-0", !id && "max-md:hidden")}
        >
          {id ? (
            <Thread
              key={id}
              id={id}
              conv={current}
              dm={f === "dms"}
              now={now}
            />
          ) : (
            <div className="grid h-full place-items-center p-6">
              <EmptyPanel title={c.pick} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- /ops/conversations/[id] (plan 11 §8.2 `ai.handoff` deep link)
export function ConversationPage({ id }: { id: string }) {
  const { c, locale } = useC();
  const now = useNow(30_000);
  const q = useConv(id);
  const back = (
    <Link
      href={localHref(locale, "/ops/conversations")}
      className="inline-flex w-fit items-center gap-1 text-small text-fg-muted hover:text-fg"
    >
      <Icon name="arrowRight" size={14} className="rotate-180" aria-hidden />
      {c.back}
    </Link>
  );
  const err = q.error instanceof ApiError ? q.error : null;
  return (
    <div className="grid gap-4 pb-24 lg:pb-8">
      {back}
      {q.isPending ? (
        <div className="grid gap-3" aria-busy>
          <Skeleton className="h-24" />
          <Skeleton className="h-96" />
        </div>
      ) : err?.isNotFound ? (
        <EmptyPanel title={c.notFound} />
      ) : err?.isForbidden ? (
        <EmptyPanel title={errorCopy(err, locale)} />
      ) : q.isError ? (
        <PanelError what={c.threadErr} onRetry={() => q.refetch()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <section
            aria-label={q.data.title ?? c.pick}
            className="grid min-h-[34rem] min-w-0 overflow-hidden border border-border bg-white"
          >
            <Thread
              id={id}
              conv={q.data}
              dm={q.data.kind === "staff_dm"}
              now={now}
              standalone
            />
          </section>
          <HandoffSummaryCard conversationId={id} />
        </div>
      )}
    </div>
  );
}

/** Plan 11 F-AIA-06: reason, language, labelled AI summary, transcript link, claim. Renders nothing when the thread was not handed off. */
function HandoffSummaryCard({ conversationId }: { conversationId: string }) {
  const { c, locale } = useBkg();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useHandoffs();
  const [busy, setBusy] = useState(false);
  // shortcut: filters the full handoff list client-side; ask for ?conversation_id= when handoff volume grows.
  const h = q.data?.find((x) => x.conversationId === conversationId);
  if (q.isPending)
    return <Skeleton className="h-48" />;
  if (!h) return null; // not a handoff, or not a manager (403): the thread alone is the page
  const claim = async () => {
    setBusy(true);
    try {
      await bk(api.POST("/api/admin/assistant/handoffs/{id}/claim", { params: { path: { id: h.id } }, headers: idem() }));
    } catch (e) {
      toast({ title: errorCopy(e, locale), tone: "danger" });
    }
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["aia"] });
  };
  return (
    <aside className="grid gap-3 border border-border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-label">{c.staff.cTabs.handoffs}</h2>
        <span className="text-eyebrow text-fg-subtle tabular-nums">
          {formatDay(h.at, locale)} {formatTime(h.at, locale)}
        </span>
      </div>
      <p className="text-small text-fg-muted">
        {h.who} · {h.lang.toUpperCase()} · {c.staff.reasonCode}: {h.reason}
      </p>
      <div className="bg-bg-tint p-3 text-small">
        <AiLabel />
        <p className="mt-1">{h.summary}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {h.claimedBy ? (
          <span className="text-small text-fg-muted">
            {fill(c.staff.claimed, { who: h.claimedBy })}
          </span>
        ) : (
          <Button size="sm" loading={busy} onClick={claim}>
            {c.staff.claim}
          </Button>
        )}
        <ButtonLink
          size="sm"
          variant="outline"
          href={localHref(locale, `/ops/assistant/sessions/${h.sessionId}`)}
        >
          {c.staff.viewTranscript}
        </ButtonLink>
      </div>
    </aside>
  );
}

function Thread({
  id,
  conv,
  dm,
  now,
  standalone = false,
}: {
  id: string;
  conv: AdminConv | null;
  dm: boolean;
  now: number;
  standalone?: boolean;
}) {
  const ME = useMeId();
  const { c, locale } = useC();
  const toast = useToast();
  const p = useUrlParams();
  const t = useThread(id);
  const send = useSendMsg(id);
  const claim = useClaim(id);
  const mentions = useMentionCandidates(id).data ?? [];
  const [draft, setDraft] = useState("");
  const [tagged, setTagged] = useState<string[]>([]);
  const [dlg, setDlg] = useState<null | "tpl" | "export">(null);
  const writeLanes = t.data?.write_lanes ?? [];
  const lane = dm
    ? "internal"
    : p.get("lane") === "internal"
      ? "internal"
      : "client";
  const canWrite = writeLanes.includes(lane);
  const claimedBy = conv?.claimed_by ?? null;
  const claimedName = conv?.claimed_by_name ?? "";
  const otherOwner = !!claimedBy && claimedBy !== ME;
  const title = conv?.title ?? "";
  const code = conv?.code ?? null;
  const since = conv?.waiting_since ?? null;
  const at = /@(\w*)$/.exec(draft);
  const hash = /#([\w-]*)$/.exec(draft);
  const refs = (useRefCandidates(id, hash ? hash[1] : null).data ?? []).slice(0, 5);
  const suggest =
    lane === "internal" && at
      ? mentions
          .filter((x) => x.name.toLowerCase().startsWith(at[1].toLowerCase()))
          .slice(0, 5)
      : [];

  const doClaim = () =>
    claim.mutate(undefined, {
      onSuccess: () => toast({ title: c.claimed, tone: "success" }),
      onError: (e) => toast({ title: (e as Error).message, tone: "danger" }),
    });
  const submit = () => {
    const content = draft.trim();
    if (!content || !canWrite) return;
    send.mutate(
      {
        content,
        lane,
        mentions: tagged.filter((u) =>
          content.includes(
            `@${mentions.find((x) => x.user_id === u)?.name.split(" ")[0]}`,
          ),
        ),
      },
      {
        onSuccess: () => {
          setDraft("");
          setTagged([]);
        },
        onError: () => toast({ title: c.sendFailed, tone: "danger" }),
      },
    );
  };
  useShortcut("c", c.claim, doClaim, "case", !dm && !claimedBy);

  return (
    <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto]">
      <header className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        {!standalone && (
          <button
            type="button"
            onClick={() => setUrlParams({ c: null, lane: null })}
            aria-label={c.back}
            className="inline-flex size-9 items-center justify-center hover:bg-navy-50 md:hidden"
          >
            <Icon
              name="arrowRight"
              size={16}
              aria-hidden
              className="rotate-180"
            />
          </button>
        )}
        <div className="grid min-w-0 flex-1">
          <h2 className="truncate text-label-lg">{title}</h2>
          <p className="text-eyebrow text-fg-muted">
            {code ?? c.dmOnline}
            {!standalone && !dm && (
              <>
                {" · "}
                <Link
                  href={localHref(locale, `/ops/conversations/${id}`)}
                  className="text-link underline-offset-2 hover:underline"
                >
                  {c.openFull}
                </Link>
              </>
            )}
          </p>
        </div>
        <SlaBadge since={since} now={now} c={c} />
        {!dm && !claimedBy && (
          <Button size="sm" loading={claim.isPending} onClick={doClaim}>
            {c.claim}
          </Button>
        )}
        {!dm && otherOwner && (
          <span className="text-eyebrow text-fg-muted">
            {c.claimOther.replace("{n}", claimedName)}
          </span>
        )}
        {!dm && (
          <Button size="sm" variant="outline" onClick={() => setDlg("export")}>
            <Icon name="file" size={14} aria-hidden />
            <span className="max-sm:sr-only">{c.exportTranscript}</span>
          </Button>
        )}
        {!dm && <ComplaintButton id={id} />}
        {!dm && <ConvMenu id={id} linked={!!code} />}
      </header>

      <div
        className="overflow-y-auto p-3"
        tabIndex={0}
        role="region"
        aria-label={title}
      >
        {t.isPending ? (
          <div className="grid gap-3" aria-busy>
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-2/3" />
            ))}
          </div>
        ) : t.isError ? (
          <PanelError what={c.threadErr} onRetry={() => t.refetch()} />
        ) : (
          <ol role="log" className="grid gap-3">
            {(t.data?.messages ?? []).map((m) => (
              <Bubble key={m.message_id} m={m} c={c} locale={locale} tKey={dKeys.thread(id)} />
            ))}
          </ol>
        )}
      </div>

      <form
        className="grid gap-2 border-t border-border p-3"
        onSubmit={(e) => (e.preventDefault(), submit())}
      >
        {!dm && (
          <div
            role="radiogroup"
            aria-label={c.lane.client}
            className="flex flex-wrap items-center gap-2"
          >
            {(["client", "internal"] as const).map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={lane === l}
                onClick={() =>
                  setUrlParams({ lane: l === "client" ? null : l })
                }
                className={cx(
                  "inline-flex h-8 items-center gap-1 px-3 text-small",
                  lane === l
                    ? l === "internal"
                      ? "bg-warning-bg font-medium text-warning"
                      : "bg-secondary font-medium text-on-secondary"
                    : "text-fg-muted hover:bg-navy-50",
                )}
              >
                {c.lane[l]}
                {l === "internal" && <Icon name="lock" size={12} aria-hidden />}
              </button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="ml-auto"
              disabled={lane !== "client"}
              onClick={() => setDlg("tpl")}
            >
              {c.templates}
            </Button>
          </div>
        )}
        {!canWrite && !t.isPending && (
          <p className="text-small text-fg-muted">{c.readOnly}</p>
        )}
        <div className="relative">
          <label htmlFor="cv-compose" className="sr-only">
            {dm ? c.composer.dm : c.composer[lane]}
          </label>
          <Textarea
            id="cv-compose"
            rows={2}
            value={draft}
            disabled={!canWrite}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={dm ? c.composer.dm : c.composer[lane]}
            aria-describedby={
              lane === "internal" ? "cv-mention-hint" : undefined
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            className={cx(
              lane === "internal" &&
                !dm &&
                "border-dashed border-warning/60 bg-warning-bg/40",
            )}
          />
          {!suggest.length && hash && refs.length > 0 && (
            <ul aria-label={c.refList} className="absolute bottom-full left-0 z-10 mb-1 grid min-w-48 border border-border bg-white p-1 shadow-lg">
              {refs.map((x) => (
                <li key={x.ref}>
                  <button
                    type="button"
                    className="flex h-9 w-full items-center px-2 text-left text-small hover:bg-navy-50"
                    onClick={() => setDraft(draft.replace(/#[\w-]*$/, `#${x.ref} `))}
                  >
                    <span className="truncate">{x.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {suggest.length > 0 && (
            <ul
              aria-label={c.mentionList}
              className="absolute bottom-full left-0 z-10 mb-1 grid min-w-48 border border-border bg-white p-1 shadow-lg"
            >
              {suggest.map((s) => (
                <li key={s.user_id}>
                  <button
                    type="button"
                    className="flex h-9 w-full items-center gap-2 px-2 text-left text-small hover:bg-navy-50"
                    onClick={() => {
                      setDraft(
                        draft.replace(/@\w*$/, `@${s.name.split(" ")[0]} `),
                      );
                      setTagged([...tagged, s.user_id]);
                    }}
                  >
                    <Face name={s.name} />
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          {lane === "internal" ? (
            <span id="cv-mention-hint" className="text-eyebrow text-fg-subtle">
              {c.mentionHint}
            </span>
          ) : (
            <span />
          )}
          <Button
            type="submit"
            size="sm"
            loading={send.isPending}
            disabled={!canWrite || !draft.trim()}
          >
            {c.send}
          </Button>
        </div>
      </form>

      <TemplatePicker
        open={dlg === "tpl"}
        id={id}
        onClose={() => setDlg(null)}
        onInsert={(body) => {
          setDraft(body);
          setDlg(null);
        }}
      />
      <TranscriptExport
        open={dlg === "export"}
        id={id}
        onClose={() => setDlg(null)}
      />
    </div>
  );
}

const withMentions = (s: string): ReactNode[] =>
  s.split(/(@\w+)/g).map((part, i) =>
    part.startsWith("@") ? (
      <strong key={i} className="text-link">
        {part}
      </strong>
    ) : (
      part
    ),
  );
function Bubble({
  m,
  c,
  locale,
  tKey,
}: {
  m: ChatMsg;
  c: ConversationsCopy;
  locale: Parameters<typeof formatDate>[1];
  tKey: readonly unknown[];
}) {
  const ME = useMeId();
  const pin = usePinMsg(tKey);
  const pinned = !!m.pinned_at;
  const time = formatDate(m.created_at, locale, { timeStyle: "short" });
  if (m.is_system)
    return (
      <li className="mx-auto w-fit bg-ink-100 px-3 py-1 text-eyebrow text-fg-muted">
        {m.content} · {time}
      </li>
    );
  const mine = m.sender_id === ME;
  const note = m.lane === "internal";
  return (
    <li className={cx("flex gap-2", mine && "flex-row-reverse")}>
      <Face name={m.sender_name ?? "?"} />
      <div
        className={cx(
          "grid max-w-[85%] gap-1 px-3 py-2 text-small",
          note
            ? "border border-dashed border-warning/50 bg-warning-bg"
            : mine
              ? "theme-dark bg-navy-700 text-fg"
              : "bg-ink-100 text-fg",
        )}
      >
        <p className="flex flex-wrap items-center gap-2 text-eyebrow text-fg-muted">
          {mine ? c.you : m.sender_name} · {time}
          {note && <LockLabel />}
          {pinned && <span className="font-medium text-fg">{c.pinned}</span>}
          <button
            type="button"
            aria-pressed={pinned}
            disabled={pin.isPending}
            onClick={() => pin.mutate({ id: m.message_id, on: !pinned })}
            className="ml-auto underline-offset-2 hover:underline"
          >
            {pinned ? c.unpin : c.pin}
          </button>
        </p>
        <p className="break-words whitespace-pre-line">
          {withMentions(m.content)}
        </p>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------- CV2 templates
const LANGS = ["rw", "en", "fr"] as const;
function TemplatePicker({
  open,
  id,
  onClose,
  onInsert,
}: {
  open: boolean;
  id: string;
  onClose: () => void;
  onInsert: (b: string) => void;
}) {
  const { c, locale } = useC();
  const toast = useToast();
  const q = useTemplates();
  const list = q.data ?? [];
  const [sel, setSel] = useState<string | null>(null);
  const [lang, setLang] = useState<(typeof LANGS)[number]>(locale);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = useSaveTemplate();
  const del = useDeleteTemplate();
  const [ed, setEd] = useState<(Omit<Template, "template_id"> & { id: string | null }) | null>(null);
  const tpl: Template | undefined =
    list.find((x) => x.template_id === sel) ?? list[0];
  const body = tpl ? tpl[`body_${lang}`] : "";
  const tplId = tpl ? tpl.template_id : null;
  const fetchRender = async () => {
    if (!tpl) return null;
    setBusy(true);
    try {
      return (await renderTemplate(tpl.template_id, id, lang)).body;
    } catch (e) {
      toast({ title: (e as Error).message, tone: "danger" });
      return null;
    } finally {
      setBusy(false);
    }
  };
  const fail = (e: unknown) => toast({ title: errorCopy(e, locale), tone: "danger" });
  // F-MSG-08 template editor (create / edit), same dialog
  if (ed)
    return (
      <Dialog
        open={open}
        onClose={() => setEd(null)}
        title={ed.id ? c.tplEdit : c.tplNew}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEd(null)}>{c.cancel}</Button>
            <Button
              loading={save.isPending}
              disabled={!ed.title.trim()}
              onClick={() => save.mutate(ed, { onSuccess: () => (setEd(null), toast({ title: c.tplSaved, tone: "success" })), onError: fail })}
            >
              {c.tplSave}
            </Button>
          </div>
        }
      >
        <div className="grid gap-3">
          <Field label={c.tplName}>
            {(a) => <Input id={a.id} value={ed.title} maxLength={120} onChange={(e) => setEd({ ...ed, title: e.target.value })} />}
          </Field>
          {LANGS.map((l) => (
            <Field key={l} label={c.tplBody.replace("{l}", l)}>
              {(a) => <Textarea id={a.id} value={ed[`body_${l}`]} maxLength={4000} onChange={(e) => setEd({ ...ed, [`body_${l}`]: e.target.value })} />}
            </Field>
          ))}
        </div>
      </Dialog>
    );
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={c.tplTitle}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button
            loading={busy}
            disabled={!tpl}
            onClick={async () => {
              const b = preview ?? (await fetchRender());
              if (b) onInsert(b);
            }}
          >
            {c.tplInsert}
          </Button>
        </div>
      }
    >
      {q.isPending ? (
        <Skeleton className="h-40" />
      ) : q.isError ? (
        <PanelError what={c.templates} onRetry={() => q.refetch()} />
      ) : !list.length ? (
        <div className="grid gap-3">
          <EmptyPanel compact title={c.tplEmpty} />
          <Button size="sm" variant="outline" className="w-fit" onClick={() => setEd({ id: null, title: "", body_rw: "", body_en: "", body_fr: "" })}>
            <Icon name="plus" size={14} aria-hidden />
            {c.tplNew}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)]">
          <ul className="grid content-start gap-1" aria-label={c.templates}>
            <li>
              <button
                type="button"
                onClick={() => setEd({ id: null, title: "", body_rw: "", body_en: "", body_fr: "" })}
                className="flex w-full items-center gap-1 px-3 py-2 text-left text-small text-link hover:bg-navy-50"
              >
                <Icon name="plus" size={14} aria-hidden />
                {c.tplNew}
              </button>
            </li>
            {list.map((x) => (
              <li key={x.template_id}>
                <button
                  type="button"
                  aria-pressed={x.template_id === tplId}
                  onClick={() => {
                    setSel(x.template_id);
                    setPreview(null);
                  }}
                  className={cx(
                    "w-full px-3 py-2 text-left text-small",
                    x.template_id === tplId
                      ? "bg-secondary font-medium text-on-secondary"
                      : "hover:bg-navy-50",
                  )}
                >
                  {x.title}
                </button>
              </li>
            ))}
          </ul>
          <div className="grid content-start gap-3">
            <div
              role="radiogroup"
              aria-label={c.tplLang}
              className="flex gap-2"
            >
              {LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={lang === l}
                  onClick={() => {
                    setLang(l);
                    setPreview(null);
                  }}
                  className={cx(
                    "h-9 min-w-12 border px-3 text-small",
                    lang === l
                      ? "border-navy-700 bg-navy-100 font-medium text-navy-800"
                      : "border-border",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <div
              className="border border-border p-3 text-small whitespace-pre-line"
              aria-live="polite"
            >
              {preview ??
                body.split(/(\{\w+\})/g).map((part, i) =>
                  /^\{\w+\}$/.test(part) ? (
                    <mark key={i} className="bg-gold-200 px-0.5">
                      {part}
                    </mark>
                  ) : (
                    part
                  ),
                )}
            </div>
            <p className="text-eyebrow text-fg-subtle">
              {preview ? c.tplPreviewing : c.tplVars}
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="w-fit"
              disabled={busy}
              onClick={async () => setPreview(await fetchRender())}
            >
              <Icon name="search" size={14} aria-hidden />
              {c.tplPreview}
            </Button>
            {tpl && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEd({ id: tpl.template_id, title: tpl.title, body_rw: tpl.body_rw, body_en: tpl.body_en, body_fr: tpl.body_fr })}
                >
                  {c.tplEdit}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={del.isPending}
                  onClick={() => del.mutate(tpl.template_id, { onSuccess: () => (setSel(null), toast({ title: c.tplDeleted, tone: "success" })), onError: fail })}
                >
                  {c.tplDelete}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------- CV4 transcript export
function TranscriptExport({
  open,
  id,
  onClose,
}: {
  open: boolean;
  id: string;
  onClose: () => void;
}) {
  const { c } = useC();
  const toast = useToast();
  const { request, reset, dialog } = useStepUp();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [notes, setNotes] = useState(false); // off by default (spec CV4)
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");
  const [busy, setBusy] = useState(false);
  const bad = !!from && !!to && from > to;
  const go = async () => {
    if (bad) return;
    try {
      const stepUp = notes ? await request(c.exNotes) : undefined;
      setBusy(true);
      await downloadTranscript(id, { notes, from, to, format, stepUp });
      toast({ title: c.exDone, tone: "success" });
      onClose();
    } catch (e) {
      if (e instanceof StepUpCancelled) return;
      if ((e as Error).message === "step_up_required") reset();
      toast({ title: (e as Error).message, tone: "danger" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={c.exTitle}
        footer={
          <div className="grid w-full gap-3">
            <p className="flex items-center gap-1.5 text-eyebrow text-fg-subtle">
              <Icon name="shield" size={12} aria-hidden />
              {c.exAudit}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                {c.cancel}
              </Button>
              <Button loading={busy} disabled={bad} onClick={go}>
                {c.exGo}
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={c.exFrom}>{(f) => (
<DateInput id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
)}</Field>
            <Field label={c.exTo} error={bad ? c.exRange : undefined}>{(f) => (
<DateInput id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} value={to} onChange={(e) => setTo(e.target.value)} />
)}</Field>
          </div>
          <Switch
            label={c.exNotes}
            checked={notes}
            onChange={(e) => setNotes(e.target.checked)}
          />
          {notes && (
            <p
              role="note"
              className="flex items-start gap-2 bg-warning-bg p-3 text-small"
            >
              <Icon
                name="lock"
                size={16}
                aria-hidden
                className="mt-0.5 shrink-0 text-warning"
              />
              {c.exNotesWarn}
            </p>
          )}
          <fieldset className="flex flex-wrap items-center gap-4">
            <legend className="mb-2 text-label">{c.exFormat}</legend>
            <Radio
              name="cv-format"
              label="PDF"
              checked={format === "pdf"}
              onChange={() => setFormat("pdf")}
            />
            <Radio
              name="cv-format"
              label="CSV"
              checked={format === "csv"}
              onChange={() => setFormat("csv")}
            />
          </fieldset>
        </div>
      </Dialog>
      {dialog}
    </>
  );
}

/** F-MSG-14: turn this case conversation into a complaint ticket (FBK) for the client. */
function ComplaintButton({ id }: { id: string }) {
  const { locale } = useI18n();
  const k = complaintCopy(locale);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const { ticket: ref } = await unwrap<{ ticket: string }>(api.POST("/api/chat/conversations/{id}/complaint", { params: { path: { id } }, body: { summary: text.trim() } }));
      toast({ title: k.done.replace("{ref}", ref), tone: "success" });
      setOpen(false);
      setText("");
    } catch (e) {
      toast({ title: errorCopy(e, locale), tone: "danger" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Icon name="megaphone" size={14} aria-hidden />
        <span className="max-sm:sr-only">{k.flag}</span>
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={k.title}
        footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>{k.cancel}</Button><Button loading={busy} disabled={text.trim().length < 10} onClick={() => void submit()}>{k.create}</Button></div>}>
        <Field label={k.summary} hint={k.hint}>{(f) => <Textarea id={f.id} aria-describedby={f.describedBy} rows={4} value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} />}</Field>
      </Dialog>
    </>
  );
}

/** F-MSG-10/15 conversation controls: manager join/leave, partner lane, legal hold, link to a case. */
function ConvMenu({ id, linked }: { id: string; linked: boolean }) {
  const { c, locale } = useC();
  const toast = useToast();
  const op = useConvOp(["ops", "convs"]);
  const link = useLinkConv(["ops", "convs"]);
  const [code, setCode] = useState("");
  const done = {
    onSuccess: () => toast({ title: c.done, tone: "success" }),
    onError: (e: unknown) => toast({ title: errorCopy(e, locale), tone: "danger" }),
  } as const;
  const OPS: ConvOp[] = ["join", "leave", "laneOpen", "laneClose", "holdOn", "holdOff"];
  return (
    <details className="relative">
      <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1 border border-border px-3 text-small hover:bg-navy-50">
        <Icon name="menu" size={14} aria-hidden />
        <span className="max-sm:sr-only">{c.more}</span>
      </summary>
      <div className="absolute right-0 z-20 mt-1 grid w-64 max-w-[calc(100vw-2rem)] gap-1 border border-border bg-white p-2 shadow-lg">
        {OPS.map((o) => (
          <button key={o} type="button" disabled={op.isPending} onClick={() => op.mutate({ id, op: o }, done)} className="h-9 px-2 text-left text-small hover:bg-navy-50">
            {c[o]}
          </button>
        ))}
        {!linked && (
          <form
            className="grid gap-2 border-t border-border pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) link.mutate({ id, code: code.trim() }, done);
            }}
          >
            <Field label={c.linkCase}>
              {(a) => <Input id={a.id} value={code} maxLength={32} placeholder={c.linkCode} className="h-9" onChange={(e) => setCode(e.target.value)} />}
            </Field>
            <Button type="submit" size="sm" loading={link.isPending} disabled={!code.trim()}>
              {c.linkGo}
            </Button>
          </form>
        )}
      </div>
    </details>
  );
}

/** F-MSG-02: start a staff ↔ staff / ext:agent direct conversation. */
function NewDm({ onStarted }: { onStarted: (id: string) => void }) {
  const { c, locale } = useC();
  const toast = useToast();
  const start = useStartDm();
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border p-2">
      <Button size="sm" variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <Icon name="plus" size={14} aria-hidden />
        {c.newDm}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={c.newDm}
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>{c.cancel}</Button>
          </div>
        }
      >
        {open && (
          <DmPicker
            busy={start.isPending}
            onPick={(uid) =>
              start.mutate(uid, {
                onSuccess: (r) => (setOpen(false), onStarted(r.conversation_id)),
                onError: (e) => toast({ title: errorCopy(e, locale), tone: "danger" }),
              })
            }
          />
        )}
      </Dialog>
    </div>
  );
}
function DmPicker({ busy, onPick }: { busy: boolean; onPick: (userId: string) => void }) {
  const { c, locale } = useC();
  const ME = useMeId();
  const [q, setQ] = useState("");
  const w = useWorkers({ q });
  const rows = (w.data?.items ?? []).filter((x) => x.id !== ME).slice(0, 20);
  return (
    <div className="grid gap-3">
      <label>
        <span className="sr-only">{c.dmPick}</span>
        <Input type="search" value={q} placeholder={c.dmPick} className="h-10" onChange={(e) => setQ(e.target.value)} />
      </label>
      {w.isPending ? (
        <Skeleton className="h-24" />
      ) : w.error instanceof ApiError && w.error.isForbidden ? (
        <EmptyPanel compact title={errorCopy(w.error, locale)} />
      ) : w.isError ? (
        <PanelError what={c.dmPick} onRetry={() => w.refetch()} />
      ) : !rows.length ? (
        <EmptyPanel compact title={c.dmNone} />
      ) : (
        <ul className="grid gap-1">
          {rows.map((x) => (
            <li key={x.id}>
              <button type="button" disabled={busy} onClick={() => onPick(x.id)} className="flex h-11 w-full items-center gap-2 px-2 text-left text-small hover:bg-navy-50">
                <Face name={x.name} />
                <span className="truncate">{x.name}</span>
                <span className="ml-auto shrink-0 text-eyebrow text-fg-muted">{x.role}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
