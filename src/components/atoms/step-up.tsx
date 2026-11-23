"use client";
// AU7 step-up (spec §2.6): `const { request, dialog } = useStepUp()`; render {dialog}; `const token = await request("override the payment gate")`.
// Resolves with a short-lived token (send it as X-Step-Up-Token, see lib/ops/c `send`); rejects with StepUpCancelled.
// The token is cached until it expires, so a burst of sensitive actions asks once.
import { useRef, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { opsTeam } from "@/content/pages/ops-team";
import { authCopy } from "@/content/pages/client-auth";
import { stepUp, useMfaStatus } from "@/lib/ops/c";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { OtpInput, PasswordInput } from "@/components/atoms/inputs";

export class StepUpCancelled extends Error {
  constructor() {
    super("step-up cancelled");
  }
}
let cached: { token: string; until: number } | null = null;

const phoneQuery = "(max-width: 767px)";
const subscribeMq = (fn: () => void) => {
  const m = window.matchMedia(phoneQuery);
  m.addEventListener("change", fn);
  return () => m.removeEventListener("change", fn);
};
/** True under 768 px (bottom sheet there, PA2). */
export const usePhone = () =>
  useSyncExternalStore(
    subscribeMq,
    () => window.matchMedia(phoneQuery).matches,
    () => false,
  );

/** Wall clock as external state, ticking every `ms` (keeps render pure; 0 on the server). */
export function useNow(ms = 1000) {
  return useSyncExternalStore(
    (fn) => {
      const id = setInterval(fn, ms);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / ms) * ms,
    () => 0,
  );
}

export function useStepUp() {
  const [action, setAction] = useState<string | null>(null);
  const pending = useRef<{
    resolve: (t: string) => void;
    reject: (e: Error) => void;
  } | null>(null);
  const request = (what: string) => {
    if (cached && cached.until > Date.now() + 10_000)
      return Promise.resolve(cached.token);
    return new Promise<string>((resolve, reject) => {
      pending.current = { resolve, reject };
      setAction(what);
    });
  };
  const close = (token?: string) => {
    if (token) pending.current?.resolve(token);
    else pending.current?.reject(new StepUpCancelled());
    pending.current = null;
    setAction(null);
  };
  return {
    request,
    /** Drop the cached token (call when the server answers step_up_required). */
    reset: () => (cached = null),
    dialog: <StepUpDialog action={action} onDone={close} />,
  };
}

export function StepUpDialog({
  action,
  onDone,
}: {
  action: string | null;
  onDone: (token?: string) => void;
}) {
  const { locale } = useI18n();
  const c = opsTeam(locale).stepUp;
  const phone = usePhone();
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // No 2FA on this account → confirm with the password instead of a code.
  const usePw = useMfaStatus(!!action).data?.enrolled === false;
  const finish = (token?: string) => {
    setCode("");
    setErr(null);
    setBackup(false);
    setBusy(false);
    onDone(token);
  };
  const submit = async (v = code) => {
    if (busy || !action) return;
    if (usePw ? !v : backup ? !/^[A-Z0-9]{4}-?[A-Z0-9]{4}$/i.test(v) : v.length !== 6)
      return setErr(c.wrong);
    setBusy(true);
    setErr(null);
    try {
      const r = usePw
        ? await stepUp("", false, action, v)
        : await stepUp(
            backup ? v.toUpperCase().replace(/^(.{4})-?/, "$1-") : v,
            backup,
            action,
          );
      cached = { token: r.token, until: Date.parse(r.expiresAt) };
      finish(r.token);
    } catch {
      setErr(c.wrong);
      setCode("");
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={!!action}
      onClose={() => finish()}
      side={phone ? "bottom" : undefined}
      title={c.title}
      description={action ? c.action.replace("{a}", action) : undefined}
      footer={
        <div className="grid w-full gap-3">
          <p className="flex items-center gap-1.5 text-eyebrow text-fg-subtle">
            <Icon name="shield" size={12} aria-hidden />
            {c.audit}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => finish()}>
              {c.cancel}
            </Button>
            <Button dots loading={busy} onClick={() => submit()}>
              {c.confirm}
            </Button>
          </div>
        </div>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <p className="flex items-start gap-2 rounded-none bg-bg-tint p-3 text-small">
          <Icon
            name="lock"
            size={16}
            aria-hidden
            className="mt-0.5 shrink-0 text-navy-700"
          />
          {usePw ? c.why2 : c.why}
        </p>
        {usePw ? (
          <label className="grid gap-1.5">
            <span className="text-label">{c.password}</span>
            <PasswordInput
              showLabel={authCopy(locale).show}
              hideLabel={authCopy(locale).hide}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="current-password"
              aria-invalid={!!err || undefined}
              autoFocus
            />
          </label>
        ) : backup ? (
          <label className="grid gap-1.5">
            <span className="text-label">{c.backupLabel}</span>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.slice(0, 9))}
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="ABCD-1234"
              aria-invalid={!!err || undefined}
              className="font-mono tracking-widest"
              autoFocus
            />
          </label>
        ) : (
          <div className="grid gap-1.5">
            <span className="text-label">{c.code}</span>
            <OtpInput
              value={code}
              onChange={setCode}
              onComplete={(v) => submit(v)}
              invalid={!!err}
              label={c.code}
            />
          </div>
        )}
        {err && (
          <p role="alert" className="text-small font-medium text-danger">
            {err}
          </p>
        )}
        {!usePw && <button
          type="button"
          onClick={() => {
            setBackup((b) => !b);
            setCode("");
            setErr(null);
          }}
          className="w-fit text-small underline underline-offset-4"
        >
          {backup ? c.useApp : c.backup}
        </button>}
      </form>
    </Dialog>
  );
}
