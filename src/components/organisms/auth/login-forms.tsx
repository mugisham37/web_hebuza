"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { components } from "@/lib/api/schema";
import { api, unwrap, ApiError } from "@/lib/api/client";
import { localHref } from "@/lib/i18n/provider";
import { homeFor, type Role } from "@/shared/auth/roles";
import { Field, Input, Checkbox, Select } from "@/components/atoms/field";
import { Button } from "@/components/atoms/button";
import { OtpInput, PasswordInput } from "@/components/atoms/inputs";
import {
  AuthTitle,
  Notice,
  ResultPanel,
  Divider,
  useAuthCopy,
  useSubmit,
  useRefreshSession,
  apiMessage,
  safeNext,
} from "@/components/molecules/auth/auth";
import { IdentifierField, readIdentifier, type IdType } from "@/components/molecules/auth/auth";


/** /login (F-IAM-01) with error, lockout, rate-limit and session-expired states (F-IAM-04 UI). */
export function LoginForm() {
  const { c, locale } = useAuthCopy();
  const router = useRouter();
  const sp = useSearchParams();
  const refresh = useRefreshSession();
  const { pending, error, run } = useSubmit();
  const [type, setType] = useState<IdType>("phone");
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const next = safeNext(sp.get("next"));

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const id = readIdentifier(type, String(f.get("identifier") ?? ""));
    const password = String(f.get("password") ?? "");
    const errs: Record<string, string> = {};
    if (!id) errs.identifier = type === "phone" ? c.badPhone : c.badEmail;
    if (!password) errs.password = c.required;
    setFieldErr(errs);
    if (Object.keys(errs).length) return;
    run(async () => {
      const data = await unwrap<components["schemas"]["AuthFlowData"]>(
        api.POST("/api/auth/login", {
          body: {
            identifierType: type,
            identifier: id!,
            password,
            rememberMe: !!f.get("remember"),
          },
        }),
      );
      // No explicit ?next → the signed-in role's own home (sysadmin → /system), not the client dashboard.
      const dest = sp.get("next") ? next : homeFor([data.session.role as Role]);
      // Users who turned 2FA on get only a pre_2fa cookie here; the session starts at /login/2fa.
      if ((data as { mfaRequired?: boolean }).mfaRequired)
        return router.push(localHref(locale, `/login/2fa?next=${encodeURIComponent(dest)}`));
      await refresh();
      router.push(
        localHref(
          locale,
          data.session.isEmailVerified
            ? dest
            : `/verify?to=${encodeURIComponent(type === "phone" ? id! : data.maskedEmail)}&next=${encodeURIComponent(dest)}`,
        ),
      );
    });
  };

  const api_ = error instanceof ApiError ? error : null;
  if (api_?.status === 423 || api_?.errorType === "locked")
    return (
      <ResultPanel icon="lock" tone="warning" title={c.login.locked}>
        <p className="text-body text-fg-muted">
          {apiMessage(error, c.login.lockedBody.replace("{t}", "…"), locale)}
        </p>
        <Link
          href={localHref(locale, "/forgot")}
          className="text-button underline"
        >
          {c.login.forgot}
        </Link>
        <Link
          href={localHref(locale, "/contact")}
          className="text-small underline"
        >
          {c.login.support}
        </Link>
        <TeamAccessRequest kind="unlock" />
      </ResultPanel>
    );

  return (
    <>
      <AuthTitle title={c.login.title} lede={c.login.lede} />
      {sp.get("reason") === "expired" && !error && (
        <Notice tone="info">{c.login.expired}</Notice>
      )}
      {api_?.isRateLimited ? (
        <Notice tone="warning">{c.login.rateLimited}</Notice>
      ) : api_?.isAuth || api_?.status === 400 ? (
        <Notice>{apiMessage(error, c.login.bad, locale)}</Notice>
      ) : error ? (
        <Notice>{c.generic}</Notice>
      ) : null}
      <form noValidate onSubmit={onSubmit} className="grid gap-5">
        <IdentifierField
          type={type}
          onType={setType}
          error={fieldErr.identifier}
        />
        <Field id="password" label={c.password} error={fieldErr.password}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput id={id}
              name="password"
              autoComplete="current-password"
              showLabel={c.show}
              hideLabel={c.hide}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Checkbox
            name="remember"
            defaultChecked
            label={<span className="text-small">{c.login.remember}</span>}
          />
          <Link
            href={localHref(locale, "/forgot")}
            className="text-small underline underline-offset-4"
          >
            {c.login.forgot}
          </Link>
        </div>
        <Button
          type="submit"
          size="lg"
          dots
          loading={pending}
          className="w-full justify-center"
        >
          {c.login.submit}
        </Button>
      </form>
      <Divider label={c.orDivider} />
      <Link
        href={localHref(locale, "/signup")}
        className="text-button underline underline-offset-4"
      >
        {c.login.noAccount}
      </Link>
    </>
  );
}

/**
 * /login/2fa challenge (F-IAM-05): POST /api/auth/mfa/verify finishes the pre_2fa sign-in (real in P1).
 * shortcut: untyped fetch, switch to `api` once schema.d.ts is regenerated from the Next OpenAPI (P0 generator run).
 */
export function TwoFactorForm() {
  const { c, locale } = useAuthCopy();
  const router = useRouter();
  const sp = useSearchParams();
  const refresh = useRefreshSession();
  const { pending, error, setError, run } = useSubmit();
  const [backup, setBackup] = useState(false);
  const [code, setCode] = useState("");

  const verify = (v: string, trust: boolean) =>
    run(async () => {
      await unwrap(api.POST("/api/auth/mfa/verify", { body: { code: v, backup, trustDevice: trust } })).catch((e: unknown) => {
        setCode("");
        throw e instanceof ApiError ? new ApiError(e.status, e.errorType, c.twofa.wrong, e.requestId) : e;
      });
      await refresh();
      router.push(localHref(locale, safeNext(sp.get("next"))));
    });

  return (
    <>
      <AuthTitle
        icon="shield"
        title={backup ? c.twofa.backupTitle : c.twofa.title}
        lede={backup ? undefined : c.twofa.lede}
      />
      {error && (
        <Notice>
          {error instanceof ApiError && error.status < 500
            ? c.twofa.wrong
            : c.generic}
        </Notice>
      )}
      <form
        noValidate
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          verify(
            backup ? String(f.get("backup") ?? "").trim() : code,
            !!f.get("trust"),
          );
        }}
      >
        {backup ? (
          <Field label={c.twofa.backupLabel}>
            {({ id }) => (
              <Input
                id={id}
                name="backup"
                autoComplete="one-time-code"
                placeholder="XXXX-XXXX"
                className="font-mono uppercase"
              />
            )}
          </Field>
        ) : (
          <OtpInput
            id="otp"
            label={c.verify.code}
            value={code}
            invalid={!!error}
            disabled={pending}
            onChange={(v) => {
              setCode(v);
              if (error) setError(null);
            }}
          />
        )}
        <Checkbox name="trust" label={c.twofa.trust} />
        <Button
          type="submit"
          size="lg"
          dots
          loading={pending}
          disabled={!backup && code.length < 6}
          className="w-full justify-center"
        >
          {c.twofa.submit}
        </Button>
        <button
          type="button"
          className="text-button underline underline-offset-4"
          onClick={() => {
            setBackup((b) => !b);
            setError(null);
          }}
        >
          {backup ? c.twofa.useApp : c.twofa.useBackup}
        </button>
      </form>
      <TeamAccessRequest kind="two_factor" />
    </>
  );
}

type AccessKind = "unlock" | "two_factor" | "password" | "other";
/** F-IAM-09/10: staff who lost MFA or are locked out ask the team; a SM/sysadmin verifies and resets (no self-service). */
function TeamAccessRequest({ kind }: { kind: AccessKind }) {
  const { c, locale } = useAuthCopy();
  const a = c.access;
  const { pending, error, run } = useSubmit();
  const [sent, setSent] = useState<{ reference: string; maskedEmail: string } | null>(null);
  const [err, setErr] = useState<string>();
  if (sent)
    return (
      <Notice tone="info">
        {a.sent.replace("{ref}", sent.reference).replace("{to}", sent.maskedEmail)}
      </Notice>
    );
  return (
    <details className="grid gap-3">
      <summary className="cursor-pointer text-small underline underline-offset-4">{a.open}</summary>
      <form
        noValidate
        className="mt-3 grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const email = String(f.get("email") ?? "").trim();
          setErr(/^\S+@\S+\.\S+$/.test(email) ? undefined : c.badEmail);
          if (!/^\S+@\S+\.\S+$/.test(email)) return;
          run(async () => {
            setSent(
              await unwrap<{ reference: string; maskedEmail: string }>(
                api.POST("/api/auth/team/access-request", {
                  body: { email, kind: String(f.get("kind")) as AccessKind, note: String(f.get("note") ?? "").trim() || null },
                }),
              ),
            );
          });
        }}
      >
        <p className="text-small text-fg-muted">{a.lede}</p>
        {error && <Notice>{apiMessage(error, c.generic, locale)}</Notice>}
        <Field label={a.email} error={err}>
          {(f) => <Input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} name="email" type="email" autoComplete="email" className="h-10" />}
        </Field>
        <Field label={a.kind}>
          {(f) => (
            <Select id={f.id} name="kind" defaultValue={kind} className="h-10">
              {(Object.keys(a.kinds) as AccessKind[]).map((k) => <option key={k} value={k}>{a.kinds[k]}</option>)}
            </Select>
          )}
        </Field>
        <Field label={a.note}>
          {(f) => <Input id={f.id} name="note" maxLength={500} className="h-10" />}
        </Field>
        <Button type="submit" variant="outline" loading={pending} className="justify-self-start">{a.submit}</Button>
      </form>
    </details>
  );
}
