"use client";
import { useUrlParams } from "@/lib/url-state";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { components } from "@/lib/api/schema";
import { api, unwrap, ApiError } from "@/lib/api/client";
import { localHref } from "@/lib/i18n/provider";
import type { Locale } from "@/shared/i18n/config";
import {
  Field,
  Input,
  Radio,
  Checkbox,
  ErrorSummary,
} from "@/components/atoms/field";
import { Button } from "@/components/atoms/button";
import {
  PasswordInput,
  PasswordRules,
  passwordOk,
} from "@/components/atoms/inputs";
import {
  AuthTitle,
  Notice,
  useAuthCopy,
  useSubmit,
  useRefreshSession,
  apiMessage,
} from "@/components/molecules/auth/auth";
import { IdentifierField, readIdentifier, type IdType } from "@/components/molecules/auth/auth";

const LANGS: { v: Locale; l: string }[] = [
  { v: "rw", l: "Kinyarwanda" },
  { v: "en", l: "English" },
  { v: "fr", l: "Français" },
];

/** Sign up (F-IAM-01). Also /join with audience="partner". */
export function SignupForm({
  audience = "client",
}: {
  audience?: "client" | "partner";
}) {
  const { c, locale } = useAuthCopy();
  const router = useRouter();
  const refresh = useRefreshSession();
  const { pending, error, run } = useSubmit();
  // Marketing invite links (/signup?name=&email=|phone=) prefill the form.
  const invite = useUrlParams();
  const [type, setType] = useState<IdType>(invite.get("email") ? "email" : "phone");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [password, setPassword] = useState("");
  const [lang, setLang] = useState<Locale>(locale);
  const summary = useRef<HTMLDivElement>(null);
  const head = audience === "partner" ? c.join : c.signup;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    const id = readIdentifier(type, String(f.get("identifier") ?? ""));
    const errs: Record<string, string> = {};
    if (!name) errs.name = c.required;
    if (!id) errs.identifier = type === "phone" ? c.badPhone : c.badEmail;
    if (!passwordOk(password)) errs.password = c.weakPassword;
    if (!f.get("terms")) errs.terms = c.signup.termsRequired;
    setErrors(errs);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() =>
        summary.current?.querySelector<HTMLElement>("[role=alert]")?.focus(),
      );
      return;
    }
    run(async () => {
      try {
        const data = await unwrap<components["schemas"]["AuthFlowData"]>(
          api.POST("/api/auth/signup", {
            body: {
              name,
              identifierType: type,
              identifier: id!,
              password,
              language: lang,
              terms: true,
              audience,
            },
          }),
        );
        await refresh();
        const to = type === "phone" ? id! : data.maskedEmail;
        router.push(
          localHref(
            locale,
            `/verify?to=${encodeURIComponent(to)}`,
          ),
        );
      } catch (e) {
        if (e instanceof ApiError && e.status === 409)
          setErrors({ identifier: c.signup.taken });
        else if (
          e instanceof ApiError &&
          e.fields &&
          Object.keys(e.fields).length
        )
          setErrors(e.fields);
        else throw e;
      }
    });
  };

  const list = Object.entries(errors).map(([field, message]) => ({
    field,
    message,
  }));
  return (
    <>
      <AuthTitle
        title={head.title}
        hi={head.titleHi}
        lede={audience === "partner" ? c.join.lede : c.signup.lede}
      />
      <div ref={summary}>
        <ErrorSummary title={c.fixErrors} errors={list} />
      </div>
      {error && <Notice>{apiMessage(error, c.generic, locale)}</Notice>}
      <form noValidate onSubmit={onSubmit} className="mt-2 grid gap-5">
        <IdentifierField
          type={type}
          onType={setType}
          error={errors.identifier}
          hint={type === "phone" ? c.signup.phoneHint : undefined}
        />
        <Field id="name" label={c.name} error={errors.name}>
          {({ id, describedBy, invalid }) => (
            <Input id={id}
              name="name"
              autoComplete="name"
              defaultValue={invite.get("name") ?? undefined}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </Field>
        <Field id="password" label={c.password} error={errors.password}>
          {({ id, describedBy, invalid }) => (
            <div className="grid gap-2">
              <PasswordInput id={id}
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                showLabel={c.show}
                hideLabel={c.hide}
                aria-describedby={[describedBy, "pw-rules"]
                  .filter(Boolean)
                  .join(" ")}
                aria-invalid={invalid || undefined}
              />
              <PasswordRules id="pw-rules" value={password} labels={c.rules} />
            </div>
          )}
        </Field>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-label">{c.signup.language}</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {LANGS.map((l) => (
              <Radio
                key={l.v}
                name="language"
                label={l.l}
                checked={lang === l.v}
                onChange={() => setLang(l.v)}
              />
            ))}
          </div>
        </fieldset>
        <div id="terms" className="grid gap-1">
          {errors.terms && (
            <p className="text-small font-medium text-danger">{errors.terms}</p>
          )}
          <Checkbox name="terms" label={c.signup.terms} aria-invalid={!!errors.terms || undefined} />
          <p className="flex gap-4 pl-8 text-small">
            <Link className="underline" href={localHref(locale, "/legal/terms")}>{c.signup.termsLink}</Link>
            <Link className="underline" href={localHref(locale, "/legal/privacy")}>{c.signup.privacyLink}</Link>
          </p>
        </div>
        <Button
          type="submit"
          size="lg"
          dots
          loading={pending}
          className="w-full justify-center"
        >
          {c.signup.submit}
        </Button>
        <p className="text-small text-fg-subtle">{c.signup.otpNote}</p>
        <Link
          href={localHref(locale, "/login")}
          className="text-button underline underline-offset-4"
        >
          {c.signup.haveAccount}
        </Link>
      </form>
    </>
  );
}
