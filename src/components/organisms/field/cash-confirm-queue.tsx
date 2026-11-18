"use client";
// U17 finance cash confirmation (F-WRK-21, F-FIN-12): ageing, >48 h escalation, deposit ref + evidence + reason,
// ≥ manual_confirm_threshold needs a second, different finance user (server answers same_approver).
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { cx, formatMoney } from "@/shared/format";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Input, Textarea } from "@/components/atoms/field";
import { Badge } from "@/components/atoms/tag";
import { Skeleton } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { fx, fieldKeys } from "@/lib/field/api";
import { useFieldCopy } from "@/lib/field/copy";
import { copyF } from "@/lib/field/copy-f";
import { POLICY } from "@/shared/policy";
import type { CashCollection } from "@/shared/field/types";
import { duration } from "@/components/atoms/field-agent";
import { ctl } from "@/components/molecules/field/ctl";

type Row = CashCollection & { ageMs: number; escalated: boolean; needsTwo: boolean };

export function CashConfirmQueue() {
  const { locale } = useFieldCopy();
  const t = copyF(locale).cash;
  const q = useQuery({ queryKey: fieldKeys.office("cash"), queryFn: () => fx<Row[]>("GET", "/api/x_field/finance/cash") });
  const [open, setOpen] = useState<Row | null>(null);
  if (q.isPending) return <Skeleton className="h-32 w-full" />;
  if (q.isError) return <PanelError what={t.title} onRetry={() => void q.refetch()} />;
  if (!q.data.length) return <EmptyPanel title={t.empty} body={t.emptyBody} />;
  const money = (n: number) => formatMoney(n, "RWF", locale);
  return (
    <div className="overflow-x-auto border border-border bg-surface">
      <table className="w-full min-w-[40rem] text-small">
        <thead className="text-left text-fg-subtle"><tr className="border-b border-border">
          <th className="p-3">{t.visit}</th><th className="p-3">{t.agent}</th><th className="p-3 text-right">{t.amount}</th><th className="p-3">{t.age}</th><th className="p-3">{t.status}</th><th className="p-3" />
        </tr></thead>
        <tbody>
          {[...q.data].sort((a, b) => b.ageMs - a.ageMs).map((c) => (
            <tr key={c.id} className="border-b border-border last:border-0">
              <td className="p-3"><span className="font-mono">{c.provisionalNo}</span><span className="block text-fg-subtle">{c.visitRef} · {c.invoiceNo}</span></td>
              <td className="p-3">{c.agentName}</td>
              <td className="p-3 text-right tabular font-medium">{money(c.amount)}</td>
              <td className={cx("p-3 tabular", c.escalated && "font-medium text-danger")}>{duration(c.ageMs)}{c.escalated && <Badge tone="danger" className="ml-2">{t.escalated}</Badge>}</td>
              <td className="p-3"><Badge tone={c.status === "confirmed" ? "success" : c.status === "deposited" ? "info" : "warning"}>{t.states[c.status]}</Badge>{c.needsTwo && c.confirmations.length === 1 && <span className="block text-eyebrow normal-case text-fg-subtle">{t.oneOfTwo}</span>}</td>
              <td className="p-3">{c.status !== "confirmed" && <Button size="sm" onClick={() => setOpen(c)}>{t.confirm}</Button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {open && <ConfirmDialog row={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ConfirmDialog({ row, onClose }: { row: Row; onClose: () => void }) {
  const { c, locale } = useFieldCopy();
  const t = copyF(locale).cash;
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState({ deposit: row.depositRef ?? "", evidence: "", reason: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!f.deposit.trim() || !f.evidence.trim() || !f.reason.trim()) return setErr(errorCopy(new ApiError(422, "reason_required", "", null), locale));
    setBusy(true); setErr(null);
    try {
      await fx("POST", `/api/finance/cash/${row.id}/confirm`, { reason: f.reason.trim(), evidence_id: f.evidence.trim(), deposit_ref: f.deposit.trim() });
      toast({ tone: "success", title: t.confirmed });
      await qc.invalidateQueries({ queryKey: fieldKeys.office("cash") });
      onClose();
    } catch (e) {
      setErr(e instanceof ApiError && e.errorType === "same_approver" ? t.same : e instanceof ApiError && e.errorType === "conflict" ? t.notDeposited : errorCopy(e, locale));
    } finally { setBusy(false); }
  }
  return (
    <Dialog open onClose={onClose} title={t.confirmTitle} description={`${row.provisionalNo} · ${formatMoney(row.amount, "RWF", locale)}`}
      footer={<><Button variant="ghost" onClick={onClose}>{c.cancel}</Button><Button loading={busy} onClick={() => void save()}>{t.confirm}</Button></>}>
      <div className="grid gap-3">
        {row.needsTwo && <p className="bg-info-bg px-3 py-2 text-small text-info">{t.needsTwo.replace("{t}", formatMoney(POLICY.manualConfirmSecondFinance, "RWF", locale))}</p>}
        {row.status !== "deposited" && <p className="bg-warning-bg px-3 py-2 text-small">{t.notDeposited}</p>}
        <Field label={t.depositRef}>{(a) => <Input {...ctl(a)} value={f.deposit} onChange={(e) => setF({ ...f, deposit: e.target.value })} />}</Field>
        <Field label={t.evidence}>{(a) => <Input {...ctl(a)} value={f.evidence} onChange={(e) => setF({ ...f, evidence: e.target.value })} />}</Field>
        <Field label={t.reason}>{(a) => <Textarea {...ctl(a)} rows={2} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />}</Field>
        {err && <p role="alert" className="text-small text-danger">{err}</p>}
      </div>
    </Dialog>
  );
}
