"use client";
// U8 Separation of duties `/system/sod` (plan 06 §7 U8, board 06 v2 AG3 with §3 fixes: no invented "Create rule" — pairs
// come from governance.ts; maker ≠ checker rows read-only from spec/02 §4.3). Waiver → ChangeRequest `sod_waiver` (executive).
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { systemGovernance } from "@/content/pages/system-governance";
import { fill } from "@/content/pages/system-common";
import { cx, formatDate, formatDateTime } from "@/shared/format";
import { approversFor } from "@/shared/system/approvals";
import { WAIVER_MAX_DAYS } from "@/shared/system/governance";
import { useRequestWaiver, useSod, type WaiverInput } from "@/lib/system/c";
import type { ChangeRequestVM } from "@/shared/system/types";
import { Icon } from "@/components/atoms/icon";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { DateInput, ErrorSummary, Field, Select, Textarea } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { EmptyPanel, Panel } from "@/components/molecules/ops/ops";
import { useNow, usePhone } from "@/components/atoms/step-up";
import { RoleChip, useRoleLabel, useS } from "@/components/atoms/system";
import { ApproverPath, PendingChangeBanner, SysPageHead } from "@/components/molecules/system/system";
import { QueryFail, Skeleton, TABLE, TD, TH, fieldsOf, useCanMutate, useErrText, useGuarded } from "@/components/molecules/system/system";

const useC = () => systemGovernance(useI18n().locale);
const DAY = 86_400_000;

export function SodView() {
  const c = useC();
  const { locale } = useI18n();
  const label = useRoleLabel();
  const online = useCanMutate();
  const now = useNow(60_000);
  const q = useSod();
  const [open, setOpen] = useState(false);

  const head = <SysPageHead title={c.sod} sub={c.sodSub} actions={<Button size="sm" data-guide="system-sod-waiver" disabled={!online || !q.data} onClick={() => setOpen(true)}><Icon name="plus" size={15} aria-hidden />{c.requestWaiver}</Button>} />;
  if (q.isError && !q.data) return <div className="m-rise">{head}<QueryFail error={q.error} what={c.sod} onRetry={() => q.refetch()} /></div>;
  if (!q.data) return <div className="m-rise" aria-busy>{head}<Skeleton rows={6} /></div>;
  const d = q.data;

  return (
    <div className="grid gap-5 m-rise">
      {head}
      {d.pending.length > 0 && <PendingChangeBanner changes={d.pending} href="/system/approvals" />}

      <Panel title={c.rules} padded={false}>
        <div className="overflow-x-auto">
          <table className={TABLE}>
            <thead><tr><th className={TH}>{c.rule}</th><th className={TH}>{c.scope}</th><th className={TH}>{c.status}</th><th className={TH}>{c.exception}</th></tr></thead>
            <tbody>
              {d.pairs.map((p) => {
                const w = d.waivers.filter((x) => (x.pair[0] === p.a && x.pair[1] === p.b) || (x.pair[0] === p.b && x.pair[1] === p.a));
                return (
                  <tr key={`${p.a}+${p.b}`}>
                    <td className={TD}>
                      <span className="flex flex-wrap items-center gap-1.5"><RoleChip role={p.a} /><span aria-hidden>+</span><RoleChip role={p.b} /></span>
                      <span className="mt-1 block text-small text-fg-muted">{p.why}</span>
                    </td>
                    <td className={cx(TD, "text-fg-muted")}>{c.allBranches}</td>
                    <td className={TD}><PairStatus status={p.status} /></td>
                    <td className={cx(TD, "text-fg-muted")}>{w.length ? w.map((x) => x.userName).join(", ") : ""}</td>
                  </tr>
                );
              })}
              <tr>
                <td className={TD}><span className="font-medium">{c.makerChecker}</span><span className="mt-1 block text-small text-fg-muted">{c.processSub}</span></td>
                <td className={cx(TD, "text-fg-muted")}>{c.allBranches}</td>
                <td className={TD}><PairStatus status="enforced" /></td>
                <td className={cx(TD, "text-fg-muted")}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title={<span className="flex items-center gap-2"><Icon name="lock" size={16} aria-hidden className="text-fg-subtle" />{c.process}</span>} padded={false}>
        <ul className="grid divide-y divide-border">
          {d.process.map((r) => (
            <li key={r.rule} className="grid gap-1 px-4 py-3 text-small sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] sm:items-center sm:gap-3 sm:px-5">
              <span><span className="text-eyebrow text-fg-subtle uppercase sm:sr-only">{c.maker} </span>{r.maker}</span>
              <Icon name="arrowRight" size={15} aria-hidden className="hidden text-fg-subtle sm:block" />
              <span><span className="text-eyebrow text-fg-subtle uppercase sm:sr-only">{c.checker} </span>{r.checker}</span>
              <code className="w-fit bg-ink-100 px-1.5 py-0.5 font-mono text-[0.75rem]">{r.rule}</code>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title={c.waivers} padded={false}>
        {!d.waivers.length ? <div className="p-4"><EmptyPanel compact title={c.noWaivers} body={c.noWaiversBody} /></div> : (
          <div className="overflow-x-auto">
            <table className={TABLE}>
              <thead><tr><th className={TH}>{c.wCol.who}</th><th className={TH}>{c.wCol.pair}</th><th className={TH}>{c.wCol.why}</th><th className={TH}>{c.wCol.expiry}</th><th className={TH}>{c.wCol.approvedBy}</th></tr></thead>
              <tbody>
                {d.waivers.map((w) => {
                  const left = now ? Math.ceil((Date.parse(w.expiresAt) - now) / DAY) : null;
                  return (
                    <tr key={w.id}>
                      <td className={cx(TD, "font-medium")}>{w.userName}</td>
                      <td className={cx(TD, "whitespace-nowrap")}>{label(w.pair[0])} + {label(w.pair[1])}</td>
                      <td className={cx(TD, "max-w-72 text-fg-muted")}>{w.why}</td>
                      <td className={cx(TD, "tabular whitespace-nowrap")}>
                        {formatDate(w.expiresAt, locale)}
                        {left !== null && <span className={cx("block text-small", left <= 0 ? "text-danger" : left <= 30 ? "text-warning" : "text-fg-muted")}>{left <= 0 ? c.expiredW : fill(c.expiresIn, { n: left })}</span>}
                      </td>
                      <td className={TD}>{w.approvedBy.name}<span className="block text-small text-fg-muted">{formatDate(w.approvedAt, locale)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title={c.exceptions} action={<span className="text-small text-fg-subtle">{c.exceptionsSub}</span>}>
        {!d.exceptions.length ? <EmptyPanel compact title={c.noExceptions} /> : (
          <ul className="grid divide-y divide-border">
            {d.exceptions.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-small">
                <span><span className="font-medium">{e.actorLabel}</span> · <code className="font-mono text-[0.75rem]">{e.action}</code>{e.details.reason && <span className="block text-fg-muted">{e.details.reason}</span>}</span>
                <span className="tabular text-fg-subtle">{formatDateTime(e.at, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <WaiverDialog open={open} onClose={() => setOpen(false)} people={d.people} pairs={d.pairs.filter((p) => p.status === "blocked").map((p) => [p.a, p.b] as [string, string])} />
    </div>
  );
}

function PairStatus({ status }: { status: "blocked" | "enforced" }) {
  const c = useC();
  return (
    <span className={cx("inline-flex h-7 items-center gap-1.5 px-2.5 text-eyebrow font-medium", status === "blocked" ? "bg-danger-bg text-danger" : "bg-navy-50 text-navy-700")}>
      <Icon name={status === "blocked" ? "x" : "shield"} size={12} aria-hidden />{c.pairStatus[status]}
    </span>
  );
}

function WaiverDialog({ open, onClose, people, pairs }: { open: boolean; onClose: () => void; people: { id: string; name: string; roles: string[] }[]; pairs: [string, string][] }) {
  const c = useC();
  const s = useS();
  const label = useRoleLabel();
  const toast = useToast();
  const errText = useErrText();
  const phone = usePhone();
  const me = useSession().user;
  const now = useNow(60_000);
  const online = useCanMutate();
  const { run, dialog } = useGuarded();
  const req = useRequestWaiver();
  const [userId, setUserId] = useState("");
  const [pair, setPair] = useState("0");
  const [why, setWhy] = useState("");
  const [exp, setExp] = useState("");
  const [tried, setTried] = useState(false);
  const [srv, setSrv] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<ChangeRequestVM | null>(null);

  const today = now ? new Date(now).toISOString().slice(0, 10) : "";
  const max = now ? new Date(now + WAIVER_MAX_DAYS * DAY).toISOString().slice(0, 10) : "";
  const local: Record<string, string> = {};
  if (!userId) local.userId = c.validation.userId;
  if (!pairs[Number(pair)]) local.pair = c.validation.pair;
  if (why.trim().length < 10) local.why = c.validation.why;
  if (!exp || exp <= today) local.expiresAt = c.validation.expiresAt;
  else if (exp > max) local.expiresAt = fill(c.validation.too_long, { n: WAIVER_MAX_DAYS });
  const errs: Record<string, string> = { ...Object.fromEntries(Object.entries(srv).map(([k, v]) => [k, v === "too_long" ? fill(c.validation.too_long, { n: WAIVER_MAX_DAYS }) : (c.validation as Record<string, string>)[k] ?? s.errors.validation])), ...(tried ? local : {}) };

  const close = () => { setUserId(""); setPair("0"); setWhy(""); setExp(""); setTried(false); setSrv({}); setSent(null); onClose(); };
  async function submit() {
    setTried(true);
    if (Object.keys(local).length || !online) return;
    const input: WaiverInput = { userId, pair: pairs[Number(pair)], why: why.trim(), expiresAt: new Date(`${exp}T23:59:00+02:00`).toISOString() };
    try {
      const cr = await run(c.stepUpWaiver, (token) => req.mutateAsync({ input, token }));
      if (cr) { setSent(cr); toast({ tone: "success", title: c.waiverSent, body: fill(c.waiverSentBody, { id: cr.id }) }); }
    } catch (e) { setSrv(fieldsOf(e)); toast({ tone: "danger", title: errText(e) }); }
  }
  const preview = me && now ? { proposedBy: { id: me.id, name: me.name }, approvers: approversFor("sod_waiver"), decisions: [], expiresAt: new Date(now + 48 * 3_600_000).toISOString(), state: "proposed" as const, title: c.waiverTitle } : null;
  const errList = Object.entries(errs).map(([field, message]) => ({ field, message }));

  return (
    <>
      {dialog}
      <Dialog open={open} onClose={close} title={c.waiverTitle} side={phone ? "bottom" : undefined}
        footer={sent ? <Button onClick={close}>{s.common.close}</Button> : <><Button variant="ghost" onClick={close}>{s.common.cancel}</Button><Button loading={req.isPending} disabled={!online} onClick={submit}>{c.requestWaiver}</Button></>}>
        {sent ? (
          <div className="grid gap-4" role="status">
            <p className="flex items-start gap-2 text-body"><Icon name="check" size={20} aria-hidden className="mt-0.5 text-success m-tick" />{fill(c.waiverSentBody, { id: sent.id })}</p>
            <ApproverPath cr={sent} me={me?.id} />
          </div>
        ) : (
          <form className="grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
            {tried && errList.length > 0 && <ErrorSummary title={s.errors.validation} errors={errList} />}
            <Field id="userId" label={c.person} error={errs.userId}>
              {(f) => (
                <Select id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} value={userId} onChange={(e) => setUserId(e.target.value)}>
                  <option value="">{c.pickPerson}</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.name}, {p.roles.map(label).join(", ")}</option>)}
                </Select>
              )}
            </Field>
            <Field id="pair" label={c.pair} error={errs.pair}>
              {(f) => (
                <Select id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} value={pair} onChange={(e) => setPair(e.target.value)}>
                  {pairs.map((p, i) => <option key={i} value={String(i)}>{label(p[0])} + {label(p[1])}</option>)}
                </Select>
              )}
            </Field>
            <Field id="why" label={c.why} hint={c.whyHint} error={errs.why}>
              {(f) => <Textarea id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} rows={3} value={why} onChange={(e) => setWhy(e.target.value)} />}
            </Field>
            <Field id="expiresAt" label={c.expiry} hint={fill(c.expiryHint, { n: WAIVER_MAX_DAYS })} error={errs.expiresAt}>
              {(f) => <DateInput id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} min={today} max={max} value={exp} onChange={(e) => setExp(e.target.value)} />}
            </Field>
            {preview && <ApproverPath cr={preview} />}
          </form>
        )}
      </Dialog>
    </>
  );
}
