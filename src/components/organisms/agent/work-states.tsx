"use client";
// Lane B: worker-status states (plan §2.2, board 02 SH3a/SH3b, 12 ST3/ST4).
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { usePathname } from "next/navigation";
import { useExternal, type WorkerStatus } from "@/lib/work/api";
import { workOnboarding } from "@/content/pages/work-onboarding";
import { fill } from "@/content/pages/work-common";
import { Icon } from "@/components/atoms/icon";
import { ButtonLink } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { WorkerStatusChip } from "@/components/atoms/work";

export const useOb = () => workOnboarding(useI18n().locale);

/** Lavender lock disc (§5.5 ClearanceLock). */
function LockMark({ tone = "lavender" }: { tone?: "lavender" | "danger" | "ink" }) {
  const cls = tone === "danger" ? "bg-danger-bg text-danger" : tone === "ink" ? "bg-secondary text-on-navy" : "bg-navy-50 text-navy-700";
  return (
    <span className={`relative flex size-16 items-center justify-center rounded-full ${cls} m-pop`}>
      <Icon name={tone === "ink" ? "check" : "lock"} size={26} aria-hidden />
      <Icon name="sparkle"size={14} aria-hidden className="absolute -top-1 -right-1 text-navy-700" />
    </span>
  );
}

/** Full-page takeover for suspended/terminated workers; null otherwise. Earnings/contract stay reachable (gate). */
export function StatusTakeover({ status }: { status: WorkerStatus }) {
  const o = useOb();
  const { locale } = useI18n();
  const { ext } = useExternal();
  if (status !== "suspended" && status !== "terminated") return null;
  const m = ext?.manager ?? "HEBUZA";
  const s = o.states;
  const susp = status === "suspended";
  return (
    <section role="alert"className="mx-auto grid max-w-xl place-items-center gap-4 border border-border bg-white px-6 py-12 text-center m-rise">
      <LockMark tone={susp ? "danger" : "ink"} />
      <WorkerStatusChip status={status} />
      <h1 className="text-h3">{susp ? s.suspendedTitle : s.terminatedTitle}</h1>
      <p className="max-w-md text-body text-fg-muted">{susp ? fill(s.suspendedBody, { m }) : s.terminatedBody}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {susp ? (
          <ButtonLink href={localHref(locale, "/work/earnings")}>{s.earnings}</ButtonLink>
        ) : (
          <ButtonLink href={localHref(locale, "/work/earnings?tab=statements")}>{s.finalStatement}</ButtonLink>
        )}
        <ButtonLink variant="outline" href={localHref(locale, "/work/contract")}>
          {s.contract}
        </ButtonLink>
      </div>
      {susp && <p className="text-small text-fg-subtle">{fill(s.contact, { m })}</p>}
    </section>
  );
}

/** SH3a "Finish verification to unlock" — inline in place of a locked feature (offers strip, upload slot …). */
export function NotClearedPanel({ compact }: { compact?: boolean }) {
  const o = useOb();
  const { locale } = useI18n();
  const { ext } = useExternal();
  const pending = ext?.status === "pending_verification";
  const href = localHref(locale, `/work/onboarding/${pending ? "review" : (ext?.todo[0] ?? "identity")}`);
  if (compact)
    return (
      <p role="note"className="flex flex-wrap items-center gap-2 bg-tint px-3 py-2 text-small">
        <Icon name="lock" size={14} aria-hidden />
        <span className="flex-1">{pending ? o.states.pendingBody : o.states.notClearedBody}</span>
        {!pending && (
          <Link href={href} className="font-medium text-navy-700 underline underline-offset-4">
            {o.states.continue}
          </Link>
        )}
      </p>
    );
  return (
    <div className="grid place-items-center gap-3 border border-dashed border-border-strong bg-white px-6 py-10 text-center">
      <LockMark />
      <p className="text-card-title">{o.states.notClearedTitle}</p>
      <p className="max-w-sm text-small text-fg-muted">{pending ? o.states.pendingBody : o.states.notClearedBody}</p>
      {!pending && (
        <ButtonLink href={href} size="sm">
          {o.states.continue} <Icon name="arrowRight" size={14} aria-hidden />
        </ButtonLink>
      )}
    </div>
  );
}

/** ST3 session expired (idle 30 min → 401): sign in again with next= the current page. */
export function SessionExpired({ open }: { open: boolean }) {
  const o = useOb();
  const { locale } = useI18n();
  const path = usePathname();
  return (
    <Dialog
      open={open}
      onClose={() => {}}
      title={o.states.sessionTitle}
      footer={<ButtonLink href={`${localHref(locale, "/login")}?next=${encodeURIComponent(path)}`}>{o.states.signIn}</ButtonLink>}
    >
      <p className="text-body text-fg-muted">{o.states.sessionBody}</p>
    </Dialog>
  );
}
