"use client";
// U13 Sensitive access `/system/audit/sensitive` (board 11 AU3): document downloads, data exports, revealed private
// fields; unusual-volume alert (> PLACEHOLDER(sensitive-volume) downloads / 10 min). Rows open the shared audit drawer.
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { systemAudit } from "@/content/pages/system-audit";
import { fill } from "@/content/pages/system-common";
import { formatDateTime } from "@/shared/format";
import { errorState } from "@/lib/system/api";
import { useSensitive } from "@/lib/system/e";
import { Icon } from "@/components/atoms/icon";
import { Skeleton } from "@/components/atoms/feedback";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { CategoryChip, LockedContent } from "@/components/atoms/system";
import { SysPageHead } from "@/components/molecules/system/system";
import { AuditNav, TH } from "@/components/molecules/system/audit";

export function SensitiveView() {
  const { locale } = useI18n();
  const c = systemAudit(locale);
  const q = useSensitive();
  if (q.isError && !q.data && errorState(q.error) === "locked") return <LockedContent reason="role" />;
  const d = q.data;
  const open = (id: string) => localHref(locale, `/system/audit?entry=${id}`);
  return (
    <div className="m-rise">
      <SysPageHead title={c.sensitive} sub={c.sens.sub} />
      <AuditNav />
      {d?.unusual && (
        <p role="alert" className="mb-4 flex items-start gap-3 border border-warning/30 bg-warning-bg p-4 text-small font-medium m-rise">
          <Icon name="zap" size={18} aria-hidden className="mt-0.5 shrink-0 text-warning" />
          {fill(c.sens.unusual, { who: d.unusual.who, n: d.unusual.n, max: d.threshold })}
        </p>
      )}
      {q.isPending ? <div className="grid gap-2 border border-border bg-surface p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-9" />)}</div>
        : q.isError && !d ? <PanelError what={c.sens.what} onRetry={() => q.refetch()} />
        : !d?.items.length ? <EmptyPanel title={c.sens.emptyTitle} body={c.sens.emptyBody} />
        : (
          <>
            <div className="hidden overflow-x-auto border border-border bg-surface md:block">
              <table className="w-full min-w-[48rem]">
                <thead className="border-b border-border bg-bg-subtle"><tr>
                  {[c.col.time, c.sens.user, c.col.action, c.col.resource, c.col.ip, c.sens.flag].map((h) => <th key={h} scope="col" className={TH}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {d.items.map((r) => {
                    const flag = d.unusual?.who === r.actorLabel && r.action === "document_access.document.downloaded";
                    return (
                      <tr key={r.id} className="border-b border-border last:border-0 hover:bg-navy-50/60">
                        <td className="px-3 py-2.5 text-small whitespace-nowrap text-fg-muted tabular">{formatDateTime(r.at, locale)}</td>
                        <td className="px-3 py-2.5 text-small font-medium">{r.actorLabel}</td>
                        <td className="px-3 py-2.5"><Link href={open(r.id)} className="font-mono text-[0.8rem] underline-offset-4 hover:underline">{r.action}</Link></td>
                        <td className="px-3 py-2.5 font-mono text-[0.8rem] text-fg-muted">{r.resourceType}:{r.resourceId}</td>
                        <td className="px-3 py-2.5 text-small text-fg-subtle tabular">{r.ip}</td>
                        <td className="px-3 py-2.5 text-small">{flag ? <span className="inline-flex items-center gap-1 font-medium text-warning"><Icon name="zap" size={13} aria-hidden />{c.sens.unusualFlag}</span> : <span aria-hidden className="text-fg-subtle">{c.sens.none}</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="grid gap-2 md:hidden">
              {d.items.map((r) => (
                <li key={r.id}>
                  <Link href={open(r.id)} className="grid gap-1.5 border border-border bg-surface p-4 m-press">
                    <span className="flex items-center justify-between gap-2 text-eyebrow text-fg-subtle tabular">{formatDateTime(r.at, locale)}<CategoryChip category={r.category} /></span>
                    <span className="text-small font-medium">{r.actorLabel}</span>
                    <span className="font-mono text-[0.78rem] break-all text-fg-muted">{r.action} · {r.resourceType}:{r.resourceId}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
    </div>
  );
}
