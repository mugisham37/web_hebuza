"use client";
// U3 staff sign-in & security (board 03 AU1–AU8, PA1). Reuses the client auth pieces (AuthTitle, Notice, ResultPanel, useSubmit)
// and the shared OtpInput / PasswordInput. Flow: sign-in → (setup if un-enrolled) → code → workspace → home.
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api, unwrap, ApiError } from "@/lib/api/client";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { ROLE_META, type Workspace } from "@/shared/auth/roles";
import { cx, formatDate, formatRelative } from "@/shared/format";
import { opsTeam } from "@/content/pages/ops-team";
import {
  acceptInvite,
  mfaEnrol,
  mfaEnrolVerify,
  mfaVerify,
  regenBackupCodes,
  staffPasswordRules,
  useDevices,
  useInvite,
  useRevokeDevice,
  useMfaStatus,
  type MfaStatus,
} from "@/lib/ops/c";
import { useToday } from "@/lib/ops/api";
import {
  AuthTitle,
  Notice,
  ResultPanel,
  useSubmit,
  useRefreshSession,
  apiMessage,
  useAuthCopy,
} from "@/components/molecules/auth/auth";
import { OtpInput, PasswordInput } from "@/components/atoms/inputs";
import { Field, Input, Checkbox, Switch } from "@/components/atoms/field";
import { Button } from "@/components/atoms/button";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Stepper } from "@/components/atoms/misc";
import { Skeleton, ErrorState } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { useStepUp, StepUpCancelled, useNow } from "@/components/atoms/step-up";

const useT = () => {
  const { locale } = useI18n();
  return { c: opsTeam(locale), locale };
};
/** Same-site relative ?next= only (no open redirect). */
const safeNext = (n: string | null) =>
  n && n.startsWith("/") && !n.startsWith("//") ? n : null;
const REMEMBER = "posiba.workspaceRemember";

const mmss = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

// ---------------------------------------------------------------- AU1 accept invitation
export function InviteForm({ token }: { token: string }) {
  const { c, locale } = useT();
  const auth = useAuthCopy().c;
  const router = useRouter();
  const q = useInvite(token);
  const { pending, error, run } = useSubmit();
  const [pw, setPw] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const rules = staffPasswordRules(pw);

  if (q.isPending)
    return (
      <div className="grid gap-4" aria-busy>
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-24" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  const qe = q.error instanceof ApiError ? q.error : null;
  if (qe?.status === 410 || qe?.errorType === "expired" || qe?.status === 404)
    return (
      <ResultPanel
        icon="clock"
        tone="warning"
        title={
          qe.status === 404 ? c.invite.invalidTitle : c.invite.expiredTitle
        }
      >
        <p className="text-body text-fg-muted">
          {qe.status === 404 ? c.invite.invalidBody : c.invite.expiredBody}
        </p>
        <Link
          href={localHref(locale, "/team/sign-in")}
          className="text-button underline"
        >
          {c.invite.signIn}
        </Link>
      </ResultPanel>
    );
  if (q.isError)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const inv = q.data;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const next: Record<string, string> = {};
    if (!String(f.get("name") ?? "").trim()) next.name = c.signIn.required;
    if (!Object.values(rules).every(Boolean))
      next.password = c.invite.passwordErr;
    if (!f.get("agree")) next.agree = c.invite.agreeErr;
    setErrs(next);
    if (Object.keys(next).length) return;
    run(async () => {
      await acceptInvite(token, {
        name: String(f.get("name")).trim(),
        phone: String(f.get("phone") ?? ""),
        password: pw,
      });
      router.push(
        localHref(
          locale,
          `/team/sign-in?invited=1&email=${encodeURIComponent(inv.email)}`,
        ),
      );
    });
  };
  return (
    <>
      <AuthTitle
        title={c.invite.title}
        hi={c.invite.role[inv.role] ?? inv.role}
        lede={
          <span className="grid gap-1 text-small">
            <span>{c.invite.by.replace("{n}", inv.issuedBy)}</span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="calendar" size={14} aria-hidden />
              {c.invite.expires.replace(
                "{d}",
                formatDate(inv.expiresAt, locale),
              )}
            </span>
          </span>
        }
      />
      {error && <Notice>{apiMessage(error, c.setup.loadErr)}</Notice>}
      <form noValidate onSubmit={onSubmit} className="grid gap-5">
        <Field id="name" label={c.invite.name} error={errs.name}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="name"
              defaultValue={inv.name}
              autoComplete="name"
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </Field>
        <Field label={c.invite.email} hint={c.invite.emailLocked}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              value={inv.email}
              readOnly
              aria-describedby={describedBy}
              className="bg-bg-subtle"
            />
          )}
        </Field>
        <Field label={c.invite.phone}>
          {({ id }) => (
            <Input
              id={id}
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
            />
          )}
        </Field>
        <Field id="password" label={c.invite.password} error={errs.password}>
          {({ id, describedBy, invalid }) => (
            <div className="grid gap-2">
              <PasswordInput
                id={id}
                name="password"
                autoComplete="new-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                showLabel={auth.show}
                hideLabel={auth.hide}
                aria-describedby={cx(describedBy, `${id}-rules`) || undefined}
                aria-invalid={invalid || undefined}
              />
              <ul
                id={`${id}-rules`}
                className="grid gap-1 text-small sm:grid-cols-2"
              >
                {(Object.keys(rules) as (keyof typeof rules)[]).map((k) => (
                  <li
                    key={k}
                    className={cx(
                      "flex items-center gap-2",
                      rules[k] ? "text-success" : "text-fg-subtle",
                    )}
                  >
                    <Icon
                      name={rules[k] ? "check" : "minus"}
                      size={14}
                      aria-hidden
                    />
                    {c.invite.rules[k]}
                    <span className="sr-only">{rules[k] ? " ✓" : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Field>
        <div className="grid gap-1">
          <Checkbox
            name="agree"
            label={<span className="text-small">{c.invite.agree}</span>}
            aria-invalid={!!errs.agree || undefined}
          />
          {errs.agree && (
            <p className="text-small font-medium text-danger">{errs.agree}</p>
          )}
        </div>
        <Button type="submit" size="lg" dots loading={pending}>
          {c.invite.submit}
        </Button>
      </form>
    </>
  );
}

// ---------------------------------------------------------------- AU2 team sign-in (+ PA1)
export function TeamSignIn() {
  const { c, locale } = useT();
  const auth = useAuthCopy().c;
  const router = useRouter();
  const sp = useSearchParams();
  const refresh = useRefreshSession();
  const { pending, error, setError, run } = useSubmit();
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const now = useNow(1000);
  const next = safeNext(sp.get("next"));
  const left = lockedUntil ? Math.ceil((lockedUntil - now) / 1000) : 0;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    const v: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) v.email = c.signIn.badEmail;
    if (!password) v.password = c.signIn.required;
    setErrs(v);
    if (Object.keys(v).length) return;
    run(async () => {
      try {
        await unwrap(
          api.POST("/api/auth/login", {
            body: {
              identifierType: "email",
              identifier: email,
              password,
              rememberMe: !!f.get("keep"),
            },
          }),
        );
      } catch (err) {
        if (
          err instanceof ApiError &&
          (err.status === 423 || err.errorType === "locked")
        )
          setLockedUntil(Date.now() + 15 * 60_000);
        throw err;
      }
      await refresh();
      const q = next ? `?next=${encodeURIComponent(next)}` : "";
      const status = await unwrap<MfaStatus>(api.GET("/api/auth/mfa/status"));
      router.push(
        localHref(
          locale,
          status.enrolled
            ? status.trustedDevice
              ? `/team/workspace${q}`
              : `/team/mfa${q}`
            : `/team/mfa/setup${q}`,
        ),
      );
    });
  };

  const apiErr = error instanceof ApiError ? error : null;
  if (lockedUntil && left > 0)
    return (
      <ResultPanel icon="lock" tone="warning" title={c.signIn.lockedTitle}>
        <p className="text-body text-fg-muted">{c.signIn.lockedBody}</p>
        <p
          className="bg-ink-100 px-4 py-1.5 text-label tabular"
          aria-live="off"
        >
          {c.signIn.unlocksIn.replace("{t}", mmss(left))}
        </p>
      </ResultPanel>
    );
  return (
    <>
      <AuthTitle title={c.signIn.title} lede={c.signIn.lede} icon="shield" />
      {sp.get("reason") === "expired" && !error && (
        <Notice tone="info">{c.signIn.expired}</Notice>
      )}
      {lockedUntil && left <= 0 && !pending && (
        <Notice tone="info">
          <button
            type="button"
            className="underline"
            onClick={() => (setLockedUntil(null), setError(null))}
          >
            {c.signIn.tryAgain}
          </button>
        </Notice>
      )}
      {apiErr?.isRateLimited ? (
        <Notice tone="warning">{c.signIn.rateLimited}</Notice>
      ) : apiErr?.isAuth || apiErr?.status === 400 ? (
        <Notice>{apiMessage(error, c.signIn.bad)}</Notice>
      ) : error && !lockedUntil ? (
        <Notice>{apiMessage(error, c.setup.loadErr)}</Notice>
      ) : null}
      <form noValidate onSubmit={onSubmit} className="grid gap-5">
        <Field id="email" label={c.signIn.email} error={errs.email}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              defaultValue={sp.get("email") ?? ""}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </Field>
        <Field id="password" label={c.signIn.password} error={errs.password}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              name="password"
              autoComplete="current-password"
              showLabel={auth.show}
              hideLabel={auth.hide}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Checkbox
            name="keep"
            defaultChecked
            label={<span className="text-small">{c.signIn.keep}</span>}
          />
          <Link
            href={localHref(locale, "/forgot")}
            className="text-small underline underline-offset-4"
          >
            {c.signIn.forgot}
          </Link>
        </div>
        <Button type="submit" size="lg" dots loading={pending}>
          {c.signIn.submit}
        </Button>
      </form>
      <p className="mt-6 flex items-center gap-2 bg-bg-tint px-4 py-3 text-small">
        <Icon
          name="shield"
          size={16}
          aria-hidden
          className="shrink-0 text-link"
        />
        {c.signIn.mfaNote}
      </p>
      <Link
        href={localHref(locale, "/login")}
        className="mt-4 text-small underline underline-offset-4"
      >
        {c.signIn.client}
      </Link>
    </>
  );
}

// ---------------------------------------------------------------- AU3 + AU4 MFA setup
function CodeRing({ period }: { period: number }) {
  const { c } = useT();
  const now = useNow(1000);
  const left = now ? period - (Math.floor(now / 1000) % period) : period;
  const r = 9,
    len = 2 * Math.PI * r;
  return (
    <span className="inline-flex items-center gap-2 text-small text-fg-muted tabular">
      <svg viewBox="0 0 24 24" className="size-6 -rotate-90" aria-hidden>
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke="var(--color-ink-100)"
          strokeWidth="3"
        />
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke={left <= 5 ? "var(--color-danger)" : "var(--color-navy-700)"}
          strokeWidth="3"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - left / period)}
        />
      </svg>
      {c.setup.expiresIn.replace("{s}", String(left))}
    </span>
  );
}

function CopyBtn({ text, label }: { text: string; label: string }) {
  const { c } = useT();
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        await navigator.clipboard?.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      <Icon name={done ? "check" : "file"} size={14} aria-hidden />
      {done ? c.setup.copied : label}
      <span className="sr-only" aria-live="polite">
        {done ? c.setup.copied : ""}
      </span>
    </Button>
  );
}

export function BackupCodes({
  codes,
  onFinish,
  finishLabel,
}: {
  codes: string[];
  onFinish: () => void;
  finishLabel: string;
}) {
  const { c } = useT();
  const [stored, setStored] = useState(false);
  const text = codes.join("\n");
  return (
    <div className="grid gap-5">
      <p className="text-body text-fg-muted">{c.setup.codesBody}</p>
      <ol
        className="grid grid-cols-2 gap-2 border border-border bg-white p-4 font-mono text-body tabular print:border-0"
        aria-label={c.setup.codesTitle}
      >
        {codes.map((k) => (
          <li
            key={k}
            className="bg-bg-subtle px-3 py-2 text-center tracking-wider"
          >
            {k}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(
              new Blob([`HEBUZA backup codes\n\n${text}\n`], {
                type: "text/plain",
              }),
            );
            a.download = "hebuza-backup-codes.txt";
            a.click();
            URL.revokeObjectURL(a.href);
          }}
        >
          <Icon name="upload" size={14} aria-hidden className="rotate-180" />
          {c.setup.download}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => window.print()}
        >
          {c.setup.print}
        </Button>
        <CopyBtn text={text} label={c.setup.copyAll} />
      </div>
      <Checkbox
        checked={stored}
        onChange={(e) => setStored(e.target.checked)}
        label={<span className="text-small">{c.setup.stored}</span>}
      />
      <Button
        size="lg"
        dots
        disabled={!stored}
        aria-describedby={stored ? undefined : "finish-hint"}
        onClick={onFinish}
      >
        {finishLabel}
      </Button>
      {!stored && (
        <p id="finish-hint" className="-mt-3 text-small text-fg-subtle">
          {c.setup.finishHint}
        </p>
      )}
    </div>
  );
}

export function MfaSetup() {
  const { c, locale } = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const [step, setStep] = useState(0);
  const [enrol, setEnrol] = useState<Awaited<
    ReturnType<typeof mfaEnrol>
  > | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const { pending, error, setError, run } = useSubmit();
  const next = safeNext(sp.get("next"));

  const start = () =>
    run(async () => {
      setEnrol(await mfaEnrol());
      setStep(1);
    });
  const verify = (v = code) =>
    run(async () => {
      try {
        const r = await mfaEnrolVerify(v);
        setCodes(r.backupCodes);
        setStep(3);
      } catch (e) {
        setCode("");
        throw e;
      }
    });
  const bad = error instanceof ApiError && error.status === 400;

  return (
    <>
      <p
        role="status"
        className="mb-6 flex items-center gap-2 border-l-3 border-gold-400 bg-gold-50 px-4 py-3 text-small font-medium text-fg"
      >
        <Icon name="lock" size={16} aria-hidden />
        {c.setup.banner}
      </p>
      <AuthTitle title={c.setup.title} />
      <div
        className="mb-8 overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label={c.setup.title}
      >
        <Stepper steps={c.setup.steps} current={step} />
      </div>
      {error && !bad && <Notice>{c.setup.loadErr}</Notice>}
      {step === 0 && (
        <section className="grid gap-5">
          <h2 className="text-h3">{c.setup.installTitle}</h2>
          <p className="text-body text-fg-muted">{c.setup.installBody}</p>
          <ul className="flex flex-wrap gap-2 text-small">
            {[
              "Google Authenticator",
              "Microsoft Authenticator",
              "1Password",
            ].map((a) => (
              <li key={a} className="bg-bg-subtle px-3 py-1">
                {a}
              </li>
            ))}
          </ul>
          <Button size="lg" dots loading={pending} onClick={start}>
            {c.setup.haveIt}
          </Button>
        </section>
      )}
      {step === 1 && enrol && (
        <section className="grid gap-5">
          <h2 className="text-h3">{c.setup.scanTitle}</h2>
          <p className="text-body text-fg-muted">{c.setup.scanBody}</p>
          <div className="grid items-center gap-4 border border-border bg-white p-4 sm:grid-cols-[10rem_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element -- server-rendered data URI */}
            <img
              src={enrol.qrSvg}
              alt={c.setup.qr}
              width={160}
              height={160}
              className="mx-auto size-40"
            />
            <div className="grid gap-2">
              <span className="text-label">{c.setup.key}</span>
              <code className="bg-bg-subtle px-3 py-2 font-mono text-body tracking-widest break-all">
                {enrol.secret.replace(/(.{4})/g, "$1 ").trim()}
              </code>
              <CopyBtn text={enrol.secret} label={c.setup.copy} />
            </div>
          </div>
          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>
              {c.setup.back}
            </Button>
            <Button dots onClick={() => setStep(2)}>
              {c.setup.next}
            </Button>
          </div>
        </section>
      )}
      {step === 2 && enrol && (
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            verify();
          }}
        >
          <h2 className="text-h3">{c.setup.verifyTitle}</h2>
          <p className="text-body text-fg-muted">{c.setup.verifyBody}</p>
          <OtpInput
            value={code}
            onChange={(v) => (setCode(v), setError(null))}
            onComplete={(v) => verify(v)}
            invalid={bad}
            label={c.setup.codeLabel}
            describedBy={bad ? "enrol-err" : undefined}
          />
          <CodeRing period={enrol.periodS} />
          {bad && (
            <p
              id="enrol-err"
              role="alert"
              className="text-small font-medium text-danger"
            >
              {c.setup.mismatch}
            </p>
          )}
          <div className="flex justify-between gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              {c.setup.back}
            </Button>
            <Button
              type="submit"
              dots
              loading={pending}
              disabled={code.length !== 6}
            >
              {c.setup.verify}
            </Button>
          </div>
        </form>
      )}
      {step === 3 && codes && (
        <section className="grid gap-4">
          <h2 className="text-h3">{c.setup.codesTitle}</h2>
          <BackupCodes
            codes={codes}
            finishLabel={c.setup.finish}
            onFinish={() =>
              router.push(
                localHref(
                  locale,
                  `/team/workspace${next ? `?next=${encodeURIComponent(next)}` : ""}`,
                ),
              )
            }
          />
        </section>
      )}
    </>
  );
}

// ---------------------------------------------------------------- AU5 code challenge
export function MfaChallenge() {
  const { c, locale } = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const [backup, setBackup] = useState(false);
  const [code, setCode] = useState("");
  const [trust, setTrust] = useState(false);
  const [ok, setOk] = useState(false);
  const { pending, error, setError, run } = useSubmit();
  const next = safeNext(sp.get("next"));
  const submit = (v = code) =>
    run(async () => {
      try {
        await mfaVerify(backup ? v.toUpperCase() : v, backup, trust);
      } catch (e) {
        setCode("");
        throw e;
      }
      setOk(true);
      router.push(
        localHref(
          locale,
          `/team/workspace${next ? `?next=${encodeURIComponent(next)}` : ""}`,
        ),
      );
    });
  return (
    <>
      <AuthTitle
        title={backup ? c.mfa.backupTitle : c.mfa.title}
        lede={backup ? c.mfa.backupLede : c.mfa.lede}
        icon="lock"
      />
      {error && (
        <Notice>
          {error instanceof ApiError && error.status === 400
            ? c.mfa.wrong
            : c.setup.loadErr}
        </Notice>
      )}
      {ok && (
        <p
          role="status"
          className="mb-4 inline-flex w-fit items-center gap-1.5 bg-success px-3 py-1 text-small font-medium text-white"
        >
          <Icon name="check" size={14} aria-hidden />
          {c.mfa.verified}
        </p>
      )}
      <form
        noValidate
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {backup ? (
          <Field label={c.mfa.backupLabel}>
            {({ id }) => (
              <Input
                id={id}
                value={code}
                onChange={(e) => (
                  setCode(e.target.value.slice(0, 9)),
                  setError(null)
                )}
                placeholder="ABCD-1234"
                autoComplete="off"
                className="font-mono tracking-widest"
              />
            )}
          </Field>
        ) : (
          <OtpInput
            value={code}
            onChange={(v) => (setCode(v), setError(null))}
            onComplete={(v) => submit(v)}
            invalid={!!error}
            label={c.setup.codeLabel}
          />
        )}
        <Checkbox
          checked={trust}
          onChange={(e) => setTrust(e.target.checked)}
          label={<span className="text-small">{c.mfa.trust}</span>}
        />
        <Button type="submit" size="lg" dots loading={pending}>
          {c.mfa.verify}
        </Button>
      </form>
      <button
        type="button"
        onClick={() => (setBackup((b) => !b), setCode(""), setError(null))}
        className="mt-5 w-fit text-small underline underline-offset-4"
      >
        {backup ? c.mfa.useApp : c.mfa.useBackup}
      </button>
      <p className="mt-3 text-small text-fg-subtle">{c.mfa.lost}</p>
    </>
  );
}

// ---------------------------------------------------------------- AU6 choose workspace
const WS_ICON: Partial<Record<Workspace, IconName>> = {
  ops: "layers",
  agent: "briefcase",
  finance: "wallet",
  work: "users",
  exec: "chart",
  system: "shield",
};
const homeOf = (w: Workspace) =>
  Object.values(ROLE_META).find((m) => m.workspace === w)?.home ?? "/";

export function WorkspacePicker() {
  const { c, locale } = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const { user, status, workspaces, setActiveWorkspace } = useSession();
  const today = useToday();
  const [remember, setRemember] = useState(false);
  const next = safeNext(sp.get("next"));
  if (status === "loading")
    return (
      <div className="grid gap-3" aria-busy>
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  const open = (w: Workspace) => {
    setActiveWorkspace(w);
    try {
      if (remember) localStorage.setItem(REMEMBER, w);
      else localStorage.removeItem(REMEMBER);
    } catch {}
    router.push(
      localHref(locale, next && next.startsWith(homeOf(w)) ? next : homeOf(w)),
    );
  };
  const first = user?.name.split(" ")[0] ?? "";
  return (
    <>
      <AuthTitle title={c.workspace.title} hi={first} lede={c.workspace.lede} />
      {workspaces.length === 0 ? (
        <Notice tone="info">{c.workspace.none}</Notice>
      ) : (
        <ul className="grid gap-3">
          {workspaces.map((w) => {
            const card = c.workspace.cards[w];
            return (
              <li key={w}>
                <button
                  type="button"
                  onClick={() => open(w)}
                  className="grid w-full grid-cols-[3rem_1fr_auto] items-center gap-4 border border-border bg-white p-4 text-left transition-[border-color,box-shadow] hover:border-navy-300 hover:shadow-sm"
                >
                  <span
                    aria-hidden
                    className="flex size-12 items-center justify-center rounded-full bg-navy-100 text-navy-700"
                  >
                    <Icon name={WS_ICON[w] ?? "user"} size={22} />
                  </span>
                  <span className="grid gap-0.5">
                    <span className="text-label-lg">{card?.name ?? w}</span>
                    <span className="text-small text-fg-muted">
                      {card?.body}
                      {w === "ops" && today.data
                        ? ` · ${c.workspace.newRequests.replace("{n}", String(today.data.intake))}`
                        : ""}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-button">
                    {c.workspace.open}
                    <Icon name="arrowRight" size={16} aria-hidden />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Switch
        className="mt-6"
        checked={remember}
        onChange={(e) => setRemember(e.target.checked)}
        label={<span className="text-small">{c.workspace.remember}</span>}
      />
    </>
  );
}

// ---------------------------------------------------------------- AU8 security panel (also for /settings/security)
export function StaffSecurityPanel() {
  const { c, locale } = useT();
  const toast = useToast();
  const mfa = useMfaStatus();
  const devices = useDevices();
  const revoke = useRevokeDevice();
  const stepUp = useStepUp();
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const now = useNow(60_000);
  const regen = async () => {
    setBusy(true);
    try {
      const token = await stepUp.request(c.security.regen);
      setCodes((await regenBackupCodes(token)).backupCodes);
      toast({ title: c.security.regenDone, tone: "success" });
    } catch (e) {
      if (e instanceof ApiError && e.errorType === "step_up_required")
        stepUp.reset();
      if (!(e instanceof StepUpCancelled))
        toast({ title: apiMessage(e, c.setup.loadErr), tone: "danger" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-5">
      {stepUp.dialog}
      <header>
        <h1 className="text-h2">{c.security.title}</h1>
        <p className="text-body text-fg-muted">{c.security.lede}</p>
      </header>
      <section className="grid gap-3 border border-border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-label-lg">
            <Icon name="shield" size={18} aria-hidden className="text-link" />
            {c.security.twoStep}
          </h2>
          {mfa.data?.enrolled !== false && (
            <span className="inline-flex items-center gap-1 bg-success-bg px-2.5 py-0.5 text-eyebrow font-medium text-success">
              <Icon name="check" size={12} aria-hidden />
              {c.security.on}
            </span>
          )}
        </div>
        {codes ? (
          <BackupCodes
            codes={codes}
            finishLabel={c.setup.finish}
            onFinish={() => setCodes(null)}
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            loading={busy}
            onClick={regen}
          >
            <Icon name="refresh" size={14} aria-hidden />
            {c.security.regen}
          </Button>
        )}
      </section>
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
      <section className="grid gap-2 border border-dashed border-border-strong bg-bg-subtle p-5">
        <h2 className="flex items-center gap-2 text-label">
          <Icon name="mail" size={16} aria-hidden />
          {c.security.alertTitle}
        </h2>
        <p className="text-small text-fg-muted">
          {c.security.alertBody
            .replace("{d}", "Android app")
            .replace("{p}", "Kigali")}
        </p>
      </section>
    </div>
  );
}
