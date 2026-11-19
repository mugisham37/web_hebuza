"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { putPresigned } from "@/lib/api/upload";
import type { components } from "@/lib/api/schema";
import type * as C from "@/lib/client/types";
import { useI18n } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { formatDate, cx } from "@/shared/format";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { Avatar } from "@/components/atoms/misc";
import { ErrorState, Skeleton } from "@/components/atoms/feedback";
import { c2Copy, fill } from "@/content/pages/c2";
import { chatCardCopy } from "@/content/pages/chat-cards";
import { localHref } from "@/shared/i18n/config";
import { pingDelivered, pingTyping, useConvSearch, useDeleteMsg, useDispute, useEditMsg, useMsgHistory, useMute, usePinned, useReact, type Reaction } from "@/lib/chat";

type Msg = C.MessageResponse;
type Conv = C.ConversationResponse;
type Attachment = C.MessageAttachmentResponse;
type Page = C.MessagePageResponse;
// Message attachments are stored JSON; rows from older writers may not be attachment views.
const isAtt = (a: unknown): a is Attachment => typeof a === "object" && a !== null && "id" in a && "filename" in a;
// Outbox entry: lives only in memory. shortcut: no IndexedDB persistence (INTEGRATION-PLAN C08), so a reload drops unsent drafts; add idb-keyval-style storage when offline use matters.
type Out = {
  id: string;
  content: string;
  files: File[];
  state: "sending" | "queued" | "failed";
};

const MAX = 2000;
const MAX_MB = 25;
const POLL_MS = 8000; // spec: SSE if the server supports it, else polling

const onlineStore = {
  sub: (cb: () => void) => {
    addEventListener("online", cb);
    addEventListener("offline", cb);
    return () => {
      removeEventListener("online", cb);
      removeEventListener("offline", cb);
    };
  },
  get: () => navigator.onLine,
  server: () => true,
};

/** C08 conversation for one request: history, structured cards, composer, outbox with failed/retry, read receipts. */
export function Thread({ code }: { code: string }) {
  const { locale } = useI18n();
  const c = c2Copy(locale).msg;
  const conv = useQuery({
    queryKey: ["c2", "conv", code],
    queryFn: () =>
      unwrap<Conv>(
        api.GET("/api/chat/conversations/by-application/{code}", {
          params: { path: { code } },
        }),
      ),
    refetchInterval: POLL_MS,
  });
  if (conv.isPending)
    return (
      <div className="grid gap-3 pt-6" aria-busy>
        <Skeleton className="h-16 w-2/3 " />
        <Skeleton className="ml-auto h-12 w-1/2 " />
        <Skeleton className="h-16 w-3/5 " />
      </div>
    );
  if (conv.isError)
    return (
      <ErrorState
        className="mt-6"
        error={conv.error}
        onRetry={() => conv.refetch()}
      />
    );
  return <Conversation conv={conv.data} title={fill(c.thread, { code })} />;
}

function Conversation({ conv, title }: { conv: Conv; title: string }) {
  const { locale } = useI18n();
  const c = c2Copy(locale).msg;
  const { user } = useSession();
  const qc = useQueryClient();
  const id = conv.conversation_id;
  const key = ["c2", "msgs", id];
  const msgs = useQuery({
    queryKey: key,
    queryFn: () =>
      unwrap<Page>(
        api.GET("/api/chat/conversations/{id}/messages", {
          params: { path: { id }, query: { limit: 100 } },
        }),
      ),
  });
  const online = useSyncExternalStore(
    onlineStore.sub,
    onlineStore.get,
    onlineStore.server,
  );
  const [outbox, setOutbox] = useState<Out[]>([]);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const typedAt = useRef(0);
  const [q, setQ] = useState("");
  const found = useConvSearch(id, q);
  const pinned = usePinned(id).data ?? [];
  const dispute = useDispute(id, conv.has_dispute).data;
  const mute = useMute(["c2", "conv"]);
  const list = msgs.data?.messages ?? [];
  const lastSeq = list.at(-1)?.seq ?? 0;

  // Mark read whenever new messages arrive while the thread is open.
  useEffect(() => {
    if (!lastSeq) return;
    pingDelivered(id, lastSeq);
    api
        .POST("/api/chat/conversations/{id}/read", {
          params: { path: { id } },
          body: { seq: lastSeq },
        })
        .catch(() => {});
  }, [id, lastSeq]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [list.length, outbox.length]);

  const patch = (oid: string, state: Out["state"] | null) =>
    setOutbox((xs) =>
      state
        ? xs.map((x) => (x.id === oid ? { ...x, state } : x))
        : xs.filter((x) => x.id !== oid),
    );

  async function deliver(o: Out) {
    if (!navigator.onLine) return patch(o.id, "queued");
    patch(o.id, "sending");
    try {
      const ids: string[] = [];
      for (const f of o.files) {
        const mime = (f.type || "application/octet-stream") as "application/pdf"; // server rejects unsupported types (422)
        const a = await unwrap<Attachment & { upload: { url: string } | null }>(
          api.POST("/api/chat/conversations/{id}/attachments", { params: { path: { id } }, body: { filename: f.name, mime, size: f.size } }),
        );
        if (a.upload) {
          await putPresigned(a.upload.url, f, mime);
          await unwrap(api.POST("/api/documents/{id}/complete", { params: { path: { id: a.id } } }));
        }
        ids.push(a.id);
      }
      // client_msg_id = outbox id, so a retry after a lost response is deduplicated server-side.
      await unwrap(
        api.POST("/api/chat/conversations/{id}/messages", {
          params: { path: { id } },
          body: {
            client_msg_id: o.id,
            content: o.content,
            attachment_ids: ids,
            lane: "client",
          },
        }),
      );
      await qc.invalidateQueries({ queryKey: key });
      patch(o.id, null);
    } catch {
      patch(o.id, navigator.onLine ? "failed" : "queued");
    }
  }

  // Flush queued messages when the connection comes back.
  useEffect(() => {
    if (online) outbox.filter((o) => o.state === "queued").forEach(deliver);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on reconnect
  }, [online]);

  function send(content = text) {
    const body = content.trim();
    if ((!body && !files.length) || body.length > MAX) return;
    const o: Out = {
      id: crypto.randomUUID(),
      content: body,
      files,
      state: "sending",
    };
    setOutbox((xs) => [...xs, o]);
    setText("");
    setFiles([]);
    deliver(o);
  }

  function addFiles(fl: FileList | null) {
    const picked = [...(fl ?? [])];
    const big = picked.find((f) => f.size > MAX_MB * 1024 * 1024);
    setFileErr(big ? `${big.name}: ≤ ${MAX_MB} MB` : null);
    setFiles((xs) => [...xs, ...picked.filter((f) => f !== big)].slice(0, 5));
    if (picker.current) picker.current.value = "";
  }

  const others = (msgs.data?.participants ?? []).filter(
    (p) => p.user_id !== user?.id,
  );
  const receipt = (seq: number) =>
    others.some((p) => p.last_read_seq >= seq)
      ? c.read
      : others.some((p) => p.last_delivered_seq >= seq)
        ? c.delivered
        : c.sent;
  const mine = (m: Msg) =>
    (user && m.sender_id === user.id) || m.sender_role === "client";
  const tooLong = text.length > MAX;
  const searching = q.trim().length >= 2;

  return (
    <section
      aria-label={title}
      className="mt-6 flex min-h-[28rem] flex-col overflow-hidden border border-border bg-surface"
    >
      {!online && (
        <p
          role="status"
          className="flex items-center gap-2 bg-secondary px-4 py-3 text-small text-on-secondary"
        >
          <Icon name="globe" size={16} aria-hidden />
          {c.offline}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{c.search}</span>
          <Icon name="search" size={14} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
          <input
            type="search"
            value={q}
            placeholder={c.search}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 w-full border border-border bg-surface pr-3 pl-8 text-small focus:border-secondary focus:outline-none"
          />
        </label>
        <Button
          size="sm"
          variant="ghost"
          aria-pressed={conv.muted}
          loading={mute.isPending}
          onClick={() => mute.mutate({ id, muted: !conv.muted })}
        >
          {conv.muted ? c.unmute : c.mute}
        </Button>
        {conv.muted && <span className="sr-only" role="status">{c.muted}</span>}
      </div>
      {dispute && (
        <p role="status" className="bg-warning-bg px-4 py-2 text-small text-warning">
          {dispute.status === "resolved" ? c.disputeDone : fill(c.dispute, { s: dispute.category })}
        </p>
      )}
      {pinned.length > 0 && !searching && (
        <ul aria-label={c.pinned} className="grid gap-1 border-b border-border bg-bg-tint px-4 py-2 text-small">
          {pinned.map((m) => (
            <li key={m.message_id} className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-eyebrow text-fg-subtle">{c.pinned}</span>
              <span className="truncate">{m.content}</span>
            </li>
          ))}
        </ul>
      )}

      <div
        className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {searching ? (
          found.isPending ? (
            <Skeleton className="h-16 w-2/3 " />
          ) : found.isError ? (
            <ErrorState error={found.error} onRetry={() => found.refetch()} />
          ) : !found.data.results.length ? (
            <p className="py-10 text-center text-body text-fg-muted">{c.noResults}</p>
          ) : (
            <ol className="grid gap-3" aria-label={c.search}>
              {found.data.results.map((m) => (
                <li key={m.message_id} className="border-b border-border pb-2 text-body">
                  <p className="text-small text-fg-muted">
                    {m.sender_name ?? c.you} · <time dateTime={m.created_at}>{formatDate(m.created_at, locale, { dateStyle: "medium", timeStyle: "short" })}</time>
                  </p>
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                </li>
              ))}
            </ol>
          )
        ) : msgs.isPending ? (
          <Skeleton className="h-16 w-2/3 " />
        ) : msgs.isError ? (
          <ErrorState error={msgs.error} onRetry={() => msgs.refetch()} />
        ) : !list.length && !outbox.length ? (
          <p className="py-10 text-center text-body text-fg-muted">
            {c.noMessages}
          </p>
        ) : (
          <ol className="grid gap-4">
            {list.map((m) =>
              m.is_system ? (
                <li
                  key={m.message_id}
                  className="mx-auto max-w-full bg-bg-tint px-4 py-1.5 text-center text-small"
                >
                  {m.content}
                </li>
              ) : (
                <li
                  key={m.message_id}
                  className={cx(
                    "flex max-w-[min(36rem,88%)] items-end gap-2",
                    mine(m) && "ml-auto flex-row-reverse",
                  )}
                >
                  {!mine(m) && <Avatar name={m.sender_name ?? "?"} size="sm" />}
                  <div
                    className={cx(
                      "min-w-0 px-4 py-3 text-body",
                      mine(m) ? "bg-navy-700 text-white" : "bg-ink-100 text-ink-900",
                    )}
                  >
                    {!mine(m) && m.sender_name && (
                      <p className="mb-1 text-small font-medium">
                        {m.sender_name}
                      </p>
                    )}
                    {m.deleted_at ? (
                      <p className="italic opacity-80">{c.deleted}</p>
                    ) : m.kind === "card" ? (
                      <ChatCard m={m} onAnswered={() => void msgs.refetch()} />
                    ) : (
                      m.content && (
                        <p className="whitespace-pre-wrap break-words">
                          {m.content}
                        </p>
                      )
                    )}
                    {m.attachments.filter(isAtt).map((a) => (
                      <a
                        key={a.id}
                        href={`/api/chat/attachments/${a.id}`}
                        className="mt-2 flex items-center gap-2 bg-white/10 px-3 py-2 text-small underline underline-offset-4"
                      >
                        <Icon name="file" size={16} aria-hidden />
                        <span className="truncate">{a.filename}</span>
                      </a>
                    ))}
                    <p
                      className={cx(
                        "mt-1 text-[0.75rem] opacity-70",
                        mine(m) && "text-right",
                      )}
                    >
                      <time dateTime={m.created_at}>
                        {formatDate(m.created_at, locale, {
                          timeStyle: "short",
                        })}
                      </time>
                      {mine(m) && <> · {receipt(m.seq)}</>}
                    </p>
                    {!m.deleted_at && <MsgExtras m={m} own={!!user && m.sender_id === user.id} me={user?.id} msgKey={key} />}
                  </div>
                </li>
              ),
            )}
            {outbox.map((o) => (
              <li
                key={o.id}
                className="ml-auto flex max-w-[min(36rem,88%)] flex-col items-end gap-1"
              >
                <div
                  className={cx(
                    "px-4 py-3 text-body",
                    o.state === "failed"
                      ? "border border-danger bg-danger-bg text-fg"
                      : "bg-navy-700/80 text-white",
                  )}
                >
                  {o.content && (
                    <p className="whitespace-pre-wrap break-words">
                      {o.content}
                    </p>
                  )}
                  {o.files.map((f) => (
                    <p
                      key={f.name}
                      className="mt-1 flex items-center gap-2 text-small"
                    >
                      <Icon name="file" size={14} aria-hidden />
                      {f.name}
                    </p>
                  ))}
                </div>
                <p className="flex items-center gap-2 text-[0.75rem] text-fg-subtle">
                  {o.state === "sending" && c.sending}
                  {o.state === "queued" && (
                    <>
                      <Icon name="clock" size={12} aria-hidden />
                      {c.queued}
                    </>
                  )}
                  {o.state === "failed" && (
                    <>
                      <span className="text-danger">{c.failed}</span>
                      <button
                        type="button"
                        className="underline"
                        onClick={() => deliver(o)}
                      >
                        {c.retry}
                      </button>
                      <button
                        type="button"
                        className="text-danger underline"
                        onClick={() => patch(o.id, null)}
                      >
                        {c.discard}
                      </button>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ol>
        )}
        <div ref={end} />
      </div>

      <form
        className="grid gap-3 border-t border-border p-3 sm:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        {!text && !files.length && (
          <div className="flex gap-2 overflow-x-auto">
            {c.quick.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="h-8 shrink-0 border border-border px-3 text-small hover:border-navy-300"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {files.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center gap-2 bg-navy-50 py-1 pr-1 pl-3 text-small"
              >
                <span className="max-w-[12rem] truncate">{f.name}</span>
                <button
                  type="button"
                  aria-label={fill(c.removeFile, { name: f.name })}
                  onClick={() => setFiles((xs) => xs.filter((_, j) => j !== i))}
                  className="grid size-6 place-items-center hover:bg-surface"
                >
                  <Icon name="x" size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {fileErr && (
          <p role="alert" className="text-small text-danger">
            {fileErr}
          </p>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={picker}
            type="file"
            multiple
            hidden
            accept="application/pdf,image/*"
            onChange={(e) => addFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={c.attach}
            onClick={() => picker.current?.click()}
          >
            <Icon name="upload" aria-hidden />
          </Button>
          <label className="min-w-0 flex-1">
            <span className="sr-only">{c.placeholder}</span>
            <textarea
              rows={1}
              value={text}
              placeholder={c.placeholder}
              aria-invalid={tooLong || undefined}
              aria-describedby="c2-msg-hint"
              onChange={(e) => {
                setText(e.target.value);
                // F-MSG-06: at most one typing ping per 4 s
                if (Date.now() - typedAt.current > 4000) {
                  typedAt.current = Date.now();
                  pingTyping(id);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              className="block max-h-40 min-h-11 w-full resize-y border border-border bg-surface px-4 py-2.5 text-body focus:border-secondary focus:outline-none"
            />
          </label>
          <Button
            type="submit"
            size="icon"
            aria-label={c.send}
            disabled={tooLong || (!text.trim() && !files.length)}
          >
            <Icon name="arrowRight" aria-hidden />
          </Button>
        </div>
        <p
          id="c2-msg-hint"
          className={cx(
            "text-small",
            tooLong ? "text-danger" : "text-fg-subtle",
          )}
        >
          {tooLong ? fill(c.tooLong, { n: MAX }) : c.note}
        </p>
      </form>
    </section>
  );
}

type CardPayload = { card?: { type?: string; title?: string; detail?: string; data?: Record<string, unknown>; response?: { action: string } } };

/** F-MSG-05 typed card: label, details, amount, and the client's one action (quotation accept/decline). */
function ChatCard({ m, onAnswered }: { m: Msg; onAnswered: () => void }) {
  const { locale } = useI18n();
  const k = chatCardCopy(locale);
  const card = (m.payload as CardPayload | null)?.card;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  if (!card) return <p className="whitespace-pre-wrap break-words">{m.content}</p>;
  const amount = card.data?.amount_rwf;
  const answer = async (action: "accept" | "decline") => {
    setBusy(true);
    setErr(false);
    try {
      await unwrap(api.POST("/api/chat/messages/{id}/card-action", { params: { path: { id: m.message_id } }, body: { action } }));
      onAnswered();
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-1 border border-border bg-white p-3 text-ink-900">
      <p className="text-eyebrow text-fg-subtle">{k.kinds[card.type ?? ""] ?? card.type}</p>
      <p className="font-medium break-words">{card.title ?? m.content}</p>
      {card.detail && <p className="text-small break-words text-fg-muted">{card.detail}</p>}
      {typeof amount === "number" && <p className="text-small tabular">{amount.toLocaleString(locale)} RWF</p>}
      {card.type === "quotation" &&
        (card.response ? (
          <p className="text-small font-medium">{card.response.action === "accept" ? k.accepted : k.declined}</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => void answer("accept")}>{k.accept}</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void answer("decline")}>{k.decline}</Button>
          </div>
        ))}
      {card.type === "payment_request" && (
        <a href={localHref(locale, "/billing")} className="mt-1 text-small underline underline-offset-4">{k.pay}</a>
      )}
      {card.type === "deliverable_ready" && (
        <a href={localHref(locale, "/documents")} className="mt-1 text-small underline underline-offset-4">{k.open}</a>
      )}
      {err && <p role="alert" className="text-small text-danger">{k.failed}</p>}
    </div>
  );
}

const EMOJI = ["👍", "❤️", "🙏"];
const EDIT_MS = 15 * 60_000; // F-MSG-04: edit window

/** F-MSG-04 message-row actions: reactions, edit (15 min) with history, soft delete of your own message. */
function MsgExtras({ m, own, me, msgKey }: { m: Msg; own: boolean; me?: string; msgKey: readonly unknown[] }) {
  const { locale } = useI18n();
  const c = c2Copy(locale).msg;
  const edit = useEditMsg(msgKey);
  const del = useDeleteMsg(msgKey);
  const react = useReact(msgKey);
  const [draft, setDraft] = useState<string | null>(null);
  const [showHist, setShowHist] = useState(false);
  const hist = useMsgHistory(m.message_id, showHist);
  const reactions = m.reactions as Reaction[];
  const failed = edit.isError || del.isError || react.isError;
  const [openedAt] = useState(Date.now);
  const canEdit = own && m.kind !== "card" && openedAt - Date.parse(m.created_at) < EDIT_MS;
  return (
    <div className="mt-2 grid gap-1 text-small">
      {draft !== null && (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) edit.mutate({ id: m.message_id, content: draft.trim() }, { onSuccess: () => setDraft(null) });
          }}
        >
          <label>
            <span className="sr-only">{c.edit}</span>
            <textarea
              value={draft}
              maxLength={4000}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setDraft(null)}
              className="block w-full border border-border bg-surface px-3 py-2 text-ink-900"
            />
          </label>
          <div className="flex gap-2">
            <Button size="sm" type="submit" loading={edit.isPending}>{c.save}</Button>
            <Button size="sm" type="button" variant="outline" onClick={() => setDraft(null)}>{c.cancel}</Button>
          </div>
        </form>
      )}
      <div className="flex flex-wrap items-center gap-1">
        {EMOJI.map((e) => {
          const r = reactions.find((x) => x.emoji === e);
          const on = !!me && !!r?.user_ids.includes(me);
          return (
            <button
              key={e}
              type="button"
              aria-pressed={on}
              aria-label={fill(c.react, { e })}
              disabled={react.isPending}
              onClick={() => react.mutate({ id: m.message_id, emoji: e })}
              className={cx("h-8 min-w-8 px-1.5", on ? "bg-white/30" : "opacity-70 hover:opacity-100")}
            >
              {e}
              {r?.user_ids.length ? <span className="ml-0.5 tabular">{r.user_ids.length}</span> : null}
            </button>
          );
        })}
        {m.edited_at && (
          <button type="button" aria-expanded={showHist} onClick={() => setShowHist((x) => !x)} className="h-8 px-1.5 underline opacity-80">
            {c.edited}
          </button>
        )}
        {canEdit && draft === null && (
          <button type="button" onClick={() => setDraft(m.content)} className="h-8 px-1.5 underline opacity-80">
            {c.edit}
          </button>
        )}
        {own && (
          <button type="button" disabled={del.isPending} onClick={() => del.mutate(m.message_id)} className="h-8 px-1.5 underline opacity-80">
            {c.del}
          </button>
        )}
      </div>
      {showHist && (
        <div aria-label={c.history} className="grid gap-1 border-l-2 border-current/30 pl-2 opacity-80">
          {hist.isPending ? (
            <Skeleton className="h-4 w-1/2" />
          ) : hist.isError ? (
            <p role="alert">{c.actionFailed}</p>
          ) : (
            hist.data.map((h) => (
              <p key={h.edited_at} className="whitespace-pre-wrap break-words">
                <time dateTime={h.edited_at}>{formatDate(h.edited_at, locale, { timeStyle: "short" })}</time> · {h.content}
              </p>
            ))
          )}
        </div>
      )}
      {failed && <p role="alert" className="text-danger">{c.actionFailed}</p>}
    </div>
  );
}
