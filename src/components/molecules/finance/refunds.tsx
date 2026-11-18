"use client";
// Lane D shared bits: copy hooks, error helpers, the small lane-local atoms (impact table, execute steps, channel preview).
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cx, formatDateTime } from "@/shared/format";
import { financeReceivables } from "@/content/pages/finance-receivables";
import { financeRefunds } from "@/content/pages/finance-refunds";
import { fill } from "@/content/pages/finance-common";
import { ApiError } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { Amount } from "@/components/atoms/finance";
import { Icon } from "@/components/atoms/icon";
import { Avatar } from "@/components/atoms/misc";
import type { Channel, ImpactRow } from "@/lib/finance/d";

export const useRC = () => financeReceivables(useI18n().locale);
export const useRF = () => financeRefunds(useI18n().locale);
export const isForbidden = (e: unknown) => e instanceof ApiError && e.isForbidden;
export const isNotFound = (e: unknown) => e instanceof ApiError && e.isNotFound;
export { fill, errorCopy };

/** Allocation impact (board 09 RF2): per agent allocated → reversal → net; paid-out and voided called out in text. */
export function ImpactTable({ rows }: { rows: ImpactRow[] }) {
  const c = useRF();
  if (!rows.length) return <p className="bg-bg-subtle px-3 py-4 text-small text-fg-muted">{c.impact.none}</p>;
  return (
    <ul className="grid gap-3 m-stagger">
      {rows.map((r, i) => (
        <li key={r.workerId} style={{ ["--i" as string]: i }} className="grid gap-2 border border-border p-3">
          <div className="flex items-center gap-3">
            <Avatar name={r.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-small font-medium">{r.name}</p>
              <p className="text-eyebrow text-fg-subtle">{c.impact.allocated} <Amount value={r.allocated} size="sm" /></p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-small">
            <div className="bg-danger-bg px-2.5 py-2"><dt className="text-eyebrow text-danger">{c.impact.reversal}</dt><dd><Amount value={r.reversal} size="sm" className="font-semibold" /></dd></div>
            <div className="bg-bg-subtle px-2.5 py-2"><dt className="text-eyebrow text-fg-muted">{c.impact.net}</dt><dd><Amount value={r.net} size="sm" className="font-semibold" /></dd></div>
          </dl>
          {(r.voided || r.paidOut) && (
            <p className="flex items-start gap-1.5 text-eyebrow text-fg-muted">
              <Icon name={r.voided ? "x" : "clock"} size={12} aria-hidden className="mt-0.5 shrink-0" />{r.voided ? c.impact.voided : c.impact.paid}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export type ExecStep = "done" | "active" | "failed" | "todo";
/** Three-step payout progress (board 09 RF3). Polite live region announces the current step. */
export function ExecSteps({ states, times }: { states: [ExecStep, ExecStep, ExecStep]; times?: (string | undefined)[] }) {
  const c = useRF();
  const { locale } = useI18n();
  const labels = [c.exec.steps.check, c.exec.steps.disburse, c.exec.steps.confirm];
  const current = states.findIndex((s) => s === "active" || s === "failed");
  return (
    <ol className="grid gap-4" aria-live="polite">
      {labels.map((l, i) => {
        const s = states[i];
        return (
          <li key={l} className="flex items-start gap-3" aria-current={i === current ? "step" : undefined}>
            <span aria-hidden className={cx("flex size-7 shrink-0 items-center justify-center rounded-full m-tone",
              s === "done" ? "bg-success text-white m-tick" : s === "active" ? "bg-surface text-fg-heading ring-2 ring-primary" : s === "failed" ? "bg-danger text-white" : "bg-ink-100 text-fg-subtle")}>
              {s === "done" ? <Icon name="check" size={14} /> : s === "failed" ? <Icon name="x" size={14} /> : s === "active" ? <span className="size-2 animate-pulse rounded-full bg-secondary motion-reduce:animate-none" /> : <span className="size-1.5 rounded-full bg-current" />}
            </span>
            <span className="grid">
              <span className={cx("text-small", s === "todo" ? "text-fg-subtle" : "font-medium")}>{l}</span>
              <span className="text-eyebrow text-fg-subtle">
                {s === "done" ? (times?.[i] ? formatDateTime(times[i]!, locale) : "✓") : s === "active" ? c.exec.inProgress : s === "failed" ? c.exec.failed : ""}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** How the reminder will look on the chosen channel (board 08 PA1, not a real client). */
export function ChannelPreview({ channel, text, time }: { channel: Channel; text: string; time: string }) {
  const c = useRC();
  const shell = (children: ReactNode, cls: string) => (
    <div className={cx("grid min-h-56 content-start gap-3 p-4", cls)}>{children}</div>
  );
  const head = (
    <div className="flex items-center gap-2 border-b border-current/10 pb-2">
      <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-secondary text-primary"><Icon name="sparkle" size={14} /></span>
      <span className="grid"><span className="text-small font-semibold">HEBUZA</span><span className="text-eyebrow opacity-70">{c.rem.channels[channel]}</span></span>
    </div>
  );
  const body = text.trim() || "…";
  if (channel === "email")
    return shell(<>{head}<p className="whitespace-pre-wrap bg-surface p-3 text-small shadow-sm">{body}</p></>, "bg-bg-subtle");
  return shell(
    <>
      {head}
      <div className={cx("ml-auto max-w-[85%] p-3 text-small shadow-sm m-rise", channel === "whatsapp" ? "bg-green-50 text-fg" : "bg-surface text-fg")}>
        <p className="whitespace-pre-wrap">{body}</p>
        <p className="mt-1 text-right text-eyebrow text-fg-subtle tabular">{time}{channel === "whatsapp" && " ✓✓"}</p>
      </div>
    </>,
    channel === "whatsapp" ? "bg-ink-100" : "bg-ink-100",
  );
}

/** Offline / locked / read-only reason under a disabled money action. */
export function Reason({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "warning" }) {
  return (
    <p role="note" className={cx("flex items-start gap-1.5 text-small", tone === "warning" ? "text-warning" : "text-fg-muted")}>
      <Icon name={tone === "warning" ? "lock" : "shield"} size={14} aria-hidden className="mt-0.5 shrink-0" />{children}
    </p>
  );
}
