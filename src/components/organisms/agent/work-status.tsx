"use client";
// /join/status (Stage 8 lane A, board 03 AP3/AP4, plan §7.3): ref + email → email OTP → tracker. The application
// is kept in memory only (never in the URL beyond the ref); info_requested unlocks only the flagged fields.
import { useState } from "react";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { formatDate } from "@/shared/format";
import { Icon } from "@/components/atoms/icon";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Field, Input, Textarea } from "@/components/atoms/field";
import { OtpInput } from "@/components/atoms/inputs";
import { useToast } from "@/components/atoms/toast";
import { errorCopy } from "@/lib/api/error-copy";
import { useUrlParams } from "@/lib/url-state";
import { workApply } from "@/content/pages/work-apply";
import { fill } from "@/content/pages/work-common";
import { POLICY } from "@/shared/policy";
import { useRequestOtp, useResubmit, useVerifyOtp, type StatusView } from "@/lib/work/a";
import { ApplicationTracker } from "@/components/molecules/agent/agent";

export function ApplicationStatus() {
  const { locale } = useI18n();
  const c = workApply(locale);
  const params = useUrlParams();
  const [ref, setRef] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [view, setView] = useState<StatusView | null>(null);
  const otp = useRequestOtp();
  const verify = useVerifyOtp();
  const refVal = ref ?? params.get("ref") ?? "";

  if (view) return <StatusCard view={view} setView={setView} reset={() => { setView(null); setSent(false); setCode(""); }} />;

  return (
    <div className="grid gap-6 m-rise">
      <header>
        <h1 className="text-h3">{c.status.title}</h1>
        <p className="mt-2 text-body text-fg-muted">{c.status.intro}</p>
      </header>
      {!sent ? (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!refVal.trim() || !email.trim()) return;
            otp.mutate({ ref: refVal.trim(), email: email.trim() }, { onSuccess: () => setSent(true) });
          }}
        >
          <Field id="ref" label={c.status.ref} hint={c.status.refHint}>
            {(f) => <Input id={f.id} aria-describedby={f.describedBy} required value={refVal} onChange={(e) => setRef(e.target.value.toUpperCase())} className="tabular"autoCapitalize="characters" />}
          </Field>
          <Field id="email" label={c.status.email}>
            {(f) => <Input id={f.id} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
          </Field>
          {otp.isError && <p role="alert"className="text-small text-danger">{errorCopy(otp.error, locale)}</p>}
          <Button type="submit" loading={otp.isPending}>
            {c.status.sendCode}
          </Button>
        </form>
      ) : (
        <form
          className="grid gap-4 m-rise"
          onSubmit={(e) => {
            e.preventDefault();
            verify.mutate({ ref: refVal.trim(), email: email.trim(), code }, { onSuccess: setView });
          }}
        >
          <Field id="code" label={c.status.code} hint={fill(c.status.codeHint, { email })}>
            {(f) => <OtpInput id={f.id} describedBy={f.describedBy} value={code} onChange={setCode} invalid={verify.isError} label={c.status.code} />}
          </Field>
          {verify.isError && (
            <p role="alert"className="text-small text-danger m-shake">
              {(verify.error as { isNotFound?: boolean })?.isNotFound ? c.status.notFound : errorCopy(verify.error, locale)}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={verify.isPending} disabled={code.length < 6}>
              {c.status.verify}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setSent(false)}>
              {c.back}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function StatusCard({ view, setView, reset }: { view: StatusView; setView: (v: StatusView) => void; reset: () => void }) {
  const { locale } = useI18n();
  const c = workApply(locale);
  const toast = useToast();
  const resubmit = useResubmit();
  const [patch, setPatch] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(view.draft).map(([k, v]) => [k, String(v ?? "")])));
  const flagged = view.status === "info_requested" ? (view.flaggedFields ?? []) : [];
  const label = (k: string) => (k === "regNumber" ? c.f.regNumber : k === "expertise" ? c.f.expertise : k);
  const tone = view.status === "approved" ? "bg-success-bg" : view.status === "rejected" || view.status === "invite_expired" ? "bg-ink-100" : view.status === "info_requested" ? "bg-warning-bg" : "bg-tint";
  return (
    <div className="grid gap-6 m-rise">
      <header>
        <p className="text-eyebrow uppercase text-fg-subtle tabular">{view.ref}</p>
        <h1 className="mt-1 text-h3">{view.name}</h1>
        <p className="text-small text-fg-muted">{fill(c.status.submitted, { d: formatDate(view.submittedAt, locale) })}</p>
      </header>
      <ApplicationTracker status={view.status} c={c} />
      <p role="status"className={`px-4 py-3 text-body ${tone}`}>
        {fill(c.status.states[view.status], { months: POLICY.rejectedRetentionMonths })}
      </p>
      {view.decisionNote && (
        <blockquote className="border border-border bg-white px-4 py-3 text-small">
          <p className="text-eyebrow uppercase text-fg-subtle">{c.status.note}</p>
          <p className="mt-1">{view.decisionNote}</p>
        </blockquote>
      )}
      {flagged.length > 0 && (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            resubmit.mutate(
              { ref: view.ref, email: view.email, patch },
              {
                onSuccess: (v) => {
                  setView(v);
                  toast({ title: c.status.resubmitted, tone: "success" });
                },
              },
            );
          }}
        >
          {flagged.map((k) => (
            <Field key={k} id={`fl-${k}`} label={label(k)}>
              {(f) =>
                k === "expertise" ? (
                  <Textarea id={f.id} required rows={3} value={patch[k] ?? ""} onChange={(e) => setPatch({ ...patch, [k]: e.target.value })} className="border-warning" />
                ) : (
                  <Input id={f.id} required value={patch[k] ?? ""} onChange={(e) => setPatch({ ...patch, [k]: e.target.value })} className="border-warning" />
                )
              }
            </Field>
          ))}
          {resubmit.isError && <p role="alert"className="text-small text-danger">{errorCopy(resubmit.error, locale)}</p>}
          <Button type="submit"loading={resubmit.isPending} className="w-fit">
            {c.status.resubmit}
          </Button>
        </form>
      )}
      <div className="flex flex-wrap gap-3">
        {view.status === "converted" && <ButtonLink href={localHref(locale, "/team/sign-in")}>{c.status.signIn}</ButtonLink>}
        <Button variant="outline" onClick={reset}>
          <Icon name="search" size={15} aria-hidden /> {c.status.another}
        </Button>
      </div>
    </div>
  );
}
