"use client";
import Link from "next/link";
import { cx } from "@/shared/format";
import { Icon, type IconName } from "@/components/atoms/icon";
import { useFieldCopy, fill } from "@/lib/field/copy";
import { useCopyA } from "@/lib/field/copy-a";
import { formatDistance } from "@/lib/field/geo";
import type { FieldVisit, VisitPurpose } from "@/shared/field/types";
import { TimeWindowChip, OutcomeChip, hhmm, useFieldBase } from "@/components/atoms/field-agent";

export const PURPOSE_ICON: Record<VisitPurpose, IconName> = {
  pickup: "fileCheck", dropoff: "file", institution_submission: "building", site_visit: "camera", meeting: "users", assisted_application: "laptop",
};

/** One day-plan row: whole row is the link target, 2-line clamp, status chips with text. */
export function VisitRow({ v, distanceM, now, index }: { v: FieldVisit & { local?: { pendingOps: number } }; distanceM: number | null; now: number; index: number }) {
  const { c, locale } = useFieldCopy();
  const a = useCopyA();
  const base = useFieldBase();
  const cancelled = v.status === "cancelled";
  return (
    <li style={{ "--i": index } as React.CSSProperties}>
      <Link href={base(`/visits/${v.id}`)}
        className={cx("m-press m-lift flex min-h-20 items-start gap-3 border bg-surface p-4", v.priority === "high" && !cancelled ? "border-gold-400" : "border-border", cancelled && "opacity-70")}>
        <span aria-hidden className={cx("mt-0.5 flex size-10 shrink-0 items-center justify-center", cancelled ? "bg-ink-100 text-fg-muted" : "bg-navy-50 text-navy-700")}>
          <Icon name={PURPOSE_ICON[v.purpose]} size={18} />
        </span>
        <span className="grid min-w-0 flex-1 gap-1.5">
          <span className="flex flex-wrap items-center gap-x-2 text-small text-fg-muted tabular">
            <span className="font-medium text-fg">{hhmm(v.windowStart, locale)}</span>
            <span aria-hidden>·</span>
            <span>{distanceM !== null ? formatDistance(distanceM) : a.distanceUnknown}</span>
            <span className="text-fg-subtle">{v.ref}</span>
          </span>
          <span className={cx("line-clamp-2 text-label-lg", cancelled && "line-through")}>{v.title_i18n[locale]}</span>
          <span className="line-clamp-1 text-small text-fg-subtle">{v.institution ?? v.address}</span>
          <span className="flex flex-wrap gap-1.5">
            {cancelled && <OutcomeChip outcome="cancelled" />}
            {cancelled && <span className="text-eyebrow normal-case text-fg-subtle">{a.cancelled}</span>}
            {!cancelled && v.priority === "high" && <span className="inline-flex h-7 items-center bg-gold-100 px-2.5 text-eyebrow font-medium normal-case text-gold-800">{a.high}</span>}
            {v.status === "scheduled" && <TimeWindowChip start={v.windowStart} end={v.windowEnd} now={now} />}
            {v.status === "in_progress" && <span className="inline-flex h-7 items-center gap-1.5 bg-secondary px-2.5 text-eyebrow font-medium normal-case text-on-navy"><span aria-hidden className="size-1.5 animate-pulse rounded-full bg-gold-400" />{a.inProgress}</span>}
            {v.checkout && <OutcomeChip outcome={v.checkout.outcome} />}
            {v.changed && <span className="inline-flex h-7 items-center bg-info-bg px-2.5 text-eyebrow font-medium normal-case text-info">{fill(a.changed, { from: v.changed.from })}</span>}
            {v.custodyOpen > 0 && <span className="inline-flex h-7 items-center gap-1 bg-warning-bg px-2.5 text-eyebrow font-medium normal-case"><Icon name="lock" size={12} aria-hidden />{v.custodyOpen}</span>}
            {!!v.local?.pendingOps && <span className="inline-flex h-7 items-center bg-ink-100 px-2.5 text-eyebrow font-medium normal-case">{fill(c.pending, { n: v.local.pendingOps })}</span>}
          </span>
        </span>
        <Icon name="arrowRight" size={18} aria-hidden className="mt-2 shrink-0 text-fg-subtle" />
      </Link>
    </li>
  );
}
