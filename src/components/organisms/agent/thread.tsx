"use client";
// WC3 / CM3 conversation pane shared by the workbench tab and the inbox: lanes Client / Internal / All, composer with
// Reply-to-client vs Internal-note (amber + lock, never sent to the client), templates, attachments, structured cards,
// voice notes and the offline outbox. Every send goes through the outbox (src/lib/agent/outbox.ts).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/provider";
import { cx, formatDate } from "@/shared/format";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { useShortcut } from "@/lib/ops/shortcuts";
import { useSummary } from "@/lib/agent/api";
import {
  useThread,
  useSend,
  useTemplates,
  markRead,
  LANGS,
  type Lang,
  type Msg,
  type ThreadRow,
  type Card,
} from "@/lib/agent/d";
import {
  useOutbox,
  retry,
  discard,
  retryAll,
  pendingCount,
  type OutboxItem,
} from "@/lib/agent/outbox";
import { agentInbox, type InboxCopy } from "@/content/pages/agent-inbox";
import { fill } from "@/content/pages/agent-common";
import { ChannelTag, SkeletonRows } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Input, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { Avatar } from "@/components/atoms/misc";
import { useWs } from "@/lib/agent/ws";
import { useJobScope } from "@/lib/work/api";
import { workJobs } from "@/content/pages/work-jobs";
import { LaneLockedNote } from "@/components/molecules/agent/agent";
import { useToast } from "@/components/atoms/toast";
import { VoiceNote, VoicePlayer } from "@/components/molecules/agent/agent";

export const useIC = () => {
  const { locale } = useI18n();
  return { c: agentInbox(locale), locale };
};
type View = "client" | "internal" | "all";
type Mode = "client" | "internal";

/** Fill {client_name} {case_ref} {due_date} from the case. */
export const fillVars = (
  body: string,
  t: Pick<ThreadRow, "client" | "ref" | "dueAt">,
  locale: Lang,
) =>
  fill(body, {
    client_name: t.client,
    case_ref: t.ref,
    due_date: formatDate(t.dueAt, locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  });

export function Conversation({
  caseRef,
  onBack,
  head,
}: {
  caseRef: string;
  onBack?: () => void;
  head?: ReactNode;
}) {
  const { c: base, locale } = useIC();
  const qc = useQueryClient();
  const p = useUrlParams();
  // Stage 8: externals see the team lane (manager ↔ worker) and the client lane only when enabled; never internal notes.
  const { external } = useWs();
  const scope = useJobScope(caseRef, external).data;
  const clientLane = external ? !!scope?.clientLane : undefined;
  const j = workJobs(locale);
  const c: InboxCopy = external
    ? { ...base, lanes: { ...base.lanes, internal: j.team, client: j.client }, compose: { ...base.compose, internal: j.team, reply: j.client } }
    : base;
  const lanes = (external ? (clientLane ? ["internal", "client"] : ["internal"]) : ["client", "internal", "all"]) as View[];
  const view = (
    lanes.includes((p.get("lane") ?? "") as View)
      ? p.get("lane")
      : external ? "internal" : "all"
  ) as View;
  const q = useThread(caseRef);
  const pending = useOutbox(caseRef);
  const online = useOnline();
  const unread = q.data?.thread.unread ?? 0;
  useEffect(() => {
    if (unread) markRead(qc, caseRef);
  }, [unread, caseRef, qc]);
  const scroller = useRef<HTMLDivElement>(null);
  const all = q.data?.messages ?? [];
  const msgs = all.filter(
    (m) => view === "all" || m.lane === view || m.kind === "system",
  );
  const n = all.filter((m) => m.kind !== "system").length;
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length, pending.length]);

  const thread = q.data?.thread;
  return (
    <section
      aria-label={c.title}
      className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] border border-border bg-white"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={c.back}
            className="inline-flex size-9 items-center justify-center rounded-full hover:bg-bg-subtle md:hidden"
          >
            <Icon
              name="arrowRight"
              size={16}
              aria-hidden
              className="rotate-180"
            />
          </button>
        )}
        {head}
        <div
          role="tablist"
          aria-label={c.laneLabel}
          className="ml-auto flex gap-1"
        >
          {lanes.map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={view === l}
              onClick={() => setUrlParams({ lane: l === "all" || (external && l === "internal") ? null : l })}
              className={cx(
                "inline-flex h-8 items-center gap-1 px-3 text-small m-tone",
                view === l
                  ? l === "internal"
                    ? "bg-warning-bg font-medium text-warning"
                    : "bg-secondary font-medium text-on-navy"
                  : "text-fg-muted hover:bg-bg-subtle",
              )}
            >
              {l === "internal" && <Icon name={external ? "users" : "lock"} size={12} aria-hidden />}
              {c.lanes[l]}
              {l === "all" && n > 0 && <span className="tabular">({n})</span>}
            </button>
          ))}
        </div>
      </div>
      <div>
        {!online && (
          <p
            role="status"
            className="flex items-center gap-2 bg-warning-bg px-3 py-2 text-small text-warning"
          >
            <Icon name="zap" size={14} aria-hidden />
            {c.out.offline}
          </p>
        )}
        <OutboxChip items={pending} c={c} />
      </div>
      <div
        ref={scroller}
        className="overflow-y-auto px-3 py-4"
        tabIndex={0}
        role="region"
        aria-label={thread ? `${thread.client} · ${caseRef}` : caseRef}
      >
        {q.isPending ? (
          <SkeletonRows n={4} />
        ) : q.isError ? (
          <PanelError what={c.threadErr} onRetry={() => q.refetch()} />
        ) : (
          <div role="log" aria-live="polite">
          <ol className="grid gap-3">
            {msgs.map((m) => (
              <Bubble key={m.id} m={m} c={c} locale={locale} />
            ))}
            {pending
              .filter((i) => (view === "all" || i.body.lane === view) && !all.some((m) => m.id === i.id))
              .map((i) => (
                <PendingBubble key={i.id} i={i} c={c} />
              ))}
            {!msgs.length && !pending.length && (
              <EmptyPanel compact title={c.empty.all[0]} />
            )}
          </ol>
          </div>
        )}
      </div>
      {thread && <Composer thread={thread} c={c} locale={locale} clientLane={clientLane} />}
    </section>
  );
}

function OutboxChip({ items, c }: { items: OutboxItem[]; c: InboxCopy }) {
  const n = pendingCount(items);
  if (!n) return null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-2 border-b border-border bg-tint px-3 py-1.5 text-small"
    >
      <Icon name="clock" size={14} aria-hidden />
      <span className="flex-1">{fill(c.out.chip, { n })}</span>
      <Button
        size="sm"
        variant="ghost"
        className="h-7"
        onClick={() => void retryAll()}
      >
        <Icon name="refresh" size={14} aria-hidden />
        {c.out.retryAll}
      </Button>
    </div>
  );
}

const Face = ({ name }: { name: string }) => (
  <span aria-hidden>
    <Avatar name={name} size="sm" />
  </span>
);

function Body({
  m,
  c,
}: {
  m: Pick<Msg, "kind" | "body" | "card" | "file" | "voice">;
  c: InboxCopy;
}) {
  if (m.kind === "card" && m.card)
    return (
      <div className="flex items-start gap-3 border border-border bg-white p-3">
        <Icon
          name={
            m.card.type === "appointment" || m.card.type === "visit_checkin"
              ? "calendar"
              : m.card.type === "status" || m.card.type === "deliverable_ready"
                ? "check"
                : m.card.type === "payment_request" || m.card.type === "quotation"
                  ? "wallet"
                  : "file"
          }
          size={18}
          aria-hidden
          className="mt-0.5 text-navy-700"
        />
        <div className="grid min-w-0 gap-0.5">
          <p className="text-small font-medium">{c.cards[m.card.type]}</p>
          <p className="break-words text-small text-fg-muted">
            {m.card.detail}
          </p>
          {typeof m.card.data?.amount_rwf === "number" && (
            <p className="text-small tabular">{m.card.data.amount_rwf.toLocaleString()} RWF</p>
          )}
          {m.card.response && (
            <p className="text-eyebrow text-fg-subtle">
              {m.card.response.action === "accept" ? c.cards.accepted : c.cards.declined}
            </p>
          )}
        </div>
      </div>
    );
  if (m.kind === "file" && m.file)
    return (
      <p className="flex items-center gap-2 text-small">
        <Icon name="file" size={16} aria-hidden />
        <span className="truncate">{m.file.name}</span>
        <span className="text-eyebrow text-fg-subtle tabular">
          {Math.max(1, Math.round(m.file.size / 1024))} KB
        </span>
      </p>
    );
  if (m.kind === "voice" && m.voice)
    return <VoicePlayer src={m.voice.src} seconds={m.voice.seconds} c={c} />;
  return <p className="break-words whitespace-pre-line">{m.body}</p>;
}

function Bubble({ m, c, locale }: { m: Msg; c: InboxCopy; locale: Lang }) {
  const { external } = useWs();
  const me = useSummary().data?.me.id;
  const time = formatDate(m.at, locale, { timeStyle: "short" });
  if (m.kind === "system")
    return (
      <li className="mx-auto w-fit bg-ink-100 px-3 py-1 text-eyebrow text-fg-muted">
        {m.body} · {time}
      </li>
    );
  const mine = !!me && m.authorId === me;
  const note = m.lane === "internal" && !external; // externals: "internal" is the team lane, not a staff note
  return (
    <li
      data-lane={m.lane}
      className={cx("flex gap-2", mine && "flex-row-reverse")}
    >
      <Face name={m.author} />
      <div
        className={cx(
          "grid max-w-[85%] min-w-0 gap-1 px-3 py-2 text-small",
          note
            ? "border border-dashed border-warning/50 bg-warning-bg"
            : mine
              ? "bg-tint"
              : "bg-bg-subtle",
        )}
      >
        <p className="flex flex-wrap items-center gap-2 text-eyebrow text-fg-muted">
          {mine ? c.you : m.author} · {time}
          {note && <ChannelTag channel="internal" />}
        </p>
        <Body m={m} c={c} />
      </div>
    </li>
  );
}

function PendingBubble({ i, c }: { i: OutboxItem; c: InboxCopy }) {
  const ws = useWs();
  const note = i.body.lane === "internal" && !ws.external;
  return (
    <li
      data-lane={i.body.lane}
      data-outbox={i.state}
      className="flex flex-row-reverse gap-2 m-rise"
    >
      <Face name={c.you} />
      <div
        className={cx(
          "grid max-w-[85%] min-w-0 gap-1 px-3 py-2 text-small",
          note
            ? "border border-dashed border-warning/50 bg-warning-bg"
            : "bg-tint",
          i.state !== "sent" && "opacity-80",
        )}
      >
        <p className="flex flex-wrap items-center gap-2 text-eyebrow text-fg-muted">
          {c.you}
          {note && <ChannelTag channel="internal" />}
        </p>
        <Body m={i.body as never} c={c} />
        <p
          className={cx(
            "flex flex-wrap items-center gap-2 text-eyebrow",
            i.state === "failed" ? "text-danger" : "text-fg-muted",
          )}
        >
          <Icon
            name={
              i.state === "failed"
                ? "x"
                : i.state === "sent"
                  ? "check"
                  : "clock"
            }
            size={12}
            aria-hidden
          />
          {c.out[i.state]}
          {i.state === "failed" && (
            <>
              <button
                type="button"
                className="font-medium underline underline-offset-2"
                onClick={() => void retry(i.id)}
              >
                {c.out.retry}
              </button>
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => discard(i.id)}
              >
                {c.out.discard}
              </button>
            </>
          )}
        </p>
      </div>
    </li>
  );
}

const draftKey = (ref: string, mode: Mode) => `agent-draft:${ref}:${mode}`;
const readDraft = (k: string) => {
  try {
    return localStorage.getItem(k) ?? "";
  } catch {
    return "";
  }
};

function Composer({
  thread,
  c,
  locale,
  clientLane,
}: {
  thread: ThreadRow;
  c: InboxCopy;
  locale: Lang;
  /** Stage 8: false → client lane locked for this external job; undefined → internal agent. */
  clientLane?: boolean;
}) {
  const toast = useToast();
  const send = useSend(thread.ref);
  const clearance = useSummary().data?.clearance;
  const cleared = !clearance || clearance === "cleared";
  const canClient = !thread.readOnly && cleared && clientLane !== false;
  const [mode, setMode] = useState<Mode>(canClient ? "client" : "internal");
  const [drafts, setDrafts] = useState(() => ({
    client: readDraft(draftKey(thread.ref, "client")),
    internal: readDraft(draftKey(thread.ref, "internal")),
  }));
  const draft = drafts[mode];
  const [dlg, setDlg] = useState<null | "tpl" | "card">(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const setDraft = (v: string, m: Mode = mode) => {
    setDrafts((d) => ({ ...d, [m]: v }));
    try {
      if (v) localStorage.setItem(draftKey(thread.ref, m), v);
      else localStorage.removeItem(draftKey(thread.ref, m));
    } catch {
      /* private mode: draft stays in memory */
    }
  };
  // Stage 11 copilot "Insert into composer": fills the draft and focuses it — never sends (board 09 fix).
  useEffect(() => {
    const on = (e: Event) => { const t = (e as CustomEvent<string>).detail; if (t) { setDraft(t); box.current?.focus(); } };
    window.addEventListener("copilot:insert", on);
    return () => window.removeEventListener("copilot:insert", on);
  });
  const internal = mode === "internal";
  // "Use template" from /agent/inbox/templates lands here as ?tpl=<id>: insert it filled, once.
  const tplParam = useUrlParams().get("tpl");
  const tpls = useTemplates().data;
  const [usedTpl, setUsedTpl] = useState<string | null>(null);
  if (tplParam && tpls && usedTpl !== tplParam) {
    setUsedTpl(tplParam);
    const t = tpls.find((x) => x.id === tplParam);
    const lang = (LANGS as readonly string[]).includes(thread.clientLanguage) ? (thread.clientLanguage as Lang) : locale;
    if (t) setDrafts((d) => ({ ...d, client: fillVars(t[`body_${lang}`], thread, lang) }));
  }
  useEffect(() => {
    if (tplParam && usedTpl === tplParam) setUrlParams({ tpl: null });
  }, [tplParam, usedTpl]);
  const focus = (m: Mode) => {
    if (m === "client" && !canClient) return;
    setMode(m);
    requestAnimationFrame(() => box.current?.focus());
  };
  useShortcut("r", c.keys.reply, () => focus("client"), "case", canClient);
  useShortcut("i", c.keys.note, () => focus("internal"), "case");

  const go = async (b: Parameters<typeof send>[0]) => {
    const r = await send(b);
    if (r.state === "failed")
      toast({ title: c.out.failedToast, tone: "danger" });
    return r;
  };
  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    void go({ lane: mode, kind: "text", body });
  };

  return (
    <form
      onSubmit={(e) => (e.preventDefault(), submit())}
      className={cx(
        "grid gap-2 border-t p-3 m-tone",
        internal ? "border-warning/40 bg-warning-bg/50" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="radiogroup"
          aria-label={c.compose.modeLabel}
          className="inline-flex bg-ink-100 p-1"
        >
          {(["client", "internal"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              disabled={m === "client" && !canClient}
              onClick={() => focus(m)}
              className={cx(
                "inline-flex h-8 items-center gap-1 px-3 text-small m-tone disabled:opacity-50",
                mode === m
                  ? m === "internal"
                    ? "bg-warning text-white font-medium"
                    : "bg-secondary font-medium text-on-navy"
                  : "text-fg-muted",
              )}
            >
              {m === "internal" && <Icon name="lock" size={12} aria-hidden />}
              {m === "client" ? c.compose.reply : c.compose.internal}
            </button>
          ))}
        </div>
        {internal && clientLane === undefined && <ChannelTag channel="internal" />}
        {clientLane === false && !thread.readOnly ? (
          <LaneLockedNote />
        ) : !canClient && (
          <span className="text-eyebrow text-fg-muted">
            {thread.readOnly ? c.compose.readOnly : c.compose.notCleared}
          </span>
        )}
        {draft && (
          <span className="ml-auto inline-flex items-center gap-1 text-eyebrow text-success">
            <Icon name="check" size={12} aria-hidden />
            {c.compose.savedDraft}
          </span>
        )}
      </div>
      <label htmlFor={`compose-${thread.ref}`} className="sr-only">
        {internal ? c.compose.internal : c.compose.reply}
      </label>
      <Textarea
        ref={box}
        id={`compose-${thread.ref}`}
        rows={2}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={
          internal ? c.compose.placeholderInternal : c.compose.placeholderReply
        }
        aria-describedby={`compose-hint-${thread.ref}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        className={cx(
          "min-h-20",
          internal && "border-dashed border-warning/60 bg-white",
        )}
      />
      <div className="flex flex-wrap items-center gap-1">
        <input
          ref={file}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            if (f.size > 10 * 1024 * 1024)
              return toast({ title: c.compose.tooBig, tone: "danger" });
            // shortcut: only the file's name and size are sent; wire to the attachments upload once case conversations are addressable.
            void go({
              lane: mode,
              kind: "file",
              body: "",
              file: { name: f.name, size: f.size },
            });
          }}
        />
        <Button
          size="icon"
          variant="ghost"
          className="size-9"
          aria-label={c.compose.attach}
          title={c.compose.attach}
          onClick={() => file.current?.click()}
        >
          <Icon name="upload" size={18} aria-hidden />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setDlg("tpl")}
        >
          {c.compose.templates}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={internal}
          title={internal ? c.compose.cardsClientOnly : undefined}
          onClick={() => setDlg("card")}
        >
          <Icon name="plus" size={14} aria-hidden />
          {c.compose.cards}
        </Button>
        <VoiceNote
          c={c}
          onSend={(v) =>
            go({
              lane: mode,
              kind: "voice",
              body: "",
              voice: { seconds: v.seconds, src: v.src, mime: v.mime },
            })
          }
          onRetry={(id) => void retry(id)}
        />
        <span
          id={`compose-hint-${thread.ref}`}
          className="ml-auto text-eyebrow text-fg-subtle max-sm:sr-only"
        >
          {internal ? c.compose.internalHint : c.compose.enterHint}
        </span>
        <Button type="submit" size="sm" disabled={!draft.trim()}>
          {internal ? c.compose.sendNote : c.compose.send}
        </Button>
      </div>
      <TemplatePicker
        open={dlg === "tpl"}
        thread={thread}
        locale={locale}
        c={c}
        onClose={() => setDlg(null)}
        onInsert={(b) => (setDraft(b), setDlg(null), box.current?.focus())}
      />
      <CardDialog
        open={dlg === "card"}
        c={c}
        onClose={() => setDlg(null)}
        onSend={(card) => (
          setDlg(null),
          void go({ lane: "client", kind: "card", body: "", card })
        )}
      />
    </form>
  );
}

/** TemplatePicker: rw/en/fr, variables filled from the case, preview before insert. */
export function TemplatePicker({
  open,
  thread,
  locale,
  c,
  onClose,
  onInsert,
}: {
  open: boolean;
  thread: ThreadRow;
  locale: Lang;
  c: InboxCopy;
  onClose: () => void;
  onInsert: (b: string) => void;
}) {
  const q = useTemplates();
  const list = q.data ?? [];
  const [sel, setSel] = useState<string | null>(null);
  const clientLang = (LANGS as readonly string[]).includes(
    thread.clientLanguage,
  )
    ? (thread.clientLanguage as Lang)
    : locale;
  const [lang, setLang] = useState<Lang>(clientLang);
  const tpl = list.find((t) => t.id === sel) ?? list[0];
  const tplId = tpl ? tpl.id : null;
  const filled = tpl ? fillVars(tpl[`body_${lang}`], thread, lang) : "";
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={c.tpl.title}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button disabled={!filled} onClick={() => onInsert(filled)}>
            {c.tpl.insert}
          </Button>
        </div>
      }
    >
      {q.isPending ? (
        <SkeletonRows n={3} />
      ) : q.isError ? (
        <PanelError what={c.tpl.title} onRetry={() => q.refetch()} />
      ) : !list.length ? (
        <EmptyPanel compact title={c.tpl.empty} body={c.tpl.emptyBody} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <ul className="grid content-start gap-1"aria-label={c.tpl.list}>
            {list.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  aria-pressed={t.id === tplId}
                  onClick={() => setSel(t.id)}
                  className={cx(
                    "w-full px-3 py-2 text-left text-small",
                    t.id === tplId
                      ? "bg-secondary font-medium text-on-navy"
                      : "hover:bg-bg-subtle",
                  )}
                >
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
          <div className="grid content-start gap-3">
            <div
              role="radiogroup"
              aria-label={c.tpl.lang}
              className="flex gap-2"
            >
              {LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={lang === l}
                  onClick={() => setLang(l)}
                  className={cx(
                    "h-9 min-w-12 border px-3 text-small uppercase",
                    lang === l
                      ? "border-secondary bg-secondary font-medium text-on-navy"
                      : "border-border",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <p className="text-eyebrow text-fg-subtle">{c.tpl.previewHint}</p>
            <div
              aria-live="polite"
              aria-label={c.tpl.preview}
              className="border border-border bg-bg-subtle/50 p-3 text-small whitespace-pre-line"
            >
              {filled || (
                <span className="text-fg-subtle">
                  {fill(c.tpl.missing, { l: lang.toUpperCase() })}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function CardDialog({
  open,
  c,
  onClose,
  onSend,
}: {
  open: boolean;
  c: InboxCopy;
  onClose: () => void;
  onSend: (card: Card) => void;
}) {
  const [type, setType] = useState<Card["type"]>("document_request");
  const [detail, setDetail] = useState("");
  const [ref, setRef] = useState("");
  const [amount, setAmount] = useState("");
  const hint = {
    document_request: c.cards.docHint,
    appointment: c.cards.apptHint,
    status: c.cards.statusHint,
  }[type as "status"] ?? "";
  const needsRef = ["document_request", "payment_request", "quotation", "deliverable_ready", "visit_checkin"].includes(type);
  const needsAmount = type === "payment_request" || type === "quotation";
  const amt = Number(amount);
  const data: Record<string, unknown> | undefined = {
    document_request: { requirement_key: ref || "other", note: detail.trim() },
    payment_request: { amount_rwf: amt, invoice_ref: ref || undefined },
    quotation: { amount_rwf: amt, quote_ref: ref },
    deliverable_ready: { deliverable_id: ref },
    visit_checkin: { visit_id: ref, at: new Date().toISOString() },
  }[type as "quotation"];
  const ok = !!detail.trim() && (!needsRef || type === "payment_request" || !!ref.trim()) && (!needsAmount || (Number.isInteger(amt) && amt > 0));
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={c.compose.cards}
      description={c.compose.cardsClientOnly}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button
            disabled={!ok}
            onClick={() => (
              onSend({ type, title: c.cards[type], detail: detail.trim(), ...(data && { data }) }),
              setDetail(""),
              setRef(""),
              setAmount("")
            )}
          >
            {c.cards.insert}
          </Button>
        </div>
      }
    >
      <div className="grid gap-3">
        <div
          role="radiogroup"
          aria-label={c.cards.pick}
          className="flex flex-wrap gap-2"
        >
          {(["document_request", "payment_request", "quotation", "deliverable_ready", "visit_checkin", "appointment", "status"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              onClick={() => setType(t)}
              className={cx(
                "h-9 border px-3 text-small",
                type === t
                  ? "border-secondary bg-secondary font-medium text-on-navy"
                  : "border-border",
              )}
            >
              {c.cards[t]}
            </button>
          ))}
        </div>
        {needsRef && (
          <label className="grid gap-1 text-small font-medium">
            {c.cards.ref}
            <Input value={ref} onChange={(e) => setRef(e.target.value)} maxLength={64} />
          </label>
        )}
        {needsAmount && (
          <label className="grid gap-1 text-small font-medium">
            {c.cards.amount}
            <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
          </label>
        )}
        <label className="grid gap-1 text-small font-medium">
          {c.cards.detail}
          <Textarea
            rows={2}
            value={detail}
            placeholder={hint}
            onChange={(e) => setDetail(e.target.value)}
            className="min-h-20"
          />
        </label>
      </div>
    </Dialog>
  );
}
