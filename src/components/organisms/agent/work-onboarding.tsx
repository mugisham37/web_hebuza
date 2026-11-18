"use client";
// Lane B: external onboarding & clearance gate (plan §2.3, §7.4; board 04 ON1–ON5, PON1).
// identity → credentials → agreements → payout → services → review; autosave per step, locked once submitted.
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatMoney } from "@/shared/format";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Field, Input, Select } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { PanelError } from "@/components/molecules/ops/ops";
import { PageHead } from "@/components/atoms/agent";
import { errorCopy } from "@/lib/api/error-copy";
import { fill } from "@/content/pages/work-common";
import { POLICY } from "@/shared/policy";
import {
  STEPS,
  useKycUpload,
  useOnboarding,
  useSaveStep,
  useSignOnboarding,
  useSubmitOnboarding,
  type ItemState,
  type KycSlotKey,
  type ObStep,
  type ObVM,
} from "@/lib/work/b";
import { WorkerStatusChip } from "@/components/atoms/work";
import { SignDocument } from "@/components/molecules/agent/agent";
import { CredentialsPanel } from "@/components/organisms/agent/work-credentials";
import { useOb } from "@/components/organisms/agent/work-states";

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Kigali" });
const STATE_ICON: Record<ItemState, { icon: IconName; cls: string }> = {
  todo: { icon: "plus", cls: "border border-border-strong text-fg-subtle" },
  in_progress: { icon: "clock", cls: "bg-navy-50 text-navy-700" },
  done: { icon: "check", cls: "bg-secondary text-on-navy" },
  submitted: { icon: "clock", cls: "bg-warning-bg text-warning" },
  verified: { icon: "check", cls: "bg-success text-white" },
  rejected: { icon: "x", cls: "bg-danger text-white" },
};

const BAR: Record<ItemState, string> = {
  todo: "bg-ink-100",
  in_progress: "bg-navy-100",
  done: "bg-secondary",
  submitted: "bg-warning",
  verified: "bg-success",
  rejected: "bg-danger",
};

export function WorkOnboarding({ step }: { step: ObStep }) {
  const o = useOb();
  const q = useOnboarding();
  if (q.isPending)
    return (
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]"aria-busy>
        <div className="h-96 m-shimmer" />
        <div className="h-[32rem] m-shimmer" />
      </div>
    );
  if (q.isError) return <PanelError what={o.title} onRetry={() => q.refetch()} />;
  const vm = q.data;
  if (vm.status === "cleared") return <Cleared vm={vm} />;
  return <Shell vm={vm} step={step} />;
}

// ---------------------------------------------------------------- ON1 checklist shell
function Shell({ vm, step }: { vm: ObVM; step: ObStep }) {
  const o = useOb();
  const { locale } = useI18n();
  const L = (s: ObStep) => localHref(locale, `/work/onboarding/${s}`);
  const doneN = vm.items.filter((i) => i.key !== "review" && ["done", "submitted", "verified"].includes(i.state)).length;
  const i = STEPS.indexOf(step);
  const locked = vm.status === "pending_verification";
  return (
    <div>
      <PageHead
        title={o.heading}
        sub={o.sub}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <WorkerStatusChip status={vm.status} />
            {vm.savedAt && <span className="text-small text-fg-subtle tabular">{fill(o.saved, { t: time(vm.savedAt) })}</span>}
          </div>
        }
      />
      {/* PON1: compact progress on phone */}
      <ol className="mb-4 flex gap-1.5 lg:hidden"aria-label={fill(o.progress, { n: doneN, t: 5 })}>
        {vm.items.map((it) => (
          <li key={it.key} className="flex-1">
            <Link href={L(it.key)} aria-current={it.key === step ? "step" : undefined} className={cx("block h-1.5", it.key === step ? "bg-navy-700" : BAR[it.state])}>
              <span className="sr-only">{o.steps[it.key]}</span>
            </Link>
          </li>
        ))}
      </ol>
      <div className="grid items-start gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="grid gap-4 lg:sticky lg:top-4">
          <nav aria-label={o.title} className="border border-border bg-white p-4">
            <p className="mb-3 text-small text-fg-muted">{fill(o.progress, { n: doneN, t: 5 })}</p>
            <div className="mb-3 h-1.5 overflow-hidden bg-ink-100">
              <div className="h-full bg-navy-700 transition-[width] duration-(--dur-3)"style={{ width: `${(doneN / 5) * 100}%` }} />
            </div>
            <ol className="grid gap-1">
              {vm.items.map((it, n) => (
                <li key={it.key}>
                  <Link
                    href={L(it.key)}
                    aria-current={it.key === step ? "step" : undefined}
                    className={cx("flex items-center gap-3 px-2 py-2 text-small transition-colors", it.key === step ? "bg-tint font-medium" : "hover:bg-bg-subtle")}
                  >
                    <span className={cx("flex size-6 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-semibold m-tone", STATE_ICON[it.state].cls)}>
                      {it.state === "todo" ? n + 1 : <Icon name={STATE_ICON[it.state].icon} size={13} aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      {o.steps[it.key]}
                      {it.state !== "todo" && <span className="block text-eyebrow text-fg-subtle">{o.state[it.state]}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
          <div className="hidden bg-tint p-4 lg:block">
            <p className="flex items-center gap-2 text-label">
              <Icon name="sparkle"size={16} aria-hidden className="text-navy-700" /> {o.why.title}
            </p>
            <p className="mt-1 text-small text-fg-muted">{o.why.body}</p>
          </div>
          <p className="flex items-start gap-2 bg-tint p-3 text-small">
            <Icon name="lock"size={15} aria-hidden className="mt-0.5 shrink-0 text-navy-700" />
            {o.lockNote}
          </p>
        </aside>
        <section className="grid min-w-0 gap-4">
          {vm.changes && (
            <div role="alert"className="border border-danger/30 bg-danger-bg p-4 m-rise">
              <p className="text-label text-danger">{fill(o.changes.title, { m: vm.manager })}</p>
              <p className="mt-1 text-small">{vm.changes.note}</p>
              <p className="mt-1 text-small text-fg-muted">{o.changes.fixed}</p>
            </div>
          )}
          {locked && step !== "review" && (
            <p role="status"className="flex items-center gap-2 bg-warning-bg px-4 py-3 text-small">
              <Icon name="lock" size={15} aria-hidden /> {o.locked}
            </p>
          )}
          <div key={step} className="border border-border bg-white p-5 sm:p-7 m-rise">
            {step === "identity" && <Identity vm={vm} locked={locked} />}
            {step === "credentials" && (
              <StepHead title={o.creds.title} sub={o.creds.sub}>
                <CredentialsPanel mode="onboarding" />
              </StepHead>
            )}
            {step === "agreements" && <Agreements vm={vm} />}
            {step === "payout" && <Payout vm={vm} locked={locked} />}
            {step === "services" && <Services vm={vm} locked={locked} />}
            {step === "review" && <Review vm={vm} />}
          </div>
          <nav className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 flex items-center justify-between gap-2 bg-bg-subtle/95 py-2 backdrop-blur lg:static lg:bg-transparent">
            {i > 0 ? (
              <ButtonLink variant="ghost" href={L(STEPS[i - 1])}>
                {o.back}
              </ButtonLink>
            ) : (
              <span />
            )}
            {i < STEPS.length - 1 && (
              <ButtonLink href={L(STEPS[i + 1])}>
                {o.next} <Icon name="arrowRight" size={16} aria-hidden />
              </ButtonLink>
            )}
          </nav>
        </section>
      </div>
    </div>
  );
}

function StepHead({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="grid gap-5">
      <header>
        <h2 className="text-h3">{title}</h2>
        <p className="mt-1 text-body text-fg-muted">{sub}</p>
      </header>
      {children}
    </div>
  );
}

/** Debounced autosave of one step's draft (skips invalid drafts; the server re-validates). */
function useAutosave(step: "identity" | "payout" | "services", draft: Record<string, unknown>, valid: boolean, locked: boolean) {
  const save = useSaveStep();
  const last = useRef(JSON.stringify(draft));
  const json = JSON.stringify(draft);
  useEffect(() => {
    if (locked || !valid || json === last.current) return;
    const t = setTimeout(() => {
      last.current = json;
      save.mutate({ step, data: JSON.parse(json) });
    }, 800);
    return () => clearTimeout(t);
  }, [json, valid, locked, step, save]);
  return save;
}
function SaveState({ save }: { save: ReturnType<typeof useSaveStep> }) {
  const o = useOb();
  const { locale } = useI18n();
  if (save.isPending) return <p className="text-small text-fg-subtle"aria-live="polite">{o.saving}</p>;
  if (save.isError)
    return (
      <p role="alert"className="text-small text-danger">
        {errorCopy(save.error, locale)} — {o.saveFailed}
      </p>
    );
  return null;
}

// ---------------------------------------------------------------- ON2 identity
function Identity({ vm, locked }: { vm: ObVM; locked: boolean }) {
  const o = useOb();
  const id = o.identity;
  const [idType, setIdType] = useState(vm.identity.idType);
  const [num, setNum] = useState("");
  const [editing, setEditing] = useState(!vm.identity.idNumberMasked);
  const clean = num.replace(/\s/g, "");
  const valid = !clean || idType !== "national_id" || /^\d{16}$/.test(clean);
  const save = useAutosave("identity", clean ? { idType, idNumber: clean } : { idType }, valid, locked);
  const flagged = vm.changes?.items.includes("identity");
  const allIn = Object.values(vm.identity.slots).every((s) => s.status === "uploaded");
  return (
    <StepHead title={id.title} sub={id.sub}>
      <div className={cx("grid gap-4 sm:grid-cols-2", flagged && "ring-2 ring-danger/30 p-3")}>
        <Field label={id.idType}>
          {(f) => (
            <Select id={f.id} value={idType} disabled={locked} onChange={(e) => setIdType(e.target.value as typeof idType)}>
              <option value="national_id">{id.national_id}</option>
              <option value="passport">{id.passport}</option>
            </Select>
          )}
        </Field>
        <Field label={id.idNumber} hint={id.idHint} error={!valid ? id.idInvalid : undefined}>
          {(f) =>
            editing ? (
              <Input
                id={f.id}
                aria-describedby={f.describedBy}
                aria-invalid={f.invalid}
                inputMode={idType === "national_id" ? "numeric" : "text"}
                autoComplete="off"
                value={num}
                disabled={locked}
                onChange={(e) => setNum(e.target.value)}
                onBlur={() => clean && valid && setEditing(false)}
              />
            ) : (
              <p className="flex h-12 items-center gap-3 border border-border bg-bg-subtle px-3.5">
                <span className="flex-1 tabular">{clean ? `•••• ${clean.slice(-4)}` : vm.identity.idNumberMasked}</span>
                {!locked && (
                  <button type="button"className="text-small underline"onClick={() => setEditing(true)}>
                    {id.change}
                  </button>
                )}
              </p>
            )
          }
        </Field>
      </div>
      <SaveState save={save} />
      <div className="grid gap-3 sm:grid-cols-3">
        {(["id_front", "id_back", "selfie"] as KycSlotKey[]).map((k) => (
          <KycSlot key={k} slot={k} state={vm.identity.slots[k]} locked={locked} />
        ))}
      </div>
      {allIn && (vm.status === "pending_verification" || locked) && (
        <div className="flex items-center gap-3 bg-bg-subtle p-4"role="status">
          <span aria-hidden className="size-6 animate-spin rounded-full border-2 border-navy-200 border-t-navy-700 motion-reduce:animate-none" />
          <span>
            <span className="block text-label">{id.checking}</span>
            <span className="text-small text-fg-muted">{id.checkingBody}</span>
          </span>
        </div>
      )}
    </StepHead>
  );
}

/** ON2 KYC tile: empty / uploading / uploaded / rejected. Selfie opens the front camera on phones. */
function KycSlot({ slot, state, locked }: { slot: KycSlotKey; state: ObVM["identity"]["slots"][KycSlotKey]; locked: boolean }) {
  const o = useOb();
  const id = o.identity;
  const { locale } = useI18n();
  const up = useKycUpload();
  const file = useRef<HTMLInputElement>(null);
  const cam = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const take = (f?: File) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) return setErr(id.tooLarge);
    if (!/^image\/|application\/pdf/.test(f.type)) return setErr(id.badType);
    setErr(null);
    up.mutate({ slot, fileName: f.name, size: f.size, type: f.type, file: f }, { onError: (e) => setErr(errorCopy(e, locale)) });
  };
  const st = up.isPending ? "uploading" : state.status;
  return (
    <div
      className={cx(
        "grid content-start justify-items-center gap-2 border-2 border-dashed p-4 text-center transition-colors",
        st === "uploaded" ? "border-success/40 bg-success-bg/40" : st === "rejected" ? "border-danger/40 bg-danger-bg/50" : "border-border-strong bg-bg-subtle/40",
      )}
    >
      <span className={cx("flex size-12 items-center justify-center", st === "uploaded" ? "bg-success text-white m-pop" : "bg-navy-50 text-navy-700")}>
        <Icon name={st === "uploaded" ? "check" : slot === "selfie" ? "camera" : "card"} size={22} aria-hidden />
      </span>
      <p className="text-label">{id.slots[slot]}</p>
      <p className="text-eyebrow text-fg-subtle">
        {st === "uploaded" ? state.fileName : st === "rejected" ? (state.note ?? id.rejected) : id.slotHint[slot]}
      </p>
      <span aria-live="polite"className="sr-only">
        {st === "uploading" ? id.uploading : st === "uploaded" ? id.uploaded : ""}
      </span>
      {st === "uploading" ? (
        <span className="h-9 w-24 m-shimmer"aria-hidden />
      ) : (
        !locked && (
          <div className="flex flex-wrap justify-center gap-1.5">
            <Button size="sm" variant={st === "uploaded" ? "outline" : "primary"} onClick={() => (slot === "selfie" ? cam : file).current?.click()}>
              {st === "uploaded" || st === "rejected" ? id.replace : slot === "selfie" ? id.takePhoto : id.upload}
            </Button>
          </div>
        )
      )}
      {err && (
        <p role="alert"className="text-small text-danger m-shake">
          {err}
        </p>
      )}
      <input ref={file} type="file" hidden accept="image/*,application/pdf" onChange={(e) => (take(e.target.files?.[0]), (e.target.value = ""))} />
      <input ref={cam} type="file" hidden accept="image/*" capture="user" onChange={(e) => (take(e.target.files?.[0]), (e.target.value = ""))} />
    </div>
  );
}

// ---------------------------------------------------------------- agreements (XK7 / CT2)
function Agreements({ vm }: { vm: ObVM }) {
  const o = useOb();
  const a = o.agreements;
  const { locale } = useI18n();
  const toast = useToast();
  const sign = useSignOnboarding();
  const pct = POLICY.defaultAgentBps / 100;
  return (
    <StepHead title={a.title} sub={a.sub}>
      <div className="grid gap-1.5 bg-tint p-4 text-small">
        <p className="text-label">{a.revenue}</p>
        <p>{fill(a.revenueLine, { p: pct, h: 100 - pct })}</p>
        <p>{fill(a.licenceLine, { amount: formatMoney(POLICY.licenceFeeMonthly, "RWF", locale) })}</p>
        <p className="text-fg-muted">{fill(a.whtLine, { p: POLICY.whtBps / 100 })}</p>
      </div>
      <ul className="grid gap-4">
        {vm.docs.map((d) => (
          <li key={d.id} className="grid gap-2">
            <p className="flex items-center gap-2 text-small">
              <span className={cx("inline-flex h-6 items-center gap-1 px-2.5 text-eyebrow font-medium normal-case", d.signedAt ? "bg-success-bg text-success" : "bg-navy-50 text-navy-700")}>
                <Icon name={d.signedAt ? "check" : "file"} size={12} aria-hidden />
                {d.signedAt ? a.signed : a.toSign}
              </span>
            </p>
            <SignDocument
              doc={d}
              signerName={vm.signer}
              onSign={(typedName) =>
                sign.mutateAsync({ docId: d.id, typedName }).then(() => toast({ title: fill(a.done, { title: d.title }), tone: "success" }))
              }
            />
          </li>
        ))}
      </ul>
    </StepHead>
  );
}

// ---------------------------------------------------------------- ON4 payout
function Payout({ vm, locked }: { vm: ObVM; locked: boolean }) {
  const o = useOb();
  const p = o.payout;
  const [d, setD] = useState({ method: vm.payout.method, bank: vm.payout.bank || p.banks[0], account: "", name: vm.payout.name, tin: "" });
  const set = (x: Partial<typeof d>) => setD((v) => ({ ...v, ...x }));
  const tinOk = !d.tin || new RegExp(`^\\d{${POLICY.tinDigits}}$`).test(d.tin);
  const draft: Record<string, unknown> = { method: d.method, bank: d.method === "bank" ? d.bank : "", name: d.name };
  if (d.account) draft.account = d.account;
  if (d.tin) draft.tin = d.tin;
  const save = useAutosave("payout", draft, tinOk, locked);
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  const nameWarn = d.name.trim() && norm(d.name) !== norm(vm.signer);
  const METHODS: { k: "momo" | "airtel" | "bank"; icon: IconName }[] = [
    { k: "momo", icon: "phone" },
    { k: "airtel", icon: "phone" },
    { k: "bank", icon: "building" },
  ];
  return (
    <StepHead title={p.title} sub={p.sub}>
      <fieldset className="grid gap-2"disabled={locked}>
        <legend className="mb-1 text-label">{p.method}</legend>
        {METHODS.map((m) => (
          <label
            key={m.k}
            className={cx("flex cursor-pointer items-center gap-3 border p-4 transition-colors has-[:focus-visible]:outline-2", d.method === m.k ? "border-navy-700 bg-tint" : "border-border hover:bg-bg-subtle")}
          >
            <input type="radio"name="payout"className="size-5 accent-navy-700"checked={d.method === m.k} onChange={() => set({ method: m.k })} />
            <span className="flex-1 text-label">{p[m.k]}</span>
            <Icon name={m.icon} size={18} aria-hidden className="text-fg-muted" />
          </label>
        ))}
      </fieldset>
      {d.method && (
        <div className="grid gap-4 sm:grid-cols-2 m-rise">
          {d.method === "bank" && (
            <Field label={p.bankName}>
              {(f) => (
                <Select id={f.id} value={d.bank} disabled={locked} onChange={(e) => set({ bank: e.target.value })}>
                  {p.banks.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </Select>
              )}
            </Field>
          )}
          <Field label={d.method === "bank" ? p.account : p.phone} hint={vm.payout.account ? fill(p.masked, { v: vm.payout.account }) : undefined}>
            {(f) => (
              <Input
                id={f.id}
                aria-describedby={f.describedBy}
                inputMode={d.method === "bank" ? "numeric" : "tel"}
                autoComplete="off"
                placeholder={vm.payout.account || undefined}
                value={d.account}
                disabled={locked}
                onChange={(e) => set({ account: e.target.value.replace(/[^\d+ ]/g, "") })}
              />
            )}
          </Field>
          <Field label={p.name} hint={nameWarn ? fill(p.nameWarn, { n: vm.signer }) : undefined} className="sm:col-span-2">
            {(f) => <Input id={f.id} aria-describedby={f.describedBy} autoComplete="name" value={d.name} disabled={locked} onChange={(e) => set({ name: e.target.value })} />}
          </Field>
          <Field label={p.tin} optional={p.optional} hint={vm.payout.tin ? fill(p.masked, { v: vm.payout.tin }) : fill(p.tinHint, { d: POLICY.tinDigits })} error={!tinOk ? fill(p.tinInvalid, { d: POLICY.tinDigits }) : undefined}>
            {(f) => (
              <Input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} inputMode="numeric" value={d.tin} disabled={locked} onChange={(e) => set({ tin: e.target.value.replace(/\D/g, "").slice(0, POLICY.tinDigits) })} />
            )}
          </Field>
        </div>
      )}
      <SaveState save={save} />
      <div className="grid gap-2">
        <p className="flex items-center gap-2 bg-tint px-4 py-3 text-small">
          <Icon name="shield"size={15} aria-hidden className="text-navy-700" /> {fill(p.wht, { p: POLICY.whtBps / 100 })}
        </p>
        <p className="text-small text-fg-muted">{p.verify}</p>
      </div>
    </StepHead>
  );
}

// ---------------------------------------------------------------- services & availability
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
function Services({ vm, locked }: { vm: ObVM; locked: boolean }) {
  const o = useOb();
  const s = o.services;
  const [d, setD] = useState(vm.services);
  const save = useAutosave("services", d, d.slugs.length > 0, locked);
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  return (
    <StepHead title={s.title} sub={s.sub}>
      <fieldset className="grid gap-2"disabled={locked}>
        <legend className="mb-1 text-label">{s.pick}</legend>
        <p className="-mt-1 mb-1 text-small text-fg-subtle">{s.pickHint}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {vm.catalogue.map((c) => {
            const on = d.slugs.includes(c.slug);
            return (
              <label key={c.slug} className={cx("flex cursor-pointer items-center gap-3 border px-3 py-3 text-small transition-colors has-[:focus-visible]:outline-2", on ? "border-navy-700 bg-tint" : "border-border hover:bg-bg-subtle")}>
                <input type="checkbox"className="size-5 accent-navy-700"checked={on} onChange={() => setD({ ...d, slugs: toggle(d.slugs, c.slug) })} />
                {c.name}
              </label>
            );
          })}
        </div>
        {!d.slugs.length && <p className="text-small font-medium text-danger">{s.pickError}</p>}
      </fieldset>
      <fieldset disabled={locked}>
        <legend className="mb-2 text-label">{s.days}</legend>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={d.days.includes(k)}
              onClick={() => setD({ ...d, days: toggle(d.days, k) })}
              className={cx("h-10 min-w-14 border px-3 text-small transition-colors m-press", d.days.includes(k) ? "border-navy-700 bg-secondary text-on-navy" : "border-border-strong bg-white")}
            >
              {s.dayNames[k]}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={locked}>
        <legend className="mb-1 text-label">{s.max}</legend>
        <p className="mb-2 text-small text-fg-subtle">{fill(s.maxHint, { n: POLICY.capMax })}</p>
        <div className="inline-flex items-center gap-2 border border-border bg-white p-1">
          <button type="button"aria-label={s.fewer} disabled={d.maxJobs <= 1} onClick={() => setD({ ...d, maxJobs: d.maxJobs - 1 })} className="flex size-9 items-center justify-center rounded-full hover:bg-bg-subtle disabled:opacity-40 m-press">
            <Icon name="minus" size={16} aria-hidden />
          </button>
          <output aria-live="polite"className="w-8 text-center text-label tabular">
            {d.maxJobs}
          </output>
          <button type="button"aria-label={s.more} disabled={d.maxJobs >= POLICY.capMax} onClick={() => setD({ ...d, maxJobs: d.maxJobs + 1 })} className="flex size-9 items-center justify-center rounded-full hover:bg-bg-subtle disabled:opacity-40 m-press">
            <Icon name="plus" size={16} aria-hidden />
          </button>
        </div>
      </fieldset>
      <SaveState save={save} />
    </StepHead>
  );
}

// ---------------------------------------------------------------- review & submit
function Review({ vm }: { vm: ObVM }) {
  const o = useOb();
  const r = o.review;
  const { locale } = useI18n();
  const toast = useToast();
  const submit = useSubmitOnboarding();
  const ready = vm.items.filter((i) => i.key !== "review").every((i) => i.state !== "todo" && i.state !== "in_progress" && i.state !== "rejected");
  if (vm.status === "pending_verification")
    return (
      <div className="grid place-items-center gap-3 py-8 text-center m-rise"role="status">
        <span className="flex size-16 items-center justify-center rounded-full bg-warning-bg text-warning">
          <Icon name="clock" size={28} aria-hidden />
        </span>
        <h2 className="text-h3">{r.pendingTitle}</h2>
        <p className="max-w-md text-body text-fg-muted">{fill(r.pendingBody, { m: vm.manager })}</p>
        <p className="text-small text-fg-subtle">{fill(r.submitted, { n: POLICY.applicationReviewDays })}</p>
      </div>
    );
  return (
    <StepHead title={r.title} sub={r.sub}>
      <ul className="divide-y divide-border border border-border">
        {vm.items
          .filter((i) => i.key !== "review")
          .map((it) => (
            <li key={it.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className={cx("flex size-6 items-center justify-center rounded-full", STATE_ICON[it.state].cls)}>
                <Icon name={STATE_ICON[it.state].icon} size={13} aria-hidden />
              </span>
              <span className="min-w-0 flex-1 text-small">
                {o.steps[it.key]}
                <span className="block text-eyebrow text-fg-subtle">{o.state[it.state]}</span>
              </span>
              <Link href={localHref(locale, `/work/onboarding/${it.key}`)} className="text-small font-medium text-navy-700 underline underline-offset-4">
                {r.edit}
              </Link>
            </li>
          ))}
      </ul>
      {!ready && <p className="text-small text-fg-muted">{r.missing}</p>}
      <Button
        disabled={!ready}
        loading={submit.isPending}
        aria-busy={submit.isPending}
        onClick={() =>
          submit.mutate(undefined, {
            onSuccess: () => toast({ title: fill(r.submitted, { n: POLICY.applicationReviewDays }), tone: "success" }),
            onError: (e) => toast({ title: errorCopy(e, locale), tone: "danger" }),
          })
        }
      >
        {r.submit} <Icon name="arrowRight" size={16} aria-hidden />
      </Button>
    </StepHead>
  );
}

// ---------------------------------------------------------------- ON5 cleared
function Cleared({ vm }: { vm: ObVM }) {
  const o = useOb();
  const { locale } = useI18n();
  const services = vm.catalogue.filter((c) => vm.services.slugs.includes(c.slug));
  return (
    <section className="mx-auto grid max-w-lg justify-items-center gap-4 border border-border bg-white px-6 py-10 text-center m-rise">
      <span className="relative flex size-24 items-center justify-center rounded-full bg-success-bg">
        <svg viewBox="0 0 24 24"className="size-12 text-success"fill="none"stroke="currentColor"strokeWidth={2.5} strokeLinecap="round"strokeLinejoin="round"aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7.5"className="m-tick" />
        </svg>
        <Icon name="sparkle"size={20} aria-hidden className="absolute -top-1 -right-2 text-navy-700 m-pop" />
        <Icon name="sparkle"size={12} aria-hidden className="absolute top-5 -right-5 text-gold-600 m-pop" />
      </span>
      <h1 className="text-h2">{o.cleared.title}</h1>
      <p className="text-body text-fg-muted">{o.cleared.sub}</p>
      {services.length > 0 && (
        <div className="w-full text-left">
          <p className="mb-2 text-label">{o.cleared.services}</p>
          <ul className="grid gap-2 m-stagger">
            {services.map((s, i) => (
              <li key={s.slug} style={{ ["--i"as string]: i }} className="flex items-center gap-2 text-small">
                <Icon name="check"size={16} aria-hidden className="text-success" /> {s.name}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex w-full flex-col gap-2">
        <ButtonLink href={localHref(locale, "/work/offers")} className="w-full justify-center">
          {o.cleared.cta}
        </ButtonLink>
        <ButtonLink variant="ghost"href={localHref(locale, "/work/profile/profile")} className="w-full justify-center">
          {o.cleared.profile}
        </ButtonLink>
      </div>
    </section>
  );
}

