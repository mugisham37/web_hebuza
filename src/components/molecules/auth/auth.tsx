"use client";
import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { stripLocale } from "@/shared/i18n/config";
import { errorCopy } from "@/lib/api/error-copy";
import { ApiError } from "@/lib/api/client";
import { qk } from "@/lib/query/client";
import { cx } from "@/shared/format";
import { authCopy } from "@/content/pages/client-auth";
import { authRolesCopy, isSignInRole, type AuthRole } from "@/content/pages/auth-roles";
import { HighlightWord } from "@/components/atoms/brand";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Field, Input } from "@/components/atoms/field";
import { PhoneInput, Segmented, toE164 } from "@/components/atoms/inputs";

export function useAuthCopy() {
  const { locale } = useI18n();
  return { c: authCopy(locale), locale };
}

export const useRefreshSession = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: qk.session });
};

/** Wraps an async submit: pending flag + ApiError capture. */
export function useSubmit() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const run = async (fn: () => Promise<void>) => {
    if (pending) return; // double-submit guard
    setPending(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setPending(false);
    }
  };
  return { pending, error, setError, run };
}

export function AuthTitle({
  title,
  hi,
  lede,
  icon,
}: {
  title: string;
  hi?: string;
  lede?: ReactNode;
  icon?: IconName;
}) {
  return (
    <header className="mb-8 grid gap-3">
      {icon && (
        <span
          aria-hidden
          data-round
          className="mb-2 flex size-14 items-center justify-center rounded-full bg-navy-50 text-navy-700 ring-1 ring-navy-100"
        >
          <Icon name={icon} size={26} />
        </span>
      )}
      <h1 className="text-h2 text-balance text-fg-heading">
        {title}
        {hi && (
          <>
            {" "}
            <HighlightWord>{hi}</HighlightWord>
          </>
        )}
      </h1>
      {lede && <p className="text-lead text-fg-muted">{lede}</p>}
    </header>
  );
}

export function Notice({
  tone = "danger",
  children,
  className,
}: {
  tone?: "danger" | "info" | "warning" | "success";
  children: ReactNode;
  className?: string;
}) {
  const styles = {
    danger: "border-danger bg-danger-bg text-danger",
    info: "border-info bg-info-bg text-fg",
    warning: "border-warning bg-warning-bg text-fg",
    success: "border-success bg-success-bg text-fg",
  };
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      tabIndex={-1}
      className={cx(
        "mb-6 border-l-4 px-4 py-3 text-body",
        styles[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Centered result panel (success / locked / sent). */
export function ResultPanel({
  icon,
  tone = "success",
  title,
  children,
}: {
  icon: IconName;
  tone?: "success" | "warning" | "neutral";
  title: string;
  children?: ReactNode;
}) {
  const bg = {
    success: "bg-success-bg text-success-icon ring-1 ring-success/30",
    warning: "bg-warning-bg text-warning ring-1 ring-warning/30",
    neutral: "bg-navy-50 text-navy-700 ring-1 ring-navy-100",
  }[tone];
  return (
    <section
      className="grid justify-items-center gap-4 text-center"
      aria-live="polite"
    >
      <span
        aria-hidden
        className={cx(
          "flex size-16 items-center justify-center rounded-full",
          bg,
        )}
      >
        <Icon name={icon} size={30} strokeWidth={2.25} />
      </span>
      <h1 className="text-h2 text-balance text-fg-heading">{title}</h1>
      {children}
    </section>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <p className="my-6 flex items-center gap-3 text-small text-fg-subtle before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
      {label}
    </p>
  );
}

/** User copy for an ApiError's code (never the server's raw message, P0-I18N-1); unknown codes get `fallback`. */
export function apiMessage(e: unknown, fallback: string, locale?: "rw" | "en" | "fr") {
  if (!locale || !(e instanceof ApiError) || e.status >= 500) return fallback;
  const s = errorCopy(e, locale);
  return s === errorCopy(null, locale) ? fallback : s;
}

/** Only same-site relative paths are allowed as ?next= (no open redirect). */
export const safeNext = (n: string | null) =>
  n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";

/** Clears this device's client drafts (wizard, basket) — they hold national ID and DOB (audit P0-PRIV-1). */
export function clearLocalDrafts(store?: Storage) {
  try {
    const s = store ?? localStorage;
    for (const k of Object.keys(s)) if (k.startsWith("hebuza.")) s.removeItem(k);
  } catch {} // storage blocked: nothing was saved either
}

/** Shown instead of submit / pay / download for unverified accounts (F-IAM-02, B5/B6). */
export function VerifyNotice() {
  const { locale } = useI18n();
  const path = usePathname();
  return (
    <Notice tone="warning">
      {errorCopy(new ApiError(403, "unverified", "", null), locale)}{" "}
      <Link
        href={`${localHref(locale, "/verify")}?next=${encodeURIComponent(stripLocale(path))}`}
        className="text-button text-link underline underline-offset-4 hover:text-link-hover"
      >
        {authCopy(locale).shell.verifyCta}
      </Link>
    </Notice>
  );
}

export type IdType = "phone" | "email";

/** Returns the normalised identifier, or null if invalid. */
export const readIdentifier = (type: IdType, raw: string) =>
  type === "phone"
    ? toE164(raw)
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim())
      ? raw.trim().toLowerCase()
      : null;

/** Phone | Email toggle + the matching input (name="identifier", id="identifier"). */
export function IdentifierField({
  type,
  onType,
  error,
  hint,
  emailOnly,
  defaultValue,
}: {
  type: IdType;
  onType: (t: IdType) => void;
  error?: string;
  hint?: string;
  emailOnly?: boolean;
  defaultValue?: string;
}) {
  const { c } = useAuthCopy();
  return (
    <div className="grid gap-4">
      {!emailOnly && <Segmented
        label={`${c.phone} / ${c.email}`}
        value={type}
        onChange={onType}
        options={[
          { value: "phone", label: c.phone },
          { value: "email", label: c.email },
        ]}
      />}
      <Field id="identifier"
        key={type}
        label={type === "phone" ? c.phoneLabel : c.emailLabel}
        hint={hint}
        error={error}
      >
        {({ id, describedBy, invalid }) =>
          type === "phone" ? (
            <PhoneInput
              id={id}
              name="identifier"
              placeholder="788 123 456"
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          ) : (
            <Input
              id={id}
              name="identifier"
              type="email"
              autoComplete="email"
              defaultValue={defaultValue}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )
        }
      </Field>
    </div>
  );
}

const ROLE_KEY = "hebuza.auth.as";
/** Sign-in role hint: ?as= is the source of truth, then the last pick on this device, else client (/team/* → ops). Never sent as authority. */
export function useAuthRole() {
  const sp = useSearchParams();
  const path = usePathname();
  const router = useRouter();
  const { locale } = useI18n();
  const q = sp.get("as");
  let stored: string | null = null;
  try { stored = q ? null : localStorage.getItem(ROLE_KEY); } catch {}
  const role: AuthRole = isSignInRole(q) ? q : isSignInRole(stored) ? stored : /\/team(\/|$)/.test(path) ? "agent" : "client";
  const withAs = (p: string, r: AuthRole = role) => localHref(locale, `${p}${p.includes("?") ? "&" : "?"}as=${r}`);
  const setRole = (r: AuthRole) => {
    try { localStorage.setItem(ROLE_KEY, r); } catch {}
    const n = new URLSearchParams(sp.toString());
    n.set("as", r);
    router.replace(`${path}?${n}`, { scroll: false });
  };
  return { role, setRole, withAs, copy: authRolesCopy(locale) };
}
