"use client";
// U15 DSR detail (plan 06 §7 U15, §2.7): verification, legal-hold check, plan, timeline, Start / Complete (bundle hash) / Reject.
// The sysadmin never opens export contents; the subject downloads from their own portal (F-IAM-19).
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { formatDateTime } from "@/shared/format";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/atoms/button";
import { Field, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { CopyRef, Panel } from "@/components/molecules/ops/ops";
import { useOnline } from "@/components/atoms/hooks";
import { systemPrivacy } from "@/content/pages/system-privacy";
import { fill } from "@/content/pages/system-common";
import { useDsr, useDsrAction } from "@/lib/system/f";
import { blockedByHold } from "@/shared/system/privacy";
import { shortHash } from "@/shared/system/audit";
import { ConflictBanner, SysPageHead } from "@/components/molecules/system/system";
import { useS } from "@/components/atoms/system";
import { FDialog, Gate, Pill, useFail, useStepped } from "@/components/molecules/system/system";
import { DsrStatusPill, DueChip } from "@/components/organisms/system/privacy";

export function DsrDetailView({ id }: { id: string }) {
  const c = systemPrivacy(useI18n().locale);
  const { locale } = useI18n();
  const q = useDsr(id);
  return (
    <div className="m-rise">
      <Link href={localHref(locale, "/system/privacy?tab=requests")} className="mb-3 inline-flex items-center gap-1.5 text-small text-fg-muted hover:text-fg">
        <Icon name="arrowRight" size={14} aria-hidden className="rotate-180" />{c.dsr.back}
      </Link>
      <Gate q={q} what={c.request} rows={5}>{(d) => <Detail d={d} />}</Gate>
    </div>
  );
}

function Detail({ d }: { d: NonNullable<ReturnType<typeof useDsr>["data"]> }) {
  const c = systemPrivacy(useI18n().locale);
  const s = useS();
  const { locale } = useI18n();
  const online = useOnline();
  const toast = useToast();
  const fail = useFail();
  const act = useDsrAction(d.id);
  const { run, dialog } = useStepped();
  const [ask, setAsk] = useState<"complete" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [reasonErr, setReasonErr] = useState<string>();
  const [conflict, setConflict] = useState(false);
  const open = d.status === "received" || d.status === "verifying" || d.status === "in_progress";
  const held = blockedByHold(d);

  const go = async (action: "start" | "complete" | "reject") => {
    try {
      const r = action === "complete"
        ? await run(`complete ${d.id}`, (token) => act.mutateAsync({ action, version: d.version, token }))
        : await act.mutateAsync({ action, version: d.version, reason: action === "reject" ? reason.trim() : undefined });
      if (!r) return;
      setAsk(null);
      toast({ tone: "success", title: action === "complete" ? c.dsr.done : action === "reject" ? c.dsr.rejectedToast : fill(c.dsr.started, { s: c.requests.statuses[r.status] }) });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.errorType !== "legal_hold") { setConflict(true); setAsk(null); return; }
      fail(e);
    }
  };

  return (
    <>
      <SysPageHead
        title={`${c.request} · ${d.id}`}
        sub={<span className="flex flex-wrap items-center gap-2"><Pill tone={d.type === "erasure" ? "danger" : "purple"}>{c.requests.types[d.type]}</Pill><DsrStatusPill status={d.status} c={c} />{open && <DueChip due={d.dueAt} c={c} />}</span>}
        actions={open && (
          <>
            {d.status !== "in_progress" && <Button size="sm" className="m-press" disabled={!online} loading={act.isPending && !ask} onClick={() => go("start")}>{d.status === "received" ? c.dsr.actions.start : c.dsr.actions.verify}</Button>}
            {d.status === "in_progress" && <Button size="sm" className="m-press" disabled={!online || held} aria-describedby={held ? "dsr-hold" : undefined} onClick={() => setAsk("complete")}>{c.dsr.actions.complete}</Button>}
            <Button size="sm" variant="outline" className="m-press" disabled={!online} onClick={() => setAsk("reject")}>{c.dsr.actions.reject}</Button>
          </>
        )}
      />
      {conflict && <div className="mb-4"><ConflictBanner by={s.common.system} at={new Date(d.events.at(-1)?.at ?? d.receivedAt).toISOString()} onReload={() => { setConflict(false); act.reset(); }} /></div>}

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-4">
          <section className="grid gap-3 border border-border bg-surface p-4 sm:grid-cols-3 sm:p-5">
            <Meta label={c.requests.subject}><CopyRef value={d.subjectNo} /></Meta>
            <Meta label={c.requests.received}>{formatDateTime(d.receivedAt, locale)}</Meta>
            <Meta label={c.requests.due}>{formatDateTime(d.dueAt, locale)}</Meta>
            <p className="text-eyebrow text-fg-subtle sm:col-span-3">{c.requests.subjectNote}</p>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <Panel title={c.dsr.verification}>
              <p className="flex items-center gap-2 text-small">
                {d.verification ? <><Icon name="check" size={16} aria-hidden className="text-success" />{d.verification}</> : <><Icon name="clock" size={16} aria-hidden className="text-fg-subtle" /><span className="text-fg-muted">{c.dsr.notVerified}</span></>}
              </p>
            </Panel>
            <Panel title={c.dsr.holdCheck}>
              <p id="dsr-hold" className={d.legalHold ? "flex gap-2 text-small text-warning" : "flex gap-2 text-small text-success"}>
                <Icon name={d.legalHold ? "lock" : "shield"} size={16} aria-hidden className="mt-0.5 shrink-0" />{d.legalHold ? c.dsr.holdYes : c.dsr.holdNo}
              </p>
            </Panel>
          </div>

          <Panel title={c.dsr.plan}>
            {d.plan.length === 0 ? <p className="text-small text-fg-muted">{c.dsr.noPlan}</p> : (
              <ul className="grid gap-1.5">
                {d.plan.map((p) => (
                  <li key={p.category} className="flex flex-wrap items-center justify-between gap-2 bg-bg-subtle px-3 py-2 text-small">
                    <span className="font-medium">{p.category}</span>
                    <span className="flex flex-wrap items-center gap-2">
                      <Pill tone={p.action === "delete" ? "danger" : p.action === "retain" ? "info" : "warning"}>{c.dsr.planAction[p.action]}</Pill>
                      {p.until && <span className="text-eyebrow text-fg-muted">{fill(c.dsr.until, { d: p.until })}{p.reason && ` · ${p.reason}`}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {(d.bundleHash || d.rejectReason) && (
            <Panel title={c.dsr.bundle} className="m-rise">
              {d.bundleHash && <p className="flex items-center gap-2 font-mono text-small"><Icon name="fileCheck" size={16} aria-hidden className="text-success" />{fill(c.dsr.bundleHash, { h: shortHash(d.bundleHash) })}</p>}
              {d.rejectReason && <p className="text-small text-danger">{fill(c.dsr.rejected, { r: d.rejectReason })}</p>}
              <p className="mt-2 flex items-center gap-2 text-eyebrow text-fg-subtle"><Icon name="lock" size={12} aria-hidden />{c.dsr.never}</p>
            </Panel>
          )}
        </div>

        <Panel title={c.dsr.timeline} className="content-start">
          <ol className="grid">
            {d.events.map((e, i) => (
              <li key={`${e.status}-${e.at}`} className="relative grid grid-cols-[1.5rem_1fr] gap-3 pb-4 last:pb-0">
                {i < d.events.length - 1 && <span aria-hidden className="absolute top-6 bottom-0 left-3 w-px bg-border" />}
                <span className={i === d.events.length - 1 ? "relative z-10 mt-0.5 size-6 rounded-full border-4 border-navy-100 bg-navy-700" : "relative z-10 mt-0.5 size-6 rounded-full border-4 border-ink-100 bg-ink-400"} aria-hidden />
                <span className="text-small"><span className="block font-medium">{c.dsr.events[e.status]}</span><span className="text-eyebrow text-fg-subtle">{formatDateTime(e.at, locale)}</span></span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <FDialog open={ask === "complete"} onClose={() => setAsk(null)} title={c.dsr.completeTitle} description={c.dsr.completeBody}
        footer={<><Button variant="ghost" onClick={() => setAsk(null)}>{s.common.cancel}</Button><Button variant={d.type === "erasure" ? "danger" : "primary"} loading={act.isPending} onClick={() => go("complete")}>{c.dsr.confirm}</Button></>}>
        {d.type === "erasure" && <p role="note" className="flex gap-2 bg-danger-bg p-3 text-small text-danger"><Icon name="zap" size={15} aria-hidden className="mt-0.5 shrink-0" />{c.dsr.completeErase}</p>}
      </FDialog>
      <FDialog open={ask === "reject"} onClose={() => setAsk(null)} title={c.dsr.rejectTitle}
        footer={<><Button variant="ghost" onClick={() => setAsk(null)}>{s.common.cancel}</Button><Button variant="danger" loading={act.isPending} onClick={() => {
          if (reason.trim().length < 10) return setReasonErr(s.errors.reason_required);
          setReasonErr(undefined); go("reject");
        }}>{c.dsr.rejectConfirm}</Button></>}>
        <Field label={c.dsr.rejectReason} error={reasonErr}>{(i) => <Textarea id={i.id} rows={3} aria-describedby={i.describedBy} aria-invalid={i.invalid} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
      </FDialog>
      {dialog}
    </>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-1"><span className="text-eyebrow text-fg-subtle">{label}</span><span className="text-small font-medium">{children}</span></div>;
}
