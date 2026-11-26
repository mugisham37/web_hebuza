"use client";
// CT1 answers + completeness checklist, CT3 request dialog, CT4 after-send card and re-upload banner.
import { errorCopy } from "@/lib/api/error-copy";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cx, formatDate } from "@/shared/format";
import { opsCase, fill } from "@/content/pages/ops-case";
import { Panel, PanelError } from "@/components/molecules/ops/ops";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Skeleton } from "@/components/atoms/feedback";
import { Icon, type IconName } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import {
  evaluate,
  type ChecklistItem,
  type ItemState,
} from "@/shared/ops/completeness";
import {
  useMarkComplete,
  useRecord,
  useRequestDocs,
  type CaseRecord,
} from "@/lib/ops/b";
import type { CaseDetailVM } from "@/lib/ops/api";

/** Right-hand side panel on desktop, bottom sheet with grab-handle radius on phones. */
export const SIDE_SHEET =
  "max-sm:mt-auto max-sm:ml-0 max-sm:h-auto max-sm:max-h-[90dvh] max-sm:max-w-full max-sm:rounded-none";
/** Centred dialog on desktop, bottom sheet on phones. */
export const SHEET_SM =
  "max-sm:mt-auto max-sm:mb-0 max-sm:w-full max-sm:max-w-full max-sm:rounded-none";

const STATE_UI: Record<ItemState, { icon: IconName; cls: string }> = {
  provided: { icon: "check", cls: "bg-success-bg text-success" },
  missing: { icon: "x", cls: "bg-danger-bg text-danger" },
  rejected: { icon: "x", cls: "bg-danger-bg text-danger" },
  check: { icon: "zap", cls: "bg-warning-bg text-warning" },
  pending: { icon: "clock", cls: "bg-ink-100 text-ink-700" },
};

export function AnswersPanel({
  rec,
  wide,
}: {
  rec: ReturnType<typeof useRecord>;
  wide?: boolean;
}) {
  const { locale } = useI18n();
  const t = opsCase(locale).triage;
  if (rec.isPending)
    return (
      <Panel title={t.answers}>
        <div className="grid gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-6" />
          ))}
        </div>
      </Panel>
    );
  if (rec.isError)
    return <PanelError what={t.answers} onRetry={() => rec.refetch()} />;
  const d: CaseRecord = rec.data;
  const total = d.shareholders.reduce((s, x) => s + x.pct, 0);
  return (
    <Panel title={t.answers} className={wide ? "max-w-3xl" : undefined}>
      {d.groups.map((g) => (
        <section key={g.key} className="mb-4">
          <h3 className="mb-1.5 text-label">{t.groups[g.key] ?? g.key}</h3>
          <dl className="grid grid-cols-[minmax(0,10rem)_1fr] gap-x-4 text-small">
            {g.rows.map((r) => (
              <div key={r.label} className="contents">
                <dt className="border-b border-border py-1.5 text-fg-muted">
                  {r.label}
                </dt>
                <dd className="min-w-0 border-b border-border py-1.5 break-words">
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      {d.shareholders.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-label">{t.shareholders}</h3>
          <table className="w-full text-small">
            <caption className="sr-only">{t.shareholders}</caption>
            <tbody>
              {d.shareholders.map((s) => (
                <tr key={s.name} className="border-b border-border">
                  <th scope="row" className="py-1.5 text-left font-normal">
                    {s.name}
                  </th>
                  <td className="py-1.5 text-right tabular">{s.pct}%</td>
                </tr>
              ))}
              <tr>
                <th scope="row" className="py-1.5 text-left font-medium">
                  {t.total}
                </th>
                <td
                  className={cx(
                    "py-1.5 text-right font-medium tabular",
                    total !== 100 && "text-danger",
                  )}
                >
                  {total}%
                </td>
              </tr>
            </tbody>
          </table>
          {total !== 100 && (
            <p role="alert" className="mt-1 text-small text-danger">
              {fill(t.totalBad, { n: total })}
            </p>
          )}
        </section>
      )}
    </Panel>
  );
}

export function ChecklistPanel({
  c,
  locked,
  onView,
  onRequest,
  onReject,
}: {
  c: CaseDetailVM;
  locked: boolean;
  onView: (docId: string) => void;
  onRequest: (keys?: string[]) => void;
  onReject: () => void;
}) {
  const { locale } = useI18n();
  const t = opsCase(locale).triage;
  const ev = evaluate(c.checklist);
  const mark = useMarkComplete();
  const toast = useToast();
  const blocker = locked
    ? opsCase(locale).claimedBody
    : ev.blocker
      ? t.blockers[ev.blocker]
      : null;
  return (
    <Panel title={t.checklist} className="grid content-start">
      <p className="-mt-2 mb-2 text-small font-medium tabular">
        {fill(t.ofComplete, { d: ev.done, t: ev.total })}
      </p>
      <div data-guide="ops-checklist"
        className="mb-3 h-1.5 overflow-hidden bg-bg-subtle"
        role="progressbar"
        aria-valuenow={ev.pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t.checklist}
      >
        <span
          className="block h-full bg-success"
          style={{ width: `${ev.pct}%` }}
        />
      </div>
      <ul className="grid">
        {c.checklist.map((i: ChecklistItem) => {
          const ui = STATE_UI[i.state];
          return (
            <li
              key={i.key}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border py-2 last:border-0"
            >
              <span
                className={cx(
                  "flex size-6 shrink-0 items-center justify-center rounded-full",
                  ui.cls,
                )}
              >
                <Icon name={ui.icon} size={13} aria-hidden />
              </span>
              <span className="min-w-0 flex-1 text-small">
                {i.label}
                <span className="block text-eyebrow text-fg-subtle">
                  {t.states[i.state]}
                  {!i.required && ` · ${t.optional}`}
                  {i.note && ` · ${i.note}`}
                </span>
              </span>
              {i.docId && i.state !== "missing" ? (
                <button
                  type="button"
                  onClick={() => onView(i.docId!)}
                  className="text-small font-medium text-link underline-offset-4 hover:underline"
                >
                  {t.view}
                  <span className="sr-only"> {i.label}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onRequest([i.key])}
                  className="text-small font-medium text-link underline-offset-4 hover:underline disabled:opacity-50"
                >
                  {t.request}
                  <span className="sr-only"> {i.label}</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-4 grid gap-2 border-t border-border pt-4">
        <div className="flex flex-wrap gap-2">
          <Button data-guide="ops-mark-complete"
            size="sm"
            dots
            disabled={!!blocker}
            aria-describedby={blocker ? "mc-why" : undefined}
            loading={mark.isPending}
            onClick={() =>
              mark.mutate(
                { ref: c.ref },
                {
                  onSuccess: () => toast({ title: t.marked, tone: "success" }),
                  onError: (e) => toast({ title: errorCopy(e, locale), tone: "danger" }),
                },
              )
            }
          >
            {t.markComplete}
          </Button>
          <Button data-guide="ops-request-missing"
            size="sm"
            variant="outline"
            disabled={locked || !ev.missing.length}
            onClick={() => onRequest()}
          >
            {t.requestMissing}
          </Button>
          <Button data-guide="ops-reject"
            size="sm"
            variant="ghost"
            disabled={locked}
            onClick={onReject}
            className="text-danger"
          >
            {t.reject}
          </Button>
        </div>
        {blocker && (
          <p
            id="mc-why"
            className="flex items-center gap-1.5 text-eyebrow text-fg-muted"
          >
            <Icon name="lock" size={12} aria-hidden />
            {blocker}
          </p>
        )}
      </div>
    </Panel>
  );
}

const CHANNELS = ["sms", "whatsapp", "inapp"] as const;
export function RequestDocsDialog({
  open,
  onClose,
  c,
  preselect,
  clientName,
  due0,
}: {
  open: boolean;
  onClose: () => void;
  c: CaseDetailVM;
  preselect: string[];
  clientName: string;
  due0: string;
}) {
  const { locale } = useI18n();
  const t = opsCase(locale).request;
  const candidates = c.checklist.filter((i) => i.state !== "provided");
  const [picked, setPicked] = useState<string[]>(preselect);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [due, setDue] = useState(due0);
  const [channels, setChannels] = useState<string[]>(["sms", "inapp"]);
  const [err, setErr] = useState<string | null>(null);
  const req = useRequestDocs();
  const toast = useToast();
  const dueLabel = due
    ? formatDate(due, locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "";
  const send = () => {
    if (!picked.length) return setErr(t.noItems);
    if (!channels.length) return setErr(t.noChannel);
    setErr(null);
    req.mutate(
      {
        ref: c.ref,
        items: picked.map((key) => ({ key, note: notes[key] ?? "" })),
        due,
        channels,
        sub: fill(opsCase(locale).after.sub, { n: picked.length, d: dueLabel }),
      },
      {
        onSuccess: () => {
          toast({ title: fill(t.sent, { name: clientName }), tone: "success" });
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
      side="right"
      className={SIDE_SHEET}
      title={fill(t.title, { name: clientName.split(" ")[0] })}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button dots onClick={send} loading={req.isPending}>
            {t.send}
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        <fieldset className="grid gap-3">
          <legend className="mb-2 text-label">{t.items}</legend>
          {candidates.map((i) => {
            const on = picked.includes(i.key);
            return (
              <div
                key={i.key}
                className={cx(
                  "grid gap-2 border p-3",
                  on ? "border-navy-700 bg-navy-50" : "border-border",
                )}
              >
                <label className="flex items-center gap-2.5 text-small font-medium">
                  <input
                    type="checkbox"
                    className="size-4 accent-navy-700"
                    checked={on}
                    onChange={() =>
                      setPicked(
                        on
                          ? picked.filter((k) => k !== i.key)
                          : [...picked, i.key],
                      )
                    }
                  />
                  {i.label}
                </label>
                {on && (
                  <label className="grid gap-1 text-eyebrow text-fg-muted">
                    {fill(t.note, { item: i.label })}
                    <input
                      value={notes[i.key] ?? ""}
                      onChange={(e) =>
                        setNotes({ ...notes, [i.key]: e.target.value })
                      }
                      placeholder={t.notePh}
                      maxLength={200}
                      className="h-10 border border-border-strong bg-white px-3 text-small text-fg focus:border-navy-700 focus:ring-3 focus:ring-gold-400/45 hover:border-ink-400 focus:outline-none"
                    />
                  </label>
                )}
              </div>
            );
          })}
        </fieldset>
        <label className="grid gap-1.5 text-label">
          {t.due}
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="h-10 border border-border-strong bg-white px-3 text-small focus:border-navy-700 focus:ring-3 focus:ring-gold-400/45 hover:border-ink-400 focus:outline-none"
          />
        </label>
        <fieldset>
          <legend className="mb-2 text-label">{t.channels}</legend>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((ch) => {
              const on = channels.includes(ch);
              return (
                <button
                  key={ch}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setChannels(
                      on ? channels.filter((x) => x !== ch) : [...channels, ch],
                    )
                  }
                  className={cx(
                    "h-9 border px-4 text-small",
                    on
                      ? "border-secondary bg-secondary text-on-secondary"
                      : "border-border-strong hover:border-navy-300",
                  )}
                >
                  {t.channel[ch]}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="grid gap-1.5">
          <p className="text-label">{t.preview}</p>
          <p
            className="border border-border bg-bg-subtle px-3 py-2.5 text-small"
            aria-live="polite"
          >
            {fill(t.sms, { n: picked.length, ref: c.ref, d: dueLabel })}
          </p>
        </div>
        <p className="flex items-center gap-2 bg-info-bg px-3 py-2.5 text-small text-info">
          <Icon name="clock" size={15} aria-hidden />
          {t.slaPause}
        </p>
        {err && (
          <p role="alert" className="text-small font-medium text-danger">
            {err}
          </p>
        )}
      </div>
    </Dialog>
  );
}

/** CT4: what was asked, when it's due, and the reminder ladder. */
export function AfterSent({
  rec,
  c,
  locked,
}: {
  rec: CaseRecord;
  c: CaseDetailVM;
  locked: boolean;
}) {
  const { locale } = useI18n();
  const t = opsCase(locale).after;
  if (!rec.request || c.status !== "awaiting_client_documents") return null;
  const r = rec.request;
  const ladder = [
    [2, opsCase(locale).request.channel.sms],
    [4, opsCase(locale).request.channel.whatsapp],
    [7, t.callTask],
  ] as const;
  return (
    <section
      aria-label={t.reminders}
      className="flex flex-wrap items-center gap-x-6 gap-y-3 border border-border bg-white p-4"
    >
      <div className="grid gap-0.5">
        <p className="text-small font-medium">
          {r.items.map((i) => i.label).join(" · ")}
        </p>
        <p className="text-eyebrow text-fg-muted">
          {fill(t.sub, {
            n: r.items.length,
            d: formatDate(r.due, locale, {
              weekday: "short",
              day: "numeric",
              month: "short",
            }),
          })}{" "}
          ·{" "}
          {r.channels
            .map((ch) => opsCase(locale).request.channel[ch])
            .join(", ")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-eyebrow text-fg-muted">{t.reminders}</span>
        {ladder.map(([d, l]) => (
          <span
            key={d}
            className="inline-flex h-7 items-center border border-border-strong px-3 text-eyebrow"
          >
            {fill(t.day, { n: d })} · {l}
          </span>
        ))}
      </div>
    </section>
  );
}

export function ReuploadBanner({
  n,
  onReview,
}: {
  n: number;
  onReview: () => void;
}) {
  const { locale } = useI18n();
  const t = opsCase(locale).triage;
  if (!n) return null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 border border-gold-300 bg-gold-50 px-4 py-3"
    >
      <Icon name="upload" size={18} aria-hidden />
      <p className="flex-1 text-small font-medium">
        {fill(t.reuploaded, { n })}
      </p>
      <Button size="sm" onClick={onReview}>
        {t.reviewNow}
      </Button>
    </div>
  );
}
