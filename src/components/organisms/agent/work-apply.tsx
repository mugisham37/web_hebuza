"use client";
// /join application wizard (Stage 8 lane A, board 03 AP2/AP3, plan §7.3). 7 steps everywhere; step in the URL;
// answers kept as a local draft until submit. Submitting creates an applicant record, never an account (F-WRK-09).
// shortcut: draft in localStorage on this device only (files not kept), upgrade to server drafts if applicants resume across devices.
import { uploadFile } from "@/lib/api/upload";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx } from "@/shared/format";
import { Icon } from "@/components/atoms/icon";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Field, Input, Textarea, Select, Checkbox, DateInput, ErrorSummary } from "@/components/atoms/field";
import { FileDrop } from "@/components/atoms/file-drop";
import { PhoneInput, Segmented } from "@/components/atoms/inputs";
import { useOnline } from "@/components/atoms/hooks";
import { ApiError } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { workApply, type WorkApply } from "@/content/pages/work-apply";
import { fill } from "@/content/pages/work-common";
import { POLICY } from "@/shared/policy";
import {
  APPLY_STEPS,
  DAYS,
  EMPTY,
  SLOTS,
  firstInvalid,
  usePublicServices,
  useSubmitApplication,
  validate,
  type ApplyStep,
  type Draft,
  type Errs,
} from "@/lib/work/a";
import { ApplicationTracker } from "@/components/molecules/agent/agent";

const KEY = "posiba.join.draft";
const load = (): Draft | null => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Draft) } : null;
  } catch {
    return null;
  }
};

export function ApplicationWizard() {
  const { locale } = useI18n();
  const c = workApply(locale);
  const params = useUrlParams();
  const step = (APPLY_STEPS as readonly string[]).includes(params.get("step") ?? "") ? (params.get("step") as ApplyStep) : "profile";
  const idx = APPLY_STEPS.indexOf(step);
  const online = useOnline();
  const submit = useSubmitApplication();
  const opId = useRef(crypto.randomUUID());
  const [d, setD] = useState<Draft>(EMPTY);
  const [restored, setRestored] = useState<{ files: number } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [errs, setErrs] = useState<Errs>({});
  const [shake, setShake] = useState(0);
  const [done, setDone] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ type: string; ref?: string } | null>(null);
  const top = useRef<HTMLDivElement>(null);

  // Restore once on mount (client-only: localStorage).
  useEffect(() => {
    const saved = load();
    if (saved) {
      queueMicrotask(() => {
        setD({ ...saved, files: [] });
        setRestored({ files: saved.files.length });
      });
    }
  }, []);
  useEffect(() => {
    if (!dirty) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(d));
    } catch {
      /* storage full / private mode: draft just isn't kept */
    }
  }, [d, dirty]);
  useEffect(() => {
    if (!dirty || done) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty, done]);

  const set = (p: Partial<Draft>) => {
    setD((x) => ({ ...x, ...p }));
    setDirty(true);
  };
  const go = (s: ApplyStep) => {
    setErrs({});
    setUrlParams({ step: s });
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const check = (s: ApplyStep) => {
    const e = validate(s, d);
    setErrs(e);
    if (Object.keys(e).length) {
      setShake((n) => n + 1);
      queueMicrotask(() => document.getElementById(Object.keys(e)[0])?.focus());
      return false;
    }
    return true;
  };
  const next = async () => {
    if (!check(step)) return;
    if (step !== "review") return go(APPLY_STEPS[idx + 1]);
    const bad = firstInvalid(d);
    if (bad) return go(bad);
    try {
      const r = await submit.mutateAsync({ draft: d, client_op_id: opId.current });
      localStorage.removeItem(KEY);
      setDirty(false);
      setDone(r.ref);
    } catch (e) {
      const t = e instanceof ApiError ? e.errorType : null;
      if (t === "already_applied" || t === "already_user") setConflict({ type: t, ref: t === "already_applied" ? (e as ApiError).message : undefined });
    }
  };

  if (done) return <Received refId={done} c={c} />;

  const msg = (k: string) => {
    const v = errs[k];
    return v ? fill(c.err[v], { max: POLICY.capMax }) : undefined;
  };
  const summary = Object.keys(errs).map((k) => ({ field: k, message: msg(k)! }));

  return (
    <div ref={top} className="grid gap-6 scroll-mt-6 m-rise">
      <header>
        <p className="text-eyebrow uppercase text-fg-subtle">{fill(c.stepOf, { n: idx + 1, total: APPLY_STEPS.length })}</p>
        <h1 className="mt-1 text-h3">{c.title}</h1>
        {idx === 0 && <p className="mt-2 text-body text-fg-muted">{c.intro}</p>}
      </header>
      <ApplyStepper c={c} current={idx} errorStep={Object.keys(errs).length ? idx : -1} onPick={(i) => i < idx && go(APPLY_STEPS[i])} />
      {restored && (
        <p role="status"className="flex flex-wrap items-center gap-2 bg-tint px-3 py-2 text-small">
          <Icon name="refresh" size={14} aria-hidden />
          {c.restored}
          {restored.files > 0 && <span className="font-medium">{fill(c.reattach, { n: restored.files })}</span>}
        </p>
      )}
      {conflict && (
        <div role="alert"className="flex flex-wrap items-center gap-3 bg-warning-bg px-4 py-3 text-small">
          <span className="flex-1">{conflict.type === "already_applied" ? fill(c.dup.applied, { ref: conflict.ref ?? "" }) : c.dup.user}</span>
          <Link
            className="font-medium underline underline-offset-4"
            href={localHref(locale, conflict.type === "already_applied" ? `/join/status?ref=${encodeURIComponent(conflict.ref ?? "")}` : "/login")}
          >
            {conflict.type === "already_applied" ? c.dup.track : c.dup.signIn}
          </Link>
        </div>
      )}
      <ErrorSummary title={c.errSummary} errors={summary} />
      <form
        key={shake}
        noValidate
        className={cx("grid gap-5", shake > 0 && summary.length > 0 && "m-shake")}
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        <h2 className="text-h4">{c.steps[step]}</h2>
        {step === "profile" && <StepProfile d={d} set={set} c={c} msg={msg} />}
        {step === "services" && <StepServices d={d} set={set} c={c} msg={msg} />}
        {step === "rates" && <StepRates d={d} set={set} c={c} msg={msg} />}
        {step === "availability" && <StepAvailability d={d} set={set} c={c} msg={msg} />}
        {step === "registrations" && <StepRegistrations d={d} set={set} c={c} msg={msg} />}
        {step === "references" && <StepReferences d={d} set={set} c={c} msg={msg} />}
        {step === "review" && <StepReview d={d} set={set} c={c} msg={msg} go={go} />}
        {submit.isError && !conflict && (
          <p role="alert"className="text-small text-danger">
            {errorCopy(submit.error, locale)}
          </p>
        )}
        {!online && step === "review" && (
          <p role="status"className="bg-secondary px-3 py-2 text-small text-on-navy">
            {c.offline}
          </p>
        )}
        <div className="sticky bottom-0 -mx-1 flex items-center justify-between gap-3 bg-bg-subtle/95 px-1 py-3 backdrop-blur">
          {idx > 0 ? (
            <Button type="button" variant="ghost" onClick={() => go(APPLY_STEPS[idx - 1])}>
              <Icon name="arrowRight"size={16} aria-hidden className="rotate-180" /> {c.back}
            </Button>
          ) : (
            <span />
          )}
          <span className="hidden text-eyebrow text-fg-subtle sm:block">{dirty && c.saved}</span>
          <Button type="submit" loading={submit.isPending} aria-busy={submit.isPending} disabled={step === "review" && !online}>
            {step === "review" ? c.submit : c.next} <Icon name="arrowRight" size={16} aria-hidden />
          </Button>
        </div>
      </form>
    </div>
  );
}

type StepProps = { d: Draft; set: (p: Partial<Draft>) => void; c: WorkApply; msg: (k: string) => string | undefined };

/** AP2 stepper: dots with labels on wide screens, compact "Step n of 7" bar on phones. */
function ApplyStepper({ c, current, errorStep, onPick }: { c: WorkApply; current: number; errorStep: number; onPick: (i: number) => void }) {
  return (
    <nav aria-label={fill(c.stepOf, { n: current + 1, total: APPLY_STEPS.length })}>
      <div className="h-1.5 overflow-hidden bg-ink-100 sm:hidden">
        <div className="h-full bg-navy-700 transition-[width] duration-(--dur-2)"style={{ width: `${((current + 1) / APPLY_STEPS.length) * 100}%` }} />
      </div>
      <ol className="hidden grid-cols-7 gap-1 sm:grid">
        {APPLY_STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              disabled={i >= current}
              onClick={() => onPick(i)}
              aria-current={i === current ? "step" : undefined}
              className="grid w-full justify-items-center gap-1 text-center disabled:cursor-default"
            >
              <span
                className={cx(
                  "relative flex size-7 items-center justify-center rounded-full text-eyebrow font-semibold transition-colors",
                  i < current ? "bg-secondary text-on-navy" : i === current ? "bg-primary text-on-gold ring-2 ring-navy-700" : "bg-ink-100 text-fg-subtle",
                )}
              >
                {i < current ? <Icon name="check" size={13} aria-hidden /> : i + 1}
                {errorStep === i && <span aria-hidden className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-danger" />}
              </span>
              <span className={cx("text-[0.68rem] leading-tight", i === current ? "font-medium" : "text-fg-subtle")}>{c.steps[s]}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function F({ id, label, hint, error, optional, children }: { id: string; label: ReactNode; hint?: ReactNode; error?: string; optional?: string; children: (p: { id: string; "aria-describedby"?: string; "aria-invalid": boolean }) => ReactNode }) {
  return (
    <Field id={id} label={label} hint={hint} error={error} optional={optional}>
      {(f) => children({ id: f.id, "aria-describedby": f.describedBy, "aria-invalid": f.invalid })}
    </Field>
  );
}

function StepProfile({ d, set, c, msg }: StepProps) {
  return (
    <>
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-label">{c.f.kind}</legend>
        {(["individual", "firm"] as const).map((k) => (
          <label
            key={k}
            className={cx(
              "flex cursor-pointer gap-3 border bg-white p-4 transition-colors m-press",
              d.kind === k ? "border-navy-700 ring-2 ring-navy-700/10" : "border-border hover:border-navy-700/30",
            )}
          >
            <input type="radio"name="kind"className="mt-1 size-5 accent-navy-700"checked={d.kind === k} onChange={() => set({ kind: k })} />
            <span>
              <span className="flex items-center gap-2 text-label">
                <Icon name={k === "firm" ? "building" : "user"} size={16} aria-hidden /> {c.f[k]}
              </span>
              <span className="text-small text-fg-muted">{k === "firm" ? c.f.firmHint : c.f.individualHint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {d.kind === "firm" && (
        <div className="grid gap-4 sm:grid-cols-2 m-rise">
          <F id="firmName" label={c.f.firmName} error={msg("firmName")}>
            {(p) => <Input {...p} value={d.firmName} autoComplete="organization" onChange={(e) => set({ firmName: e.target.value })} />}
          </F>
          <F id="firmCode" label={c.f.firmCode} error={msg("firmCode")}>
            {(p) => <Input {...p} value={d.firmCode} inputMode="numeric" onChange={(e) => set({ firmCode: e.target.value })} />}
          </F>
        </div>
      )}
      <F id="name" label={d.kind === "firm" ? c.f.contactName : c.f.name} error={msg("name")}>
        {(p) => <Input {...p} value={d.name} autoComplete="name" onChange={(e) => set({ name: e.target.value })} />}
      </F>
      <div className="grid gap-4 sm:grid-cols-2">
        <F id="email" label={c.f.email} error={msg("email")}>
          {(p) => <Input {...p} type="email" value={d.email} autoComplete="email" onChange={(e) => set({ email: e.target.value })} />}
        </F>
        <F id="phone" label={c.f.phone} error={msg("phone")}>
          {(p) => <PhoneInput {...p} value={d.phone} autoComplete="tel-national" onChange={(e) => set({ phone: e.target.value })} />}
        </F>
      </div>
      {d.kind === "individual" && (
        <F id="district" label={c.f.district} error={msg("district")}>
          {(p) => <Input {...p} value={d.district} autoComplete="address-level2" onChange={(e) => set({ district: e.target.value })} />}
        </F>
      )}
    </>
  );
}

function StepServices({ d, set, c, msg }: StepProps) {
  const q = usePublicServices();
  const [s, setS] = useState("");
  const list = (q.data?.items ?? []).filter((x) => x.name.toLowerCase().includes(s.trim().toLowerCase()));
  const toggle = (slug: string) => set({ services: d.services.includes(slug) ? d.services.filter((x) => x !== slug) : [...d.services, slug] });
  return (
    <>
      <fieldset id="services"tabIndex={-1} className="grid gap-3"aria-describedby={msg("services") ? "services-err" : undefined}>
        <legend className="text-label">{c.f.services}</legend>
        <p className="text-small text-fg-subtle">{c.f.servicesHint}</p>
        {msg("services") && (
          <p id="services-err"className="text-small font-medium text-danger">
            {msg("services")}
          </p>
        )}
        <label className="relative">
          <span className="sr-only">{c.f.search}</span>
          <Icon name="search"size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-fg-subtle" />
          <Input value={s} onChange={(e) => setS(e.target.value)} placeholder={c.f.search} className="pl-10" />
        </label>
        {q.isPending ? (
          <div className="grid gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 m-shimmer" />
            ))}
          </div>
        ) : q.isError ? (
          <p role="alert"className="flex items-center gap-3 bg-danger-bg px-3 py-2 text-small">
            <span className="flex-1">{errorCopy(q.error)}</span>
            <button type="button"className="underline"onClick={() => q.refetch()}>
              ↻
            </button>
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 m-stagger">
            {list.map((x, i) => {
              const on = d.services.includes(x.slug);
              return (
                <li key={x.slug} style={{ ["--i" as string]: i }}>
                  <label className={cx("flex h-full cursor-pointer items-center gap-3 border bg-white px-3 py-3 text-small transition-colors", on ? "border-navy-700 bg-tint" : "border-border hover:border-navy-700/30")}>
                    <input type="checkbox"className="size-5 accent-navy-700"checked={on} onChange={() => toggle(x.slug)} />
                    {x.name}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>
      <F id="expertise" label={c.f.expertise} hint={c.f.expertiseHint} optional="optional">
        {(p) => <Textarea {...p} rows={3} value={d.expertise} onChange={(e) => set({ expertise: e.target.value })} />}
      </F>
    </>
  );
}

function StepRates({ d, set, c, msg }: StepProps) {
  const names = usePublicServices().data?.items ?? [];
  return (
    <>
      <p className="flex items-start gap-2 bg-tint px-3 py-2 text-small">
        <Icon name="wallet"size={15} aria-hidden className="mt-0.5 text-navy-700" />
        {c.f.rateNote}
      </p>
      <ul className="grid gap-3">
        {d.services.map((s) => {
          const r = d.rates[s] ?? { mode: "pct" as const, value: "" };
          const put = (p: Partial<typeof r>) => set({ rates: { ...d.rates, [s]: { ...r, ...p } } });
          return (
            <li key={s} className="grid gap-3 border border-border bg-white p-4">
              <p className="text-label">{names.find((n) => n.slug === s)?.name ?? s}</p>
              <Segmented
                label={c.f.rateMode.pct}
                value={r.mode}
                onChange={(mode) => put({ mode })}
                options={(["pct", "flat", "hourly"] as const).map((m) => ({ value: m, label: c.f.rateMode[m] }))}
                className="w-fit max-w-full flex-wrap"
              />
              <F id={`rate-${s}`} label={c.f.rateMode[r.mode]} error={msg(`rate-${s}`)}>
                {(p) => <Input {...p} inputMode="numeric"value={r.value} onChange={(e) => put({ value: e.target.value.replace(/[^\d]/g, "") })} className="max-w-48 tabular" />}
              </F>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function StepAvailability({ d, set, c, msg }: StepProps) {
  const toggle = (k: string) => set({ grid: d.grid.includes(k) ? d.grid.filter((x) => x !== k) : [...d.grid, k] });
  return (
    <>
      <fieldset id="grid"tabIndex={-1} className="grid gap-2">
        <legend className="mb-1 text-label">{c.f.grid}</legend>
        {msg("grid") && <p className="text-small font-medium text-danger">{msg("grid")}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-80 border-separate border-spacing-1 text-small">
            <thead>
              <tr>
                <th />
                {DAYS.map((x) => (
                  <th key={x} scope="col"className="font-medium text-fg-muted">
                    {c.f.days[x]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((sl) => (
                <tr key={sl}>
                  <th scope="row"className="pr-2 text-left font-normal text-fg-muted">
                    {c.f.slots[sl]}
                  </th>
                  {DAYS.map((x) => {
                    const k = `${x}-${sl}`;
                    const on = d.grid.includes(k);
                    return (
                      <td key={k}>
                        <button
                          type="button"
                          aria-pressed={on}
                          aria-label={`${c.f.days[x]} ${c.f.slots[sl]}`}
                          onClick={() => toggle(k)}
                          className={cx("flex h-10 w-full items-center justify-center transition-colors m-press", on ? "bg-secondary text-on-navy" : "bg-white border border-border hover:border-navy-700/30")}
                        >
                          {on && <Icon name="check" size={14} aria-hidden />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <F id="maxJobs" label={c.f.maxJobs} error={msg("maxJobs")}>
          {(p) => <Input {...p} type="number"min={1} max={POLICY.capMax} value={d.maxJobs} onChange={(e) => set({ maxJobs: e.target.value })} className="tabular" />}
        </F>
        <F id="start" label={c.f.start} error={msg("start")}>
          {(p) => <DateInput {...p} value={d.start} onChange={(e) => set({ start: e.target.value })} />}
        </F>
      </div>
    </>
  );
}

function StepRegistrations({ d, set, c, msg }: StepProps) {
  const [tooMany, setTooMany] = useState(false);
  return (
    <>
      <F id="body" label={c.f.body} error={msg("body")}>
        {(p) => (
          <Select {...p} value={d.body} onChange={(e) => set({ body: e.target.value })}>
            <option value="" />
            {(["icpar", "rba", "other"] as const).map((b) => (
              <option key={b} value={b}>
                {c.f.bodies[b]}
              </option>
            ))}
          </Select>
        )}
      </F>
      {d.body === "other" && (
        <F id="bodyOther" label={c.f.bodyOther} error={msg("bodyOther")}>
          {(p) => <Input {...p} value={d.bodyOther} onChange={(e) => set({ bodyOther: e.target.value })} />}
        </F>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <F id="regNumber" label={c.f.regNumber} error={msg("regNumber")}>
          {(p) => <Input {...p} value={d.regNumber} onChange={(e) => set({ regNumber: e.target.value })} />}
        </F>
        <F id="regExpiry" label={c.f.regExpiry} optional="optional">
          {(p) => <DateInput {...p} value={d.regExpiry} onChange={(e) => set({ regExpiry: e.target.value })} />}
        </F>
      </div>
      <div id="files"tabIndex={-1} className="grid gap-2">
        <p className="text-label">{c.f.files}</p>
        <p className="text-small text-fg-subtle">{fill(c.f.filesHint, { mb: POLICY.qualificationMaxMb, max: POLICY.qualificationMaxFiles })}</p>
        {msg("files") && <p className="text-small font-medium text-danger">{msg("files")}</p>}
        {tooMany && <p className="text-small font-medium text-danger">{fill(c.f.tooMany, { max: POLICY.qualificationMaxFiles })}</p>}
        {d.files.length < POLICY.qualificationMaxFiles && (
          <FileDrop
            accept="application/pdf,image/jpeg,image/png"
            maxSizeMb={POLICY.qualificationMaxMb}
            multiple
            camera
            onFiles={async (fs) => {
              const room = POLICY.qualificationMaxFiles - d.files.length;
              setTooMany(fs.length > room);
              const up = await Promise.all(fs.slice(0, room).map((f) => uploadFile(f, "qualification").catch(() => null)));
              set({ files: [...d.files, ...up.filter((u) => u !== null).map((u) => ({ name: u.name, size: u.size, href: u.href }))] });
            }}
          />
        )}
        <ul className="grid gap-2">
          {d.files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-3 border border-border bg-white px-3 py-2 text-small m-rise">
              <Icon name="fileCheck"size={16} aria-hidden className="text-success" />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="text-eyebrow text-fg-subtle tabular">{Math.max(1, Math.round(f.size / 1024))} KB</span>
              <button type="button"className="text-fg-muted underline"onClick={() => set({ files: d.files.filter((_, j) => j !== i) })}>
                {c.f.remove}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function StepReferences({ d, set, c, msg }: StepProps) {
  const put = (i: number, p: Partial<Draft["refs"][number]>) => set({ refs: d.refs.map((r, j) => (j === i ? { ...r, ...p } : r)) });
  return (
    <>
      <p className="text-small text-fg-muted">{c.f.refsIntro}</p>
      {d.refs.map((r, i) => (
        <fieldset key={i} className="grid gap-3 border border-border bg-white p-4 m-rise">
          <legend className="sr-only">
            {c.f.refName} {i + 1}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <F id={`ref-${i}-name`} label={c.f.refName} error={msg(`ref-${i}-name`)}>
              {(p) => <Input {...p} value={r.name} onChange={(e) => put(i, { name: e.target.value })} />}
            </F>
            <F id={`ref-${i}-org`} label={c.f.refOrg} optional="optional">
              {(p) => <Input {...p} value={r.org} onChange={(e) => put(i, { org: e.target.value })} />}
            </F>
          </div>
          <F id={`ref-${i}-contact`} label={c.f.refContact} error={msg(`ref-${i}-contact`)}>
            {(p) => <Input {...p} value={r.contact} onChange={(e) => put(i, { contact: e.target.value })} />}
          </F>
          <Checkbox id={`ref-${i}-ok`} label={c.f.refOk} checked={r.ok} onChange={(e) => put(i, { ok: e.target.checked })} />
          {msg(`ref-${i}-ok`) && <p className="text-small font-medium text-danger">{msg(`ref-${i}-ok`)}</p>}
          <button type="button"className="w-fit text-small text-fg-muted underline"onClick={() => set({ refs: d.refs.filter((_, j) => j !== i) })}>
            {c.f.remove}
          </button>
        </fieldset>
      ))}
      {d.refs.length < 3 && (
        <Button type="button"variant="outline"size="sm"className="w-fit"onClick={() => set({ refs: [...d.refs, { name: "", org: "", contact: "", ok: false }] })}>
          <Icon name="plus" size={14} aria-hidden /> {c.f.addRef}
        </Button>
      )}
    </>
  );
}

function StepReview({ d, set, c, msg, go }: StepProps & { go: (s: ApplyStep) => void }) {
  const { locale } = useI18n();
  const names = usePublicServices().data?.items ?? [];
  const name = (s: string) => names.find((n) => n.slug === s)?.name ?? s;
  const rows = useMemo<[ApplyStep, string][]>(
    () => [
      ["profile", [d.kind === "firm" ? d.firmName : null, d.name, d.email, d.phone && `+250 ${d.phone}`].filter(Boolean).join(" · ")],
      ["services", d.services.map(name).join(", ")],
      ["rates", d.services.map((s) => `${name(s)}: ${d.rates[s]?.value ?? "—"} ${d.rates[s] ? c.f.rateMode[d.rates[s].mode] : ""}`).join(" · ")],
      ["availability", `${d.grid.length} × · ${c.f.maxJobs}: ${d.maxJobs} · ${d.start}`],
      ["registrations", [d.body && (d.body === "other" ? d.bodyOther : c.f.bodies[d.body as "icpar"]), d.regNumber, `${d.files.length} file(s)`].filter(Boolean).join(" · ")],
      ["references", d.refs.length ? d.refs.map((r) => r.name).join(", ") : "—"],
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [d, names, c],
  );
  return (
    <>
      <dl className="grid gap-2">
        {rows.map(([s, v]) => {
          const bad = Object.keys(validate(s, d)).length > 0;
          return (
            <div key={s} className={cx("grid grid-cols-[1fr_auto] gap-x-3 border bg-white p-4", bad ? "border-danger/40" : "border-border")}>
              <dt className="flex items-center gap-2 text-label">
                {bad ? <Icon name="x"size={14} aria-hidden className="text-danger" /> : <Icon name="check"size={14} aria-hidden className="text-success" />}
                {c.steps[s]}
              </dt>
              <dd className="row-span-2 self-center">
                <button type="button"className="text-small font-medium text-navy-700 underline underline-offset-4"onClick={() => go(s)}>
                  {c.f.edit}
                </button>
              </dd>
              <dd className="mt-1 text-small break-words text-fg-muted">{v || "—"}</dd>
            </div>
          );
        })}
      </dl>
      <fieldset className="grid gap-3">
        {(["consentPrivacy", "consentRetention", "consentAccuracy"] as const).map((k) => (
          <div key={k}>
            <Checkbox
              id={k}
              checked={d[k]}
              onChange={(e) => set({ [k]: e.target.checked })}
              label={
                k === "consentPrivacy" ? (
                  <>
                    {c.f.consentPrivacy} ·{" "}
                    <Link href={localHref(locale, "/legal/privacy")} target="_blank"className="underline underline-offset-4">
                      {c.f.privacyLink}
                    </Link>
                  </>
                ) : (
                  fill(c.f[k], { months: POLICY.rejectedRetentionMonths })
                )
              }
            />
            {msg(k) && <p className="mt-1 pl-8 text-small font-medium text-danger">{msg(k)}</p>}
          </div>
        ))}
      </fieldset>
    </>
  );
}

/** AP3 received: ref, tracker, next steps. */
function Received({ refId, c }: { refId: string; c: WorkApply }) {
  const { locale } = useI18n();
  return (
    <div className="grid gap-6 text-center m-rise">
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-navy-50 text-navy-700">
        <Icon name="check"size={28} aria-hidden className="m-tick" />
      </span>
      <div>
        <h1 className="text-h3">{c.done.title}</h1>
        <p className="mt-3 text-body text-fg-muted">{fill(c.done.body, { ref: refId, days: POLICY.applicationReviewDays })}</p>
        <p className="mt-3 inline-flex bg-secondary px-4 py-1.5 text-label text-on-navy tabular">{refId}</p>
      </div>
      <ApplicationTracker status="received" c={c} />
      <p className="text-small text-fg-subtle">{c.done.channels}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink href={localHref(locale, `/join/status?ref=${encodeURIComponent(refId)}`)}>{c.done.track}</ButtonLink>
        <ButtonLink href={localHref(locale, "/")} variant="outline">
          {c.done.home}
        </ButtonLink>
      </div>
    </div>
  );
}
