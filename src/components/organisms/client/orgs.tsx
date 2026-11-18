"use client";
import { api, unwrap } from "@/lib/api/client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/provider";
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

type Role = "owner" | "admin" | "member";
type Member = {
  id: string;
  name: string;
  contact: string;
  role: Role;
  pending?: boolean;
};
type Org = { id: string; name: string; myRole: Role; members: Member[] };
type Data = { activeOrgId: string | null; orgs: Org[] };
const KEY = ["c4", "orgs"];

/** Client organisations (ORG module): list, switch acting company, members, invite, remove. */
export function OrgsView() {
  const { c } = useC4();
  const o = c.orgs;
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({
    queryKey: KEY,
    queryFn: () => unwrap<Data>(api.GET("/api/me/orgs")),
  });
  const [inviteTo, setInviteTo] = useState<Org | null>(null);
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
            const manage = org.myRole !== "member";
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
            <Select id={id} name="role" defaultValue="member">
              <option value="member">{o.roles.member}</option>
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
