"use client";
// Reusable 2FA enrolment (F-IAM-05): install → scan QR (+ copyable key) → 6-digit code → backup codes.
// Used by /team/mfa/setup (required policy), the suggestion popup and Settings → Security.
import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/provider";
import { opsTeam } from "@/content/pages/ops-team";
import { mfaEnrol, mfaEnrolVerify } from "@/lib/ops/c";
import { Notice, useSubmit } from "@/components/molecules/auth/auth";
import { OtpInput } from "@/components/atoms/inputs";
import { Checkbox } from "@/components/atoms/field";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { Stepper } from "@/components/atoms/misc";
import { useNow } from "@/components/atoms/step-up";

const useT = () => ({ c: opsTeam(useI18n().locale) });

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

/** Enrolment steps; `onFinish` runs after the user confirms they stored the backup codes. */
export function MfaEnrol({ onFinish, finishLabel }: { onFinish: () => void; finishLabel?: string }) {
  const { c } = useT();
  const [step, setStep] = useState(0);
  const [enrol, setEnrol] = useState<Awaited<
    ReturnType<typeof mfaEnrol>
  > | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const { pending, error, setError, run } = useSubmit();

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
            finishLabel={finishLabel ?? c.setup.finish}
            onFinish={onFinish}
          />
        </section>
      )}
    </>
  );
}
