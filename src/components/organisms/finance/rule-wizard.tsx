"use client";
// U13 RuleWizard (/finance/revenue/rules/new): scope → rate → preview "N open cases will use this rule" → create.
// Effective from ≥ today; overlap and deviation-from-default (executive approval) shown before submit. Phone: read-only (D11).
import { useState } from "react";
import { api } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx } from "@/shared/format";
import { fill } from "@/content/pages/finance-common";
import { useRulePreview, useRules } from "@/lib/finance/e";
import type { RuleScope } from "@/shared/finance/types";
import { Button, ButtonLink } from "@/components/atoms/button";
import { DateInput, ErrorSummary, Field, Input, Radio, Select, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { PageHead, SkeletonRows } from "@/components/atoms/agent";
import { Panel, PanelError } from "@/components/molecules/ops/ops";
import { usePhone } from "@/components/atoms/step-up";
import { useNow } from "@/components/atoms/agent";
import { Amount } from "@/components/atoms/finance";
import { DesktopOnly, LaneBanner, Steps, pctText, useActor, useMoneyText, useR, useRunner } from "@/components/molecules/finance/revenue";

const SCOPES: Exclude<RuleScope, "global">[] = ["service", "agent", "agent_service", "contract"];
type Err = { field: string; message: string };

export function RuleWizard() {
  const r = useR();
  const { locale } = useI18n();
  const router = useRouter();
  const phone = usePhone();
  const now = useNow();
  const rules = useRules();
  const run = useRunner();
  const money = useMoneyText();
  const { online, execOnly } = useActor();
  const [step, setStep] = useState(0);
  const [scope, setScope] = useState<Exclude<RuleScope, "global">>("service");
  const [serviceSlug, setService] = useState("");
  const [agentId, setAgent] = useState("");
  const [contractId, setContract] = useState("");
  const [pct, setPct] = useState("");
  const [appliesTo, setApplies] = useState<"one_off" | "subscription" | "both">("both");
  const [from, setFrom] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Err[]>([]);
  const today = now ? new Date(now).toISOString().slice(0, 10) : "";
  const bps = Math.round(Number(pct) * 100); // percent input → basis points (unit conversion, not money)
  const preview = useRulePreview({ scope, agentId, serviceSlug, contractId, pct: bps, from }, step === 2);
  const back = <ButtonLink href={localHref(locale, "/finance/revenue?tab=rules")} variant="ghost" size="sm" className="-ml-3 mb-2"><Icon name="arrowRight" size={14} aria-hidden className="rotate-180" />{r.wizard.back}</ButtonLink>;

  if (phone) return <div className="mx-auto max-w-3xl"><PageHead back={back} title={r.wizard.title} /><DesktopOnly title={r.wizard.phone} body={r.wizard.phoneBody} back={back} /></div>;
  if (rules.isError) return <PanelError what={r.load.rules} onRetry={() => rules.refetch()} />;

  const err = (k: string) => errors.find((e) => e.field === k)?.message;
  const validate = (s: number): Err[] => {
    const e: (Err | false)[] = s === 0 ? [
      (scope === "service" || scope === "agent_service") && !serviceSlug && { field: "rw-service", message: r.wizard.required },
      (scope === "agent" || scope === "agent_service") && !agentId && { field: "rw-agent", message: r.wizard.required },
      scope === "contract" && !contractId.trim() && { field: "rw-contract", message: r.wizard.contractReq },
    ] : s === 1 ? [
      !(pct !== "" && Number(pct) >= 0 && Number(pct) <= 100 && Number.isInteger(Number(pct) * 2)) && { field: "rw-pct", message: r.wizard.pctRange },
      (!from || from < today) && { field: "rw-from", message: from ? r.wizard.retroactive : r.wizard.required },
      !reason.trim() && { field: "rw-reason", message: r.wizard.required },
    ] : [];
    return e.filter(Boolean) as Err[];
  };
  const next = () => { const e = validate(step); setErrors(e); if (!e.length) setStep(step + 1); };
  const p = preview.data;
  const blocked = !!p && (p.overlap || p.retroactive);
  const submit = async () => {
    const res = await run.go<{ status: string }>({ req: (h) => api.POST("/api/finance/revenue/rules", { body: { scope, serviceSlug: serviceSlug || undefined, agentId: agentId || undefined, contractId: contractId.trim() || undefined, agentPct: bps, appliesTo, from, reason: reason.trim() }, headers: h }) },
      { success: p?.needsExec ? r.wizard.createdPending : r.wizard.created });
    if (res) router.push(localHref(locale, "/finance/revenue?tab=rules"));
  };
  const services = rules.data?.services ?? [];
  const agents = rules.data?.agents ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHead back={back} title={r.wizard.title} />
      <LaneBanner offline={!online && r.offline} exec={execOnly && r.execRO} />
      <Panel>
        <div className="grid gap-6">
          <Steps steps={r.wizard.steps} current={step} />
          <ErrorSummary title={r.wizard.errors} errors={errors} />
          {rules.isPending ? <SkeletonRows n={3} /> : step === 0 ? (
            <div key="s0" className="grid gap-4 m-rise">
              <fieldset className="grid gap-2"><legend className="mb-1 text-label">{r.wizard.scope}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SCOPES.map((s) => (
                    <label key={s} className={cx("flex cursor-pointer items-center gap-3 border p-3 m-lift", scope === s ? "border-secondary bg-navy-50" : "border-border")}>
                      <Radio name="rw-scope" label={r.scope[s]} checked={scope === s} onChange={() => setScope(s)} />
                    </label>
                  ))}
                </div>
              </fieldset>
              {(scope === "service" || scope === "agent_service") && (
                <Field id="rw-service" label={r.wizard.service} error={err("rw-service")}>
                  {({ id, invalid }) => <Select id={id} aria-invalid={invalid} value={serviceSlug} onChange={(e) => setService(e.target.value)}><option value="">{r.wizard.choose}</option>{services.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</Select>}
                </Field>
              )}
              {(scope === "agent" || scope === "agent_service") && (
                <Field id="rw-agent" label={r.wizard.agent} error={err("rw-agent")}>
                  {({ id, invalid }) => <Select id={id} aria-invalid={invalid} value={agentId} onChange={(e) => setAgent(e.target.value)}><option value="">{r.wizard.choose}</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>}
                </Field>
              )}
              {scope === "contract" && (
                <Field id="rw-contract" label={r.wizard.contract} error={err("rw-contract")}>
                  {({ id, invalid }) => <Input id={id} aria-invalid={invalid} value={contractId} onChange={(e) => setContract(e.target.value)} />}
                </Field>
              )}
            </div>
          ) : step === 1 ? (
            <div key="s1" className="grid gap-4 m-rise">
              <Field id="rw-pct" label={r.wizard.pct} hint={`${r.wizard.pctHint} ${fill(r.rules.fromDefault, { pct: pctText(rules.data?.defaultBps ?? 0) })}`} error={err("rw-pct")}>
                {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} inputMode="decimal" className="max-w-40" value={pct} onChange={(e) => setPct(e.target.value.replace(/[^\d.]/g, ""))} />}
              </Field>
              <fieldset className="grid gap-2"><legend className="text-label">{r.wizard.applies}</legend>
                <div className="flex flex-wrap gap-4">{(["both", "one_off", "subscription"] as const).map((k) => <Radio key={k} name="rw-applies" label={r.applies[k]} checked={appliesTo === k} onChange={() => setApplies(k)} />)}</div>
              </fieldset>
              <Field id="rw-from" label={r.wizard.from} hint={r.wizard.fromHint} error={err("rw-from")}>
                {({ id, describedBy, invalid }) => <DateInput id={id} aria-describedby={describedBy} aria-invalid={invalid} min={today} className="max-w-56" value={from} onChange={(e) => setFrom(e.target.value)} />}
              </Field>
              <Field id="rw-reason" label={r.wizard.reason} hint={r.wizard.reasonHint} error={err("rw-reason")}>
                {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} aria-invalid={invalid} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}
              </Field>
            </div>
          ) : (
            <div key="s2" className="grid gap-4 m-rise" aria-live="polite">
              {preview.isPending ? <SkeletonRows n={2} /> : preview.isError ? <PanelError what={r.wizard.preview} onRetry={() => preview.refetch()} /> : p && (
                <>
                  <div className="grid gap-3 bg-bg-tint p-5">
                    <p className="text-eyebrow text-navy-800">{r.scope[scope]} · {pctText(bps)} · {r.applies[appliesTo]}</p>
                    <p key={p.affected} className="text-h3 m-pop">{fill(r.wizard.affected, { n: p.affected })}</p>
                    <p className="text-small text-fg-muted">{fill(r.wizard.current, { label: p.current.label === "global" ? r.scope.global : p.current.label, pct: pctText(p.current.pct) })}</p>
                    <p className="text-small">{fill(r.wizard.example, { eligible: money(p.example.eligible), pool: money(p.example.pool), hebuza: money(p.example.hebuza) })}</p>
                    <div className="flex flex-wrap gap-4"><Amount value={p.example.pool} size="lg" /><span className="text-fg-subtle">/</span><Amount value={p.example.hebuza} size="lg" /></div>
                  </div>
                  {p.overlap && <p role="alert" className="flex gap-2 bg-danger-bg p-3 text-small text-danger"><Icon name="x" size={16} aria-hidden className="mt-0.5 shrink-0" />{r.wizard.overlap}</p>}
                  {p.retroactive && <p role="alert" className="flex gap-2 bg-danger-bg p-3 text-small text-danger"><Icon name="clock" size={16} aria-hidden className="mt-0.5 shrink-0" />{r.wizard.retroactive}</p>}
                  {p.needsExec && <p className="flex gap-2 bg-warning-bg p-3 text-small"><Icon name="shield" size={16} aria-hidden className="mt-0.5 shrink-0" />{r.wizard.needsExec}</p>}
                </>
              )}
            </div>
          )}
          <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
            <Button variant="ghost" disabled={step === 0} onClick={() => { setErrors([]); setStep(step - 1); }}>{r.wizard.prev}</Button>
            {step < 2
              ? <Button className="m-press" onClick={next}>{r.wizard.next}</Button>
              : <Button dots className="m-press" loading={run.busy} disabled={!online || execOnly || !p || blocked} onClick={submit}>{r.wizard.submit}</Button>}
          </div>
        </div>
      </Panel>
    </div>
  );
}
