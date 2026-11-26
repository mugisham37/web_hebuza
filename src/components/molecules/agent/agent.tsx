"use client";
import { uploadFile } from "@/lib/api/upload";
import { useRef, useState, type ReactNode, useEffect } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDate, formatMoney } from "@/shared/format";
import { Icon } from "@/components/atoms/icon";
import { Button } from "@/components/atoms/button";
import { Field, Input, Checkbox } from "@/components/atoms/field";
import { fill } from "@/content/pages/work-common";
import { signatureMatches } from "@/shared/agent/core";
import { errorCopy } from "@/lib/api/error-copy";
import { type Rate } from "@/lib/agent/money";
import { type ContractDoc, type External, type LicenceInvoice, type Application } from "@/lib/work/api";
import { POLICY } from "@/shared/policy";
import { EvidenceLine, ExpiryChip, ReadMeter, useW } from "@/components/atoms/work";
import { type InboxCopy } from "@/content/pages/agent-inbox";
import { type OutboxState } from "@/lib/agent/outbox";
import { type WorkApply } from "@/content/pages/work-apply";

// Stage 8 shared molecules (plan §5.3) used by more than one lane. Lane-only molecules live in the lane folders.
/** XK5 / HO2: "You will earn RWF 15,000 on an eligible fee of RWF 50,000" + rate note. */
export function OfferEarnings({ earning, eligible, rate, showFee = true, compact }: { earning: number; eligible?: number; rate: Rate; showFee?: boolean; compact?: boolean }) {
  const w = useW();
  const { locale } = useI18n();
  const amount = formatMoney(earning, "RWF", locale);
  const line = showFee && eligible ? fill(w.earn.line, { amount, fee: formatMoney(eligible, "RWF", locale) }) : fill(w.earn.lineNoFee, { amount });
  return (
    <div className={cx("border-l-4 border-navy-700 bg-navy-50 text-fg", compact ? "px-3 py-2" : "p-4")}>
      <p className={cx("flex items-start gap-2", compact ? "text-small" : "text-label")}>
        <Icon name="wallet" size={compact ? 15 : 18} aria-hidden className="mt-0.5 shrink-0 text-navy-700" />
        <span className="tabular">{line}</span>
      </p>
      {!compact && (
        <p className="mt-1 pl-7 text-small text-fg-muted">
          {rate.flat !== undefined ? w.earn.flatNote : fill(w.earn.pctNote, { p: (rate.bps ?? 0) / 100 })}
        </p>
      )}
    </div>
  );
}

const CONTRACT_TONE: Record<External["contractState"], string> = {
  active: "bg-success-bg text-success",
  expiring: "bg-warning-bg text-warning",
  expired: "bg-danger-bg text-danger",
  notice_given: "bg-ink-100 text-ink-700",
  pending_signature: "bg-navy-50 text-navy-700",
};
/** XK5 / HO1 contract card. */
export function ContractStatusCard({ state, end, href }: { state: External["contractState"]; end: string | null; href: string }) {
  const w = useW();
  const { locale } = useI18n();
  return (
    <Link href={localHref(locale, href)} className="group block border border-border bg-surface p-4 transition-colors hover:border-navy-300 m-lift">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center bg-navy-50 text-navy-700">
          <Icon name="file" size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-label">
            {w.contract.title}
            <span className={cx("inline-flex h-6 items-center px-2.5 text-eyebrow font-medium normal-case", CONTRACT_TONE[state])}>{w.contract[state]}</span>
          </p>
          <p className="mt-0.5 text-small text-fg-muted">{end ? fill(w.contract.until, { d: formatDate(end, locale) }) : w.expiry.none}</p>
          <p className="text-eyebrow text-fg-subtle">{w.contract.reminders}</p>
        </div>
        <Icon name="arrowRight" size={16} aria-hidden className="mt-1 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
      </div>
      {(state === "expiring" || state === "expired") && (
        <div className={cx("mt-3 flex flex-wrap items-center gap-2 px-3 py-2 text-small", state === "expired" ? "bg-danger-bg" : "bg-warning-bg")}>
          <ExpiryChip date={end} />
          <span className="flex-1">{state === "expired" ? w.contract.expiredBody : ""}</span>
          <span className="font-medium underline underline-offset-4">{w.contract.renew}</span>
        </div>
      )}
    </Link>
  );
}

/** HO1 licence card: paid / due / overdue / netted / waived. */
export function LicenceStatusCard({ fee, href }: { fee: LicenceInvoice | null; href: string }) {
  const w = useW();
  const { locale } = useI18n();
  const amount = formatMoney(fee?.amount ?? POLICY.licenceFeeMonthly, "RWF", locale);
  const st = fee?.status ?? "paid";
  const good = st === "paid" || st === "netted" || st === "waived";
  return (
    <Link href={localHref(locale, href)} className="group flex items-center gap-3 border border-border bg-surface p-4 transition-colors hover:border-navy-300 m-lift">
      <span className={cx("flex size-10 shrink-0 items-center justify-center rounded-full", good ? "bg-success-bg text-success" : st === "overdue" ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning")}>
        <Icon name={good ? "check" : "clock"} size={18} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-label">
          {w.licence.title} · <span className="font-normal">{fill(w.licence.status[st], { d: fee ? formatDate(fee.due, locale) : "" })}</span>
        </span>
        <span className="block text-small text-fg-muted tabular">{fill(w.licence.perMonth, { amount })}</span>
      </span>
      <Icon name="arrowRight" size={16} aria-hidden className="text-fg-subtle transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/** XK1 per-service clearance list. */
export function ServiceClearanceList({ services, fixHref }: { services: External["services"]; fixHref?: string }) {
  const w = useW();
  const { locale } = useI18n();
  return (
    <ul className="divide-y divide-border border border-border bg-surface m-stagger">
      {services.map((s, i) => (
        <li key={s.slug} style={{ ["--i" as string]: i }} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <Icon
            name={s.state === "cleared" ? "check" : s.state === "pending" ? "clock" : "x"}
            size={16}
            aria-hidden
            className={s.state === "cleared" ? "text-success" : s.state === "pending" ? "text-warning" : "text-danger"}
          />
          <span className="min-w-0 flex-1 text-small">{s.name}</span>
          <span className={cx("text-small", s.state === "not_cleared" ? "text-danger" : "text-fg-muted")}>
            {w.service[s.state]}
            {s.reason && ` · ${w.service.reason[s.reason as keyof typeof w.service.reason] ?? s.reason}`}
          </span>
          {s.state === "not_cleared" && fixHref && (
            <Link href={localHref(locale, fixHref)} className="text-small font-medium text-link underline underline-offset-4 hover:text-link-hover">
              {w.fix}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

/** XK7 / CT2 click-to-sign: scroll to 100% → agree → typed name matches → Sign → evidence. */
export function SignDocument({
  doc,
  signerName,
  onSign,
  extra,
}: {
  doc: ContractDoc;
  signerName: string;
  onSign: (typedName: string) => Promise<unknown>;
  extra?: ReactNode;
}) {
  const w = useW();
  const [pct, setPct] = useState(0);
  const [agree, setAgree] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { locale } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const signed = !!doc.signedAt && doc.status !== "pending_signature";
  if (signed && doc.evidence)
    return (
      <div className="grid gap-2 border border-success/30 bg-success-bg/40 p-4">
        <p className="flex items-center gap-2 text-label">
          <Icon name="fileCheck" size={18} aria-hidden className="text-success" />
          {doc.title} · v{doc.version}
        </p>
        <EvidenceLine signedAt={doc.signedAt!} ip={doc.evidence.ip} sha={doc.evidence.sha256} />
      </div>
    );
  const onScroll = () => {
    const el = box.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setPct((p) => Math.max(p, max <= 0 ? 100 : (el.scrollTop / max) * 100));
  };
  const nameOk = signatureMatches(name, signerName);
  const ready = pct >= 99.5 && agree && nameOk;
  return (
    <div className="grid gap-4 border border-border bg-surface p-4 sm:p-5">
      <p className="text-label">
        {doc.title} · v{doc.version}
      </p>
      <div
        ref={(el) => {
          box.current = el;
          if (el && el.scrollHeight <= el.clientHeight && pct < 100) queueMicrotask(() => setPct(100));
        }}
        onScroll={onScroll}
        tabIndex={0}
        aria-label={doc.title}
        className="max-h-64 overflow-y-auto border border-border bg-bg-subtle p-4 text-fg text-small leading-relaxed focus-visible:outline-2"
      >
        <ol className="grid list-decimal gap-3 pl-5">
          {doc.terms.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
        {extra}
        <p className="mt-4 text-fg-subtle">{doc.title} v{doc.version} · {formatDate(doc.start, locale)}</p>
      </div>
      <ReadMeter pct={pct} />
      <Checkbox label={w.sign.agree} checked={agree} disabled={pct < 99.5} onChange={(e) => setAgree(e.target.checked)} />
      <Field label={w.sign.typed} hint={fill(w.sign.typedHint, { name: signerName })} error={name && !nameOk ? w.sign.mismatch : undefined}>
        {(ids) => <Input id={ids.id} aria-describedby={ids.describedBy} aria-invalid={ids.invalid} value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} disabled={!agree} />}
      </Field>
      {err && (
        <p role="alert" className="text-small text-danger m-shake">
          {err}
        </p>
      )}
      <Button
        disabled={!ready}
        loading={busy}
        aria-busy={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            await onSign(name.trim());
          } catch (e) {
            setErr(errorCopy(e, locale));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Icon name="check" size={16} aria-hidden /> {busy ? w.sign.signing : w.sign.sign}
      </Button>
    </div>
  );
}

/** XK6 statement block: gross → adjustments → taxable → WHT → licence → net (+ carry). */
export function StatementLines({ s }: { s: { gross: number; adjustments: number; taxable: number; wht: number; licence: number; net: number; carry: number } }) {
  const w = useW();
  const { locale } = useI18n();
  const m = (n: number) => formatMoney(n, "RWF", locale);
  const row = (label: string, v: string, cls?: string) => (
    <div className={cx("flex justify-between gap-4 px-4 py-2.5", cls)}>
      <dt>{label}</dt>
      <dd className="tabular">{v}</dd>
    </div>
  );
  return (
    <dl className="divide-y divide-border overflow-hidden border border-border bg-surface text-small">
      {row(w.statement.gross, m(s.gross))}
      {row(w.statement.adjustments, s.adjustments ? `−${m(Math.abs(s.adjustments))}` : m(0), s.adjustments < 0 ? "text-danger" : undefined)}
      {row(w.statement.taxable, m(s.taxable))}
      {row(fill(w.statement.wht, { p: POLICY.whtBps / 100 }), s.wht ? `−${m(s.wht)}` : m(0), s.wht ? "text-danger" : undefined)}
      {row(w.statement.licence, s.licence ? `−${m(s.licence)}` : m(0), s.licence ? "text-danger" : undefined)}
      {row(w.statement.net, m(s.net), "bg-navy-50 text-label text-navy-800")}
      {s.carry > 0 && row(w.statement.carry, `−${m(s.carry)}`, "text-warning")}
    </dl>
  );
}

/** XK4 "Client contact not enabled for this job". */
export function LaneLockedNote({ children }: { children?: ReactNode }) {
  const w = useW();
  return (
    <p className="flex items-center justify-center gap-2 bg-bg-subtle px-3 py-2 text-small text-fg-muted">
      <Icon name="lock" size={14} aria-hidden />
      {children ?? w.laneLocked}
    </p>
  );
}

/** Filter chips with counts (CM1 / CM3). Single-select, URL-driven by the caller. */
export function Chips<T extends string>({
  value,
  options,
  label,
  onChange,
}: {
  value: T;
  options: { id: T; label: string; n?: number }[];
  label: string;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx(
            "inline-flex h-9 items-center gap-1.5 border px-3.5 text-small m-press m-tone",
            value === o.id
              ? "border-secondary bg-secondary text-on-secondary"
              : "border-border-strong bg-surface text-fg hover:border-navy-300 hover:bg-navy-50",
          )}
        >
          {o.label}
          {o.n !== undefined && <span className="tabular">({o.n})</span>}
        </button>
      ))}
    </div>
  );
}

// AK6 VoiceNote: idle → recording (timer, level meter, cancel) → preview (play, scrub, re-record) → sending → sent | failed.
// Also mic-permission-denied and unsupported. Records whatever MediaRecorder gives (webm/opus, mp4 on Safari) and labels it.
// shortcut: no server transcoding, upgrade when backend media pipeline exists.
type Phase =
  | "idle"
  | "recording"
  | "preview"
  | "sending"
  | "sent"
  | "failed"
  | "denied"
  | "unsupported";
export type Voice = { seconds: number; src: string; mime: string };
const MAX_S = 120;
const mmss = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export const MicGlyph = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    aria-hidden
  >
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
export const PlayGlyph = ({
  playing,
  size = 14,
}: {
  playing: boolean;
  size?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
  >
    {playing ? (
      <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
    ) : (
      <path d="M8 5v14l11-7z" />
    )}
  </svg>
);

/** Audio player used by the preview and by sent voice bubbles. */
export function VoicePlayer({
  src,
  seconds,
  c,
}: {
  src?: string;
  seconds: number;
  c: InboxCopy;
}) {
  const a = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  return (
    <div className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        disabled={!src}
        aria-label={playing ? c.voice.pause : c.voice.play}
        onClick={() => {
          const el = a.current;
          if (!el) return;
          if (el.paused) void el.play();
          else el.pause();
        }}
        className="inline-flex size-8 shrink-0 items-center justify-center bg-secondary text-on-secondary hover:bg-secondary-hover m-press disabled:bg-ink-200 disabled:text-ink-400"
      >
        <PlayGlyph playing={playing} />
      </button>
      <input
        type="range"
        min={0}
        max={seconds || 1}
        step={0.1}
        value={pos}
        disabled={!src}
        aria-label={c.voice.scrub}
        aria-valuetext={`${mmss(pos)} / ${mmss(seconds)}`}
        onChange={(e) => {
          const v = Number(e.target.value);
          setPos(v);
          if (a.current) a.current.currentTime = v;
        }}
        className="h-1 min-w-16 flex-1 accent-navy-700"
      />
      <span className="text-eyebrow tabular text-fg-muted">
        {mmss(playing || pos ? pos : seconds)}
      </span>
      {src && (
        <audio
          ref={a}
          src={src}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => (setPlaying(false), setPos(0))}
          onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
        />
      )}
    </div>
  );
}

export function VoiceNote({
  c,
  disabled,
  onSend,
  onRetry,
}: {
  c: InboxCopy;
  disabled?: boolean;
  onSend: (v: Voice) => Promise<{ id: string; state: OutboxState }>;
  onRetry: (id: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [secs, setSecs] = useState(0);
  const [level, setLevel] = useState(0);
  const [clip, setClip] = useState<{
    url: string;
    blob: Blob;
    mime: string;
    seconds: number;
  } | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const rec = useRef<{
    mr: MediaRecorder;
    stream: MediaStream;
    ctx: AudioContext;
    raf: number;
    timer: number;
    cancelled: boolean;
  } | null>(null);

  const teardown = () => {
    const r = rec.current;
    if (!r) return;
    cancelAnimationFrame(r.raf);
    clearInterval(r.timer);
    r.stream.getTracks().forEach((t) => t.stop());
    void r.ctx.close();
    rec.current = null;
  };
  useEffect(() => teardown, []);
  useEffect(
    () => () => {
      if (clip) URL.revokeObjectURL(clip.url);
    },
    [clip],
  );

  async function start() {
    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    )
      return setPhase("unsupported");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      return setPhase(
        (e as DOMException).name === "NotFoundError" ? "unsupported" : "denied",
      );
    }
    const mr = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    const ctx = new AudioContext();
    const an = ctx.createAnalyser();
    an.fftSize = 256;
    ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Uint8Array(an.frequencyBinCount);
    const t0 = Date.now();
    const r = { mr, stream, ctx, raf: 0, timer: 0, cancelled: false };
    const loop = () => {
      an.getByteTimeDomainData(buf);
      let peak = 0;
      for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
      setLevel(Math.min(1, peak / 64));
      r.raf = requestAnimationFrame(loop);
    };
    r.timer = window.setInterval(() => {
      const s = (Date.now() - t0) / 1000;
      setSecs(s);
      if (s >= MAX_S && mr.state === "recording") mr.stop();
    }, 250);
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    mr.onstop = () => {
      const seconds = (Date.now() - t0) / 1000;
      const cancelled = r.cancelled;
      teardown();
      if (cancelled) return setPhase("idle");
      const mime = mr.mimeType || chunks[0]?.type || "audio/webm";
      const blob = new Blob(chunks, { type: mime });
      setClip({ url: URL.createObjectURL(blob), blob, mime, seconds });
      setPhase("preview");
    };
    rec.current = r;
    mr.start();
    loop();
    setSecs(0);
    setPhase("recording");
  }
  const stop = (cancel: boolean) => {
    const r = rec.current;
    if (!r) return;
    r.cancelled = cancel;
    r.mr.stop();
  };
  async function send() {
    if (!clip) return;
    setPhase("sending");
    const src = (await uploadFile(clip.blob, "voice", `voice-${Date.now()}.webm`).catch(() => null))?.href;
    if (!src) return setPhase("failed");
    const r = await onSend({
      seconds: Math.round(clip.seconds),
      src,
      mime: clip.mime,
    });
    if (r.state === "failed") {
      setFailedId(r.id);
      return setPhase("failed");
    }
    // queued (offline) counts as handed over: the outbox shows it until it sends.
    setPhase("sent");
    setClip(null);
    setTimeout(() => setPhase((p) => (p === "sent" ? "idle" : p)), 1500);
  }

  if (phase === "idle")
    return (
      <Button
        size="icon"
        variant="ghost"
        className="size-9"
        disabled={disabled}
        aria-label={c.voice.record}
        title={disabled ? c.voice.clientOnly : c.voice.record}
        onClick={start}
      >
        <MicGlyph />
      </Button>
    );

  const bar = (children: ReactNode, tone = "border border-border bg-bg-subtle text-fg") => (
    <div
      role="group"
      aria-label={c.voice.note}
      className={cx(
        "flex w-full flex-wrap items-center gap-2 px-3 py-2 m-rise",
        tone,
      )}
    >
      {children}
    </div>
  );
  if (phase === "denied" || phase === "unsupported")
    return bar(
      <>
        <MicGlyph />
        <p role="alert" className="min-w-0 flex-1 text-small">
          {phase === "denied" ? c.voice.denied : c.voice.unsupported}
        </p>
        {phase === "denied" && (
          <Button size="sm" variant="outline" onClick={start}>
            {c.retry}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setPhase("idle")}>
          {c.cancel}
        </Button>
      </>,
      "bg-warning-bg text-warning",
    );
  if (phase === "recording")
    return bar(
      <>
        <span
          className="size-2.5 rounded-full bg-danger pulse-dot"
          data-round
          aria-hidden
        />
        <span className="text-small font-medium">{c.voice.recording}</span>
        <span className="text-small tabular" aria-live="off">
          {mmss(secs)} / {mmss(MAX_S)}
        </span>
        <span
          role="meter"
          aria-label={c.voice.level}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(level * 100)}
          className="flex h-6 flex-1 items-center gap-0.5"
        >
          {Array.from({ length: 16 }, (_, i) => (
            <span
              key={i}
              className={cx(
                "h-full w-1 origin-center",
                i / 16 < level ? "bg-navy-700" : "bg-border",
              )}
              style={{
                transform: `scaleY(${0.25 + 0.75 * Math.min(1, level * (1 + ((i * 7) % 5) / 5))})`,
              }}
            />
          ))}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => stop(true)}
          aria-label={c.voice.cancel}
        >
          <Icon name="x" size={14} aria-hidden />
          <span className="max-sm:sr-only">{c.voice.cancel}</span>
        </Button>
        <Button size="sm" onClick={() => stop(false)}>
          {c.voice.stop}
        </Button>
      </>,
    );
  const cl = clip;
  return bar(
    <>
      {cl && phase !== "sent" && (
        <VoicePlayer src={cl.url} seconds={cl.seconds} c={c} />
      )}
      {cl && (
        <span className="text-eyebrow text-fg-subtle">
          {fill(c.voice.format, { f: cl.mime.split(";")[0] })}
        </span>
      )}
      <span role="status" className="text-small">
        {phase === "sending"
          ? c.voice.sending
          : phase === "sent"
            ? c.voice.sent
            : phase === "failed"
              ? c.voice.failed
              : ""}
      </span>
      {phase === "preview" && (
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => (setClip(null), start())}
          >
            {c.voice.rerecord}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => (setClip(null), setPhase("idle"))}
            aria-label={c.cancel}
          >
            <Icon name="x" size={14} aria-hidden />
          </Button>
          <Button size="sm" onClick={send}>
            {c.voice.send}
          </Button>
        </>
      )}
      {phase === "failed" && failedId && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => (onRetry(failedId), setPhase("idle"))}
        >
          {c.out.retry}
        </Button>
      )}
      {phase === "sent" && (
        <Icon
          name="check"
          size={16}
          aria-hidden
          className="text-success m-pop"
        />
      )}
    </>,
    phase === "failed" ? "bg-danger-bg text-danger" : "border border-sky-100 bg-info-bg text-fg",
  );
}

// ApplicationTracker (plan §5.5): Received · Under review · Decision, with m-tick on done nodes.
const STAGE: Record<Application["status"], number> = {
  received: 0,
  under_review: 1,
  info_requested: 1,
  approved: 2,
  rejected: 2,
  invite_expired: 2,
  converted: 2,
};
export function ApplicationTracker({ status, c }: { status: Application["status"]; c: WorkApply }) {
  const at = STAGE[status];
  const nodes = [c.tracker.received, c.tracker.under_review, c.tracker.decision];
  const bad = status === "rejected" || status === "invite_expired";
  return (
    <ol className="grid grid-cols-3" aria-label={nodes.join(" → ")}>
      {nodes.map((n, i) => {
        const done = i < at || (i === at && i === 2);
        const cur = i === at;
        return (
          <li key={n} aria-current={cur ? "step" : undefined} className="relative grid justify-items-center gap-2 text-center">
            {i > 0 && <span aria-hidden className={cx("absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2", i <= at ? "bg-navy-700" : "bg-ink-200")} />}
            <span
              className={cx(
                "relative z-10 flex size-8 items-center justify-center rounded-full",
                done ? (bad && i === 2 ? "bg-danger-bg text-danger" : "bg-navy-700 text-white") : cur ? "bg-surface text-navy-900 ring-2 ring-gold-400" : "bg-surface text-fg-subtle ring-1 ring-ink-300",
              )}
            >
              {done ? <Icon name={bad && i === 2 ? "x" : "check"} size={15} aria-hidden className="m-tick" /> : <span className="text-eyebrow">{i + 1}</span>}
            </span>
            <span className={cx("text-small", cur ? "font-medium text-fg-heading" : "text-fg-muted")}>{n}</span>
          </li>
        );
      })}
    </ol>
  );
}
