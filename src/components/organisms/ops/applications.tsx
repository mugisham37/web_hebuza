"use client";
// Stage 8: SM review of external-agent applications from /join (approve / decline / request info).
// Reads and writes the same application records /join/status shows (/api/ops/x/applications). Selected application lives in ?ref=.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { formatDate } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { errorCopy } from "@/lib/api/error-copy";
import { api, unwrap } from "@/lib/api/client";
import type { Application } from "@/lib/work/api";
import type { Draft } from "@/lib/work/a";
import { fill } from "@/content/pages/ops-workforce";
import { useW, WorkforceDenied } from "@/components/organisms/ops/workforce";
import { PageHead } from "@/components/atoms/agent";
import { Pill } from "@/components/molecules/system/system";
import { Dialog } from "@/components/atoms/dialog";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Checkbox, Field, Textarea } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";

type Row = Application & { email: string };
type Detail = Row & { draft: Partial<Draft> };
type Decision = "approve" | "reject" | "request_info";
const OPEN: Application["status"][] = [
  "received",
  "under_review",
  "info_requested",
];
const FLAGGABLE = ["regNumber", "expertise"] as const; // the fields /join/status lets the applicant edit
const key = ["ops", "applications"] as const;
const tone = (s: Application["status"]) =>
  s === "approved" || s === "converted"
    ? "success"
    : s === "rejected"
      ? "danger"
      : s === "info_requested"
        ? "warning"
        : "info";

export function ApplicationsView() {
  const c = useW();
  const { locale } = useI18n();
  const { user } = useSession();
  const ref = useUrlParams().get("ref");
  const q = useQuery({
    queryKey: key,
    queryFn: () => unwrap<{ items: Row[] }>(api.GET("/api/ops/x/applications")),
  });
  if (
    user &&
    !user.roles.some(
      (r) => r === "staff:service_manager" || r === "staff:executive",
    )
  )
    return <WorkforceDenied />;
  const items = q.data?.items ?? [];
  const list = (rows: Row[]) => (
    <ul className="grid gap-2">
      {rows.map((a) => (
        <li key={a.ref}>
          <button
            type="button"
            onClick={() => setUrlParams({ ref: a.ref })}
            className="grid w-full gap-1 border border-border bg-white p-4 text-left hover:border-navy-300 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <span className="grid gap-0.5">
              <span className="text-label">{a.name}</span>
              <span className="text-eyebrow text-fg-subtle">
                <span className="font-mono">{a.ref}</span> ·{" "}
                {c.apps.kind[a.kind]} · {formatDate(a.submittedAt, locale)}
              </span>
            </span>
            <Pill tone={tone(a.status)}>{c.apps.status[a.status]}</Pill>
          </button>
        </li>
      ))}
    </ul>
  );
  const open = items.filter((a) => OPEN.includes(a.status));
  const closed = items.filter((a) => !OPEN.includes(a.status));
  return (
    <div className="grid gap-6">
      <PageHead
        title={c.apps.title}
        sub={c.apps.sub}
        actions={
          <ButtonLink
            variant="secondary"
            href={localHref(locale, "/ops/workforce")}
          >
            {c.title}
          </ButtonLink>
        }
      />
      {q.isPending ? (
        <div className="h-32 m-shimmer" />
      ) : q.isError ? (
        <p role="alert" className="text-small text-danger">
          {errorCopy(q.error, locale)}{" "}
          <Button size="sm" variant="outline" onClick={() => q.refetch()}>
            ↻
          </Button>
        </p>
      ) : !items.length ? (
        <p className="text-small text-fg-muted">{c.apps.empty}</p>
      ) : (
        <>
          <section className="grid gap-3">
            <h2 className="text-label-lg">
              {c.apps.open} ({open.length})
            </h2>
            {list(open)}
          </section>
          {closed.length > 0 && (
            <section className="grid gap-3">
              <h2 className="text-label-lg">
                {c.apps.closed} ({closed.length})
              </h2>
              {list(closed)}
            </section>
          )}
        </>
      )}
      {ref && (
        <ApplicationSheet
          key={ref}
          appRef={ref}
          onClose={() => setUrlParams({ ref: null })}
        />
      )}
    </div>
  );
}

function ApplicationSheet({
  appRef,
  onClose,
}: {
  appRef: string;
  onClose: () => void;
}) {
  const c = useW().apps;
  const { locale } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: [...key, appRef],
    queryFn: () =>
      unwrap<Detail>(api.GET("/api/ops/x/applications/{ref}", { params: { path: { ref: encodeURIComponent(appRef) } } })),
  });
  const [mode, setMode] = useState<Decision | null>(null);
  const [note, setNote] = useState("");
  const [fields, setFields] = useState<string[]>([]);
  const [err, setErr] = useState<string>();
  const m = useMutation({
    mutationFn: (d: Decision) =>
      unwrap<Detail>(api.POST("/api/ops/x/applications/{ref}/decision", { params: { path: { ref: encodeURIComponent(appRef) } }, body: { decision: d, note, fields } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  const submit = async (d: Decision) => {
    if (d !== "approve" && !note.trim()) return setErr(c.noteHint);
    if (d === "request_info" && !fields.length) return setErr(c.fields);
    try {
      await m.mutateAsync(d);
      toast({ tone: "success", title: fill(c.done, { ref: appRef }) });
      onClose();
    } catch (e) {
      setErr(errorCopy(e, locale));
    }
  };
  const a = q.data;
  const decidable = a && OPEN.includes(a.status);
  const row = (label: string, v?: string) =>
    v ? (
      <div className="grid gap-0.5">
        <dt className="text-eyebrow text-fg-subtle">{label}</dt>
        <dd className="text-small">{v}</dd>
      </div>
    ) : null;
  return (
    <Dialog
      open
      onClose={onClose}
      side="right"
      title={a?.name ?? appRef}
      description={appRef}
      footer={
        decidable ? (
          mode ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setMode(null);
                  setErr(undefined);
                }}
              >
                ←
              </Button>
              <Button
                variant={mode === "reject" ? "danger" : undefined}
                loading={m.isPending}
                onClick={() => submit(mode)}
              >
                {mode === "reject" ? c.reject : c.requestInfo}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button loading={m.isPending} onClick={() => submit("approve")}>
                {c.approve}
              </Button>
              <Button variant="outline" onClick={() => setMode("request_info")}>
                {c.requestInfo}
              </Button>
              <Button variant="danger" onClick={() => setMode("reject")}>
                {c.reject}
              </Button>
            </div>
          )
        ) : undefined
      }
    >
      {q.isPending ? (
        <div className="h-40 m-shimmer" />
      ) : q.isError ? (
        <p role="alert" className="text-small text-danger">
          {errorCopy(q.error, locale)}
        </p>
      ) : (
        a && (
          <div className="grid gap-4">
            <Pill tone={tone(a.status)} className="w-fit">
              {c.status[a.status]}
            </Pill>
            <dl className="grid gap-3">
              {row(c.email, a.email)}
              {row(c.submitted, formatDate(a.submittedAt, locale))}
              {row(c.services, a.draft.services?.join(", "))}
              {row(c.expertise, a.draft.expertise)}
              {row(c.regNumber, a.draft.regNumber)}
              {row(c.district, a.draft.district)}
              {row(c.note, a.decisionNote)}
            </dl>
            {!decidable && (
              <p className="text-small text-fg-muted">{c.decided}</p>
            )}
            {err && (
              <p
                role="alert"
                className="bg-danger-bg px-3 py-2 text-small text-danger"
              >
                {err}
              </p>
            )}
            {decidable && mode === "request_info" && (
              <fieldset className="grid gap-2">
                <legend className="text-label">{c.fields}</legend>
                {FLAGGABLE.map((f) => (
                  <Checkbox
                    key={f}
                    label={c[f]}
                    checked={fields.includes(f)}
                    onChange={(e) =>
                      setFields((xs) =>
                        e.target.checked
                          ? [...xs, f]
                          : xs.filter((x) => x !== f),
                      )
                    }
                  />
                ))}
              </fieldset>
            )}
            {decidable && mode && (
              <Field label={c.note} hint={c.noteHint}>
                {(f) => (
                  <Textarea
                    id={f.id}
                    aria-describedby={f.describedBy}
                    aria-invalid={f.invalid}
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                )}
              </Field>
            )}
          </div>
        )
      )}
    </Dialog>
  );
}
