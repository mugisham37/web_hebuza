"use client";
// Lane F · /work/profile/[section] (board 11 PR1–PR4): Stage 4 ProfileView with the external section list plus
// services & clearance, credentials (lane B panel) and payout method (step-up → OTP → 48 h cooling → finance verify).
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cx, formatDateTime } from "@/shared/format";
import { Icon } from "@/components/atoms/icon";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Input } from "@/components/atoms/field";
import { OtpInput } from "@/components/atoms/inputs";
import { useToast } from "@/components/atoms/toast";
import { PanelError } from "@/components/molecules/ops/ops";
import { SkeletonRows } from "@/components/atoms/agent";
import { ProfileView, type ExtraSection } from "@/components/organisms/agent/profile";
import { useStepUp } from "@/components/atoms/step-up";
import { errorCopy } from "@/lib/api/error-copy";
import { useExternal } from "@/lib/work/api";
import { useContract, usePayoutDest, type PayoutDest } from "@/lib/work/f";
import { why, scopeOf } from "@/lib/work/limits";
import { workContract } from "@/content/pages/work-contract";
import { fill } from "@/content/pages/work-common";
import { CredentialsPanel } from "@/components/organisms/agent/work-credentials";
import { ServiceClearanceList } from "@/components/molecules/agent/agent";
import { WhyNote, useW } from "@/components/atoms/work";

/** Stage 4 keys reused as-is; services/credentials/payout are external-only (rendered below). No ranking (D-9). */
export const WORK_SECTIONS = ["profile", "services", "availability", "credentials", "payout", "notifications", "security"] as const;
const useC = () => workContract(useI18n().locale).profile;
const box = " border border-border bg-white p-4 sm:p-5";

export function WorkProfileView({ section }: { section: string | null }) {
  const c = useC();
  const extra: Record<string, ExtraSection> = {
    services: { label: c.services, icon: "graduation", node: <Services /> },
    credentials: { label: c.credentials, icon: "fileCheck", node: <CredentialsPanel mode="profile" /> },
    payout: { label: c.payout, icon: "wallet", node: <Payout /> },
  };
  return <ProfileView section={section} sections={WORK_SECTIONS} extra={extra} />;
}

function Services() {
  const c = useC();
  const { ext, isPending, isError, refetch } = useExternal();
  if (isPending) return <SkeletonRows n={4} />;
  if (isError || !ext) return <PanelError what={c.services} onRetry={() => refetch()} />;
  return (
    <div className="grid gap-3">
      <p className="text-small text-fg-muted">{c.servicesSub}</p>
      <ServiceClearanceList services={ext.services} fixHref="/work/profile/credentials" />
    </div>
  );
}

const STATUS_CLS: Record<PayoutDest["status"], string> = {
  verified: "bg-success-bg text-success",
  pending_verification: "bg-warning-bg text-warning",
  failed: "bg-danger-bg text-danger",
};
function Payout() {
  const c = useC();
  const w = useW();
  const { locale } = useI18n();
  const q = useContract();
  const { ext } = useExternal();
  const [open, setOpen] = useState(false);
  if (q.isPending) return <SkeletonRows n={3} />;
  if (q.isError) return <PanelError what={c.payout} onRetry={() => q.refetch()} />;
  const p = q.data.payout;
  const denied = why(scopeOf(ext), "payout.change");
  const st = { verified: c.verified, pending_verification: c.pendingVerification, failed: c.failed }[p.status];
  return (
    <div className="grid gap-4">
      <p className="text-small text-fg-muted">{c.payoutSub}</p>
      <section className={cx(box, "grid gap-3")}>
        <p className="text-eyebrow text-fg-subtle uppercase">{c.current}</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-10 items-center justify-center bg-tint text-navy-700">
            <Icon name="wallet" size={18} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-label">{p.label}</span>
            <span className="block text-small tabular text-fg-muted">•••• {p.last4}</span>
          </span>
          <span className={cx("inline-flex h-7 items-center gap-1.5 px-2.5 text-eyebrow font-medium normal-case m-tone", STATUS_CLS[p.status])}>
            <Icon name={p.status === "verified" ? "check" : p.status === "failed" ? "x" : "clock"} size={13} aria-hidden />
            {st}
          </span>
        </div>
        {p.coolingUntil && (
          <p role="status"className="bg-warning-bg px-3 py-2 text-small">
            {fill(c.cooling, { d: formatDateTime(p.coolingUntil, locale) })}
          </p>
        )}
        {p.status === "pending_verification" && (
          <div className="flex flex-wrap gap-2">
          </div>
        )}
      </section>
      {denied === "adminOnly" ? (
        <WhyNote>{c.memberNote}</WhyNote>
      ) : denied ? (
        <WhyNote>{w.why[denied]}</WhyNote>
      ) : (
        <Button variant="outline"onClick={() => setOpen(true)} className="w-fit">
          {c.change}
        </Button>
      )}
      <ChangeDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function ChangeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useC();
  const { locale } = useI18n();
  const toast = useToast();
  const step = useStepUp();
  const m = usePayoutDest();
  const [method, setMethod] = useState<PayoutDest["method"]>("momo");
  const [account, setAccount] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [phase, setPhase] = useState<"form" | "otp">("form");
  const [token, setToken] = useState("");
  const [tried, setTried] = useState(false);
  const accOk = account.replace(/\D/g, "").length >= 8;
  const close = () => {
    setPhase("form");
    setOtp("");
    setTried(false);
    m.reset();
    onClose();
  };
  const next = async () => {
    setTried(true);
    if (!accOk || !name.trim()) return;
    try {
      setToken(await step.request("payout_destination.change"));
      setPhase("otp");
    } catch {
      /* step-up cancelled: stay on the form */
    }
  };
  const submit = (code = otp) => {
    if (code.length !== 6 || m.isPending) return;
    m.mutate(
      { method, account, name, otp: code, stepUp: token },
      {
        onSuccess: () => (toast({ title: c.requested, tone: "success" }), close()),
        onError: () => setOtp(""),
      },
    );
  };
  return (
    <>
      <Dialog
        open={open}
        onClose={close}
        title={c.change}
        description={c.payoutSub}
        footer={
          phase === "form" ? (
            <Button onClick={next}>{c.submit}</Button>
          ) : (
            <Button onClick={() => submit()} loading={m.isPending} aria-busy={m.isPending} disabled={otp.length !== 6}>
              {c.submit}
            </Button>
          )
        }
      >
        {phase === "form" ? (
          <div className="grid gap-4">
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-label">{c.method}</legend>
              <div className="flex flex-wrap gap-2">
                {(["momo", "airtel", "bank"] as const).map((x) => (
                  <button
                    key={x}
                    type="button"
                    aria-pressed={method === x}
                    onClick={() => setMethod(x)}
                    className={cx("h-10 border px-4 text-small m-press", method === x ? "border-navy-700 bg-secondary text-on-navy" : "border-border bg-white")}
                  >
                    {c.methods[x]}
                  </button>
                ))}
              </div>
            </fieldset>
            <Field label={c.account} error={tried && !accOk ? c.accountBad : undefined}>
              {(f) => <Input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} inputMode="numeric" autoComplete="off" value={account} onChange={(e) => setAccount(e.target.value)} />}
            </Field>
            <Field label={c.name} hint={c.nameHint} error={tried && !name.trim() ? c.nameBad : undefined}>
              {(f) => <Input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />}
            </Field>
          </div>
        ) : (
          <div className="grid gap-3">
            <p className="text-label">{c.otpTitle}</p>
            <p className="text-small text-fg-muted">{c.otpHint}</p>
            <OtpInput value={otp} onChange={setOtp} onComplete={submit} invalid={m.isError} label={c.otpTitle} />
            {m.isError && (
              <p role="alert"className="text-small text-danger m-shake">
                {errorCopy(m.error, locale)}
              </p>
            )}
          </div>
        )}
      </Dialog>
      {step.dialog}
    </>
  );
}
