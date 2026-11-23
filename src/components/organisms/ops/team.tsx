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
import { cx, formatDate } from "@/shared/format";
import { opsTeam } from "@/content/pages/ops-team";
import {
  acceptInvite,
  mfaVerify,
  staffPasswordRules,
  useInvite,
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
import { MfaEnrol } from "@/components/organisms/auth/mfa-setup";
import { TwoStepCard } from "@/components/organisms/auth/two-step";
import { Field, Input, Checkbox, Switch } from "@/components/atoms/field";
import { Button } from "@/components/atoms/button";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Skeleton, ErrorState } from "@/components/atoms/feedback";
import { useNow } from "@/components/atoms/step-up";

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
            : `/team/workspace${q}`, // 2FA is opt-in: never send anyone to setup
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
export function MfaSetup() {
  const { c, locale } = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const next = safeNext(sp.get("next"));
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
      <MfaEnrol
        onFinish={() =>
          router.push(
            localHref(
              locale,
              `/team/workspace${next ? `?next=${encodeURIComponent(next)}` : ""}`,
            ),
          )
        }
      />
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
  const { c } = useT();
  return (
    <div className="grid gap-5">
      <header>
        <h1 className="text-h2">{c.security.title}</h1>
        <p className="text-body text-fg-muted">{c.security.lede}</p>
      </header>
      <TwoStepCard />
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
