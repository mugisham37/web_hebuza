"use client";
// U11 new expense, board EX1 (fixed: RWF only, no payment-mode radio — reimbursed via payout). Works offline → expense.create op.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMoney, formatNumber } from "@/shared/format";
import { Button } from "@/components/atoms/button";
import { Field, Input, Select, Textarea, Checkbox, ErrorSummary } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { useUrlParams } from "@/lib/url-state";
import { useDayPlan } from "@/lib/field/api";
import { enqueue, replaceBody, useEngine } from "@/lib/field/sync";
import { useOnline } from "@/lib/field/net";
import { overCap } from "@/shared/field/rules";
import { useFieldCopy, fill } from "@/lib/field/copy";
import { copyE } from "@/lib/field/copy-e";
import { FIELD_POLICY } from "@/shared/policy";
import type { ExpenseCategory, Flag, L3 } from "@/shared/field/types";
import type { Captured } from "@/lib/field/image";
import { PhotoCapture } from "@/components/molecules/field/field";
import { ActionBar, FieldHeader, useFieldBase } from "@/components/atoms/field-agent";
import { ctl } from "@/components/molecules/field/ctl";

export function ExpenseForm() {
  const params = useUrlParams();
  const eng = useEngine();
  const editId = params.get("edit");
  const editing = editId ? eng.ops.find((o) => o.opId === editId && o.kind === "expense.create") : undefined;
  // Remount when the op to edit appears, so its body seeds the form state.
  return <Form key={editing?.opId ?? "new"} prefillVisit={params.get("visit")} edit={editing ? { opId: editing.opId, body: editing.body } : null} />;
}

function Form({ prefillVisit, edit }: { prefillVisit: string | null; edit: { opId: string; body: Record<string, unknown> } | null }) {
  const { c, locale } = useFieldCopy();
  const t = copyE(locale).exp;
  const router = useRouter();
  const base = useFieldBase();
  const toast = useToast();
  const online = useOnline();
  const plan = useDayPlan("today");
  const eng = useEngine();
  const b = edit?.body ?? {};
  const [category, setCategory] = useState<ExpenseCategory>((b.category as ExpenseCategory) ?? "moto");
  const [amount, setAmount] = useState(b.amount ? formatNumber(Number(b.amount), locale) : "");
  const [visitId, setVisitId] = useState<string>((b.visit_id as string) ?? prefillVisit ?? "");
  const [photo, setPhoto] = useState<Captured | null>(b.receipt ? ({ dataUrl: String(b.receipt), bytes: 0 } as Captured) : null);
  const [noReceipt, setNoReceipt] = useState(!!b.no_receipt_reason);
  const [reason, setReason] = useState(String(b.no_receipt_reason ?? ""));
  const [note, setNote] = useState(String(b.note ?? ""));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const n = Number(amount.replace(/\D/g, ""));
  const cap = eng.bundle?.settings.motoCap ?? FIELD_POLICY.motoCap;
  const visits = plan.visits ?? [];

  async function save() {
    const e: Record<string, string> = {};
    if (!Number.isInteger(n) || n <= 0) e.amount = t.amountBad;
    if (!photo && !(noReceipt && reason.trim())) e.receipt = t.reasonRequired;
    if (!visitId && !note.trim()) e.note = t.noteNeeded;
    setErrors(e);
    if (Object.keys(e).length) return;
    const v = visits.find((x) => x.id === visitId);
    const flags: Flag[] = overCap(category, n) ? ["over_cap"] : [];
    const body = { visit_id: visitId || null, visit_ref: v?.ref ?? null, category, amount: n, note: note.trim() || undefined,
      no_receipt_reason: photo ? undefined : reason.trim(), receipt: photo?.dataUrl, flags };
    setBusy(true);
    try {
      if (edit) await replaceBody(edit.opId, body);
      else await enqueue({ kind: "expense.create", localPrefix: "EX", body });
      toast({ title: t.saved, body: online ? undefined : t.queuedOffline, tone: "success" });
      router.push(base("/expenses"));
    } catch { setErrors({ form: c.quotaFull }); } finally { setBusy(false); }
  }

  const summary = Object.entries(errors).map(([field, message]) => ({ field, message }));
  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void save(); }} className="grid gap-4">
      <FieldHeader title={t.newTitle} back={base("/expenses")} />
      {summary.length > 0 && <ErrorSummary title={t.errors} errors={summary} />}
      <Field id="category" label={t.category}>
        {(a) => (
          <Select {...ctl(a)} value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
            {FIELD_POLICY.expenseCategories.map((k) => <option key={k} value={k}>{t.cats[k]}</option>)}
          </Select>
        )}
      </Field>
      <Field id="amount" label={t.amount} error={errors.amount}>
        {(a) => (
          <Input {...ctl(a)} inputMode="numeric" autoComplete="off" className="text-h3 tabular" value={amount}
            onChange={(e) => setAmount(e.target.value)} onFocus={() => setAmount(amount.replace(/\D/g, ""))}
            onBlur={() => n > 0 && Number.isInteger(n) && setAmount(formatNumber(n, locale as L3))} />
        )}
      </Field>
      {overCap(category, n) && <p role="status" className="bg-warning-bg px-4 py-3 text-small">{fill(t.overCap, { cap: formatMoney(cap, "RWF", locale) })}</p>}
      <Field id="visit" label={t.visit}>
        {(a) => (
          <Select {...ctl(a)} value={visitId} onChange={(e) => setVisitId(e.target.value)}>
            <option value="">{t.noVisit}</option>
            {visits.map((v) => <option key={v.id} value={v.id}>{v.ref} · {v.title_i18n[locale]}</option>)}
          </Select>
        )}
      </Field>
      <div id="receipt" className="grid gap-2">
        <p className="text-label">{t.receipt}</p>
        {!noReceipt && <PhotoCapture label={t.receipt} value={photo} onCapture={setPhoto} />}
        <Checkbox label={t.noReceipt} checked={noReceipt} onChange={(e) => { setNoReceipt(e.target.checked); if (e.target.checked) setPhoto(null); }} />
        {noReceipt && <Field label={t.noReceiptReason}>{(a) => <Input {...ctl(a)} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>}
        {errors.receipt && <p className="text-small text-danger">{errors.receipt}</p>}
      </div>
      <Field id="note" label={t.note} error={errors.note}>
        {(a) => <Textarea {...ctl(a)} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />}
      </Field>
      {!online && <p className="bg-info-bg px-4 py-3 text-center text-small font-medium text-info">{t.queuedOffline}</p>}
      {errors.form && <p role="alert" className="text-small text-danger">{errors.form}</p>}
      <ActionBar><Button type="submit" size="lg" loading={busy}>{edit ? t.resend : t.save}</Button></ActionBar>
    </form>
  );
}
