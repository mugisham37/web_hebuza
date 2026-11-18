"use client";
// SM bookings workspace (plan 11 §7.10, board 03 BA2 + missing screens): board (table | resource), callback requests,
// consultation types editor, analytics. URL: ?tab=board|requests|types|analytics&layout=table|resource&date&adviser&type&status&q
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx, formatMoney } from "@/shared/format";
import { errorCopy } from "@/lib/api/error-copy";
import { api } from "@/lib/api/client";
import { BkgError, bk, idem, useAdminBookings, useAnalytics, useCallbacks, useTypeAdmin } from "@/lib/booking/api";
import { dayOf, formatDay, formatTime, minuteOf } from "@/shared/booking/rules";
import type { AdminAdviser, CallbackRequest, ConsultationType, Hold, IntakeQuestion, Mode, StaffBooking } from "@/shared/booking/types";
import type { Locale } from "@/shared/i18n/config";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Dialog, Sheet } from "@/components/atoms/dialog";
import { Checkbox, Field, Input, Radio, Select, Switch, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { Tabs } from "@/components/atoms/tabs";
import { useToast } from "@/components/atoms/toast";
import { TimePicker } from "@/components/organisms/booking/flow";
import { BkgStatus, IllusNoSlots, ModeIcon, PriceBadge, SkeletonList, StatePanel, fill, useBkg } from "@/components/atoms/booking";

const LOCALES: Locale[] = ["rw", "en", "fr"];
const MODES: Mode[] = ["office", "video", "phone", "premises"];

export function OpsBookings() {
  const { c } = useBkg();
  const p = useUrlParams();
  const tab = p.get("tab") ?? "board";
  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h3">{c.ops.title}</h1>
          <p className="text-small text-fg-muted">{c.ops.lead}</p>
        </div>
        <OnBehalfButton />
      </header>
      <Tabs value={tab} onChange={(t) => setUrlParams({ tab: t })} tabs={[
        { id: "board", label: c.ops.tabs.board, content: <Board /> },
        { id: "requests", label: c.ops.tabs.requests, content: <CallbackQueue /> },
        { id: "types", label: c.ops.tabs.types, content: <TypesEditor /> },
        { id: "analytics", label: c.ops.tabs.analytics, content: <Analytics /> },
      ]} />
    </div>
  );
}

// ---------------------------------------------------------------- Board
function Board() {
  const { c, locale } = useBkg();
  const toast = useToast();
  const qc = useQueryClient();
  const p = useUrlParams();
  const [today] = useState(() => dayOf(Date.now()));
  const date = p.get("date") ?? today;
  const layout = p.get("layout") ?? "table";
  const qs = new URLSearchParams(Object.entries({ date, adviser: p.get("adviser"), type: p.get("type"), status: p.get("status"), q: p.get("q") }).filter(([, v]) => v) as [string, string][]).toString();
  const q = useAdminBookings(qs);
  const types = useTypeAdmin();
  const [act, setAct] = useState<{ kind: "reassign" | "cancel" | "override"; b: StaffBooking } | null>(null);
  const [auto, setAuto] = useState<string | null>(null);
  if (q.isError && q.error instanceof BkgError && q.error.status === 403) return <StatePanel title={c.ops.forbidden} />;
  const data = q.data;
  const exportCsv = () => {
    if (!data) return;
    const rows = [["ref", "start", "adviser", "type", "client", "mode", "status", "source"], ...data.bookings.map((b) => [b.reference, b.startsAt, b.adviser?.name ?? "", b.typeName.en, b.contactFull.name, b.mode, b.status, b.source])];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: `bookings-${date}.csv` }).click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={c.ops.date}>{(f) => <Input id={f.id} type="date" className="h-10" value={date} onChange={(e) => setUrlParams({ date: e.target.value || null })} />}</Field>
        <Field label={c.ops.adviser}>{(f) => <Select id={f.id} className="h-10" value={p.get("adviser") ?? ""} onChange={(e) => setUrlParams({ adviser: e.target.value || null })}><option value="">{c.common.all}</option>{data?.advisers.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>}</Field>
        <Field label={c.ops.type}>{(f) => <Select id={f.id} className="h-10" value={p.get("type") ?? ""} onChange={(e) => setUrlParams({ type: e.target.value || null })}><option value="">{c.common.all}</option>{types.data?.types.map((t) => <option key={t.slug} value={t.slug}>{t.name[locale]}</option>)}</Select>}</Field>
        <Field label={c.ops.status}>{(f) => <Select id={f.id} className="h-10" value={p.get("status") ?? ""} onChange={(e) => setUrlParams({ status: e.target.value || null })}><option value="">{c.common.all}</option>{["confirmed", "pending_payment", "completed", "no_show", "cancelled_by_client", "cancelled_by_staff", "rescheduled", "expired"].map((s) => <option key={s} value={s}>{c.status[s]}</option>)}</Select>}</Field>
        <Field label={c.common.search} className="min-w-[10rem] flex-1">{(f) => <Input id={f.id} type="search" className="h-10" defaultValue={p.get("q") ?? ""} onKeyDown={(e) => e.key === "Enter" && setUrlParams({ q: (e.target as HTMLInputElement).value || null })} />}</Field>
        <div className="flex gap-1 bg-bg-subtle p-1" role="group" aria-label={c.ops.resource}>
          {(["table", "resource"] as const).map((l) => <button key={l} type="button" aria-pressed={layout === l} onClick={() => setUrlParams({ layout: l })} className={cx("px-3 py-1.5 text-small", layout === l ? "bg-secondary text-on-navy" : "text-fg-muted")}>{l === "table" ? c.ops.table : c.ops.resource}</button>)}
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={!data?.bookings.length}>{c.common.export}</Button>
      </div>
      {data?.alerts.map((a) => (
        <div key={a.adviserId} role="alert" className="flex flex-wrap items-center justify-between gap-3 bg-warning-bg p-4 text-small text-warning">
          <span>{fill(c.ops.alert, { n: a.count, name: a.name, why: c.ops.why[a.why] })}</span>
          <Button size="sm" loading={auto === a.adviserId} onClick={async () => {
            setAuto(a.adviserId);
            try { const r = await bk<{ moved: unknown[]; unresolved: unknown[] }>(api.POST("/api/admin/bookings/auto-reassign", { body: { adviser_id: a.adviserId }, headers: idem() })); toast({ title: fill(c.ops.autoDone, { moved: r.moved.length, left: r.unresolved.length }), tone: "success" }); qc.invalidateQueries({ queryKey: ["bkg"] }); }
            catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); } finally { setAuto(null); }
          }}>{c.ops.autoReassign}</Button>
        </div>
      ))}
      {q.isPending ? <SkeletonList n={5} h="h-12" /> : q.isError ? (
        <StatePanel tone="danger" title={errorCopy(q.error, locale)}><Button variant="outline" onClick={() => q.refetch()}>{c.common.retry}</Button></StatePanel>
      ) : !data!.bookings.length ? <StatePanel art={<IllusNoSlots />} title={c.adviser.none} /> : layout === "resource"
        ? <ResourceView bookings={data!.bookings} advisers={data!.advisers} onMove={(b) => setAct({ kind: "reassign", b })} />
        : <BookingTable rows={data!.bookings} onAct={(kind, b) => setAct({ kind, b })} />}
      {act && <ActionDialog act={act} advisers={data?.advisers ?? []} onClose={() => setAct(null)} />}
    </div>
  );
}

function BookingTable({ rows, onAct }: { rows: StaffBooking[]; onAct: (k: "reassign" | "cancel" | "override", b: StaffBooking) => void }) {
  const { c, locale } = useBkg();
  const live = (b: StaffBooking) => b.status === "confirmed" || b.status === "pending_payment";
  return (
    <div className="overflow-x-auto border border-border bg-surface">
      <table className="w-full min-w-[52rem] text-small">
        <thead className="bg-bg-subtle text-left text-eyebrow uppercase tracking-wide text-fg-subtle">
          <tr>{[c.ops.when, c.ops.ref, c.ops.client, c.ops.type, c.ops.adviser, c.ops.status, c.ops.source, ""].map((h, i) => <th key={i} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className="border-t border-border hover:bg-bg-subtle">
              <td className="px-3 py-2.5 tabular-nums"><span className="inline-flex items-center gap-2"><ModeIcon mode={b.mode} size={14} />{formatTime(b.startsAt, locale)}–{formatTime(b.endsAt, locale)}</span></td>
              <td className="px-3 py-2.5 font-mono">{b.reference}</td>
              <td className="max-w-[12rem] truncate px-3 py-2.5">{b.contactFull.name}{!b.clientId && <span className="ml-1 text-eyebrow text-fg-subtle">· {c.room.lead}</span>}</td>
              <td className="px-3 py-2.5">{b.typeName[locale]}</td>
              <td className="px-3 py-2.5">{b.adviser?.name ?? "—"}</td>
              <td className="px-3 py-2.5"><BkgStatus status={b.status} /></td>
              <td className="px-3 py-2.5 text-fg-muted">{b.source}</td>
              <td className="px-3 py-2.5">
                <div className="flex justify-end gap-1">
                  <ButtonLink size="sm" variant="ghost" href={localHref(locale, `/ops/bookings/${b.id}`)}>{c.ops.openRoom}</ButtonLink>
                  {live(b) && <Button size="sm" variant="ghost" onClick={() => onAct("reassign", b)}>{c.ops.reassign}</Button>}
                  {live(b) && <Button size="sm" variant="ghost" onClick={() => onAct("cancel", b)}>{c.ops.cancel}</Button>}
                  <Button size="sm" variant="ghost" onClick={() => onAct("override", b)}>{c.ops.override}</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Advisers × 15-min rows 07:30–18:00 Kigali. Pointer drag between columns, or keyboard via "Move to…" button. */
function ResourceView({ bookings, advisers, onMove }: { bookings: StaffBooking[]; advisers: AdminAdviser[]; onMove: (b: StaffBooking) => void }) {
  const { c, locale } = useBkg();
  const START = 7 * 60 + 30, END = 18 * 60, ROW = 15, H = 28;
  const rows = Array.from({ length: (END - START) / ROW }, (_, i) => START + i * ROW);
  const [drag, setDrag] = useState<string | null>(null);
  return (
    <div className="overflow-x-auto border border-border bg-surface">
      <div className="grid min-w-[44rem]" style={{ gridTemplateColumns: `4rem repeat(${advisers.length}, minmax(10rem, 1fr))` }}>
        <div className="sticky left-0 z-10 border-b border-border bg-bg-subtle" />
        {advisers.map((a) => (
          <div key={a.id} className="border-b border-l border-border bg-bg-subtle px-3 py-2 text-small font-medium">
            {a.name}{(a.onLeave || a.deactivated) && <span className="ml-1 text-eyebrow text-warning">· {c.ops.why[a.onLeave ? "leave" : "deactivated"]}</span>}
            <span className="block text-eyebrow font-normal text-fg-subtle tabular-nums">{a.load}</span>
          </div>
        ))}
        <div className="sticky left-0 z-10 bg-surface">
          {rows.map((m) => <div key={m} style={{ height: H }} className="border-b border-border/50 pr-2 text-right text-eyebrow text-fg-subtle tabular-nums">{m % 60 === 0 ? `${String(m / 60).padStart(2, "0")}:00` : ""}</div>)}
        </div>
        {advisers.map((a) => (
          <div key={a.id} className={cx("relative border-l border-border", drag && "bg-bg-tint/40")} style={{ height: rows.length * H }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const b = bookings.find((x) => x.id === drag); setDrag(null); if (b && b.adviser?.id !== a.id) onMove({ ...b, adviser: { id: a.id, name: a.name } }); }}>
            {rows.map((m) => <div key={m} style={{ height: H }} className="border-b border-border/50" />)}
            {bookings.filter((b) => b.adviser?.id === a.id).map((b) => {
              const top = ((minuteOf(b.startsAt) - START) / ROW) * H;
              const h = Math.max(H, ((Date.parse(b.endsAt) - Date.parse(b.startsAt)) / 60000 / ROW) * H - 2);
              const done = !["confirmed", "pending_payment"].includes(b.status);
              return (
                <div key={b.id} draggable={!done} onDragStart={() => setDrag(b.id)} onDragEnd={() => setDrag(null)}
                  className={cx("absolute inset-x-1 overflow-hidden border p-1.5 text-eyebrow m-rise", done ? "border-border bg-bg-subtle text-fg-subtle" : "cursor-grab border-navy-200 bg-bg-tint")}
                  style={{ top: Math.max(0, top), height: h }}>
                  <p className="truncate font-medium text-fg">{formatTime(b.startsAt, locale)} · {b.contactFull.name}</p>
                  <p className="truncate">{b.typeName[locale]}</p>
                  {!done && <button type="button" className="mt-0.5 underline underline-offset-2" onClick={() => onMove(b)}>{c.ops.moveTo}</button>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionDialog({ act, advisers, onClose }: { act: { kind: "reassign" | "cancel" | "override"; b: StaffBooking }; advisers: AdminAdviser[]; onClose: () => void }) {
  const { c, locale } = useBkg();
  const toast = useToast();
  const qc = useQueryClient();
  const { b, kind } = act;
  const [to, setTo] = useState(kind === "reassign" && b.adviser ? b.adviser.id : "");
  const [reason, setReason] = useState("");
  const [ov, setOv] = useState<"late_refund" | "waive_no_show" | "extra_reschedule">("extra_reschedule");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [key] = useState(() => crypto.randomUUID());
  const title = kind === "reassign" ? fill(c.ops.reassignTitle, { ref: b.reference }) : kind === "cancel" ? fill(c.ops.cancelTitle, { ref: b.reference }) : c.ops.overrideTitle;
  async function submit() {
    if (!reason.trim()) { setErr(c.block.reason_required); return; }
    setBusy(true); setErr(null);
    try {
      await bk(api.PATCH("/api/admin/bookings/{id}", { params: { path: { id: b.id } }, body: { action: kind, adviser_id: kind === "reassign" ? to : undefined, override: kind === "override" ? ov : undefined, reason, version: b.version }, headers: idem(key) }));
      toast({ title: c.common.saved, tone: "success" }); qc.invalidateQueries({ queryKey: ["bkg"] }); onClose();
    } catch (e) {
      if (e instanceof BkgError && e.errorType === "slot_taken") setErr(`${advisers.find((a) => a.id === to)?.name ?? ""} — ${c.ops.busy}`);
      else if (e instanceof BkgError && e.errorType === "version_conflict") { toast({ title: c.manage.changedByStaff, tone: "danger" }); qc.invalidateQueries({ queryKey: ["bkg"] }); onClose(); }
      else setErr(errorCopy(e, locale));
    } finally { setBusy(false); }
  }
  return (
    <Dialog open onClose={onClose} title={title}
      footer={<><Button variant="ghost" onClick={onClose}>{c.common.cancel}</Button><Button variant={kind === "cancel" ? "danger" : "primary"} loading={busy} disabled={kind === "reassign" && !to} onClick={submit}>{c.common.confirm}</Button></>}>
      <div className="grid gap-4">
        <p className="text-small text-fg-muted tabular-nums">{b.contactFull.name} · {formatDay(b.startsAt, locale)} {formatTime(b.startsAt, locale)} · {b.typeName[locale]}</p>
        {kind === "reassign" && (
          <>
            <Field label={c.ops.reassignTo}>{(f) => <Select id={f.id} value={to} onChange={(e) => setTo(e.target.value)}><option value="">—</option>{advisers.filter((a) => !a.deactivated && !a.onLeave).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>}</Field>
            <p className="text-eyebrow text-fg-subtle">{c.ops.notify}</p>
          </>
        )}
        {kind === "cancel" && b.price > 0 && <p className="bg-info-bg p-3 text-small text-info">{c.ops.staffRefund}</p>}
        {kind === "override" && (
          <fieldset className="grid gap-2">
            {(["extra_reschedule", "waive_no_show", "late_refund"] as const).map((k) => <Radio key={k} name="ov" label={c.ops.overrideKind[k]} checked={ov === k} onChange={() => setOv(k)} />)}
          </fieldset>
        )}
        <Field label={c.common.reason} hint={c.common.reasonHint} error={err ?? undefined}>{(f) => <Textarea id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------- Book on behalf (also schedules callback requests)
function OnBehalfButton() {
  const { c } = useBkg();
  const [open, setOpen] = useState(false);
  return <><Button onClick={() => setOpen(true)}><Icon name="plus" size={16} aria-hidden />{c.ops.onBehalf}</Button>{open && <BookOnBehalfDialog onClose={() => setOpen(false)} />}</>;
}
export function BookOnBehalfDialog({ request, onClose }: { request?: CallbackRequest; onClose: () => void }) {
  const { c, locale } = useBkg();
  const toast = useToast();
  const qc = useQueryClient();
  const types = useTypeAdmin();
  const [slug, setSlug] = useState("");
  const t = types.data?.types.find((x) => x.slug === slug && x.isActive);
  const [hold, setHold] = useState<Hold | null>(null);
  const [v, setV] = useState({ name: request?.name ?? "", phone: request?.phone ?? "", email: request?.email ?? "", mode: "" as Mode | "", notes: request ? `${request.topic} · ${request.preferredTimes.join(", ")}` : "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [key] = useState(() => crypto.randomUUID());
  async function submit() {
    if (!t || !hold || !v.name.trim() || (!v.phone.trim() && !v.email.trim())) { setErr(c.details.eContact); return; }
    setBusy(true); setErr(null);
    try {
      await bk(api.DELETE("/api/bookings/{id}/hold", { params: { path: { id: hold.bookingId } }, headers: idem() })).catch(() => null); // staff create re-holds atomically server-side
      const r = await bk<StaffBooking>(api.POST("/api/admin/bookings", { body: { type: t.slug, starts_at: hold.startsAt, adviser_id: hold.adviserId, name: v.name, phone: v.phone || undefined, email: v.email || undefined, mode: v.mode || t.modes[0], notes: v.notes, request_id: request?.id }, headers: idem(key) }));
      toast({ title: fill(c.ops.booked, { ref: r.reference }), tone: "success" }); qc.invalidateQueries({ queryKey: ["bkg"] }); onClose();
    } catch (e) { setErr(errorCopy(e, locale)); } finally { setBusy(false); }
  }
  return (
    <Sheet open onClose={onClose} title={c.ops.behalfTitle}
      footer={<><Button variant="ghost" onClick={onClose}>{c.common.cancel}</Button><Button loading={busy} disabled={!hold} onClick={submit}>{c.common.confirm}</Button></>}>
      <div className="grid gap-4">
        {err && <p role="alert" className="bg-danger-bg p-3 text-small text-danger">{err}</p>}
        <Field label={c.ops.person}>{(f) => <Input id={f.id} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={c.details.phone}>{(f) => <Input id={f.id} type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />}</Field>
          <Field label={c.details.email} optional={c.common.optional}>{(f) => <Input id={f.id} type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />}</Field>
        </div>
        <Field label={c.ops.type}>{(f) => <Select id={f.id} value={slug} onChange={(e) => { setSlug(e.target.value); setHold(null); }}><option value="">—</option>{types.data?.types.filter((x) => x.isActive).map((x) => <option key={x.slug} value={x.slug}>{x.name[locale]}</option>)}</Select>}</Field>
        {t && (
          <>
            <fieldset className="flex flex-wrap gap-3"><legend className="mb-1 text-label">{c.topic.mode}</legend>{t.modes.map((m) => <Radio key={m} name="bm" label={c.mode[m]} checked={(v.mode || t.modes[0]) === m} onChange={() => setV({ ...v, mode: m })} />)}</fieldset>
            <TimePicker type={t} holdId={hold?.bookingId ?? null} onHeld={setHold} staff />
          </>
        )}
        <Field label={c.ops.notes} optional={c.common.optional}>{(f) => <Textarea id={f.id} rows={3} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />}</Field>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- Callback requests (F-BKG-05)
function CallbackQueue() {
  const { c, locale } = useBkg();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useCallbacks();
  const [st, setSt] = useState<CallbackRequest["status"]>("new");
  const [sched, setSched] = useState<CallbackRequest | null>(null);
  const [close, setClose] = useState<CallbackRequest | null>(null);
  const [reason, setReason] = useState("");
  if (q.isPending) return <SkeletonList n={3} />;
  if (q.isError) return <StatePanel tone="danger" title={errorCopy(q.error, locale)}><Button variant="outline" onClick={() => q.refetch()}>{c.common.retry}</Button></StatePanel>;
  const rows = q.data.filter((r) => r.status === st);
  return (
    <div className="grid gap-4">
      <div className="flex gap-1 bg-bg-subtle p-1 w-fit" role="group">
        {(["new", "scheduled", "closed"] as const).map((s) => <button key={s} type="button" aria-pressed={st === s} onClick={() => setSt(s)} className={cx("px-3 py-1.5 text-small", st === s ? "bg-secondary text-on-navy" : "text-fg-muted")}>{c.status[s]} <span className="tabular-nums">{q.data.filter((r) => r.status === s).length}</span></button>)}
      </div>
      {!rows.length ? <p className="bg-bg-subtle p-6 text-center text-small text-fg-muted">{c.ops.reqEmpty}</p> : (
        <ul className="grid gap-2 m-stagger">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 border border-border bg-surface p-4">
              <div className="min-w-0 flex-1">
                <p className="text-label">{r.name} <span className="font-normal text-fg-muted">· {r.language.toUpperCase()}</span></p>
                <p className="text-small text-fg-muted">{r.topic} · {r.preferredTimes.join(", ")}</p>
                <p className="text-eyebrow text-fg-subtle tabular-nums">{formatDay(r.createdAt, locale)} {formatTime(r.createdAt, locale)}{r.bookingRef && ` · ${r.bookingRef}`}{r.closeReason && ` · ${r.closeReason}`}</p>
              </div>
              <a href={`tel:${r.phone}`} className="inline-flex h-9 items-center gap-2 border border-border-strong px-4 text-small"><Icon name="phone" size={14} aria-hidden />{c.ops.call} {r.phoneMasked}</a>
              {r.status === "new" && <><Button size="sm" onClick={() => setSched(r)}>{c.ops.schedule}</Button><Button size="sm" variant="ghost" onClick={() => { setClose(r); setReason(""); }}>{c.ops.closeReq}</Button></>}
            </li>
          ))}
        </ul>
      )}
      {sched && <BookOnBehalfDialog request={sched} onClose={() => setSched(null)} />}
      <Dialog open={!!close} onClose={() => setClose(null)} title={c.ops.closeReq}
        footer={<><Button variant="ghost" onClick={() => setClose(null)}>{c.common.cancel}</Button><Button disabled={!reason.trim()} onClick={async () => {
          try { await bk(api.PATCH("/api/admin/consultation-requests/{id}", { params: { path: { id: close!.id } }, body: { status: "closed", close_reason: reason }, headers: idem() })); qc.invalidateQueries({ queryKey: ["bkg"] }); setClose(null); }
          catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
        }}>{c.common.confirm}</Button></>}>
        <Field label={c.ops.closeReason}>{(f) => <Textarea id={f.id} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------- Consultation types editor
function TypesEditor() {
  const { c, locale } = useBkg();
  const q = useTypeAdmin();
  const [edit, setEdit] = useState<ConsultationType | "new" | null>(null);
  if (q.isPending) return <SkeletonList n={3} h="h-20" />;
  if (q.isError) return <StatePanel title={q.error instanceof BkgError && q.error.status === 403 ? c.ops.forbidden : errorCopy(q.error, locale)} />;
  const all = q.data.canEdit === "all";
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!all ? <p className="bg-info-bg px-3 py-2 text-small text-info">{c.ops.copyOnly}</p> : <span />}
        {all && <Button size="sm" onClick={() => setEdit("new")}><Icon name="plus" size={14} aria-hidden />{c.ops.typeNew}</Button>}
      </div>
      <ul className="grid gap-3 md:grid-cols-2 m-stagger">
        {q.data.types.map((t) => {
          const missing = LOCALES.filter((l) => !t.name[l]?.trim() || !t.description[l]?.trim());
          return (
            <li key={t.id} className={cx("grid gap-2 border border-border bg-surface p-5", !t.isActive && "opacity-70")}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-label">{t.name[locale]}</p>
                <PriceBadge price={t.price} />
              </div>
              <p className="line-clamp-2 text-small text-fg-muted">{t.description[locale]}</p>
              <p className="flex flex-wrap items-center gap-2 text-eyebrow text-fg-subtle tabular-nums">
                {fill(c.common.min, { n: t.durationMin })} · {t.modes.map((m) => c.modeShort[m]).join(", ")} · {t.adviserIds.length} {c.ops.advisers.toLowerCase()}
                {!t.isActive && <span className="bg-bg-subtle px-2 py-0.5">{c.status.closed}</span>}
                {missing.map((l) => <span key={l} className="bg-warning-bg px-2 py-0.5 text-warning">{l.toUpperCase()} {c.ops.missing}</span>)}
              </p>
              <Button size="sm" variant="outline" className="w-fit" onClick={() => setEdit(t)}>{c.common.edit}</Button>
            </li>
          );
        })}
      </ul>
      {edit && <TypeDrawer t={edit === "new" ? null : edit} advisers={q.data.advisers} copyOnly={!all} onClose={() => setEdit(null)} />}
    </div>
  );
}

const blankType = (): ConsultationType => ({
  id: "", slug: "", name: { rw: "", en: "", fr: "" }, description: { rw: "", en: "", fr: "" }, durationMin: 30, modes: ["video"], price: 0, currency: "RWF",
  bufferBeforeMin: 5, bufferAfterMin: 10, minNoticeMin: 240, horizonDays: 30, maxPerDay: 6, familySlugs: [], serviceSlugs: [], adviserIds: [], intakeSchema: [],
  prepare: { rw: [], en: [], fr: [] }, freeOncePerFamily: false, isActive: false, version: 0,
});
function TypeDrawer({ t, advisers, copyOnly, onClose }: { t: ConsultationType | null; advisers: { id: string; name: string }[]; copyOnly: boolean; onClose: () => void }) {
  const { c, locale } = useBkg();
  const toast = useToast();
  const qc = useQueryClient();
  const [v, setV] = useState<ConsultationType>(() => t ?? blankType());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof ConsultationType>(k: K, x: ConsultationType[K]) => setV({ ...v, [k]: x });
  const num = (k: "price" | "bufferBeforeMin" | "bufferAfterMin" | "minNoticeMin" | "horizonDays" | "maxPerDay", label: string) => (
    <Field label={label}>{(f) => <Input id={f.id} type="number" min={0} className="tabular-nums" disabled={copyOnly} value={v[k]} onChange={(e) => set(k, Math.max(0, Math.round(+e.target.value)))} />}</Field>
  );
  async function save() {
    if (!v.name.en.trim() || (!t && !/^[a-z0-9-]{3,40}$/.test(v.slug))) { setErr(c.details.eName); return; }
    setBusy(true); setErr(null);
    try {
      if (t) await bk(api.PATCH("/api/admin/consultation-types/{id}", { params: { path: { id: t.id } }, body: v, headers: idem() }));
      else await bk(api.POST("/api/admin/consultation-types", { body: v, headers: idem() }));
      toast({ title: c.common.saved, tone: "success" }); qc.invalidateQueries({ queryKey: ["bkg"] }); onClose();
    } catch (e) { setErr(e instanceof BkgError && e.errorType === "version_conflict" ? c.manage.changedByStaff : errorCopy(e, locale)); } finally { setBusy(false); }
  }
  const setQ = (i: number, q: Partial<IntakeQuestion>) => set("intakeSchema", v.intakeSchema.map((x, j) => (j === i ? { ...x, ...q } : x)));
  return (
    <Sheet open onClose={onClose} title={t ? fill(c.ops.typeEdit, { name: t.name[locale] }) : c.ops.typeNew}
      footer={<><Button variant="ghost" onClick={onClose}>{c.common.cancel}</Button><Button loading={busy} onClick={save}>{c.common.save}</Button></>}>
      <div className="grid gap-5">
        {err && <p role="alert" className="bg-danger-bg p-3 text-small text-danger">{err}</p>}
        {!t && <Field label="Slug" hint="a-z, 0-9, -">{(f) => <Input id={f.id} value={v.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} />}</Field>}
        {LOCALES.map((l) => (
          <fieldset key={l} className="grid gap-2 border border-border p-3">
            <legend className="px-1 text-eyebrow uppercase text-fg-subtle">{l}{(!v.name[l] || !v.description[l]) && <span className="ml-1 text-warning">· {c.ops.missing}</span>}</legend>
            <Field label={c.ops.names}>{(f) => <Input id={f.id} value={v.name[l]} onChange={(e) => set("name", { ...v.name, [l]: e.target.value })} />}</Field>
            <Field label={c.ops.descriptions}>{(f) => <Textarea id={f.id} rows={2} value={v.description[l]} onChange={(e) => set("description", { ...v.description, [l]: e.target.value })} />}</Field>
          </fieldset>
        ))}
        <fieldset disabled={copyOnly} className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={c.ops.duration}>{(f) => <Select id={f.id} value={v.durationMin} onChange={(e) => set("durationMin", +e.target.value as ConsultationType["durationMin"])}>{[15, 30, 45, 60].map((n) => <option key={n} value={n}>{fill(c.common.min, { n })}</option>)}</Select>}</Field>
            {num("price", c.ops.price)}
            {num("bufferBeforeMin", c.ops.bufBefore)}{num("bufferAfterMin", c.ops.bufAfter)}
            {num("minNoticeMin", c.ops.notice)}{num("horizonDays", c.ops.horizon)}{num("maxPerDay", c.ops.maxDay)}
          </div>
          <fieldset className="flex flex-wrap gap-4"><legend className="mb-1 text-label">{c.ops.modes}</legend>
            {MODES.map((m) => <Checkbox key={m} label={c.mode[m]} checked={v.modes.includes(m)} onChange={(e) => set("modes", e.target.checked ? [...v.modes, m] : v.modes.filter((x) => x !== m))} />)}
          </fieldset>
          <fieldset className="grid gap-2 sm:grid-cols-2"><legend className="mb-1 text-label">{c.ops.advisers}</legend>
            {advisers.map((a) => <Checkbox key={a.id} label={a.name} checked={v.adviserIds.includes(a.id)} onChange={(e) => set("adviserIds", e.target.checked ? [...v.adviserIds, a.id] : v.adviserIds.filter((x) => x !== a.id))} />)}
          </fieldset>
          <Checkbox label={c.ops.freeOnce} checked={v.freeOncePerFamily} onChange={(e) => set("freeOncePerFamily", e.target.checked)} />
          <Switch label={c.ops.active} checked={v.isActive} onChange={(e) => set("isActive", e.target.checked)} />
          <section className="grid gap-3">
            <div className="flex items-center justify-between"><h3 className="text-label">{c.ops.intake}</h3><span className="text-eyebrow text-fg-subtle">{c.ops.maxQ}</span></div>
            {v.intakeSchema.map((q, i) => (
              <div key={q.id} className="grid gap-2 border border-border p-3">
                <div className="flex flex-wrap gap-2">
                  <Select aria-label={c.ops.qType.text} className="h-9 w-32" value={q.type} onChange={(e) => setQ(i, { type: e.target.value as IntakeQuestion["type"] })}>{Object.entries(c.ops.qType).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
                  <Checkbox label={c.common.required} checked={q.required} onChange={(e) => setQ(i, { required: e.target.checked })} />
                  <Button size="sm" variant="ghost" className="ml-auto" aria-label={c.common.cancel} onClick={() => set("intakeSchema", v.intakeSchema.filter((_, j) => j !== i))}><Icon name="x" size={14} aria-hidden /></Button>
                </div>
                {LOCALES.map((l) => <Input key={l} aria-label={`${c.ops.names} ${l}`} placeholder={l.toUpperCase()} className="h-9" value={q.label[l]} onChange={(e) => setQ(i, { label: { ...q.label, [l]: e.target.value } })} />)}
                {(q.type === "select" || q.type === "radio") && <Input aria-label={c.ops.options} placeholder={c.ops.options} className="h-9" value={(q.options ?? []).join(", ")} onChange={(e) => setQ(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />}
              </div>
            ))}
            <Button size="sm" variant="secondary" className="w-fit" disabled={v.intakeSchema.length >= 8} onClick={() => set("intakeSchema", [...v.intakeSchema, { id: `q${Date.now()}`, type: "text", label: { rw: "", en: "", fr: "" }, required: false }])}><Icon name="plus" size={14} aria-hidden />{c.ops.addQ}</Button>
          </section>
        </fieldset>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- Analytics (funnel + KPIs, table fallback)
function Analytics() {
  const { c, locale } = useBkg();
  const q = useAnalytics();
  if (q.isPending) return <SkeletonList n={4} h="h-24" />;
  if (q.isError) return <StatePanel title={errorCopy(q.error, locale)} />;
  const a = q.data;
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const kpis = [[c.ops.an.showUp, pct(a.showUp)], [c.ops.an.noShow, pct(a.noShow)], [c.ops.an.lead, fill(c.ops.an.days, { n: a.leadTimeDays })], [c.ops.an.util, pct(a.utilisation)], [c.ops.an.freeToPaid, pct(a.freeToPaid)], [c.ops.an.revenue, formatMoney(a.revenue, "RWF", locale)]];
  return (
    <div className="grid gap-5">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map(([l, v]) => <div key={l} className="border border-border bg-surface p-4"><dt className="text-eyebrow text-fg-subtle">{l}</dt><dd className="mt-1 text-h4 tabular-nums">{v}</dd></div>)}
      </dl>
      <Bars title={c.ops.an.funnel} items={a.funnel} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Bars title={c.ops.an.byType} items={a.byType} /><Bars title={c.ops.an.byAdviser} items={a.byAdviser} /><Bars title={c.ops.an.bySource} items={a.bySource} />
      </div>
    </div>
  );
}
function Bars({ title, items }: { title: string; items: { label: string; value: number }[] }) {
  const { c } = useBkg();
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <figure className="border border-border bg-surface p-5">
      <figcaption className="mb-3 text-label">{title}</figcaption>
      <ul className="grid gap-2" aria-hidden>
        {items.map((i) => (
          <li key={i.label} className="grid grid-cols-[8rem_1fr] items-center gap-3 text-small">
            <span className="truncate text-fg-muted">{i.label}</span>
            <span className="relative h-7 bg-bg-subtle"><span className="m-grow absolute inset-y-0 left-0 bg-navy-700/80" style={{ width: `${(i.value / max) * 100}%` }} /><span className="absolute inset-y-0 left-2 flex items-center font-medium tabular-nums text-fg mix-blend-normal">{i.value}</span></span>
          </li>
        ))}
      </ul>
      <details className="mt-3 text-small"><summary className="cursor-pointer text-fg-muted">{c.common.viewAsTable}</summary>
        <table className="mt-2 w-full"><tbody>{items.map((i) => <tr key={i.label} className="border-t border-border"><td className="py-1">{i.label}</td><td className="py-1 text-right tabular-nums">{i.value}</td></tr>)}</tbody></table>
      </details>
    </figure>
  );
}

