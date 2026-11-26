"use client";
// Expense approvals: SM L1 (/ops/field?tab=expenses) and Finance L2 (FinanceFieldView). Desktop table + phone cards (PEX1),
// bulk approve ≤ 20, reject with reason, SoD enforced by the server (sod_violation / wrong_level shown in plain words).
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { formatDate, formatMoney } from "@/shared/format";
import { Button } from "@/components/atoms/button";
import { Skeleton } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { EmptyPanel, PanelError, ReasonDialog } from "@/components/molecules/ops/ops";
import { fx, fieldKeys } from "@/lib/field/api";
import { useFieldCopy } from "@/lib/field/copy";
import { copyF } from "@/lib/field/copy-f";
import { copyE } from "@/lib/field/copy-e";
import type { Expense } from "@/shared/field/types";
import { FieldFlagChip } from "@/components/atoms/field-agent";
import { ApprovalTrail } from "@/components/molecules/field/field";

export function ExpenseApprovalQueue({ level }: { level: 1 | 2 }) {
  const { locale } = useFieldCopy();
  const t = copyF(locale).exp;
  const ce = copyE(locale).exp;
  const qc = useQueryClient();
  const toast = useToast();
  const key = fieldKeys.office(`expenses:${level}`);
  const q = useQuery({ queryKey: key, queryFn: () => fx<Expense[]>("GET", `/api/x_field/approvals/expenses?level=${level}`) });
  const [sel, setSel] = useState<string[]>([]);
  const [rejecting, setRejecting] = useState<Expense | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const say = (e: unknown) => toast({ tone: "danger", title: e instanceof ApiError && e.errorType === "sod_violation" ? t.sod : e instanceof ApiError && e.errorType === "wrong_level" ? t.wrong : errorCopy(e, locale) });
  async function decide(ids: string[], decision: "approved" | "rejected", reason?: string) {
    setBusy(true);
    let okN = 0;
    for (const id of ids) {
      try { await fx("POST", `/api/x_field/expenses/${id}/decision`, { level, decision, reason }); okN++; } catch (e) { say(e); }
    }
    setBusy(false); setSel([]);
    if (okN) toast({ tone: "success", title: `${decision === "approved" ? t.approved : t.rejected} · ${okN}` });
    await qc.invalidateQueries({ queryKey: key });
  }

  if (q.isPending) return <div className="grid gap-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  if (q.isError) return <PanelError what={level === 1 ? t.l1 : t.l2} onRetry={() => void q.refetch()} />;
  const rows = q.data;
  if (!rows.length) return <EmptyPanel title={t.empty} body={t.emptyBody} />;
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 20 ? s : [...s, id]));
  const money = (n: number) => formatMoney(n, "RWF", locale);
  const actions = (x: Expense) => (
    <span className="flex gap-2">
      <Button size="sm" disabled={busy} onClick={() => void decide([x.id], "approved")}>{t.approve}</Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => setRejecting(x)}>{t.reject}</Button>
    </span>
  );

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-label-lg">{level === 1 ? t.l1 : t.l2}</h2>
        {sel.length > 0 && <Button size="sm" variant="primary" loading={busy} onClick={() => void decide(sel, "approved")}>{t.bulk.replace("{n}", String(sel.length))}</Button>}
        <span className="text-small text-fg-subtle">{t.bulkMax}</span>
      </div>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto border border-border bg-surface md:block">
        <table className="w-full text-small">
          <thead className="text-left text-fg-subtle"><tr className="border-b border-border">
            <th className="p-3"><input type="checkbox" aria-label={t.selectAll} checked={sel.length > 0 && sel.length === Math.min(20, rows.length)} onChange={(e) => setSel(e.target.checked ? rows.slice(0, 20).map((r) => r.id) : [])} /></th>
            <th className="p-3">{t.claimant}</th><th className="p-3">{t.category}</th><th className="p-3">{t.visit}</th><th className="p-3">{t.date}</th><th className="p-3 text-right">{t.amount}</th><th className="p-3" />
          </tr></thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.id} className="border-b border-border last:border-0 align-top">
                <td className="p-3"><input type="checkbox" aria-label={t.select.replace("{ref}", x.ref ?? x.id)} checked={sel.includes(x.id)} onChange={() => toggle(x.id)} /></td>
                <td className="p-3"><button type="button" className="text-left underline-offset-4 hover:underline" onClick={() => setOpen(open === x.id ? null : x.id)}>{x.claimantName}<span className="block font-mono text-eyebrow normal-case text-fg-subtle">{x.ref}</span></button>
                  {open === x.id && <div className="mt-3"><ApprovalTrail x={x} /></div>}</td>
                <td className="p-3">{ce.cats[x.category]}{x.note && <span className="block text-fg-subtle">{x.note}</span>}<span className="mt-1 flex flex-wrap gap-1">{x.flags.map((f) => <FieldFlagChip key={f} flag={f} />)}{!x.receiptUrl && <span className="text-eyebrow normal-case text-warning">{t.noReceipt}{x.noReceiptReason ? `: ${x.noReceiptReason}` : ""}</span>}</span></td>
                <td className="p-3">{x.visitRef ?? ""}</td>
                <td className="p-3 tabular">{formatDate(x.createdAt, locale, { day: "numeric", month: "short" })}</td>
                <td className="p-3 text-right tabular font-medium">{money(x.amount)}</td>
                <td className="p-3">{actions(x)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Phone cards (PEX1) */}
      <ul className="grid gap-2 md:hidden">
        {rows.map((x) => (
          <li key={x.id} className="grid gap-3 border border-border bg-surface p-4">
            <div className="flex items-start gap-3">
              <input type="checkbox" className="mt-1" aria-label={t.select.replace("{ref}", x.ref ?? x.id)} checked={sel.includes(x.id)} onChange={() => toggle(x.id)} />
              <div className="min-w-0 flex-1">
                <p className="text-label">{ce.cats[x.category]} · <span className="tabular">{money(x.amount)}</span></p>
                <p className="text-small text-fg-muted">{x.claimantName} · {x.visitRef ?? x.ref}</p>
                <div className="mt-1 flex flex-wrap gap-1">{x.flags.map((f) => <FieldFlagChip key={f} flag={f} />)}</div>
              </div>
            </div>
            <ApprovalTrail x={x} />
            {actions(x)}
          </li>
        ))}
      </ul>
      <ReasonDialog open={!!rejecting} onClose={() => setRejecting(null)} title={t.rejectTitle} description={rejecting ? `${rejecting.ref} · ${money(rejecting.amount)}` : undefined}
        options={t.reasons.map((r) => ({ value: r, label: r }))} confirmLabel={t.reject} destructive audited
        onConfirm={async ({ reason, note }) => { const x = rejecting!; setRejecting(null); await decide([x.id], "rejected", note ? `${reason}, ${note}` : reason); }} />
    </div>
  );
}
