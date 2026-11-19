"use client";
import { useOnline } from "@/components/atoms/hooks";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { api, unwrap, ApiError, newIdempotencyKey } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import type { Tier } from "@/lib/catalogue";
const totalFee = (t: Tier) => t.fee + t.governmentFee;
import { cx, formatDateTime } from "@/shared/format";
import {
  flowCopy,
  fill,
  type FieldDef,
  type FlowCopy,
} from "@/content/pages/flow";
import { laCopy } from "@/content/pages/la";
import {
  AuthTitle,
  Notice,
  ResultPanel,
  apiMessage,
  VerifyNotice,
} from "@/components/molecules/auth/auth";
import { PhoneInput, Segmented, toE164 } from "@/components/atoms/inputs";
import { Button, ButtonLink } from "@/components/atoms/button";
import {
  Checkbox,
  DateInput,
  ErrorSummary,
  Field,
  Input,
  Radio,
  Textarea,
} from "@/components/atoms/field";
import { FileDrop } from "@/components/atoms/file-drop";
import { Stepper } from "@/components/atoms/misc";
import { Money } from "@/components/atoms/domain";
import { Icon } from "@/components/atoms/icon";
import { Dialog } from "@/components/atoms/dialog";
import { EmptyState, ErrorState, Skeleton } from "@/components/atoms/feedback";
import { uploadCaseDoc, type LibDoc } from "@/components/molecules/client/api";

type Svc = {
  slug: string;
  name: string;
  family: string;
  tiers: Tier[];
  requirements: string[];
  paused: boolean;
};
type Person = {
  fullName: string;
  nationalId: string;
  dob: string;
  phone: string;
  email: string;
  whatsapp: boolean;
};
type Holder = { name: string; pct: string };
export type Draft = {
  step: number;
  elig: (boolean | null)[];
  tier: string;
  person: Person;
  data: Record<string, unknown>;
  docs: Record<string, string>; // requirement key → file name, or "later"
  terms: [boolean, boolean];
  idem: string;
  savedAt: number;
};
type BasketItem = {
  slug: string;
  name: string;
  tierLabel: string;
  fee: number;
  draft: Draft;
};
type Submitted = components["schemas"]["SubmitApplicationResponse"];
type Errors = Record<string, string>;

const draftKey = (slug: string) => `hebuza.apply.${slug}`;
const BASKET = "hebuza.basket";
const LATER = "later";
const MAX_UPLOAD_MB = 10; // PLACEHOLDER(upload-max-mb): spec gives no limit; keep in step with the mock 413
const reqKey = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
const omit = <T,>(o: Record<string, T>, k: string) => Object.fromEntries(Object.entries(o).filter(([x]) => x !== k));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function read<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, v: unknown) {
  try {
    if (v == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(v));
  } catch {} // private mode / quota: the wizard still works, just without autosave
}


/** Pure validators per step (exported for unit tests). */
export function validateStep(
  step: number,
  d: Draft,
  c: FlowCopy,
  fields: FieldDef[],
  reqs: string[],
  files: Record<string, unknown>, // File or a picked library document
  hasTiers: boolean,
): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (d.elig.some((a) => a == null)) e.elig = c.elig.answerAll;
    if (hasTiers && !d.tier) e.tier = c.elig.tierRequired;
  }
  if (step === 1) {
    const p = d.person;
    if (!p.fullName.trim()) e.fullName = c.required;
    if (!/^\d{16}$/.test(p.nationalId.replace(/\s/g, "")))
      e.nationalId = c.about.badId;
    if (!p.dob) e.dob = c.required;
    if (!toE164(p.phone)) e.phone = c.about.badPhone;
    if (!EMAIL.test(p.email.trim())) e.email = c.about.badEmail;
  }
  if (step === 2) {
    for (const f of fields) {
      const v = d.data[f.key];
      if (f.type === "ranked") {
        if (!(v as string[] | undefined)?.[0]?.trim()) e[f.key] = c.required;
      } else if (f.type === "shareholders") {
        const rows = (v as Holder[] | undefined) ?? [];
        const total = rows.reduce((s, r) => s + (Number(r.pct) || 0), 0);
        if (!rows.length || rows.some((r) => !r.name.trim()))
          e[f.key] = c.required;
        else if (total !== 100)
          e[f.key] = fill(c.details.sharesTotal, { n: total });
      } else if (!("optional" in f && f.optional) && !String(v ?? "").trim())
        e[f.key] = c.required;
    }
  }
  if (step === 3) {
    for (const r of reqs) {
      const k = reqKey(r);
      if (d.docs[k] !== LATER && !files[k])
        e[k] = d.docs[k] ? c.docs.reattach : c.required;
    }
  }
  if (step === 4 && !(d.terms[0] && d.terms[1])) e.terms = c.review.mustAccept;
  return e;
}

export function ApplyWizard({ service: svc }: { service: Svc }) {
  const { locale } = useI18n();
  const { user } = useSession();
  const c = flowCopy(locale);
  const la = laCopy(locale).elig;
  const questions = la.questions[svc.family] ?? la.fallback;
  const fields = c.fields[svc.slug] ?? c.fields.default;
  const L = (p: string) => localHref(locale, p);
  // ORG-08: the active company (switcher on /orgs) files the request when the client may submit for it.
  const orgs = useQuery({
    queryKey: ["c4", "orgs"],
    queryFn: () => unwrap<{ activeOrgId: string | null; orgs: { id: string; name: string; myRole: string }[] }>(api.GET("/api/me/orgs")),
    enabled: !!user?.roles.includes("client"),
  });
  // ORG-06: with the profile_reuse consent, empty personal fields prefill from the saved profile (client still reviews).
  const prefill = useQuery({
    queryKey: ["prefill", svc.slug, orgs.data?.activeOrgId ?? "me"],
    queryFn: () => unwrap<{ consent: boolean; values: Record<string, string> }>(api.GET("/api/me/prefill", { params: { query: { service: svc.slug, party: orgs.data?.activeOrgId ?? "me" } } })),
    enabled: !!user?.roles.includes("client") && !orgs.isPending,
  });
  const actingOrg = orgs.data?.orgs.find((o) => o.id === orgs.data?.activeOrgId && o.myRole !== "viewer") ?? null;

  // The shell only renders this after the session resolves (client-side), so localStorage is safe in initialisers.
  const [stored] = useState(() => read<Draft>(draftKey(svc.slug)));
  const [draft, setDraft] = useState<Draft>(
    () =>
      stored ?? {
        step: 0,
        elig: questions.map(() => null),
        tier: svc.tiers.length === 1 ? svc.tiers[0].key : "",
        person: {
          fullName: user?.name ?? "",
          nationalId: "",
          dob: "",
          phone: user?.phone?.replace(/^\+250/, "") ?? "",
          email: user?.email ?? "",
          whatsapp: false,
        },
        data: {},
        docs: {},
        terms: [false, false],
        idem: newIdempotencyKey(),
        savedAt: 0,
      },
  );
  const [basket, setBasket] = useState<BasketItem[]>(() =>
    (read<BasketItem[]>(BASKET) ?? []).filter((b) => b.slug !== svc.slug),
  );
  const [resumed, setResumed] = useState(!!stored && stored.step > 0);
  const [uploads, setFiles] = useState<Record<string, File>>({});
  const [picked, setPicked] = useState<Record<string, { id: string; name: string }>>({});
  const [picking, setPicking] = useState<string | null>(null);
  const files: Record<string, { name: string }> = { ...uploads, ...picked };
  const drop = (k: string) => {
    setFiles((all) => omit(all, k));
    setPicked((all) => omit(all, k));
  };
  const [errors, setErrors] = useState<Errors>({});
  const [notEligible, setNotEligible] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    results: Submitted[];
    group?: string;
    later: string[];
    uploadFailed: boolean;
  } | null>(null);
  const online = useOnline();
  const heading = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!done && draft.savedAt) write(draftKey(svc.slug), draft);
  }, [draft, done, svc.slug]);
  useEffect(() => {
    heading.current?.focus();
    scrollTo({ top: 0 });
  }, [draft.step, notEligible, done]);

  const update = (patch: Partial<Draft>) =>
    setDraft((d) => ({ ...d, ...patch, savedAt: Date.now() }));
  const setPerson = (k: keyof Person, v: string | boolean) =>
    update({ person: { ...draft.person, [k]: v } });
  const setData = (k: string, v: unknown) =>
    update({ data: { ...draft.data, [k]: v } });
  // Fill only empty fields, once per prefill result, so nothing the client typed is overwritten.
  const pv = prefill.data?.values;
  useEffect(() => {
    if (!pv) return;
    setDraft((d) => ({
      ...d,
      person: {
        ...d.person,
        fullName: d.person.fullName || pv["person.full_name"] || "",
        nationalId: d.person.nationalId || pv["person.national_id"] || "",
        dob: d.person.dob || pv["person.dob"] || "",
        email: d.person.email || pv["person.email"] || "",
        phone: d.person.phone || (pv["person.phone"] ?? "").replace(/^\+250/, ""),
      },
      // Detail fields bound to a profile path (structure builder "Prefill from profile").
      data: {
        ...Object.fromEntries(fields.flatMap((f) => ("profile" in f && f.profile && pv[f.profile] ? [[f.key, pv[f.profile]]] : []))),
        ...d.data,
      },
    }));
  }, [pv]);
  const tier = svc.tiers.find((t) => t.key === draft.tier);
  const go = (step: number) => {
    setErrors({});
    update({ step });
  };

  function next() {
    const e = validateStep(
      draft.step,
      draft,
      c,
      fields,
      svc.requirements,
      files,
      svc.tiers.length > 0,
    );
    setErrors(e);
    if (Object.keys(e).length) return;
    if (draft.step === 0 && draft.elig.includes(false))
      return setNotEligible(true);
    if (draft.step < 4) go(draft.step + 1);
    else void submit();
  }

  const person = () => ({
    ...draft.person,
    phone: toE164(draft.person.phone) ?? draft.person.phone,
    nationalId: draft.person.nationalId.replace(/\s/g, ""),
    consent: true,
    language: locale,
  });

  async function submitOne(d: Draft, slug: string) {
    return unwrap<Submitted>(
      api.POST("/api/applications/submit", {
        headers: { "Idempotency-Key": d.idem }, // the route is @Idempotent: without the header every submit is a 400
        body: {
          service_slug: slug,
          tier: d.tier || "standard",
          is_urgent: d.tier === "urgent",
          idempotency_key: d.idem, // same key across retries → the server replays instead of double-creating (F-REQ-02)
          personal_info: person(),
          service_data: d.data,
          organization_id: actingOrg?.id ?? null,
        },
      }),
    );
  }

  async function submit() {
    if (pending) return;
    setPending(true);
    setServerError(null);
    try {
      let main: Submitted;
      let rest: Submitted[] = [];
      let group: string | undefined;
      if (basket.length && user) {
        // REQ-02: signed-in basket = one request group, one transaction.
        const g = await unwrap<{ group_code: string; items: Submitted[] }>(api.POST("/api/applications/submit-basket", {
          headers: { "Idempotency-Key": draft.idem },
          body: {
            idempotency_key: draft.idem,
            organization_id: actingOrg?.id ?? null,
            personal_info: person(),
            items: [{ d: draft, slug: svc.slug }, ...basket.map((b) => ({ d: b.draft, slug: b.slug }))].map(({ d, slug }) => ({
              service_slug: slug, tier: d.tier || "standard", is_urgent: d.tier === "urgent", service_data: d.data,
            })),
          },
        }));
        [main, ...rest] = g.items;
        group = g.group_code;
        setBasket([]);
      } else {
        main = await submitOne(draft, svc.slug);
        for (const b of basket) {
          rest.push(await submitOne(b.draft, b.slug));
          setBasket((all) => {
            const left = all.filter((x) => x.slug !== b.slug);
            write(BASKET, left.length ? left : null);
            return left;
          });
        }
      }
      let uploadFailed = false as boolean;
      for (const [k, d] of Object.entries(picked)) {
        // ★ attach a library document to the new request instead of re-uploading (documents spec §11).
        await unwrap(api.POST("/api/me/documents/{id}/attach", { params: { path: { id: d.id } }, body: { code: main.code, requirementKey: k } })).catch(() => (uploadFailed = true));
      }
      for (const [k, file] of Object.entries(uploads)) {
        await uploadCaseDoc(main.code, file, { requirement_key: k })
          .catch(() => (uploadFailed = true));
      }
      write(draftKey(svc.slug), null);
      write(BASKET, null);
      setDone({
        results: [main, ...rest],
        group,
        later: svc.requirements.filter((r) => draft.docs[reqKey(r)] === LATER),
        uploadFailed,
      });
    } catch (e) {
      if (
        e instanceof ApiError &&
        e.isValidation &&
        e.fields &&
        Object.keys(e.fields).length
      ) {
        const mapped: Errors = {};
        for (const [k, m] of Object.entries(e.fields))
          mapped[k.split(".").pop()!] = m;
        const personal = Object.keys(mapped).some((k) => k in draft.person);
        setErrors(mapped);
        update({ step: personal ? 1 : 2 });
      } else
        setServerError(
          e instanceof ApiError && e.isAuth
            ? c.generic
            : apiMessage(e, c.generic, locale),
        );
    } finally {
      setPending(false);
    }
  }

  function addToBasket() {
    const e = validateStep(
      4,
      { ...draft, terms: [true, true] },
      c,
      fields,
      svc.requirements,
      files,
      svc.tiers.length > 0,
    );
    if (Object.keys(e).length) return setErrors(e);
    const item: BasketItem = {
      slug: svc.slug,
      name: svc.name,
      tierLabel: tier?.label ?? "",
      fee: tier ? totalFee(tier) : 0,
      draft,
    };
    write(BASKET, [...basket, item]);
    write(draftKey(svc.slug), null);
    location.assign(L("/services"));
  }

  const errorList = Object.entries(errors).map(([field, message]) => ({
    field,
    message,
  }));

  if (done) {
    const [first] = done.results;
    return (
      <div
        ref={heading}
        tabIndex={-1}
        className="mx-auto grid max-w-xl gap-8 outline-none"
      >
        <ResultPanel icon="check" title={`${c.done.title} ${c.done.titleHi}`}>
          {done.group && <p className="text-small text-fg-muted">{fill(c.done.group, { code: done.group })}</p>}
          <ul className="grid w-full gap-2">
            {done.results.map((r) => (
              <li
                key={r.code}
                className="flex flex-wrap items-center justify-between gap-3 border border-border bg-surface px-4 py-3 shadow-sm"
              >
                <span className="text-left">
                  <span className="block text-small text-fg-muted">
                    {r.service_name}
                  </span>
                  <span className="text-label-lg tabular">{r.code}</span>
                </span>
                <span className="flex gap-2">
                  <CopyButton text={r.code} c={c} />
                  {r.payment_required && (
                    <ButtonLink
                      href={L(`/pay/${encodeURIComponent(r.code)}`)}
                      size="sm"
                    >
                      {c.done.pay}
                    </ButtonLink>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </ResultPanel>
        <section>
          <h2 className="text-card-title">{c.done.next}</h2>
          <ol className="mt-3 grid gap-2">
            {c.done.nextSteps.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-body">
                <span data-round className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-eyebrow text-on-secondary">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </section>
        {done.uploadFailed && (
          <Notice tone="warning">{c.done.uploadFailed}</Notice>
        )}
        {done.later.length > 0 && (
          <Notice tone="warning">
            <p className="text-label">{c.done.stillNeeded}</p>
            <ul className="mt-1 list-disc pl-5">
              {done.later.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </Notice>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <ButtonLink
            href={L(`/requests/${encodeURIComponent(first.code)}`)}
            dots
            className="justify-center"
          >
            {c.done.view}
          </ButtonLink>
          <ButtonLink
            href={L("/services")}
            variant="outline"
            className="justify-center"
          >
            {c.done.another}
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (notEligible) {
    return (
      <div
        ref={heading}
        tabIndex={-1}
        className="mx-auto grid max-w-xl gap-6 outline-none"
      >
        <ResultPanel icon="sparkle" tone="warning" title={c.notEligible.title}>
          <p className="text-lead text-fg-muted">{c.notEligible.body}</p>
        </ResultPanel>
        <div className="grid gap-3 sm:grid-cols-3">
          <ButtonLink href={L("/book")} className="justify-center">
            {c.notEligible.talk}
          </ButtonLink>
          <Button
            variant="outline"
            className="justify-center"
            onClick={() => setNotEligible(false)}
          >
            {c.notEligible.retry}
          </Button>
          <ButtonLink
            href={L("/services")}
            variant="ghost"
            className="justify-center"
          >
            {c.notEligible.browse}
          </ButtonLink>
        </div>
      </div>
    );
  }

  const step = draft.step;
  const titles: [string, string, string?][] = [
    [c.elig.title, c.elig.titleHi, c.elig.lede],
    [c.about.title, c.about.titleHi],
    [c.details.title, c.details.titleHi],
    [c.docs.title, c.docs.titleHi, c.docs.phoneOk],
    [c.review.title, c.review.titleHi],
  ];
  const reqsDone = svc.requirements.filter(
    (r) => files[reqKey(r)] || draft.docs[reqKey(r)] === LATER,
  ).length;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
      <div className="min-w-0">
        <Stepper steps={c.steps} current={step} />
        <div ref={heading} tabIndex={-1} className="mt-8 outline-none">
          <p className="mb-2 text-eyebrow text-fg-subtle uppercase">
            {svc.name}
          </p>
          <AuthTitle
            title={titles[step][0]}
            hi={titles[step][1]}
            lede={titles[step][2]}
          />
        </div>
        {!online && <Notice tone="warning">{c.offline}</Notice>}
        {resumed && (
          <Notice tone="info">
            <span className="flex flex-wrap items-center justify-between gap-3">
              <span>
                <strong>{c.resume.title}.</strong>{" "}
                {fill(c.resume.body, {
                  time: formatDateTime(draft.savedAt, locale),
                })}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  write(draftKey(svc.slug), null);
                  location.reload();
                }}
              >
                {c.resume.discard}
              </Button>
            </span>
          </Notice>
        )}
        {actingOrg && <Notice tone="info">{fill(c.done.actingFor, { org: actingOrg.name })}</Notice>}
        {serverError && <Notice>{serverError}</Notice>}
        {errorList.length > 0 && (
          <div className="mb-6">
            <ErrorSummary title={c.fixErrors} errors={errorList} />
          </div>
        )}
        {svc.paused && <Notice tone="warning">{c.elig.paused}</Notice>}

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setResumed(false);
            next();
          }}
          className="grid gap-6"
        >
          {step === 0 && (
            <>
              <fieldset id="elig" className="grid gap-5">
                <legend className="sr-only">{c.steps[0]}</legend>
                {questions.map((q, i) => (
                  <div key={q} className="grid gap-2">
                    <p className="text-label">{q}</p>
                    <Segmented
                      label={q}
                      value={
                        draft.elig[i] == null
                          ? ""
                          : draft.elig[i]
                            ? "yes"
                            : "no"
                      }
                      onChange={(v) =>
                        update({
                          elig: draft.elig.map((a, j) =>
                            j === i ? v === "yes" : a,
                          ),
                        })
                      }
                      options={[
                        { value: "yes", label: c.elig.yes },
                        { value: "no", label: c.elig.no },
                      ]}
                    />
                  </div>
                ))}
              </fieldset>
              {svc.tiers.length > 0 && (
                <fieldset id="tier" className="grid gap-3">
                  <legend className="mb-3 text-label">{c.elig.tier}</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {svc.tiers.map((t) => (
                      <label
                        key={t.key}
                        className={cx(
                          "grid cursor-pointer gap-1 border-2 bg-surface p-4 has-focus-visible:outline-2 has-focus-visible:outline-focus",
                          draft.tier === t.key
                            ? "border-secondary bg-navy-50"
                            : "border-border",
                        )}
                      >
                        <span className="flex items-center gap-2 text-label-lg">
                          <input
                            type="radio"
                            name="tier"
                            className="size-5 accent-secondary"
                            checked={draft.tier === t.key}
                            onChange={() => update({ tier: t.key })}
                          />
                          {t.label}
                        </span>
                        <Money
                          amount={totalFee(t)}
                          className="text-card-title"
                        />
                        <span className="text-small text-fg-muted">
                          {fill(c.elig.ready, { eta: t.eta })}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <section>
                <h2 className="text-label">{c.elig.need}</h2>
                {svc.requirements.length ? (
                  <ul className="mt-2 grid gap-1.5">
                    {svc.requirements.map((r) => (
                      <li key={r} className="flex items-start gap-2 text-body">
                        <Icon
                          name="check"
                          size={18}
                          className="mt-0.5 shrink-0 text-success"
                          aria-hidden
                        />
                        {r}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-body text-fg-muted">
                    {c.elig.noneListed}
                  </p>
                )}
              </section>
            </>
          )}

          {step === 1 && (
            <>
              <Notice tone="info" className="mb-0">
                {c.about.prefilled}
              </Notice>
              <Text
                id="fullName"
                label={c.about.fullName}
                value={draft.person.fullName}
                error={errors.fullName}
                onChange={(v) => setPerson("fullName", v)}
                autoComplete="name"
              />
              <Text
                id="nationalId"
                label={c.about.nationalId}
                hint={c.about.nationalIdHint}
                value={draft.person.nationalId}
                error={errors.nationalId}
                onChange={(v) => setPerson("nationalId", v)}
                inputMode="numeric"
                autoComplete="off"
              />
              <div id="dob">
                <Field label={c.about.dob} error={errors.dob}>
                  {({ id, describedBy, invalid }) => (
                    <DateInput
                      id={id}
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                      value={draft.person.dob}
                      onChange={(e) => setPerson("dob", e.target.value)}
                      autoComplete="bday"
                    />
                  )}
                </Field>
              </div>
              <div id="phone">
                <Field label={c.about.phone} error={errors.phone}>
                  {({ id, describedBy, invalid }) => (
                    <PhoneInput
                      id={id}
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                      value={draft.person.phone}
                      onChange={(e) => setPerson("phone", e.target.value)}
                    />
                  )}
                </Field>
              </div>
              <Text
                id="email"
                label={c.about.email}
                value={draft.person.email}
                error={errors.email}
                onChange={(v) => setPerson("email", v)}
                type="email"
                autoComplete="email"
              />
              <Checkbox
                label={c.about.whatsapp}
                checked={draft.person.whatsapp}
                onChange={(e) => setPerson("whatsapp", e.target.checked)}
              />
            </>
          )}

          {step === 2 &&
            fields.map((f) => (
              <DynField
                key={f.key}
                f={f}
                c={c}
                value={draft.data[f.key]}
                error={errors[f.key]}
                onChange={(v) => setData(f.key, v)}
              />
            ))}

          {step === 3 &&
            (svc.requirements.length === 0 ? (
              <p className="text-body text-fg-muted">{c.docs.none}</p>
            ) : (
              <>
                <p className="text-label">
                  {fill(c.docs.count, {
                    done: reqsDone,
                    n: svc.requirements.length,
                  })}
                </p>
                <ul className="grid gap-4">
                  {svc.requirements.map((r) => {
                    const k = reqKey(r);
                    const file = files[k];
                    const later = draft.docs[k] === LATER;
                    return (
                      <li
                        key={k}
                        id={k}
                        className={cx(
                          "grid gap-3 border bg-surface p-4",
                          errors[k] ? "border-danger" : "border-border",
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="flex items-center gap-2 text-label-lg">
                            <Icon
                              name={file ? "fileCheck" : "file"}
                              size={20}
                              className={
                                file ? "text-success" : "text-fg-subtle"
                              }
                              aria-hidden
                            />
                            {r}
                          </p>
                          <Checkbox
                            label={c.docs.later}
                            checked={later}
                            onChange={(e) => {
                              if (e.target.checked) drop(k);
                              update({
                                docs: {
                                  ...draft.docs,
                                  [k]: e.target.checked ? LATER : "",
                                },
                              });
                            }}
                          />
                        </div>
                        {errors[k] && (
                          <p className="text-small font-medium text-danger">
                            {errors[k]}
                          </p>
                        )}
                        {later ? (
                          <p className="text-small text-fg-muted">
                            {c.docs.laterOn}
                          </p>
                        ) : file ? (
                          <p className="flex flex-wrap items-center gap-3 text-small">
                            <span className="truncate">{file.name}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => drop(k)}
                            >
                              {c.docs.replace}
                            </Button>
                          </p>
                        ) : (
                          <>
                            <FileDrop
                              accept="application/pdf,image/*"
                              camera
                              onFiles={([f]) => {
                                if (f.size > MAX_UPLOAD_MB * 1024 * 1024)
                                  return setErrors((e) => ({ ...e, [k]: fill(c.docs.tooBig, { mb: MAX_UPLOAD_MB }) }));
                                setErrors((e) => omit(e, k));
                                setFiles((all) => ({ ...all, [k]: f }));
                                update({ docs: { ...draft.docs, [k]: f.name } });
                              }}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="justify-self-start"
                              onClick={() => setPicking(k)}
                            >
                              <Icon name="layers" size={16} aria-hidden /> {c.docs.pick}
                            </Button>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <PickDoc
                  open={picking !== null}
                  c={c}
                  onClose={() => setPicking(null)}
                  onPick={(d) => {
                    const k = picking!;
                    setFiles((all) => omit(all, k));
                    setPicked((all) => ({ ...all, [k]: { id: d.documentId, name: d.label || d.originalFilename } }));
                    update({ docs: { ...draft.docs, [k]: d.originalFilename } });
                    setPicking(null);
                  }}
                />
              </>
            ))}

          {step === 4 && (
            <>
              <ReviewBlock
                title={c.steps[1]}
                edit={c.review.edit}
                onEdit={() => go(1)}
              >
                {draft.person.fullName} · +250 {draft.person.phone} ·{" "}
                {draft.person.email}
              </ReviewBlock>
              <ReviewBlock
                title={c.steps[2]}
                edit={c.review.edit}
                onEdit={() => go(2)}
              >
                <dl className="grid gap-1">
                  {fields.map((f) => (
                    <div key={f.key} className="flex flex-wrap gap-x-2">
                      <dt className="text-fg-muted">{f.label}:</dt>
                      <dd>{show(draft.data[f.key])}</dd>
                    </div>
                  ))}
                </dl>
              </ReviewBlock>
              {svc.requirements.length > 0 && (
                <ReviewBlock
                  title={c.steps[3]}
                  edit={c.review.edit}
                  onEdit={() => go(3)}
                >
                  <ul className="grid gap-1">
                    {svc.requirements.map((r) => (
                      <li key={r} className="flex items-center gap-2">
                        <Icon
                          name={files[reqKey(r)] ? "check" : "clock"}
                          size={16}
                          aria-hidden
                        />
                        {r}
                        {draft.docs[reqKey(r)] === LATER && (
                          <span className="text-small text-fg-muted">
                            ({c.review.later})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </ReviewBlock>
              )}
              <ReviewBlock
                title={c.review.service}
                edit={c.review.edit}
                onEdit={() => go(0)}
              >
                {svc.name}
                {tier && (
                  <>
                    {" "}
                    · {tier.label} · <Money amount={totalFee(tier)} />
                  </>
                )}
              </ReviewBlock>
              <fieldset
                id="terms"
                className="grid gap-3 bg-surface p-4"
              >
                <legend className="sr-only">{c.review.terms}</legend>
                <p className="text-label-lg">{c.review.terms}</p>
                <Checkbox
                  label={c.review.truth}
                  checked={draft.terms[0]}
                  onChange={(e) =>
                    update({ terms: [e.target.checked, draft.terms[1]] })
                  }
                />
                <Checkbox
                  label={c.review.accept}
                  checked={draft.terms[1]}
                  onChange={(e) =>
                    update({ terms: [draft.terms[0], e.target.checked] })
                  }
                />
              </fieldset>
            </>
          )}

          {step === 4 && user && !user.emailVerified && <VerifyNotice />}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => go(step - 1)}>
                {c.back}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap gap-3">
              {step === 4 && (
                <Button variant="outline" onClick={addToBasket}>
                  {c.review.addAnother}
                </Button>
              )}
              <Button
                type="submit"
                dots
                loading={pending}
                disabled={svc.paused || (step === 4 && (!online || !user?.emailVerified))}
              >
                {step === 0 ? c.start : step === 4 ? c.review.submit : c.next}
              </Button>
            </div>
          </div>
          {step === 4 && (
            <p className="text-right text-small text-fg-muted">
              {c.review.payAfter}
            </p>
          )}
        </form>
      </div>

      <aside
        className="lg:sticky lg:top-8 lg:self-start"
        aria-label={c.summary.title}
      >
        <div className="grid gap-4 border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-card-title">{c.summary.title}</h2>
            {draft.savedAt > 0 && (
              <span
                className="bg-gold-400 text-on-gold px-2.5 py-0.5 text-eyebrow"
                role="status"
              >
                {fill(c.saved, {
                  time:
                    formatDateTime(draft.savedAt, locale).split(" ").pop() ??
                    "",
                })}
              </span>
            )}
          </div>
          <div>
            <p className="text-label-lg">{svc.name}</p>
            {tier && (
              <p className="text-small text-fg-muted">
                {tier.label} · <Money amount={totalFee(tier)} />
              </p>
            )}
          </div>
          {basket.length > 0 && (
            <div className="grid gap-2 border-t border-border pt-4">
              <p className="text-label">{c.summary.basket}</p>
              <ul className="grid gap-2">
                {basket.map((b) => (
                  <li
                    key={b.slug}
                    className="flex items-start justify-between gap-2 text-small"
                  >
                    <span className="min-w-0">
                      {b.name}
                      {b.tierLabel && (
                        <span className="block text-fg-muted">
                          {b.tierLabel}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 flex-col items-end">
                      <Money amount={b.fee} />
                      <button
                        type="button"
                        className="text-danger underline underline-offset-2"
                        onClick={() => {
                          const left = basket.filter((x) => x.slug !== b.slug);
                          setBasket(left);
                          write(BASKET, left.length ? left : null);
                        }}
                      >
                        {c.review.removeItem}
                        <span className="sr-only"> {b.name}</span>
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-small text-fg-subtle">{c.review.basketHint}</p>
            </div>
          )}
          {(tier || basket.length > 0) && (
            <p className="flex justify-between border-t border-border pt-4 text-label-lg">
              {c.summary.total}
              <Money
                amount={
                  (tier ? totalFee(tier) : 0) +
                  basket.reduce((s, b) => s + b.fee, 0)
                }
              />
            </p>
          )}
          <p className="text-small text-fg-muted">{c.summary.payAfter}</p>
          <Link
            href={L("/dashboard")}
            className="text-button underline underline-offset-4"
          >
            {c.saveExit}
          </Link>
        </div>
      </aside>
    </div>
  );
}

const show = (v: unknown): string =>
  Array.isArray(v)
    ? v
        .map((x) =>
          typeof x === "string"
            ? x
            : `${(x as Holder).name} ${(x as Holder).pct}%`,
        )
        .filter(Boolean)
        .join(", ")
    : String(v ?? "—");

function Text({
  id,
  label,
  hint,
  value,
  error,
  onChange,
  ...rest
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
} & Omit<React.ComponentProps<"input">, "onChange" | "value" | "id">) {
  return (
    <div id={id}>
      <Field label={label} hint={hint} error={error}>
        {(ids) => (
          <Input
            id={ids.id}
            aria-describedby={ids.describedBy}
            aria-invalid={ids.invalid}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            {...rest}
          />
        )}
      </Field>
    </div>
  );
}

function ReviewBlock({
  title,
  edit,
  onEdit,
  children,
}: {
  title: string;
  edit: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-2 border-b border-border pb-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-label-lg">{title}</h2>
        <button
          type="button"
          onClick={onEdit}
          className="text-button underline underline-offset-4"
        >
          {edit}
          <span className="sr-only"> {title}</span>
        </button>
      </div>
      <div className="text-body text-fg-muted">{children}</div>
    </section>
  );
}

function CopyButton({ text, c }: { text: string; c: FlowCopy }) {
  const [ok, setOk] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() =>
        navigator.clipboard?.writeText(text).then(
          () => setOk(true),
          () => {},
        )
      }
      aria-live="polite"
    >
      {ok ? c.done.copied : c.done.copy}
    </Button>
  );
}

/** Renders one schema field (Details step). */
function DynField({
  f,
  c,
  value,
  error,
  onChange,
}: {
  f: FieldDef;
  c: FlowCopy;
  value: unknown;
  error?: string;
  onChange: (v: unknown) => void;
}) {
  if (f.type === "ranked") {
    const list =
      (value as string[] | undefined) ?? Array<string>(f.count).fill("");
    return (
      <fieldset id={f.key} className="grid gap-2">
        <legend className="text-label">{f.label}</legend>
        {f.hint && <p className="text-small text-fg-subtle">{f.hint}</p>}
        {error && <p className="text-small font-medium text-danger">{error}</p>}
        {list.map((v, i) => (
          <label key={i} className="flex items-center gap-3">
            <span className="w-5 text-label text-fg-subtle">{i + 1}</span>
            <span className="sr-only">
              {f.label} {i + 1}
            </span>
            <Input
              value={v}
              aria-invalid={i === 0 && !!error}
              onChange={(e) =>
                onChange(list.map((x, j) => (j === i ? e.target.value : x)))
              }
            />
          </label>
        ))}
      </fieldset>
    );
  }
  if (f.type === "radio") {
    return (
      <fieldset id={f.key} className="grid gap-2">
        <legend className="mb-1 text-label">{f.label}</legend>
        {error && <p className="text-small font-medium text-danger">{error}</p>}
        {f.options.map((o) => (
          <Radio
            key={o}
            name={f.key}
            label={o}
            checked={value === o}
            onChange={() => onChange(o)}
          />
        ))}
      </fieldset>
    );
  }
  if (f.type === "shareholders") {
    const rows = (value as Holder[] | undefined) ?? [{ name: "", pct: "100" }];
    const set = (i: number, k: keyof Holder, v: string) =>
      onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
    return (
      <fieldset id={f.key} className="grid gap-3">
        <legend className="text-label">{f.label}</legend>
        {f.hint && <p className="text-small text-fg-subtle">{f.hint}</p>}
        {error && <p className="text-small font-medium text-danger">{error}</p>}
        {rows.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-end gap-2"
          >
            <label className="grid gap-1 text-small">
              {c.details.name} {i + 1}
              <Input
                value={r.name}
                onChange={(e) => set(i, "name", e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-small">
              {c.details.percent}
              <Input
                inputMode="decimal"
                value={r.pct}
                onChange={(e) =>
                  set(i, "pct", e.target.value.replace(/[^\d.]/g, ""))
                }
              />
            </label>
            <Button
              size="sm"
              variant="ghost"
              disabled={rows.length === 1}
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
              aria-label={`${c.details.remove} ${i + 1}`}
            >
              <Icon name="x" size={16} />
            </Button>
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          className="justify-self-start"
          onClick={() => onChange([...rows, { name: "", pct: "" }])}
        >
          <Icon name="plus" size={16} aria-hidden /> {c.details.addShareholder}
        </Button>
      </fieldset>
    );
  }
  const v = String(value ?? "");
  return (
    <div id={f.key}>
      <Field
        label={f.label}
        hint={"hint" in f ? f.hint : undefined}
        error={error}
        optional={"optional" in f && f.optional ? c.optional : undefined}
      >
        {({ id, describedBy, invalid }) => {
          const common = {
            id,
            "aria-describedby": describedBy,
            "aria-invalid": invalid,
            value: v,
          };
          if (f.type === "textarea")
            return (
              <Textarea
                {...common}
                onChange={(e) => onChange(e.target.value)}
              />
            );
          if (f.type === "date")
            return (
              <DateInput
                {...common}
                onChange={(e) => onChange(e.target.value)}
              />
            );
          if (f.type === "search")
            return (
              <>
                <Input
                  {...common}
                  list={`${id}-list`}
                  onChange={(e) => onChange(e.target.value)}
                  autoComplete="off"
                />
                <datalist id={`${id}-list`}>
                  {f.options.map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </>
            );
          return (
            <Input {...common} onChange={(e) => onChange(e.target.value)} />
          );
        }}
      </Field>
    </div>
  );
}

/** "Pick from my documents": lists the client's library (GET /api/me/documents). */
function PickDoc({ open, c, onClose, onPick }: { open: boolean; c: FlowCopy; onClose: () => void; onPick: (d: LibDoc) => void }) {
  const [state, setState] = useState<{ docs?: LibDoc[]; error?: unknown }>({});
  const [n, setN] = useState(0); // bump to retry
  const { locale } = useI18n();
  useEffect(() => {
    if (!open) return;
    let live = true;
    unwrap<{ documents: LibDoc[] }>(api.GET("/api/me/documents")).then(
      (d) => live && setState({ docs: d.documents }),
      (error) => live && setState({ error }),
    );
    return () => {
      live = false;
      setState({});
    };
  }, [open, n]);
  return (
    <Dialog open={open} onClose={onClose} title={c.docs.pickTitle} description={c.docs.pickHint}>
      {state.error ? (
        <ErrorState error={state.error} onRetry={() => setN(n + 1)} />
      ) : !state.docs ? (
        <div className="grid gap-2" aria-busy>
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : !state.docs.length ? (
        <EmptyState body={c.docs.pickEmpty} />
      ) : (
        <ul className="grid gap-2">
          {state.docs.map((d) => (
            <li key={d.documentId}>
              <button
                type="button"
                onClick={() => onPick(d)}
                className="flex w-full items-center gap-3 border border-border p-3 text-left hover:border-navy-300 focus-visible:outline-2 focus-visible:outline-focus"
              >
                <Icon name="file" size={18} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium break-words">{d.label || d.originalFilename}</span>
                  <span className="text-small text-fg-subtle">{formatDateTime(d.updatedAt, locale)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
