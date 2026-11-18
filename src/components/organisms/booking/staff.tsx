"use client";
// Adviser + SM consultation surfaces (plan 11 §7.8–7.9, boards 03 BA1/BA3/BA4/PBA1).
// AdviserSessions: bookings layer above the existing calendar + availability drawer (?panel=availability).
// ConsultationRoom: one organism for adviser (/agent/bookings/[id]) and SM (/ops/bookings/[id]).
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx, formatMoney } from "@/shared/format";
import { errorCopy } from "@/lib/api/error-copy";
import { api } from "@/lib/api/client";
import { BkgError, bk, idem, useAdviserBookings, useAvailability, useRoom, type RoomData } from "@/lib/booking/api";
import { addDays, dayOf, formatDay, formatTime } from "@/shared/booking/rules";
import { quoteTotals } from "@/shared/ops/quotation";
import type { Availability, AvailabilityOverride, AvailabilityRule, StaffBooking } from "@/shared/booking/types";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Dialog, Sheet } from "@/components/atoms/dialog";
import { Checkbox, Field, Input, Radio, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { Tabs } from "@/components/atoms/tabs";
import { useToast } from "@/components/atoms/toast";
import {
  AiLabel, BkgStatus, IllusNoSlots, JoinButton, ModeIcon, ModeTag, OfflineBanner, SkeletonList, StatePanel, fill, useBkg, useClock, useOnline,
} from "@/components/atoms/booking";

export type ServiceRef = { slug: string; name: string; fromFee: number | null };

// ---------------------------------------------------------------- Adviser: sessions strip + availability
export function AdviserSessions() {
  const { c, locale } = useBkg();
  const p = useUrlParams();
  const [today] = useState(() => dayOf(Date.now()));
  const q = useAdviserBookings(today, addDays(today, 13));
  const live = (q.data ?? []).filter((b) => ["confirmed", "pending_payment"].includes(b.status));
  const todays = live.filter((b) => dayOf(b.startsAt) === today);
  const later = live.filter((b) => dayOf(b.startsAt) !== today);
  return (
    <section aria-labelledby="adv-sessions" className="grid gap-4 border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="adv-sessions" className="text-h4">{c.adviser.title}</h2>
          <p className="text-small text-fg-muted">{c.adviser.lead}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setUrlParams({ panel: "availability" })}><Icon name="clock" size={16} aria-hidden />{c.adviser.availability}</Button>
      </div>
      {q.isPending ? <SkeletonList n={2} h="h-16" /> : q.isError ? (
        <StatePanel tone="danger" title={errorCopy(q.error, locale)}><Button variant="outline" size="sm" onClick={() => q.refetch()}>{c.common.retry}</Button></StatePanel>
      ) : !live.length ? <p className="bg-bg-subtle p-4 text-small text-fg-muted">{c.adviser.none}</p> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <SessionGroup title={c.adviser.today} items={todays} />
          <SessionGroup title={c.adviser.week} items={later} />
        </div>
      )}
      {p.get("panel") === "availability" && <AvailabilityEditor onClose={() => setUrlParams({ panel: null })} />}
    </section>
  );
}

function SessionGroup({ title, items }: { title: string; items: StaffBooking[] }) {
  const { c, locale } = useBkg();
  return (
    <div>
      <h3 className="mb-2 text-eyebrow uppercase tracking-wide text-fg-subtle">{title} <span className="tabular-nums">· {items.length}</span></h3>
      {!items.length ? <p className="text-small text-fg-muted">{c.adviser.none}</p> : (
        <ul className="grid gap-2 m-stagger">
          {items.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 border border-border p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-bg-tint"><ModeIcon mode={b.mode} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-small font-medium">{b.contact.name}</span>
                <span className="block text-eyebrow text-fg-subtle tabular-nums">{formatDay(b.startsAt, locale)} · {formatTime(b.startsAt, locale)} · {b.typeName[locale]}</span>
              </span>
              {b.mode === "video" && b.can.join !== "ended" && <JoinButton size="sm" state={b.can.join} startsAt={b.startsAt} fetchUrl={() => bk<{ url: string }>(api.GET("/api/agent/bookings/{id}/join", { params: { path: { id: b.id } } }))} />}
              <ButtonLink size="sm" variant="outline" href={localHref(locale, `/agent/bookings/${b.id}`)}>{c.adviser.openRoom}</ButtonLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AvailabilityEditor({ onClose }: { onClose: () => void }) {
  const { c, locale } = useBkg();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useAvailability();
  const [draft, setDraft] = useState<Availability | null>(null);
  const [busy, setBusy] = useState(false);
  const [warn, setWarn] = useState<StaffBooking[] | null>(null);
  const [ov, setOv] = useState<Omit<AvailabilityOverride, "id"> | null>(null);
  const a = draft ?? q.data ?? null;
  const setRules = (rules: AvailabilityRule[]) => a && setDraft({ ...a, rules });
  async function save() {
    if (!a) return;
    const bad = a.rules.some((r) => r.start >= r.end);
    if (bad) { toast({ title: `${c.adviser.from} < ${c.adviser.to}`, tone: "danger" }); return; }
    setBusy(true);
    try {
      const r = await bk<Availability & { warnings: StaffBooking[] }>(api.PUT("/api/agent/availability", { body: { rules: a.rules, overrides: a.overrides, version: a.version }, headers: idem() }));
      setDraft(r); qc.invalidateQueries({ queryKey: ["bkg"] });
      if (r.warnings.length) setWarn(r.warnings); else { toast({ title: c.common.saved, tone: "success" }); onClose(); }
    } catch (e) {
      if (e instanceof BkgError && e.errorType === "version_conflict") { setDraft(null); q.refetch(); }
      toast({ title: errorCopy(e, locale), tone: "danger" });
    } finally { setBusy(false); }
  }
  return (
    <Sheet open onClose={onClose} title={c.adviser.availability}
      footer={<><Button variant="ghost" onClick={onClose}>{c.common.close}</Button><Button loading={busy} disabled={!a} onClick={save}>{c.adviser.saveHours}</Button></>}>
      {!a ? <SkeletonList n={5} h="h-12" /> : (
        <div className="grid gap-6">
          <section>
            <h3 className="mb-3 text-label">{c.adviser.hours}</h3>
            <ul className="grid gap-2">
              {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
                const ranges = a.rules.map((r, i) => ({ r, i })).filter((x) => x.r.weekday === wd);
                return (
                  <li key={wd} className="grid grid-cols-[3rem_1fr] items-start gap-3 border-b border-border pb-2">
                    <span className="pt-2 text-small font-medium">{c.adviser.weekdays[wd]}</span>
                    <div className="grid gap-2">
                      {!ranges.length && <span className="pt-2 text-small text-fg-subtle">{c.adviser.unavailable}</span>}
                      {ranges.map(({ r, i }) => (
                        <div key={i} className="flex flex-wrap items-center gap-2">
                          <Input type="time" step={900} aria-label={`${c.adviser.weekdays[wd]} ${c.adviser.from}`} className="h-9 w-28" value={r.start} onChange={(e) => setRules(a.rules.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />
                          <span aria-hidden>–</span>
                          <Input type="time" step={900} aria-label={`${c.adviser.weekdays[wd]} ${c.adviser.to}`} className="h-9 w-28" value={r.end} onChange={(e) => setRules(a.rules.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} />
                          <Button size="sm" variant="ghost" aria-label={`${c.common.cancel} ${r.start}–${r.end}`} onClick={() => setRules(a.rules.filter((_, j) => j !== i))}><Icon name="x" size={14} aria-hidden /></Button>
                        </div>
                      ))}
                      <button type="button" className="w-fit text-small text-link underline underline-offset-4" onClick={() => setRules([...a.rules, { weekday: wd, start: "08:00", end: "12:00" }])}>{c.adviser.addRange}</button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-eyebrow text-fg-subtle">{c.adviser.buffer}</p>
          </section>
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-label">{c.adviser.overrides}</h3>
              <Button size="sm" variant="secondary" onClick={() => setOv({ date: addDays(dayOf(Date.now()), 1), kind: "blocked" })}><Icon name="plus" size={14} aria-hidden />{c.adviser.addOverride}</Button>
            </div>
            {!a.overrides.length ? <p className="text-small text-fg-muted">—</p> : (
              <ul className="grid gap-2">
                {a.overrides.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 bg-bg-subtle px-3 py-2 text-small">
                    <span className={cx("px-2 py-0.5 text-eyebrow", o.kind === "blocked" ? "bg-danger-bg text-danger" : "bg-success-bg text-success")}>{o.kind === "blocked" ? c.adviser.blocked : c.adviser.extra}</span>
                    <span className="flex-1 tabular-nums">{formatDay(`${o.date}T10:00:00Z`, locale)}{o.start ? ` · ${o.start}–${o.end}` : ` · ${c.adviser.wholeDay}`}{o.note && ` · ${o.note}`}</span>
                    <Button size="sm" variant="ghost" aria-label={c.common.cancel} onClick={() => setDraft({ ...a, overrides: a.overrides.filter((x) => x.id !== o.id) })}><Icon name="x" size={14} aria-hidden /></Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {a.leave.length > 0 && (
            <section>
              <h3 className="mb-2 text-label">{c.adviser.leave}</h3>
              <ul className="grid gap-1 text-small text-fg-muted">{a.leave.map((l) => <li key={l.from}>{l.label} · {formatDay(`${l.from}T10:00:00Z`, locale)} – {formatDay(`${l.to}T10:00:00Z`, locale)}</li>)}</ul>
            </section>
          )}
          <div className="flex items-center justify-between border border-dashed border-border p-3 text-small">
            <span className="inline-flex items-center gap-2"><Icon name="calendar" size={16} aria-hidden />{c.time.calendarSync}</span>
            <span className="text-fg-subtle">{c.time.calendarSyncSoon}</span>{/* shortcut: F-BKG-10 sync is P3, enable when Google OAuth exists */}
          </div>
        </div>
      )}
      <Dialog open={!!ov} onClose={() => setOv(null)} title={c.adviser.addOverride}
        footer={<><Button variant="ghost" onClick={() => setOv(null)}>{c.common.cancel}</Button><Button onClick={() => { if (a && ov) setDraft({ ...a, overrides: [...a.overrides, { ...ov, id: `ov-${Date.now()}` }] }); setOv(null); }}>{c.common.save}</Button></>}>
        {ov && (
          <div className="grid gap-4">
            <Field label={c.adviser.date}>{(p) => <Input id={p.id} type="date" value={ov.date} onChange={(e) => setOv({ ...ov, date: e.target.value })} />}</Field>
            <fieldset className="flex flex-wrap gap-4">
              <Radio name="ovk" label={c.adviser.blocked} checked={ov.kind === "blocked"} onChange={() => setOv({ ...ov, kind: "blocked" })} />
              <Radio name="ovk" label={c.adviser.extra} checked={ov.kind === "extra"} onChange={() => setOv({ ...ov, kind: "extra", start: ov.start ?? "17:00", end: ov.end ?? "19:00" })} />
            </fieldset>
            <Checkbox label={c.adviser.wholeDay} checked={!ov.start} disabled={ov.kind === "extra"} onChange={(e) => setOv({ ...ov, start: e.target.checked ? undefined : "08:00", end: e.target.checked ? undefined : "12:00" })} />
            {ov.start && (
              <div className="flex gap-3">
                <Field label={c.adviser.from}>{(p) => <Input id={p.id} type="time" step={900} value={ov.start} onChange={(e) => setOv({ ...ov, start: e.target.value })} />}</Field>
                <Field label={c.adviser.to}>{(p) => <Input id={p.id} type="time" step={900} value={ov.end} onChange={(e) => setOv({ ...ov, end: e.target.value })} />}</Field>
              </div>
            )}
            <Field label={c.adviser.note} optional={c.common.optional}>{(p) => <Input id={p.id} value={ov.note ?? ""} onChange={(e) => setOv({ ...ov, note: e.target.value })} />}</Field>
          </div>
        )}
      </Dialog>
      <Dialog open={!!warn} onClose={() => { setWarn(null); onClose(); }} title={c.common.saved}
        footer={<Button onClick={() => { setWarn(null); onClose(); }}>{c.common.close}</Button>}>
        <p className="mb-3 text-small">{c.adviser.conflict}</p>
        <ul className="grid gap-1 text-small">{warn?.map((b) => <li key={b.id} className="tabular-nums"><span className="font-mono">{b.reference}</span> · {formatDay(b.startsAt, locale)} {formatTime(b.startsAt, locale)} · {b.contact.name}</li>)}</ul>
      </Dialog>
    </Sheet>
  );
}

// ---------------------------------------------------------------- Consultation room (BA3, BA4)
export function ConsultationRoom({ id, staff, services }: { id: string; staff: boolean; services: ServiceRef[] }) {
  const { c, locale } = useBkg();
  const q = useRoom(id, staff);
  const p = useUrlParams();
  const tab = p.get("tab") ?? "notes";
  if (q.isPending) return <SkeletonList n={4} h="h-24" />;
  if (q.isError || !q.data) return (
    <StatePanel art={<IllusNoSlots />} title={c.room.notAssigned}>
      <ButtonLink variant="outline" href={localHref(locale, staff ? "/ops/bookings" : "/agent/calendar")}>{c.common.back}</ButtonLink>
    </StatePanel>
  );
  const b = q.data;
  return (
    <div className="grid gap-5">
      <Link href={localHref(locale, staff ? "/ops/bookings" : "/agent/calendar")} className="inline-flex w-fit items-center gap-1 text-small text-fg-muted hover:text-fg"><Icon name="arrowRight" size={14} className="rotate-180" aria-hidden />{staff ? c.ops.title : c.adviser.title}</Link>
      <OfflineBanner />
      <div className="grid gap-5 lg:grid-cols-[22rem_1fr] lg:items-start">
        <aside className="grid gap-4 border border-border bg-surface p-5 lg:sticky lg:top-24">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-eyebrow uppercase tracking-wide text-fg-subtle">{b.clientId ? c.room.client : c.room.lead}</p>
              <h1 className="truncate text-h4">{b.contactFull.name}</h1>
              <p className="text-small text-fg-muted">{[b.contactFull.phone, b.contactFull.email].filter(Boolean).join("· ")}</p>
            </div>
            <BkgStatus status={b.status} />
          </div>
          <dl className="grid gap-2 text-small">
            <div className="flex justify-between gap-2"><dt className="text-fg-subtle">{c.room.when}</dt><dd className="tabular-nums">{formatDay(b.startsAt, locale)} · {formatTime(b.startsAt, locale)}–{formatTime(b.endsAt, locale)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-fg-subtle">{c.ops.type}</dt><dd>{b.typeName[locale]}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-fg-subtle">{c.ops.ref}</dt><dd className="font-mono">{b.reference}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-fg-subtle">{c.ops.source}</dt><dd>{b.source}</dd></div>
          </dl>
          <div className="flex flex-wrap items-center gap-2"><ModeTag mode={b.mode} />{b.mode === "video" && <JoinButton size="sm" state={b.can.join} startsAt={b.startsAt} fetchUrl={() => bk<{ url: string }>(api.GET("/api/agent/bookings/{id}/join", { params: { path: { id: b.id } } }))} />}</div>
          <div>
            <h2 className="mb-2 text-label">{c.room.intake}</h2>
            {Object.keys(b.intakeAnswers).length ? (
              <dl className="grid gap-2 text-small">{Object.entries(b.intakeAnswers).map(([k, v]) => <div key={k}><dt className="text-fg-subtle">{k}</dt><dd className="whitespace-pre-line">{String(v)}</dd></div>)}</dl>
            ) : <p className="text-small text-fg-muted">{c.room.none}</p>}
          </div>
          <div>
            <h2 className="mb-2 text-label">{c.room.previous}</h2>
            {b.previous.length ? <ul className="grid gap-1 text-small">{b.previous.map((x) => <li key={x.reference} className="flex justify-between gap-2"><span className="font-mono">{x.reference}</span><span className="tabular-nums text-fg-muted">{formatDay(x.startsAt, locale)} · {c.status[x.status]}</span></li>)}</ul>
              : <p className="text-small text-fg-muted">{c.room.none}</p>}
          </div>
        </aside>
        <section className="border border-border bg-surface p-5 sm:p-6">
          <Tabs value={tab} onChange={(t) => setUrlParams({ tab: t })} tabs={[
            { id: "notes", label: c.room.notes, content: <NotesPanel b={b} staff={staff} /> },
            { id: "actions", label: c.room.actions, content: <ActionsPanel b={b} staff={staff} services={services} /> },
            { id: "history", label: c.room.history, content: (
              <ol className="grid gap-3">{b.history.length ? b.history.map((h, i) => (
                <li key={i} className="grid gap-0.5 border-b border-border pb-2 text-small last:border-0">
                  <span className="font-medium">{h.action}</span>
                  <span className="text-eyebrow text-fg-subtle tabular-nums">{h.actor} · {formatDay(h.at, locale)} {formatTime(h.at, locale)}{h.reason && ` · ${h.reason}`}</span>
                </li>
              )) : b.events.map((e, i) => <li key={i} className="text-small">{e.kind} · <span className="tabular-nums text-fg-muted">{formatDay(e.at, locale)} {formatTime(e.at, locale)}</span></li>)}</ol>
            ) },
          ]} />
        </section>
      </div>
    </div>
  );
}

function NotesPanel({ b, staff }: { b: RoomData; staff: boolean }) {
  const { c, locale } = useBkg();
  const toast = useToast();
  const [notes, setNotes] = useState(b.outcomeNotes ?? "");
  const [summary, setSummary] = useState(b.clientSummary ?? "");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const version = useRef(b.version);
  const dirty = useRef(false);
  const online = useOnline();
  const [ai, setAi] = useState<{ text: string } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  // Autosave every 5 s while dirty (plan §7.9). Staff (SM) rooms read notes but save through the adviser endpoint only when assigned.
  useEffect(() => {
    if (staff) return;
    const t = setInterval(async () => {
      if (!dirty.current || !navigator.onLine) return;
      dirty.current = false;
      try {
        const r = await bk<{ version: number; savedAt: string }>(api.PATCH("/api/agent/bookings/{id}/notes", { params: { path: { id: b.id } }, body: { outcome_notes: notes, client_summary: summary, version: version.current }, headers: idem() }));
        version.current = r.version; setSavedAt(r.savedAt);
      } catch (e) { dirty.current = true; if (e instanceof BkgError && e.errorType === "version_conflict") toast({ title: c.manage.changedByStaff, tone: "danger" }); }
    }, 5000);
    return () => clearInterval(t);
  }, [b.id, notes, summary, staff, toast, c.manage.changedByStaff]);
  return (
    <div className="grid gap-5">
      <Field label={c.room.internal} hint={c.room.internalHint}>
        {(p) => <Textarea id={p.id} aria-describedby={p.describedBy} rows={8} readOnly={staff} value={notes} onChange={(e) => { setNotes(e.target.value); dirty.current = true; }} />}
      </Field>
      <Field label={c.room.summary} hint={c.room.summaryHint}>
        {(p) => <Textarea id={p.id} aria-describedby={p.describedBy} rows={4} readOnly={staff} value={summary} onChange={(e) => { setSummary(e.target.value); dirty.current = true; }} />}
      </Field>
      <p className="text-eyebrow text-fg-subtle" aria-live="polite">{savedAt ? fill(c.room.autosaved, { time: formatTime(savedAt, locale) }) : !online ? c.common.offline : ""}</p>
      {notes.trim().length > 20 && (
        <div className="grid gap-3 bg-bg-tint p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-label">{c.room.aiSummary}</span>
            <Button size="sm" variant="secondary" loading={aiBusy} onClick={async () => {
              setAiBusy(true);
              try { setAi(await bk<{ text: string }>(api.POST("/api/assistant/copilot/{kind}", { params: { path: { kind: "summary" } }, body: { booking_id: b.id, text: notes, lang: locale }, headers: idem() }))); }
              catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); } finally { setAiBusy(false); }
            }}><Icon name="sparkle" size={14} aria-hidden />{c.room.aiGenerate}</Button>
          </div>
          {ai && <><AiLabel /><p className="whitespace-pre-line text-small">{ai.text}</p>{!staff && <Button size="sm" variant="ghost" className="w-fit" onClick={() => { setSummary(ai.text); dirty.current = true; }}>{c.staff.insert}</Button>}</>}
        </div>
      )}
    </div>
  );
}

function ActionsPanel({ b, staff, services }: { b: RoomData; staff: boolean; services: ServiceRef[] }) {
  const { c, locale } = useBkg();
  const toast = useToast();
  const qc = useQueryClient();
  const now = useClock();
  const started = now >= Date.parse(b.startsAt);
  const done = b.status === "completed" || b.status === "no_show";
  const [status, setStatus] = useState<"completed" | "no_show" | "">(done ? (b.status as "completed" | "no_show") : "");
  const [picked, setPicked] = useState<string[]>(b.recommendedServiceSlugs);
  const [links, setLinks] = useState(true);
  const [confirmNs, setConfirmNs] = useState(false);
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState(false);
  const [key] = useState(() => crypto.randomUUID());
  async function save() {
    setBusy(true);
    try {
      if (!status) return;
      await bk(api.PATCH("/api/agent/bookings/{id}/outcome", { params: { path: { id: b.id } }, body: { status, recommended_service_ids: picked, send_start_links: status === "completed" && links && picked.length > 0, version: b.version }, headers: idem(key) }));
      toast({ title: status === "completed" && links && picked.length ? c.room.linksSent : c.common.saved, tone: "success" });
      qc.invalidateQueries({ queryKey: ["bkg"] });
    } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); } finally { setBusy(false); setConfirmNs(false); }
  }
  return (
    <div className="grid gap-6">
      <fieldset className="grid gap-2" disabled={!started || done || staff}>
        <legend className="mb-1 text-label">{c.room.outcome}</legend>
        {!started && <p className="text-small text-fg-muted">{fill(c.room.tooEarly, { time: formatTime(b.startsAt, locale) })}</p>}
        <div className="flex flex-wrap gap-4">
          <Radio name="outcome" label={c.room.attended} checked={status === "completed"} onChange={() => setStatus("completed")} />
          <Radio name="outcome" label={c.room.noShow} checked={status === "no_show"} onChange={() => setStatus("no_show")} />
        </div>
      </fieldset>
      {status === "completed" && (
        <fieldset className="grid gap-2" disabled={done || staff}>
          <legend className="mb-1 text-label">{c.room.recommend}</legend>
          <div className="grid max-h-64 gap-1 overflow-y-auto border border-border p-3 sm:grid-cols-2">
            {services.map((s) => <Checkbox key={s.slug} label={s.name} checked={picked.includes(s.slug)} onChange={(e) => setPicked(e.target.checked ? [...picked, s.slug] : picked.filter((x) => x !== s.slug))} />)}
          </div>
          <Checkbox label={c.room.sendLinks} checked={links} onChange={(e) => setLinks(e.target.checked)} />
        </fieldset>
      )}
      {!done && !staff && (
        <Button className="w-fit" disabled={!status || !started} loading={busy} onClick={() => (status === "no_show" ? setConfirmNs(true) : save())}>{c.room.saveOutcome}</Button>
      )}
      {done && b.startLinks.length > 0 && <p className="bg-success-bg p-3 text-small text-success">{c.room.linksSent}</p>}
      <div className="border-t border-border pt-5">
        {b.quoteRef ? <p className="bg-success-bg p-3 text-small text-success">{fill(c.room.quoteSent, { ref: b.quoteRef, booking: b.reference })}</p>
          : b.quoteRequest?.status === "waiting" && !staff ? <p className="bg-info-bg p-3 text-small text-info">{c.room.quoteWaiting}</p>
          : <Button variant="secondary" disabled={b.status !== "completed" && !staff} onClick={() => setQuote(true)}><Icon name="file" size={16} aria-hidden />{c.room.quote}</Button>}
      </div>
      <Dialog open={confirmNs} onClose={() => setConfirmNs(false)} title={c.room.noShow} description={c.room.noShowConfirm}
        footer={<><Button variant="ghost" onClick={() => setConfirmNs(false)}>{c.common.cancel}</Button><Button variant="danger" loading={busy} onClick={save}>{c.common.confirm}</Button></>} />
      {quote && <ConvertToQuoteDialog b={b} staff={staff} services={services.filter((s) => picked.includes(s.slug) || b.recommendedServiceSlugs.includes(s.slug))} onClose={() => setQuote(false)} />}
    </div>
  );
}

const VALIDITY_DAYS = 14; // quote_validity_days setting (plan §7.9)
function ConvertToQuoteDialog({ b, staff, services, onClose }: { b: RoomData; staff: boolean; services: ServiceRef[]; onClose: () => void }) {
  const { c, locale } = useBkg();
  const toast = useToast();
  const qc = useQueryClient();
  const [lines, setLines] = useState(() => (b.quoteRequest?.lines ?? (services.length ? services.map((s) => ({ label: s.name, qty: 1, unit: s.fromFee ?? 0 })) : [{ label: "", qty: 1, unit: 0 }])));
  const [ch, setCh] = useState({ portal: true, email: true, whatsapp: false });
  const [busy, setBusy] = useState(false);
  const [key] = useState(() => crypto.randomUUID());
  const [validUntil] = useState(() => new Date(Date.now() + VALIDITY_DAYS * 86_400_000).toISOString());
  const t = quoteTotals({ lines, discountPct: 0 } as Parameters<typeof quoteTotals>[0]);
  const money = (n: number) => formatMoney(n, "RWF", locale);
  const valid = lines.every((l) => l.label.trim() && l.qty > 0 && l.unit >= 0) && lines.length > 0;
  async function submit() {
    setBusy(true);
    try {
      await bk(api.POST("/api/agent/bookings/{id}/quote-request", { params: { path: { id: b.id } }, body: { lines, send: staff, channels: Object.entries(ch).filter(([, on]) => on).map(([k]) => k) }, headers: idem(key) }));
      toast({ title: staff ? c.room.sendQuote : c.room.quoteWaiting, tone: "success" });
      qc.invalidateQueries({ queryKey: ["bkg"] }); onClose();
    } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); } finally { setBusy(false); }
  }
  return (
    <Dialog open onClose={onClose} title={c.room.quoteTitle} className="sm:max-w-2xl"
      footer={<><Button variant="ghost" onClick={onClose}>{c.common.cancel}</Button><Button disabled={!valid} loading={busy} onClick={submit}>{staff ? c.room.sendQuote : c.room.requestQuote}</Button></>}>
      <div className="grid gap-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-small">
            <thead><tr className="text-left text-eyebrow text-fg-subtle"><th className="pb-2">{c.room.line}</th><th className="w-20 pb-2">{c.room.qty}</th><th className="w-32 pb-2">{c.room.unit}</th><th className="w-8" /></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2"><Input aria-label={c.room.line} className="h-9" value={l.label} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} /></td>
                  <td className="py-1 pr-2"><Input aria-label={c.room.qty} className="h-9 tabular-nums" type="number" min={1} value={l.qty} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, qty: Math.max(0, Math.round(+e.target.value)) } : x)))} /></td>
                  <td className="py-1 pr-2"><Input aria-label={c.room.unit} className="h-9 tabular-nums" type="number" min={0} step={100} value={l.unit} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, unit: Math.max(0, Math.round(+e.target.value)) } : x)))} /></td>
                  <td><Button size="sm" variant="ghost" aria-label={c.common.cancel} disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))}><Icon name="x" size={14} aria-hidden /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="w-fit text-small text-link underline underline-offset-4" onClick={() => setLines([...lines, { label: "", qty: 1, unit: 0 }])}>{c.room.addLine}</button>
        <dl className="ml-auto grid w-full max-w-xs gap-1 text-small tabular-nums">
          <div className="flex justify-between"><dt>{c.room.subtotal}</dt><dd>{money(t.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>{c.room.vat}</dt><dd>{money(t.vat)}</dd></div>
          <div className="flex justify-between border-t border-border pt-1 text-label"><dt>{c.room.total}</dt><dd>{money(t.total)}</dd></div>
        </dl>
        <p className="text-small text-fg-muted">{fill(c.room.validUntil, { date: formatDay(validUntil, locale) })}</p>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-label">{c.room.channels}</legend>
          <Checkbox label={c.room.portal} checked={ch.portal} onChange={(e) => setCh({ ...ch, portal: e.target.checked })} />
          <Checkbox label={c.room.emailCh} checked={ch.email} onChange={(e) => setCh({ ...ch, email: e.target.checked })} />
          <Checkbox label={c.room.whatsappCh} checked={ch.whatsapp} onChange={(e) => setCh({ ...ch, whatsapp: e.target.checked })} />
        </fieldset>
      </div>
    </Dialog>
  );
}

