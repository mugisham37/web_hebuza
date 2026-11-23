"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, unwrap, ApiError } from "@/lib/api/client";
import { localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Icon, type IconName } from "@/components/atoms/icon";
import { OtpInput } from "@/components/atoms/inputs";
import {
  AuthTitle,
  Notice,
  ResultPanel,
  useAuthCopy,
  useAuthRole,
  useSubmit,
  useRefreshSession,
  apiMessage,
  safeNext,
} from "@/components/molecules/auth/auth";

const RESEND_AFTER = 60;

/** /verify — OTP (F-IAM-02) with v3 micro-states: default, typing/pasted, error, resend, verified → welcome. */
export function VerifyForm() {
  const { c, locale } = useAuthCopy();
  const { withAs } = useAuthRole();
  const sp = useSearchParams();
  const router = useRouter();
  const refresh = useRefreshSession();
  const to = sp.get("to");
  const raw = sp.get("next");
  const next = raw && safeNext(raw);
  const [code, setCode] = useState("");
  const [pasted, setPasted] = useState(false);
  const [wait, setWait] = useState(RESEND_AFTER);
  const [resent, setResent] = useState(false);
  const [done, setDone] = useState(false);
  const { pending, error, setError, run } = useSubmit();

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const verify = (v = code) =>
    run(async () => {
      try {
        await unwrap(api.POST("/api/auth/verify-otp", { body: { code: v } }));
        await refresh();
        setDone(true);
        if (next) router.push(localHref(locale, next));
      } catch (e) {
        setCode("");
        throw e;
      }
    });

  if (done && !next) return <Welcome />;
  if (done)
    return (
      <ResultPanel icon="check" title={c.verify.verified}>
        <p className="text-body text-fg-muted">{c.verify.verifiedBody}</p>
      </ResultPanel>
    );

  const wrong =
    error instanceof ApiError && error.status < 500
      ? error.errorType === "expired"
        ? c.verify.expired
        : apiMessage(error, c.verify.wrong, locale)
      : null;
  return (
    <>
      <AuthTitle
        icon="phone"
        title={c.verify.title}
        lede={
          to && (
            <>
              {c.verify.sentTo.replace("{to}", to)} ·{" "}
              <Link href={withAs("/signup")} className="underline">
                {c.verify.change}
              </Link>
            </>
          )
        }
      />
      {error && !wrong && <Notice>{c.generic}</Notice>}
      {resent && <Notice tone="info">{c.verify.resent}</Notice>}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length === 6) verify();
        }}
        className="grid gap-5"
      >
        <div className="grid gap-2">
          <OtpInput
            id="otp"
            label={c.verify.code}
            value={code}
            invalid={!!wrong}
            disabled={pending}
            describedBy={wrong ? "otp-err" : undefined}
            onChange={(v) => {
              setCode(v);
              if (error) setError(null);
            }}
            onComplete={verify}
            onPaste={() => setPasted(true)}
          />
          {wrong && (
            <p
              id="otp-err"
              role="alert"
              className="text-small font-medium text-danger"
            >
              {wrong}
            </p>
          )}
          {pasted && !wrong && code.length === 6 && (
            <p className="w-fit bg-gold-100 px-3 py-1 text-small text-gold-800">
              {c.verify.pasted}
            </p>
          )}
        </div>
        <Button
          type="submit"
          variant="accent"
          size="lg"
          dots
          loading={pending}
          disabled={code.length < 6}
          className="w-full justify-center"
        >
          {c.verify.submit}
        </Button>
        <div className="grid gap-2 text-center text-small">
          {wait > 0 ? (
            <p className="text-fg-subtle" aria-live="off">
              {c.verify.resendIn.replace("{s}", String(wait))}
            </p>
          ) : (
            <button
              type="button"
              className="text-button underline underline-offset-4"
              onClick={() =>
                run(async () => {
                  await unwrap(api.POST("/api/auth/resend-otp"));
                  setResent(true);
                  setWait(RESEND_AFTER);
                })
              }
            >
              {c.verify.resend}
            </button>
          )}
          <p className="text-fg-subtle">{c.verify.slow}</p>
        </div>
      </form>
    </>
  );
}

const CARD_ICONS: IconName[] = ["sparkle", "upload", "message"];

/** v2 welcome: greeting + three next-step cards. */
function Welcome() {
  const { c, locale } = useAuthCopy();
  const { user } = useSession();
  const first = user?.name.split(" ")[0];
  return (
    <section className="grid gap-8" aria-live="polite">
      <AuthTitle
        icon="check"
        title={c.welcome.title}
        hi={first ? `${first}!` : undefined}
        lede={c.welcome.lede}
      />
      <ul className="grid gap-3">
        {c.welcome.cards.map((k, i) => (
          <li key={k.href}>
            <Link
              href={localHref(locale, k.href)}
              className="grid h-full gap-2 border border-border bg-surface p-4 transition-[border-color,box-shadow] hover:border-navy-300 hover:shadow-md focus-visible:border-navy-300"
            >
              <Icon name={CARD_ICONS[i]} size={22} />
              <span className="text-label">{k.t}</span>
              <span className="text-small text-fg-muted">{k.b}</span>
            </Link>
          </li>
        ))}
      </ul>
      <ButtonLink
        href={localHref(locale, "/dashboard")}
        variant="accent"
        size="lg"
        dots
        className="w-fit"
      >
        {c.welcome.dashboard}
      </ButtonLink>
    </section>
  );
}
