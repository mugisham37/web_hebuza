"use client";
import { api, unwrap } from "@/lib/api/client";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { localHref } from "@/shared/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import { formatDate } from "@/shared/format";
import { Button, ButtonLink } from "@/components/atoms/button";
import {
  Field,
  Input,
  Radio,
  Select,
  Textarea,
  ErrorSummary,
} from "@/components/atoms/field";
import { EmptyState, ErrorState } from "@/components/atoms/feedback";
import { Dialog } from "@/components/atoms/dialog";
import { Tabs } from "@/components/atoms/tabs";
import { Badge } from "@/components/atoms/tag";
import { Icon } from "@/components/atoms/icon";
import { Segmented } from "@/components/atoms/inputs";
import { fill } from "@/content/pages/c4";
import {
  ListSkeleton,
  PageHead,
  Panel,
  useC4,
} from "@/components/molecules/client/client";

type TicketStatus = "open" | "waiting" | "resolved";
type Ticket = {
  ref: string;
  subject: string;
  status: TicketStatus;
  createdAt: string;
};
type TicketType = "question" | "complaint" | "feedback";
type Pref = "inapp" | "email" | "sms";
const TONE = { open: "info", waiting: "warning", resolved: "success" } as const;

/** C14 Help centre: FAQ search, contact, tickets (list + open). Refunds live on /help/refunds. */
export function HelpView() {
  const { c, locale } = useC4();
  const h = c.help;
  const [q, setQ] = useState("");
  const s = q.trim().toLowerCase();
  const faq = h.faq.filter(
    (f) => !s || `${f.q} ${f.a}`.toLowerCase().includes(s),
  );

  return (
    <>
      <PageHead
        title={h.title}
        lede={h.lede}
        action={
          <ButtonLink
            href={localHref(locale, "/help/refunds")}
            variant="outline"
            dots
          >
            {c.refund.title}
          </ButtonLink>
        }
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section data-guide="client-help-faq" aria-labelledby="faq-h" className="min-w-0">
          <Field label={h.search}>
            {({ id }) => (
              <div className="relative">
                <Icon
                  name="search"
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fg-subtle"
                />
                <Input
                  id={id}
                  type="search"
                  placeholder={h.searchPh}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="pl-12"
                />
              </div>
            )}
          </Field>
          <h2 id="faq-h" className="text-fg-heading mt-8 mb-3 text-h3">
            {h.topics}
          </h2>
          {faq.length ? (
            <div className="divide-y divide-border bg-surface shadow-sm">
              {faq.map((f) => (
                <details key={f.q} className="group p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-label">
                    {f.q}
                    <Icon
                      name="chevronDown"
                      aria-hidden
                      className="shrink-0 transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="mt-3 text-body text-fg-muted">{f.a}</p>
                </details>
              ))}
            </div>
          ) : (
            <EmptyState title={fill(h.noResults, { q })} body="" />
          )}
          <Tickets />
        </section>
        <aside data-guide="client-help-contact" className="grid content-start gap-5">
          <Panel icon="message" title={h.contact} body={h.contactLede}>
            <div className="grid gap-2">
              <ButtonLink
                href={localHref(locale, "/requests")}
                variant="primary"
                size="sm"
              >
                {h.chat}
              </ButtonLink>
              <ButtonLink
                href={localHref(locale, "/contact")}
                variant="outline"
                size="sm"
              >
                {h.contactPage}
              </ButtonLink>
            </div>
          </Panel>
          <Panel icon="wallet" title={c.refund.title} body={c.refund.policy}>
            <Link
              href={localHref(locale, "/help/refunds")}
              className="text-button underline underline-offset-4"
            >
              {c.refund.cta}
            </Link>
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Tickets() {
  const { c, locale } = useC4();
  const h = c.help;
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ["c4", "tickets"],
    queryFn: () => unwrap<{ tickets: Ticket[] }>(api.GET("/api/support/tickets")),
  });
  const all = q.data?.tickets ?? [];
  const list = (st?: TicketStatus) => {
    const rows = all.filter((t) => !st || t.status === st);
    if (!rows.length) return <EmptyState title={h.noTickets} body="" />;
    return (
      <ul className="grid gap-3">
        {rows.map((t) => (
          <li
            key={t.ref}
            className="flex flex-wrap items-center gap-3 bg-surface p-4 shadow-sm"
          >
            <div className="min-w-0 flex-1 basis-48">
              <p className="font-mono text-small text-fg-subtle">{t.ref}</p>
              <Link
                href={localHref(locale, `/help/tickets/${t.ref}`)}
                className="text-label underline-offset-4 hover:underline"
              >
                {t.subject}
              </Link>
            </div>
            <Badge tone={TONE[t.status]}>{h.ticketStatus[t.status]}</Badge>
            <span className="text-small text-fg-subtle">
              {formatDate(t.createdAt, locale)}
            </span>
          </li>
        ))}
      </ul>
    );
  };
  const count = (st?: TicketStatus) =>
    all.filter((t) => !st || t.status === st).length;

  return (
    <section aria-labelledby="tk-h" className="mt-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="tk-h" className="text-fg-heading text-h3">
          {h.tickets}
        </h2>
        <Button data-guide="client-help-newticket" size="sm" dots onClick={() => setOpen(true)}>
          {h.newTicket}
        </Button>
      </div>
      {q.isPending ? (
        <ListSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <Tabs
          tabs={[
            {
              id: "all",
              label: h.ticketTabs.all,
              count: count(),
              content: list(),
            },
            {
              id: "open",
              label: h.ticketTabs.open,
              count: count("open"),
              content: list("open"),
            },
            {
              id: "waiting",
              label: h.ticketTabs.waiting,
              count: count("waiting"),
              content: list("waiting"),
            },
            {
              id: "resolved",
              label: h.ticketTabs.resolved,
              count: count("resolved"),
              content: list("resolved"),
            },
          ]}
        />
      )}
      {open && <NewTicket onClose={() => setOpen(false)} />}
    </section>
  );
}

function NewTicket({ onClose }: { onClose: () => void }) {
  const { c } = useC4();
  const { t } = useI18n();
  const f = c.help.form;
  const qc = useQueryClient();
  const [type, setType] = useState<TicketType>("question");
  const [pref, setPref] = useState<Pref>("inapp");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const reqs = useQuery({
    queryKey: ["c4", "refund-eligibility"],
    queryFn: () =>
      unwrap<{ payments: { caseRef: string; service: string }[] }>(api.GET("/api/me/refunds/eligibility")),
  });
  const send = useMutation({
    mutationFn: (body: { subject?: string; message?: string; caseRef?: string; type: string; contact: string }) =>
      unwrap<{ ref: string }>(api.POST("/api/support/tickets", { body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["c4", "tickets"] }),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget)) as Record<
      string,
      string
    >;
    const errs: Record<string, string> = {};
    if (!d.subject?.trim()) errs["tk-subject"] = c.required;
    if (!d.message?.trim()) errs["tk-message"] = c.required;
    setErrors(errs);
    if (!Object.keys(errs).length) send.mutate({ subject: d.subject, message: d.message, caseRef: d.caseRef, type, contact: pref });
  }

  if (send.isSuccess) {
    return (
      <Dialog
        open
        onClose={onClose}
        title={fill(f.received, { ref: send.data.ref })}
        footer={<Button onClick={onClose}>{t("common.close")}</Button>}
      >
        <p role="status" className="flex items-center gap-3 text-body">
          <Icon name="check" aria-hidden className="text-success" />
          {f.receivedBody}
        </p>
      </Dialog>
    );
  }
  return (
    <Dialog open onClose={onClose} title={c.help.newTicket}>
      <form noValidate onSubmit={onSubmit} className="grid gap-5">
        <ErrorSummary
          title={c.fixErrors}
          errors={Object.entries(errors).map(([field, message]) => ({
            field,
            message,
          }))}
        />
        <Segmented
          label={f.type}
          value={type}
          onChange={setType}
          options={(Object.keys(f.types) as TicketType[]).map((v) => ({
            value: v,
            label: f.types[v],
          }))}
        />
        {type === "complaint" && (
          <p className="bg-warning-bg px-4 py-3 text-small">
            {f.complaintNote}
          </p>
        )}
        <Field label={f.request}>
          {({ id }) => (
            <Select id={id} name="caseRef" defaultValue="">
              <option value="">{f.none}</option>
              {reqs.data?.payments.map((r) => (
                <option
                  key={r.caseRef}
                  value={r.caseRef}
                >{`${r.caseRef} · ${r.service}`}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field id="tk-subject" label={f.subject} error={errors["tk-subject"]}>
          {({ id, describedBy, invalid }) => (
            <Input id={id}
              name="subject"
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </Field>
        <Field id="tk-message" label={f.message} error={errors["tk-message"]}>
          {({ id, describedBy, invalid }) => (
            <Textarea id={id}
              name="message"
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </Field>
        <fieldset>
          <legend className="mb-2 text-label">{f.contactPref}</legend>
          <div className="flex flex-wrap gap-5">
            {(Object.keys(f.prefs) as Pref[]).map((v) => (
              <Radio
                key={v}
                name="pref"
                label={f.prefs[v]}
                checked={pref === v}
                onChange={() => setPref(v)}
              />
            ))}
          </div>
        </fieldset>
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
            {f.send}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
