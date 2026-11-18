"use client";
// U13 Chain integrity `/system/audit/integrity` (board 11 AU4): last nightly result, Verify now with progress,
// report download (CSV + SHA-256), broken state with first broken entry + auto-notified executive. Dev: tamper/restore.
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { systemAudit } from "@/content/pages/system-audit";
import { fill } from "@/content/pages/system-common";
import { cx, formatDate, formatDateTime, formatRelative } from "@/shared/format";
import { errorState } from "@/lib/system/api";
import { shortHash } from "@/shared/system/audit";
import { download, fetchIntegrityReport, useIntegrity, useVerifyChain } from "@/lib/system/e";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { Skeleton } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { PanelError } from "@/components/molecules/ops/ops";
import { useNow } from "@/components/atoms/step-up";
import { LockedContent, SysArt, useS } from "@/components/atoms/system";
import { SysPageHead } from "@/components/molecules/system/system";
import { AuditNav, useErrText } from "@/components/molecules/system/audit";
import { useOnline } from "@/components/atoms/hooks";

export function IntegrityView() {
  const { locale } = useI18n();
  const c = systemAudit(locale);
  const s = useS();
  const q = useIntegrity();
  const verify = useVerifyChain();
  const toast = useToast();
  const errText = useErrText();
  const online = useOnline();
  const now = useNow(30_000);
  if (q.isError && !q.data && errorState(q.error) === "locked") return <LockedContent reason="role" />;
  const d = q.data;
  const rep = d?.report;
  const broken = rep && !rep.ok;

  const report = async () => {
    try { const r = await fetchIntegrityReport(); download(`audit-verification-${r.sha256.slice(0, 8)}.csv`, r.content); }
    catch (e) { toast({ title: errText(e), tone: "danger" }); }
  };
  const run = () => verify.mutate(undefined, { onError: (e) => toast({ title: errText(e), tone: "danger" }) });

  return (
    <div className="m-rise">
      <SysPageHead title={c.integrity} sub={c.int.sub} actions={
        <Button size="sm" onClick={run} loading={verify.isPending} disabled={!online || !d}><Icon name="refresh" size={15} aria-hidden />{c.int.verifyNow}</Button>
      } />
      <AuditNav />
      {q.isPending ? <Skeleton className="h-64 " /> : q.isError && !d ? <PanelError what={c.int.what} onRetry={() => q.refetch()} /> : d && (
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <section aria-labelledby="int-h" className={cx("grid gap-5 border bg-surface p-5 sm:p-6", broken ? "border-danger/40" : "border-border")}>
            <div className="flex flex-wrap items-center gap-4">
              <span className={cx("flex size-16 shrink-0 items-center justify-center rounded-full", broken ? "bg-danger-bg text-danger" : rep ? "bg-info-bg text-navy-700" : "bg-ink-100 text-ink-700")}>
                <SysArt name={broken ? "broken" : "shield"} className="size-10" />
              </span>
              <div className="min-w-0">
                <h2 id="int-h" className={cx("text-h3", broken && "text-danger")}>{verify.isPending ? fill(c.int.verifying, { n: d.entries.toLocaleString() }) : !rep ? c.int.never : broken ? c.int.brokenTitle : c.int.okTitle}</h2>
                {rep && !verify.isPending && <p className="text-small text-fg-muted">{fill(c.int.last, { t: now ? formatRelative(rep.at, locale, now) : formatDateTime(rep.at, locale) })}</p>}
              </div>
            </div>
            <div role="progressbar" aria-label={c.int.progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={verify.isPending ? undefined : rep ? 100 : 0}
              className="h-2.5 overflow-hidden bg-ink-100">
              <div className={cx("h-full transition-[width] duration-(--dur-4) ease-(--ease-out-expo)", verify.isPending ? "w-2/3 bg-navy-700 m-shimmer" : broken ? "w-full bg-danger" : rep ? "w-full bg-navy-700" : "w-0")} />
            </div>
            {rep && !verify.isPending && (broken ? (
              <div role="alert" className="grid gap-3 bg-danger-bg p-4 text-small">
                <p className="font-medium text-danger">{fill(c.int.brokenBody, { id: rep.brokenAt ?? "?" })}</p>
                {d.notifiedAt && <p className="flex items-center gap-2 text-fg-muted"><Icon name="mail" size={14} aria-hidden />{fill(c.int.notified, { t: formatDateTime(d.notifiedAt, locale) })}</p>}
                {rep.brokenAt && <Link href={localHref(locale, `/system/audit?entry=${rep.brokenAt}`)} className="inline-flex min-h-9 items-center gap-1.5 justify-self-start font-medium underline underline-offset-4">{c.int.openEntry}<Icon name="arrowRight" size={14} aria-hidden /></Link>}
              </div>
            ) : (
              <p role="status" className="flex items-center gap-2 text-small font-medium m-tone"><span className="flex size-5 items-center justify-center rounded-full bg-success text-white"><Icon name="check" size={12} aria-hidden /></span>{fill(c.int.okBody, { n: rep.checked.toLocaleString() })}</p>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <Button variant="ghost" size="sm" onClick={report} disabled={!rep}><Icon name="file" size={15} aria-hidden />{c.int.report}</Button>
              <p className="flex items-center gap-1.5 text-eyebrow text-fg-subtle"><Icon name="clock" size={12} aria-hidden />{c.int.nightly}</p>
            </div>
          </section>
          <aside className="grid content-start gap-4">
            <dl className="grid gap-3 border border-border bg-surface p-5 text-small">
              <div><dt className="text-eyebrow text-fg-subtle">{c.int.checked}</dt><dd className="text-h3 tabular">{(rep?.checked ?? 0).toLocaleString()} <span className="text-small text-fg-muted">/ {d.entries.toLocaleString()}</span></dd></div>
              <div><dt className="text-eyebrow text-fg-subtle">{c.int.lastHash}</dt><dd className="font-mono" title={d.lastHash}>{shortHash(d.lastHash)}</dd></div>
              {d.from && <div><dt className="text-eyebrow text-fg-subtle">{c.int.range}</dt><dd className="tabular">{formatDate(d.from, locale)} – {formatDate(d.to, locale)}</dd></div>}
              {broken && rep?.brokenAt && <div><dt className="text-eyebrow text-fg-subtle">{c.int.firstBroken}</dt><dd className="font-mono text-danger">{rep.brokenAt}</dd></div>}
            </dl>
            {!online && <p className="text-small text-warning">{s.states.offlineAction}</p>}
          </aside>
        </div>
      )}
    </div>
  );
}
