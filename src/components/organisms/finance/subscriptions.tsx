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
import { Field, Input } from "@/components/atoms/field";
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
      {q.isPending ? (
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
                  <td className="p-3">{r.status === "active" && <Button size="sm" variant="outline" onClick={() => setOpen(r)}>{t.pause}</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <PauseDialog row={open} onClose={() => setOpen(null)} />}
    </div>
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
