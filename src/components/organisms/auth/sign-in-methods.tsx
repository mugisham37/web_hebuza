"use client";
// Settings → Security "Sign-in methods": Google (connect via the OAuth link intent / disconnect behind step-up) and
// Password (set one when the account was created with Google). Mounted next to TwoStepCard.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap, ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/provider";
import { formatRelative } from "@/shared/format";
import { authCopy } from "@/content/pages/client-auth";
import { hdr } from "@/lib/ops/c";
import { apiMessage } from "@/components/molecules/auth/auth";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { PasswordInput, PasswordRules, passwordOk } from "@/components/atoms/inputs";
import { Skeleton, ErrorState } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { useStepUp, StepUpCancelled } from "@/components/atoms/step-up";
import { googleStartHref, useGoogleSignIn } from "@/components/atoms/google-button";

type Identities = {
  identities: { provider: string; email: string; linkedAt: string; lastUsedAt?: string | null }[];
  hasPassword: boolean;
};
const key = ["me", "identities"] as const;

export const useIdentities = () =>
  useQuery({ queryKey: key, queryFn: () => unwrap<Identities>(api.GET("/api/me/identities")) });

export function SignInMethods({ next }: { next: string }) {
  const { locale } = useI18n();
  const a = authCopy(locale);
  const m = a.google.methods;
  const toast = useToast();
  const qc = useQueryClient();
  const ids = useIdentities();
  const enabled = useGoogleSignIn();
  const stepUp = useStepUp();
  const [busy, setBusy] = useState(false);
  const [setting, setSetting] = useState(false);
  const google = ids.data?.identities.find((i) => i.provider === "google");

  const disconnect = async () => {
    setBusy(true);
    try {
      const token = await stepUp.request(m.disconnect + " Google");
      await unwrap(api.DELETE("/api/me/identities/google", { headers: hdr({ stepUp: token }) }));
      toast({ title: m.disconnected, tone: "success" });
      qc.invalidateQueries({ queryKey: key });
    } catch (e) {
      if (e instanceof ApiError && e.errorType === "step_up_required") stepUp.reset();
      if (!(e instanceof StepUpCancelled))
        toast({ title: e instanceof ApiError && e.errorType === "last_sign_in_method" ? m.lastMethod : apiMessage(e, a.generic, locale), tone: "danger" });
    } finally {
      setBusy(false);
    }
  };

  const row = "flex flex-wrap items-center justify-between gap-3 py-3";
  const badge = (on: boolean, label: string) => (
    <span className={on ? "bg-success-bg px-2.5 py-0.5 text-eyebrow font-medium text-success" : "bg-bg-subtle px-2.5 py-0.5 text-eyebrow font-medium text-fg-muted"}>
      {label}
    </span>
  );

  return (
    <>
      {stepUp.dialog}
      <section className="grid gap-2 border border-border bg-white p-5">
        <h2 className="flex items-center gap-2 text-label-lg">
          <Icon name="lock" size={18} aria-hidden className="text-link" />
          {m.title}
        </h2>
        {ids.isPending ? (
          <Skeleton className="h-10" />
        ) : ids.isError ? (
          <ErrorState error={ids.error} onRetry={() => ids.refetch()} />
        ) : (
          <ul className="divide-y divide-border">
            {(enabled || google) && (
              <li className={row}>
                <div className="grid min-w-0 gap-0.5">
                  <p className="flex flex-wrap items-center gap-2 text-label">
                    {m.google} {badge(!!google, google ? m.connected : m.notConnected)}
                  </p>
                  {google && (
                    <p className="truncate text-small text-fg-muted">
                      {google.email}
                      {google.lastUsedAt && ` · ${formatRelative(google.lastUsedAt, locale)}`}
                    </p>
                  )}
                </div>
                {google ? (
                  <Button size="sm" variant="outline" loading={busy} onClick={disconnect}>
                    {m.disconnect}
                  </Button>
                ) : (
                  <a href={googleStartHref("link", next, locale)} className="text-button text-link underline underline-offset-4">
                    {m.connect}
                  </a>
                )}
              </li>
            )}
            <li className={row}>
              <p className="flex flex-wrap items-center gap-2 text-label">
                {m.password} {badge(ids.data.hasPassword, ids.data.hasPassword ? m.set : m.notSet)}
              </p>
              {!ids.data.hasPassword && (
                <Button size="sm" onClick={() => setSetting(true)}>
                  {m.setPassword}
                </Button>
              )}
            </li>
          </ul>
        )}
      </section>
      <Dialog open={setting} onClose={() => setSetting(false)} title={m.setPassword}>
        {setting && (
          <SetPasswordForm
            onDone={() => {
              setSetting(false);
              toast({ title: m.setDone, tone: "success" });
              qc.invalidateQueries({ queryKey: key });
            }}
          />
        )}
      </Dialog>
    </>
  );
}

function SetPasswordForm({ onDone }: { onDone: () => void }) {
  const { locale } = useI18n();
  const a = authCopy(locale);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!passwordOk(pw)) return setErr(a.weakPassword);
        setBusy(true);
        setErr(null);
        try {
          await unwrap(api.PATCH("/api/auth/change-password", { body: { newPassword: pw, confirmPassword: pw } }));
          onDone();
        } catch (x) {
          setErr(apiMessage(x, a.generic, locale));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="grid gap-1.5">
        <span className="text-label">{a.newPassword}</span>
        <PasswordInput
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="new-password"
          showLabel={a.show}
          hideLabel={a.hide}
          aria-invalid={!!err || undefined}
          autoFocus
        />
      </label>
      <PasswordRules value={pw} labels={a.rules} />
      {err && (
        <p role="alert" className="text-small font-medium text-danger">
          {err}
        </p>
      )}
      <Button type="submit" dots loading={busy} className="w-fit">
        {a.google.methods.save}
      </Button>
    </form>
  );
}
