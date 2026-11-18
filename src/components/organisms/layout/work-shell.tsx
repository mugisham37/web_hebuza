"use client";
// /work shell extras: mounts the Stage 4 AgentProvider with ws="work", adds the clearance/contract strip (board 02
// SH1/SH3, XK5 expiry banner) and hides Team for firm members (§7.9).
import type { ReactNode } from "react";
import Link from "next/link";
import { AgentProvider } from "@/components/organisms/layout/agent-shell";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useExternal } from "@/lib/work/api";
import { fill } from "@/content/pages/work-common";
import { Icon } from "@/components/atoms/icon";
import { cx, formatDate } from "@/shared/format";
import { ExpiryChip, WorkerStatusChip, useW } from "@/components/atoms/work";

const MEMBER_HIDDEN = ["/work/team"];

export function WorkShellExtras({ children }: { children: ReactNode }) {
  return <Inner>{children}</Inner>;
}
function Inner({ children }: { children: ReactNode }) {
  const { ext } = useExternal();
  return (
    <AgentProvider ws="work" banner={<WorkStrip />} hidden={ext?.firmRole === "member" ? MEMBER_HIDDEN : undefined}>
      {children}
    </AgentProvider>
  );
}

/** One strip at most: status (not cleared / pending / changes) wins over contract expiry. */
function WorkStrip() {
  const w = useW();
  const { locale } = useI18n();
  const { ext } = useExternal();
  if (!ext) return null;
  const L = (p: string) => localHref(locale, p);
  if (ext.status === "onboarding" || ext.status === "pending_verification" || ext.status === "changes_requested") {
    const tone = ext.status === "pending_verification" ? "bg-warning-bg" : ext.status === "changes_requested" ? "bg-danger-bg" : "bg-info-bg text-info";
    return (
      <div role="status" className={cx("mb-5 flex flex-wrap items-center gap-3 px-4 py-3 text-small m-rise", tone)}>
        <WorkerStatusChip status={ext.status} />
        <p className="min-w-0 flex-1">{w.statusHint[ext.status]}</p>
        {ext.status !== "pending_verification" && (
          <Link href={L(`/work/onboarding/${ext.todo[0] ?? "identity"}`)} className="inline-flex h-8 items-center bg-secondary px-3 text-small text-on-navy hover:bg-secondary-hover m-press">
            {w.fix}
          </Link>
        )}
      </div>
    );
  }
  const notCleared = ext.services.filter((s) => s.state === "not_cleared").length;
  if (ext.status === "cleared" && (ext.contractState === "expiring" || ext.contractState === "expired"))
    return (
      <div role="status" className={cx("mb-5 flex flex-wrap items-center gap-3 px-4 py-3 text-small m-rise", ext.contractState === "expired" ? "bg-danger-bg" : "bg-warning-bg")}>
        <ExpiryChip date={ext.contractEnd} />
        <p className="min-w-0 flex-1">
          {ext.contractState === "expired" ? w.contract.expiredBody : fill(w.contract.until, { d: ext.contractEnd ? formatDate(ext.contractEnd, locale) : "" })}
        </p>
        <Link href={L("/work/contract?tab=renewal")} className="inline-flex h-8 items-center gap-1 bg-secondary px-3 text-small text-on-navy hover:bg-secondary-hover m-press">
          {w.contract.renew} <Icon name="arrowRight" size={14} aria-hidden />
        </Link>
      </div>
    );
  if (ext.status === "cleared" && notCleared)
    return (
      <div role="status" className="mb-5 flex flex-wrap items-center gap-3 bg-info-bg px-4 text-info py-3 text-small m-rise">
        <Icon name="shield" size={16} aria-hidden />
        <p className="min-w-0 flex-1">
          {ext.services
            .filter((s) => s.state === "not_cleared")
            .map((s) => `${w.service.not_cleared}: ${s.name}`)
            .join(" · ")}
        </p>
        <Link href={L("/work/profile/credentials")} className="font-medium underline underline-offset-4">
          {w.fix}
        </Link>
      </div>
    );
  return null;
}
