"use client";
import { useState, type ComponentProps } from "react";
import { cx } from "@/shared/format";
import { Input } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";

/**
 * OTP: one real input (autocomplete=one-time-code, paste, SMS autofill, screen readers all work)
 * drawn as N boxes underneath. Calls onComplete once all digits are in (auto-submit, v3).
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  invalid,
  disabled,
  id,
  describedBy,
  label,
  onPaste,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  length?: number;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
  describedBy?: string;
  label?: string;
  onPaste?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative w-fit">
      <div aria-hidden className="flex gap-2">
        {Array.from({ length }, (_, i) => (
          <span
            key={i}
            className={cx(
              "flex h-14 w-11 items-center justify-center rounded-none border bg-white text-h3 tabular-nums transition-colors sm:w-12",
              invalid
                ? "border-danger text-danger"
                : focused && i === Math.min(value.length, length - 1)
                  ? "border-navy-700 ring-2 ring-navy-700/30"
                  : value[i]
                    ? "border-navy-700"
                    : "border-border-strong",
              disabled && "bg-ink-100 text-fg-subtle",
            )}
          >
            {value[i] ?? ""}
          </span>
        ))}
      </div>
      <input
        id={id}
        aria-label={label}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        value={value}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={length}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPaste={onPaste}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, length);
          onChange(v);
          if (v.length === length) onComplete?.(v);
        }}
        className="absolute inset-0 w-full cursor-text bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
      />
    </div>
  );
}

/** Pill segmented control (Phone | Email). Radio group semantics, arrow keys via native radios. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <fieldset
      className={cx("inline-flex rounded-none bg-ink-100 p-1", className)}
    >
      <legend className="sr-only">{label}</legend>
      {options.map((o) => (
        <label
          key={o.value}
          className={cx(
            "cursor-pointer rounded-none px-5 py-2 text-button transition-colors has-focus-visible:outline-2 has-focus-visible:outline-focus",
            value === o.value
              ? "bg-navy-700 text-white"
              : "text-fg-muted hover:text-fg-heading",
          )}
        >
          <input
            type="radio"
            className="sr-only"
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}

/** Password with show/hide toggle. */
export function PasswordInput({
  showLabel,
  hideLabel,
  className,
  ...rest
}: { showLabel: string; hideLabel: string } & Omit<
  ComponentProps<"input">,
  "type"
>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        className={cx("pr-12", className)}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-pressed={show}
        aria-label={show ? hideLabel : showLabel}
        className="absolute inset-y-0 right-1 flex w-11 items-center justify-center text-fg-subtle hover:text-fg-heading"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{show && <path d="M3 3l18 18" />}</svg>
      </button>
    </div>
  );
}

export const passwordRules = (p: string) => ({
  len: p.length >= 8,
  num: /\d/.test(p),
  letter: /[a-z]/i.test(p),
});
export const passwordOk = (p: string) =>
  Object.values(passwordRules(p)).every(Boolean);

/** Live checklist under a new-password field. */
export function PasswordRules({
  value,
  labels,
  id,
}: {
  value: string;
  labels: Record<keyof ReturnType<typeof passwordRules>, string>;
  id?: string;
}) {
  const r = passwordRules(value);
  return (
    <ul id={id} className="grid gap-1 text-small">
      {(Object.keys(r) as (keyof typeof r)[]).map((k) => (
        <li
          key={k}
          className={cx(
            "flex items-center gap-2",
            r[k] ? "text-success" : "text-fg-subtle",
          )}
        >
          <span
            aria-hidden
            className={cx(
              "flex size-4 items-center justify-center rounded-full",
              r[k] ? "bg-success text-white" : "border border-border-strong",
            )}
          >
            {r[k] && <Icon name="check" size={10} strokeWidth={3} />}
          </span>
          {labels[k]}
          <span className="sr-only">{r[k] ? " ✓" : ""}</span>
        </li>
      ))}
    </ul>
  );
}

/** Rwanda phone: fixed +250 prefix. shortcut: RW only, add a country picker when diaspora signups need it. */
export function PhoneInput({
  className,
  ...rest
}: Omit<ComponentProps<"input">, "type">) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-body text-fg-muted"
      >
        +250
      </span>
      <Input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        className={cx("pl-16", className)}
        {...rest}
      />
    </div>
  );
}

/** Normalise a local RW number to E.164; null if it isn't 9 digits starting with 7. */
export function toE164(raw: string): string | null {
  const d = raw.replace(/\D/g, "").replace(/^250/, "").replace(/^0/, "");
  return /^7\d{8}$/.test(d) ? `+250${d}` : null;
}
