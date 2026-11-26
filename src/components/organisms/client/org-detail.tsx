"use client";
// ORG company page (spec company-profiles §9): Profile · Representatives · Documents (ORG-07) · Requests · Invoices ·
// Timeline (ORG-09), plus the company plan (SUB-10).
import { useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { formatDate, formatMoney } from "@/shared/format";
import { fill } from "@/content/pages/c4";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Input, Select } from "@/components/atoms/field";
import { Badge } from "@/components/atoms/tag";
import { Tabs } from "@/components/atoms/tabs";
import { EmptyState, ErrorState, Skeleton } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { PageHead, Panel, useC4 } from "@/components/molecules/client/client";
import { uploadLibraryDoc } from "@/components/molecules/client/api";
import { AddOrg } from "@/components/organisms/client/orgs";

type Role = "owner" | "admin" | "viewer";
type Detail = {
  id: string;
  name: string;
  legalName: string;
  tradeName: string | null;
  orgType: string;
  tin: string | null;
  rdbNumber: string | null;
  customerNo: string | null;
  province: string | null;
  district: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  verificationStatus:
    "unverified" | "pending_verification" | "verified" | "rejected";
  myRole: Role | null;
  members: {
    id: string;
    name: string;
    contact: string;
    role: Role;
    pending: boolean;
    title: string | null;
  }[];
  requests: {
    code: string;
    service: string;
    status: string;
    submittedAt: string;
  }[];
  documents: {
    id: string;
    name: string;
    label: string | null;
    size: number;
    at: string;
  }[];
  invoices: {
    no: string;
    status: string;
    total: number;
    balanceDue: number;
    caseRef: string | null;
    issuedAt: string | null;
  }[];
  subscription: {
    planName: string;
    status: string;
    currentPeriodEnd: string;
  } | null;
  timeline: { kind: string; at: string; title: string; ref: string }[];
};
const TABS = [
  "profile",
  "reps",
  "documents",
  "requests",
  "invoices",
  "timeline",
] as const;
type Tab = (typeof TABS)[number];

export function OrgDetail({ id }: { id: string }) {
  const { c, locale } = useC4();
  const o = c.orgs;
  const p = useUrlParams();
  const tab: Tab = (TABS as readonly string[]).includes(p.get("tab") ?? "")
    ? (p.get("tab") as Tab)
    : "profile";
  const qc = useQueryClient();
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const key = ["c4", "org", id];
  const q = useQuery({
    queryKey: key,
    queryFn: () =>
      unwrap<Detail>(
        api.GET("/api/organizations/{id}", { params: { path: { id } } }),
      ),
  });
  const up = useMutation({
    mutationFn: (f: File) => uploadLibraryDoc(f, { organizationId: id }),
    onSuccess: () => {
      toast({ title: o.uploaded, tone: "success" });
      void qc.invalidateQueries({ queryKey: key });
    },
    onError: () => toast({ title: c.generic, tone: "danger" }),
  });
  const dl = useMutation({
    mutationFn: (doc: string) =>
      unwrap<{ url: string }>(
        api.GET("/api/organizations/{id}/documents/{doc}/download", {
          params: { path: { id, doc } },
        }),
      ),
    onSuccess: (r) => {
      window.location.assign(r.url);
    },
    onError: () => toast({ title: c.generic, tone: "danger" }),
  });
  if (q.isPending)
    return (
      <>
        <PageHead title={o.title} />
        <Skeleton className="h-64" />
      </>
    );
  if (q.isError)
    return (
      <>
        <PageHead title={o.title} />
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </>
    );
  const d = q.data;
  const manage = d.myRole === "owner" || d.myRole === "admin";
  const editDialog = editing && (
    <AddOrg
      edit={d}
      onClose={() => setEditing(false)}
      onDone={() => {
        toast({ title: o.updated, tone: "success" });
        void qc.invalidateQueries({ queryKey: key });
      }}
    />
  );
  const row = (k: string, v: string | null) => (
    <div key={k}>
      <dt className="text-small text-fg-muted">{k}</dt>
      <dd>{v || ""}</dd>
    </div>
  );
  return (
    <>
      <Link
        href={localHref(locale, "/orgs")}
        className="text-small text-fg-muted hover:text-fg"
      >
        {o.back}
      </Link>
      <PageHead
        title={d.name}
        lede={`${o.types[d.orgType as keyof typeof o.types] ?? d.orgType} · ${o.status[d.verificationStatus]}`}
      />
      <Panel
        icon="briefcase"
        title={o.sub.title}
        action={manage ? <BuyPlan orgId={id} /> : undefined}
      >
        <p className="text-small text-fg-muted">
          {d.subscription
            ? d.subscription.status === "active"
              ? `${d.subscription.planName} · ${fill(o.sub.until, { date: formatDate(d.subscription.currentPeriodEnd, locale) })}`
              : `${d.subscription.planName} · ${o.sub.expired}`
            : o.sub.none}
        </p>
      </Panel>
      <Tabs
        value={tab}
        onChange={(t) => setUrlParams({ tab: t === "profile" ? null : t })}
        tabs={TABS.map((t) => ({
          id: t,
          label: o.tabs[t],
          content:
            t !== tab ? null : t === "profile" ? (
              <>
              {manage && (
                <Button data-guide="client-org-edit" size="sm" variant="outline" className="mt-4" onClick={() => setEditing(true)}>
                  {o.edit}
                </Button>
              )}
              {editDialog}
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  row(o.legalName, d.legalName),
                  row(o.tradeName, d.tradeName),
                  row(o.tin, d.tin),
                  row(o.rdb, d.rdbNumber),
                  row(o.customerNo, d.customerNo),
                  row(o.province, d.province),
                  row(o.district, d.district),
                  row(o.phone, d.phone),
                  row(o.email, d.email),
                  row(o.website, d.website),
                ]}
              </dl>
              </>
            ) : t === "reps" ? (
              <ul className="mt-4 divide-y divide-border">
                {d.members.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center gap-3 py-3"
                  >
                    <span className="flex-1 basis-40">
                      {m.name}
                      <span className="block text-small text-fg-subtle">
                        {m.contact}
                        {m.title ? ` · ${m.title}` : ""}
                      </span>
                    </span>
                    <Badge tone={m.pending ? "warning" : undefined}>
                      {m.pending ? o.pending : o.roles[m.role]}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : t === "documents" ? (
              <div className="mt-4 grid gap-3">
                {manage && (
                  <div className="flex justify-end">
                    <input
                      ref={file}
                      type="file"
                      className="sr-only"
                      aria-label={o.upload}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) up.mutate(f);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      data-guide="client-org-upload"
                      size="sm"
                      dots
                      loading={up.isPending}
                      onClick={() => file.current?.click()}
                    >
                      {o.upload}
                    </Button>
                  </div>
                )}
                {!d.documents.length ? (
                  <EmptyState title={o.noDocs} />
                ) : (
                  <ul className="divide-y divide-border">
                    {d.documents.map((x) => (
                      <li
                        key={x.id}
                        className="flex flex-wrap items-center gap-3 py-3"
                      >
                        <span className="flex-1 basis-40">
                          {x.label || x.name}
                          <span className="block text-small text-fg-subtle">
                            {formatDate(x.at, locale)}
                          </span>
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={dl.isPending && dl.variables === x.id}
                          onClick={() => dl.mutate(x.id)}
                        >
                          {o.download}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : t === "requests" ? (
              !d.requests.length ? (
                <EmptyState title={o.noRequests} />
              ) : (
                <ul className="mt-4 divide-y divide-border">
                  {d.requests.map((r) => (
                    <li key={r.code} className="py-3">
                      <Link
                        className="font-medium tabular underline underline-offset-2"
                        href={localHref(locale, `/requests/${r.code}`)}
                      >
                        {r.code}
                      </Link>{" "}
                      · {r.service} · {r.status.replace(/_/g, " ")}
                    </li>
                  ))}
                </ul>
              )
            ) : t === "invoices" ? (
              !d.invoices.length ? (
                <EmptyState title={o.noInvoices} />
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[28rem] text-small">
                    <thead className="text-left">
                      <tr>
                        {[
                          o.inv.no,
                          o.inv.total,
                          o.inv.balance,
                          o.inv.status,
                        ].map((h) => (
                          <th key={h} scope="col" className="py-2 font-medium">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {d.invoices.map((i) => (
                        <tr key={i.no}>
                          <td className="py-2 font-mono">{i.no}</td>
                          <td className="tabular">
                            {formatMoney(i.total, "RWF", locale)}
                          </td>
                          <td className="tabular">
                            {formatMoney(i.balanceDue, "RWF", locale)}
                          </td>
                          <td>{i.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : !d.timeline.length ? (
              <EmptyState title={o.noTimeline} />
            ) : (
              <ol className="mt-4 grid gap-2 border-l border-border pl-4 text-small">
                {d.timeline.map((x, i) => (
                  <li key={`${x.kind}-${x.ref}-${i}`}>
                    <span className="tabular text-fg-muted">
                      {formatDate(x.at, locale)}
                    </span>{" "}
                    · {x.title}
                  </li>
                ))}
              </ol>
            ),
        }))}
      />
    </>
  );
}

/** SUB-10: buy a plan for the company (MoMo prompt to the payer's phone). */
function BuyPlan({ orgId }: { orgId: string }) {
  const { c } = useC4();
  const o = c.orgs;
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState("");
  const [phone, setPhone] = useState("");
  const plans = useQuery({
    queryKey: ["c3", "plans"],
    enabled: open,
    queryFn: () =>
      unwrap<{ plans: { planId: string; name: string; amountRwf: number }[] }>(
        api.GET("/api/me/subscription/plans"),
      ),
  });
  const pay = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST("/api/payments/initiate", {
          body: {
            plan_id: planId,
            organization_id: orgId,
            method: "mobile_money",
            operator: "mtn",
            phone_number: phone.trim(),
          },
          headers: {
            "Idempotency-Key": `orgplan:${orgId}:${planId}:${phone.trim()}`,
          },
        }),
      ),
    onSuccess: () => {
      toast({ title: c.saved, tone: "success" });
      setOpen(false);
    },
    onError: () => toast({ title: c.generic, tone: "danger" }),
  });
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {o.sub.buy}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={o.sub.title}
        footer={
          <Button
            disabled={!planId || phone.trim().length < 9}
            loading={pay.isPending}
            onClick={() => pay.mutate()}
          >
            {o.sub.buy}
          </Button>
        }
      >
        {plans.isPending ? (
          <Skeleton className="h-16" />
        ) : plans.isError ? (
          <ErrorState error={plans.error} onRetry={() => plans.refetch()} />
        ) : (
          <div className="grid gap-3">
            <Field label={o.sub.title}>
              {(a) => (
                <Select
                  id={a.id}
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                >
                  <option value=""></option>
                  {plans.data.plans.map((p) => (
                    <option key={p.planId} value={p.planId}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={o.phone}>
              {(a) => (
                <Input
                  id={a.id}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              )}
            </Field>
          </div>
        )}
      </Dialog>
    </>
  );
}
