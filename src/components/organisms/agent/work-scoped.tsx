"use client";
// Lane D external slots for the Stage 4 workbench (board 07 v2 WB1–WB5, 08 DL1, 12 ST3): header extras, instruction
// versions, shared-docs top strip + request access, watermarked download, hand back, access ended, not-assigned.
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDate, formatDateTime } from "@/shared/format";
import { errorCopy } from "@/lib/api/error-copy";
import { workJobs, fill } from "@/content/pages/work-jobs";
import { Dialog } from "@/components/atoms/dialog";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Field, Select, Textarea, Radio } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { useOnline } from "@/components/atoms/hooks";
import { SkeletonRows, VersionChip } from "@/components/atoms/agent";
import { LockedCount, WatermarkOverlay, WhyNote, useW as useWC } from "@/components/atoms/work";
import { OfferEarnings } from "@/components/molecules/agent/agent";
import type { JobScope, AccessRequest } from "@/lib/work/api";
import {
  HANDBACK_REASONS,
  handbackNeedsNote,
  useAccessRequests,
  useContributions,
  useDownload,
  useHandback,
  useInstructions,
  useRequestAccess,
  type HandbackReason,
  type Watermark,
} from "@/lib/work/d";

export const useJ = () => workJobs(useI18n().locale);
const opId = () => `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ---------------------------------------------------------------- header extras (WB1: name only, masked phone)
export function ExternalHeaderBits({ phone, scope, onMessage }: { phone: string | null; scope: JobScope; onMessage: () => void }) {
  const j = useJ();
  const w = useWC();
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {phone && (
        <span className="inline-flex h-7 items-center gap-2 bg-ink-100 px-3 text-small">
          <Icon name="phone" size={13} aria-hidden />
          <span className="sr-only">{j.maskedPhone}: </span>
          <span className="tabular">{phone}</span>
          <button type="button"onClick={onMessage} className="font-medium text-navy-700 underline underline-offset-4">
            {scope.clientLane ? j.messageClient : w.askManager}
          </button>
        </span>
      )}
      <OfferEarnings compact earning={scope.agreed.amount} rate={{ bps: scope.agreed.bps, flat: scope.agreed.flat }} showFee={false} />
    </div>
  );
}

// ---------------------------------------------------------------- instructions version chip + history drawer
export function InstructionsBar({ refId, version, manager, at }: { refId: string; version: number; manager: string; at: string }) {
  const j = useJ();
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const q = useInstructions(refId);
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <button type="button"onClick={() => setOpen(true)} className="m-press inline-flex items-center gap-2 bg-tint px-3 py-1 text-small text-navy-800 hover:bg-navy-100">
        <VersionChip v={`v${version}`} />
        {fill(j.instructions.version, { v: version, by: manager, d: formatDate(at, locale) })}
        <span className="underline underline-offset-4">{j.instructions.history}</span>
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} side="right" title={j.instructions.title}>
        {q.isPending ? (
          <SkeletonRows n={3} />
        ) : !q.data?.items.length ? (
          <p className="text-small text-fg-muted">{j.instructions.empty}</p>
        ) : (
          <ol className="grid gap-3 m-stagger">
            {q.data.items.map((v, i) => (
              <li key={v.v} style={{ ["--i"as string]: i }} className={cx("border p-4", i === 0 ? "border-navy-300 bg-tint" : "border-border bg-white")}>
                <p className="flex flex-wrap items-center gap-2 text-small font-medium">
                  <VersionChip v={`v${v.v}`} />
                  {v.by} · <time dateTime={v.at}>{formatDateTime(v.at, locale)}</time>
                  {i === 0 && <span className="bg-secondary px-2 text-eyebrow text-on-navy">{j.instructions.current}</span>}
                </p>
                <p className="mt-2 text-small whitespace-pre-line">{v.text}</p>
              </li>
            ))}
          </ol>
        )}
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------- documents top strip (WB2) + request access
const ACCESS_REASONS = ["scope", "missing", "other"] as const;
const REQ_TONE: Record<AccessRequest["status"], string> = { pending: "bg-warning-bg text-warning", granted: "bg-success-bg text-success", denied: "bg-danger-bg text-danger" };
export function DocsTop({ refId, scope, manager }: { refId: string; scope: JobScope; manager: string }) {
  const j = useJ();
  const w = useWC();
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const reqs = useAccessRequests(refId);
  const pending = reqs.data?.items.some((r) => r.status === "pending");
  return (
    <div className="grid gap-2">
      <p className="flex items-center gap-2 bg-tint px-4 py-2.5 text-small">
        <Icon name="shield"size={15} aria-hidden className="text-navy-700" />
        <span className="flex-1">{w.watermarkNote}</span>
        <span className="text-fg-muted">{w.accessEnds}</span>
      </p>
      <LockedCount n={scope.lockedDocs} onRequest={pending ? undefined : () => setOpen(true)} />
      {!!reqs.data?.items.length && (
        <section aria-label={j.access.rows} className="border border-border bg-white">
          <h3 className="px-4 pt-3 text-eyebrow text-fg-subtle uppercase">{j.access.rows}</h3>
          <ul className="divide-y divide-border">
            {reqs.data.items.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-small m-rise">
                <span className={cx("inline-flex h-6 items-center px-2.5 text-eyebrow font-medium", REQ_TONE[r.status])}>{j.access.status[r.status]}</span>
                <span className="min-w-0 flex-1">
                  {j.access.reasons[r.reason as keyof typeof j.access.reasons] ?? r.reason}
                  {r.note && <span className="text-fg-muted"> · {r.note}</span>}
                </span>
                <time className="text-eyebrow text-fg-subtle"dateTime={r.at}>{formatDateTime(r.at, locale)}</time>
                {r.status === "pending" && (
                  <span className="flex gap-1">
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {open && <RequestAccessDialog refId={refId} manager={manager} onClose={() => setOpen(false)} />}
    </div>
  );
}

function RequestAccessDialog({ refId, manager, onClose }: { refId: string; manager: string; onClose: () => void }) {
  const j = useJ();
  const { locale } = useI18n();
  const toast = useToast();
  const m = useRequestAccess(refId);
  const [reason, setReason] = useState<(typeof ACCESS_REASONS)[number]>("scope");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [op] = useState(opId);
  const send = () => {
    if (reason === "other" && !note.trim()) return setErr(j.access.noteRequired);
    m.mutate(
      { reason, note: note.trim() || undefined, client_op_id: op },
      {
        onSuccess: () => {
          toast({ title: fill(j.access.sent, { m: manager }), tone: "success" });
          onClose();
        },
        onError: (e) => setErr(errorCopy(e, locale)),
      },
    );
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={j.access.title}
      description={fill(j.access.body, { m: manager })}
      footer={
        <Button loading={m.isPending} aria-busy={m.isPending} onClick={send}>
          {j.access.send}
        </Button>
      }
    >
      <div className="grid gap-4">
        <Field label={j.access.reason}>
          {(f) => (
            <Select id={f.id} value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
              {ACCESS_REASONS.map((r) => (
                <option key={r} value={r}>
                  {j.access.reasons[r]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={j.access.note} error={err ?? undefined}>
          {(f) => <Textarea id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} rows={3} value={note} onChange={(e) => (setNote(e.target.value), setErr(null))} />}
        </Field>
      </div>
    </Dialog>
  );
}

/** Download → watermark payload + audit row; toast "Download logged". Disabled offline with reason. */
export function DownloadButton({ refId, docId, onWatermark }: { refId: string; docId: string; onWatermark: (w: Watermark) => void }) {
  const j = useJ();
  const { locale } = useI18n();
  const toast = useToast();
  const online = useOnline();
  const m = useDownload(refId);
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={!online}
      title={online ? undefined : j.downloadOffline}
      loading={m.isPending}
      onClick={() =>
        m.mutate(docId, {
          onSuccess: (r) => {
            onWatermark(r.watermark);
            toast({ title: j.logged, tone: "success" });
          },
          onError: (e) => toast({ title: errorCopy(e, locale), tone: "danger" }),
        })
      }
    >
      <Icon name="upload"size={14} aria-hidden className="rotate-180" />
      {j.download}
    </Button>
  );
}

/** Viewer overlay: always watermarked for externals (name · ref · time). */
export function ViewerWatermark({ name, refId, at }: { name: string; refId: string; at?: string }) {
  return <WatermarkOverlay name={name} refId={refId} at={at ?? new Date().toISOString()} />;
}

// ---------------------------------------------------------------- hand back (WB4)
export function HandBackDialog({ refId, manager, open, onClose }: { refId: string; manager: string; open: boolean; onClose: () => void }) {
  const j = useJ();
  const { locale } = useI18n();
  const toast = useToast();
  const m = useHandback(refId);
  const [reason, setReason] = useState<HandbackReason | null>(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const submit = () => {
    if (!reason) return setErr(j.handback.reason);
    if (handbackNeedsNote(reason) && !note.trim()) return setErr(j.handback.noteRequired);
    m.mutate(
      { reason, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast({ title: fill(j.handback.done, { m: manager }), tone: "success" });
          onClose();
        },
        onError: (e) => setErr(errorCopy(e, locale)),
      },
    );
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={j.handback.title}
      description={fill(j.handback.body, { m: manager })}
      footer={
        <Button variant="danger" loading={m.isPending} aria-busy={m.isPending} onClick={submit}>
          {j.handback.confirm}
        </Button>
      }
    >
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-label">{j.handback.reason}</legend>
        {HANDBACK_REASONS.map((r) => (
          <Radio key={r} name="handback" label={j.handback.reasons[r]} checked={reason === r} onChange={() => (setReason(r), setErr(null))} />
        ))}
      </fieldset>
      {reason && handbackNeedsNote(reason) && (
        <Field label={j.handback.note} className="mt-4">
          {(f) => <Textarea id={f.id} rows={3} value={note} onChange={(e) => (setNote(e.target.value), setErr(null))} />}
        </Field>
      )}
      {err && (
        <p role="alert"className="mt-3 text-small text-danger m-shake">
          {err}
        </p>
      )}
    </Dialog>
  );
}

export function HandbackBanner({ refId, scope, manager }: { refId: string; scope: JobScope; manager: string }) {
  const j = useJ();
  if (!scope.handback) return null;
  const r = j.handback.reasons[scope.handback.reason as HandbackReason] ?? scope.handback.reason;
  return (
    <div role="status"className="flex flex-wrap items-center gap-3 bg-warning-bg px-4 py-3 text-small m-rise">
      <Icon name="clock" size={18} aria-hidden />
      <p className="min-w-0 flex-1">{fill(j.handback.pending, { r, m: manager })}</p>
    </div>
  );
}

// ---------------------------------------------------------------- deliverables lock (B16)
export function UploadLock({ reason }: { reason: string }) {
  const j = useJ();
  const { locale } = useI18n();
  return (
    <WhyNote
      tone="warning"
      action={
        <Link href={localHref(locale, "/work/profile/credentials")} className="font-medium underline underline-offset-4">
          {j.locked.fix}
        </Link>
      }
    >
      <strong className="block">{j.locked.title}</strong>
      {reason}
    </WhyNote>
  );
}

// ---------------------------------------------------------------- access ended (WB5) + not assigned
function Mark() {
  return (
    <svg viewBox="0 0 64 64"className="size-16 text-navy-700 m-pop"aria-hidden>
      <circle cx="32" cy="32" r="22" fill="var(--color-bg-tint)" stroke="currentColor" strokeWidth="2" />
      <path d="M22 32l7 7 13-14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M52 12l4-4M56 22h5M12 52l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
export function AccessEnded({ refId, scope, manager }: { refId: string; scope: JobScope; manager: string }) {
  const j = useJ();
  const { locale } = useI18n();
  const q = useContributions(refId, true);
  const d = scope.accessEndedAt ? formatDate(scope.accessEndedAt, locale) : "";
  const list = (title: string, items: ReactNode[]) => (
    <section className="border border-border bg-white p-4">
      <h3 className="text-label">{title}</h3>
      {items.length ? <ul className="mt-2 grid gap-2 text-small">{items}</ul> : <p className="mt-2 text-small text-fg-muted">{j.ended.none}</p>}
    </section>
  );
  return (
    <div className="mx-auto grid max-w-2xl gap-5 py-10 m-rise">
      <div className="grid justify-items-center gap-3 text-center">
        <Mark />
        <h1 className="text-h3">{j.ended.title}</h1>
        <p className="text-body text-fg-muted">
          <span className="tabular">{refId}</span> · {fill(j.ended.body[scope.accessEndedReason ?? "closed"], { m: manager, d })}
        </p>
      </div>
      <h2 className="text-label-lg">{j.ended.own}</h2>
      {q.isPending ? (
        <SkeletonRows n={3} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list(
            j.ended.messages,
            (q.data?.messages ?? []).map((m) => (
              <li key={m.id} className="bg-bg-subtle p-2.5">
                {m.body}
                <time className="block text-eyebrow text-fg-subtle">{formatDateTime(m.at, locale)}</time>
              </li>
            )),
          )}
          {list(
            j.ended.uploads,
            (q.data?.uploads ?? []).map((u) => (
              <li key={`${u.slot}-${u.v}`} className="flex items-center gap-2">
                <Icon name="file" size={14} aria-hidden />
                <span className="min-w-0 flex-1 truncate">
                  {u.name} <span className="text-fg-subtle">· {u.slot} · {u.v}</span>
                </span>
              </li>
            )),
          )}
        </div>
      )}
      <ButtonLink href={localHref(locale, "/work/jobs")} variant="outline"className="justify-self-center">
        {j.ended.back}
      </ButtonLink>
    </div>
  );
}

export function NotAssigned() {
  const j = useJ();
  const { locale } = useI18n();
  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-3 py-16 text-center m-rise">
      <span className="flex size-14 items-center justify-center rounded-full bg-tint text-navy-700">
        <Icon name="lock" size={24} aria-hidden />
      </span>
      <h1 className="text-h4">{j.notMine.title}</h1>
      <p className="text-small text-fg-muted">{j.notMine.body}</p>
      <ButtonLink href={localHref(locale, "/work/jobs")}>{j.notMine.back}</ButtonLink>
    </div>
  );
}
