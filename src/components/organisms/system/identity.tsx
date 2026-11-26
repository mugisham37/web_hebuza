"use client";
// U10 Identity checks `/system/identity?tab=pending|in_review|done&id=&q=` (board 07 ID1/ID2 with the plan's fixes):
// staff MFA recovery + unlock only (D-6). No ID images, no provider scores — a call-back / video / manager checklist.
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { ApiError, api } from "@/lib/api/client";
import { cx, formatDateTime } from "@/shared/format";
import { errorState } from "@/lib/system/api";
import { useIdentity } from "@/lib/system/b";
import type { IdentityRequestVM } from "@/shared/system/types";
import { fill } from "@/content/pages/system-common";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Checkbox, Field, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { Avatar } from "@/components/atoms/misc";
import { EmptyPanel, FilterBar, PanelError, SavedViewTabs } from "@/components/molecules/ops/ops";
import { usePhone } from "@/components/atoms/step-up";
import { LockedContent, useS } from "@/components/atoms/system";
import { SysPageHead } from "@/components/molecules/system/system";
import { causeOf, RowsSkeleton, useC, useRun } from "@/components/molecules/system/system";

const TABS = ["pending", "in_review", "done"] as const;
type Tab = (typeof TABS)[number];
const inTab = (r: IdentityRequestVM, t: Tab) => (t === "done" ? r.status === "approved" || r.status === "declined" : r.status === t);
const TONE: Record<IdentityRequestVM["status"], string> = { pending: "bg-warning-bg text-warning", in_review: "bg-navy-50 text-navy-700", approved: "bg-success-bg text-success", declined: "bg-danger-bg text-danger" };

export function IdentityView() {
  const c = useC();
  const { locale } = useI18n();
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const q = useIdentity();
  const tab = (TABS as readonly string[]).includes(sp.get("tab") ?? "") ? (sp.get("tab") as Tab) : "pending";
  const text = sp.get("q") ?? "";
  const setQ = (patch: Record<string, string | null>) => {
    const n = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    router.replace(`${path}?${n}`, { scroll: false });
  };
  const all = q.data?.items ?? [];
  const match = (r: IdentityRequestVM) => !text || r.userName.toLowerCase().includes(text.toLowerCase());
  const rows = all.filter((r) => inTab(r, tab) && match(r)).sort((a, b) => b.at.localeCompare(a.at));
  const open = all.find((r) => r.id === sp.get("id")) ?? null;

  if (q.isError && !q.data) return (
    <div><SysPageHead title={c.identity} sub={c.idc.sub} />{errorState(q.error) === "locked" ? <LockedContent reason="role" /> : <PanelError what={c.idc.loadWhat} onRetry={() => q.refetch()} />}</div>
  );
  return (
    <div className="grid gap-5">
      <SysPageHead title={c.identity} sub={c.idc.sub} />
      <SavedViewTabs active={tab} onChange={(k) => setQ({ tab: k === "pending" ? null : k })}
        views={TABS.map((t) => ({ key: t, label: c.idc.tabs[t], count: q.data ? all.filter((r) => inTab(r, t) && match(r)).length : undefined }))} />
      <FilterBar search={text} onSearch={(v) => setQ({ q: v || null })} placeholder={c.search} chips={[]} />
      <section className="overflow-hidden border border-border bg-surface" aria-busy={q.isPending}>
        {q.isPending ? <RowsSkeleton rows={3} /> : !rows.length ? (
          <div className="p-4">{tab === "done" ? <EmptyPanel title={c.idc.empty.done} /> : <EmptyPanel title={c.idc.empty.pending} body={c.idc.empty.pendingBody} />}</div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.6fr)_auto] md:items-center md:gap-4 md:px-6">
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar name={r.userName} size="sm" className="shrink-0 bg-navy-50 text-navy-700" />
                  <span className="min-w-0 text-small"><span className="block truncate font-medium">{r.userName}</span><span className="text-fg-muted tabular">{formatDateTime(r.at, locale)}</span></span>
                </span>
                <span className="flex flex-wrap items-center gap-2 text-small">
                  <span className="inline-flex h-7 items-center gap-1.5 bg-ink-100 px-2.5 text-eyebrow"><Icon name={r.kind === "two_factor" ? "shield" : "lock"} size={12} aria-hidden />{c.idc.kinds[r.kind]}</span>
                  <span className={cx("inline-flex h-7 items-center px-2.5 text-eyebrow", TONE[r.status])}>{c.idc.status[r.status]}</span>
                </span>
                <span className="min-w-0 text-small text-fg-muted">
                  <span className="line-clamp-2">{r.reason}</span>
                  <span className="block text-eyebrow">{c.idc.cols.manager}: {r.managerName}{r.decidedBy && r.decidedAt ? ` · ${fill(c.idc.decidedBy, { who: r.decidedBy, t: formatDateTime(r.decidedAt, locale) })}` : ""}</span>
                </span>
                <Button size="sm" data-guide="system-idc-review" variant={tab === "done" ? "outline" : "primary"} onClick={() => setQ({ id: r.id })}>{tab === "done" ? c.idc.view : c.idc.review}</Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <ReviewDialog r={open} onClose={() => setQ({ id: null })} onReload={() => q.refetch()} />
    </div>
  );
}

const CHECKS = ["callback", "video", "manager", "reason"] as const;
function ReviewDialog({ r, onClose, onReload }: { r: IdentityRequestVM | null; onClose: () => void; onReload: () => void }) {
  const c = useC();
  const s = useS();
  const { locale } = useI18n();
  const phone = usePhone();
  const me = useSession().user?.id;
  const { run, online, dialog, toast } = useRun();
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");
  const [decline, setDecline] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const close = () => { setChecks({}); setNote(""); setDecline(null); setErr(null); setConflict(false); onClose(); };
  if (!r) return <>{dialog}</>;
  const decided = r.status === "approved" || r.status === "declined";
  const self = r.userId === me;
  const allChecked = CHECKS.every((k) => checks[k]);
  const act = async (op: "approve" | "decline") => {
    if (op === "approve" && !allChecked) return setErr(c.idc.errChecks);
    if (op === "decline" && (decline ?? "").trim().length < 10) return setErr(c.idc.declineReason);
    setBusy(true); setErr(null);
    try {
      await run({ req: (h) => api.POST("/api/admin/access-requests/{id}/{op}", { params: { path: { id: r.id, op } }, body: op === "approve" ? { checklist: checks, note: note.trim() || undefined } : { reason: decline!.trim() }, headers: h }) }, op === "approve" ? c.idc.stepUp : undefined);
      toast({ title: fill(op === "approve" ? c.idc.approved : c.idc.declined, { name: r.userName }), tone: "success" });
      close();
    } catch (e) {
      const ce = causeOf(e);
      if (ce instanceof ApiError && ce.status === 409) setConflict(true);
      setErr((e as Error).message);
    } finally { setBusy(false); }
  };
  return (
    <>
      <Dialog open onClose={close} side={phone ? "bottom" : "right"} title={fill(c.idc.dialogTitle, { name: r.userName })} description={`${c.idc.kinds[r.kind]} · ${formatDateTime(r.at, locale)}`}
        footer={decided ? <Button variant="outline" onClick={close}>{s.common.close}</Button> : decline !== null ? (
          <><Button variant="outline" onClick={() => { setDecline(null); setErr(null); }}>{s.common.back}</Button><Button variant="danger" loading={busy} disabled={!online || self} onClick={() => act("decline")}>{c.idc.decline}</Button></>
        ) : (
          <><Button variant="outline" disabled={self} onClick={() => setDecline("")}>{c.idc.decline}</Button><Button dots loading={busy} disabled={!online || self || conflict} onClick={() => act("approve")}>{c.idc.approve}</Button></>
        )}>
        <div className="grid gap-4">
          <dl className="grid gap-2 bg-bg-subtle p-3 text-small">
            <div><dt className="text-fg-muted">{c.idc.cols.reason}</dt><dd className="font-medium">{r.reason}</dd></div>
            <div><dt className="text-fg-muted">{c.idc.cols.manager}</dt><dd className="font-medium">{r.managerName}</dd></div>
          </dl>
          {self && <p className="flex items-center gap-2 bg-ink-100 p-3 text-small"><Icon name="lock" size={15} aria-hidden />{s.approver.self}</p>}
          {conflict && (
            <div role="alert" className="flex flex-wrap items-center gap-3 bg-warning-bg p-3 text-small">
              <span className="min-w-0 flex-1">{s.errors.already_decided}</span>
              <Button size="sm" onClick={() => { onReload(); close(); }}>{s.states.reload}</Button>
            </div>
          )}
          {decided ? (
            <p className={cx("flex items-start gap-2 p-3 text-small", r.status === "approved" ? "bg-success-bg text-success" : "bg-danger-bg text-danger")}>
              <Icon name={r.status === "approved" ? "check" : "x"} size={16} aria-hidden className="mt-0.5 shrink-0" />
              <span>{c.idc.status[r.status]}{r.decidedBy && r.decidedAt ? `, ${fill(c.idc.decidedBy, { who: r.decidedBy, t: formatDateTime(r.decidedAt, locale) })}` : ""}{r.declineReason ? ` · ${r.declineReason}` : ""}</span>
            </p>
          ) : decline !== null ? (
            <Field label={c.idc.declineReason} error={err ?? undefined}>
              {(f) => <Textarea id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} autoFocus value={decline} onChange={(e) => setDecline(e.target.value)} />}
            </Field>
          ) : (
            <>
              <fieldset className="grid gap-3">
                <legend className="mb-1 text-label">{c.idc.checklist}</legend>
                {CHECKS.map((k) => (
                  <Checkbox key={k} disabled={self} checked={!!checks[k]} onChange={(e) => setChecks((x) => ({ ...x, [k]: e.target.checked }))}
                    label={<span className="text-small">{fill(c.idc.checks[k], { name: r.managerName })}</span>} />
                ))}
                {/* PLACEHOLDER(idc-checklist) */}
                <p className="text-eyebrow text-fg-subtle">{c.idc.placeholder}</p>
              </fieldset>
              {err && <p role="alert" className="text-small font-medium text-danger m-shake">{err}</p>}
              <Field label={c.idc.note} optional={s.common.optional}>{(f) => <Textarea id={f.id} className="min-h-20" value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
              <p className="flex items-start gap-2 bg-info-bg p-3 text-small"><Icon name="shield" size={15} aria-hidden className="mt-0.5 shrink-0 text-navy-700" /><span>{c.idc.approveEffect[r.kind]} {fill(c.idc.notify, { name: r.userName })}</span></p>
            </>
          )}
        </div>
      </Dialog>
      {dialog}
    </>
  );
}
