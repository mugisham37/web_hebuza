"use client";
// W2 worker profile (tabs Overview · Performance · Reviews · History · Documents), W3 review form (?tab=reviews&new=1),
// status changes (Suspend / Reactivate) and the Offboard entry. Private fields masked; reveal needs a reason and is audited.
import { useState } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { cx, formatDate, formatDateTime, formatRelative } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { api, newIdempotencyKey, unwrap } from "@/lib/api/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { errorCopy } from "@/lib/api/error-copy";
import { revealWorker, useHistory, useReviews, useIssueContract, useSubmitReview, useWorker, useWorkerStatus, type WorkerFull } from "@/lib/workforce";
import { fill } from "@/content/pages/ops-workforce";
import { KpiTile, MenuButton, Panel, PanelError, ReasonDialog, EmptyPanel } from "@/components/molecules/ops/ops";
import { CapacityBar } from "@/components/atoms/ops";
import { PageHead, SkeletonRows, StarRating } from "@/components/atoms/agent";
import { ProcPill } from "@/components/atoms/procurement";
import { Tabs } from "@/components/atoms/tabs";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { Checkbox, DateInput, Field, Input, Select, Textarea } from "@/components/atoms/field";
import { Dialog } from "@/components/atoms/dialog";
import { useToast } from "@/components/atoms/toast";
import { usePublicServices } from "@/lib/work/a";
import { WorkforceDenied, canAdmin, useW } from "@/components/organisms/ops/workforce";

const TABS = ["overview", "performance", "reviews", "history", "documents"] as const;
type Tab = (typeof TABS)[number];

export function WorkerProfileView({ id }: { id: string }) {
  const c = useW();
  const { locale } = useI18n();
  const { user } = useSession();
  const p = useUrlParams();
  const q = useWorker(id);
  const [dialog, setDialog] = useState<null | "suspend" | "reactivate">(null);
  const tab: Tab = (TABS as readonly string[]).includes(p.get("tab") ?? "") ? (p.get("tab") as Tab) : "overview";
  if (user && !user.roles.some((r) => r === "staff:service_manager" || r === "staff:executive")) return <WorkforceDenied />;
  if (q.isPending) return <SkeletonRows n={6} />;
  if (q.isError) return <PanelError what={c.title} onRetry={() => q.refetch()} />;
  const w = q.data;
  const admin = !!user && canAdmin(user.roles);
  const L = (s: string) => localHref(locale, s);
  return (
    <div className="grid gap-5">
      <PageHead
        back={<Link href={L("/ops/workforce")} className="mb-2 inline-flex items-center gap-1 text-small text-fg-muted hover:text-fg"><Icon name="arrowRight" size={14} className="rotate-180" aria-hidden />{c.title}</Link>}
        title={<span className="flex flex-wrap items-center gap-3">{w.name}<ProcPill state={w.status} machine="worker" /></span>}
        sub={`${w.role} · ${c.type[w.type]}${w.field ? ` · ${c.type.field}` : ""} · ${w.email}`}
        actions={admin && w.status !== "terminated" ? (
          <MenuButton label={c.actions.label} icon="menu" align="right">{(close) => (
            <div className="grid min-w-48 p-1">
              {w.status !== "suspended" && <button type="button" className="px-3 py-2 text-left text-small hover:bg-navy-50" onClick={() => { close(); setDialog("suspend"); }}>{c.actions.suspend}</button>}
              {w.status === "suspended" && <button type="button" className="px-3 py-2 text-left text-small hover:bg-navy-50" onClick={() => { close(); setDialog("reactivate"); }}>{c.actions.reactivate}</button>}
              <button type="button" className="px-3 py-2 text-left text-small hover:bg-navy-50" onClick={() => { close(); setUrlParams({ tab: "reviews", new: "1" }); }}>{c.actions.review}</button>
              <Link href={L(`/ops/workforce/${w.id}/offboard`)} className="px-3 py-2 text-small text-danger hover:bg-navy-50">{c.actions.terminate}</Link>
            </div>
          )}</MenuButton>
        ) : null} />
      {w.sessionsRevoked && <p role="status" className="flex items-center gap-2 bg-danger-bg px-4 py-3 text-small text-danger"><Icon name="lock" size={16} aria-hidden />{c.profile.sessionsRevoked}</p>}
      <Tabs value={tab} onChange={(t) => setUrlParams({ tab: t === "overview" ? null : t, new: null })} tabs={TABS.map((t) => ({
        id: t, label: c.tabs[t],
        content: t !== tab ? null : t === "overview" ? <Overview w={w} admin={admin} /> : t === "performance" ? <Performance w={w} />
          : t === "reviews" ? <Reviews w={w} admin={admin} /> : t === "history" ? <History id={w.id} /> : <Documents w={w} />,
      }))} />
      {dialog && <StatusDialog w={w} kind={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}

function Overview({ w, admin }: { w: WorkerFull; admin: boolean }) {
  const SERVICES = usePublicServices().data?.items ?? [];
  const c = useW();
  const { locale } = useI18n();
  const [shown, setShown] = useState<WorkerFull["privateFields"] | null>(null);
  const [ask, setAsk] = useState(false);
  const pf = shown ?? w.privateFields;
  const svc = (s: string) => SERVICES.find((x) => x.slug === s)?.name ?? s;
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <Panel title={c.profile.contract}>
        <dl className="grid grid-cols-2 gap-3 text-small">
          <div><dt className="text-eyebrow text-fg-subtle">{c.profile.contractEnd}</dt><dd>{w.contractEnd ? formatDate(w.contractEnd, locale) : "—"}</dd></div>
          <div><dt className="text-eyebrow text-fg-subtle">{c.profile.lastLogin}</dt><dd>{w.lastLoginAt ? formatRelative(w.lastLoginAt, locale) : c.profile.never}</dd></div>
          <div><dt className="text-eyebrow text-fg-subtle">{c.profile.languages}</dt><dd>{w.languages.join(", ").toUpperCase() || "—"}</dd></div>
          <div><dt className="text-eyebrow text-fg-subtle">{c.profile.districts}</dt><dd>{w.districts.join(", ") || "—"}</dd></div>
          <div className="col-span-2"><dt className="text-eyebrow text-fg-subtle">{c.profile.services}</dt><dd>{w.services.map(svc).join(", ") || "—"}</dd></div>
          <div className="col-span-2"><dt className="text-eyebrow text-fg-subtle">{c.profile.expertise}</dt><dd>{w.expertise.join(", ") || "—"}</dd></div>
          <div className="col-span-2"><dt className="text-eyebrow text-fg-subtle">{c.cols.load}</dt><dd className="flex items-center gap-2"><CapacityBar load={w.load.open} cap={w.load.cap} className="w-32" /><span className="tabular">{w.load.open}/{w.load.cap}</span></dd></div>
        </dl>
      </Panel>
      <WorkContacts w={w} admin={admin} />
      <Panel title={c.profile.private} action={admin && !shown ? <Button size="sm" variant="secondary" onClick={() => setAsk(true)}><Icon name="lock" size={14} aria-hidden />{c.profile.reveal}</Button> : null}>
        <dl className="grid gap-3 text-small">
          {(["address", "phone", "nationalId"] as const).map((k) => <div key={k}><dt className="text-eyebrow text-fg-subtle">{c.profile[k]}</dt><dd className="tabular">{pf[k]}</dd></div>)}
        </dl>
        {shown && <p className="mt-3 text-eyebrow text-fg-subtle">{c.profile.revealed}</p>}
      </Panel>
      <Panel title={c.profile.openCases} className="lg:col-span-2" action={<Link href={localHref(locale, `/ops/cases?assignee=${w.id}`)} className="text-small text-link underline underline-offset-4">{c.profile.cases}</Link>}>
        {w.openCases.length ? <ul className="grid gap-1 text-small">{w.openCases.map((x) => <li key={x.ref} className="flex justify-between gap-3"><span className="tabular font-medium">{x.ref}</span><span className="truncate text-fg-muted">{x.title} · {x.client}</span></li>)}</ul>
          : <p className="text-small text-fg-muted">{c.off.noCases}</p>}
      </Panel>
      {admin && <Blocks agentId={w.id} />}
      <ReasonDialog open={ask} onClose={() => setAsk(false)} title={c.profile.revealTitle} description={c.profile.revealReason} audited confirmLabel={c.profile.reveal}
        options={Object.entries({ payroll: "Payroll / contract query", safety: "Safety or emergency contact", investigation: c.status.reasons.investigation, other: c.status.reasons.other }).map(([value, label]) => ({ value, label }))}
        onConfirm={async (v) => { const r = await revealWorker(w.id, `${v.reason}${v.note ? `: ${v.note}` : ""}`); setShown(r.privateFields); setAsk(false); }} />
    </div>
  );
}

function Performance({ w }: { w: WorkerFull }) {
  const c = useW();
  const fmt = (k: WorkerFull["kpis"][number]) => (k.unit === "pct" ? `${k.value}%` : k.unit === "rating" ? k.value.toFixed(1) : String(k.value));
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {w.kpis.map((k) => <KpiTile key={k.key} label={c.kpi[k.key as keyof typeof c.kpi] ?? k.key} value={fmt(k)} tone={k.unit === "pct" && k.value < 80 ? "warning" : "neutral"} />)}
      {w.outcomes && (["completed90d", "firstPassPct", "reassignmentPct", "revenue90d"] as const).map((k) => {
        const v = w.outcomes![k];
        return <KpiTile key={k} label={c.kpi[k]} value={v == null ? "—" : k.endsWith("Pct") ? `${v}%` : v.toLocaleString()} tone="neutral" />;
      })}
      <Cv w={w} />
    </div>
  );
}

/** F-WRK-02: the worker's structured CV from onboarding. */
function Cv({ w }: { w: WorkerFull }) {
  const c = useW().cv;
  const cv = w.cv;
  const line = (x: unknown) => (typeof x === "string" ? x : Object.values((x ?? {}) as Record<string, unknown>).filter((v) => typeof v === "string" && v).join(" · "));
  const has = cv && (cv.education.length || cv.experience.length || cv.expertise.length || cv.bio);
  return (
    <section className="col-span-2 grid gap-2 border border-border bg-white p-4 lg:col-span-4">
      <h3 className="text-label">{c.title}</h3>
      {!has ? <p className="text-small text-fg-muted">{c.empty}</p> : (
        <dl className="grid gap-3 text-small sm:grid-cols-2">
          {cv!.bio && <div className="sm:col-span-2"><dt className="text-fg-subtle">{c.bio}</dt><dd>{cv!.bio}</dd></div>}
          {cv!.years && <div><dt className="text-fg-subtle">{c.years}</dt><dd>{cv!.years}</dd></div>}
          {!!cv!.expertise.length && <div><dt className="text-fg-subtle">{c.expertise}</dt><dd>{cv!.expertise.join(", ")}</dd></div>}
          {!!cv!.education.length && <div><dt className="text-fg-subtle">{c.education}</dt><dd><ul>{cv!.education.map((x, i) => <li key={i}>{line(x)}</li>)}</ul></dd></div>}
          {!!cv!.experience.length && <div><dt className="text-fg-subtle">{c.experience}</dt><dd><ul>{cv!.experience.map((x, i) => <li key={i}>{line(x)}</li>)}</ul></dd></div>}
        </dl>
      )}
    </section>
  );
}

function Reviews({ w, admin }: { w: WorkerFull; admin: boolean }) {
  const c = useW();
  const { locale } = useI18n();
  const p = useUrlParams();
  const q = useReviews(w.id);
  return (
    <div className="mt-4 grid gap-4">
      {admin && p.get("new") === "1" ? <ReviewForm w={w} onDone={() => setUrlParams({ new: null })} />
        : admin && <Button variant="secondary" className="w-fit" onClick={() => setUrlParams({ new: "1" })}><Icon name="plus" size={14} aria-hidden />{c.actions.review}</Button>}
      {q.isPending ? <SkeletonRows n={2} /> : q.isError ? <PanelError what={c.tabs.reviews} onRetry={() => q.refetch()} /> : !q.data.items.length ? <EmptyPanel title={c.review.none} compact /> : (
        <ul className="grid gap-2">
          {q.data.items.map((r) => (
            <li key={r.id} className="grid gap-1 border border-border bg-white p-4">
              <p className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{r.period}</span><StarRating value={r.rating} /></p>
              <p className="text-small">{r.comments}</p>
              {r.goals && <p className="text-small text-fg-muted">{c.review.goals}: {r.goals}</p>}
              <p className="text-eyebrow text-fg-subtle">{c.review.status[r.status]} · {fill(c.review.by, { name: r.by.name })} · {formatDate(r.at, locale)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// PLACEHOLDER(review-fields): spec only names "performance reviews" (D-13).
function ReviewForm({ w, onDone }: { w: WorkerFull; onDone: () => void }) {
  const c = useW();
  const { locale } = useI18n();
  const toast = useToast();
  const m = useSubmitReview(w.id);
  const [key] = useState(newIdempotencyKey);
  const year = new Date().getFullYear();
  const [period, setPeriod] = useState(`${year}-H2`);
  const [rating, setRating] = useState(0);
  const [goals, setGoals] = useState("");
  const [comments, setComments] = useState("");
  const [ack, setAck] = useState(true);
  const [err, setErr] = useState<Record<string, string>>({});
  async function submit() {
    const e: Record<string, string> = {};
    if (!rating) e.rating = c.review.needRating;
    if (!comments.trim()) e.comments = c.review.needComments;
    setErr(e);
    if (Object.keys(e).length) return;
    try { await m.mutateAsync({ period, rating, goals, comments, ackRequired: ack, idempotencyKey: key }); toast({ title: c.review.done, tone: "success" }); onDone(); }
    catch (x) { setErr({ form: errorCopy(x, locale) }); }
  }
  return (
    <form className="grid gap-4 border border-border bg-white p-4 m-rise" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <h2 className="text-card-title">{c.review.title}</h2>
      {err.form && <p role="alert" className="bg-danger-bg px-3 py-2 text-small text-danger">{err.form}</p>}
      <Field label={c.review.period}>{(a) => <Input id={a.id} value={period} onChange={(e) => setPeriod(e.target.value)} />}</Field>
      <div className="grid gap-1"><p className="text-label">{c.review.kpis}</p>
        <p className="text-small text-fg-muted">{c.kpi.onTime}: {w.onTimePct ?? "—"}% · {c.kpi.rating}: {w.rating?.toFixed(1) ?? "—"} · {c.kpi.open}: {w.load.open}</p></div>
      <fieldset className="grid gap-1"><legend className="text-label">{c.review.rating}</legend>
        {err.rating && <p className="text-small font-medium text-danger">{err.rating}</p>}
        <div className="flex gap-1" role="radiogroup" aria-label={c.review.rating}>
          {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n}`} onClick={() => setRating(n)}
            className={cx("flex size-10 items-center justify-center border text-body m-press", n <= rating ? "border-navy-700 bg-gold-400 text-on-gold" : "border-border bg-white")}>{n}</button>)}
        </div>
      </fieldset>
      <Field label={c.review.goals}>{(a) => <Textarea id={a.id} rows={2} maxLength={1000} value={goals} onChange={(e) => setGoals(e.target.value)} />}</Field>
      <Field label={c.review.comments} error={err.comments}>{(a) => <Textarea id={a.id} aria-invalid={a.invalid} aria-describedby={a.describedBy} rows={3} maxLength={2000} value={comments} onChange={(e) => setComments(e.target.value)} />}</Field>
      <Checkbox label={c.review.ack} checked={ack} onChange={(e) => setAck(e.target.checked)} />
      <div className="flex gap-2"><Button type="submit" loading={m.isPending} dots>{c.review.submit}</Button><Button type="button" variant="secondary" onClick={onDone}>×</Button></div>
    </form>
  );
}

function History({ id }: { id: string }) {
  const c = useW();
  const { locale } = useI18n();
  const q = useHistory(id);
  if (q.isPending) return <div className="mt-4"><SkeletonRows n={3} /></div>;
  if (q.isError) return <PanelError what={c.tabs.history} onRetry={() => q.refetch()} />;
  if (!q.data.items.length) return <div className="mt-4"><EmptyPanel title={c.profile.noHistory} compact /></div>;
  return (
    <ol className="mt-4 grid gap-2 m-stagger">
      {q.data.items.map((e, i) => (
        <li key={e.id} style={{ ["--i" as string]: i }} className="flex flex-wrap items-center justify-between gap-2 border border-border bg-white px-4 py-3 text-small">
          <span>{e.text}{e.actor ? <span className="text-fg-subtle"> · {e.actor}</span> : null}</span>
          <time className="text-eyebrow text-fg-subtle tabular" dateTime={e.at}>{formatDateTime(e.at, locale)}</time>
        </li>
      ))}
    </ol>
  );
}

function Documents({ w }: { w: WorkerFull }) {
  const c = useW();
  const { locale } = useI18n();
  const docs = [...w.documents.map((d) => ({ name: d.name, exp: d.expiresOn })), ...w.certifications.map((x) => ({ name: x.name, exp: x.expiresOn }))];
  return (
    <div className="mt-4 grid gap-4">
      {w.type === "external" && <Contracts w={w} />}
      {!docs.length ? <EmptyPanel title={c.profile.noDocs} compact /> : (
        <ul className="grid gap-2">
          {docs.map((d) => <li key={d.name} className="flex items-center justify-between gap-2 border border-border bg-white px-4 py-3 text-small"><span className="flex items-center gap-2"><Icon name="file" size={16} aria-hidden />{d.name}</span>{d.exp && <span className="text-eyebrow text-fg-subtle">{formatDate(d.exp, locale)}</span>}</li>)}
        </ul>
      )}
    </div>
  );
}

/** F-WRK-01: work contacts + professional links (separate from the private shield). */
function WorkContacts({ w, admin }: { w: WorkerFull; admin: boolean }) {
  const c = useW().work;
  const qc = useQueryClient();
  const toast = useToast();
  const wc = w.workContacts ?? { email: "", phone: "", links: {} };
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ email: wc.email, phone: wc.phone, linkedin: wc.links.linkedin ?? "", website: wc.links.website ?? "" });
  const m = useMutation({
    mutationFn: () => unwrap(api.POST("/api/staff/workers/{id}/work-contacts", { params: { path: { id: w.id } }, body: {
      email: f.email.trim() || undefined, phone: f.phone.trim() || undefined,
      links: Object.fromEntries(Object.entries({ linkedin: f.linkedin.trim(), website: f.website.trim() }).filter(([, v]) => v)),
    } })),
    onSuccess: () => { toast({ tone: "success", title: c.saved }); setEdit(false); void qc.invalidateQueries({ queryKey: ["workforce"] }); },
    onError: (e) => toast({ tone: "danger", title: e instanceof Error ? e.message : String(e) }),
  });
  return (
    <Panel title={c.title} action={admin && !edit ? <Button size="sm" variant="secondary" onClick={() => setEdit(true)}>{c.edit}</Button> : null}>
      {!edit ? (
        <dl className="grid gap-3 text-small">
          <div><dt className="text-eyebrow text-fg-subtle">{c.email}</dt><dd>{wc.email || "—"}</dd></div>
          <div><dt className="text-eyebrow text-fg-subtle">{c.phone}</dt><dd className="tabular">{wc.phone || "—"}</dd></div>
          {Object.entries(wc.links).map(([k, v]) => <div key={k}><dt className="text-eyebrow text-fg-subtle">{c.links[k] ?? k}</dt><dd><a className="underline" href={v} rel="noopener noreferrer" target="_blank">{v}</a></dd></div>)}
        </dl>
      ) : (
        <div className="grid gap-3">
          <Field label={c.email}>{(a) => <Input id={a.id} aria-describedby={a.describedBy} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}</Field>
          <Field label={c.phone}>{(a) => <Input id={a.id} aria-describedby={a.describedBy} type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />}</Field>
          <Field label={c.links.linkedin}>{(a) => <Input id={a.id} aria-describedby={a.describedBy} type="url" value={f.linkedin} onChange={(e) => setF({ ...f, linkedin: e.target.value })} />}</Field>
          <Field label={c.links.website}>{(a) => <Input id={a.id} aria-describedby={a.describedBy} type="url" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />}</Field>
          <div className="flex gap-2"><Button size="sm" loading={m.isPending} onClick={() => m.mutate()}>{c.save}</Button><Button size="sm" variant="ghost" onClick={() => setEdit(false)}>{c.cancel}</Button></div>
        </div>
      )}
    </Panel>
  );
}

/** F-WRK-04: contract versions of an external worker + issue a new one for signature. */
function Contracts({ w }: { w: WorkerFull }) {
  const c = useW().contracts;
  const { locale } = useI18n();
  const toast = useToast();
  const m = useIssueContract(w.id);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(newIdempotencyKey);
  const [f, setF] = useState({ kind: "service_agreement" as "service_agreement" | "sla" | "nda" | "licence", start: new Date().toISOString().slice(0, 10), end: "", notice: "30" });
  const notice = Number(f.notice);
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(f.start) && (!f.end || f.end > f.start) && Number.isInteger(notice) && notice >= 0;
  const save = () => m.mutate({ kind: f.kind, start: f.start, end: f.end || null, noticeDays: notice, idempotencyKey: key }, {
    onSuccess: () => { toast({ tone: "success", title: c.sent }); setOpen(false); setKey(newIdempotencyKey()); },
    onError: (e) => toast({ tone: "danger", title: e instanceof Error ? e.message : String(e) }),
  });
  return (
    <section className="grid gap-2 border border-border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-label">{c.title}</h3>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>{c.issue}</Button>
      </div>
      {!w.contracts?.length ? <p className="text-small text-fg-muted">{c.none}</p> : (
        <ul className="grid gap-1 text-small">
          {w.contracts.map((d) => (
            <li key={d.id} className="flex flex-wrap justify-between gap-2">
              <span>{d.title} v{d.version}</span>
              <span className="text-fg-subtle tabular">{c.status[d.status] ?? d.status} · {formatDate(d.start, locale)}{d.end ? ` – ${formatDate(d.end, locale)}` : ""}</span>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title={c.issue} footer={<Button disabled={!ok} loading={m.isPending} onClick={save}>{c.save}</Button>}>
        <div className="grid gap-3">
          <Field label={c.kind}>{(a) => (
            <Select id={a.id} aria-describedby={a.describedBy} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as typeof f.kind })}>
              {Object.entries(c.kinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          )}</Field>
          <Field label={c.start}>{(a) => <DateInput id={a.id} aria-describedby={a.describedBy} value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />}</Field>
          <Field label={c.end}>{(a) => <DateInput id={a.id} aria-describedby={a.describedBy} value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} />}</Field>
          <Field label={c.notice}>{(a) => <Input id={a.id} aria-describedby={a.describedBy} type="number" min={0} max={365} inputMode="numeric" value={f.notice} onChange={(e) => setF({ ...f, notice: e.target.value })} />}</Field>
        </div>
      </Dialog>
    </section>
  );
}

function StatusDialog({ w, kind, onClose }: { w: WorkerFull; kind: "suspend" | "reactivate"; onClose: () => void }) {
  const c = useW();
  const toast = useToast();
  const m = useWorkerStatus(w.id);
  const [key] = useState(newIdempotencyKey);
  const [reclear, setReclear] = useState(false);
  const r = c.status.reasons;
  const opts = kind === "suspend" ? ["performance", "conduct", "investigation", "leave", "other"] : ["resolved", "leave", "other"];
  return (
    <ReasonDialog open onClose={onClose} audited destructive={kind === "suspend"}
      title={fill(kind === "suspend" ? c.status.suspendTitle : c.status.reactivateTitle, { name: w.name })}
      description={kind === "suspend" ? c.status.suspendBody : c.status.reactivateBody}
      options={opts.map((v) => ({ value: v, label: r[v as keyof typeof r] }))}
      extra={kind === "reactivate" ? <Checkbox label={c.status.reclear} checked={reclear} onChange={(e) => setReclear(e.target.checked)} /> : undefined}
      confirmLabel={kind === "suspend" ? c.actions.suspend : c.actions.reactivate}
      onConfirm={async (v) => {
        const to = kind === "suspend" ? "suspended" : reclear ? "onboarding" : "cleared";
        await m.mutateAsync({ to, reason: `${v.reason}${v.note ? `: ${v.note}` : ""}`, idempotencyKey: key });
        toast({ title: fill(c.status.done, { name: w.name, status: to }), tone: "success" });
        onClose();
      }} />
  );
}

/** ASN-09: "never assign" restrictions for this worker (feeds ranking + manual assign eligibility). */
function Blocks({ agentId }: { agentId: string }) {
  const c = useW().blocks;
  const qc = useQueryClient();
  const toast = useToast();
  const [client, setClient] = useState("");
  const [reason, setReason] = useState("");
  const key = ["ops", "blocks", agentId];
  const q = useQuery({
    queryKey: key,
    queryFn: () => unwrap<{ blocks: { id: string; clientName: string; reason: string }[] }>(api.GET("/api/admin/ops/assignment-blocks", { params: { query: { agentId } } })),
  });
  const add = useMutation({
    mutationFn: () => unwrap(api.POST("/api/admin/ops/assignment-blocks", { body: { agentId, clientId: client.trim(), reason: reason.trim() } })),
    onSuccess: () => { toast({ title: c.added, tone: "success" }); setClient(""); setReason(""); void qc.invalidateQueries({ queryKey: key }); },
    onError: () => toast({ title: c.failed, tone: "danger" }),
  });
  const del = useMutation({
    mutationFn: (id: string) => unwrap(api.DELETE("/api/admin/ops/assignment-blocks/{id}", { params: { path: { id } } })),
    onSuccess: () => { toast({ title: c.removed, tone: "success" }); void qc.invalidateQueries({ queryKey: key }); },
    onError: () => toast({ title: c.failed, tone: "danger" }),
  });
  return (
    <Panel title={c.title} className="lg:col-span-2">
      <p className="mb-3 text-small text-fg-muted">{c.lede}</p>
      {q.isPending ? <SkeletonRows n={2} /> : q.isError ? <PanelError what={c.title} onRetry={() => q.refetch()} /> : q.data.blocks.length ? (
        <ul className="mb-4 divide-y divide-border text-small">
          {q.data.blocks.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="flex-1 basis-48"><span className="font-medium">{b.clientName}</span> · {b.reason}</span>
              <Button size="sm" variant="ghost" loading={del.isPending && del.variables === b.id} onClick={() => del.mutate(b.id)}>{c.remove}</Button>
            </li>
          ))}
        </ul>
      ) : <p className="mb-4 text-small text-fg-muted">{c.none}</p>}
      <form className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); if (client.trim() && reason.trim().length >= 3) add.mutate(); }}>
        <Field label={c.client}>{({ id }) => <Input id={id} value={client} onChange={(e) => setClient(e.target.value)} className="font-mono" />}</Field>
        <Field label={c.reason}>{({ id }) => <Input id={id} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />}</Field>
        <Button type="submit" loading={add.isPending} disabled={!client.trim() || reason.trim().length < 3}>{c.add}</Button>
      </form>
    </Panel>
  );
}
