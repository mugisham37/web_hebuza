"use client";
// U12b Integration detail `/system/integrations/[key]?tab=overview|credentials|webhooks|usage|logs` (board 09 v2 IG2/IG3).
// Credentials are write-only (last4 only); a production rotation is tested with the new key, then becomes a
// ChangeRequest; going live carries its own production test (409 integration_untested). Logs are redacted, no motion.
import { useState } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { systemIntegrations } from "@/content/pages/system-integrations";
import { fill, sysError } from "@/content/pages/system-common";
import { cx, formatDateTime, formatRelative } from "@/shared/format";
import { ApiError } from "@/lib/api/client";
import { errorState } from "@/lib/system/api";
import { approversFor, CHANGE_TTL_MS } from "@/shared/system/approvals";
import { useIntegration, useRotateCredential, useSwitchEnv, useTestIntegration, withStepUp, type IntegrationDetail } from "@/lib/system/d";
import type { ChangeRequestVM } from "@/shared/system/types";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { Icon } from "@/components/atoms/icon";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Input } from "@/components/atoms/field";
import { Tabs } from "@/components/atoms/tabs";
import { useToast } from "@/components/atoms/toast";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { StepUpCancelled, useNow, usePhone, useStepUp } from "@/components/atoms/step-up";
import { SkeletonRows } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { EnvPill, HealthPill, LockedContent, SecretField, useS } from "@/components/atoms/system";
import { ApproverPath, BudgetBar } from "@/components/molecules/system/system";

type C = ReturnType<typeof systemIntegrations>;
const TABS = ["overview", "credentials", "webhooks", "usage", "logs"] as const;
type Tab = (typeof TABS)[number];
const CARD = "min-w-0 border border-border bg-surface p-4 sm:p-5";

export function IntegrationDetailView({ integrationKey }: { integrationKey: string }) {
  const { locale } = useI18n();
  const c = systemIntegrations(locale);
  const params = useUrlParams();
  const raw = params.get("tab");
  const tab: Tab = (TABS as readonly string[]).includes(raw ?? "") ? (raw as Tab) : "overview";
  const q = useIntegration(integrationKey);
  const su = useStepUp();
  const [change, setChange] = useState<ChangeRequestVM | null>(null);

  const back = (
    <Link href={localHref(locale, "/system/integrations")} className="inline-flex min-h-9 items-center gap-1.5 text-small text-fg-muted hover:text-fg">
      <Icon name="arrowRight" size={13} aria-hidden className="rotate-180" />{c.back}
    </Link>
  );
  if (q.isPending) return <div className="grid gap-4" aria-busy>{back}<div className="h-24 m-shimmer" /><div className={CARD}><SkeletonRows n={4} /></div></div>;
  if (q.isError && !q.data) {
    const st = errorState(q.error);
    if (st === "locked") return <LockedContent reason="role" />;
    if (q.error instanceof ApiError && q.error.status === 404) return <div className="grid gap-4">{back}<EmptyPanel title={c.notFound} /></div>;
    return <div className="grid gap-4">{back}<PanelError what={integrationKey} onRetry={() => q.refetch()} /></div>;
  }
  const i = q.data;
  const content: Record<Tab, React.ReactNode> = {
    overview: <Overview i={i} c={c} su={su} />,
    credentials: <Credentials i={i} c={c} su={su} onChange={setChange} />,
    webhooks: <Webhooks i={i} c={c} />,
    usage: <Usage i={i} c={c} />,
    logs: <Logs i={i} c={c} />,
  };
  return (
    <div className="grid gap-5">
      {back}
      <header className="flex flex-wrap items-start justify-between gap-3 m-rise">
        <div className="min-w-0">
          <p className="text-eyebrow uppercase text-fg-subtle">{c.groups[i.group]}</p>
          <h1 className="text-h2 break-words">{i.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2"><HealthPill health={i.health} />{!i.configured && <span className="text-small text-fg-muted">{c.overview.notSetUp}</span>}</div>
        </div>
        <EnvPill env={i.env} />
      </header>
      {(change ?? i.change) && <ApproverPath cr={(change ?? i.change)!} me={(change ?? i.change)!.proposedBy.id} />}
      <Tabs value={tab} onChange={(t) => setUrlParams({ tab: t === "overview" ? null : t })}
        tabs={TABS.map((t) => ({ id: t, label: c.tabs[t], content: <div className="pt-4">{content[t]}</div> }))} />
      {su.dialog}
    </div>
  );
}

type SU = ReturnType<typeof useStepUp>;
function useFail() {
  const { locale } = useI18n();
  const toast = useToast();
  return (e: unknown, override?: string) => {
    if (e instanceof StepUpCancelled) return;
    toast({ title: override ?? sysError(locale, e instanceof ApiError ? e.errorType : null), tone: "danger" });
  };
}

// ---------------------------------------------------------------- overview
function Overview({ i, c, su }: { i: IntegrationDetail; c: C; su: SU }) {
  const { locale } = useI18n();
  const s = useS();
  const test = useTestIntegration();
  const sw = useSwitchEnv();
  const toast = useToast();
  const fail = useFail();
  const online = useOnline();
  const phone = usePhone();
  const [confirm, setConfirm] = useState<"production" | "sandbox" | null>(null);
  const errors = i.logs.filter((l) => l.status !== 200).slice(0, 5);
  const target = i.env === "production" ? "sandbox" : "production";
  const liveLocked = target === "production" && (i.health === "untested" || !i.lastTest?.ok);
  const runTest = async () => {
    try { const d = await test.mutateAsync(i.key); toast({ title: d.lastTest?.ok ? c.overview.testOk : c.overview.testFail, body: d.lastTest?.message, tone: d.lastTest?.ok ? "success" : "danger" }); }
    catch (e) { fail(e); }
  };
  const doSwitch = async () => {
    const env = confirm!;
    setConfirm(null);
    try {
      await withStepUp(su, c.overview.envStepUp, (token) => sw.mutateAsync({ i, env, token }));
      toast({ title: env === "production" ? c.overview.liveToast : c.overview.sandboxToast, tone: "success" });
    } catch (e) { fail(e, e instanceof ApiError && e.errorType === "integration_untested" ? c.overview.untestedErr : undefined); }
  };
  if (!i.configured) {
    return (
      <div className={cx(CARD, "grid justify-items-start gap-3 p-6")}>
        <span className="flex size-11 items-center justify-center rounded-full bg-ink-100 text-ink-700"><Icon name="plus" size={20} aria-hidden /></span>
        <h2 className="text-h3">{c.overview.notSetUp}</h2>
        <p className="max-w-prose text-body text-fg-muted">{c.overview.notSetUpBody}</p>
        <Button size="sm" onClick={() => setUrlParams({ tab: "credentials" })}>{c.overview.setUp}<Icon name="arrowRight" size={14} aria-hidden /></Button>
      </div>
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section className={cx(CARD, "grid content-start gap-4")}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-small">
          <dt className="text-fg-subtle">{c.overview.health}</dt><dd className="justify-self-end"><HealthPill health={i.health} /></dd>
          <dt className="text-fg-subtle">{c.overview.lastTest}</dt>
          <dd className={cx("text-right tabular", i.lastTest && !i.lastTest.ok && "text-danger")}>{i.lastTest ? `${i.lastTest.ok ? "✓" : "✗"} ${formatRelative(i.lastTest.at, locale)} · ${s.shell.env[i.lastTest.env]}` : c.never}</dd>
          <dt className="text-fg-subtle">{c.overview.errorRate}</dt><dd className={cx("text-right tabular", i.errorRate1h >= 0.05 && "font-medium text-warning")}>{(i.errorRate1h * 100).toFixed(1)}%</dd>
        </dl>
        {i.health === "untested" && <p className="bg-bg-subtle px-3 py-2 text-small text-fg-muted">{c.overview.untestedWhy}</p>}
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Button onClick={runTest} loading={test.isPending} disabled={!online}><Icon name="zap" size={15} aria-hidden />{test.isPending ? c.overview.testing : c.overview.tests[i.group]}</Button>
          {i.lastTest && !test.isPending && (
            <p role="status" className={cx("inline-flex items-center gap-1.5 px-3 py-1.5 text-small", i.lastTest.ok ? "bg-success-bg text-success" : "bg-danger-bg text-danger m-shake")}>
              <Icon name={i.lastTest.ok ? "check" : "x"} size={14} aria-hidden />{i.lastTest.ok ? c.overview.testOk : c.overview.testFail} · {formatDateTime(i.lastTest.at, locale)}
            </p>
          )}
        </div>
      </section>
      <section className={cx(CARD, "grid content-start gap-3")}>
        <h2 className="text-label">{c.overview.envTitle}</h2>
        <p className="text-small text-fg-muted">{c.overview.envBody}</p>
        <div className="flex flex-wrap items-center gap-3">
          <EnvPill env={i.env} />
          <Button size="sm" variant={target === "production" ? "primary" : "outline"} disabled={liveLocked || !online || sw.isPending} loading={sw.isPending}
            aria-describedby={liveLocked ? "live-lock" : undefined} onClick={() => setConfirm(target)}>
            {target === "production" ? c.overview.goLive : c.overview.toSandbox}
          </Button>
        </div>
        {liveLocked && <p id="live-lock" className="flex items-start gap-1.5 text-small text-fg-muted"><Icon name="lock" size={13} aria-hidden className="mt-0.5 shrink-0" />{c.overview.envDisabled}</p>}
      </section>
      <section className={cx(CARD, "lg:col-span-2")}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-label">{c.overview.recentErrors}</h2>
          <button type="button" onClick={() => setUrlParams({ tab: "logs" })} className="inline-flex min-h-9 items-center gap-1 text-small font-medium text-link underline-offset-4 hover:underline">{c.overview.viewLogs}<Icon name="arrowRight" size={13} aria-hidden /></button>
        </div>
        {errors.length ? (
          <ul>{errors.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border py-2.5 text-small last:border-0">
              <span className="w-36 text-fg-muted tabular">{formatDateTime(l.at, locale)}</span>
              <span className="font-mono text-[0.8rem]">{l.op}</span>
              <span className="font-medium text-danger">{l.status === 0 ? c.logs.timeout : l.status}</span>
              <span className="ml-auto font-mono text-[0.78rem] text-fg-subtle">{l.requestId}</span>
            </li>
          ))}</ul>
        ) : <p className="flex items-center gap-2 text-small text-fg-muted"><Icon name="check" size={14} aria-hidden className="text-success" />{c.overview.noErrors}</p>}
      </section>
      <Dialog open={!!confirm} onClose={() => setConfirm(null)} side={phone ? "bottom" : undefined}
        title={fill(confirm === "production" ? c.overview.confirmLive : c.overview.confirmSandbox, { name: i.name })}
        description={confirm === "production" ? c.overview.confirmLiveBody : c.overview.confirmSandboxBody}
        footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>{s.common.cancel}</Button><Button variant={confirm === "production" ? "danger" : "primary"} onClick={doSwitch}>{s.common.confirm}</Button></>} />
    </div>
  );
}

// ---------------------------------------------------------------- credentials (IG3)
function Credentials({ i, c, su, onChange }: { i: IntegrationDetail; c: C; su: SU; onChange: (cr: ChangeRequestVM | null) => void }) {
  const rotate = useRotateCredential();
  const test = useTestIntegration();
  const toast = useToast();
  const fail = useFail();
  const online = useOnline();
  const me = useSession().user;
  const now = useNow(60_000);
  const s = useS();
  const prod = i.env === "production" && i.configured;
  const [reason, setReason] = useState("");
  const [newName, setNewName] = useState("");
  const [newVal, setNewVal] = useState("");
  const save = async (name: string, value: string) => {
    try {
      const d = await withStepUp(su, c.creds.stepUp, (token) => rotate.mutateAsync({ key: i.key, name, value, token }));
      onChange(d.change ?? null);
      setReason("");
      toast({ title: d.change ? c.creds.pendingToast : c.creds.rotatedToast, tone: d.change ? "info" : "success" });
    } catch (e) {
      const f = e instanceof ApiError ? e.fields?.value : undefined;
      fail(e, f === "test_failed" ? c.creds.testFailed : f === "too_short" ? c.creds.tooShort : undefined);
      throw e; // keeps SecretField in edit mode
    }
  };
  const preview = prod && now && me ? {
    proposedBy: { id: me.id, name: me.name }, approvers: approversFor("credential_rotation"), decisions: [], state: "proposed" as const,
    expiresAt: new Date(now + CHANGE_TTL_MS).toISOString(), title: i.name,
  } : null;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section className={cx(CARD, "grid content-start gap-5")}>
        <div><h2 className="text-label">{c.creds.title}</h2><p className="mt-0.5 text-small text-fg-muted">{c.creds.sub}</p></div>
        {prod && <Field label={c.creds.reason} optional={s.common.optional}>{(f) => <Input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />}</Field>}
        {i.credentials.length ? i.credentials.map((cr) => (
          <SecretField key={cr.name} name={cr.name} last4={cr.last4} rotatedAt={cr.rotatedAt} disabled={!online || rotate.isPending}
            lastTest={i.lastTest ? { ok: i.lastTest.ok, message: i.lastTest.message, at: i.lastTest.at } : null}
            onSave={(v) => save(cr.name, v)}
            onTest={async () => { const d = await test.mutateAsync(i.key); return { ok: !!d.lastTest?.ok, message: d.lastTest?.message ?? "" }; }} />
        )) : <p className="text-small text-fg-muted">{c.creds.none}</p>}
        {!i.configured && (
          <form className="grid gap-3 border border-border p-4" onSubmit={(e) => { e.preventDefault(); save(newName || c.creds.newKey, newVal).then(() => { setNewVal(""); setNewName(""); }, () => {}); }}>
            <p className="text-label">{c.creds.add}</p>
            <Field label={c.creds.addName} optional={s.common.optional}>{(f) => <Input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={c.creds.newKey} />}</Field>
            <Field label={s.secret.label} hint={s.secret.paste}>{(f) => <Input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} type="password" autoComplete="off" spellCheck={false} value={newVal} onChange={(e) => setNewVal(e.target.value)} className="font-mono" />}</Field>
            <div><Button type="submit" size="sm" loading={rotate.isPending} disabled={!newVal.trim() || !online}>{s.secret.save}</Button></div>
          </form>
        )}
      </section>
      <aside className="grid content-start gap-3">
        <p className="flex items-start gap-2 bg-info-bg p-4 text-small"><Icon name="shield" size={16} aria-hidden className="mt-0.5 shrink-0 text-navy-700" />{prod ? c.creds.prodNote : c.creds.sandboxNote}</p>
        {preview && <ApproverPath cr={preview} me={preview.proposedBy.id} />}
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- webhooks
function Webhooks({ i, c }: { i: IntegrationDetail; c: C }) {
  const { locale } = useI18n();
  const w = i.webhook;
  if (!w) return <EmptyPanel compact title={c.webhooks.none} />;
  const tone = w.signature === "valid" ? "bg-success-bg text-success" : w.signature === "invalid" ? "bg-danger-bg text-danger" : "bg-ink-100 text-ink-700";
  return (
    <section className={CARD}>
      <h2 className="mb-3 text-label">{c.webhooks.title}</h2>
      <dl className="grid gap-3 text-small sm:grid-cols-[12rem_minmax(0,1fr)]">
        <dt className="text-fg-subtle">{c.webhooks.url}</dt><dd className="font-mono text-[0.82rem] break-all">{w.url}</dd>
        <dt className="text-fg-subtle">{c.webhooks.signature}</dt>
        <dd><span className={cx("inline-flex h-7 items-center gap-1.5 px-2.5 text-small", tone)}><Icon name={w.signature === "valid" ? "check" : w.signature === "invalid" ? "x" : "minus"} size={13} aria-hidden />{c.webhooks.sig[w.signature]}</span></dd>
        <dt className="text-fg-subtle">{c.webhooks.lastReceived}</dt><dd className="tabular">{w.lastReceivedAt ? formatDateTime(w.lastReceivedAt, locale) : c.never}</dd>
      </dl>
    </section>
  );
}

// ---------------------------------------------------------------- usage (30-day area chart)
function Usage({ i, c }: { i: IntegrationDetail; c: C }) {
  const { locale } = useI18n();
  const u = i.usage;
  if (!u) return <EmptyPanel compact title={c.usage.none} />;
  const d = i.daily;
  const max = Math.max(1, ...d), min = d.length ? Math.min(...d) : 0;
  const W = 600, H = 160;
  const pts = d.map((v, n) => [(n / Math.max(1, d.length - 1)) * W, H - (v / max) * (H - 12) - 4] as const);
  const line = pts.map(([x, y], n) => `${n ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const nf = (n: number) => n.toLocaleString(locale === "fr" ? "fr-RW" : "en-RW");
  const pct = Math.round((u.used / Math.max(1, u.limit)) * 100);
  return (
    <section className={cx(CARD, "grid gap-4")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-label">{c.usage.title}</h2>
        <p className="text-small text-fg-muted tabular">{fill(c.usage.of, { used: nf(u.used), limit: nf(u.limit), unit: c.usage.unit[u.unit] })} · {pct}%</p>
      </div>
      {d.length > 1 && (
        <figure className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={fill(c.usage.chart, { min: nf(min), max: nf(max) })} className="h-40 w-full min-w-[18rem]" preserveAspectRatio="none">
            <defs><linearGradient id={`ug-${i.key}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--color-navy-700)" stopOpacity=".25" /><stop offset="1" stopColor="var(--color-navy-700)" stopOpacity="0" /></linearGradient></defs>
            <path d={`${line} L${W},${H} L0,${H} Z`} fill={`url(#ug-${i.key})`} />
            <path d={line} fill="none" stroke="var(--color-navy-700)" strokeWidth="2" vectorEffect="non-scaling-stroke" className="m-tick" />
            {pts.map(([x, y], n) => <circle key={n} cx={x} cy={y} r="3" fill="var(--color-navy-700)" vectorEffect="non-scaling-stroke"><title>{fill(c.usage.day, { d: n + 1, n: nf(d[n]) })}</title></circle>)}
          </svg>
        </figure>
      )}
      {u.unit === "rwf"
        ? <BudgetBar label={c.usage.cap} spent={u.used} budget={u.limit} />
        : (
          <div role="meter" aria-label={c.usage.cap} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(pct, 100)} className="h-2 overflow-hidden bg-ink-100">
            <div className={cx("h-full origin-left m-grow", pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-navy-700")} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        )}
    </section>
  );
}

// ---------------------------------------------------------------- logs (redacted, no motion)
function Logs({ i, c }: { i: IntegrationDetail; c: C }) {
  const { locale } = useI18n();
  const [failed, setFailed] = useState(false);
  const rows = failed ? i.logs.filter((l) => l.status !== 200) : i.logs;
  return (
    <section className={cx(CARD, "grid gap-3")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-label">{c.logs.title}</h2><p className="text-small text-fg-muted">{c.logs.sub}</p></div>
        <div role="group" aria-label={c.logs.title} className="inline-flex bg-ink-100 p-1">
          {[false, true].map((f) => (
            <button key={String(f)} type="button" aria-pressed={failed === f} onClick={() => setFailed(f)}
              className={cx("h-8 px-3 text-small", failed === f ? "bg-surface shadow-sm" : "text-fg-muted")}>{f ? c.logs.failed : c.logs.all}</button>
          ))}
        </div>
      </div>
      {!rows.length ? <EmptyPanel compact title={c.logs.empty} /> : (
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[34rem] text-small">
            <thead><tr className="border-b border-border text-left text-eyebrow text-fg-subtle uppercase">
              <th scope="col" className="px-3 py-2 font-medium">{c.logs.time}</th><th scope="col" className="px-3 py-2 font-medium">{c.logs.op}</th>
              <th scope="col" className="px-3 py-2 font-medium">{c.logs.status}</th><th scope="col" className="px-3 py-2 text-right font-medium">{c.logs.ms}</th>
              <th scope="col" className="px-3 py-2 font-medium">{c.logs.req}</th>
            </tr></thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap text-fg-muted tabular">{formatDateTime(l.at, locale)}</td>
                  <td className="px-3 py-2 font-mono text-[0.8rem]">{l.op}</td>
                  <td className="px-3 py-2"><span className={cx("inline-flex h-6 items-center px-2 text-eyebrow tabular", l.status === 200 ? "bg-success-bg text-success" : "bg-danger-bg text-danger")}>{l.status === 0 ? c.logs.timeout : l.status}</span></td>
                  <td className="px-3 py-2 text-right tabular">{l.ms} ms</td>
                  <td className="px-3 py-2 font-mono text-[0.78rem] text-fg-subtle">{l.requestId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
