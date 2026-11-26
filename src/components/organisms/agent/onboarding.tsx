"use client";
import { uploadFile } from "@/lib/api/upload";
import { useWs } from "@/lib/agent/ws";
// U2 Onboarding & clearance (board 03: ON1–ON4, PO1). Section forms are exported and reused by U13 Profile (ST1).
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { localHref } from "@/shared/i18n/config";
import { cx, formatDate } from "@/shared/format";
import { Icon } from "@/components/atoms/icon";
import { Button, ButtonLink } from "@/components/atoms/button";
import {
  Field,
  Input,
  Textarea,
  Select,
  DateInput,
  Checkbox,
} from "@/components/atoms/field";
import { FileDrop } from "@/components/atoms/file-drop";
import { useToast } from "@/components/atoms/toast";
import { PhoneInput, Segmented, toE164 } from "@/components/atoms/inputs";
import { PanelError } from "@/components/molecules/ops/ops";
import {
  PageHead,
  SkeletonRows,
  useNow,
  ClearanceBar,
} from "@/components/atoms/agent";
import { signatureMatches } from "@/shared/agent/core";
import { useSummary } from "@/lib/agent/api";
import {
  agentOnboarding,
  type OnboardingCopy,
} from "@/content/pages/agent-onboarding";
import { fill } from "@/content/pages/agent-common";
import {
  STEPS,
  RW_BANKS,
  stepDone,
  useOnboarding,
  useSaveOnboarding,
  useSubmitOnboarding,
  type Step,
  type Onboarding,
  type OnboardingPatch,
  type Edu,
  type Exp,
  type Cert,
  type PayoutMethod,
} from "@/lib/agent/f";

export const useO = () => agentOnboarding(useI18n().locale);
const uid = () => Math.random().toString(36).slice(2, 9);

// ---------------------------------------------------------------- autosave
/** Debounced section saves (700 ms) with a status chip; pending edits flush on unmount and before navigation. */
export function useSaver() {
  const m = useSaveOnboarding();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queued = useRef<OnboardingPatch>({});
  const fire = () => {
    clearTimeout(timer.current);
    const b = queued.current;
    queued.current = {};
    if (Object.keys(b).length) m.mutate(b);
  };
  /** Save whatever is queued now and resolve with the server copy (null if nothing was queued). */
  const flushAsync = async () => {
    clearTimeout(timer.current);
    const b = queued.current;
    queued.current = {};
    return Object.keys(b).length ? m.mutateAsync(b) : null;
  };
  const save = (p: OnboardingPatch) => {
    queued.current = { ...queued.current, ...p };
    clearTimeout(timer.current);
    timer.current = setTimeout(fire, 700);
  };
  useEffect(() => () => fire(), []); // eslint-disable-line react-hooks/exhaustive-deps
  return { save, flush: fire, flushAsync, m };
}
export type Saver = ReturnType<typeof useSaver>;

export function SaveChip({
  saver,
  savedAt,
}: {
  saver: Saver;
  savedAt: string | null;
}) {
  const o = useO();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const { m } = saver;
  const t = m.data?.savedAt ?? savedAt;
  return (
    <span
      role="status"
      className="inline-flex min-h-8 items-center gap-2 bg-ink-100 px-3 text-small m-tone"
    >
      {m.isPending ? (
        <>
          <span
            aria-hidden
            className="size-2 animate-pulse rounded-full bg-warning"
          />
          {o.save.saving}
        </>
      ) : m.isError ? (
        <>
          <Icon name="x"size={14} aria-hidden className="text-danger" />
          <span className="text-danger">{o.save.failed}</span>
          <button
            type="button"
            className="font-medium underline"
            onClick={() => m.variables && m.mutate(m.variables)}
          >
            {o.save.retry}
          </button>
        </>
      ) : t ? (
        <>
          <Icon name="check"size={14} aria-hidden className="text-success" />
          {fill(o.save.saved, {
            t: formatDate(t, locale, { hour: "2-digit", minute: "2-digit", hour12: false }),
          })}
        </>
      ) : (
        o.save.idle
      )}
    </span>
  );
}

// ---------------------------------------------------------------- small pieces
function Chips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { v: string; l: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((x) => {
          const on = value.includes(x.v);
          return (
            <button
              key={x.v}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onChange(on ? value.filter((y) => y !== x.v) : [...value, x.v])
              }
              className={cx(
                "inline-flex h-9 items-center gap-1.5 border px-3.5 text-small transition-colors duration-(--dur-2) m-press",
                on
                  ? "border-navy-700 bg-tint text-navy-800"
                  : "border-border-strong bg-white hover:bg-ink-100",
              )}
            >
              {on && <Icon name="check" size={12} aria-hidden />}
              {x.l}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Highlight wrapper for sections the manager asked to change. */
export function Flagged({
  on,
  label,
  children,
}: {
  on: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "grid gap-4",
        on &&
          " p-3 ring-2 ring-warning ring-offset-2 ring-offset-white",
      )}
    >
      {on && (
        <p className="inline-flex items-center gap-1.5 text-small font-medium text-warning">
          <Icon name="shield" size={14} aria-hidden />
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- ON1 profile
export function ProfileForm({ ob, saver }: { ob: Onboarding; saver: Saver }) {
  const o = useO();
  const toast = useToast();
  const [p, setP] = useState(ob.profile);
  const [phoneErr, setPhoneErr] = useState<string | undefined>();
  const set = (patch: Partial<Onboarding["profile"]>) => {
    const next = { ...p, ...patch };
    setP(next);
    saver.save({ profile: next });
  };
  const photo = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/") || f.size > 5 * 1024 * 1024)
      return toast({ title: o.profile.photoHint, tone: "danger" });
    uploadFile(f, "photo").then((u) => set({ photo: u.href })).catch(() => toast({ title: o.profile.photoHint, tone: "danger" }));
  };
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-4">
        <label className="group relative grid size-28 cursor-pointer place-items-center overflow-hidden rounded-full bg-tint focus-within:outline-2 focus-within:outline-focus">
          {p.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.photo} alt=""className="size-full object-cover" />
          ) : (
            <Icon name="user"size={40} aria-hidden className="text-navy-700" />
          )}
          <span className="absolute right-1 bottom-1 grid size-8 place-items-center rounded-full bg-secondary text-on-navy">
            <Icon name="camera" size={14} aria-hidden />
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => photo(e.target.files?.[0])}
            aria-label={p.photo ? o.profile.photoChange : o.profile.photo}
          />
        </label>
        <div className="min-w-0 flex-1">
          <p className="text-label">
            {p.photo ? o.profile.photoChange : o.profile.photo}
          </p>
          <p className="text-small text-fg-subtle">{o.profile.photoHint}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={`${o.profile.name} *`}
          error={p.name.trim().length < 2 ? o.required : undefined}
        >
          {(f) => (
            <Input
              id={f.id}
              aria-describedby={f.describedBy}
              aria-invalid={f.invalid}
              autoComplete="name"
              value={p.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          )}
        </Field>
        <Field label={`${o.profile.phone} *`} error={phoneErr}>
          {(f) => (
            <PhoneInput
              id={f.id}
              aria-describedby={f.describedBy}
              aria-invalid={f.invalid}
              value={p.phone}
              onChange={(e) => set({ phone: e.target.value })}
              onBlur={() =>
                setPhoneErr(
                  p.phone && !toE164(p.phone) ? o.profile.phoneErr : undefined,
                )
              }
            />
          )}
        </Field>
        <Field
          label={o.profile.email}
          hint={o.profile.emailLocked}
          className="sm:col-span-2"
        >
          {(f) => (
            <div className="relative">
              <Icon
                name="lock"
                size={16}
                aria-hidden
                className="absolute top-1/2 left-3.5 -translate-y-1/2 text-fg-subtle"
              />
              <Input
                id={f.id}
                aria-describedby={f.describedBy}
                value={p.email}
                readOnly
                disabled
                className="pl-10"
              />
            </div>
          )}
        </Field>
        <Field label={o.profile.linkedin} optional={o.profile.links}>
          {(f) => (
            <Input
              id={f.id}
              inputMode="url"
              placeholder="linkedin.com/in/…"
              value={p.linkedin}
              onChange={(e) => set({ linkedin: e.target.value })}
            />
          )}
        </Field>
        <Field label={o.profile.website} optional={o.profile.links}>
          {(f) => (
            <Input
              id={f.id}
              inputMode="url"
              placeholder="https://"
              value={p.website}
              onChange={(e) => set({ website: e.target.value })}
            />
          )}
        </Field>
      </div>
      <Chips
        label={o.profile.languages}
        options={(["rw", "en", "fr", "sw"] as const).map((v) => ({
          v,
          l: o.langs[v],
        }))}
        value={p.languages}
        onChange={(languages) => set({ languages })}
      />
      <Field label={o.profile.bio} hint={o.profile.bioHint}>
        {(f) => (
          <div className="grid gap-1">
            <Textarea
              id={f.id}
              aria-describedby={`${f.describedBy ?? ""} ${f.id}-count`}
              maxLength={300}
              value={p.bio}
              onChange={(e) => set({ bio: e.target.value })}
            />
            <span
              id={`${f.id}-count`}
              aria-live="polite"
              className={cx(
                "justify-self-end text-small tabular",
                p.bio.length >= 280 ? "text-warning" : "text-fg-subtle",
              )}
            >
              {fill(o.profile.counter, { n: p.bio.length })}
            </span>
          </div>
        )}
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------- ON2 CV (repeaters with Undo)
type RepField<T> = {
  k: keyof T & string;
  label: string;
  area?: boolean;
  wide?: boolean;
};
function Repeater<T extends { id: string }>({
  title,
  icon,
  items,
  fields,
  empty,
  blank,
  line,
  onChange,
}: {
  title: string;
  icon: "graduation" | "briefcase";
  items: T[];
  fields: RepField<T>[];
  empty: string;
  blank: () => T;
  line: (x: T) => { t: string; s: string };
  onChange: (xs: T[]) => void;
}) {
  const o = useO();
  const toast = useToast();
  const [edit, setEdit] = useState<T | null>(null);
  const commit = () => {
    if (!edit) return;
    onChange(
      items.some((x) => x.id === edit.id)
        ? items.map((x) => (x.id === edit.id ? edit : x))
        : [...items, edit],
    );
    setEdit(null);
  };
  const remove = (x: T) => {
    const i = items.indexOf(x);
    onChange(items.filter((y) => y !== x));
    toast({
      title: o.cv.deleted,
      tone: "success",
      action: {
        label: o.cv.undo,
        onClick: () =>
          onChange(
            [...items.slice(0, i), x, ...items.slice(i)].filter(
              (y, j, a) => a.indexOf(y) === j,
            ),
          ),
      },
    });
  };
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-label-lg">{title}</h3>
        <Button
          size="sm"
          variant="primary"
          onClick={() => setEdit(blank())}
          disabled={!!edit}
        >
          <Icon name="plus" size={14} aria-hidden />
          {o.cv.add}
        </Button>
      </div>
      {!items.length && !edit && (
        <p className="border border-dashed border-border-strong p-4 text-small text-fg-subtle">
          {empty}
        </p>
      )}
      <ul className="grid gap-2 m-stagger">
        {items.map((x, i) =>
          edit?.id === x.id ? null : (
            <li
              key={x.id}
              style={{ ["--i" as string]: i }}
              className="flex items-start gap-3 border border-border bg-white p-3"
            >
              <Icon
                name={icon}
                size={18}
                aria-hidden
                className="mt-0.5 text-navy-700"
              />
              <div className="min-w-0 flex-1">
                <p className="text-label break-words">{line(x).t}</p>
                <p className="text-small text-fg-subtle break-words">
                  {line(x).s}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEdit(x)}
                aria-label={`${o.cv.edit} ${line(x).t}`}
              >
                {o.cv.edit}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => remove(x)}
                aria-label={`${o.cv.delete} ${line(x).t}`}
              >
                <Icon name="x" size={14} aria-hidden />
              </Button>
            </li>
          ),
        )}
      </ul>
      {edit && (
        <form
          className="grid gap-3 border border-navy-300 bg-tint/40 p-4 m-rise sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            commit();
          }}
        >
          {fields.map((f) => (
            <Field
              key={f.k}
              label={f.label}
              className={f.wide || f.area ? "sm:col-span-2" : undefined}
            >
              {(id) =>
                f.area ? (
                  <Textarea
                    id={id.id}
                    value={String(edit[f.k] ?? "")}
                    onChange={(e) =>
                      setEdit({ ...edit, [f.k]: e.target.value })
                    }
                  />
                ) : (
                  <Input
                    id={id.id}
                    value={String(edit[f.k] ?? "")}
                    onChange={(e) =>
                      setEdit({ ...edit, [f.k]: e.target.value })
                    }
                    required={f === fields[0]}
                  />
                )
              }
            </Field>
          ))}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm">
              {o.cv.saveItem}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>
              {o.cv.cancel}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

export function CvForm({ ob, saver }: { ob: Onboarding; saver: Saver }) {
  const o = useO();
  const [cv, setCv] = useState(ob.cv);
  const set = (patch: Partial<Onboarding["cv"]>) => {
    const next = { ...cv, ...patch };
    setCv(next);
    saver.save({ cv: next });
  };
  return (
    <div className="grid gap-6">
      <Repeater<Edu>
        title={o.cv.education}
        icon="graduation"
        items={cv.education}
        empty={o.cv.emptyEdu}
        blank={() => ({ id: uid(), degree: "", institution: "", year: "" })}
        fields={[
          { k: "degree", label: o.cv.degree, wide: true },
          { k: "institution", label: o.cv.institution },
          { k: "year", label: o.cv.year },
        ]}
        line={(x) => ({
          t: x.degree,
          s: [x.institution, x.year].filter(Boolean).join(" · "),
        })}
        onChange={(education) => set({ education })}
      />
      <Repeater<Exp>
        title={o.cv.experience}
        icon="briefcase"
        items={cv.experience}
        empty={o.cv.emptyExp}
        blank={() => ({
          id: uid(),
          role: "",
          org: "",
          from: "",
          to: "",
          description: "",
        })}
        fields={[
          { k: "role", label: o.cv.role },
          { k: "org", label: o.cv.org },
          { k: "from", label: o.cv.from },
          { k: "to", label: o.cv.to },
          { k: "description", label: o.cv.description, area: true },
        ]}
        line={(x) => ({
          t: x.role,
          s: [x.org, `${x.from} – ${x.to || o.cv.present}`]
            .filter(Boolean)
            .join(" · "),
        })}
        onChange={(experience) => set({ experience })}
      />
      <Chips
        label={`${o.cv.expertise} *`}
        options={o.expertise.map((v) => ({ v, l: v }))}
        value={cv.expertise}
        onChange={(expertise) => set({ expertise })}
      />
      <Field label={o.cv.years} className="max-w-xs">
        {(f) => (
          <Select
            id={f.id}
            value={cv.years}
            onChange={(e) => set({ years: e.target.value })}
          >
            <option value="">{o.cv.choose}</option>
            {Object.entries(o.years).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <p className="flex items-start gap-2 bg-tint p-3 text-small">
        <Icon
          name="sparkle"
          size={16}
          aria-hidden
          className="mt-0.5 text-navy-700"
        />
        {o.cv.note}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- ON3a certificates
export function CertsForm({ ob, saver }: { ob: Onboarding; saver: Saver }) {
  const o = useO();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const now = useNow();
  const [cs, setCs] = useState(ob.certificates);
  const set = (next: Cert[]) => {
    setCs(next);
    saver.save({ certificates: next });
  };
  const today = now === null ? "" : new Date(now).toISOString().slice(0, 10);
  return (
    <div className="grid gap-4">
      {!cs.length && (
        <p className="text-small text-fg-subtle">{o.certs.empty}</p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2 m-stagger">
        {cs.map((c, i) => {
          const expired = !!c.expires && !!today && c.expires < today;
          return (
            <li
              key={c.id}
              style={{ ["--i" as string]: i }}
              className={cx(
                "grid gap-3 border bg-white p-4",
                expired ? "border-danger/40" : "border-border",
              )}
            >
              <div className="flex items-start gap-3">
                <Icon
                  name="file"
                  size={20}
                  aria-hidden
                  className="text-navy-700"
                />
                <p className="min-w-0 flex-1 text-label break-words">
                  {c.name}
                </p>
                <button
                  type="button"
                  aria-label={fill(o.certs.remove, { n: c.name })}
                  onClick={() => set(cs.filter((x) => x.id !== c.id))}
                  className="-m-1 p-1 hover:bg-ink-100"
                >
                  <Icon name="x" size={16} aria-hidden />
                </button>
              </div>
              <span
                className={cx(
                  "inline-flex h-6 w-fit items-center gap-1.5 px-2.5 text-eyebrow font-medium",
                  expired
                    ? "bg-danger-bg text-danger"
                    : c.status === "verified"
                      ? "bg-success-bg text-success"
                      : "bg-warning-bg text-warning",
                )}
              >
                <Icon
                  name={
                    expired ? "x" : c.status === "verified" ? "check" : "clock"
                  }
                  size={12}
                  aria-hidden
                />
                {expired
                  ? fill(o.certs.expired, { d: formatDate(c.expires, locale) })
                  : c.status === "verified"
                    ? o.certs.verified
                    : o.certs.pending}
              </span>
              <Field
                label={`${o.certs.expiry} *`}
                error={c.expires ? undefined : o.certs.expiryReq}
              >
                {(f) => (
                  <DateInput
                    id={f.id}
                    aria-describedby={f.describedBy}
                    aria-invalid={f.invalid}
                    required
                    value={c.expires}
                    onChange={(e) =>
                      set(
                        cs.map((x) =>
                          x.id === c.id ? { ...x, expires: e.target.value } : x,
                        ),
                      )
                    }
                  />
                )}
              </Field>
            </li>
          );
        })}
      </ul>
      <FileDrop
        multiple
        camera
        accept="application/pdf,image/*"
        maxSizeMb={10}
        onFiles={async (fs) => {
          // Stored first; the cert keeps the upload id so reviewers open the same file (/api/files/:id).
          const up = await Promise.all(fs.map((f) => uploadFile(f, "papers").catch(() => null)));
          set([
            ...cs,
            ...up.filter((u) => u !== null).map((u) => ({
              id: u.id,
              name: u.name,
              expires: "",
              status: "pending" as const,
            })),
          ]);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------- ON3b payout
export function PayoutForm({
  ob,
  saver,
  flagged,
}: {
  ob: Onboarding;
  saver: Saver;
  flagged: boolean;
}) {
  const o = useO();
  const [p, setP] = useState(ob.payout);
  const [account, setAccount] = useState("");
  const [editing, setEditing] = useState(!ob.payout.accountLast4);
  const [err, setErr] = useState<string | undefined>();
  const saved = saver.m.data?.payout ?? ob.payout;
  const momo = p.method !== "bank";
  const submit = () => {
    const valid = momo
      ? !!toE164(account)
      : /^\d{8,16}$/.test(account.replace(/\s/g, ""));
    if (editing && !valid)
      return setErr(momo ? o.profile.phoneErr : o.payout.accountErr);
    setErr(undefined);
    saver.m.mutate(
      { payout: { ...p, account: editing ? account : "" } },
      { onSuccess: () => (setEditing(false), setAccount("")) },
    );
  };
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {saved.verification === "failed" && (
        <p
          role="alert"
          className="flex items-start gap-2 bg-danger-bg p-3 text-small text-danger"
        >
          <Icon name="x"size={16} aria-hidden className="mt-0.5" />
          {o.payout.failed}
        </p>
      )}
      <Segmented<PayoutMethod>
        label={o.payout.method}
        value={p.method}
        onChange={(method) => (
          setP({ ...p, method }),
          setEditing(true),
          setAccount("")
        )}
        options={[
          { value: "bank", label: o.payout.bank },
          { value: "mtn", label: o.payout.mtn },
          { value: "airtel", label: o.payout.airtel },
        ]}
        className="max-w-full flex-wrap"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {!momo && (
          <Field label={`${o.payout.bankName} *`}>
            {(f) => (
              <Select
                id={f.id}
                value={p.bank}
                required
                onChange={(e) => setP({ ...p, bank: e.target.value })}
              >
                <option value="">{o.cv.choose}</option>
                {RW_BANKS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field
          label={`${momo ? o.payout.momo : o.payout.account} *`}
          error={err}
        >
          {(f) =>
            editing ? (
              momo ? (
                <PhoneInput
                  id={f.id}
                  aria-invalid={f.invalid}
                  aria-describedby={f.describedBy}
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                />
              ) : (
                <Input
                  id={f.id}
                  aria-invalid={f.invalid}
                  aria-describedby={f.describedBy}
                  inputMode="numeric"
                  autoComplete="off"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                />
              )
            ) : (
              <div className="flex h-12 items-center gap-3 border border-border bg-ink-100 px-3.5">
                <span id={f.id} className="flex-1 tabular">
                  •••• {saved.accountLast4}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(true)}
                  aria-label={`${o.payout.change} ${momo ? o.payout.momo : o.payout.account}`}
                >
                  {o.payout.change}
                </Button>
              </div>
            )
          }
        </Field>
        <Field label={`${o.payout.holder} *`} className="sm:col-span-2">
          {(f) => (
            <Input
              id={f.id}
              autoComplete="name"
              required
              value={p.holder}
              onChange={(e) => setP({ ...p, holder: e.target.value })}
              className={flagged ? "border-warning" : undefined}
            />
          )}
        </Field>
      </div>
      <p className="flex items-center gap-2 bg-warning-bg p-3 text-small">
        <Icon name="shield"size={16} aria-hidden className="text-warning" />
        {saved.verification === "pending"
          ? o.payout.pending
          : saved.verification === "verified"
            ? o.payout.verified
            : o.payout.verify}
      </p>
      <Button
        type="submit"
        variant="outline"
        loading={saver.m.isPending}
        className="w-fit"
      >
        {o.payout.saveDetails}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------- ON4 agreements
function ReadToEnd({
  title,
  body,
  checked,
  onCheck,
}: {
  title: string;
  body: string[];
  checked: boolean;
  onCheck: (v: boolean) => void;
}) {
  const o = useO();
  const [read, setRead] = useState(checked);
  const check = (el: HTMLElement | null) => {
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 4)
      setRead(true);
  };
  return (
    <section className="grid gap-3 border border-border bg-white p-4">
      <h3 className="flex items-center gap-2 text-label-lg">
        <Icon name="fileCheck"size={18} aria-hidden className="text-navy-700" />
        {title}
      </h3>
      <div
        ref={check}
        onScroll={(e) => check(e.currentTarget)}
        tabIndex={0}
        role="region"
        aria-label={title}
        className="grid max-h-36 gap-2 overflow-y-auto bg-bg-subtle p-3 text-small"
      >
        {body.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
      {!read && <p className="text-small text-fg-subtle">{o.agr.readToEnd}</p>}
      <Checkbox
        label={o.agr.agree}
        checked={checked}
        disabled={!read}
        onChange={(e) => onCheck(e.target.checked)}
      />
    </section>
  );
}

function Agreements({
  ob,
  onSubmit,
}: {
  ob: Onboarding;
  onSubmit: (a: Onboarding["agreements"]) => void;
}) {
  const o = useO();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const now = useNow();
  const [a, setA] = useState(ob.agreements);
  const [shake, setShake] = useState(0);
  const name = ob.profile.name;
  const sigOk = signatureMatches(a.signature, name);
  const ready = a.nda && a.code && sigOk;
  return (
    <form
      id="agreements"
      key={shake}
      className={cx("grid gap-4", shake > 0 && "m-shake")}
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return setShake(shake + 1);
        onSubmit({ ...a, signedAt: new Date().toISOString() });
      }}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <ReadToEnd
          title={o.agr.nda}
          body={o.agr.ndaBody}
          checked={a.nda}
          onCheck={(nda) => setA({ ...a, nda })}
        />
        <ReadToEnd
          title={o.agr.code}
          body={o.agr.codeBody}
          checked={a.code}
          onCheck={(code) => setA({ ...a, code })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={o.agr.signature}
          hint={fill(o.agr.sigHint, { n: name })}
          error={
            a.signature && !sigOk ? fill(o.agr.sigErr, { n: name }) : undefined
          }
        >
          {(f) => (
            <Input
              id={f.id}
              aria-describedby={f.describedBy}
              aria-invalid={f.invalid}
              autoComplete="off"
              className="font-serif italic"
              value={a.signature}
              onChange={(e) => setA({ ...a, signature: e.target.value })}
            />
          )}
        </Field>
        <Field label={o.agr.date}>
          {(f) => (
            <Input
              id={f.id}
              readOnly
              value={now === null ? "" : formatDate(new Date(now), locale)}
            />
          )}
        </Field>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- stepper
function StepNav({ ob, step }: { ob: Onboarding; step: Step }) {
  const o = useO();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const cur = STEPS.indexOf(step);
  return (
    <nav
      data-guide="agent-onb-steps"
      aria-label={fill(o.stepOf, { n: cur + 1 })}
      tabIndex={0}
      className="-mx-1 overflow-x-auto px-1"
    >
      <ol className="flex min-w-max items-center gap-2">
        {STEPS.map((s, i) => {
          const done = stepDone(ob, s);
          const flagged = !!ob.changes?.fields.includes(s);
          return (
            <li key={s} className="flex items-center gap-2">
              <Link
                href={localHref(locale, wsHref(`/agent/onboarding/${s}`))}
                aria-current={s === step ? "step" : undefined}
                className={cx(
                  "flex items-center gap-2 py-1 pr-3 pl-1 text-small m-press",
                  s === step
                    ? "bg-tint font-medium text-navy-800"
                    : "text-fg-muted hover:bg-navy-50",
                )}
              >
                <span
                  className={cx(
                    "grid size-7 place-items-center rounded-full text-eyebrow m-tone",
                    flagged
                      ? "bg-warning text-white"
                      : s === step
                        ? "bg-secondary text-on-navy"
                        : done
                          ? "bg-secondary text-on-navy"
                          : "bg-ink-100",
                  )}
                >
                  {flagged ? (
                    "!"
                  ) : done && s !== step ? (
                    <Icon name="check" size={12} aria-hidden />
                  ) : (
                    i + 1
                  )}
                </span>
                {o.steps[s]}
                {done && <span className="sr-only">✓</span>}
              </Link>
              {i < STEPS.length - 1 && (
                <span aria-hidden className="h-px w-4 bg-border-strong" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ---------------------------------------------------------------- submitted / cleared
function Simulate({
  label,
  onClick,
  busy,
}: {
  label: string;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onClick}
      loading={busy}
      className="border-dashed"
    >
      <Icon name="zap" size={14} aria-hidden />
      {label}
    </Button>
  );
}

function Submitted({ ob, manager }: { ob: Onboarding; manager: string }) {
  const o = useO();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const toast = useToast();
  const n = STEPS.filter((s) => stepDone(ob, s)).length;
  return (
    <div className="grid max-w-2xl gap-4 m-rise">
      <ClearanceBar state="submitted" manager={manager} />
      <section className="border border-border bg-white p-5">
        <h2 className="text-card-title">
          {fill(o.done.title, { m: manager })}
        </h2>
        <p className="mt-1 text-small text-fg-muted">{o.done.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <h3 className="text-label">{o.done.what}</h3>
          <span className="text-small tabular">
            {fill(o.done.count, { n, t: STEPS.length })}
          </span>
        </div>
        <ul className="mt-2 grid gap-2 m-stagger">
          {STEPS.map((s, i) => (
            <li
              key={s}
              style={{ ["--i" as string]: i }}
              className="flex items-center gap-2 text-small"
            >
              <span
                className={cx(
                  "grid size-5 place-items-center rounded-full",
                  stepDone(ob, s) ? "bg-success text-white" : "bg-ink-100",
                )}
              >
                {stepDone(ob, s) && <Icon name="check" size={12} aria-hidden />}
              </span>
              {o.done.items[s]}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <ButtonLink
            href={localHref(locale, wsHref("/agent"))}
            variant="primary"
            size="sm"
          >
            {o.done.today}
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}

function Cleared() {
  const o = useO();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const router = useRouter();
  return (
    <section className="grid max-w-xl justify-items-start gap-3 border border-border bg-white p-6 m-pop">
      <span className="grid size-12 place-items-center rounded-full bg-success-bg text-success">
        <svg
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M5 12.5l4.5 4.5L19 7.5"pathLength={24} className="m-tick" />
        </svg>
      </span>
      <h2 className="text-card-title">{o.done.cleared}</h2>
      <p className="text-small text-fg-muted">{o.done.clearedBody}</p>
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={localHref(locale, wsHref("/agent"))} size="sm">
          {o.done.today}
        </ButtonLink>
        <ButtonLink
          href={localHref(locale, wsHref("/agent/profile/profile"))}
          size="sm"
          variant="outline"
        >
          {o.done.edit}
        </ButtonLink>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- wizard
export function OnboardingView({ step }: { step: Step }) {
  const o = useO();
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const q = useOnboarding();
  const s = useSummary();
  if (q.isPending) return <SkeletonRows n={5} />;
  if (q.isError)
    return <PanelError what={o.title} onRetry={() => q.refetch()} />;
  const manager = s.data?.me.manager ?? "";
  return (
    <div className="pb-24 lg:pb-8">
      <PageHead title={o.title} sub={o.sub} />
      {q.data.status === "submitted" ? (
        <Submitted ob={q.data} manager={manager} />
      ) : q.data.status === "cleared" ? (
        <Cleared />
      ) : (
        <Wizard
          key={`${step}-${q.data.status}`}
          ob={q.data}
          step={step}
          manager={manager}
          locale={locale}
          o={o}
        />
      )}
    </div>
  );
}

function Wizard({
  ob,
  step,
  manager,
  locale,
  o,
}: {
  ob: Onboarding;
  step: Step;
  manager: string;
  locale: Parameters<typeof localHref>[0];
  o: OnboardingCopy;
}) {
  const router = useRouter();
  const { wsHref } = useWs();
  const toast = useToast();
  const saver = useSaver();
  const submit = useSubmitOnboarding();
  const [err, setErr] = useState(false);
  const live = saver.m.data ?? ob;
  const i = STEPS.indexOf(step);
  const prev = STEPS[i - 1],
    next = STEPS[i + 1];
  const flagged = (k: string) => !!ob.changes?.fields.includes(k);
  const go = (s: Step) => {
    saver.flush();
    router.push(localHref(locale, wsHref(`/agent/onboarding/${s}`)));
  };
  const cont = async () => {
    const d = await saver.flushAsync().catch(() => null);
    if (!stepDone(d ?? live, step)) return setErr(true);
    saver.m.mutate({ step: next });
    router.push(localHref(locale, wsHref(`/agent/onboarding/${next}`)));
  };
  const onSign = async (a: Onboarding["agreements"]) => {
    try {
      await saver.flushAsync();
      await saver.m.mutateAsync({ agreements: a });
      await submit.mutateAsync();
      window.scrollTo({ top: 0 });
    } catch {
      toast({ title: o.done.submitFailed, tone: "danger" });
    }
  };
  const resumeAt =
    ob.step !== step && step === "profile" && ob.status === "in_progress"
      ? ob.step
      : null;
  return (
    <div className="grid gap-5">
      <StepNav ob={live} step={step} />
      {ob.status === "changes_requested" && ob.changes && (
        <div
          role="alert"
          className="border border-warning/40 bg-warning-bg p-4"
        >
          <p className="text-label">{fill(o.changes.title, { m: manager })}</p>
          <p className="mt-1 text-small">{ob.changes.note}</p>
          <p className="mt-1 text-small text-fg-muted">{o.changes.fix}</p>
        </div>
      )}
      {resumeAt && (
        <p className="flex flex-wrap items-center gap-3 bg-tint p-3 text-small m-rise">
          {fill(o.resume, { s: o.steps[resumeAt] })}
          <Button size="sm" variant="primary" onClick={() => go(resumeAt)}>
            {o.resumeGo}
          </Button>
        </p>
      )}
      <section
        aria-labelledby="step-h"
        className="border border-border bg-white p-4 m-rise sm:p-6"
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-eyebrow text-fg-subtle uppercase">
              {fill(o.stepOf, { n: i + 1 })}
            </p>
            <h2 id="step-h"className="text-card-title">
              {step === "certificates"
                ? o.certs.title
                : step === "payout"
                  ? o.payout.title
                  : o.steps[step]}
            </h2>
          </div>
          {step !== "agreements" && step !== "payout" && (
            <SaveChip saver={saver} savedAt={ob.savedAt} />
          )}
        </div>
        <Flagged
          on={flagged(step)}
          label={fill(o.changes.title, { m: manager })}
        >
          {step === "profile" && <ProfileForm ob={ob} saver={saver} />}
          {step === "cv" && <CvForm ob={ob} saver={saver} />}
          {step === "certificates" && <CertsForm ob={ob} saver={saver} />}
          {step === "payout" && (
            <PayoutForm ob={ob} saver={saver} flagged={flagged("payout")} />
          )}
          {step === "agreements" && (
            <Agreements ob={live} onSubmit={onSign} />
          )}
        </Flagged>
      </section>
      {err && !stepDone(live, step) && (
        <p role="alert"className="text-small font-medium text-danger m-shake">
          {o.incomplete}
        </p>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-bg-subtle/95 py-3 max-lg:sticky max-lg:bottom-[calc(4rem+env(safe-area-inset-bottom))] max-lg:-mx-4 max-lg:px-4 max-lg:backdrop-blur">
        {prev ? (
          <Button variant="outline" onClick={() => go(prev)}>
            {o.back}
          </Button>
        ) : (
          <span />
        )}
        {next ? (
          <Button dots onClick={cont}>
            {o.continue}
          </Button>
        ) : (
          <Button
            dots
            type="submit"
            form="agreements"
            loading={submit.isPending || saver.m.isPending}
          >
            {o.agr.submit}
          </Button>
        )}
      </div>
    </div>
  );
}
