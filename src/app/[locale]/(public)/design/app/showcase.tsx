"use client";
import Link from "next/link";
import { useState } from "react";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { Field } from "@/components/atoms/field";
import { OtpInput, Segmented, PasswordInput, PasswordRules, PhoneInput } from "@/components/atoms/inputs";
import { Notice, ResultPanel } from "@/components/molecules/auth/auth";
import { authCopy } from "@/content/pages/client-auth";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="grid gap-4 border-t border-border py-10 [&>*]:min-w-0"><h2 className="eyebrow text-fg-subtle">{title}</h2>{children}</section>;
}

export function AppKitShowcase() {
  const { locale } = useI18n();
  const c = authCopy(locale);
  const [otp, setOtp] = useState("48");
  const [seg, setSeg] = useState<"phone" | "email">("phone");
  const [pw, setPw] = useState("abc12");
  return (
    <main id="main" className="container-page px-gutter pt-[var(--spacing-hero-top)] pb-16">
      <h1 className="text-h2">App kit</h1>
      <p className="mt-2 text-body text-fg-muted">
        Client-app components. Fields, select, file drop, stepper, status pills, tables, empty/error/skeleton, toasts, drawers and modals are the
        shared primitives on <Link className="underline" href={localHref(locale, "/design")}>/design</Link>.
      </p>
      <Block title="OTP — default · typing · error · disabled">
        <div className="flex flex-wrap gap-8">
          <OtpInput label="OTP default" value="" onChange={() => {}} />
          <OtpInput label="OTP typing" value={otp} onChange={setOtp} />
          <OtpInput label="OTP error" value="481234" onChange={() => {}} invalid />
          <OtpInput label="OTP disabled" value="" onChange={() => {}} disabled />
        </div>
      </Block>
      <Block title="Segmented">
        <Segmented label="Identifier" value={seg} onChange={setSeg} options={[{ value: "phone", label: c.phone }, { value: "email", label: c.email }]} />
      </Block>
      <Block title="Phone · password + rules">
        <div className="grid max-w-md gap-5">
          <Field label={c.phoneLabel}>{({ id }) => <PhoneInput id={id} placeholder="788 123 456" />}</Field>
          <Field label={c.password}>
            {({ id }) => <div className="grid gap-2"><PasswordInput id={id} value={pw} onChange={(e) => setPw(e.target.value)} showLabel={c.show} hideLabel={c.hide} /><PasswordRules value={pw} labels={c.rules} /></div>}
          </Field>
        </div>
      </Block>
      <Block title="Notices">
        <div className="max-w-md">
          <Notice>{c.login.bad}</Notice>
          <Notice tone="info">{c.login.expired}</Notice>
          <Notice tone="warning">{c.login.rateLimited}</Notice>
          <Notice tone="success">{c.verify.resent}</Notice>
        </div>
      </Block>
      <Block title="Result panels">
        <div className="grid gap-10 sm:grid-cols-3">
          <ResultPanel icon="check" title={c.verify.verified} />
          <ResultPanel icon="lock" tone="warning" title={c.login.locked} />
          <ResultPanel icon="mail" tone="neutral" title={c.forgot.sentTitle} />
        </div>
      </Block>
    </main>
  );
}
