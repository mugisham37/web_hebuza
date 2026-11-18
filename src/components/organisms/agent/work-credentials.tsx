"use client";
// Lane B: credential list + add / replace / renew (board 04 ON3, 11 PR3). Used by onboarding step "credentials"
// and by /work/profile/credentials (lane F imports CredentialsPanel).
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cx, formatDate } from "@/shared/format";
import { Icon } from "@/components/atoms/icon";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Input, Select, DateInput, Checkbox } from "@/components/atoms/field";
import { FileDrop } from "@/components/atoms/file-drop";
import { useToast } from "@/components/atoms/toast";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { errorCopy } from "@/lib/api/error-copy";
import { fill } from "@/content/pages/work-common";
import { useCredentials, useSaveCredential, daysLeft, useOnboarding } from "@/lib/work/b";
import { useExternal, type Credential } from "@/lib/work/api";
import { POLICY } from "@/shared/policy";
import { useOb } from "@/components/organisms/agent/work-states";

const TONE: Record<Credential["status"], string> = {
  verified: "bg-success-bg text-success",
  pending: "bg-warning-bg text-warning",
  rejected: "bg-danger-bg text-danger",
  expired: "bg-danger-bg text-danger",
};

export function CredentialsPanel({ mode }: { mode: "onboarding" | "profile" }) {
  const o = useOb();
  const q = useCredentials();
  const { ext } = useExternal();
  const [edit, setEdit] = useState<Credential | "new" | null>(null);
  const locked = mode === "onboarding" && ext?.status === "pending_verification";
  if (q.isPending)
    return (
      <div className="grid gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 m-shimmer" />
        ))}
      </div>
    );
  if (q.isError) return <PanelError what={o.creds.title} onRetry={() => q.refetch()} />;
  const items = q.data;
  return (
    <div className="grid gap-3">
      {!items.length ? (
        <EmptyPanel
          title={o.creds.empty}
          body={o.creds.emptyBody}
          action={
            <Button size="sm" onClick={() => setEdit("new")} disabled={locked}>
              <Icon name="plus" size={14} aria-hidden /> {o.creds.addFirst}
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 m-stagger">
          {items.map((c, i) => (
            <li key={c.id} style={{ ["--i" as string]: i }}>
              <CredentialCard c={c} onEdit={locked ? undefined : () => setEdit(c)} />
            </li>
          ))}
        </ul>
      )}
      {!!items.length && !locked && (
        <button
          type="button"
          onClick={() => setEdit("new")}
          className="flex h-12 items-center justify-center gap-2 border border-dashed border-border-strong text-small font-medium hover:bg-bg-subtle m-press"
        >
          <Icon name="plus" size={16} aria-hidden /> {o.creds.add}
        </button>
      )}
      <CredentialDialog key={edit === "new" ? "new" : (edit?.id ?? "none")} open={!!edit} target={edit === "new" ? null : edit} onClose={() => setEdit(null)} />
    </div>
  );
}

export function CredentialCard({ c, onEdit }: { c: Credential; onEdit?: () => void }) {
  const o = useOb();
  const { locale } = useI18n();
  const { ext } = useExternal();
  const left = daysLeft(c.expiresOn);
  const expiring = c.status === "verified" && left !== null && left >= 0 && left <= 30;
  const names = c.services.map((s) => ext?.services.find((x) => x.slug === s)?.name ?? s).join(", ");
  return (
    <article className={cx("grid gap-3 border bg-white p-4", c.status === "rejected" || c.status === "expired" ? "border-danger/30" : expiring ? "border-warning/40" : "border-border")}>
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center bg-tint text-navy-700">
          <Icon name={c.status === "verified" ? "fileCheck" : "file"} size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-label">{c.title}</p>
          <p className="text-small text-fg-muted">
            {c.issuer} · {fill(o.creds.no, { n: c.number })}
          </p>
          {c.expiresOn && <p className="text-small text-fg-muted">{fill(o.creds.expires, { d: formatDate(c.expiresOn, locale) })}</p>}
          {names && <p className="text-eyebrow text-fg-subtle">{fill(o.creds.covers, { s: names })}</p>}
        </div>
        <span className={cx("inline-flex h-7 shrink-0 items-center gap-1 px-2.5 text-eyebrow font-medium normal-case m-tone", TONE[c.status])}>
          <Icon name={c.status === "verified" ? "check" : c.status === "pending" ? "clock" : "x"} size={12} aria-hidden />
          {o.creds.status[c.status]}
        </span>
      </div>
      {(c.status === "rejected" || c.status === "expired" || expiring) && (
        <div className={cx("flex flex-wrap items-center gap-2 px-3 py-2 text-small", expiring ? "bg-warning-bg" : "bg-danger-bg")}>
          <p className="min-w-0 flex-1">{c.status === "expired" ? (c.note ?? o.creds.expiredNote) : expiring ? fill(o.creds.expiresIn, { n: left! }) : c.note}</p>
          {onEdit && (
            <Button size="sm" variant="primary" onClick={onEdit}>
              <Icon name="upload" size={14} aria-hidden /> {c.status === "rejected" ? o.creds.replace : o.creds.renew}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

/** Add (target null) or replace/renew (target set: only file + dates change). */
function CredentialDialog({ open, target, onClose }: { open: boolean; target: Credential | null; onClose: () => void }) {
  const o = useOb();
  const f = o.creds.form;
  const { locale } = useI18n();
  const toast = useToast();
  const save = useSaveCredential();
  const ob = useOnboarding();
  const { ext } = useExternal();
  const [v, setV] = useState({ kind: "professional_body" as Credential["kind"], title: "", issuer: "", number: "", issuedOn: "", expiresOn: "", services: [] as string[] });
  const [file, setFile] = useState<File | null>(null);
  const [tried, setTried] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const svcList = ob.data?.catalogue.filter((s) => ob.data!.services.slugs.includes(s.slug) || ext?.services.some((x) => x.slug === s.slug)) ?? ext?.services ?? [];
  const missing = {
    title: !target && !v.title.trim(),
    issuer: !target && !v.issuer.trim(),
    number: !target && !v.number.trim(),
    expiresOn: !v.expiresOn,
    file: !file,
  };
  const set = (p: Partial<typeof v>) => setV((x) => ({ ...x, ...p }));
  const submit = () => {
    setTried(true);
    setErr(null);
    if (Object.values(missing).some(Boolean)) return;
    save.mutate(
      { id: target?.id, data: { ...(target ? {} : v), issuedOn: v.issuedOn, expiresOn: v.expiresOn, fileName: file!.name, size: file!.size, type: file!.type }, file: file! },
      {
        onSuccess: () => {
          toast({ title: fill(f.done, { m: ob.data?.manager ?? ext?.manager ?? "HEBUZA" }), tone: "success" });
          onClose();
        },
        onError: (e) => setErr(errorCopy(e, locale)),
      },
    );
  };
  const req = (k: keyof typeof missing, msg = f.required) => (tried && missing[k] ? msg : undefined);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      side="right"
      title={target ? fill(f.renewTitle, { t: target.title }) : f.title}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {f.cancel}
          </Button>
          <Button loading={save.isPending} aria-busy={save.isPending} onClick={submit}>
            {f.save}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        {!target && (
          <>
            <Field label={f.kind}>
              {(i) => (
                <Select id={i.id} value={v.kind} onChange={(e) => set({ kind: e.target.value as Credential["kind"] })}>
                  {(Object.keys(f.kinds) as Credential["kind"][]).map((k) => (
                    <option key={k} value={k}>
                      {f.kinds[k]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={f.name} error={req("title")}>
              {(i) => <Input id={i.id} aria-describedby={i.describedBy} aria-invalid={i.invalid} value={v.title} onChange={(e) => set({ title: e.target.value })} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={f.issuer} error={req("issuer")}>
                {(i) => <Input id={i.id} aria-describedby={i.describedBy} aria-invalid={i.invalid} value={v.issuer} onChange={(e) => set({ issuer: e.target.value })} />}
              </Field>
              <Field label={f.number} error={req("number")}>
                {(i) => <Input id={i.id} aria-describedby={i.describedBy} aria-invalid={i.invalid} value={v.number} onChange={(e) => set({ number: e.target.value })} />}
              </Field>
            </div>
          </>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={f.issued}>{(i) => <DateInput id={i.id} value={v.issuedOn} onChange={(e) => set({ issuedOn: e.target.value })} />}</Field>
          <Field label={f.expiry} error={req("expiresOn", f.expiryRequired)}>
            {(i) => <DateInput id={i.id} aria-describedby={i.describedBy} aria-invalid={i.invalid} value={v.expiresOn} min={new Date().toISOString().slice(0, 10)} onChange={(e) => set({ expiresOn: e.target.value })} />}
          </Field>
        </div>
        {!target && svcList.length > 0 && (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-label">{f.services}</legend>
            {svcList.map((s) => (
              <Checkbox
                key={s.slug}
                label={s.name}
                checked={v.services.includes(s.slug)}
                onChange={(e) => set({ services: e.target.checked ? [...v.services, s.slug] : v.services.filter((x) => x !== s.slug) })}
              />
            ))}
          </fieldset>
        )}
        <div className="grid gap-1.5">
          <p className="text-label">{fill(f.file, { mb: POLICY.qualificationMaxMb })}</p>
          {file ? (
            <p className="flex items-center gap-2 bg-bg-subtle px-3 py-2 text-small">
              <Icon name="fileCheck"size={16} aria-hidden className="text-success" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <button type="button"className="underline"onClick={() => setFile(null)}>
                {o.identity.replace}
              </button>
            </p>
          ) : (
            <FileDrop onFiles={(fs) => setFile(fs[0])} accept="application/pdf,image/*" maxSizeMb={POLICY.qualificationMaxMb} />
          )}
          {tried && missing.file && <p className="text-small font-medium text-danger">{f.fileRequired}</p>}
        </div>
        {err && (
          <p role="alert"className="text-small text-danger m-shake">
            {err}
          </p>
        )}
      </div>
    </Dialog>
  );
}
