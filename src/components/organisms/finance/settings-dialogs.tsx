"use client";
// U17 dialogs (lane F): propose change (core keys + local numbering/policy tables), reject reason, add account, call-back.
// One Idempotency-Key per dialog instance (created when it opens, DoD #7).
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { ApiError, newIdempotencyKey } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { useProposeSetting } from "@/lib/finance/api";
import { editValue, kindOf, parseOffsets, parseValue, previewNo, showValue, useAddAccount, useConfirmCallback, useProposeLocal, type FinAccount } from "@/lib/finance/f";
import type { SettingRow } from "@/shared/finance/types";
import { financeSettings } from "@/content/pages/finance-settings";
import { fill } from "@/content/pages/finance-common";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Checkbox, DateInput, ErrorSummary, Field, Input, Select, Switch, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { usePhone } from "@/components/atoms/step-up";
import { useStepUpAction } from "@/components/molecules/finance/finance";

export const useS = () => financeSettings(useI18n().locale);
type Err = { field: string; message: string };

/** Ids are stable per dialog mount so the ErrorSummary links land on the fields. */
function Form({ id, errors, children }: { id: string; errors: Err[]; children: ReactNode }) {
  const s = useS();
  return (
    <form id={id} noValidate onSubmit={(e) => e.preventDefault()} className="grid gap-4">
      <ErrorSummary title={s.propose.errors} errors={errors} />
      {children}
    </form>
  );
}
const err = (errors: Err[], f: string) => errors.find((e) => e.field === f)?.message;

/** Shared tail of every proposal: effective date (≥ today) + reason. */
function EffectiveAndReason({ base, date, setDate, reason, setReason, errors, minDate }: {
  base: string; date: string; setDate: (v: string) => void; reason: string; setReason: (v: string) => void; errors: Err[]; minDate: string;
}) {
  const s = useS();
  return (
    <>
      <Field id={`${base}-date`} label={s.propose.effective} hint={s.propose.effectiveHint} error={err(errors, `${base}-date`)}>
        {({ id, describedBy, invalid }) => <DateInput id={id} aria-describedby={describedBy} aria-invalid={invalid} min={minDate} value={date} onChange={(e) => setDate(e.target.value)} />}
      </Field>
      <Field id={`${base}-reason`} label={s.propose.reason} hint={s.propose.reasonHint} error={err(errors, `${base}-reason`)}>
        {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} aria-invalid={invalid} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}
      </Field>
    </>
  );
}

/** Conflict → onConflict (ConflictDialog); everything else → inline mapped error. */
function useSubmit(onConflict: () => void) {
  const { locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<string | null>(null);
  async function go(fn: () => Promise<unknown>) {
    setBusy(true); setFail(null);
    try { await fn(); return true; }
    catch (e) {
      if (e instanceof ApiError && (e.status === 409 || e.errorType === "version_conflict")) onConflict();
      else setFail(errorCopy(e, locale));
      return false;
    } finally { setBusy(false); }
  }
  return { busy, fail, go };
}
const FailNote = ({ text }: { text: string | null }) => text ? <p role="alert" className="bg-danger-bg px-3 py-2 text-small font-medium text-danger">{text}</p> : null;

// ---------------------------------------------------------------- core setting
export function ProposeChangeDialog({ row, today, onClose, onConflict }: { row: SettingRow; today: string; onClose: () => void; onConflict: () => void }) {
  const s = useS();
  const { locale } = useI18n();
  const toast = useToast();
  const phone = usePhone();
  const m = useProposeSetting();
  const [key] = useState(newIdempotencyKey);
  const kind = kindOf(row.key);
  const [value, setValue] = useState(editValue(row.key, row.value));
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Err[]>([]);
  const sub = useSubmit(onConflict);
  const base = `p-${row.key}`;

  async function submit() {
    const next = parseValue(row.key, value);
    const e: Err[] = [];
    if (next === undefined || next === row.value) e.push({ field: `${base}-value`, message: s.propose.eNext });
    if (!date || date < today) e.push({ field: `${base}-date`, message: s.propose.eDate });
    if (!reason.trim()) e.push({ field: `${base}-reason`, message: s.propose.eReason });
    setErrors(e);
    if (e.length) return;
    const okd = await sub.go(() => m.mutateAsync({ key: row.key, value: next, effectiveAt: date, reason: reason.trim(), idempotencyKey: key }));
    if (okd) { toast({ title: s.propose.sent, tone: "success" }); onClose(); }
  }
  const hint = kind === "pct" ? s.propose.percentHint : kind === "money" ? s.propose.amountHint : kind === "days" || kind === "day" ? s.propose.daysHint : undefined;
  return (
    <Dialog open onClose={onClose} side={phone ? "bottom" : undefined} title={s.propose.title} description={s.keys[row.key]}
      footer={<Button loading={sub.busy} onClick={submit} className="m-press">{s.propose.submit}</Button>}>
      <Form id={base} errors={errors}>
        <p className="flex flex-wrap justify-between gap-2 bg-bg-subtle px-3 py-2 text-small"><span className="text-fg-muted">{s.propose.current}</span>
          <span className="font-medium tabular">{showValue(row.key, row.value, locale, s.unit)}</span></p>
        <Field id={`${base}-value`} label={s.propose.next} hint={hint} error={err(errors, `${base}-value`)}>
          {({ id, describedBy, invalid }) => kind === "bool"
            ? <Switch id={id} aria-describedby={describedBy} label={value === "true" ? s.unit.yes : s.unit.no} checked={value === "true"} onChange={(e) => setValue(String(e.target.checked))} />
            : <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} inputMode={kind === "text" ? "text" : "decimal"} value={value} onChange={(e) => setValue(e.target.value)} />}
        </Field>
        <EffectiveAndReason base={base} date={date} setDate={setDate} reason={reason} setReason={setReason} errors={errors} minDate={today} />
        <FailNote text={sub.fail} />
      </Form>
    </Dialog>
  );
}

// ---------------------------------------------------------------- local (numbering prefix, refund policy, reminder offsets)
export type LocalTarget =
  | { area: "numbering"; key: string; current: string; series: Record<string, string> }
  | { area: "policy"; key: "refund_policy"; current: Record<string, number> }
  | { area: "policy"; key: "reminder_offsets"; current: number[] };

export function ProposeLocalDialog({ target, today, year, onClose, onConflict }: { target: LocalTarget; today: string; year: number; onClose: () => void; onConflict: () => void }) {
  const s = useS();
  const toast = useToast();
  const phone = usePhone();
  const m = useProposeLocal();
  const [idem] = useState(newIdempotencyKey);
  const [series, setSeries] = useState(target.key);
  const [text, setText] = useState(() => target.key === "reminder_offsets" ? (target.current as number[]).join(", ") : target.area === "numbering" ? target.current : "");
  const [policy, setPolicy] = useState(() => target.key === "refund_policy" ? Object.fromEntries(Object.entries(target.current).map(([k, v]) => [k, String(v / 100)])) : {} as Record<string, string>);
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Err[]>([]);
  const sub = useSubmit(onConflict);
  const base = `l-${target.key}`;

  async function submit() {
    const e: Err[] = [];
    let next: unknown;
    if (target.area === "numbering") {
      next = text.trim().toUpperCase();
      if (!/^[A-Z]{2,5}$/.test(next as string)) e.push({ field: `${base}-value`, message: s.numbering.ePrefix });
    } else if (target.key === "reminder_offsets") {
      next = parseOffsets(text);
      if (!next) e.push({ field: `${base}-value`, message: s.policies.eOffsets });
    } else {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(policy)) { const n = parseValue("deposit_bps", v); if (typeof n !== "number") e.push({ field: `${base}-${k}`, message: s.propose.eNext }); else out[k] = n; }
      next = out;
    }
    if (!date || date < today) e.push({ field: `${base}-date`, message: s.propose.eDate });
    if (!reason.trim()) e.push({ field: `${base}-reason`, message: s.propose.eReason });
    setErrors(e);
    if (e.length) return;
    const okd = await sub.go(() => m.mutateAsync({ area: target.area, key: target.area === "numbering" ? series : target.key, next, effectiveAt: date, reason: reason.trim(), idempotencyKey: idem }));
    if (okd) { toast({ title: s.propose.sent, tone: "success" }); onClose(); }
  }
  const title = target.area === "numbering" ? s.numbering.request : s.keys[target.key];
  return (
    <Dialog open onClose={onClose} side={phone ? "bottom" : undefined} title={title} description={s.approvalBanner}
      footer={<Button loading={sub.busy} onClick={submit} className="m-press">{s.propose.submit}</Button>}>
      <Form id={base} errors={errors}>
        {target.area === "numbering" && (
          <>
            <Field id={`${base}-series`} label={s.numbering.series}>
              {({ id }) => (
                <Select id={id} value={series} onChange={(e) => { setSeries(e.target.value); setText(target.series[e.target.value] ?? ""); }}>
                  {Object.keys(target.series).map((k) => <option key={k} value={k}>{s.numbering.docs[k]} ({target.series[k]}-)</option>)}
                </Select>
              )}
            </Field>
            <Field id={`${base}-value`} label={s.numbering.prefix} hint={s.numbering.prefixHint} error={err(errors, `${base}-value`)}>
              {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} maxLength={5} autoCapitalize="characters" value={text} onChange={(e) => setText(e.target.value.toUpperCase())} />}
            </Field>
            <p className="flex flex-wrap items-center gap-2 bg-info-bg px-3 py-2 text-small">
              <span className="text-fg-muted">{s.numbering.preview}</span><span key={text} className="font-medium tabular m-pop">{previewNo(text, year)}</span>
            </p>
          </>
        )}
        {target.key === "reminder_offsets" && (
          <Field id={`${base}-value`} label={s.keys.reminder_offsets} hint={s.policies.offsetsHint} error={err(errors, `${base}-value`)}>
            {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} inputMode="text" value={text} onChange={(e) => setText(e.target.value)} />}
          </Field>
        )}
        {target.key === "refund_policy" && Object.keys(policy).map((k) => (
          <Field key={k} id={`${base}-${k}`} label={s.policies.stage[k] ?? k} hint={s.propose.percentHint} error={err(errors, `${base}-${k}`)}>
            {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} inputMode="decimal" value={policy[k]} onChange={(e) => setPolicy({ ...policy, [k]: e.target.value })} />}
          </Field>
        ))}
        <EffectiveAndReason base={base} date={date} setDate={setDate} reason={reason} setReason={setReason} errors={errors} minDate={today} />
        <FailNote text={sub.fail} />
      </Form>
    </Dialog>
  );
}

// ---------------------------------------------------------------- reject reason
export function RejectDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => Promise<void> }) {
  const s = useS();
  const [reason, setReason] = useState("");
  const [e, setE] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onClose={onClose} title={s.pending.reject}
      footer={<Button loading={busy} className="m-press" onClick={async () => {
        if (!reason.trim()) { setE(s.propose.eReason); return; }
        setBusy(true);
        try { await onConfirm(reason.trim()); } finally { setBusy(false); }
      }}>{s.pending.reject}</Button>}>
      <Field label={s.pending.rejectReason} error={e}>
        {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} aria-invalid={invalid} rows={3} value={reason} onChange={(ev) => setReason(ev.target.value)} />}
      </Field>
    </Dialog>
  );
}

// ---------------------------------------------------------------- accounts
export function AddAccountDialog({ onClose }: { onClose: () => void }) {
  const s = useS();
  const toast = useToast();
  const phone = usePhone();
  const m = useAddAccount();
  const { run, dialog } = useStepUpAction();
  const [idem] = useState(newIdempotencyKey);
  const [name, setName] = useState("");
  const [method, setMethod] = useState<FinAccount["method"]>("bank");
  const [number, setNumber] = useState("");
  const [errors, setErrors] = useState<Err[]>([]);
  const [busy, setBusy] = useState(false);
  async function submit() {
    const e: Err[] = [];
    if (!name.trim()) e.push({ field: "acc-name", message: s.accounts.form.eName });
    if (!/^[A-Za-z0-9]{6,24}$/.test(number.replace(/\s/g, ""))) e.push({ field: "acc-number", message: s.accounts.form.eNumber });
    setErrors(e);
    if (e.length) return;
    setBusy(true);
    try {
      const r = await run(s.accounts.addWhat, (stepUp) => m.mutateAsync({ name: name.trim(), method, number: number.replace(/\s/g, ""), stepUp, idempotencyKey: idem }));
      if (r) { toast({ title: s.accounts.added, tone: "success" }); onClose(); }
    } catch { /* mapped toast shown by useStepUpAction */ } finally { setBusy(false); }
  }
  return (
    <Dialog open onClose={onClose} side={phone ? "bottom" : undefined} title={s.accounts.add} description={s.accounts.banner}
      footer={<Button loading={busy} onClick={submit} className="m-press">{s.accounts.add}</Button>}>
      <Form id="acc" errors={errors}>
        <Field id="acc-name" label={s.accounts.form.name} error={err(errors, "acc-name")}>
          {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} value={name} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Field id="acc-method" label={s.accounts.form.method}>
          {({ id }) => (
            <Select id={id} value={method} onChange={(e) => setMethod(e.target.value as FinAccount["method"])}>
              <option value="bank">Bank</option><option value="mtn_momo">MTN MoMo</option><option value="airtel_money">Airtel Money</option>
            </Select>
          )}
        </Field>
        <Field id="acc-number" label={s.accounts.form.number} hint={s.accounts.form.numberHint} error={err(errors, "acc-number")}>
          {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="off" inputMode="text" value={number} onChange={(e) => setNumber(e.target.value)} />}
        </Field>
      </Form>
      {dialog}
    </Dialog>
  );
}

export function CallbackDialog({ account, onClose, onConflict }: { account: FinAccount; onClose: () => void; onConflict: () => void }) {
  const s = useS();
  const toast = useToast();
  const m = useConfirmCallback();
  const [idem] = useState(newIdempotencyKey);
  const [checked, setChecked] = useState(false);
  const sub = useSubmit(onConflict);
  return (
    <Dialog open onClose={onClose} title={s.accounts.callbackTitle} description={account.name}
      footer={<Button disabled={!checked} loading={sub.busy} className="m-press" onClick={async () => {
        if (await sub.go(() => m.mutateAsync({ id: account.id, idempotencyKey: idem }))) { toast({ title: s.accounts.callbackDone, tone: "success" }); onClose(); }
      }}><Icon name="phone" size={14} aria-hidden />{s.accounts.callback}</Button>}>
      <div className="grid gap-4">
        <p className="text-body">{fill(s.accounts.callbackBody, { d: account.masked })}</p>
        <Checkbox label={s.accounts.callbackCheck} checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <FailNote text={sub.fail} />
      </div>
    </Dialog>
  );
}

