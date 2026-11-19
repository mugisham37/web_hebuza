"use client";
import { api, unwrap } from "@/lib/api/client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { Button } from "@/components/atoms/button";
import { Field, Input, Select, ErrorSummary } from "@/components/atoms/field";
import { EmptyState, ErrorState } from "@/components/atoms/feedback";
import { Dialog } from "@/components/atoms/dialog";
import { Avatar } from "@/components/atoms/misc";
import { Badge } from "@/components/atoms/tag";
import { useToast } from "@/components/atoms/toast";
import { toE164 } from "@/components/atoms/inputs";
import { fill } from "@/content/pages/c4";
import {
  ListSkeleton,
  PageHead,
  Panel,
  useC4,
} from "@/components/molecules/client/client";

type Role = "owner" | "admin" | "viewer";
type VStatus = "unverified" | "pending_verification" | "verified" | "rejected";
type Member = {
  id: string;
  name: string;
  contact: string;
  role: Role;
  pending?: boolean;
};
type Org = { id: string; name: string; myRole: Role; members: Member[]; customerNo: string | null; verificationStatus: VStatus; verificationNote: string | null };
const TYPES = ["sole_proprietor", "ltd", "plc", "cooperative", "ngo", "branch_foreign", "partnership", "other"] as const;
const SIZES = ["micro", "small", "medium", "large"] as const;
const TONE: Record<VStatus, "success" | "warning" | "danger" | undefined> = { verified: "success", pending_verification: "warning", rejected: "danger", unverified: undefined };
type Data = { activeOrgId: string | null; orgs: Org[] };
const KEY = ["c4", "orgs"];

/** Client organisations (ORG module): list, switch acting company, members, invite, remove. */
export function OrgsView() {
  const { c, locale } = useC4();
  const o = c.orgs;
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({
    queryKey: KEY,
    queryFn: () => unwrap<Data>(api.GET("/api/me/orgs")),
  });
  const [inviteTo, setInviteTo] = useState<Org | null>(null);
  const [adding, setAdding] = useState(false);
  const verify = useMutation({
    mutationFn: (org: Org) => unwrap(api.POST("/api/organizations/{id}/verification-request", { params: { path: { id: org.id } } })),
    onSuccess: () => done(o.askedVerify)(),
    onError: () => fail(),
  });
  const [removing, setRemoving] = useState<{ org: Org; m: Member } | null>(
    null,
  );
  const done = (title: string) => () => {
    toast({ title, tone: "success" });
    qc.invalidateQueries({ queryKey: KEY });
  };
  const fail = () => toast({ title: c.generic, tone: "danger" });
  const sw = useMutation({
    mutationFn: (org: Org | null) =>
      unwrap(api.PUT("/api/me/orgs/active", { body: { orgId: org?.id ?? null } })),
    onSuccess: (_d, org) =>
      done(fill(o.switched, { name: org?.name ?? o.personal }))(),
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: ({ org, m }: { org: Org; m: Member }) =>
      unwrap(api.DELETE("/api/me/orgs/{id}/members/{mid}", { params: { path: { id: org.id, mid: m.id } } })),
    onSuccess: () => {
      done(o.removed)();
      setRemoving(null);
    },
    onError: fail,
  });

  if (q.isPending)
    return (
      <>
        <PageHead title={o.title} lede={o.lede} />
        <ListSkeleton />
      </>
    );
  if (q.isError)
    return (
      <>
        <PageHead title={o.title} lede={o.lede} />
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </>
    );
  const { activeOrgId, orgs } = q.data;

  return (
    <>
      <PageHead title={o.title} lede={o.lede} />
      <div className="mb-4 flex justify-end">
        <Button dots onClick={() => setAdding(true)}>{o.add}</Button>
      </div>
      {!orgs.length ? (
        <EmptyState title={o.none} body={o.noneBody} />
      ) : (
        <div className="grid gap-5">
          <Panel
            icon="user"
            title={o.personal}
            action={
              activeOrgId === null ? (
                <Badge tone="success">{o.active}</Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  loading={sw.isPending && sw.variables === null}
                  onClick={() => sw.mutate(null)}
                >
                  {o.switch}
                </Button>
              )
            }
          />
          {orgs.map((org) => {
            const manage = org.myRole !== "viewer";
            return (
              <Panel
                key={org.id}
                icon="building"
                title={org.name}
                body={o.roles[org.myRole]}
                action={
                  activeOrgId === org.id ? (
                    <Badge tone="success">{o.active}</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={sw.isPending && sw.variables?.id === org.id}
                      onClick={() => sw.mutate(org)}
                    >
                      {o.switch}
                    </Button>
                  )
                }
              >
                <div className="mb-4 flex flex-wrap items-center gap-2 text-small">
                  <Link href={localHref(locale, `/orgs/${org.id}`)} className="font-medium text-link underline underline-offset-2">{o.open}</Link>
                  <Badge tone={TONE[org.verificationStatus]}>{o.status[org.verificationStatus]}</Badge>
                  {org.customerNo && <span className="text-fg-muted">{o.customerNo}: <span className="font-mono tabular">{org.customerNo}</span></span>}
                  {manage && (org.verificationStatus === "unverified" || org.verificationStatus === "rejected") && (
                    <Button size="sm" variant="outline" loading={verify.isPending && verify.variables?.id === org.id} onClick={() => verify.mutate(org)} title={o.verifyHint}>{o.askVerify}</Button>
                  )}
                  {org.verificationStatus === "rejected" && org.verificationNote && <p className="basis-full text-danger">{org.verificationNote}</p>}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-fg-heading text-label">
                    {o.members} ({org.members.length})
                  </h3>
                  {manage ? (
                    <Button size="sm" dots onClick={() => setInviteTo(org)}>
                      {o.invite}
                    </Button>
                  ) : (
                    <p className="text-small text-fg-subtle">{o.ownerOnly}</p>
                  )}
                </div>
                <ul className="mt-3 divide-y divide-border">
                  {org.members.map((m) => (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-center gap-3 py-3"
                    >
                      <Avatar name={m.name} size="sm" />
                      <div className="min-w-0 flex-1 basis-40">
                        <p className="truncate text-label">{m.name}</p>
                        <p className="truncate text-small text-fg-subtle">
                          {m.contact}
                        </p>
                      </div>
                      {m.pending ? (
                        <Badge tone="warning">{o.pending}</Badge>
                      ) : (
                        <Badge>{o.roles[m.role]}</Badge>
                      )}
                      {manage && m.role !== "owner" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRemoving({ org, m })}
                        >
                          {o.remove}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </Panel>
            );
          })}
        </div>
      )}
      {adding && <AddOrg onClose={() => setAdding(false)} onDone={done(o.created)} />}
      {inviteTo && (
        <Invite
          org={inviteTo}
          onClose={() => setInviteTo(null)}
          onDone={done(o.invited)}
        />
      )}
      {removing && (
        <Dialog
          open
          onClose={() => setRemoving(null)}
          title={fill(o.removeTitle, { name: removing.m.name })}
          description={o.removeBody}
          footer={
            <>
              <Button variant="ghost" onClick={() => setRemoving(null)}>
                {c.bookings.keep}
              </Button>
              <Button
                variant="danger"
                loading={remove.isPending}
                onClick={() => remove.mutate(removing)}
              >
                {o.remove}
              </Button>
            </>
          }
        />
      )}
    </>
  );
}

function Invite({
  org,
  onClose,
  onDone,
}: {
  org: Org;
  onClose: () => void;
  onDone: () => void;
}) {
  const { c } = useC4();
  const { t } = useI18n();
  const o = c.orgs;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const send = useMutation({
    mutationFn: (body: { contact: string; role: Exclude<Role, "owner"> }) =>
      unwrap(api.POST("/api/me/orgs/{id}/invites", { params: { path: { id: org.id } }, body })),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const raw = String(f.get("contact") ?? "").trim();
    const contact = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? raw : toE164(raw);
    if (!contact)
      return setErrors({ "inv-contact": raw ? o.badContact : c.required });
    setErrors({});
    send.mutate({ contact, role: String(f.get("role")) as Exclude<Role, "owner"> });
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={o.invite}
      description={`${org.name} · ${o.inviteLede}`}
    >
      <form noValidate onSubmit={onSubmit} className="grid gap-5">
        <ErrorSummary
          title={c.fixErrors}
          errors={Object.entries(errors).map(([field, message]) => ({
            field,
            message,
          }))}
        />
        <Field id="inv-contact" label={o.emailOrPhone} error={errors["inv-contact"]}>
          {({ id, describedBy, invalid }) => (
            <Input id={id}
              name="contact"
              autoComplete="off"
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </Field>
        <Field label={o.role}>
          {({ id }) => (
            <Select id={id} name="role" defaultValue="viewer">
              <option value="viewer">{o.roles.viewer}</option>
              {org.myRole === "owner" && (
                <option value="admin">{o.roles.admin}</option>
              )}
            </Select>
          )}
        </Field>
        {send.isError && (
          <p role="alert" className="text-small font-medium text-danger">
            {c.generic}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" dots loading={send.isPending}>
            {o.send}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** ORG-01: register a company (identity + address); the creator becomes its owner. */
function AddOrg({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { c } = useC4();
  const { t } = useI18n();
  const o = c.orgs;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: (body: Record<string, string | null>) =>
      unwrap(api.POST("/api/me/orgs", { body: body as never })), // cast: FormData strings mapped to the DTO shape below
    onSuccess: () => { onDone(); onClose(); },
  });
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim() || null;
    const errs: Record<string, string> = {};
    if (!v("legalName")) errs["org-legalName"] = c.required;
    const tin = v("tin");
    if (tin && !/^\d{9}$/.test(tin)) errs["org-tin"] = o.badTin;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    save.mutate({
      legalName: v("legalName"), tradeName: v("tradeName"), orgType: v("orgType"), tin, rdbNumber: v("rdbNumber"),
      registeredOn: v("registeredOn"), province: v("province"), district: v("district"), phone: v("phone") ? toE164(v("phone")!) ?? v("phone") : null,
      email: v("email"), website: v("website"), sizeBand: v("sizeBand"),
    });
  }
  const text = (name: string, label: string, extra: React.ComponentProps<"input"> = {}) => (
    <Field id={`org-${name}`} label={label} error={errors[`org-${name}`]} optional={name !== "legalName" ? t("common.optional") : undefined}>
      {({ id, describedBy, invalid }) => <Input id={id} name={name} aria-describedby={describedBy} aria-invalid={invalid || undefined} {...extra} />}
    </Field>
  );
  return (
    <Dialog open onClose={onClose} title={o.addTitle} description={o.addLede}>
      <form noValidate onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <ErrorSummary title={c.fixErrors} errors={Object.entries(errors).map(([field, message]) => ({ field, message }))} />
        </div>
        {text("legalName", o.legalName)}
        {text("tradeName", o.tradeName)}
        <Field label={o.orgType}>
          {({ id }) => (
            <Select id={id} name="orgType" defaultValue="ltd">
              {TYPES.map((k) => <option key={k} value={k}>{o.types[k]}</option>)}
            </Select>
          )}
        </Field>
        <Field label={o.sizeBand} optional={t("common.optional")}>
          {({ id }) => (
            <Select id={id} name="sizeBand" defaultValue="">
              <option value="">—</option>
              {SIZES.map((k) => <option key={k} value={k}>{o.sizes[k]}</option>)}
            </Select>
          )}
        </Field>
        {text("tin", o.tin, { inputMode: "numeric", maxLength: 9 })}
        {text("rdbNumber", o.rdb)}
        {text("registeredOn", o.registeredOn, { type: "date" })}
        {text("province", o.province)}
        {text("district", o.district)}
        {text("phone", o.phone, { type: "tel" })}
        {text("email", o.email, { type: "email" })}
        {text("website", o.website, { type: "url" })}
        {save.isError && <p role="alert" className="text-small font-medium text-danger sm:col-span-2">{c.generic}</p>}
        <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" dots loading={save.isPending}>{o.create}</Button>
        </div>
      </form>
    </Dialog>
  );
}
