"use client";
import { waLink } from "@/content/marketing";
// Booking after-care (plan 11 §7.4–7.6): confirmation page, magic-link manage, client portal list/detail.
// One `ManageBooking` organism serves the token page and the portal; `api` decides which endpoints it talks to.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { cx, formatMoney } from "@/shared/format";
import { errorCopy } from "@/lib/api/error-copy";
import { BkgError, bk, idem, useMyBookings, bkgKeys } from "@/lib/booking/api";
import { api } from "@/lib/api/client";
import { BKG, cancelOutcome, formatDay, formatTime } from "@/shared/booking/rules";
import type { Booking, ConsultationType, Hold } from "@/shared/booking/types";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Input, Radio, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { Avatar } from "@/components/atoms/misc";
import { Tabs } from "@/components/atoms/tabs";
import { useToast } from "@/components/atoms/toast";
import { ss, TimePicker } from "@/components/organisms/booking/flow";
import {
  AddToCalendar, BkgStatus, IllusLinkExpired, IllusNoSlots, JoinButton, ModeTag, OfflineBanner, PolicyNote, ReminderTimeline, SkeletonList,
  StatePanel, TzNote, fill, useBkg, useOnline,
} from "@/components/atoms/booking";

const WA = waLink("Muraho HEBUZA");

// ---------------------------------------------------------------- shared bits
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-0 sm:grid-cols-[9rem_1fr]">
      <dt className="text-eyebrow uppercase tracking-wide text-fg-subtle">{label}</dt>
      <dd className="min-w-0 text-body">{children}</dd>
    </div>
  );
}
function where(b: Booking, c: ReturnType<typeof useBkg>["c"]) {
  if (b.mode === "office") return b.location ?? c.confirmed.officeAddress;
  if (b.mode === "video") return c.confirmed.linkLater;
  return b.location ?? c.mode[b.mode];
}
function Summary({ b }: { b: Booking }) {
  const { c, locale } = useBkg();
  return (
    <dl>
      <Row label={c.confirmed.reference}><span className="font-mono tabular-nums">{b.reference}</span></Row>
      {b.adviser && <Row label={c.confirmed.adviser}><span className="inline-flex items-center gap-2"><Avatar name={b.adviser.name} src={b.adviser.photo} size="sm" />{b.adviser.name}</span></Row>}
      <Row label={c.confirmed.when}>
        <span className="tabular-nums">{formatDay(b.startsAt, locale, undefined, true)} · {formatTime(b.startsAt, locale)}–{formatTime(b.endsAt, locale)}</span>
        <TzNote at={b.startsAt} />
      </Row>
      <Row label={c.confirmed.where}><span className="inline-flex flex-wrap items-center gap-2"><ModeTag mode={b.mode} />{where(b, c)}</span></Row>
    </dl>
  );
}

// ---------------------------------------------------------------- /book/confirmed/[ref] (BC3)
export function ConfirmationView({ reference }: { reference: string }) {
  const { c, locale } = useBkg();
  const { user } = useSession();
  const [ck, setCk] = useState<{ confirmKey: string; token?: string } | null | undefined>(undefined);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe: reads browser-only state after mount
  useEffect(() => { setCk(ss.get(`bkg.ck.${reference}`)); }, [reference]);
  const q = useQuery({
    queryKey: ["bkg", "public", reference, ck?.confirmKey],
    queryFn: () => bk<Booking>(api.GET("/api/bookings/public/{ref}", { params: { path: { ref: reference } }, headers: { "x-confirm-key": ck!.confirmKey } })),
    enabled: !!ck, retry: false, refetchInterval: (s) => (s.state.data?.status === "pending_payment" ? 5000 : false),
  });
  if (ck === undefined || (ck && q.isPending)) return <SkeletonList n={3} h="h-24" />;
  // Another device / cleared storage: never show booking data by reference alone.
  if (!ck || q.isError || !q.data) return (
    <StatePanel art={<IllusLinkExpired />} title={c.confirmed.elsewhere} body={c.confirmed.elsewhereBody}>
      <ButtonLink href={localHref(locale, "/book")} variant="outline">{c.common.book}</ButtonLink>
    </StatePanel>
  );
  const b = q.data;
  const pending = b.status === "pending_payment";
  const title = b.typeName[locale];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      <section className="border border-border bg-surface p-6 sm:p-8 m-rise">
        <div className="flex items-start gap-4">
          <span aria-hidden className={cx("grid size-12 shrink-0 place-items-center rounded-full", pending ? "bg-warning-bg text-warning" : "bg-success-bg text-success m-pop")}>
            <Icon name={pending ? "clock" : "check"} size={24} />
          </span>
          <div className="min-w-0">
            <h1 tabIndex={-1} className="text-h3">{pending ? c.confirmed.pendingTitle : c.confirmed.title}</h1>
            <p className="mt-1 text-body text-fg-muted">{title} · {fill(c.common.min, { n: Math.round((Date.parse(b.endsAt) - Date.parse(b.startsAt)) / 60000) })}</p>
          </div>
        </div>
        {pending && (
          <div role="status" className="mt-5 flex flex-wrap items-center justify-between gap-3 bg-warning-bg p-4 text-small text-warning">
            <span>{c.confirmed.pendingBody}</span>
            {b.invoiceRef && <ButtonLink size="sm" href={localHref(locale, `/pay/${b.invoiceRef}`)}>{c.confirmed.finishPay}</ButtonLink>}
          </div>
        )}
        {b.refund && <p role="status" className="mt-5 bg-info-bg p-4 text-small text-info">{c.confirmed.lateRefund}</p>}
        <div className="mt-6"><Summary b={b} /></div>
        {!pending && <div className="mt-5"><p className="mb-2 text-label">{c.confirmed.addCal}</p><AddToCalendar b={{ reference: b.reference, title: `HEBUZA · ${title}`, startsAt: b.startsAt, endsAt: b.endsAt, location: where(b, c) }} /></div>}
        <p className="mt-6 flex items-center gap-2 text-small text-fg-muted"><Icon name="mail" size={16} aria-hidden />{fill(c.confirmed.sentLink, { masked: b.contact.phoneMasked ?? b.contact.emailMasked ?? "" })}</p>
        {ck.token && process.env.NODE_ENV !== "production" && (
          <p className="mt-2 text-eyebrow text-fg-subtle">Dev: <Link className="underline" href={localHref(locale, `/book/manage/${ck.token}`)}>manage link</Link></p>
        )}
      </section>
      <aside className="grid gap-4">
        {b.prepare.length > 0 && (
          <div className="border border-border bg-surface p-5">
            <h2 className="mb-3 text-label">{c.confirmed.prepare}</h2>
            <ul className="grid gap-2 m-stagger">{b.prepare.map((x) => <li key={x} className="flex gap-2 text-small"><Icon name="check" size={16} className="mt-0.5 shrink-0 text-success" aria-hidden />{x}</li>)}</ul>
          </div>
        )}
        <div className="border border-border bg-surface p-5">
          <h2 className="mb-3 text-label">{c.confirmed.reminders}</h2>
          <ReminderTimeline items={b.reminders} />
        </div>
        {!user && (
          <div className="bg-bg-tint p-5">
            <p className="text-small">{c.confirmed.account}</p>
            <ButtonLink size="sm" className="mt-3" href={localHref(locale, "/sign-up")}>{c.confirmed.accountCta}</ButtonLink>
          </div>
        )}
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- Manage organism (BC4, PBC1)
type Target = { token: string } | { id: string };
type ManageApi = Target & { key: unknown[] };
// Same actions, two owners: magic-link token (public) or signed-in client.
const joinUrl = (t: Target) => bk<{ url: string }>("token" in t ? api.GET("/api/bookings/manage/{token}/join", { params: { path: { token: t.token } } }) : api.GET("/api/me/bookings/{id}/join", { params: { path: { id: t.id } } }));
export function ManageBooking({ b, api: target, portal }: { b: Booking; api: ManageApi; portal?: boolean }) {
  const { c, locale } = useBkg();
  const qc = useQueryClient();
  const toast = useToast();
  const online = useOnline();
  const [dlg, setDlg] = useState<"cancel" | "resched" | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: target.key }); qc.invalidateQueries({ queryKey: bkgKeys.all }); };
  const onConflict = (e: unknown) => {
    if (e instanceof BkgError && e.errorType === "version_conflict") { toast({ title: c.manage.changedByStaff, tone: "danger" }); refresh(); return true; }
    return false;
  };
  const title = b.typeName[locale];
  const live = b.status === "confirmed" || b.status === "pending_payment";
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      <section className="grid gap-5 border border-border bg-surface p-6 sm:p-8 m-rise">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-eyebrow uppercase tracking-wide text-fg-subtle">{c.manage.title}</p>
            <h1 className="mt-1 text-h3">{title}</h1>
          </div>
          <BkgStatus status={b.status} />
        </div>
        <OfflineBanner />
        <StatusNotice b={b} />
        <Summary b={b} />
        {live && b.mode === "video" && <JoinButton state={b.can.join} startsAt={b.startsAt} fetchUrl={() => joinUrl(target)} />}
        {b.status === "pending_payment" && b.invoiceRef && <ButtonLink href={localHref(locale, `/pay/${b.invoiceRef}`)}>{c.confirmed.finishPay}</ButtonLink>}
        {live && (
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" disabled={!b.can.reschedule || !online} onClick={() => setDlg("resched")}><Icon name="calendar" size={16} aria-hidden />{c.manage.reschedule}</Button>
              <Button variant="ghost" disabled={!b.can.cancel || !online} onClick={() => setDlg("cancel")}>{c.manage.cancel}</Button>
            </div>
            {b.can.reason && !b.can.reschedule && <p className="text-small text-fg-muted">{fill(c.block[b.can.reason] ?? "", { h: BKG.cutoffH })}</p>}
            <PolicyNote />
          </div>
        )}
        {live && (
          <p className="flex flex-wrap items-center gap-2 text-small text-fg-muted">
            <Icon name="message" size={16} aria-hidden /><span className="font-medium text-fg">{c.manage.late}</span>{c.manage.lateBody}
            <a href={WA} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{c.common.whatsapp}</a>
          </p>
        )}
      </section>
      <aside className="grid gap-4">
        <div className="border border-border bg-surface p-5">
          <h2 className="mb-3 text-label">{c.manage.timeline}</h2>
          <ol className="grid gap-3">
            {b.events.map((e, i) => (
              <li key={i} className="flex gap-3">
                <span aria-hidden className={cx("mt-1.5 size-2.5 shrink-0 rounded-full", i === b.events.length - 1 ? "bg-navy-700" : "bg-ink-300")} />
                <span className="min-w-0">
                  <span className="block text-small font-medium">{c.manage.events[e.kind]}{e.note && <span className="font-normal text-fg-muted"> · {e.note}</span>}</span>
                  <span className="block text-eyebrow text-fg-subtle tabular-nums">{formatDay(e.at, locale)} · {formatTime(e.at, locale)}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        {live && <div className="border border-border bg-surface p-5"><h2 className="mb-3 text-label">{c.confirmed.reminders}</h2><ReminderTimeline items={b.reminders} /></div>}
        {portal && <ClientNotes b={b} />}
      </aside>
      {dlg === "cancel" && <CancelDialog b={b} base={target} onClose={() => setDlg(null)} onConflict={onConflict} onDone={refresh} />}
      {dlg === "resched" && <RescheduleDialog b={b} base={target} onClose={() => setDlg(null)} onConflict={onConflict} onDone={refresh} />}
    </div>
  );
}

function StatusNotice({ b }: { b: Booking }) {
  const { c, locale } = useBkg();
  const box = (tone: string, text: React.ReactNode) => <p role="status" className={cx("p-4 text-small", tone)}>{text}</p>;
  if (b.status === "rescheduled") return box("bg-info-bg text-info", fill(c.manage.movedTo, { ref: b.rescheduledToRef ?? "" }));
  if (b.status === "cancelled_by_client" || b.status === "cancelled_by_staff") return box("bg-bg-subtle text-fg-muted", <>{c.manage.cancelled}{b.cancelReason && <> · {b.cancelReason}</>}{b.refund && <> · {fill(b.refund.kind === "refund" ? c.manage.refundDone : c.manage.creditDone, { ref: b.refund.ref, amount: formatMoney(b.refund.amount, "RWF", locale) })}</>}</>);
  if (b.status === "completed") return box("bg-success-bg text-success", c.manage.completed);
  if (b.status === "no_show") return box("bg-warning-bg text-warning", c.manage.noShow);
  if (b.status === "expired") return box("bg-bg-subtle text-fg-muted", c.manage.expiredTitle);
  return null;
}

function CancelDialog({ b, base, onClose, onConflict, onDone }: { b: Booking; base: Target; onClose: () => void; onConflict: (e: unknown) => boolean; onDone: () => void }) {
  const { c, locale } = useBkg();
  const toast = useToast();
  const [choice, setChoice] = useState<"refund" | "credit">("refund");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [key] = useState(() => crypto.randomUUID());
  // Client-side preview only; the server decides the real outcome (and re-checks the cutoff).
  const [now] = useState(() => Date.now());
  const out = cancelOutcome({ price: b.price, startsAt: b.startsAt, paid: b.paid }, "client", now);
  const amount = formatMoney(b.price, "RWF", locale);
  async function submit() {
    setBusy(true);
    try {
      const r = await bk<{ booking: Booking; refund: Booking["refund"] }>((() => { const body = { reason: reason || undefined, refund_choice: out.refund > 0 ? choice : undefined, version: b.version }; return "token" in base ? api.POST("/api/bookings/manage/{token}/cancel", { params: { path: { token: base.token } }, body, headers: idem(key) }) : api.POST("/api/me/bookings/{id}/cancel", { params: { path: { id: base.id } }, body, headers: idem(key) }); })());
      toast({ title: r.refund ? fill(r.refund.kind === "refund" ? c.manage.refundDone : c.manage.creditDone, { ref: r.refund.ref, amount: formatMoney(r.refund.amount, "RWF", locale) }) : c.manage.cancelled, tone: "success" });
      onDone(); onClose();
    } catch (e) { if (!onConflict(e)) toast({ title: errorCopy(e, locale), tone: "danger" }); else onClose(); }
    finally { setBusy(false); }
  }
  return (
    <Dialog open onClose={onClose} title={c.cancelDlg.title}
      footer={<><Button variant="ghost" onClick={onClose}>{c.cancelDlg.keep}</Button><Button variant="danger" loading={busy} onClick={submit}>{c.cancelDlg.confirm}</Button></>}>
      <div className="grid gap-4">
        {b.price === 0 ? <p className="text-small">{c.cancelDlg.free}</p>
          : out.refund > 0 ? (
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-small">{fill(c.cancelDlg.refund, { amount })} {c.cancelDlg.creditOr}</legend>
              <Radio name="rc" label={c.cancelDlg.asRefund} checked={choice === "refund"} onChange={() => setChoice("refund")} />
              <Radio name="rc" label={c.cancelDlg.asCredit} checked={choice === "credit"} onChange={() => setChoice("credit")} />
            </fieldset>
          ) : (
            <div className="bg-warning-bg p-3 text-small text-warning">
              {fill(c.cancelDlg.forfeit, { h: BKG.cutoffH })}{" "}
              <a href={WA} target="_blank" rel="noopener noreferrer" className="underline">{c.cancelDlg.review}</a>
            </div>
          )}
        <Field label={c.cancelDlg.reasonOpt}>{(p) => <Textarea id={p.id} rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
      </div>
    </Dialog>
  );
}

function RescheduleDialog({ b, base, onClose, onConflict, onDone }: { b: Booking; base: Target; onClose: () => void; onConflict: (e: unknown) => boolean; onDone: () => void }) {
  const { c, locale } = useBkg();
  const toast = useToast();
  const type = useQuery({ queryKey: ["bkg", "type", b.typeSlug], queryFn: () => bk<ConsultationType>(api.GET("/api/consultation-types/{slug}", { params: { path: { slug: b.typeSlug } } })) });
  const [hold, setHold] = useState<Hold | null>(null);
  const [busy, setBusy] = useState(false);
  const [key] = useState(() => crypto.randomUUID());
  const left = BKG.maxReschedules - b.rescheduleCount - 1;
  async function submit() {
    if (!hold) return;
    setBusy(true);
    try {
      const nb = await bk<Booking>((() => { const body = { hold_id: hold.bookingId, version: b.version }; return "token" in base ? api.POST("/api/bookings/manage/{token}/reschedule", { params: { path: { token: base.token } }, body, headers: idem(key) }) : api.POST("/api/me/bookings/{id}/reschedule", { params: { path: { id: base.id } }, body, headers: idem(key) }); })());
      toast({ title: fill(c.manage.rescheduled, { ref: nb.reference }), tone: "success" });
      onDone(); onClose();
    } catch (e) {
      if (e instanceof BkgError && e.errorType === "hold_expired") { setHold(null); toast({ title: c.details.holdExpiredTitle, tone: "danger" }); }
      else if (!onConflict(e)) toast({ title: errorCopy(e, locale), tone: "danger" });
      else onClose();
    } finally { setBusy(false); }
  }
  return (
    <Dialog open onClose={onClose} title={c.reschedDlg.title} className="sm:max-w-3xl"
      footer={<>
        <span className="mr-auto text-small text-fg-muted">{left > 0 ? fill(c.reschedDlg.left, { n: left }) : c.reschedDlg.none}</span>
        <Button variant="ghost" onClick={onClose}>{c.common.cancel}</Button>
        <Button disabled={!hold} loading={busy} onClick={submit}>{c.reschedDlg.confirm}</Button>
      </>}>
      {type.data ? <TimePicker type={type.data} holdId={hold?.bookingId ?? null} onHeld={setHold} fixedAdviser={b.adviser?.id ?? null} /> : <SkeletonList n={2} />}
    </Dialog>
  );
}

// ---------------------------------------------------------------- /book/manage/[token]
export function ManageByToken({ token }: { token: string }) {
  const key = ["bkg", "manage", token];
  const q = useQuery({ queryKey: key, queryFn: () => bk<Booking>(api.GET("/api/bookings/manage/{token}", { params: { path: { token } } })), retry: false });
  if (q.isPending) return <SkeletonList n={3} h="h-24" />;
  if (q.isError || !q.data) return <ResendLinkForm />;
  return <ManageBooking b={q.data} api={{ token, key }} />;
}

export function ResendLinkForm() {
  const { c, locale } = useBkg();
  const [v, setV] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  return (
    <StatePanel art={<IllusLinkExpired />} title={c.manage.invalid} body={c.manage.invalidBody}>
      {state === "done" ? <p role="status" className="bg-success-bg p-3 text-small text-success">{c.manage.resendDone}</p> : (
        <form noValidate className="flex w-full max-w-md flex-wrap items-end gap-2" onSubmit={async (e) => {
          e.preventDefault();
          const t = v.trim();
          if (!t) { setErr(c.details.eContact); return; }
          setErr(null); setState("busy");
          try { await bk(api.POST("/api/bookings/manage/resend", { body: t.includes("@") ? { email: t } : { phone: t }, headers: idem() })); setState("done"); }
          catch (x) { setErr(errorCopy(x, locale)); setState("idle"); }
        }}>
          <Field label={c.manage.contact} error={err ?? undefined} className="min-w-0 flex-1">{(p) => <Input id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid || undefined} value={v} onChange={(e) => setV(e.target.value)} autoComplete="email" />}</Field>
          <Button type="submit" loading={state === "busy"}>{c.manage.resend}</Button>
        </form>
      )}
    </StatePanel>
  );
}

// ---------------------------------------------------------------- Client portal (C12, BC6)
export function ClientBookingsList() {
  const { c, locale } = useBkg();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const up = useMyBookings("upcoming");
  const past = useMyBookings("past");
  const list = (q: typeof up, empty: boolean) => q.isPending ? <SkeletonList n={3} /> : q.isError ? (
    <StatePanel tone="danger" title={errorCopy(q.error, locale)}><Button variant="outline" onClick={() => q.refetch()}>{c.common.retry}</Button></StatePanel>
  ) : !q.data?.length ? (empty ? (
    <StatePanel art={<IllusNoSlots />} title={c.client.empty} body={c.client.emptyBody}>
      <div className="flex flex-wrap justify-center gap-2">
        <ButtonLink href={localHref(locale, "/book")} dots>{c.common.book}</ButtonLink>
        <ButtonLink href={localHref(locale, "/assistant")} variant="outline">{c.common.ask}</ButtonLink>
      </div>
    </StatePanel>
  ) : <p className="py-8 text-center text-small text-fg-muted">{c.client.empty}</p>) : (
    <ul className="grid gap-3 m-stagger">{q.data.map((b) => <BookingCard key={b.id} b={b} />)}</ul>
  );
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-h3">{c.client.title}</h1>
        <ButtonLink href={localHref(locale, "/book")} dots>{c.common.book}</ButtonLink>
      </div>
      <Tabs value={tab} onChange={(id) => setTab(id as "upcoming" | "past")} tabs={[
        { id: "upcoming", label: c.client.upcoming, count: up.data?.length, content: list(up, true) },
        { id: "past", label: c.client.past, count: past.data?.length, content: list(past, false) },
      ]} />
    </div>
  );
}

function BookingCard({ b }: { b: Booking }) {
  const { c, locale } = useBkg();
  const live = b.status === "confirmed";
  return (
    <li className="m-rise flex flex-wrap items-center gap-4 border border-border bg-surface p-4 sm:p-5">
      <div className="grid w-14 shrink-0 place-items-center bg-bg-subtle py-2 text-center">
        <span className="text-eyebrow uppercase text-fg-subtle">{new Intl.DateTimeFormat(locale, { month: "short", timeZone: "Africa/Kigali" }).format(new Date(b.startsAt))}</span>
        <span className="text-h4 tabular-nums">{new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "Africa/Kigali" }).format(new Date(b.startsAt))}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-label">{b.typeName[locale]}</p>
        <p className="text-small text-fg-muted tabular-nums">{formatTime(b.startsAt, locale)} · {c.modeShort[b.mode]}{b.adviser && <> · {b.adviser.name}</>}</p>
        <p className="mt-1 font-mono text-eyebrow text-fg-subtle">{b.reference}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <BkgStatus status={b.status} />
        {live && b.mode === "video" && b.can.join === "open" && <JoinButton size="sm" state="open" startsAt={b.startsAt} fetchUrl={() => joinUrl({ id: b.id })} />}
        <ButtonLink size="sm" variant="outline" href={localHref(locale, `/bookings/${b.id}`)}>{c.client.viewDetails}</ButtonLink>
      </div>
    </li>
  );
}

export function ClientBookingDetail({ id }: { id: string }) {
  const { c, locale } = useBkg();
  const key = ["bkg", "me", "one", id];
  const q = useQuery({ queryKey: key, queryFn: () => bk<Booking>(api.GET("/api/me/bookings/{id}", { params: { path: { id } } })), retry: false });
  if (q.isPending) return <SkeletonList n={3} h="h-24" />;
  if (q.isError || !q.data) return <StatePanel title={c.common.notFound}><ButtonLink href={localHref(locale, "/bookings")} variant="outline">{c.client.title}</ButtonLink></StatePanel>;
  return (
    <div className="grid gap-4">
      <Link href={localHref(locale, "/bookings")} className="inline-flex w-fit items-center gap-1 text-small text-fg-muted hover:text-fg"><Icon name="arrowRight" className="rotate-180" size={14} aria-hidden />{c.client.title}</Link>
      <ManageBooking b={q.data} api={{ id, key }} portal />
    </div>
  );
}

function ClientNotes({ b }: { b: Booking }) {
  const { c, locale } = useBkg();
  if (b.status !== "completed") return null;
  return (
    <>
      <div className="border border-border bg-surface p-5">
        <h2 className="mb-2 text-label">{c.client.notes}</h2>
        <p className="whitespace-pre-line text-small text-fg-muted">{b.clientSummary ?? c.client.noNotes}</p>
      </div>
      {(b.startLinks.length > 0 || b.quoteRef) && (
        <div className="bg-success-bg p-5">
          <h2 className="mb-3 text-label">{c.client.next}</h2>
          <div className="grid gap-2">
            {b.startLinks.map((s, i) => <ButtonLink key={s.slug} size="sm" variant={i === 0 ? "primary" : "outline"} href={localHref(locale, s.href)}>{i === 0 ? c.client.startRecommended : fill(c.client.nextService, { service: s.name })}</ButtonLink>)}
            {b.quoteRef && <ButtonLink size="sm" variant="outline" href={localHref(locale, `/requests/${b.quoteRef}?tab=quote`)}>{c.client.quote}</ButtonLink>}
          </div>
        </div>
      )}
    </>
  );
}

