"use client";
// U12b Integrations registry `/system/integrations?group=&health=&q=` (plan 06 §7 U12b, board 09 v2 IG1 + IG4).
// Health is the C3.16 truth from the server; fallback chains are read-only here (edited in U14).
import { useI18n, localHref } from "@/lib/i18n/provider";
import Link from "next/link";
import { systemIntegrations } from "@/content/pages/system-integrations";
import { fill, sysError } from "@/content/pages/system-common";
import { cx } from "@/shared/format";
import { ApiError } from "@/lib/api/client";
import { errorState } from "@/lib/system/api";
import { HEALTH_ORDER, INTEGRATION_GROUPS } from "@/shared/system/integrations";
import { useIntegrations, usePayLater, withStepUp } from "@/lib/system/d";
import type { Health, IntegrationVM } from "@/shared/system/types";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Button } from "@/components/atoms/button";
import { Input, Switch } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { StepUpCancelled, useStepUp } from "@/components/atoms/step-up";
import { useOnline } from "@/components/atoms/hooks";
import { HealthPill, LockedContent, useS } from "@/components/atoms/system";
import { IntegrationCard, SysPageHead } from "@/components/molecules/system/system";

const GROUP_ICON: Record<string, IconName> = { payments: "wallet", messaging: "message", ai: "sparkle", identity: "fileCheck", platform: "layers" };

export function IntegrationsView() {
  const c = systemIntegrations(useI18n().locale);
  const s = useS();
  const params = useUrlParams();
  const group = params.get("group") ?? "";
  const hf = params.get("health") ?? "";
  const term = (params.get("q") ?? "").toLowerCase();
  const q = useIntegrations();

  if (q.isError && !q.data && errorState(q.error) === "locked") return <LockedContent reason="role" />;
  const items = q.data?.items ?? [];
  const shown = items.filter((i) => (!group || i.group === group) && (!hf || i.health === hf) && (!term || i.name.toLowerCase().includes(term) || i.key.includes(term)));
  const bad = items.filter((i) => i.health === "down" || i.health === "degraded");
  const untested = items.filter((i) => i.health === "untested").length;
  const filtered = !!(group || hf || term);

  return (
    <div className="grid gap-5">
      <SysPageHead title={c.title} sub={c.sub} />
      {bad.length > 0 && q.data && <OutagePanel bad={bad} payLater={q.data.payLater} />}

      <div role="search" className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-56">
          <span className="sr-only">{c.search}</span>
          <Icon name="search" size={15} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
          <Input type="search" defaultValue={params.get("q") ?? ""} placeholder={c.search} className="pl-9" onChange={(e) => setUrlParams({ q: e.target.value || null })} />
        </label>
        <select aria-label={c.allGroups} value={group} onChange={(e) => setUrlParams({ group: e.target.value || null })} className="h-11 border border-border-strong bg-surface px-3">
          <option value="">{c.allGroups}</option>
          {INTEGRATION_GROUPS.map((g) => <option key={g} value={g}>{c.groups[g]}</option>)}
        </select>
        <select aria-label={c.allHealth} value={hf} onChange={(e) => setUrlParams({ health: e.target.value || null })} className="h-11 border border-border-strong bg-surface px-3">
          <option value="">{c.allHealth}</option>
          {HEALTH_ORDER.map((h) => <option key={h} value={h}>{s.health[h]}</option>)}
        </select>
      </div>
      {q.data && <p className="text-small text-fg-muted tabular" role="status">{fill(c.counts, { n: items.length, bad: bad.length, untested })}</p>}

      {q.isPending ? (
        <div aria-busy className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-40 m-shimmer" />)}</div>
      ) : q.isError && !q.data ? (
        <PanelError what={c.loadWhat} onRetry={() => q.refetch()} />
      ) : !shown.length ? (
        <EmptyPanel title={c.empty} action={filtered ? <Button size="sm" variant="outline" onClick={() => setUrlParams({ group: null, health: null, q: null })}>{c.clear}</Button> : undefined} />
      ) : (
        INTEGRATION_GROUPS.filter((g) => shown.some((i) => i.group === g)).map((g) => {
          const list = shown.filter((i) => i.group === g).sort((a, b) => HEALTH_ORDER.indexOf(a.health) - HEALTH_ORDER.indexOf(b.health));
          return (
            <section key={g} aria-labelledby={`ig-${g}`} className="grid gap-3">
              <h2 id={`ig-${g}`} className="flex items-center gap-2 text-label-lg">
                <span className="flex size-8 items-center justify-center rounded-full bg-navy-50 text-navy-700"><Icon name={GROUP_ICON[g]} size={15} aria-hidden /></span>
                {c.groups[g]}<span className="text-small font-normal text-fg-subtle tabular">{list.length}</span>
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 m-stagger">
                {list.map((i, n) => <li key={i.key} style={{ ["--i" as string]: Math.min(n, 6) }}><IntegrationCard integration={i} href={`/system/integrations/${i.key}`} /></li>)}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

/** IG4: what's failing, its fallback chain (read-only), and the payments pay-later switch (step-up). */
function OutagePanel({ bad, payLater }: { bad: IntegrationVM[]; payLater: boolean }) {
  const { locale } = useI18n();
  const c = systemIntegrations(locale);
  const s = useS();
  const su = useStepUp();
  const pl = usePayLater();
  const toast = useToast();
  const online = useOnline();
  const paymentsBad = bad.some((i) => i.group === "payments");
  const flip = async (on: boolean) => {
    try {
      await withStepUp(su, c.outage.stepUp, (token) => pl.mutateAsync({ on, token }));
      toast({ title: on ? c.outage.onToast : c.outage.offToast, tone: "success" });
    } catch (e) {
      if (!(e instanceof StepUpCancelled)) toast({ title: sysError(locale, e instanceof ApiError ? e.errorType : null), tone: "danger" });
    }
  };
  return (
    <section aria-label={c.outage.fallback} className="grid gap-3 m-rise">
      {bad.map((i) => (
        <div key={i.key} role="alert" className={cx("grid gap-3 border p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]", i.health === "down" ? "border-danger/30 bg-danger-bg" : "border-warning/30 bg-warning-bg")}>
          <div className="flex min-w-0 items-start gap-3">
            <Icon name="zap" size={18} aria-hidden className={cx("mt-0.5 shrink-0", i.health === "down" ? "text-danger" : "text-warning")} />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-label">{fill(c.outage.title, { name: i.name, health: s.health[i.health as Health].toLowerCase() })}<HealthPill health={i.health} /></p>
              <p className="text-small text-fg-muted tabular">{fill(c.outage.errorRate, { p: (i.errorRate1h * 100).toFixed(1) })}</p>
              <Link href={localHref(locale, `/system/integrations/${i.key}?tab=logs`)} className="mt-1 inline-flex min-h-9 items-center gap-1 text-small font-medium text-link underline-offset-4 hover:underline">{c.overview.viewLogs}<Icon name="arrowRight" size={13} aria-hidden /></Link>
            </div>
          </div>
          <div className="min-w-0 bg-surface/70 p-3">
            <p className="text-eyebrow uppercase text-fg-subtle">{c.outage.fallback}</p>
            {i.fallback?.length ? <p className="mt-1 text-small font-medium">{[i.name, ...i.fallback].join(" → ")}</p> : <p className="mt-1 text-small text-fg-muted">—</p>}
            <p className="mt-1 text-eyebrow text-fg-subtle">{c.outage.fallbackNote} <Link href={localHref(locale, "/system/notifications?tab=rules")} className="underline underline-offset-2">{c.outage.editChains}</Link></p>
          </div>
        </div>
      ))}
      {(paymentsBad || payLater) && (
        <div className="flex flex-wrap items-center gap-4 border border-border bg-surface p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-700"><Icon name="wallet" size={18} aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <p className="text-label">{c.outage.payLater}</p>
            <p className="text-small text-fg-muted">{payLater ? c.outage.payLaterOn : c.outage.payLaterBody}</p>
          </div>
          <Switch label={<span className="sr-only">{c.outage.payLater}</span>} checked={payLater} disabled={pl.isPending || !online} onChange={(e) => flip(e.target.checked)} />
        </div>
      )}
      {su.dialog}
    </section>
  );
}
