"use client";
// Settings → Security "Two-step verification" card (F-IAM-05, optional for everyone): Off → Turn on (enrol in a dialog);
// On → regenerate backup codes, trusted devices, Turn off (code or password). Used by client settings and staff security.
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/provider";
import { formatRelative } from "@/shared/format";
import { opsTeam } from "@/content/pages/ops-team";
import { authCopy } from "@/content/pages/client-auth";
import { cKeys, mfaDisable, regenBackupCodes, useDevices, useMfaStatus, useRevokeDevice } from "@/lib/ops/c";
import { apiMessage } from "@/components/molecules/auth/auth";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { OtpInput, PasswordInput } from "@/components/atoms/inputs";
import { Skeleton, ErrorState } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { useStepUp, StepUpCancelled, useNow } from "@/components/atoms/step-up";
import { BackupCodes, MfaEnrol } from "@/components/organisms/auth/mfa-setup";

export function TwoStepCard() {
  const { locale } = useI18n();
  const c = opsTeam(locale);
  const toast = useToast();
  const qc = useQueryClient();
  const mfa = useMfaStatus();
  const stepUp = useStepUp();
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const on = mfa.data?.enrolled === true;
  const refresh = () => qc.invalidateQueries({ queryKey: cKeys.mfa });

  const regen = async () => {
    setBusy(true);
    try {
      const token = await stepUp.request(c.security.regen);
      setCodes((await regenBackupCodes(token)).backupCodes);
      toast({ title: c.security.regenDone, tone: "success" });
    } catch (e) {
      if (e instanceof ApiError && e.errorType === "step_up_required") stepUp.reset();
      if (!(e instanceof StepUpCancelled)) toast({ title: apiMessage(e, c.setup.loadErr), tone: "danger" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {stepUp.dialog}
      <section className="grid gap-3 border border-border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-label-lg">
            <Icon name="shield" size={18} aria-hidden className="text-link" />
            {c.security.twoStep}
          </h2>
          {mfa.isPending ? null : on ? (
            <span className="inline-flex items-center gap-1 bg-success-bg px-2.5 py-0.5 text-eyebrow font-medium text-success">
              <Icon name="check" size={12} aria-hidden />
              {c.security.on}
            </span>
          ) : (
            <span className="bg-bg-subtle px-2.5 py-0.5 text-eyebrow font-medium text-fg-muted">{c.security.off}</span>
          )}
        </div>
        {mfa.isPending ? (
          <Skeleton className="h-10" />
        ) : mfa.isError ? (
          <ErrorState error={mfa.error} onRetry={() => mfa.refetch()} />
        ) : !on ? (
          <>
            <p className="text-small text-fg-muted">{c.security.offBody}</p>
            <Button size="sm" className="w-fit" onClick={() => setEnrolling(true)}>
              {c.security.turnOn}
            </Button>
          </>
        ) : codes ? (
          <BackupCodes codes={codes} finishLabel={c.setup.finish} onFinish={() => setCodes(null)} />
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" loading={busy} onClick={regen}>
              <Icon name="refresh" size={14} aria-hidden />
              {c.security.regen}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDisabling(true)}>
              {c.security.turnOff}
            </Button>
          </div>
        )}
      </section>
      {on && <TrustedDevices />}
      <Dialog open={enrolling} onClose={() => setEnrolling(false)} title={c.security.twoStep}>
        {enrolling && (
          <MfaEnrol
            onFinish={() => {
              setEnrolling(false);
              refresh();
              toast({ title: c.security.enabled, tone: "success" });
            }}
          />
        )}
      </Dialog>
      <DisableDialog
        open={disabling}
        onClose={(done) => {
          setDisabling(false);
          if (done) {
            refresh();
            toast({ title: c.security.disabled, tone: "success" });
          }
        }}
      />
    </>
  );
}

function DisableDialog({ open, onClose }: { open: boolean; onClose: (done?: boolean) => void }) {
  const { locale } = useI18n();
  const c = opsTeam(locale);
  const a = authCopy(locale);
  const [pw, setPw] = useState(false);
  const [v, setV] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const close = (done?: boolean) => (setV(""), setErr(false), setPw(false), onClose(done));
  const submit = async (val = v) => {
    if (busy || !val || (!pw && val.length !== 6)) return;
    setBusy(true);
    try {
      await mfaDisable(pw ? { password: val } : { code: val });
      close(true);
    } catch {
      setErr(true);
      setV("");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={() => close()}
      title={c.security.offTitle}
      description={c.security.offLede}
      footer={
        <>
          <Button variant="outline" onClick={() => close()}>{c.stepUp.cancel}</Button>
          <Button variant="danger" loading={busy} onClick={() => submit()}>{c.security.turnOff}</Button>
        </>
      }
    >
      <form className="grid gap-4" onSubmit={(e) => (e.preventDefault(), submit())}>
        {pw ? (
          <label className="grid gap-1.5">
            <span className="text-label">{c.security.password}</span>
            <PasswordInput
              showLabel={a.show}
              hideLabel={a.hide}
              value={v}
              onChange={(e) => (setV(e.target.value), setErr(false))}
              autoComplete="current-password"
              aria-invalid={err || undefined}
              autoFocus
            />
          </label>
        ) : (
          <OtpInput value={v} onChange={(x) => (setV(x), setErr(false))} onComplete={(x) => submit(x)} invalid={err} label={c.stepUp.code} />
        )}
        {err && <p role="alert" className="text-small font-medium text-danger">{c.security.wrong}</p>}
        <button type="button" onClick={() => (setPw((p) => !p), setV(""), setErr(false))} className="w-fit text-small underline underline-offset-4">
          {pw ? c.security.useCode : c.security.usePassword}
        </button>
      </form>
    </Dialog>
  );
}

function TrustedDevices() {
  const { locale } = useI18n();
  const c = opsTeam(locale);
  const toast = useToast();
  const devices = useDevices();
  const revoke = useRevokeDevice();
  const now = useNow(60_000);
  return (
      <section className="grid gap-3 border border-border bg-white p-5">
        <h2 className="text-label-lg">{c.security.devices}</h2>
        {devices.isPending ? (
          <Skeleton className="h-24" />
        ) : devices.isError ? (
          <ErrorState error={devices.error} onRetry={() => devices.refetch()} />
        ) : devices.data.devices.length === 0 ? (
          <p className="text-small text-fg-muted">{c.security.noDevices}</p>
        ) : (
          <ul className="divide-y divide-border" aria-live="polite">
            {devices.data.devices.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <span className="grid gap-0.5">
                  <span className="flex items-center gap-2 text-label">
                    <Icon
                      name={
                        /android|iphone/i.test(d.label) ? "phone" : "laptop"
                      }
                      size={16}
                      aria-hidden
                    />
                    {d.label} · {d.place}
                    {d.current && (
                      <span className="bg-navy-50 px-2 text-eyebrow text-navy-700">
                        {c.security.thisDevice}
                      </span>
                    )}
                  </span>
                  <span className="text-small text-fg-subtle">
                    {c.security.lastSeen.replace(
                      "{t}",
                      now ? formatRelative(d.lastSeen, locale, now) : "",
                    )}
                  </span>
                </span>
                {!d.current && (
                  <Button
                    size="sm"
                    variant="outline"
                    loading={revoke.isPending && revoke.variables === d.id}
                    onClick={() =>
                      revoke.mutate(d.id, {
                        onSuccess: () =>
                          toast({
                            title: c.security.signedOut.replace("{d}", d.label),
                            tone: "success",
                          }),
                        onError: (e) =>
                          toast({
                            title: apiMessage(e, c.setup.loadErr),
                            tone: "danger",
                          }),
                      })
                    }
                  >
                    {c.security.signOut}
                    <span className="sr-only"> {d.label}</span>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
  );
}
