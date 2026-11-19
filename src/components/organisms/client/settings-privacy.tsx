"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, ApiError } from "@/lib/api/client";
import { qk } from "@/lib/query/client";
import { localHref } from "@/shared/i18n/config";
import { formatDate } from "@/shared/format";
import { Button } from "@/components/atoms/button";
import { Checkbox, Field, Switch } from "@/components/atoms/field";
import { ErrorState, Skeleton } from "@/components/atoms/feedback";
import { Dialog } from "@/components/atoms/dialog";
import { Badge } from "@/components/atoms/tag";
import { useToast } from "@/components/atoms/toast";
import { PasswordInput } from "@/components/atoms/inputs";
import { authCopy } from "@/content/pages/client-auth";
import { fill } from "@/content/pages/c4";
import { Panel, useC4 } from "@/components/molecules/client/client";

type ConsentKey = "processing" | "marketingEmail" | "marketingSms" | "marketingWhatsapp" | "analytics" | "profileReuse" | "aiHistory";
type HistoryRow = { purpose: string; granted: boolean; source: string; at: string };
type Consents = Record<ConsentKey, boolean> & { processingLocked: boolean };
type Export = {
  status: "none" | "pending" | "ready";
  requestedAt?: string | null;
  url?: string | null;
};
type DeletionCheck = { blocked: boolean; refs: string[] };

/** C13 Privacy & data (F-PRV-02/03/04): consents, data export, retention, delete account with blockers + confirm. */
export function PrivacySettings() {
  const { c, locale } = useC4();
  const p = c.settings.privacy;
  const toast = useToast();
  const qc = useQueryClient();
  const consents = useQuery({
    queryKey: ["c4", "consents"],
    queryFn: () => unwrap<Consents>(api.GET("/api/me/consents")),
  });
  // F-CLP-14: timestamped consent ledger for this account.
  const history = useQuery({
    queryKey: ["c4", "consents", "history"],
    queryFn: () => unwrap<{ items: HistoryRow[] }>(api.GET("/api/me/consents/history")),
  });
  const exp = useQuery({
    queryKey: ["c4", "export"],
    queryFn: () => unwrap<Export>(api.GET("/api/me/data-export")),
  });
  const check = useQuery({
    queryKey: ["c4", "deletion-check"],
    queryFn: () => unwrap<DeletionCheck>(api.GET("/api/me/deletion-check")),
  });
  const setConsent = useMutation({
    mutationFn: (v: Partial<Record<ConsentKey, boolean>>) =>
      unwrap<Consents>(api.PUT("/api/me/consents", { body: v })),
    onSuccess: (d) => {
      qc.setQueryData(["c4", "consents"], d);
      void qc.invalidateQueries({ queryKey: ["c4", "consents", "history"] });
      toast({ title: c.saved, tone: "success" });
    },
    onError: () => toast({ title: c.generic, tone: "danger" }),
  });
  const requestExport = useMutation({
    mutationFn: () => unwrap<Export>(api.POST("/api/me/data-export")),
    onSuccess: (d) => qc.setQueryData(["c4", "export"], d),
    onError: () => toast({ title: c.generic, tone: "danger" }),
  });
  const [open, setOpen] = useState(false);

  return (
    <div className="grid gap-5">
      <Panel icon="shield" title={p.consents} body={p.consentsLede}>
        {consents.isPending ? (
          <Skeleton className="h-32" />
        ) : consents.isError ? (
          <ErrorState
            error={consents.error}
            onRetry={() => consents.refetch()}
          />
        ) : (
          <ul className="divide-y divide-border">
            {(["processing", "marketingEmail", "marketingSms", "marketingWhatsapp", "analytics", "profileReuse", "aiHistory"] as const).map((k) => {
              const locked =
                k === "processing" && consents.data.processingLocked;
              return (
                <li
                  key={k}
                  className="flex flex-wrap items-start justify-between gap-3 py-4"
                >
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="text-label">{p.consent[k].t}</p>
                    <p className="text-small text-fg-muted">{p.consent[k].d}</p>
                    {locked && (
                      <p className="mt-1 text-small text-fg-subtle">
                        {p.requiredConsent}
                      </p>
                    )}
                  </div>
                  <Switch
                    label={<span className="sr-only">{p.consent[k].t}</span>}
                    checked={consents.data[k]}
                    disabled={locked || setConsent.isPending}
                    onChange={(e) =>
                      setConsent.mutate({ [k]: e.target.checked })
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
        <details className="mt-2 border-t border-border pt-3">
          <summary className="cursor-pointer text-label">{p.consentHistory}</summary>
          {history.data && !history.data.items.length ? <p className="mt-2 text-small text-fg-muted">{p.consentHistoryEmpty}</p> : (
            <ul className="mt-2 grid gap-1 text-small">
              {history.data?.items.map((h, i) => (
                <li key={`${h.at}-${h.purpose}-${i}`} className="flex flex-wrap justify-between gap-2">
                  <span>{h.purpose.replace(/_/g, " ")} · {h.granted ? p.granted : p.withdrawn}</span>
                  <time dateTime={h.at} className="text-fg-subtle">{new Date(h.at).toLocaleString(locale)}</time>
                </li>
              ))}
            </ul>
          )}
        </details>
      </Panel>

      <Panel
        icon="upload"
        title={p.export}
        body={p.exportLede}
        action={
          exp.data?.status === "none" && (
            <Button
              size="sm"
              variant="outline"
              loading={requestExport.isPending}
              onClick={() => requestExport.mutate()}
            >
              {p.exportCta}
            </Button>
          )
        }
      >
        {exp.isPending ? (
          <Skeleton className="h-6 w-64" />
        ) : exp.isError ? (
          <ErrorState error={exp.error} onRetry={() => exp.refetch()} />
        ) : exp.data.status === "pending" ? (
          <p
            role="status"
            className="bg-bg-tint px-4 py-3 text-body"
          >
            {fill(p.exportPending, {
              date: exp.data.requestedAt ? formatDate(exp.data.requestedAt, locale) : "",
            })}
          </p>
        ) : exp.data.status === "ready" && exp.data.url ? (
          <p
            role="status"
            className="flex flex-wrap items-center gap-3 text-body"
          >
            <Badge tone="success">{p.exportReady}</Badge>
            <a href={exp.data.url} className="underline underline-offset-4">
              {c.settings.privacy.exportCta}
            </a>
          </p>
        ) : null}
      </Panel>

      <Panel icon="clock" title={p.retention} body={p.retentionBody}>
        <Link
          href={localHref(locale, "/legal/privacy")}
          className="text-button underline underline-offset-4"
        >
          {p.retentionLink}
        </Link>
      </Panel>

      <Panel
        tone="danger"
        icon="x"
        title={p.deleteTitle}
        body={p.deleteLede}
        action={
          <Button
            variant="danger"
            size="sm"
            disabled={!check.isSuccess || check.data.blocked}
            onClick={() => setOpen(true)}
          >
            {p.deleteCta}
          </Button>
        }
      >
        {check.isPending ? (
          <Skeleton className="h-6 w-64" />
        ) : check.isError ? (
          <ErrorState error={check.error} onRetry={() => check.refetch()} />
        ) : check.data.blocked ? (
          <div
            role="status"
            className="bg-surface px-4 py-3 text-body"
          >
            <p>{p.blocked}</p>
            <ul className="mt-2 list-disc pl-5 text-small">
              {check.data.refs.map((r) => (
                <li key={r}>{fill(p.blockedReason, { ref: r })}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Panel>
      {open && <DeleteDialog onClose={() => setOpen(false)} />}
    </div>
  );
}

function DeleteDialog({ onClose }: { onClose: () => void }) {
  const { c, locale } = useC4();
  const p = c.settings.privacy;
  const a = authCopy(locale);
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [ok, setOk] = useState(false);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ ok?: string; password?: string }>({});
  const del = useMutation({
    mutationFn: () =>
      unwrap(api.DELETE("/api/auth/account", { body: { password } })),
    onSuccess: async () => {
      toast({ title: p.deleted, tone: "success" });
      qc.setQueryData(qk.session, null);
      router.replace(localHref(locale, "/"));
    },
    onError: (e) => {
      if (
        e instanceof ApiError &&
        (e.status === 400 || e.status === 401 || e.status === 403)
      )
        setErrors({ password: c.settings.security.wrong });
      else toast({ title: c.generic, tone: "danger" });
    },
  });
  function submit() {
    const errs = {
      ok: ok ? undefined : p.mustTick,
      password: password ? undefined : c.required,
    };
    setErrors(errs);
    if (!errs.ok && !errs.password) del.mutate();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={p.confirmTitle}
      description={p.confirmBody}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {c.bookings.keep}
          </Button>
          <Button variant="danger" loading={del.isPending} onClick={submit}>
            {p.deleteCta}
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        <div>
          <Checkbox
            label={p.understand}
            checked={ok}
            onChange={(e) => setOk(e.target.checked)}
            aria-invalid={!!errors.ok || undefined}
            aria-describedby={errors.ok ? "del-ok-err" : undefined}
          />
          {errors.ok && (
            <p
              id="del-ok-err"
              className="mt-1 text-small font-medium text-danger"
            >
              {errors.ok}
            </p>
          )}
        </div>
        <Field label={p.password} error={errors.password}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              showLabel={a.show}
              hideLabel={a.hide}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </Field>
      </div>
    </Dialog>
  );
}
