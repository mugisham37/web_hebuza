"use client";
import { ocrCopy } from "@/content/pages/ocr";
import { useWs } from "@/lib/agent/ws";
// Workbench tab panels: Brief (WB1/WB4), Documents QC (WB2/WB3), Timeline, Time (WC5), Money.
import { errorCopy } from "@/lib/api/error-copy";
import { useState } from "react";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDate, formatDateTime, formatMoney } from "@/shared/format";
import { setUrlParams } from "@/lib/url-state";
import { fill } from "@/content/pages/agent-workbench";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import {
  Field,
  Input,
  Textarea,
  Select,
  Radio,
  Checkbox,
} from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import {
  EmptyPanel,
  PanelError,
  TimelineItem,
  type TimelineKind,
} from "@/components/molecules/ops/ops";
import { SHEET_SM } from "@/components/organisms/ops/triage";
import { DocViewer } from "@/components/organisms/ops/doc-viewer";
import { MaskedValue, SkeletonRows, useNow } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import {
  useTick,
  useReveal,
  useCaseDocs,
  useQc,
  useLogTime,
  type WorkbenchVM,
  type QcDoc,
} from "@/lib/agent/b";
import { useW, day } from "@/components/organisms/agent/workbench-dialogs";

const stamp = () => Date.now();
const hm = (min: number) =>
  `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
const card = " border border-border bg-white p-4 sm:p-5";
const goTab = (tab: string) => setUrlParams({ tab });

// ---------------------------------------------------------------- Brief
export function BriefTab({ c, locked }: { c: WorkbenchVM; locked: boolean }) {
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const w = useW();
  const toast = useToast();
  const tick = useTick(c.ref);
  const reveal = useReveal(c.ref);
  const done = c.checklist.filter((s) => s.done).length;
  const n = c.checklist.length;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid content-start gap-4">
        <section
          aria-labelledby="wb-ins"
          className="m-stagger bg-tint p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 id="wb-ins"className="flex items-center gap-2 text-label">
              <Icon name="user" size={16} aria-hidden />
              {fill(w.brief.from, { m: c.manager })}
            </h2>
            <time
              className="text-eyebrow text-fg-subtle"
              dateTime={c.instructionsAt}
            >
              {formatDateTime(c.instructionsAt, locale)}
            </time>
          </div>
          <p className="sr-only">{w.brief.instructions}</p>
          <p className="mt-2 text-small whitespace-pre-line">
            {c.instructions}
          </p>
        </section>

        <section aria-labelledby="wb-cl"className={card}>
          <h2 id="wb-cl"className="text-label-lg">
            {w.brief.checklist}
          </h2>
          <p className="text-small text-fg-muted"aria-live="polite">
            {fill(w.brief.progress, { d: done, n })}
          </p>
          <div
            role="progressbar"
            aria-label={w.brief.checklist}
            aria-valuemin={0}
            aria-valuemax={n}
            aria-valuenow={done}
            className="mt-2 h-1.5 overflow-hidden bg-ink-100"
          >
            <div
              className="h-full origin-left bg-navy-700 transition-transform duration-(--dur-3)"
              style={{ transform: `scaleX(${n ? done / n : 0})` }}
            />
          </div>
          <ul className="mt-3 grid gap-1">
            {c.checklist.map((s, i) => (
              <li key={s.id} style={{ "--i": i } as React.CSSProperties}>
                <label
                  className={cx(
                    "m-press flex min-h-11 cursor-pointer items-center gap-3 px-2 hover:bg-bg-subtle",
                    locked && "cursor-not-allowed opacity-70",
                  )}
                >
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={s.done}
                    disabled={locked}
                    onChange={(e) =>
                      tick.mutate(
                        { id: s.id, done: e.target.checked },
                        {
                          onError: () =>
                            toast({
                              title: w.brief.tickFailed,
                              tone: "danger",
                            }),
                        },
                      )
                    }
                  />
                  <span
                    aria-hidden
                    className={cx(
                      "flex size-5 shrink-0 items-center justify-center border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-focus",
                      s.done
                        ? "bg-secondary text-on-navy"
                        : "border-border-strong bg-white",
                    )}
                  >
                    {s.done && (
                      <svg
                        viewBox="0 0 24 24"
                        className="size-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          className="m-tick"
                          pathLength={24}
                          d="M5 12.5l4.5 4.5L19 7.5"
                        />
                      </svg>
                    )}
                  </span>
                  <span
                    className={cx(
                      "text-small",
                      s.done && "text-fg-muted line-through decoration-1",
                    )}
                  >
                    {s.label}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="wb-dl"className={card}>
          <h2 id="wb-dl"className="text-label-lg">
            {w.brief.deliverables}
          </h2>
          <ul className="mt-2 grid gap-1">
            {c.slots.map((s) => (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => goTab("deliverables")}
                  className="m-press flex min-h-11 w-full items-center gap-3 px-2 text-left hover:bg-bg-subtle"
                >
                  <Icon
                    name={s.uploaded ? "fileCheck" : "file"}
                    size={18}
                    aria-hidden
                    className={s.uploaded ? "text-success" : "text-fg-muted"}
                  />
                  <span className="min-w-0 flex-1 text-small">{s.label}</span>
                  <span className="text-eyebrow text-fg-subtle">
                    {s.uploaded
                      ? w.brief.uploaded
                      : s.required
                        ? w.brief.required
                        : w.brief.optional}
                  </span>
                  <Icon name="arrowRight" size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="wb-ci"className={cx(card, "content-start")}>
        <h2 id="wb-ci"className="text-label-lg">
          {w.brief.client}
        </h2>
        <dl className="mt-2 divide-y divide-border">
          {c.answers
            .filter((a) => a.shared)
            .map((a) => (
              <div
                key={a.key}
                className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-2 py-2.5 text-small"
              >
                <dt className="text-fg-muted">
                  {w.brief.fields[a.label as keyof typeof w.brief.fields] ??
                    a.label}
                </dt>
                <dd className="min-w-0 break-all [&>span]:max-w-full [&>span]:flex-wrap">
                  {a.masked ? (
                    <MaskedValue
                      value={a.value}
                      masked={a.masked}
                      onReveal={() =>
                        reveal.mutate(a.key, {
                          onSuccess: () =>
                            toast({
                              title: w.brief.revealLogged,
                              tone: "success",
                            }),
                          onError: () =>
                            toast({ title: w.failed, tone: "danger" }),
                        })
                      }
                    />
                  ) : (
                    a.value
                  )}
                </dd>
              </div>
            ))}
        </dl>
        <div className="mt-4 bg-ink-100 p-3">
          <h3 className="flex items-center gap-2 text-label">
            <Icon name="lock" size={14} aria-hidden />
            {w.brief.notShared}
          </h3>
          <p className="text-eyebrow text-fg-subtle">{w.brief.notSharedBody}</p>
          <ul className="mt-2 grid gap-1 text-small text-fg-muted">
            {[
              ...c.answers
                .filter((a) => !a.shared)
                .map(
                  (a) =>
                    w.brief.fields[a.label as keyof typeof w.brief.fields] ??
                    a.label,
                ),
              ...c.notShared,
            ].map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- Documents (WB2 grid + viewer, WB3 request)
const REASONS = ["page", "blurry", "period", "expired", "other"] as const;
type Reason = (typeof REASONS)[number];

/** Stage 8: `top`, `docAction` and `watermark` are the external-agent slots (shared-only strip, download, viewer mark). */
export function DocumentsTab({
  c,
  locked,
  top,
  docAction,
  watermark,
}: {
  c: WorkbenchVM;
  locked: boolean;
  top?: React.ReactNode;
  docAction?: (docId: string) => React.ReactNode;
  watermark?: React.ReactNode;
}) {
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const w = useW();
  const toast = useToast();
  const online = useOnline();
  const q = useCaseDocs(c.ref);
  const qc = useQc(c.ref);
  const [viewing, setViewing] = useState<string | null>(null);
  const [returning, setReturning] = useState<QcDoc | null>(null);
  if (q.isPending) return <SkeletonRows n={4} />;
  if (q.isError)
    return <PanelError what={w.docs.title} onRetry={() => q.refetch()} />;
  const docs = q.data;
  const total = docs.length + c.notShared.length;
  const toCheck = docs.filter((d) => d.qc_status === "pending").length;
  const off = locked || !online;
  const accept = (d: QcDoc) =>
    qc.mutate(
      { id: d.document_id, qc_status: "accepted" },
      {
        onSuccess: () =>
          toast({
            title: fill(w.docs.acceptedToast, { d: d.x_agent.label }),
            tone: "success",
            action: {
              label: w.docs.undo,
              onClick: () =>
                qc.mutate({ id: d.document_id, qc_status: "pending" }),
            },
          }),
        onError: (e) => toast({ title: errorCopy(e, locale), tone: "danger" }),
      },
    );
  // DocViewer expects the ops record shape; adapt our QC docs (read-only there — decisions happen on the cards).
  const rec = {
    ...q,
    data: {
      docs: docs.map((d) => ({
        id: d.document_id,
        key: d.requirement_key,
        label: d.x_agent.label,
        kind: "pdf" as const,
        pages: d.x_agent.pages,
        legibility: d.x_agent.legibility,
        typeDetected: "PDF",
        expiry: d.x_agent.expiry,
        nameOnDoc: d.x_agent.nameOnDoc,
        checks: [],
        state: d.qc_status === "pending" ? null : d.qc_status,
        reason: d.qc_notes?.reason ?? null,
        uploadedAt: d.created_at,
      })),
    },
  } as never;
  return (
    <section aria-labelledby="wb-docs"className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="wb-docs"className="text-label-lg">
            {w.docs.title}
          </h2>
          <p className="text-small text-fg-muted">
            {fill(w.docs.shared, { n: docs.length, t: total })}
          </p>
        </div>
        {toCheck > 0 && (
          <span
            role="status"
            className="bg-warning-bg px-3 py-1 text-small font-medium text-warning"
          >
            {fill(w.docs.toCheck, { n: toCheck })}
          </span>
        )}
      </div>
      {top}
      {docs.length === 0 ? (
        <EmptyPanel title={w.docs.empty} body={w.docs.emptyBody} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 m-stagger">
          {docs.map((d, i) => {
            const legible = d.x_agent.legibility >= 80;
            return (
              <li
                key={d.document_id}
                style={{ "--i": Math.min(i, 6) } as React.CSSProperties}
              >
                <article
                  aria-label={d.x_agent.label}
                  className={cx(
                    "m-lift grid grid-cols-[3.5rem_1fr] gap-3 border bg-white p-3 m-tone",
                    d.qc_status === "accepted"
                      ? "border-success/40"
                      : d.qc_status === "rejected"
                        ? "border-danger/40"
                        : "border-border",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setViewing(d.document_id)}
                    aria-label={`${w.docs.view} ${d.x_agent.label}`}
                    className="m-press flex aspect-[3/4] items-center justify-center bg-ink-100 text-fg-muted hover:bg-ink-200"
                  >
                    <Icon name="file" size={22} aria-hidden />
                  </button>
                  <div className="grid min-w-0 content-start gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="min-w-0 truncate text-small font-medium"
                        title={d.original_filename}
                      >
                        {d.x_agent.label}
                      </p>
                      <time className="shrink-0 text-eyebrow text-fg-subtle tabular">
                        {formatDateTime(d.created_at, locale)}
                      </time>
                    </div>
                    <p className="text-eyebrow text-fg-subtle tabular">
                      {d.original_filename} ·{" "}
                      {(d.file_size_bytes / 1e6).toFixed(1)} MB ·{" "}
                      {fill(w.docs.version, { v: d.version })}
                      {d.ocr_suggestion && d.ocr_suggestion.kind !== "other" && (
                        <> · {ocrCopy(locale).label} {ocrCopy(locale).kinds[d.ocr_suggestion.kind] ?? d.ocr_suggestion.kind} ({Math.round(d.ocr_suggestion.confidence * 100)}%)</>
                      )}
                    </p>
                    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-eyebrow">
                      <li className={legible ? "text-success" : "text-warning"}>
                        <Icon
                          name={legible ? "check" : "x"}
                          size={12}
                          aria-hidden
                          className="mr-1 inline"
                        />
                        {legible ? w.docs.legible : w.docs.blurry}
                      </li>
                      {d.x_agent.expiry && (
                        <li className="text-success">
                          <Icon
                            name="check"
                            size={12}
                            aria-hidden
                            className="mr-1 inline"
                          />
                          {fill(w.docs.expires, {
                            d: formatDate(d.x_agent.expiry, locale),
                          })}
                        </li>
                      )}
                      <li className="text-success">
                        <Icon
                          name="check"
                          size={12}
                          aria-hidden
                          className="mr-1 inline"
                        />
                        {w.docs.nameMatch}
                      </li>
                    </ul>
                    <p
                      className={cx(
                        "text-eyebrow font-medium",
                        d.qc_status === "accepted"
                          ? "text-success"
                          : d.qc_status === "rejected"
                            ? "text-danger"
                            : "text-navy-800",
                      )}
                    >
                      {d.qc_status === "accepted"
                        ? w.docs.accepted
                        : d.qc_status === "rejected"
                          ? fill(w.docs.returned, {
                              r: d.qc_notes?.reason ?? "",
                            })
                          : w.docs.pending}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {d.qc_status !== "accepted" && (
                        <Button
                          size="sm"
                          disabled={off}
                          onClick={() => accept(d)}
                        >
                          {w.docs.accept}
                        </Button>
                      )}
                      {d.qc_status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={off}
                          onClick={() => setReturning(d)}
                        >
                          {w.docs.reupload}
                        </Button>
                      )}
                      {docAction?.(d.document_id)}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
      <Dialog
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={w.docs.viewer}
        className="max-w-6xl"
      >
        {viewing && (
          <div className="relative">
          <DocViewer
            refId={c.ref}
            rec={rec}
            clientName={c.client}
            selected={viewing}
            onSelect={setViewing}
            locked
            readOnly
            onRequest={() => undefined}
          />
          {watermark}
          </div>
        )}
      </Dialog>
      {returning && (
        <ReuploadDialog
          key={returning.document_id}
          c={c}
          doc={returning}
          onClose={() => setReturning(null)}
        />
      )}
    </section>
  );
}

/** Reason + note → preview (reminders, SLA pause, optional move) → Send → WB3 sent. */
function ReuploadDialog({
  c,
  doc,
  onClose,
}: {
  c: WorkbenchVM;
  doc: QcDoc;
  onClose: () => void;
}) {
  const w = useW();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const toast = useToast();
  const qc = useQc(c.ref);
  const [step, setStep] = useState<"reason" | "preview" | "sent">("reason");
  const [reason, setReason] = useState<Reason>("page");
  const [note, setNote] = useState("");
  const [move, setMove] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const canMove = c.moves.some((m) => m.to === "awaiting_client_documents");
  const send = () =>
    qc.mutate(
      {
        id: doc.document_id,
        qc_status: "rejected",
        qc_notes: { reason: w.docs.reasons[reason], note: note.trim(), move },
      },
      {
        onSuccess: () => {
          setStep("sent");
          toast({ title: w.docs.sent, tone: "success" });
        },
        onError: (e) => setErr(errorCopy(e, locale)),
      },
    );
  const footer =
    step === "sent" ? (
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => (onClose(), goTab("timeline"))}
        >
          {w.tabs.timeline}
        </Button>
        <Button onClick={onClose}>OK</Button>
      </div>
    ) : (
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={step === "preview" ? () => setStep("reason") : onClose}
        >
          {w.docs.cancel}
        </Button>
        {step === "reason" ? (
          <Button
            onClick={() =>
              reason === "other" && !note.trim()
                ? setErr(w.docs.noteRequired)
                : (setErr(null), setStep("preview"))
            }
          >
            {w.docs.preview}
          </Button>
        ) : (
          <Button dots loading={qc.isPending} onClick={send}>
            {w.docs.send}
          </Button>
        )}
      </div>
    );
  return (
    <Dialog
      open
      onClose={onClose}
      title={
        step === "sent"
          ? w.docs.sent
          : step === "preview"
            ? w.docs.previewTitle
            : w.docs.reasonTitle
      }
      description={doc.x_agent.label}
      className={SHEET_SM}
      footer={footer}
    >
      {step === "reason" && (
        <div className="grid gap-4">
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-label">{w.docs.reason}</legend>
            {REASONS.map((r) => (
              <Radio
                key={r}
                name="reason"
                label={w.docs.reasons[r]}
                checked={reason === r}
                onChange={() => setReason(r)}
              />
            ))}
          </fieldset>
          <Field label={w.docs.note}>
            {(p) => (
              <Textarea
                id={p.id}
                value={note}
                placeholder={w.docs.notePh}
                onChange={(e) => setNote(e.target.value)}
              />
            )}
          </Field>
        </div>
      )}
      {step === "preview" && (
        <div className="grid gap-4 m-rise">
          <p className="text-small">
            {fill(w.docs.previewBody, { c: c.client, d: doc.x_agent.label })}
          </p>
          <p className="bg-ink-100 px-3 py-2 text-small">
            <strong>{w.docs.reasons[reason]}</strong>
            {note.trim() && `, ${note.trim()}`}
          </p>
          <div>
            <h3 className="text-label">{w.docs.schedule}</h3>
            <ul className="mt-2 grid gap-1.5 text-small">
              {[w.docs.t2, w.docs.t5, w.docs.t7].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Icon name="calendar" size={14} aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          {canMove && (
            <div className="grid gap-2 border border-border p-3">
              <Checkbox
                label={w.docs.move}
                checked={move}
                onChange={(e) => setMove(e.target.checked)}
              />
              {move && (
                <p className="flex items-center gap-2 bg-warning-bg px-3 py-1 text-small text-warning m-pop">
                  <Icon name="clock" size={14} aria-hidden />
                  {w.docs.slaPause}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      {step === "sent" && (
        <div className="grid justify-items-center gap-3 py-4 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-success text-white m-pop">
            <svg
              viewBox="0 0 24 24"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              aria-hidden
            >
              <path
                className="m-tick"
                pathLength={24}
                d="M5 12.5l4.5 4.5L19 7.5"
              />
            </svg>
          </span>
          <p className="text-small text-fg-muted">{w.docs.sentBody}</p>
          {move && (
            <p className="bg-warning-bg px-3 py-1 text-small text-warning">
              {w.docs.slaPause}
            </p>
          )}
        </div>
      )}
      {err && (
        <p
          role="alert"
          className="m-shake mt-3 text-small font-medium text-danger"
        >
          {err}
        </p>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------- Timeline
const FILTERS = [
  "all",
  "status",
  "document",
  "note",
  "message",
  "time",
  "system",
] as const;
const TL: Record<string, TimelineKind> = {
  status: "status",
  document: "document",
  note: "note",
  message: "message",
  time: "system",
  system: "system",
};
export function TimelineTab({ c }: { c: WorkbenchVM }) {
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const w = useW();
  const [f, setF] = useState<(typeof FILTERS)[number]>("all");
  const rows = c.events.filter((e) => f === "all" || e.kind === f);
  return (
    <section aria-labelledby="wb-tl"className={card}>
      <h2 id="wb-tl"className="text-label-lg">
        {w.timeline.title}
      </h2>
      <div
        role="group"
        aria-label={w.timeline.title}
        className="mt-3 flex flex-wrap gap-1.5"
      >
        {FILTERS.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={f === k}
            onClick={() => setF(k)}
            className={cx(
              "m-press h-8 border px-3 text-small transition-colors",
              f === k
                ? "border-navy-700 bg-secondary text-on-navy"
                : "border-border-strong hover:border-navy-700/40",
            )}
          >
            {w.timeline[k]}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="mt-6 text-small text-fg-muted">{w.timeline.empty}</p>
      ) : (
        <ol className="mt-5">
          {rows.map((e, i) => (
            <TimelineItem
              key={e.id}
              kind={TL[e.kind] ?? "system"}
              title={e.text}
              actor={e.actor}
              time={formatDateTime(e.at, locale)}
              meta={e.internal ? w.timeline.internal : undefined}
              last={i === rows.length - 1}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Time (WC5 timesheet)
const ACTIVITIES = [
  "advisory",
  "preparation",
  "filing",
  "client",
  "travel",
] as const;
export function TimeTab({ c, locked }: { c: WorkbenchVM; locked: boolean }) {
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const w = useW();
  const toast = useToast();
  const online = useOnline();
  const now = useNow();
  const log = useLogTime(c.ref);
  const [date, setDate] = useState(() => day(stamp()));
  const [min, setMin] = useState(60);
  const [activity, setActivity] = useState<string>("preparation");
  const [note, setNote] = useState("");
  const total = c.timesheet.reduce((s, e) => s + e.minutes, 0);
  const week =
    now === null
      ? 0
      : c.timesheet
          .filter((e) => now - Date.parse(e.date) < 7 * 86_400_000)
          .reduce((s, e) => s + e.minutes, 0);
  const submit = () =>
    log.mutate(
      { date, minutes: min, activity, note: note.trim() || undefined },
      {
        onSuccess: () => (
          setNote(""),
          toast({ title: w.time.logged, tone: "success" })
        ),
        onError: (e) => toast({ title: errorCopy(e, locale), tone: "danger" }),
      },
    );
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section aria-labelledby="wb-ts"className={card}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="wb-ts"className="text-label-lg">
            {w.time.title}
          </h2>
          <p className="text-small text-fg-muted tabular"aria-live="polite">
            {fill(w.time.total, { t: hm(total) })} ·{" "}
            {fill(w.time.week, { t: hm(week) })}
          </p>
        </div>
        {c.timesheet.length === 0 ? (
          <p className="mt-4 text-small text-fg-muted">{w.time.empty}</p>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-label={w.time.title}
            className="mt-3 overflow-x-auto"
          >
            <table className="w-full text-small">
              <thead className="text-left text-eyebrow text-fg-subtle">
                <tr>
                  <th className="py-2 font-medium">{w.time.date}</th>
                  <th className="py-2 font-medium">{w.time.minutes}</th>
                  <th className="py-2 font-medium">{w.time.activity}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {c.timesheet.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      {formatDate(e.date, locale)}
                    </td>
                    <td className="py-2.5 pr-3 tabular">{hm(e.minutes)}</td>
                    <td className="py-2.5">
                      {w.time.activities[e.activity] ?? e.activity}
                      {e.note && (
                        <span className="block text-eyebrow text-fg-subtle">
                          {e.note}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border-strong font-medium">
                  <td className="py-2.5">{w.time.totalRow}</td>
                  <td className="py-2.5 tabular"colSpan={2}>
                    {hm(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
      <form
        aria-label={w.time.add}
        className={cx(card, "grid content-start gap-3")}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label={w.time.date}>
          {(p) => (
            <Input
              id={p.id}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
        </Field>
        <div className="grid gap-1.5">
          <span className="text-label">{w.time.minutes}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={w.time.less}
              disabled={min <= 15}
              onClick={() => setMin(min - 15)}
              className="m-press flex size-11 items-center justify-center rounded-full border border-border-strong disabled:opacity-40"
            >
              <Icon name="minus" size={16} aria-hidden />
            </button>
            <output
              aria-live="polite"
              className="min-w-20 text-center text-label tabular"
            >
              {hm(min)}
            </output>
            <button
              type="button"
              aria-label={w.time.more}
              disabled={min >= 720}
              onClick={() => setMin(min + 15)}
              className="m-press flex size-11 items-center justify-center rounded-full border border-border-strong disabled:opacity-40"
            >
              <Icon name="plus" size={16} aria-hidden />
            </button>
          </div>
        </div>
        <Field label={w.time.activity}>
          {(p) => (
            <Select
              id={p.id}
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
            >
              {ACTIVITIES.map((a) => (
                <option key={a} value={a}>
                  {w.time.activities[a]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={w.time.note}>
          {(p) => (
            <Input
              id={p.id}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </Field>
        <Button
          type="submit"
          dots
          loading={log.isPending}
          disabled={locked || !online || !date}
        >
          {w.time.add}
        </Button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- Money
export function MoneyTab({ c }: { c: WorkbenchVM }) {
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const w = useW();
  const s = c.share;
  const rows: [string, string][] = [
    [w.money.eligible, formatMoney(s.eligible, "RWF", locale)],
    [
      fill(w.money.pct, { p: Math.round(s.pct * 100) }),
      `× ${Math.round(s.pct * 100)}%`,
    ],
  ];
  return (
    <section aria-labelledby="wb-mo"className={cx(card, "max-w-xl")}>
      <h2 id="wb-mo"className="text-label-lg">
        {w.money.title}
      </h2>
      <dl className="mt-3 divide-y divide-border text-small">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 py-2.5">
            <dt className="text-fg-muted">{k}</dt>
            <dd className="tabular">{v}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 py-3 text-label-lg">
          <dt>{w.money.total}</dt>
          <dd className="tabular">{formatMoney(s.amount, "RWF", locale)}</dd>
        </div>
      </dl>
      <p className="mt-1 inline-flex bg-tint px-3 py-1 text-small text-navy-800">
        {s.state === "approved" ? w.money.approved : w.money.pending}
      </p>
      <p className="mt-3 text-eyebrow text-fg-subtle">{w.money.note}</p>
      <ButtonLink
        href={localHref(locale, wsHref("/agent/earnings"))}
        variant="outline"
        className="mt-4"
      >
        {w.money.open}
      </ButtonLink>
    </section>
  );
}

