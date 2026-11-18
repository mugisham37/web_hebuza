"use client";
import { waLink } from "@/content/marketing";
// AI assistant UI (plan 11 §7.11–7.12, boards 04–07): useAssistant hook, AssistantPanel (dock / phone sheet / inline page),
// tool cards, state panels, launcher. The only AI surface is POST /api/assistant/* via httpTransport — no vendor in the browser.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { cx, formatMoney } from "@/shared/format";
import { errorCopy } from "@/lib/api/error-copy";
import { holdSlot, useRecentSessions } from "@/lib/booking/api";
import { api, unwrap } from "@/lib/api/client";
import type { CmsEntry } from "@/shared/marketing/types";
import { resolveVariant } from "@/shared/marketing/cms/rules";
import { AssistantHttpError, deriveMode, httpTransport as T, piiScan, type PiiKind } from "@/lib/booking/assistant";
import { formatDay, formatTime } from "@/shared/booking/rules";
import type { AiErrorType, AssistantStatus, ChatMessage, HandoffData, NoticeKind, StreamEvent, ToolCard } from "@/shared/booking/types";
import type { Locale } from "@/shared/i18n/config";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Checkbox, Input } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { CircleBadge } from "@/components/atoms/brand";
import { useToast } from "@/components/atoms/toast";
import { AiLabel, Citations, IllusAssistantResting, IllusHandoff, TypingDots, fill, useBkg, useOnline } from "@/components/atoms/booking";

const LANGS: Locale[] = ["rw", "en", "fr"];
const LANG_NAME: Record<Locale, string> = { rw: "Kinyarwanda", en: "English", fr: "Français" };
const MAX = 1200; // PLACEHOLDER(aia-max-chars): composer limit, counter from 1,000
const WA = waLink("Muraho HEBUZA");
const STORE = "aia.session";
const uid = () => Math.random().toString(36).slice(2, 10);

// ---------------------------------------------------------------- state hook
type Persist = { sessionId: string | null; messages: ChatMessage[]; lang: Locale; handedOff: boolean };
const load = (): Persist | null => { try { return JSON.parse(sessionStorage.getItem(STORE) ?? "null"); } catch { return null; } };
const save = (p: Persist) => { try { sessionStorage.setItem(STORE, JSON.stringify({ ...p, messages: p.messages.slice(-50) })); } catch { /* private mode */ } };

export function useAssistant(context: "public" | "portal" | "staff_test", defaultLang: Locale) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lang, setLang] = useState<Locale>(defaultLang);
  const [handedOff, setHandedOff] = useState(false);
  const [lastError, setLastError] = useState<AiErrorType | null>(null);
  const [streaming, setStreaming] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const online = useOnline();
  const persist = context !== "staff_test";
  const status = useQuery({ queryKey: ["aia", "status"], queryFn: () => T.status(), staleTime: 60_000 });

  useEffect(() => {
    if (!persist) return;
    const p = load();
    // Restored mid-stream (page navigation): mark as stopped (plan §7.12).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe: reads browser-only state after mount
    if (p) { setSessionId(p.sessionId); setMessages(p.messages.map((m) => (m.state === "streaming" ? { ...m, state: "stopped" } : m))); setLang(p.lang); setHandedOff(p.handedOff); }
  }, [persist]);
  useEffect(() => { if (persist && (sessionId || messages.length)) save({ sessionId, messages, lang, handedOff }); }, [persist, sessionId, messages, lang, handedOff]);
  useEffect(() => () => abort.current?.abort(), []);

  const patch = (id: string, f: (m: ChatMessage) => ChatMessage) => setMessages((ms) => ms.map((m) => (m.id === id ? f(m) : m)));

  async function run(userText: string | null, events: (sid: string, signal: AbortSignal) => AsyncIterable<StreamEvent>, userId?: string) {
    setLastError(null);
    let sid = sessionId;
    try {
      if (!sid) { sid = (await T.start({ lang, context, page: typeof location !== "undefined" ? location.pathname : undefined })).sessionId; setSessionId(sid); }
    } catch (e) { setLastError(e instanceof AssistantHttpError ? (e.errorType as AiErrorType) : "server_error"); if (userId) patch(userId, (m) => ({ ...m, state: "error" })); return; }
    const aid = uid();
    setMessages((ms) => [...ms, { id: aid, role: "assistant", text: "", citations: [], cards: [], notices: [], state: "streaming", lang }]);
    const ctrl = new AbortController();
    abort.current = ctrl;
    setStreaming(true);
    let gotDone = false;
    try {
      for await (const ev of events(sid!, ctrl.signal)) {
        if (ev.event === "meta") patch(aid, (m) => ({ ...m, messageId: ev.data.messageId, lang: ev.data.lang }));
        else if (ev.event === "delta") patch(aid, (m) => ({ ...m, text: m.text + ev.data.text }));
        else if (ev.event === "citation") patch(aid, (m) => ({ ...m, citations: [...m.citations, ev.data] }));
        else if (ev.event === "tool_card") patch(aid, (m) => ({ ...m, cards: [...m.cards, ev.data] }));
        else if (ev.event === "notice") patch(aid, (m) => ({ ...m, notices: [...new Set([...m.notices, ev.data.kind])] }));
        else if (ev.event === "handoff") { setHandedOff(true); patch(aid, (m) => ({ ...m, cards: [...m.cards, { kind: "handoff", data: ev.data }] })); }
        else if (ev.event === "done") {
          gotDone = true;
          patch(aid, (m) => ({ ...m, state: "done" }));
          if (userId && ev.data.maskedUserText) patch(userId, (m) => ({ ...m, text: ev.data.maskedUserText! }));
        } else if (ev.event === "error") { setLastError(ev.data.errorType); patch(aid, (m) => ({ ...m, state: "error" })); gotDone = true; }
      }
      if (!gotDone) patch(aid, (m) => ({ ...m, state: ctrl.signal.aborted ? "stopped" : "error" }));
    } catch (e) {
      if (ctrl.signal.aborted) patch(aid, (m) => ({ ...m, state: "stopped" }));
      else {
        const t = e instanceof AssistantHttpError ? (e.errorType as AiErrorType) : "server_error";
        setLastError(t);
        // Pre-stream refusals: drop the empty bubble so the state panel speaks instead.
        setMessages((ms) => ms.filter((m) => !(m.id === aid && !m.text && !m.cards.length)));
        if (userId && t !== "server_error") patch(userId, (m) => ({ ...m, state: "error" }));
        if (t === "server_error" && userId) setMessages((ms) => [...ms, { id: uid(), role: "assistant", text: "", citations: [], cards: [], notices: [], state: "error" }]);
      }
    } finally { setStreaming(false); abort.current = null; void userText; }
  }

  const send = useCallback((text: string) => {
    const t = text.trim().slice(0, MAX);
    if (!t) return;
    const id = uid();
    setMessages((ms) => [...ms, { id, role: "user", text: t, citations: [], cards: [], notices: [], state: "done" }]);
    void run(t, (sid, signal) => T.send(sid, t, lang, signal), id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, sessionId, context]);
  const answer = (toolCallId: string, value: unknown, label: string) => {
    const id = uid();
    setMessages((ms) => [...ms, { id, role: "user", text: label, citations: [], cards: [], notices: [], state: "done" }]);
    return run(label, (sid, signal) => T.answerTool(sid, toolCallId, value, lang, signal), id);
  };
  const retry = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    setMessages((ms) => ms.filter((m) => !(m.role === "assistant" && m.state === "error")));
    if (lastUser) void run(lastUser.text, (sid, signal) => T.send(sid, lastUser.text, lang, signal));
  };
  const stop = () => abort.current?.abort();
  const reset = () => { abort.current?.abort(); setSessionId(null); setMessages([]); setHandedOff(false); setLastError(null); try { sessionStorage.removeItem(STORE); } catch { /* ignore */ } };
  const handoff = async (reason: "user_request" = "user_request"): Promise<HandoffData> => {
    let sid = sessionId;
    if (!sid) { sid = (await T.start({ lang, context })).sessionId; setSessionId(sid); }
    const d = await T.handoff(sid, reason);
    setHandedOff(true);
    setMessages((ms) => [...ms, { id: uid(), role: "assistant", text: "", citations: [], cards: [{ kind: "handoff", data: d }], notices: [], state: "done" }]);
    return d;
  };
  const awaitingTool = !streaming && (() => {
    const last = messages.at(-1);
    return !!last && last.role === "assistant" && last.cards.some((c) => c.kind === "intake_question" || c.kind === "lead_form");
  })();
  const mode = deriveMode({ status: status.data ?? null, online, streaming, awaitingTool, handedOff, lastError });
  return { sessionId, messages, lang, setLang, mode, status: status.data as AssistantStatus | undefined, streaming, send, answer, retry, stop, reset, handoff, rate: T.rate, lead: T.lead, lastError, setLastError };
}
export type AssistantApi = ReturnType<typeof useAssistant>;

// ---------------------------------------------------------------- panel
export function AssistantPanel({ api, variant, onClose, onMinimise, contextChip }: {
  api: AssistantApi; variant: "dock" | "page" | "staff"; onClose?: () => void; onMinimise?: () => void; contextChip?: string | null;
}) {
  const { c, locale } = useBkg();
  const toast = useToast();
  const [humanBusy, setHumanBusy] = useState(false);
  const [rating, setRating] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const { messages, mode } = api;
  useEffect(() => { if (atBottom.current) log.current?.scrollTo({ top: log.current.scrollHeight }); }, [messages]);
  async function human() {
    setHumanBusy(true);
    try { await api.handoff(); } catch { toast({ title: c.aia.card.handoffFailed, tone: "danger" }); } finally { setHumanBusy(false); }
  }
  const blocking = mode === "off" || mode === "busy" || mode === "rate_limited" || mode === "blocked" || mode === "idle_closed";
  const lastAnnounce = [...messages].reverse().find((m) => m.role === "assistant" && m.state === "done")?.text ?? "";
  return (
    <div className={cx("flex h-full min-h-0 flex-col bg-surface", variant === "page" && " border border-border min-h-[36rem]")}>
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-700 text-gold-400"><Icon name="sparkle" size={18} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-label">{c.aia.title}</h2>
          <p className="truncate text-eyebrow text-fg-subtle">{c.aia.sub}</p>
        </div>
        {variant !== "staff" && <LangSwitch value={api.lang} onChange={(l) => { api.setLang(l); toast({ title: fill(c.aia.langSwitched, { lang: LANG_NAME[l] }) }); }} />}
        {variant !== "staff" && (
          <button type="button" onClick={human} disabled={humanBusy} aria-busy={humanBusy}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 border border-navy-700 px-3 text-eyebrow font-medium text-navy-700 hover:bg-navy-50 disabled:opacity-60">
            <Icon name="user" size={14} aria-hidden /><span className="max-[400px]:sr-only">{humanBusy ? c.aia.card.connecting : c.aia.human}</span>
          </button>
        )}
        {onMinimise && <button type="button" onClick={onMinimise} aria-label={c.aia.minimise} className="grid size-8 place-items-center hover:bg-ink-100"><Icon name="minus" size={16} aria-hidden /></button>}
        {onClose && <button type="button" onClick={() => (messages.length ? setRating(true) : onClose())} aria-label={c.aia.endChat} className="grid size-8 place-items-center hover:bg-ink-100"><Icon name="x" size={16} aria-hidden /></button>}
      </header>
      <StatusStrip api={api} />
      <div ref={log} role="log" aria-label={c.aia.title} aria-live="off" onScroll={(e) => { const el = e.currentTarget; atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; }}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4">
        {!messages.length && <Greeting api={api} contextChip={contextChip} staff={variant === "staff"} />}
        {messages.map((m) => <Message key={m.id} m={m} api={api} />)}
        {rating && <SessionRating api={api} onDone={() => { setRating(false); api.reset(); onClose?.(); }} />}
      </div>
      <p className="sr-only" aria-live="polite">{lastAnnounce}</p>
      {blocking ? <StatePanelAi api={api} /> : <Composer api={api} />}
      <footer className="flex items-center justify-between gap-2 border-t border-border px-4 py-2 text-eyebrow text-fg-subtle">
        <span>{c.aia.disclaimer.split(".")[0]}.</span>
        <Link href={localHref(locale, "/assistant/about")} className="shrink-0 underline underline-offset-2">{c.aia.about}</Link>
      </footer>
    </div>
  );
}

function LangSwitch({ value, onChange }: { value: Locale; onChange: (l: Locale) => void }) {
  return (
    <div role="radiogroup" aria-label="Language" className="hidden shrink-0 gap-0.5 bg-bg-subtle p-0.5 sm:flex">
      {LANGS.map((l) => <button key={l} type="button" role="radio" aria-checked={value === l} onClick={() => value !== l && onChange(l)} className={cx("h-7 px-2 text-eyebrow uppercase", value === l ? "bg-secondary text-on-navy" : "text-fg-muted")}>{l}</button>)}
    </div>
  );
}

function StatusStrip({ api }: { api: AssistantApi }) {
  const { c, locale } = useBkg();
  const s = api.status;
  const msg = api.mode === "offline" ? c.aia.state.offline
    : api.lastError === "stream_in_progress" ? c.aia.state.otherTab
    : s && !s.officeHours.open ? fill(c.aia.state.outOfHours, { when: s.officeHours.nextOpenAt ? `${formatDay(s.officeHours.nextOpenAt, locale)} ${formatTime(s.officeHours.nextOpenAt, locale)}` : "" })
    : api.mode === "handed_off" ? c.aia.state.handedOff : null;
  if (!msg) return null;
  return <p role="status" className={cx("px-4 py-2 text-eyebrow", api.mode === "offline" ? "bg-warning-bg text-warning" : "bg-bg-tint text-fg")}>{msg}</p>;
}

function Greeting({ api, contextChip, staff }: { api: AssistantApi; contextChip?: string | null; staff: boolean }) {
  const { c } = useBkg();
  const chips = [...(contextChip ? [fill(c.aia.pageChip, { service: contextChip })] : []), ...c.aia.starters];
  return (
    <div className="grid gap-3 m-rise">
      <Bubble role="assistant"><p>{c.aia.greeting}</p></Bubble>
      {!staff && <p className="bg-bg-subtle p-3 text-eyebrow text-fg-muted"><Icon name="shield" size={13} className="mr-1 inline" aria-hidden />{c.aia.retention}</p>}
      <div className="flex flex-wrap gap-2 m-stagger">
        {chips.map((s) => <button key={s} type="button" disabled={api.mode !== "ready"} onClick={() => api.send(s)} className="border border-border-strong px-3 py-2 text-small hover:bg-ink-100 disabled:opacity-50">{s}</button>)}
      </div>
    </div>
  );
}

function Bubble({ role, children, className }: { role: "user" | "assistant"; children: ReactNode; className?: string }) {
  return <div className={cx("max-w-[88%] px-4 py-2.5 text-body", role === "user" ? "self-end bg-secondary text-on-navy" : "self-start bg-bg-subtle", className)}>{children}</div>;
}

function Message({ m, api }: { m: ChatMessage; api: AssistantApi }) {
  const { c } = useBkg();
  const [more, setMore] = useState(false);
  if (m.role === "user") return <Bubble role="user"><p className="whitespace-pre-line break-words">{m.text}</p>{m.state === "error" && <span className="mt-1 block text-eyebrow opacity-70">{c.aia.state.error}</span>}</Bubble>;
  const long = m.text.length > 900;
  return (
    <div className="grid gap-2 self-stretch">
      {(m.text || m.state === "streaming") && (
        <Bubble role="assistant" className="m-rise">
          {!m.text && m.state === "streaming" ? <TypingDots /> : (
            <div className={cx("relative whitespace-pre-line break-words", long && !more && "line-clamp-[12]")}>
              {m.text}{m.state === "streaming" && <span aria-hidden className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 bg-navy-700 motion-safe:animate-pulse" />}
            </div>
          )}
          {long && m.state !== "streaming" && <button type="button" className="mt-1 text-eyebrow underline" onClick={() => setMore(!more)}>{more ? c.aia.showLess : c.aia.showMore}</button>}
          {m.state === "stopped" && <span className="mt-1 block text-eyebrow text-fg-subtle">{c.aia.stopped}</span>}
          {m.citations.length > 0 && <div className="mt-2"><Citations items={m.citations} /></div>}
        </Bubble>
      )}
      {m.notices.map((n) => <Notice key={n} kind={n} />)}
      {m.cards.map((card, i) => <div key={i} className="m-pop"><Card card={card} api={api} /></div>)}
      {m.state === "error" && (
        <div role="alert" className="flex flex-wrap items-center gap-2 self-start bg-danger-bg px-3 py-2 text-small text-danger">
          {m.text ? c.aia.incomplete : c.aia.retryMsg}
          <button type="button" className="font-medium underline" onClick={api.retry}>{c.common.retry}</button>
        </div>
      )}
      {m.state === "done" && m.text && <Thumbs m={m} api={api} />}
    </div>
  );
}

function Notice({ kind }: { kind: NoticeKind }) {
  const { c } = useBkg();
  const tone = kind === "pii_masked" ? "bg-warning-bg text-warning" : kind.startsWith("guardrail") || kind === "no_source" ? "bg-bg-tint text-fg" : "bg-bg-subtle text-fg-muted";
  return <p className={cx("flex gap-2 self-start px-3 py-2 text-small", tone)}><Icon name={kind === "pii_masked" ? "lock" : "shield"} size={15} className="mt-0.5 shrink-0" aria-hidden />{c.aia.notice[kind]}</p>;
}

function Thumbs({ m, api }: { m: ChatMessage; api: AssistantApi }) {
  const { c } = useBkg();
  const [v, setV] = useState<1 | -1 | null>(m.rating ?? null);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const rate = (x: 1 | -1, cm?: string) => { if (api.sessionId) void api.rate(api.sessionId, m.messageId ?? null, x, cm).catch(() => null); };
  if (sent) return <p className="text-eyebrow text-fg-subtle" role="status">{c.aia.thanks}</p>;
  return (
    <div className="flex flex-wrap items-center gap-1 text-eyebrow text-fg-subtle">
      <span>{c.aia.helpful}</span>
      <button type="button" aria-pressed={v === 1} aria-label={c.aia.rating.good} onClick={() => { setV(1); rate(1); setSent(true); }} className={cx("grid size-7 place-items-center hover:bg-ink-100", v === 1 && "bg-success-bg text-success")}>👍</button>
      <button type="button" aria-pressed={v === -1} aria-label={c.aia.rating.bad} onClick={() => { setV(-1); setOpen(true); }} className={cx("grid size-7 place-items-center hover:bg-ink-100", v === -1 && "bg-danger-bg text-danger")}>👎</button>
      {open && (
        <form className="flex w-full gap-2" onSubmit={(e) => { e.preventDefault(); rate(-1, comment || undefined); setSent(true); }}>
          <Input aria-label={c.aia.commentPh} placeholder={c.aia.commentPh} className="h-9 flex-1" maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
          <Button size="sm" type="submit">{c.aia.sendFeedback}</Button>
        </form>
      )}
    </div>
  );
}

function SessionRating({ api, onDone }: { api: AssistantApi; onDone: () => void }) {
  const { c } = useBkg();
  const [comment, setComment] = useState("");
  const done = (v?: 1 | -1) => { if (v && api.sessionId) void api.rate(api.sessionId, null, v, comment || undefined).catch(() => null); onDone(); };
  return (
    <div className="grid gap-3 border border-border p-4 m-pop">
      <p className="text-label">{c.aia.rating.title}</p>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => done(1)}>👍 {c.aia.rating.good}</Button>
        <Button size="sm" variant="secondary" onClick={() => done(-1)}>👎 {c.aia.rating.bad}</Button>
      </div>
      <Input aria-label={c.aia.commentPh} placeholder={c.aia.commentPh} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
      <button type="button" className="w-fit text-small underline" onClick={() => done()}>{c.aia.endChat}</button>
    </div>
  );
}

// ---------------------------------------------------------------- composer (no attachments, PII pre-warning)
function Composer({ api }: { api: AssistantApi }) {
  const { c } = useBkg();
  const [text, setText] = useState("");
  const [warn, setWarn] = useState<PiiKind[] | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const disabled = api.mode === "offline" || api.mode === "awaiting_tool_input";
  const submit = (force = false) => {
    const t = text.trim();
    if (!t || api.streaming || disabled) return;
    const kinds = piiScan(t);
    if (kinds.length && !force) { setWarn(kinds); return; }
    setWarn(null); api.send(t); setText("");
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
    if (e.key === "Escape" && api.streaming) { e.preventDefault(); e.stopPropagation(); api.stop(); }
  };
  useEffect(() => { const el = ta.current; if (el) { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 160)}px`; } }, [text]);
  return (
    <form className="border-t border-border px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" onSubmit={(e: FormEvent) => { e.preventDefault(); submit(); }}>
      {warn && (
        <div role="alert" className="mb-2 grid gap-2 bg-warning-bg p-3 text-small text-warning">
          <p>{fill(c.aia.pii.title, { kind: warn.map((k) => c.aia.pii[k]).join(", ") })}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => { setWarn(null); ta.current?.focus(); }}>{c.aia.pii.editMsg}</Button>
            <Button size="sm" variant="ghost" onClick={() => submit(true)}>{c.aia.pii.sendAnyway}</Button>
          </div>
        </div>
      )}
      <div className="flex items-end gap-2 border border-border bg-surface p-1.5 focus-within:border-navy-700">
        <label className="sr-only" htmlFor="aia-composer">{c.aia.placeholder}</label>
        <textarea id="aia-composer" ref={ta} rows={1} value={text} maxLength={MAX} disabled={disabled} placeholder={c.aia.placeholder} onKeyDown={onKey}
          onChange={(e) => { setText(e.target.value); setWarn(null); }} className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-body outline-none disabled:opacity-60" />
        {api.streaming
          ? <Button type="button" size="sm" variant="secondary" onClick={api.stop} aria-label={c.aia.stop}><span aria-hidden className="size-3 bg-navy-700" />{c.aia.stop}</Button>
          : <Button type="submit" size="sm" disabled={!text.trim() || disabled} aria-label={c.aia.send}><Icon name="arrowUpRight" size={16} aria-hidden /></Button>}
      </div>
      {text.length >= 1000 && <p className="mt-1 text-right text-eyebrow tabular-nums text-fg-subtle">{fill(c.aia.counter, { n: text.length, max: MAX })}</p>}
    </form>
  );
}

// ---------------------------------------------------------------- state panels (busy / off / rate-limited / blocked / idle)
function StatePanelAi({ api }: { api: AssistantApi }) {
  const { c, locale } = useBkg();
  const s = api.status;
  const reset = s?.resetAt ? formatTime(s.resetAt, locale) : "";
  const [title, body] = api.mode === "busy" ? [c.aia.state.resting, c.aia.state.restingBody]
    : api.mode === "off" ? [c.aia.state.off, c.aia.state.restingBody]
    : api.mode === "rate_limited" ? [fill(c.aia.state.rateLimited, { time: reset }), null]
    : api.mode === "blocked" ? [c.aia.state.blocked, null]
    : [c.aia.state.idle, null];
  return (
    <div className="grid gap-3 border-t border-border p-4 m-rise">
      <div className="flex items-start gap-3">
        <IllusAssistantResting className="size-12 shrink-0 text-navy-700" />
        <div><p className="text-label">{title}</p>{body && <p className="text-small text-fg-muted">{body}</p>}</div>
      </div>
      {(api.mode === "busy" || api.mode === "off") && <FaqSearch />}
      <div className="flex flex-wrap gap-2">
        {api.mode === "idle_closed" && <Button size="sm" onClick={api.reset}>{c.aia.state.newChat}</Button>}
        <a href={WA} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 border border-border-strong px-3 text-small"><Icon name="message" size={14} aria-hidden />{c.common.whatsapp}</a>
        <ButtonLink size="sm" variant="outline" href={localHref(locale, "/book/callback")}>{c.common.callUs}</ButtonLink>
        <ButtonLink size="sm" variant="outline" href={localHref(locale, "/book")}>{c.common.book}</ButtonLink>
      </div>
    </div>
  );
}

/** Published FAQ entries → q/a in one locale (same resolution as the public FAQ page). */
const faqItems = (es: CmsEntry[], l: Locale) => es.filter((e) => e.type === "faq" && !e.archivedTo).flatMap((e) => {
  const r = resolveVariant(e, l, false);
  return r ? [{ q: r.variant.title, a: String((r.variant.body[e.blocks[0]?.id ?? "a"] as { text?: string })?.text ?? "") }] : [];
});

/** Offline FAQ search while the AI is resting (keyword match over the public FAQ feed). */
function FaqSearch() {
  const { c, locale } = useBkg();
  const [q, setQ] = useState("");
  const faq = useQuery({ queryKey: ["aia", "faq", locale], queryFn: async () => faqItems(await unwrap<CmsEntry[]>(api.GET("/api/content/entries")), locale), staleTime: 300_000 });
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const hits = words.length ? (faq.data ?? []).filter((f) => words.some((w) => `${f.q} ${f.a}`.toLowerCase().includes(w))).slice(0, 3) : [];
  return (
    <div className="grid gap-2">
      <Input type="search" aria-label={c.aia.state.faqSearch} placeholder={c.aia.state.faqSearch} value={q} onChange={(e) => setQ(e.target.value)} className="h-10" />
      {words.length > 0 && (hits.length ? <ul className="grid gap-2">{hits.map((h) => <li key={h.q}><details className="bg-bg-subtle p-3 text-small"><summary className="cursor-pointer font-medium">{h.q}</summary><p className="mt-2 text-fg-muted">{h.a}</p></details></li>)}</ul>
        : <p className="text-small text-fg-muted">{c.aia.state.faqEmpty}</p>)}
    </div>
  );
}

// ---------------------------------------------------------------- tool cards
function CardShell({ children, tone = "white" }: { children: ReactNode; tone?: "white" | "success" | "tint" }) {
  return <div className={cx("grid gap-3 border p-4", tone === "success" ? "border-transparent bg-success-bg" : tone === "tint" ? "border-transparent bg-bg-tint" : "border-border bg-surface")}>{children}</div>;
}
function Fee({ fee }: { fee: { min: number; max: number | null; asOf: string } }) {
  const { c, locale } = useBkg();
  return (
    <p className="grid text-small">
      <span className="text-label tabular-nums">{fee.max ? `${formatMoney(fee.min, "RWF", locale)} – ${formatMoney(fee.max, "RWF", locale)}` : fill(c.aia.card.from, { amount: formatMoney(fee.min, "RWF", locale) })}</span>
      <span className="text-eyebrow text-fg-subtle">{c.aia.card.indicative} · {fill(c.aia.card.asOf, { date: formatDay(fee.asOf, locale) })}</span>
    </p>
  );
}

function Card({ card, api }: { card: ToolCard; api: AssistantApi }) {
  const { c, locale } = useBkg();
  const h = (p: string) => (p.startsWith("/") ? localHref(locale, p) : p);
  switch (card.kind) {
    case "service": return (
      <CardShell>
        <div><p className="text-label">{card.name}</p><p className="text-small text-fg-muted">{card.summary}</p></div>
        {card.fee && <Fee fee={card.fee} />}
        {card.turnaround && <p className="text-eyebrow text-fg-subtle"><Icon name="clock" size={12} className="mr-1 inline" aria-hidden />{card.turnaround}</p>}
        <div className="flex flex-wrap gap-2"><ButtonLink size="sm" href={h(card.applyHref)}>{c.aia.card.apply}</ButtonLink><ButtonLink size="sm" variant="outline" href={h(card.bookHref)}>{c.aia.card.bookCta}</ButtonLink></div>
      </CardShell>
    );
    case "requirements": return (
      <CardShell>
        <p className="text-label">{fill(c.aia.card.requirements, { name: card.name })}</p>
        <ul className="grid gap-1.5 text-small">{card.items.map((i) => <li key={i.label} className="flex gap-2"><Icon name="fileCheck" size={15} className="mt-0.5 shrink-0 text-navy-700" aria-hidden />{i.label}{!i.required && <span className="text-fg-subtle">({c.common.optional})</span>}</li>)}</ul>
        <div className="flex flex-wrap gap-2"><ButtonLink size="sm" variant="outline" href={h(card.serviceHref)}>{fill(c.aia.card.goTo, { name: card.name })}</ButtonLink><ButtonLink size="sm" variant="ghost" href={localHref(locale, "/faq")}>{c.aia.card.faq}</ButtonLink></div>
      </CardShell>
    );
    case "fee": return <CardShell><p className="text-label">{fill(c.aia.card.feeOf, { name: card.name })}</p><Fee fee={card.fee} /></CardShell>;
    case "slots": return <SlotsCard card={card} />;
    case "intake_question": return <IntakeCard card={card} api={api} />;
    case "secure_upload": return (
      <CardShell tone="tint">
        <p className="flex gap-2 text-small"><Icon name="lock" size={16} className="mt-0.5 shrink-0" aria-hidden />{card.draftId ? c.aia.card.upload : c.aia.card.uploadNeedsDraft}</p>
        <ButtonLink size="sm" className="w-fit" href={h(card.href)}>{c.aia.card.uploadCta}</ButtonLink>
      </CardShell>
    );
    case "draft": return card.expired ? (
      <CardShell><p className="text-small">{c.aia.card.draftExpired}</p><Button size="sm" className="w-fit" onClick={() => api.send(card.serviceName)}>{c.aia.card.startAgain}</Button></CardShell>
    ) : (
      <CardShell tone="success">
        <p className="text-label">{fill(c.aia.card.draft, { service: card.serviceName })}</p>
        <p className="text-small">{fill(c.aia.card.draftBody, { n: card.answeredCount })}</p>
        {card.missingDocs.length > 0 && <p className="text-small"><span className="font-medium">{c.aia.card.missing}</span> {card.missingDocs.join(", ")}</p>}
        <p className="text-eyebrow text-fg-subtle">{fill(c.aia.card.expires, { date: formatDay(card.expiresAt, locale) })}</p>
        <div className="flex flex-wrap gap-2"><ButtonLink size="sm" href={h(card.reviewHref)}>{c.aia.card.review}</ButtonLink><ButtonLink size="sm" variant="outline" href={h(card.docsHref)}>{c.aia.card.docs}</ButtonLink></div>
      </CardShell>
    );
    case "case_status": return (
      <CardShell>
        <p className="text-label">{c.aia.card.cases}</p>
        <ul className="grid gap-2">{card.cases.map((x) => (
          <li key={x.ref}><Link href={h(x.href)} className="grid gap-0.5 bg-bg-subtle p-3 text-small hover:bg-ink-100">
            <span className="flex justify-between gap-2"><span className="font-mono">{x.ref}</span><span className="bg-surface px-2 text-eyebrow">{x.status}</span></span>
            <span>{x.service}</span><span className="text-eyebrow text-fg-subtle">{c.aia.card.next} {x.nextStep}</span>
          </Link></li>
        ))}</ul>
      </CardShell>
    );
    case "case_not_found": return <CardShell><p className="text-small">{c.aia.card.notFound}</p></CardShell>;
    case "sign_in_to_track": return (
      <CardShell><p className="text-small">{c.aia.card.signIn}</p>
        <div className="flex flex-wrap gap-2"><ButtonLink size="sm" href={localHref(locale, "/sign-in")}>{c.aia.card.signIn.split("")[0]}</ButtonLink><ButtonLink size="sm" variant="outline" href={localHref(locale, "/track")}>{c.aia.card.track}</ButtonLink></div>
      </CardShell>
    );
    case "lead_form": return <LeadCard card={card} api={api} />;
    case "handoff": return <HandoffCard d={card.data} />;
  }
}

function SlotsCard({ card }: { card: Extract<ToolCard, { kind: "slots" }> }) {
  const { c, locale } = useBkg();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <CardShell>
      <p className="text-label">{fill(c.aia.card.slots, { name: card.typeName })}</p>
      <div role="radiogroup" aria-label={card.typeName} className="flex flex-wrap gap-2 m-stagger">
        {card.slots.map((s) => (
          <button key={s.startsAt} type="button" role="radio" aria-checked={busy === s.startsAt} disabled={!!busy} className="m-press border border-border-strong px-3 py-2 text-small tabular-nums hover:bg-ink-100 disabled:opacity-60"
            onClick={async () => {
              setBusy(s.startsAt);
              try {
                const hold = await holdSlot({ type: card.typeSlug, starts_at: s.startsAt, adviser_id: s.adviserIds[0] ?? null });
                router.push(`${localHref(locale, `/book/${card.typeSlug}`)}?step=details&hold=${hold.bookingId}`);
              } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); setBusy(null); }
            }}>
            {busy === s.startsAt ? c.aia.card.holding : `${formatDay(s.startsAt, locale)} · ${formatTime(s.startsAt, locale)}`}
          </button>
        ))}
      </div>
      <ButtonLink size="sm" variant="ghost" className="w-fit" href={card.moreHref.startsWith("/") ? localHref(locale, card.moreHref) : card.moreHref}>{c.aia.card.more}</ButtonLink>
    </CardShell>
  );
}

function IntakeCard({ card, api }: { card: Extract<ToolCard, { kind: "intake_question" }>; api: AssistantApi }) {
  const { c } = useBkg();
  const [v, setV] = useState("");
  const [err, setErr] = useState(false);
  const [sent, setSent] = useState(false);
  const f = card.field;
  const answer = (value: unknown, label: string) => { if (sent || api.streaming) return; setSent(true); void api.answer(card.toolCallId, value, label); };
  return (
    <CardShell tone="tint">
      <div className="flex items-center justify-between gap-2"><span className="text-eyebrow text-fg-subtle tabular-nums">{fill(c.aia.card.step, { n: card.step, total: card.total })}</span>
        <span aria-hidden className="h-1.5 w-24 overflow-hidden bg-surface"><span className="block h-full bg-navy-700" style={{ width: `${(card.step / card.total) * 100}%` }} /></span></div>
      <p className="text-label">{f.label}</p>
      {f.help && <p className="text-small text-fg-muted">{f.help}</p>}
      {f.type === "choice" ? (
        <div className="flex flex-wrap gap-2 m-stagger">{f.options?.map((o) => <button key={o} type="button" disabled={sent} onClick={() => answer(o, o)} className="m-press bg-surface px-3 py-2 text-small hover:bg-ink-100 disabled:opacity-60">{o}</button>)}</div>
      ) : (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (f.required && !v.trim()) { setErr(true); return; } answer(f.type === "number" ? Number(v) : v, v); }}>
          <Input aria-label={f.label} aria-invalid={err || undefined} type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} className="h-10 flex-1 bg-surface" disabled={sent} value={v} onChange={(e) => { setV(e.target.value); setErr(false); }} />
          <Button size="sm" type="submit" disabled={sent}>{c.aia.card.answer}</Button>
        </form>
      )}
      {err && <p role="alert" className="text-small text-danger">{c.aia.card.invalid}</p>}
      <button type="button" disabled={sent} className="w-fit text-small underline underline-offset-4 disabled:opacity-60" onClick={() => answer("__unsure__", c.aia.card.notSure)}>{c.aia.card.notSure}</button>
    </CardShell>
  );
}

function LeadCard({ card, api }: { card: Extract<ToolCard, { kind: "lead_form" }>; api: AssistantApi }) {
  const { c, locale } = useBkg();
  const [v, setV] = useState({ name: "", contact: "", consent: false });
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (done) return <CardShell tone="success"><p className="text-small" role="status">{fill(c.aia.card.leadDone, { id: done })}</p></CardShell>;
  return (
    <CardShell>
      <p className="text-small">{c.aia.card.lead}</p>
      <form noValidate className="grid gap-2" onSubmit={async (e) => {
        e.preventDefault();
        if (!v.name.trim() || !v.contact.trim()) { setErr(c.details.eContact); return; }
        if (!v.consent) { setErr(c.details.ePrivacy); return; }
        if (!api.sessionId) return;
        setBusy(true); setErr(null);
        try {
          const isMail = v.contact.includes("@");
          const r = await api.lead(api.sessionId, { toolCallId: card.toolCallId, name: v.name, phone: isMail ? undefined : v.contact, email: isMail ? v.contact : undefined, topic: card.topic, consent: true });
          setDone(r.leadId);
        } catch (x) { setErr(errorCopy(x, locale)); } finally { setBusy(false); }
      }}>
        <Input aria-label={c.details.name} placeholder={c.details.name} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} autoComplete="name" />
        <Input aria-label={c.manage.contact} placeholder={c.manage.contact} value={v.contact} onChange={(e) => setV({ ...v, contact: e.target.value })} autoComplete="email" />
        <Checkbox label={c.details.privacy} checked={v.consent} onChange={(e) => setV({ ...v, consent: e.target.checked })} />
        {err && <p role="alert" className="text-small text-danger">{err}</p>}
        <Button size="sm" type="submit" loading={busy} className="w-fit">{c.aia.sendFeedback}</Button>
      </form>
    </CardShell>
  );
}

function HandoffCard({ d }: { d: HandoffData }) {
  const { c, locale } = useBkg();
  const { user } = useSession();
  const why = c.aia.card.handoffWhy[d.reasonCode];
  return (
    <CardShell tone="tint">
      <div className="flex items-start gap-3">
        <IllusHandoff className="size-12 shrink-0 text-navy-700" />
        <div className="grid gap-1 text-small">
          {why && <p className="font-medium">{why}</p>}
          <p>{d.inHours ? fill(c.aia.card.handoffIn, { promise: d.promise ?? "" }) : fill(c.aia.card.handoffOut, { when: d.nextOpenAt ? `${formatDay(d.nextOpenAt, locale)} ${formatTime(d.nextOpenAt, locale)}` : "" })}</p>
          {d.ticketRef && <p className="font-mono text-eyebrow text-fg-subtle">{fill(c.aia.card.handoffTicket, { ref: d.ticketRef })}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {d.inHours && user && d.conversationId && <ButtonLink size="sm" href={localHref(locale, `/messages/${d.conversationId}`)}>{c.aia.card.continueMsgs}</ButtonLink>}
        {!d.inHours && <ButtonLink size="sm" href={d.callbackHref.startsWith("/") ? localHref(locale, d.callbackHref) : d.callbackHref}>{c.common.callUs}</ButtonLink>}
        <ButtonLink size="sm" variant="outline" href={d.bookHref.startsWith("/") ? localHref(locale, d.bookHref) : d.bookHref}>{c.common.book}</ButtonLink>
        <a href={d.whatsapp || WA} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 border border-border-strong px-3 text-small"><Icon name="message" size={14} aria-hidden />WhatsApp</a>
      </div>
    </CardShell>
  );
}

// ---------------------------------------------------------------- launcher (public + client shell)
// Launcher (round seal) sits bottom-right; BackToTop stacks above it.
const HIDE_ON = /\/(apply|pay|assistant|sign-in|sign-up|reset|verify)(\/|$)/;
const NO_TEASER = /\/(apply|pay|book)(\/|$)/;
const mqSubscribe = (f: () => void) => { const m = matchMedia("(max-width: 639px)"); m.addEventListener("change", f); return () => m.removeEventListener("change", f); };
export function AssistantLauncher({ context = "public" }: { context?: "public" | "portal" }) {
  const { c, locale } = useBkg();
  const path = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const dlg = useRef<HTMLDialogElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const phone = useSyncExternalStore(mqSubscribe, () => matchMedia("(max-width: 639px)").matches, () => false);
  const api = useAssistant(context, locale);
  const off = api.status && !api.status.enabled;
  const service = path.match(/\/services\/([^/?#]+)/)?.[1]?.replace(/-/g, " ") ?? null;
  const hidden = HIDE_ON.test(path);
  // Teaser: once per session, never on /book /apply /pay, dismiss persists (board 04 fix).
  useEffect(() => {
    if (hidden || NO_TEASER.test(path)) return;
    let seen = false; try { seen = !!sessionStorage.getItem("aia.teaser"); } catch { /* ignore */ }
    if (seen) return;
    const t = setTimeout(() => setTeaser(true), 6000);
    return () => clearTimeout(t);
  }, [hidden, path]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe: reads browser-only state after mount
  useEffect(() => { try { if (sessionStorage.getItem("aia.open") === "1" || location.hash === "#assistant") setOpen(true); } catch { /* ignore */ } }, []);
  useEffect(() => {
    const d = dlg.current; if (!d) return;
    try { sessionStorage.setItem("aia.open", open ? "1" : "0"); } catch { /* ignore */ }
    if (open && !d.open) { if (phone) d.showModal(); else d.show(); setTimeout(() => document.getElementById("aia-composer")?.focus(), 50); }
    if (!open && d.open) { d.close(); btn.current?.focus(); }
  }, [open, phone]);
  const dismissTeaser = () => { setTeaser(false); try { sessionStorage.setItem("aia.teaser", "1"); } catch { /* ignore */ } };
  if (hidden && !open) return null;
  return (
    <>
      {!open && (
        <div className="floating-helper fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex flex-col items-end gap-2 md:right-6 md:bottom-6">
          {teaser && (
            <div className="m-pop flex max-w-[16rem] items-start gap-2 bg-surface p-3 text-small shadow-lg ring-1 ring-border">
              <button type="button" className="text-left" onClick={() => { dismissTeaser(); setOpen(true); }}>{service ? fill(c.aia.pageChip, { service }) : c.aia.greeting.split("!")[0] + "!"}</button>
              <button type="button" aria-label={c.common.close} onClick={dismissTeaser} className="shrink-0 text-fg-subtle"><Icon name="x" size={14} aria-hidden /></button>
            </div>
          )}
          <button ref={btn} type="button" onClick={() => { dismissTeaser(); setOpen(true); }}
            aria-label={off ? c.aia.launcherOff : c.aia.launcher}
            data-round className="m-press rounded-full shadow-lg transition-[scale,box-shadow] duration-(--duration-base) hover:scale-105 hover:shadow-[0_0_24px_var(--color-gold-400)] motion-reduce:hover:scale-100">
            <CircleBadge text={c.aia.seal} size="size-16 sm:size-20" center={off ? <Icon name="message" size={24} className="text-primary" aria-hidden /> : undefined} />
          </button>
        </div>
      )}
      <dialog ref={dlg} data-motion aria-label={c.aia.title} onCancel={(e) => { e.preventDefault(); if (api.streaming) api.stop(); else setOpen(false); }}
        className={cx("m-0 overflow-hidden p-0 backdrop:bg-ink-950/60", phone ? "fixed inset-0 h-dvh max-h-none w-screen max-w-none" : "fixed right-4 bottom-4 left-auto top-auto z-50 h-[min(600px,calc(100dvh-2rem))] w-[400px] shadow-2xl ring-1 ring-border")}>
        {open && <AssistantPanel api={api} variant="dock" contextChip={service} onMinimise={() => setOpen(false)} onClose={() => setOpen(false)} />}
      </dialog>
    </>
  );
}

// ---------------------------------------------------------------- /assistant page (inline panel + recent sessions)
export function AssistantPage() {
  const { c, locale } = useBkg();
  const { user } = useSession();
  const api = useAssistant(user ? "portal" : "public", locale);
  const recent = useRecentSessions(!!user);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-start">
      <div className="h-[min(72dvh,46rem)]"><AssistantPanel api={api} variant="page" /></div>
      <aside className="grid gap-4">
        <div className="border border-border bg-surface p-5">
          <AiLabel kind="assistant" />
          <p className="mt-2 text-small text-fg-muted">{c.aia.disclaimer}</p>
          <div className="mt-3 grid gap-1 text-small">
            <Link href={localHref(locale, "/assistant/about")} className="underline underline-offset-4">{c.aia.page.aboutLink}</Link>
            <Link href={localHref(locale, "/faq")} className="underline underline-offset-4">{c.aia.page.faq}</Link>
          </div>
        </div>
        {user && (
          <div className="border border-border bg-surface p-5">
            <h2 className="mb-2 text-label">{c.aia.recent}</h2>
            {recent.isPending ? <p className="text-small text-fg-muted">{c.common.loading}</p> : !recent.data?.length ? <p className="text-small text-fg-muted">{c.aia.recentEmpty}</p> : (
              <ul className="grid gap-2 text-small">{recent.data.map((s) => <li key={s.id} className="grid"><span className="truncate">{s.title}</span><span className="text-eyebrow text-fg-subtle">{formatDay(s.startedAt, locale)} · {s.outcome}</span></li>)}</ul>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
