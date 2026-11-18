"use client";
import { api, unwrap } from "@/lib/api/client";
import { useEffect, useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { LC, fmt } from "@/content/pages/lc";
import type { components } from "@/lib/api/schema";

type StatusData = components["schemas"]["PlatformStatusResponse"];
type ComponentState = StatusData["components"][number]["state"];
import { cx, formatDateTime } from "@/shared/format";
import { Button } from "@/components/atoms/button";
import { Field, Input } from "@/components/atoms/field";

const DOT: Record<ComponentState, string> = { operational: "bg-success", degraded: "bg-warning", outage: "bg-danger" };

/** 13-status__v1: banner, 90-day tick bars, incidents, subscribe. Refreshes /api/status every 60 s. */
export function StatusBoard() {
  const { locale } = useI18n();
  const c = LC[locale].status;
  const [data, setData] = useState<StatusData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const load = () =>
      unwrap<StatusData>(api.GET("/api/status"))
        .then((d) => { setData(d); setFailed(false); })
        .catch(() => { setData(null); setFailed(true); }); // never show invented uptime when the API is down (audit §8)
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!data) return <p role="status" className="border border-border bg-white p-6 text-h3">{failed ? c.unavailable : c.loading}</p>;
  const overall: ComponentState = data.components.some((x) => x.state === "outage") ? "outage" : data.components.some((x) => x.state === "degraded") ? "degraded" : "operational";
  return (
    <div className="grid gap-8">
      <div role="status" data-state={overall} className={cx("flex items-center gap-4 p-6", overall === "operational" ? "bg-success-bg" : overall === "degraded" ? "bg-warning-bg" : "bg-danger-bg")}>
        <span aria-hidden className={cx("size-4 shrink-0 rounded-full ring-4 ring-white", DOT[overall])} />
        <div>
          <p className="text-h3">{c[overall]}</p>
          <p className="text-small text-fg-muted">{fmt(c.updated, { t: formatDateTime(data.updatedAt, locale) })}</p>
        </div>
      </div>
      <p className="text-small text-fg-subtle">{c.demo}</p>

      <ul className="divide-y divide-border border border-border bg-white">
        {data.components.map((x) => (
          <li key={x.name} className="grid gap-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{x.name}</span>
              <span className="flex items-center gap-2 text-small"><span aria-hidden className={cx("size-2.5 rounded-full", DOT[x.state])} />{c.states[x.state]}</span>
            </div>
            {x.days.length > 0 && <svg viewBox="0 0 270 24" preserveAspectRatio="none" className="h-6 w-full" role="img" aria-label={fmt(c.uptime, { p: x.uptime ?? 0 })}>
              {x.days.map((d, i) => <rect key={i} x={i * 3} width="2" height="24" rx="1" className={d === "operational" ? "fill-success" : d === "degraded" ? "fill-warning" : "fill-danger"} />)}
            </svg>}
            <p className="text-small text-fg-muted">{x.uptime == null ? x.detail : fmt(c.uptime, { p: x.uptime })}</p>
          </li>
        ))}
      </ul>

      <section aria-labelledby="incidents-h" className="grid gap-4">
        <h2 id="incidents-h" className="text-h3">{c.incidents}</h2>
        {data.incidents.length === 0 ? <p className="text-fg-muted">{c.noIncidents}</p> : (
          <ul className="grid gap-3">
            {data.incidents.map((i) => (
              <li key={i.title} className="border border-border bg-white p-5">
                <p className="flex items-center gap-2 font-medium"><span aria-hidden className={cx("size-2.5 rounded-full", DOT[i.state])} />{i.title}</p>
                <p className="text-small text-fg-muted">{formatDateTime(i.at, locale)} · {c.states[i.state]}</p>
                <p className="mt-2">{i.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Subscribe />
    </div>
  );
}

function Subscribe() {
  const { locale } = useI18n();
  const c = LC[locale].status;
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(c.emailInvalid);
    setError("");
    // Status-update subscribers are CRM leads with email consent (POST /api/leads).
    const ok = await unwrap(api.POST("/api/leads", { body: { email, source: "landing_form", consent: { email: "in" }, landing: location.pathname, campaign: "status-updates" } })).then(() => true, () => false);
    if (!ok) return setError(c.emailInvalid);
    setDone(true);
  };
  return (
    <section aria-labelledby="sub-h" className="theme-dark border-t-[3px] border-rule bg-bg p-6 text-fg">
      <h2 id="sub-h" className="text-card-title text-fg-heading">{c.subscribe}</h2>
      {done ? <p role="status" className="mt-3">{c.subscribed}</p> : (
        <form onSubmit={submit} noValidate className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label={c.email} error={error || undefined} className="flex-1">
            {({ id, describedBy, invalid }) => <Input id={id} type="email" autoComplete="email" aria-describedby={describedBy} aria-invalid={invalid} value={email} onChange={(e) => setEmail(e.target.value)} />}
          </Field>
          <Button type="submit" variant="primary" dots>{c.subscribeCta}</Button>
        </form>
      )}
    </section>
  );
}
