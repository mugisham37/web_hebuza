"use client";
// F-SUB-09 finance subscriptions: list (client, plan, status, period end) and pause an active plan for N days.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, unwrap } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/provider";
import { formatDate, formatMoney } from "@/shared/format";
import type { components } from "@/lib/api/schema";
import { financeSubscriptions } from "@/content/pages/finance-subscriptions";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/atoms/field";
import { Tabs } from "@/components/atoms/tabs";
import { Badge } from "@/components/atoms/tag";
import { useToast } from "@/components/atoms/toast";
import { isForbidden } from "@/components/atoms/hooks";
import { PageHead, SkeletonRows } from "@/components/atoms/agent";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { NoAccess } from "@/components/molecules/finance/finance";

type Row = components["schemas"]["FinanceSubscriptionList"]["items"][number];
const TONE: Record<string, "success" | "info" | "warning" | "danger" | "neutral"> = {
  active: "success", trial: "info", past_due: "danger", paused: "warning", cancelled: "neutral", expired: "neutral",
};
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? "");

export function SubscriptionsView() {
  const { locale } = useI18n();
  const t = financeSubscriptions(locale);
  const q = useQuery({
    queryKey: ["finance", "subscriptions"],
    queryFn: () => unwrap<{ items: Row[] }>(api.GET("/api/finance/subscriptions")).then((d) => d.items),
  });
  const [open, setOpen] = useState<Row | null>(null);
  if (isForbidden(q.error)) return <NoAccess />;
  return (
    <div className="grid gap-5">
      <PageHead title={t.title} sub={t.sub} />
      <Tabs tabs={[
        { id: "subs", label: t.tabs.subs, content: <div className="pt-4">{subs()}</div> },
        { id: "plans", label: t.tabs.plans, content: <div className="pt-4"><PlansPanel /></div> },
      ]} />
      {open && <PauseDialog row={open} onClose={() => setOpen(null)} />}
    </div>
  );
  function subs() {
    return q.isPending ? (
        <SkeletonRows n={5} />
      ) : q.error ? (
        <PanelError what={t.err} onRetry={() => void q.refetch()} />
      ) : !q.data.length ? (
        <EmptyPanel title={t.empty[0]} body={t.empty[1]} />
      ) : (
        <div className="overflow-x-auto border border-border bg-surface">
          <table className="w-full min-w-[40rem] text-small">
            <thead className="text-left text-fg-subtle">
              <tr className="border-b border-border">
                <th className="p-3">{t.cols.client}</th><th className="p-3">{t.cols.plan}</th>
                <th className="p-3 text-right">{t.cols.amount}</th><th className="p-3">{t.cols.status}</th>
                <th className="p-3">{t.cols.end}</th><th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {q.data.map((r) => (
                <tr key={r.subscriptionId} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium">{r.clientName}</td>
                  <td className="p-3">{r.planName}</td>
                  <td className="p-3 text-right tabular">{formatMoney(r.amountRwf, "RWF", locale)}</td>
                  <td className="p-3">
                    <Badge tone={TONE[r.status] ?? "neutral"}>{t.status[r.status] ?? r.status}</Badge>
                    {r.cancelAtPeriodEnd && <span className="block text-eyebrow normal-case text-fg-subtle">{t.cancels}</span>}
                    {r.pausedUntil && <span className="block text-eyebrow normal-case text-fg-subtle">{fill(t.pausedUntil, { date: formatDate(r.pausedUntil, locale) })}</span>}
                  </td>
                  <td className="p-3 tabular">{formatDate(r.periodEnd, locale)}</td>
                  <td className="p-3">{r.status === "active" && <Button data-guide="finance-sub-pause" size="sm" variant="outline" onClick={() => setOpen(r)}>{t.pause}</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

type Plan = components["schemas"]["SubscriptionPlanResponse"];
/** F-SUB-11 plan admin: monthly or yearly plans, price, cap, listing. */
function PlansPanel() {
  const { locale } = useI18n();
  const t = financeSubscriptions(locale).plans;
  const q = useQuery({
    queryKey: ["finance", "plans"],
    queryFn: () => unwrap<{ plans: Plan[] }>(api.GET("/api/finance/subscriptions/plans")).then((d) => d.plans),
  });
  const [edit, setEdit] = useState<Plan | "new" | null>(null);
  return (
    <div className="grid gap-3">
      <Button size="sm" className="justify-self-start" onClick={() => setEdit("new")}>{t.add}</Button>
      {q.isPending ? <SkeletonRows n={3} /> : q.error ? <PanelError what={t.title} onRetry={() => void q.refetch()} /> : !q.data.length ? (
        <EmptyPanel title={t.empty[0]} body={t.empty[1]} />
      ) : (
        <ul className="grid gap-2">
          {q.data.map((p) => (
            <li key={p.planId} className="flex flex-wrap items-center gap-3 border border-border bg-surface p-3 text-small">
              <span className="min-w-0 flex-1 font-medium">{p.name}</span>
              <span className="tabular">{formatMoney(p.amountRwf, "RWF", locale)} {t.per[p.interval] ?? ""}</span>
              {p.isSignupTrial ? <Badge tone="info">{t.trial}</Badge> : !p.isActive ? <Badge tone="neutral">{t.inactive}</Badge> : !p.isPublic ? <Badge tone="warning">{t.hidden}</Badge> : null}
              <Button size="sm" variant="outline" onClick={() => setEdit(p)}>{t.edit}</Button>
            </li>
          ))}
        </ul>
      )}
      {edit && <PlanDialog plan={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function PlanDialog({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const { locale } = useI18n();
  const t = financeSubscriptions(locale).plans;
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState({
    name: plan?.name ?? "", interval: (plan?.interval ?? "month") as "month" | "year", amount: String(plan?.amountRwf ?? ""),
    cap: plan?.maxApplicationsPerMonth != null ? String(plan.maxApplicationsPerMonth) : "", description: plan?.description ?? "",
    features: (plan?.features ?? []).join("\n"), isPublic: plan?.isPublic ?? true, isActive: plan?.isActive ?? true, order: String(plan?.sortOrder ?? 10),
  });
  const [err, setErr] = useState<string | null>(null);
  const amount = Number(f.amount), cap = f.cap.trim() ? Number(f.cap) : null, order = Number(f.order);
  const ok = f.name.trim() && Number.isInteger(amount) && amount >= 0 && (cap === null || (Number.isInteger(cap) && cap > 0)) && Number.isInteger(order);
  const body = {
    name: f.name.trim(), interval: f.interval, amountRwf: amount, maxApplicationsPerMonth: cap, description: f.description.trim() || null,
    features: f.features.split("\n").map((x) => x.trim()).filter(Boolean), isPublic: f.isPublic, isActive: f.isActive, sortOrder: order,
  };
  const m = useMutation({
    mutationFn: () =>
      plan
        ? unwrap(api.PATCH("/api/finance/subscriptions/plans/{id}", { params: { path: { id: plan.planId } }, body }))
        : unwrap(api.POST("/api/finance/subscriptions/plans", { body })),
    onSuccess: () => {
      toast({ tone: "success", title: t.saved });
      void qc.invalidateQueries({ queryKey: ["finance", "plans"] });
      onClose();
    },
    onError: (e) => setErr(e instanceof Error ? e.message : String(e)),
  });
  return (
    <Dialog open onClose={onClose} title={plan ? plan.name : t.add}
      footer={<Button disabled={!ok} loading={m.isPending} onClick={() => m.mutate()}>{t.save}</Button>}>
      <div className="grid gap-3">
        <Field label={t.name}>{(a) => <Input id={a.id} aria-describedby={a.describedBy} maxLength={255} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
        <Field label={t.interval}>{(a) => (
          <Select id={a.id} aria-describedby={a.describedBy} value={f.interval} onChange={(e) => setF({ ...f, interval: e.target.value as "month" | "year" })}>
            <option value="month">{t.month}</option><option value="year">{t.year}</option>
          </Select>
        )}</Field>
        <Field label={t.amount}>{(a) => <Input id={a.id} aria-describedby={a.describedBy} type="number" min={0} inputMode="numeric" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />}</Field>
        <Field label={t.cap}>{(a) => <Input id={a.id} aria-describedby={a.describedBy} type="number" min={1} inputMode="numeric" value={f.cap} onChange={(e) => setF({ ...f, cap: e.target.value })} />}</Field>
        <Field label={t.description}>{(a) => <Textarea id={a.id} aria-describedby={a.describedBy} rows={2} maxLength={2000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />}</Field>
        <Field label={t.features}>{(a) => <Textarea id={a.id} aria-describedby={a.describedBy} rows={3} value={f.features} onChange={(e) => setF({ ...f, features: e.target.value })} />}</Field>
        <Field label={t.order}>{(a) => <Input id={a.id} aria-describedby={a.describedBy} type="number" min={0} inputMode="numeric" value={f.order} onChange={(e) => setF({ ...f, order: e.target.value })} />}</Field>
        <Checkbox label={t.public} checked={f.isPublic} onChange={(e) => setF({ ...f, isPublic: e.target.checked })} />
        <Checkbox label={t.active} checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} />
        {err && <p role="alert" className="text-small text-danger">{err}</p>}
      </div>
    </Dialog>
  );
}

function PauseDialog({ row, onClose }: { row: Row; onClose: () => void }) {
  const { locale } = useI18n();
  const t = financeSubscriptions(locale);
  const qc = useQueryClient();
  const toast = useToast();
  const [days, setDays] = useState("14");
  const [err, setErr] = useState<string | null>(null);
  const n = Number(days);
  const ok = Number.isInteger(n) && n >= 1 && n <= 90;
  const m = useMutation({
    mutationFn: () => unwrap(api.POST("/api/finance/subscriptions/{id}/pause", { params: { path: { id: row.subscriptionId } }, body: { days: n } })),
    onSuccess: () => {
      toast({ tone: "success", title: t.paused });
      void qc.invalidateQueries({ queryKey: ["finance", "subscriptions"] });
      onClose();
    },
    onError: (e) => setErr(e instanceof ApiError && e.status === 409 ? t.conflict : e instanceof Error ? e.message : String(e)),
  });
  return (
    <Dialog open onClose={onClose} title={fill(t.pauseTitle, { client: row.clientName })}
      footer={<Button disabled={!ok} loading={m.isPending} onClick={() => m.mutate()}>{t.confirm}</Button>}>
      <div className="grid gap-3">
        <Field label={t.days}>
          {(a) => <Input id={a.id} aria-describedby={a.describedBy} type="number" min={1} max={90} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />}
        </Field>
        {err && <p role="alert" className="text-small text-danger">{err}</p>}
      </div>
    </Dialog>
  );
}
