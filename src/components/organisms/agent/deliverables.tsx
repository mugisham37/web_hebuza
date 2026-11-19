"use client";
import { useWs } from "@/lib/agent/ws";
// U7 Deliverables (board 08): DL1 slots, DL2 submit dialog, DL3 returned + diff, DL4 timeline → earning, PD1 phone.
// Lane B renders <CaseDeliverables caseRef> inside the workbench's Deliverables tab.
import { useRef, useState } from "react";
import { POLICY } from "@/shared/policy";
import Link from "next/link";
import { FileDrop } from "@/components/atoms/file-drop";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Checkbox, Field, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { Avatar } from "@/components/atoms/misc";
import { ErrorState } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { SkeletonRows, VersionChip } from "@/components/atoms/agent";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { errorCopy } from "@/lib/api/error-copy";
import { useSummary } from "@/lib/agent/api";
import { submitBlockers, type Slot } from "@/shared/agent/core";
import {
  useDeliverableActions,
  useDeliverables,
  type DeliverablesVM,
  type SlotVM,
} from "@/lib/agent/c";
import { ApiError } from "@/lib/api/client";
import { cx, formatDate, formatDateTime, formatMoney } from "@/shared/format";
import { fill } from "@/content/pages/agent-common";
import { agentDeliverables } from "@/content/pages/agent-deliverables";

const useD = () => agentDeliverables(useI18n().locale);
// Stage 8: externals get the DLV-01 25 MB limit; /agent keeps 10 MB until its mock moves too.
const maxMb = (external: boolean) => (external ? POLICY.deliverableMaxMb : 10);
const ACCEPT =
  "application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg,.docx";
type ErrKey = "wrong_type" | "too_large" | "not_cleared" | "away" | "other";
type Local = { p: number; file: File; err?: ErrKey };
const kb = (n: number) => `${Math.max(1, Math.round(n / 1024))} KB`;
const firstName = (n: string) => n.split(" ")[0];

function validate(f: File, mb: number): ErrKey | null {
  if (f.size > mb * 1024 * 1024) return "too_large";
  return /\.(pdf|png|jpe?g|docx)$/i.test(f.name) ? null : "wrong_type";
}
function stateOf(s: SlotVM, l?: Local): Slot["state"] {
  if (l) return l.err ? "failed" : "uploading";
  const last = s.versions.at(-1);
  return last ? last.state : "empty";
}

// ---------------------------------------------------------------- uploads (staged progress; mock takes JSON metadata)
function useUploads(ref: string) {
  const mb = maxMb(useWs().external);
  const { upload } = useDeliverableActions(ref);
  const [local, setLocal] = useState<Record<string, Local>>({});
  const timers = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const patch = (k: string, v: Local | null) =>
    setLocal((m) => {
      const n = { ...m };
      if (v) n[k] = v;
      else delete n[k];
      return n;
    });
  function start(slot: string, file: File) {
    const bad = validate(file, mb);
    if (bad) return patch(slot, { p: 0, file, err: bad });
    patch(slot, { p: 0, file });
    upload.mutate(
      { slot, file, onProgress: (p) => patch(slot, { p: Math.min(99, p), file }) },
      {
        onSuccess: () => patch(slot, null),
        onError: (e) => {
          const t = e instanceof ApiError ? e.errorType : null;
          patch(slot, {
            p: 0,
            file,
            err: t === "wrong_type" || t === "too_large" || t === "not_cleared" || t === "away" ? t : "other",
          });
        },
      },
    );
  }
  const cancel = (slot: string) => {
    clearInterval(timers.current[slot]);
    delete timers.current[slot];
    patch(slot, null);
  };
  return { local, start, cancel };
}

function Picker({
  label,
  onFile,
  variant = "outline",
}: {
  label: string;
  onFile: (f: File) => void;
  variant?: "outline" | "primary";
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button size="sm" variant={variant} onClick={() => ref.current?.click()}>
        <Icon name="upload" size={14} aria-hidden />
        {label}
      </Button>
      <input
        ref={ref}
        type="file"
        hidden
        accept={ACCEPT}
        aria-label={label}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </>
  );
}

function SlotRow({
  slot,
  local,
  locked,
  onFile,
  onCancel,
  onSignature,
}: {
  slot: SlotVM;
  local?: Local;
  locked: boolean;
  onFile: (f: File) => void;
  onCancel: () => void;
  onSignature?: (on: boolean) => void;
}) {
  const d = useD();
  const { locale } = useI18n();
  const { wsHref, external } = useWs();
  const mb = maxMb(external);
  const state = stateOf(slot, local);
  const last = slot.versions.at(-1);
  const badge = {
    empty: [d.notUploaded, "minus", "text-fg-subtle"],
    uploading: [
      fill(d.uploading, { p: local?.p ?? 0 }),
      "upload",
      "text-navy-800",
    ],
    failed: [local?.err === "too_large" ? d.errors.too_large.replace("10", String(mb)) : d.errors[local?.err ?? "other"], "x", "text-danger"],
    uploaded: [d.uploaded, "check", "text-success"],
    returned: [d.returned, "refresh", "text-danger"],
    approved: [d.approved, "fileCheck", "text-success"],
  }[state] as [string, "check", string];
  return (
    <li
      className={cx(
        " border p-4 m-tone",
        state === "returned"
          ? "border-danger/40 bg-danger-bg/40"
          : state === "failed"
            ? "border-danger/40"
            : "border-border bg-white",
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span
          aria-hidden
          className={cx(
            "grid size-9 shrink-0 place-items-center",
            last ? "bg-danger-bg text-danger" : "bg-ink-100 text-fg-muted",
          )}
        >
          <Icon name="file" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-label">
            {slot.label}{" "}
            <span className="text-small font-normal text-fg-subtle">
              · {slot.required ? d.required : d.optional}
            </span>
          </p>
          {onSignature && (
            <label className="mt-1 flex items-center gap-2 text-small text-fg-muted">
              <input type="checkbox" checked={!!slot.signature} disabled={locked} onChange={(e) => onSignature(e.target.checked)} />
              {d.signature}
            </label>
          )}
          {last && (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-small text-fg-muted">
              <VersionChip
                v={last.v}
                state={last.state === "uploaded" ? "current" : last.state}
              />
              <span className="truncate">{last.name}</span>· {kb(last.size)}
            </p>
          )}
          {last?.state === "returned" && last.comment && (
            <p className="mt-2 flex gap-2 text-small">
              <Icon
                name="message"
                size={14}
                aria-hidden
                className="mt-0.5 shrink-0 text-danger"
              />
              {last.comment}
            </p>
          )}
        </div>
        <p
          className={cx(
            "inline-flex items-center gap-1.5 text-small font-medium",
            badge[2],
          )}
          aria-live={state === "uploading" ? "off" : "polite"}
        >
          <Icon name={badge[1]} size={14} aria-hidden />
          {badge[0]}
        </p>
      </div>

      {state === "uploading" && local && (
        <div className="mt-3 flex items-center gap-3">
          <div
            role="progressbar"
            aria-label={slot.label}
            aria-valuenow={local.p}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 flex-1 overflow-hidden bg-ink-100"
          >
            <div
              className="h-full w-full origin-left bg-navy-700 transition-transform"
              style={{ transform: `scaleX(${local.p / 100})` }}
            />
          </div>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            {d.cancel}
          </Button>
        </div>
      )}
      {state === "failed" && local && (
        <div className="mt-3 flex flex-wrap gap-2">
          {local.err === "other" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onFile(local.file)}
            >
              <Icon name="refresh" size={14} aria-hidden />
              {d.retry}
            </Button>
          )}
          <Picker label={d.uploadNew} onFile={onFile} />
          <Button size="sm" variant="ghost" onClick={onCancel}>
            {d.cancel}
          </Button>
        </div>
      )}
      {state === "empty" && !locked && (
        <div className="mt-3">
          <FileDrop
            onFiles={(f) => f[0] && onFile(f[0])}
            accept={ACCEPT}
            maxSizeMb={mb}
            camera
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 empty:hidden">
        {locked && last && last.state !== "approved" && (
          <span className="inline-flex items-center gap-1.5 text-small text-fg-muted">
            <Icon name="lock" size={14} aria-hidden />
            {d.locked}
          </span>
        )}
        {!locked && (state === "uploaded" || state === "returned") && (
          <Picker
            label={state === "returned" ? d.uploadNew : d.replace}
            onFile={onFile}
            variant={state === "returned" ? "primary" : "outline"}
          />
        )}
        {slot.versions.length > 0 && (
          <details className="group relative">
            <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-1 px-3 text-small hover:bg-navy-50">
              {d.history} ({slot.versions.length})
              <Icon
                name="chevronDown"
                size={14}
                aria-hidden
                className="transition-transform group-open:rotate-180"
              />
            </summary>
            <ol className="mt-2 grid gap-2 border border-border bg-white p-3 text-small m-pop">
              {[...slot.versions].reverse().map((v) => (
                <li key={v.v} className="flex flex-wrap items-center gap-2">
                  <VersionChip
                    v={v.v}
                    state={v.state === "uploaded" ? "current" : v.state}
                  />
                  <span className="truncate">{v.name}</span>
                  <span className="text-fg-subtle">
                    {kb(v.size)} · {formatDateTime(v.at, locale)}
                  </span>
                  {v.comment && (
                    <span className="w-full text-fg-muted">“{v.comment}”</span>
                  )}
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------- DL3 returned banner + diff
function Returned({ data }: { data: DeliverablesVM }) {
  const d = useD();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const m = firstName(data.reviewer.name);
  const comments = data.review?.comments ?? [];
  return (
    <section
      className="grid gap-3 border border-danger/30 bg-white p-4 m-rise"
      aria-labelledby="dl-returned"
    >
      <p
        id="dl-returned"
        role="status"
        className="flex items-center gap-2 bg-danger-bg p-3 text-label text-danger"
      >
        <Icon name="refresh" size={16} aria-hidden />
        {comments.length
          ? fill(comments.length === 1 ? d.returnedBanner : d.returnedBannerN, {
              m,
              n: comments.length,
            })
          : fill(d.returnedNoComment, { m })}
      </p>
      {comments.map((c, i) => {
        const slot = data.slots.find((s) => s.key === c.slot);
        const prev = slot?.versions.findLast((v) => v.state === "returned");
        const next = slot?.versions.at(-1);
        const draft = next && prev && next.v !== prev.v ? next : null;
        return (
          <div key={i} className="grid gap-3">
            <div className="flex gap-3">
              <Avatar name={c.by} size="sm" />
              <div>
                <p className="text-small">
                  <span className="font-medium">{c.by}</span> ·{" "}
                  {formatDate(c.at, locale, { timeStyle: "short" })}
                </p>
                <p className="text-body">{c.text}</p>
                {slot && (
                  <p className="mt-1 text-small text-fg-muted">{slot.label}</p>
                )}
              </div>
            </div>
            {prev && (
              <div
                tabIndex={0}
                role="region"
                aria-label={d.diffTitle}
                className="overflow-x-auto"
              >
                <p className="mb-2 text-label">{d.diffTitle}</p>
                <div className="grid min-w-[18rem] grid-cols-2 overflow-hidden border border-border text-small">
                  <p className="bg-ink-100 p-2 font-medium">{prev.v}</p>
                  <p className="bg-tint p-2 font-medium">
                    {draft ? `${draft.v} (${d.draft})` : `— (${d.draft})`}
                  </p>
                  <p className="p-2 text-danger">
                    <span aria-hidden>− </span>
                    {c.text}
                  </p>
                  <p
                    className={cx(
                      "p-2",
                      draft ? "text-success" : "text-fg-subtle",
                    )}
                  >
                    <span aria-hidden>{draft ? "+ " : ""}</span>
                    {draft
                      ? fill(d.replacedWith, { name: draft.name })
                      : d.awaitingNew}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

// ---------------------------------------------------------------- DL4 timeline
function Timeline({ data }: { data: DeliverablesVM }) {
  const d = useD();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const m = firstName(data.reviewer.name);
  if (!data.events.length) return null;
  const icon = {
    submitted: "upload",
    returned: "refresh",
    resubmitted: "upload",
    approved: "check",
    released: "arrowUpRight",
    delivered: "arrowUpRight",
  } as const;
  return (
    <section
      id="dl-timeline"
      aria-labelledby="dl-tl"
      className="border border-border bg-white p-4"
    >
      <h3 id="dl-tl"className="mb-3 text-label">
        {d.timeline}
      </h3>
      <ol className="grid gap-4 m-stagger">
        {data.events.map((e, i) => (
          <li
            key={i}
            style={{ "--i": Math.min(i, 6) } as React.CSSProperties}
            className="flex items-start gap-3"
          >
            <span
              aria-hidden
              className={cx(
                "grid size-7 shrink-0 place-items-center rounded-full",
                e.kind === "returned"
                  ? "bg-danger text-white"
                  : e.kind === "approved"
                    ? "bg-success text-white"
                    : "bg-tint text-navy-800",
              )}
            >
              <Icon name={icon[e.kind]} size={14} />
            </span>
            <div>
              <p className="text-small text-fg-muted">
                {formatDateTime(e.at, locale)}
              </p>
              <p className="text-label">
                {fill(d.ev[e.kind], { v: e.v ?? "", m })}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------- DL2 submit dialog
function SubmitDialog({
  data,
  open,
  onClose,
  onSubmitted,
}: {
  data: DeliverablesVM;
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const d = useD();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const { submit } = useDeliverableActions(data.ref);
  const [legible, setLegible] = useState(false);
  const filesOk = data.slots.every((s) => !s.required || s.versions.length > 0);
  const checks = [
    [d.check.files, filesOk],
    [d.check.note, !!data.clientNote.trim()],
    [
      fill(d.check.checklist, {
        d: data.checklist.done,
        t: data.checklist.total,
      }),
      data.checklist.done >= data.checklist.total,
    ],
  ] as const;
  const ok = filesOk && legible && data.checklist.done >= data.checklist.total;
  const go = () =>
    submit.mutate(undefined, {
      onSuccess: () => {
        onClose();
        onSubmitted();
      },
    });
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={data.reviewRequired ? d.dialogTitle : d.deliverTitle}
      description={data.reviewRequired ? d.dialogSub : d.deliverBody}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {d.cancel}
          </Button>
          <Button dots disabled={!ok} loading={submit.isPending} onClick={go}>
            {data.reviewRequired ? d.submit : d.deliver}
          </Button>
        </>
      }
    >
      <ul className="grid gap-3">
        {checks.map(([label, done]) => (
          <li key={label} className="flex items-center gap-3 text-body">
            <span
              aria-hidden
              className={cx(
                "grid size-6 place-items-center rounded-full m-tone",
                done ? "bg-success text-white" : "bg-ink-100 text-fg-subtle",
              )}
            >
              <Icon name={done ? "check" : "minus"} size={14} />
            </span>
            {label}
            <span className="sr-only">{done ? "✓" : "✗"}</span>
          </li>
        ))}
      </ul>
      <Checkbox
        className="mt-4 bg-ink-100 p-3"
        label={d.legibleConfirm}
        checked={legible}
        onChange={(e) => setLegible(e.target.checked)}
      />
      {data.reviewRequired && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-label">{d.reviewer}</p>
          <div className="mt-2 flex items-center gap-3">
            <Avatar name={data.reviewer.name} />
            <div>
              <p className="text-label">{data.reviewer.name}</p>
              <p className="text-small text-fg-muted">
                {fill(d.reviewerRole, { c: data.reviewer.category })}
              </p>
            </div>
          </div>
        </div>
      )}
      {submit.isError && (
        <p role="alert"className="mt-3 text-small text-danger">
          {errorCopy(submit.error, locale)}
        </p>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------- main
export function CaseDeliverables({ caseRef }: { caseRef: string }) {
  const d = useD();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const toast = useToast();
  const q = useDeliverables(caseRef);
  const { note, signature: sig } = useDeliverableActions(caseRef);
  const summary = useSummary().data;
  const cleared = !summary || summary.clearance === "cleared";
  const { local, start, cancel } = useUploads(caseRef);
  const [draft, setDraft] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  if (q.isPending) return <SkeletonRows n={4} className="[&>div]:h-20" />;
  if (q.isError)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const data = q.data;
  const m = firstName(data.reviewer.name);
  const review = data.review?.state ?? null;
  const inReview = review === "submitted";
  const done = review === "released" || data.status === "completed_delivered";
  const locked = inReview || done;
  const slots: Slot[] = data.slots.map((s) => ({
    key: s.key,
    required: s.required,
    state: stateOf(s, local[s.key]),
  }));
  const blockers = submitBlockers({
    slots,
    checklistDone: data.checklist.done,
    checklistTotal: data.checklist.total,
    inReview,
    cleared,
  });
  const uploaded = data.slots.filter((s) => s.versions.length).length;
  const noteValue = draft ?? data.clientNote;

  const onNote = (v: string) => {
    setDraft(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () =>
        note.mutate(v, {
          onSuccess: () =>
            setSavedAt(formatDate(Date.now(), locale, { timeStyle: "short" })),
        }),
      800,
    );
  };
  const submitted = () => {
    toast({
      tone: "success",
      title: data.reviewRequired ? d.submitted : d.approvedReleased,
      body: data.reviewRequired ? fill(d.submittedBody, { m }) : undefined,
      action: {
        label: d.viewTimeline,
        onClick: () =>
          document
            .getElementById("dl-timeline")
            ?.scrollIntoView({ block: "start" }),
      },
    });
  };
  const primary =
    review === "returned"
      ? d.resubmit
      : data.reviewRequired
        ? d.submit
        : d.deliver;

  return (
    <div className="grid gap-5 pb-44 lg:pb-0">
      <header>
        <h2 className="text-card-title">{d.title}</h2>
        <p className="text-small text-fg-muted">{d.sub}</p>
        <p className="mt-1 text-label tabular"aria-live="polite">
          {fill(d.progress, { n: uploaded, t: data.slots.length })}
        </p>
      </header>

      {review === "returned" && <Returned data={data} />}

      {done && (
        <section
          role="status"
          className="flex flex-wrap items-start gap-4 bg-success-bg p-5 m-pop"
        >
          <span
            aria-hidden
            className="grid size-11 shrink-0 place-items-center rounded-full bg-success text-white"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                className="m-tick"
                pathLength={24}
                d="M5 12.5l4.5 4.5L19 7.5"
              />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-card-title">{d.completed}</p>
            <p className="text-body">
              {fill(d.allocated, {
                amount: formatMoney(data.share, "RWF", locale),
              })}
            </p>
            <Link
              href={localHref(locale, wsHref("/agent/earnings"))}
              className="mt-2 inline-flex items-center gap-1 text-label underline underline-offset-4"
            >
              {d.viewEarnings}
              <Icon name="arrowRight" size={14} aria-hidden />
            </Link>
          </div>
        </section>
      )}

      {inReview && (
        <section
          role="status"
          className="flex flex-wrap items-center gap-3 bg-success-bg p-4 m-pop"
        >
          <Icon name="check"size={20} aria-hidden className="text-success" />
          <p className="flex-1 text-small">
            <span className="font-medium">{d.submitted}</span> ·{" "}
            {fill(d.submittedBody, { m })}
          </p>
          <a
            href="#dl-timeline"
            className="text-label underline underline-offset-4"
          >
            {d.viewTimeline}
          </a>
        </section>
      )}

      <ul className="grid gap-3">
        {data.slots.map((s) => (
          <SlotRow
            key={s.key}
            slot={s}
            local={local[s.key]}
            locked={locked}
            onFile={(f) => start(s.key, f)}
            onCancel={() => cancel(s.key)}
            onSignature={(on) => sig.mutate({ slot: s.key, on })}
          />
        ))}
      </ul>

      <Field
        label={d.noteLabel}
        optional={d.optional}
        hint={
          savedAt
            ? fill(d.saved, { t: savedAt })
            : note.isPending
              ? d.saving
              : undefined
        }
      >
        {(f) => (
          <Textarea
            id={f.id}
            aria-describedby={f.describedBy}
            value={noteValue}
            disabled={locked}
            placeholder={d.notePlaceholder}
            onChange={(e) => onNote(e.target.value)}
            className="min-h-24"
          />
        )}
      </Field>

      {!locked && (
        <section className="grid gap-3 border border-border bg-white p-4">
          {blockers.length ? (
            <div>
              <p className="text-label">{d.blockedTitle}</p>
              <ul className="mt-2 grid gap-1.5 text-small text-fg-muted">
                {blockers.map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <Icon name="minus" size={14} aria-hidden />
                    {fill(d.blockers[b as keyof typeof d.blockers], {
                      d: data.checklist.done,
                      t: data.checklist.total,
                    })}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-center gap-3 m-rise">
              <span
                aria-hidden
                className="grid size-10 place-items-center rounded-full bg-success text-white"
              >
                <Icon name="fileCheck" size={20} />
              </span>
              <div>
                <p className="text-label">{d.ready}</p>
                <p className="text-small text-fg-muted">{d.readyBody}</p>
              </div>
            </div>
          )}
          <div className="max-lg:fixed max-lg:inset-x-0 max-lg:bottom-16 max-lg:z-30 max-lg:border-t max-lg:border-border max-lg:bg-white max-lg:p-3 max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:flex lg:justify-end">
            <Button
              dots
              className="max-lg:w-full max-lg:justify-center"
              aria-disabled={blockers.length > 0 || undefined}
              onClick={() => !blockers.length && setOpen(true)}
            >
              {primary}
            </Button>
          </div>
        </section>
      )}

      <Timeline data={data} />
      <SubmitDialog
        key={String(open)}
        data={data}
        open={open}
        onClose={() => setOpen(false)}
        onSubmitted={submitted}
      />
    </div>
  );
}
