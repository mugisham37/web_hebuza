"use client";
import { useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { z } from "zod";
import { useI18n } from "@/lib/i18n/provider";
import { localHref, locales, type Locale } from "@/shared/i18n/config";
import { cx } from "@/shared/format";
import { submitContact, type FormState } from "@/lib/forms/public-forms";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { waLink } from "@/content/marketing";
import { fill, type LBCopy } from "@/content/pages/lb";
import { useUrlParams } from "@/lib/url-state";

type C = LBCopy["contact"];
type Topic = keyof C["topics"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s()-]{9,20}$/;

export const contactSchema = (e: C["e"]) =>
  z.object({
    name: z.string().trim().min(2, e.name).max(120, e.name),
    contact: z
      .string()
      .trim()
      .refine(
        (v) =>
          EMAIL.test(v) || (PHONE.test(v) && v.replace(/\D/g, "").length >= 9),
        e.contact,
      ),
    topic: z.string().min(1, e.topic),
    message: z.string().trim().min(10, e.message).max(4000, e.message),
    consent: z.literal(true, { error: e.consent }),
  });
type FieldKey = "name" | "contact" | "topic" | "message" | "consent";

/** "Copy" pill for the channel card. */
export function CopyPill({
  value,
  label,
  done,
}: {
  value: string;
  label: string;
  done: string;
}) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setOk(true);
          setTimeout(() => setOk(false), 2000);
        } catch {
          /* clipboard blocked: value is visible to copy by hand */
        }
      }}
      className="inline-flex h-8 items-center gap-1.5 bg-navy-50 px-3 text-small font-medium text-navy-700 hover:bg-navy-100"
    >
      <span aria-live="polite">{ok ? done : label}</span>
      <Icon name={ok ? "check" : "file"} size={14} />
    </button>
  );
}

/** Contact form (F-LEAD): zod validation + error summary, honeypot, ?plan= / ?service= prefill, sending / sent / error / rate-limit states. */
export function ContactForm({
  copy,
  plans,
  services,
}: {
  copy: C;
  plans: { id: string; name: string }[];
  services: { slug: string; name: string }[];
}) {
  const { locale } = useI18n();
  const params = useUrlParams();
  const planName = (() => {
    const p = params.get("plan");
    return p
      ? (plans.find(
          (x) => x.id === p || x.name.toLowerCase() === p.toLowerCase(),
        )?.name ?? null)
      : null;
  })();
  const serviceName = (() => {
    const s = params.get("service");
    return s ? (services.find((x) => x.slug === s)?.name ?? null) : null;
  })();
  const prefill = planName
    ? {
        topic: "pricing" as Topic,
        note: fill(copy.prefPlan, { name: planName }),
        msg: fill(copy.prefPlanMsg, { name: planName }),
      }
    : serviceName
      ? {
          topic: "service" as Topic,
          note: fill(copy.prefService, { name: serviceName }),
          msg: fill(copy.prefServiceMsg, { name: serviceName }),
        }
      : null;

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [lang, setLang] = useState<Locale>(locale);
  // null = untouched, so the URL prefill (known only after hydration) shows until the user edits.
  const [topic, setTopic] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState("");
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  // Server Action (progressive enhancement: the form posts without JS too); `dismissed` resets "send another".
  const [res, formAction, pending] = useActionState<FormState, FormData>(submitContact, { k: "idle" });
  const [dismissed, setDismissed] = useState<FormState | null>(null);
  const state: { k: "idle" | "sending" | "error" | "rate" } | { k: "sent"; ref: string | null } =
    pending ? { k: "sending" } : res === dismissed || res.k === "invalid" ? { k: "idle" } : res;
  const summary = useRef<HTMLDivElement>(null);
  const done = useRef<HTMLDivElement>(null);

  const topicV = topic ?? prefill?.topic ?? "";
  const messageV = message ?? prefill?.msg ?? "";

  // Server-side validation failures map onto the same field messages as the client check.
  // Adjusted during render (not in an effect) so a new action result never paints with stale errors first.
  const [seenRes, setSeenRes] = useState(res);
  if (res !== seenRes) {
    setSeenRes(res);
    if (res !== dismissed && res.k === "invalid") {
      const errs: Partial<Record<FieldKey, string>> = {};
      for (const k of res.fields) if (k in copy.e) errs[k as FieldKey] = copy.e[k as FieldKey];
      setErrors(errs);
    }
  }
  useEffect(() => {
    if (res === dismissed) return;
    if (res.k !== "idle") requestAnimationFrame(() => (res.k === "sent" ? done : summary).current?.focus());
  }, [res, dismissed]);

  /** Client check first; only a valid form (or a no-JS post) reaches the action. */
  const submit = (ev: FormEvent) => {
    if (state.k === "sending") return ev.preventDefault();
    const parsed = contactSchema(copy.e).safeParse({ name, contact, topic: topicV, message: messageV, consent });
    if (parsed.success || hp) return setErrors({});
    ev.preventDefault();
    const errs: Partial<Record<FieldKey, string>> = {};
    for (const i of parsed.error.issues) errs[i.path[0] as FieldKey] ??= i.message;
    setErrors(errs);
    requestAnimationFrame(() => summary.current?.focus());
  };


  if (state.k === "sent") {
    return (
      <div
        ref={done}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="grid justify-items-center gap-4 py-10 text-center focus:outline-none"
      >
        <span className="flex size-20 items-center justify-center rounded-full bg-success-bg text-success-icon">
          <Icon name="check" size={40} strokeWidth={2.5} />
        </span>
        <h2 className="text-h3">{copy.sentTitle}</h2>
        <p className="max-w-sm text-body text-fg-muted">
          {state.ref && (
            <>
              {copy.sentRef.split("{ref}")[0]}
              <strong className="text-fg tabular" data-testid="contact-ref">
                {state.ref}
              </strong>
              {copy.sentRef.split("{ref}")[1]}{" "}
            </>
          )}
          {copy.sentBody}
        </p>
        <div className="flex flex-wrap justify-center gap-2.5">
          <ButtonLink href={localHref(locale, "/track")} variant="outline">
            {copy.track}
          </ButtonLink>
          <ButtonLink href={localHref(locale, "/")} dots>
            {copy.home}
          </ButtonLink>
        </div>
        <button
          type="button"
          onClick={() => {
            setDismissed(res);
            setMessage("");
          }}
          className="text-small underline"
        >
          {copy.another}
        </button>
      </div>
    );
  }

  const list = Object.entries(errors) as [FieldKey, string][];
  const field = (
    key: FieldKey,
    label: string,
    control: (p: {
      id: string;
      "aria-invalid"?: true;
      "aria-describedby"?: string;
    }) => ReactNode,
    hint?: string,
  ) => (
    <div className="grid gap-1.5">
      <label htmlFor={`c-${key}`} className="text-label">
        {label}{" "}
        <span aria-hidden className="text-danger">
          *
        </span>
      </label>
      {hint && (
        <p id={`c-${key}-hint`} className="sr-only">
          {hint}
        </p>
      )}
      {control({
        id: `c-${key}`,
        "aria-invalid": errors[key] ? true : undefined,
        "aria-describedby":
          [hint && `c-${key}-hint`, errors[key] && `c-${key}-err`]
            .filter(Boolean)
            .join(" ") || undefined,
      })}
      {errors[key] && (
        <p id={`c-${key}-err`} className="text-small font-medium text-danger">
          {errors[key]}
        </p>
      )}
    </div>
  );
  const ctl =
    "w-full border border-border-strong bg-white px-4 text-body text-fg hover:border-ink-400 placeholder:text-fg-subtle focus:border-navy-700 focus:outline-none aria-invalid:border-danger aria-invalid:bg-danger-bg/40";

  return (
    <form
      action={formAction}
      onSubmit={submit}
      noValidate
      className="grid gap-5"
      aria-busy={state.k === "sending"}
    >
      <div ref={summary} tabIndex={-1} className="focus:outline-none">
        {list.length > 0 && (
          <div
            role="alert"
            className="border-2 border-danger bg-danger-bg p-4"
          >
            <p className="flex items-center gap-2 text-label-lg text-danger">
              <Icon name="x" size={18} />
              {copy.errTitle}
            </p>
            <p className="mt-1 text-small">{copy.errBody}</p>
            <ul className="mt-2 list-disc pl-5 text-small">
              {list.map(([k, m]) => (
                <li key={k}>
                  <a className="underline" href={`#c-${k}`}>
                    {m}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {(state.k === "error" || state.k === "rate") && (
          <div
            role="alert"
            className="border-2 border-danger bg-danger-bg p-4 text-small"
          >
            <p className="text-label-lg text-danger">{copy.errTitle}</p>
            <p className="mt-1">{state.k === "rate" ? copy.rate : copy.fail}</p>
            <a
              href={waLink("Muraho HEBUZA")}
              target="_blank"
              rel="noopener"
              className="mt-2 inline-block font-medium underline"
            >
              WhatsApp ↗
            </a>
          </div>
        )}
      </div>

      {field("name", copy.name, (p) => (
        <input
          {...p}
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cx(ctl, "h-12")}
        />
      ))}
      {field(
        "contact",
        copy.contact,
        (p) => (
          <input
            {...p}
            name="contact"
            autoComplete="email"
            inputMode="email"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={copy.contactHint}
            className={cx(ctl, "h-12")}
          />
        ),
        copy.contactHint,
      )}

      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-label">{copy.language}</legend>
        <div className="flex gap-2">
          {locales.map((l) => (
            <label
              key={l}
              className={cx(
                "relative flex h-10 min-w-16 cursor-pointer items-center justify-center border px-4 text-small font-medium has-focus-visible:outline-2 has-focus-visible:outline-focus",
                lang === l
                  ? "border-secondary bg-secondary text-on-secondary"
                  : "border-border-strong bg-white",
              )}
            >
              <input
                type="radio"
                name="language"
                value={l}
                checked={lang === l}
                onChange={() => setLang(l)}
                className="sr-only"
              />
              {l.toUpperCase()}
            </label>
          ))}
        </div>
      </fieldset>

      {field("topic", copy.topic, (p) => (
        <select
          {...p}
          name="topic"
          value={topicV}
          onChange={(e) => setTopic(e.target.value)}
          className={cx(ctl, "h-12 appearance-none")}
        >
          <option value="" disabled>
            {copy.choose}
          </option>
          {(Object.entries(copy.topics) as [Topic, string][]).map(([k, v]) => (
            <option key={k} value={k}>
              {k === "pricing" && planName ? `${v} — ${planName}` : v}
            </option>
          ))}
        </select>
      ))}
      {prefill && topic === null && (
        <p
          className="flex items-center gap-2 bg-info-bg px-4 py-2.5 text-small font-medium text-info"
          data-testid="contact-prefill"
        >
          <Icon name="sparkle" size={16} />
          {prefill.note}
        </p>
      )}
      {field("message", copy.message, (p) => (
        <textarea
          {...p}
          name="message"
          rows={4}
          value={messageV}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={copy.messageHint}
          className={cx(ctl, "min-h-28 py-3")}
        />
      ))}

      {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
      <div
        aria-hidden
        className="absolute -left-[9999px] h-px w-px overflow-hidden"
      >
        <label htmlFor="c-website">Website</label>
        <input
          id="c-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <label className="flex cursor-pointer items-start gap-3 text-body">
          <input
            id="c-consent"
            name="consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? "c-consent-err" : undefined}
            className="mt-0.5 size-5 shrink-0 accent-navy-700"
          />
          <span>
            {copy.consent}{" "}
            <span aria-hidden className="text-danger">
              *
            </span>
          </span>
        </label>
        {errors.consent && (
          <p id="c-consent-err" className="text-small font-medium text-danger">
            {errors.consent}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          size="lg"
          dots
          loading={state.k === "sending"}
          disabled={state.k === "sending"}
        >
          {state.k === "sending" ? copy.sending : copy.send}
        </Button>
        <p className="text-small text-fg-subtle">{copy.never}</p>
      </div>
      <p className="sr-only" aria-live="polite">
        {state.k === "sending" ? copy.sending : ""}
      </p>
    </form>
  );
}
