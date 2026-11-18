"use client";
// Lane E shared bits: copy hooks, the one mutation runner (idempotency key per dialog, step-up, conflict, toast),
// a free-text dialog, offline/executive flags and small display helpers. No money maths here.
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { ApiError, newIdempotencyKey, type ApiCall } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { formatMoney, cx } from "@/shared/format";
import { useFinAct } from "@/lib/finance/e";
import { financeRevenue } from "@/content/pages/finance-revenue";
import { financePayouts } from "@/content/pages/finance-payouts";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Field, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { useOnline } from "@/components/atoms/hooks";
import { useStepUpAction } from "@/components/molecules/finance/finance";

export const useR = () => financeRevenue(useI18n().locale);
export const useP = () => financePayouts(useI18n().locale);
/** Basis points → "40%" / "37.5%" (display only). */
export const pctText = (bps: number) => `${bps / 100}%`;
export const useMoneyText = () => {
  const { locale } = useI18n();
  return (n: number) => formatMoney(n, "RWF", locale);
};

/** Who am I, and may I act? Executives without a finance role are read-only except their own signing steps. */
export function useActor() {
  const { user } = useSession();
  const roles = user?.roles ?? [];
  const exec = roles.some((r) => String(r) === "staff:executive");
  const fin = roles.some((r) => String(r).startsWith("staff:finance"));
  return { me: user ? { id: user.id, name: user.name, roles } : undefined, exec, execOnly: exec && !fin, online: useOnline() };
}

type Act = { req: ApiCall; stepUp?: string; reason?: string };
/**
 * One runner per dialog/record: holds the Idempotency-Key created on mount (DoD #7), optional step-up, maps
 * 409 version_conflict to `conflict` (ConflictDialog) and every other error to a toast. Returns the data or undefined.
 */
export function useRunner() {
  const m = useFinAct();
  const toast = useToast();
  const { locale } = useI18n();
  const [key, setKey] = useState(newIdempotencyKey);
  const [conflict, setConflict] = useState(false);
  const { run: stepUp, dialog } = useStepUpAction();
  async function go<T = unknown>(a: Act, opts: { stepUpWhat?: string; success?: string } = {}): Promise<T | undefined> {
    const exec = (token?: string) => m.mutateAsync({ ...a, idempotencyKey: key, stepUp: token }) as Promise<T>;
    try {
      const r = opts.stepUpWhat ? await stepUp(opts.stepUpWhat, (t) => exec(t)) : await exec();
      if (r === undefined && opts.stepUpWhat) return undefined; // step-up cancelled (toast shown)
      setKey(newIdempotencyKey()); // next action is a new intent
      if (opts.success) toast({ title: opts.success, tone: "success" });
      return r ?? ({} as T);
    } catch (e) {
      if (e instanceof ApiError && e.errorType === "version_conflict") { setConflict(true); return undefined; }
      if (!opts.stepUpWhat) toast({ title: errorCopy(e, locale), tone: "danger" }); // step-up path already toasted
      return undefined;
    }
  }
  return { go, busy: m.isPending, conflict, closeConflict: () => setConflict(false), dialog };
}

/** Free-text dialog (answer, reject, exclude, fail, end-date reason…). Required text; errors inline; m-shake-free. */
export function TextDialog({ open, onClose, title, label, hint, confirm, destructive, required = true, extra, notice, onConfirm }: {
  open: boolean; onClose: () => void; title: string; label: string; hint?: string; confirm: string; destructive?: boolean; required?: boolean;
  extra?: ReactNode; notice?: ReactNode; onConfirm: (text: string) => Promise<boolean | void>;
}) {
  const r = useR();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (required && !text.trim()) return setErr(r.act.answerRequired);
    setBusy(true);
    const okd = await onConfirm(text.trim());
    setBusy(false);
    if (okd !== false) { setText(""); setErr(null); onClose(); }
  };
  return (
    <Dialog open={open} onClose={onClose} title={title} footer={<>
      <Button variant="ghost" onClick={onClose}>{r.cancel}</Button>
      <Button variant={destructive ? "danger" : "primary"} className="m-press" loading={busy} onClick={submit}>{confirm}</Button>
    </>}>
      <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }} className="grid gap-4">
        {notice && <p className="flex gap-2 bg-warning-bg p-3 text-small"><Icon name="shield" size={16} aria-hidden className="mt-0.5 shrink-0" />{notice}</p>}
        {extra}
        <Field label={label} hint={hint} error={err ?? undefined}>
          {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} aria-invalid={invalid} rows={3} value={text} onChange={(e) => { setText(e.target.value); setErr(null); }} />}
        </Field>
      </form>
    </Dialog>
  );
}

/** Offline / executive banner shown above lane pages (money actions disabled with the reason). */
export function LaneBanner({ offline, exec }: { offline?: string | false; exec?: string | false }) {
  const msg = offline || exec;
  if (!msg) return null;
  return (
    <p role="status" className={cx("mb-4 flex items-center gap-2 px-4 py-3 text-small m-rise", offline ? "bg-warning-bg" : "bg-bg-tint")}>
      <Icon name={offline ? "zap" : "lock"} size={16} aria-hidden />{msg}
    </p>
  );
}

/** Stepper-free 3-step header used by builders (desktop) — numbered pills like boards 10/11. */
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s} aria-current={i === current ? "step" : undefined} className="flex items-center gap-2">
          <span className={cx("flex size-7 items-center justify-center rounded-full text-eyebrow m-tone", i < current ? "bg-secondary text-on-navy" : i === current ? "border-2 border-primary bg-surface text-fg-heading" : "border border-border-strong text-fg-subtle")}>
            {i < current ? <Icon name="check" size={14} aria-hidden /> : i + 1}
          </span>
          <span className={cx("text-small", i === current ? "font-medium text-navy-800" : "text-fg-muted")}>{s}</span>
          {i < steps.length - 1 && <span aria-hidden className="mx-1 hidden h-px w-10 bg-border-strong sm:block" />}
        </li>
      ))}
    </ol>
  );
}

/** "Continue on desktop" card for builders on phone (D11). */
export function DesktopOnly({ title, body, back }: { title: string; body: string; back: ReactNode }) {
  return (
    <div className="grid place-items-center gap-3 border border-border bg-surface px-6 py-12 text-center m-rise">
      <span className="flex size-12 items-center justify-center rounded-full bg-navy-50 text-navy-700"><Icon name="laptop" size={22} aria-hidden /></span>
      <p className="text-h3">{title}</p>
      <p className="max-w-sm text-small text-fg-muted">{body}</p>
      {back}
    </div>
  );
}
