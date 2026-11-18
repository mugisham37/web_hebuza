"use client";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import {
  Checkbox,
  ErrorSummary,
  Field,
  Input,
  Select,
} from "@/components/atoms/field";
import { isRwPhone, type LdCopy } from "@/content/pages/ld";
import { useI18n } from "@/lib/i18n/provider";
import { readAttribution } from "@/lib/marketing/use-attribution";
import { api, unwrap } from "@/lib/api/client";

/** Per-channel marketing consent, unchecked by default (F-CRM-02; NTF consent ledger). */
const CONSENT = {
  en: { t: "Keep me informed (optional)", email: "By email", whatsapp: "On WhatsApp", sms: "By SMS" },
  fr: { t: "Me tenir informé (facultatif)", email: "Par e-mail", whatsapp: "Sur WhatsApp", sms: "Par SMS" },
  rw: { t: "Mumenyeshe amakuru (si ngombwa)", email: "Kuri imeyili", whatsapp: "Kuri WhatsApp", sms: "Kuri SMS" },
} as const;
type Ch = "email" | "whatsapp" | "sms";

/** Campaign lead form (F-CRM-02/04): posts to /api/leads with the visitor's first/last touch, campaign and per-channel consent. */
export function LeadForm({
  campaign,
  service,
  copy,
  whatsapp,
  cta,
  channels = ["whatsapp", "sms", "email"],
}: {
  campaign: string;
  service: string;
  copy: LdCopy["campaign"];
  whatsapp: string;
  cta: string;
  /** Channels offered for marketing consent (landing-page form config). */
  channels?: readonly Ch[];
}) {
  const { locale } = useI18n();
  const cc = CONSENT[locale] ?? CONSENT.en;
  const [consent, setConsent] = useState<Record<Ch, boolean>>({ email: false, whatsapp: false, sms: false });
  const honeypot = useRef<HTMLInputElement>(null);
  const [v, setV] = useState({ name: "", phone: "", type: "", agree: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">(
    "idle",
  );
  const box = useRef<HTMLDivElement>(null);
  const set = (k: keyof typeof v, val: string | boolean) => {
    setV((p) => ({ ...p, [k]: val }));
    setErrors((e) => {
      const n = { ...e };
      delete n[k];
      return n;
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (v.name.trim().length < 2) err.name = copy.err.name;
    if (!isRwPhone(v.phone)) err.phone = copy.err.phone;
    if (!v.type) err.type = copy.err.type;
    if (!v.agree) err.agree = copy.err.agree;
    setErrors(err);
    if (Object.keys(err).length)
      return requestAnimationFrame(() =>
        box.current?.querySelector<HTMLElement>("[role=alert]")?.focus(),
      );
    setState("busy");
    try {
      await unwrap<{ received: boolean; ref?: string }>(api.POST("/api/leads", { body: {
        name: v.name.trim(), phone: v.phone.replace(/[\s-]/g, ""), service, campaign, businessType: v.type, landing: location.pathname, language: locale,
        source: "landing_form", attribution: readAttribution(),
        consent: Object.fromEntries(channels.map((c) => [c, consent[c] ? ("in" as const) : ("unknown" as const)])),
        website: honeypot.current?.value ?? "", // honeypot: bots fill it, people never see it
      } }));
      setState("sent");
    } catch {
      setState("error");
    }
  };

  if (state === "sent")
    return (
      <div role="status" className="grid gap-3 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-bg text-success-icon">
          <Icon name="check" size={26} strokeWidth={3} />
        </span>
        <p className="text-h3">{copy.doneT}</p>
        <p className="text-body text-fg-muted">
          {copy.doneB.replace("{phone}", v.phone)}
        </p>
      </div>
    );

  const errList = Object.entries(errors).map(([field, message]) => ({
    field: `lead-${field}`,
    message,
  }));
  return (
    <form
      onSubmit={submit}
      noValidate
      className="grid gap-4"
      aria-labelledby="lead-t"
    >
      <h2 id="lead-t" className="text-h3">
        {copy.formT}
      </h2>
      <div ref={box} className="empty:hidden">
        <ErrorSummary title={copy.errTitle} errors={errList} />
        {state === "error" && (
          <p
            role="alert"
            className="border-2 border-danger bg-danger-bg p-3 text-small"
          >
            {copy.err.send}
          </p>
        )}
      </div>
      <div id="lead-name">
        <Field label={copy.name} error={errors.name}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              autoComplete="name"
              placeholder={copy.namePh}
              value={v.name}
              onChange={(e) => set("name", e.target.value)}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </Field>
      </div>
      <div id="lead-phone">
        <Field label={copy.phone} error={errors.phone}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={copy.phonePh}
              value={v.phone}
              onChange={(e) => set("phone", e.target.value)}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </Field>
      </div>
      <div id="lead-type">
        <Field label={copy.type} error={errors.type}>
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              value={v.type}
              onChange={(e) => set("type", e.target.value)}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            >
              <option value="">{copy.typePh}</option>
              {copy.types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <div id="lead-agree">
        <Checkbox
          label={copy.agree}
          checked={v.agree}
          onChange={(e) => set("agree", e.target.checked)}
          aria-invalid={!!errors.agree || undefined}
          aria-describedby={errors.agree ? "lead-agree-err" : undefined}
          className="text-small"
        />
        {errors.agree && (
          <p
            id="lead-agree-err"
            className="mt-1 text-small font-medium text-danger"
          >
            {errors.agree}
          </p>
        )}
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-small text-fg-muted">{cc.t}</legend>
        {channels.map((c) => (
          <Checkbox key={c} label={cc[c]} checked={consent[c]} onChange={(e) => setConsent((p) => ({ ...p, [c]: e.target.checked }))} className="text-small" />
        ))}
      </fieldset>
      <input ref={honeypot} name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      <Button
        type="submit"
        size="lg"
        dots
        loading={state === "busy"}
        disabled={state === "busy"}
        className="justify-center"
      >
        {state === "busy" ? copy.busy : cta}
      </Button>
      <a
        href={whatsapp}
        target="_blank"
        rel="noopener"
        className="justify-self-center text-label underline-offset-4 hover:underline"
      >
        {copy.or} →
      </a>
    </form>
  );
}
