"use client";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { api, unwrap, ApiError } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import {
  LC,
  TRACK_CODE,
  normaliseCode,
  type TrackDetail,
} from "@/content/pages/lc";
import { cx, formatDate, formatDateTime, formatMoney } from "@/shared/format";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Field, Input, Switch } from "@/components/atoms/field";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Tag } from "@/components/atoms/tag";
import { Skeleton } from "@/components/atoms/feedback";
import { waLink } from "@/content/marketing";

type Tracker = components["schemas"]["TrackerResponse"];

/** /track entry form: validates format locally, then routes to /track/[code]. */
export function TrackLookup({
  initial = "",
  autoFocus,
}: {
  initial?: string;
  autoFocus?: boolean;
}) {
  const { locale } = useI18n();
  const c = LC[locale].track;
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const code = normaliseCode(value);
    if (!TRACK_CODE.test(code)) return setError(c.invalidBody);
    setError("");
    router.push(localHref(locale, `/track/${code}`));
  };
  return (
    <form
      onSubmit={submit}
      noValidate
      className="grid gap-4 border-2 border-navy-700 bg-white p-5 text-left shadow-md sm:p-6"
    >
      {error && (
        <div
          role="alert"
          className="flex gap-3 border border-danger bg-danger-bg p-4"
        >
          <span
            aria-hidden
            className="grid size-6 shrink-0 place-items-center rounded-full bg-danger text-small font-bold text-white"
          >
            !
          </span>
          <div>
            <p className="font-medium">{c.invalidTitle}</p>
            <p className="text-small">{error}</p>
          </div>
        </div>
      )}
      <Field label={c.label} error={error ? c.invalidBody : undefined}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={c.placeholder}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            autoFocus={autoFocus}
            className="px-5 uppercase"
          />
        )}
      </Field>
      <Button type="submit" dots className="w-full justify-center">
        {c.submit} <Icon name="arrowRight" size={16} />
      </Button>
      <div className="flex flex-wrap justify-between gap-2 text-small font-medium">
        <a href={localHref(locale, "/login")} className="hover:underline">
          {c.signIn} →
        </a>
        <a href={localHref(locale, "/services")} className="hover:underline">
          {c.start} →
        </a>
      </div>
    </form>
  );
}

type Load =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "notFound" }
  | { kind: "offline" }
  | { kind: "error" }
  | { kind: "ok"; data: Tracker };

/** /track/[code]: summary → verify → full tracker. No personal data before verification. */
export function TrackResult({ code }: { code: string }) {
  const { locale } = useI18n();
  const c = LC[locale].track;
  const valid = TRACK_CODE.test(code);
  const [state, setState] = useState<Load>(
    valid ? { kind: "loading" } : { kind: "invalid" },
  );
  const [attempt, setAttempt] = useState(0);
  const [detail, setDetail] = useState<TrackDetail | null>(null); // in memory only: gone on reload, by design

  useEffect(() => {
    if (!valid) return;
    let live = true;
    unwrap<Tracker>(api.GET("/api/track/{code}", { params: { path: { code } } }))
      .then(
        (data) =>
          live && setState(data ? { kind: "ok", data } : { kind: "notFound" }),
      )
      .catch((e: unknown) => {
        if (!live) return;
        if (!navigator.onLine) return setState({ kind: "offline" });
        // 404 and 422 get the same copy so a code's existence isn't leaked.
        setState(
          e instanceof ApiError && (e.isNotFound || e.isValidation)
            ? { kind: "notFound" }
            : { kind: "error" },
        );
      });
    return () => {
      live = false;
    };
  }, [code, valid, attempt]);

  const retry = () => {
    setState({ kind: "loading" });
    setAttempt((n) => n + 1);
  };
  const again = (
    <ButtonLink href={localHref(locale, "/track")} variant="outline">
      {c.tryAnother}
    </ButtonLink>
  );

  if (state.kind === "loading")
    return (
      <div
        aria-busy="true"
        className="grid gap-4 border border-border bg-white p-6"
      >
        <span className="sr-only" role="status">
          {c.loading}
        </span>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-9 w-40 " />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  if (state.kind === "invalid")
    return (
      <Panel icon="x" tone="danger" title={c.invalidTitle} body={c.invalidBody}>
        {again}
      </Panel>
    );
  if (state.kind === "notFound")
    return (
      <Panel
        icon="search"
        tone="lavender"
        title={c.notFoundTitle}
        body={c.notFoundBody}
      >
        <ButtonLink href={waLink(`Track ${code}`)} variant="outline" dots>
          {c.chat}
        </ButtonLink>
        <ButtonLink href={localHref(locale, "/contact")} dots>
          {c.contact}
        </ButtonLink>
        {again}
      </Panel>
    );
  if (state.kind === "offline" || state.kind === "error")
    return (
      <Panel
        icon={state.kind === "offline" ? "globe" : "refresh"}
        tone="sand"
        title={state.kind === "offline" ? c.offlineTitle : c.errorTitle}
        body={state.kind === "offline" ? c.offlineBody : c.errorBody}
      >
        <Button onClick={retry} dots>
          {c.retry}
        </Button>
      </Panel>
    );

  const t = state.data;
  return (
    <div className="grid gap-6">
      <section
        aria-labelledby="track-summary"
        className="grid gap-6 border border-border bg-white p-6 md:grid-cols-[1fr_auto_1.2fr] md:items-center"
      >
        <div>
          <h2
            id="track-summary"
            className="font-display text-h3 tracking-tight"
          >
            {t.code}
          </h2>
          <p className="font-medium">{t.service_name}</p>
          <Tag
            variant={t.status === "action_needed" ? "new" : "navy"}
            className="mt-3"
          >
            {t.current_step_title ?? t.status}
          </Tag>
          <PhaseBar step={t.current_step_number ?? 1} labels={c.phases} />
          <p className="mt-3 text-small text-fg-muted">
            {c.lastUpdate}: {formatDateTime(t.updated_at, locale)}
          </p>
          {t.estimated_completion && (
            <p className="text-small text-fg-muted">
              {c.expected} {formatDate(t.estimated_completion, locale)}
            </p>
          )}
        </div>
        <span aria-hidden className="hidden h-full w-px bg-border md:block" />
        {detail ? (
          <p className="flex items-center gap-2 font-medium text-success">
            <Icon name="check" size={18} />
            {c.verified}
          </p>
        ) : (
          <Verify code={code} onVerified={setDetail} />
        )}
      </section>
      {detail && <Detail d={detail} />}
    </div>
  );
}

function PhaseBar({ step, labels }: { step: number; labels: string[] }) {
  return (
    <ol className="mt-4 flex gap-2" aria-label={labels.join(" → ")}>
      {labels.map((l, i) => (
        <li key={l} className="flex items-center gap-2">
          <span
            aria-hidden
            className={cx(
              "size-4 rounded-full border-2",
              i + 1 < step
                ? "border-navy-700 bg-navy-700"
                : i + 1 === step
                  ? "border-gold-500 bg-gold-100 ring-2 ring-gold-400/40"
                  : "border-border-strong",
            )}
          />
          <span className="sr-only">
            {l}
            {i + 1 === step ? " (current)" : ""}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Verify({
  code,
  onVerified,
}: {
  code: string;
  onVerified: (d: TrackDetail) => void;
}) {
  const { locale } = useI18n();
  const c = LC[locale].track;
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!contact.trim()) return setError(c.verifyLabel);
    setBusy(true);
    setError("");
    try {
      const d = await unwrap<{ detail: TrackDetail }>(
        api.POST("/api/track/{code}/verify", { params: { path: { code } }, body: { contact: contact.trim() } }),
      ).catch((e: unknown) => {
        if (e instanceof ApiError) return setError(e.status >= 500 ? c.errorBody : c.verifyFail);
        throw e;
      });
      if (d) onVerified(d.detail);
    } catch {
      setError(navigator.onLine ? c.errorBody : c.offlineBody);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} noValidate className="flex gap-4">
      <span
        aria-hidden
        className="grid size-12 shrink-0 place-items-center rounded-full bg-navy-50 text-navy-700"
      >
        <Icon name="lock" />
      </span>
      <div className="grid flex-1 gap-3">
        <p className="font-medium">{c.verifyTitle}</p>
        <Field
          label={<span className="sr-only">{c.verifyLabel}</span>}
          error={error || undefined}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={c.verifyLabel}
              autoComplete="email tel"
              className="px-5"
            />
          )}
        </Field>
        <Button
          type="submit"
          dots
          loading={busy}
          disabled={busy}
          className="justify-self-start"
        >
          {c.verifySubmit}
        </Button>
        <p className="text-small text-fg-muted">{c.verifyNote}</p>
      </div>
    </form>
  );
}

function Detail({ d }: { d: TrackDetail }) {
  const { locale } = useI18n();
  const c = LC[locale].track;
  const [notify, setNotify] = useState(true); // shortcut: local only, persist via notification prefs API when it exists
  return (
    <section className="overflow-hidden border border-border bg-white">
      <div className="grid gap-8 p-6 lg:grid-cols-[1fr_1.1fr]">
        <ol className="relative grid gap-6 before:absolute before:top-2 before:bottom-2 before:left-[0.6875rem] before:w-px before:bg-border">
          {d.timeline.map((s) => (
            <li
              key={s.title}
              className="relative flex gap-4"
              aria-current={s.state === "current" ? "step" : undefined}
            >
              <span
                aria-hidden
                className={cx(
                  "relative mt-0.5 size-6 shrink-0 rounded-full border-2",
                  s.state === "done"
                    ? "border-navy-700 bg-navy-700"
                    : s.state === "current"
                      ? "border-gold-500 bg-gold-100 ring-3 ring-gold-400/40"
                      : "border-border-strong bg-white",
                )}
              />
              <p className={cx(s.state === "todo" && "text-fg-subtle")}>
                <span className="font-medium">{s.title}</span>
                {s.at && <> · {formatDateTime(s.at, locale)}</>}
                {s.note && (
                  <span className="block text-small text-fg-muted">
                    {s.note}
                  </span>
                )}
              </p>
            </li>
          ))}
        </ol>
        <div className="grid content-start gap-3">
          <Card icon="zap" tone="bg-warning-bg border-gold-300" title={c.neededTitle}>
            {d.needed.length === 0 ? (
              <p>{c.nothingNeeded} ✓</p>
            ) : (
              <ul className="grid gap-3">
                {d.needed.map((n) => (
                  <li
                    key={n.label}
                    className="flex flex-wrap items-center justify-between gap-3"
                  >
                    <span>
                      {n.label}
                      {n.amount
                        ? ` · ${formatMoney(n.amount, "RWF", locale)}`
                        : ""}
                    </span>
                    {/* Upload / pay flows are Stage 2 client routes. */}
                    <ButtonLink
                      href={localHref(
                        locale,
                        n.kind === "pay" ? "/pay" : "/requests",
                      )}
                      size="sm"
                      variant={n.kind === "pay" ? "primary" : "outline"}
                      dots
                    >
                      {n.kind === "pay" ? c.payNow : c.upload}
                    </ButtonLink>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card icon="wallet" title={c.payment}>
            <p>
              {c.paid} {formatMoney(d.payment.paid, "RWF", locale)} ·{" "}
              {d.payment.method}
              {d.payment.receipt && ` · ${d.payment.receipt}`}
            </p>
            {d.payment.due > 0 && (
              <p className="font-medium">
                {c.due}: {formatMoney(d.payment.due, "RWF", locale)}
              </p>
            )}
          </Card>
          <Card
            icon="building"
            tone="bg-info-bg border-sky-200"
            title={c.institution}
          >
            <p>
              {d.institution.name}: {d.institution.decision}
            </p>
            <p className="text-small text-fg-muted">{c.institutionNote}</p>
          </Card>
          <Card icon="file" title={c.documents}>
            <ul className="grid gap-1">
              {d.documents.map((doc) => (
                <li key={doc.name} className="flex items-center gap-2">
                  <Icon name={doc.verified ? "fileCheck" : "file"} size={16} />
                  {doc.name}
                  {doc.verified && (
                    <span className="text-success">({c.verified})</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
      <div className="border-t border-border bg-bg-subtle px-6 py-3">
        <Switch
          label={c.updates}
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
        />
      </div>
    </section>
  );
}

function Card({
  icon,
  title,
  tone = "bg-white border-border",
  children,
}: {
  icon: IconName;
  title: string;
  tone?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx("flex gap-3 border p-4", tone)}>
      <Icon name={icon} className="mt-0.5 shrink-0" />
      <div className="grid flex-1 gap-1">
        <h3 className="font-medium">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Panel({
  icon,
  tone,
  title,
  body,
  children,
}: {
  icon: IconName;
  tone: "danger" | "lavender" | "sand";
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className="grid justify-items-center gap-3 border border-border bg-white p-8 text-center"
    >
      <span
        aria-hidden
        className={cx(
          "grid size-14 place-items-center rounded-full",
          tone === "danger"
            ? "bg-danger text-white"
            : tone === "lavender"
              ? "bg-navy-50 text-navy-700"
              : "bg-ink-100 text-navy-700",
        )}
      >
        <Icon name={icon} />
      </span>
      <h2 className="text-card-title">{title}</h2>
      <p className="text-fg-muted">{body}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">{children}</div>
    </div>
  );
}
