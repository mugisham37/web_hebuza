"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { components } from "@/lib/api/schema";
import { api, unwrap, ApiError } from "@/lib/api/client";
import { localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { Field, Input } from "@/components/atoms/field";
import { Button, ButtonLink } from "@/components/atoms/button";
import {
  PasswordInput,
  PasswordRules,
  passwordOk,
  PhoneInput,
  toE164,
} from "@/components/atoms/inputs";
import {
  AuthTitle,
  Notice,
  ResultPanel,
  useAuthCopy,
  useSubmit,
  apiMessage,
} from "@/components/molecules/auth/auth";
import { IdentifierField, readIdentifier, type IdType } from "@/components/molecules/auth/auth";

/** /forgot (F-IAM-03). Always shows the same "sent" state so it can't be used to probe accounts. */
export function ForgotForm() {
  const { c, locale } = useAuthCopy();
  const { pending, error, run } = useSubmit();
  const [type, setType] = useState<IdType>("phone");
  const [err, setErr] = useState<string>();
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (sentTo)
    return (
      <ResultPanel icon="mail" tone="neutral" title={c.forgot.sentTitle}>
        <p className="text-body text-fg-muted">
          {c.forgot.sentBody.replace("{to}", sentTo)}
        </p>
        <Link
          href={localHref(locale, "/login")}
          className="text-button underline"
        >
          {c.forgot.back}
        </Link>
      </ResultPanel>
    );

  return (
    <>
      <AuthTitle title={c.forgot.title} lede={c.forgot.lede} />
      {error && (
        <Notice>
          {error instanceof ApiError && error.isRateLimited
            ? c.login.rateLimited
            : c.generic}
        </Notice>
      )}
      <form
        noValidate
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          const id = readIdentifier(
            type,
            String(new FormData(e.currentTarget).get("identifier") ?? ""),
          );
          setErr(id ? undefined : type === "phone" ? c.badPhone : c.badEmail);
          if (!id) return;
          run(async () => {
            const d = await unwrap<{ maskedEmail?: string }>(
              api.POST("/api/auth/forgot-password", {
                body: {
                  identifierType: type,
                  identifier: id,
                  audience: "client",
                },
              }),
            );
            setSentTo(d.maskedEmail || id);
          });
        }}
      >
        <IdentifierField type={type} onType={setType} error={err} />
        <Button
          type="submit"
          size="lg"
          dots
          loading={pending}
          className="w-full justify-center"
        >
          {c.forgot.submit}
        </Button>
        <Link
          href={localHref(locale, "/login")}
          className="text-button underline underline-offset-4"
        >
          {c.forgot.back}
        </Link>
      </form>
    </>
  );
}

/** /reset?token=… (F-IAM-03). */
export function ResetForm() {
  const { c, locale } = useAuthCopy();
  const token = useSearchParams().get("token");
  const { pending, error, run } = useSubmit();
  const [pw, setPw] = useState("");
  const [errs, setErrs] = useState<{ password?: string; confirm?: string }>({});
  const [done, setDone] = useState(false);

  const bad =
    !token ||
    (error instanceof ApiError &&
      (error.status === 400 ||
        error.status === 404 ||
        error.errorType === "invalid_token"));
  if (bad)
    return (
      <ResultPanel icon="x" tone="warning" title={c.reset.noToken}>
        <ButtonLink href={localHref(locale, "/forgot")} variant="primary">
          {c.reset.again}
        </ButtonLink>
      </ResultPanel>
    );
  if (done)
    return (
      <ResultPanel icon="check" title={c.reset.doneTitle}>
        <p className="text-body text-fg-muted">{c.reset.doneBody}</p>
        <ButtonLink href={localHref(locale, "/login")} variant="primary" dots>
          {c.reset.signIn}
        </ButtonLink>
      </ResultPanel>
    );

  return (
    <>
      <AuthTitle icon="lock" title={c.reset.title} />
      {error && <Notice>{apiMessage(error, c.generic, locale)}</Notice>}
      <form
        noValidate
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          const confirm = String(
            new FormData(e.currentTarget).get("confirm") ?? "",
          );
          const next = {
            password: passwordOk(pw) ? undefined : c.weakPassword,
            confirm: confirm === pw ? undefined : c.mismatch,
          };
          setErrs(next);
          if (next.password || next.confirm) return;
          run(async () => {
            await unwrap(
              api.POST("/api/auth/reset-password", {
                body: { token, password: pw, confirmPassword: confirm },
              }),
            );
            setDone(true);
          });
        }}
      >
        <Field label={c.newPassword} error={errs.password}>
          {({ id, describedBy, invalid }) => (
            <div className="grid gap-2">
              <PasswordInput
                id={id}
                name="password"
                autoComplete="new-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                showLabel={c.show}
                hideLabel={c.hide}
                aria-describedby={[describedBy, "pw-rules"]
                  .filter(Boolean)
                  .join(" ")}
                aria-invalid={invalid || undefined}
              />
              <PasswordRules id="pw-rules" value={pw} labels={c.rules} />
            </div>
          )}
        </Field>
        <Field label={c.confirmPassword} error={errs.confirm}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              name="confirm"
              autoComplete="new-password"
              showLabel={c.show}
              hideLabel={c.hide}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </Field>
        <Button
          type="submit"
          size="lg"
          dots
          loading={pending}
          className="w-full justify-center"
        >
          {c.reset.submit}
        </Button>
      </form>
    </>
  );
}

/** /claim — link a guest request to the signed-in account (F-REQ-04, fixes B7). */
export function ClaimForm() {
  const { c, locale } = useAuthCopy();
  const { status } = useSession();
  const sp = useSearchParams();
  const { pending, error, run } = useSubmit();
  const [errs, setErrs] = useState<{ code?: string; phone?: string }>({});
  const [done, setDone] = useState(false);

  if (done)
    return (
      <ResultPanel icon="check" title={c.claim.doneTitle}>
        <p className="text-body text-fg-muted">{c.claim.doneBody}</p>
        <ButtonLink
          href={localHref(locale, "/requests")}
          variant="primary"
          dots
        >
          {c.claim.open}
        </ButtonLink>
      </ResultPanel>
    );

  const needsLogin =
    status === "anonymous" || (error instanceof ApiError && error.isAuth);
  return (
    <>
      <AuthTitle title={c.claim.title} lede={c.claim.lede} />
      {needsLogin && (
        <Notice tone="info">
          {c.claim.signInFirst}{" "}
          <Link
            className="font-medium underline"
            href={localHref(
              locale,
              `/login?next=${encodeURIComponent("/claim")}`,
            )}
          >
            {c.login.submit}
          </Link>
        </Notice>
      )}
      {error && !needsLogin && (
        <Notice>
          {error instanceof ApiError && error.status < 500
            ? c.claim.mismatch
            : c.generic}
        </Notice>
      )}
      <form
        noValidate
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const code = String(f.get("code") ?? "")
            .trim()
            .toUpperCase();
          const phone = toE164(String(f.get("phone") ?? ""));
          const next = {
            code: code ? undefined : c.required,
            phone: phone ? undefined : c.badPhone,
          };
          setErrs(next);
          if (next.code || next.phone) return;
          run(async () => {
            await unwrap(
              api.POST("/api/applications/claim", {
                body: { code, phone: phone! },
              }),
            );
            setDone(true);
          });
        }}
      >
        <Field label={c.claim.code} hint={c.claim.codeHint} error={errs.code}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="code"
              defaultValue={sp.get("code") ?? ""}
              autoCapitalize="characters"
              className="font-mono uppercase"
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </Field>
        <Field label={c.phoneLabel} hint={c.claim.phoneHint} error={errs.phone}>
          {({ id, describedBy, invalid }) => (
            <PhoneInput
              id={id}
              name="phone"
              placeholder="788 123 456"
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </Field>
        <Button
          type="submit"
          size="lg"
          dots
          loading={pending}
          disabled={needsLogin}
          className="w-full justify-center"
        >
          {c.claim.submit}
        </Button>
      </form>
    </>
  );
}
