"use client";
// Public booking (plan 11 §7.2–7.4, 7.7): type list, BookingFlow (topic → time → details → pay), TimePicker (also used by
// reschedule + book-on-behalf), CallbackForm. Hold/confirm contract; no PII in the URL; contact kept in sessionStorage.
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { useSession } from "@/lib/auth/session";
import { cx } from "@/shared/format";
import { errorCopy } from "@/lib/api/error-copy";
import { api } from "@/lib/api/client";
import { BkgError, bk, idem, holdSlot, useAdvisers, useSlots, useType, useTypes } from "@/lib/booking/api";
import { addDays, dayOf, formatDay, formatTime, isEmail, isPhone, viewerTz } from "@/shared/booking/rules";
import { TIME_ZONE } from "@/shared/format";
import type { Booking, ConsultationType, Hold, Mode, Slot } from "@/shared/booking/types";
import type { Locale } from "@/shared/i18n/config";
import { payKey } from "@/components/organisms/flow/pay-flow";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Checkbox, ErrorSummary, Field, Input, Radio, Select, Textarea } from "@/components/atoms/field";
import { Dialog, Sheet } from "@/components/atoms/dialog";
import { Icon } from "@/components/atoms/icon";
import { Avatar } from "@/components/atoms/misc";
import { useToast } from "@/components/atoms/toast";
import {
  Captcha, HoldTimer, IllusNoSlots, ModeIcon, ModeTag, OfflineBanner, PolicyNote, PriceBadge, SkeletonList, StatePanel, TzNote, fill, useBkg, useOnline,
} from "@/components/atoms/booking";

export type Topic = { slug: string; name: string };
export type ServiceOpt = { slug: string; name: string; family: string };
const LANGS: Locale[] = ["rw", "en", "fr"];
const LANG_NAME: Record<Locale, string> = { rw: "Kinyarwanda", en: "English", fr: "Français" };

// ---------------------------------------------------------------- /book: type list (F-BKG-01, BC1)
export function TypeList() {
  const { c, locale } = useBkg();
  const q = useTypes();
  const p = useUrlParams();
  const keep = ["service", "family"].filter((k) => p.get(k)).map((k) => `${k}=${encodeURIComponent(p.get(k)!)}`).join("&");
  return (
    <div className="grid gap-6">
      {q.isPending ? <div className="grid gap-4 md:grid-cols-2"><SkeletonList n={2} h="h-72" /></div>
        : q.isError ? <StatePanel tone="danger" title={errorCopy(q.error, locale)}><Button variant="secondary" onClick={() => q.refetch()}>{c.common.retry}</Button></StatePanel>
        : !q.data.length ? <StatePanel art={<IllusNoSlots />} title={c.types.empty}><ButtonLink href={localHref(locale, "/book/callback")}>{c.types.callbackLink}</ButtonLink></StatePanel>
        : (
          <ul className="grid gap-4 md:grid-cols-2 m-stagger">
            {q.data.map((t) => (
              <li key={t.id} className="flex flex-col gap-4 border border-border bg-surface p-6 m-lift">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-h4">{t.name[locale]}</h2>
                  {t.requiresPrepayment ? <span className="bg-warning-bg px-2.5 py-1 text-eyebrow text-warning">{c.types.prepay}</span> : <PriceBadge price={t.price} />}
                </div>
                <p className="text-body text-fg-muted">{t.description[locale]}</p>
                <dl className="grid grid-cols-2 gap-3 text-small">
                  <div><dt className="text-fg-subtle">{c.types.duration}</dt><dd className="tabular-nums">{fill(c.common.min, { n: t.durationMin })}</dd></div>
                  <div><dt className="text-fg-subtle">{c.types.modes}</dt><dd className="flex flex-wrap gap-1">{t.modes.map((m) => <ModeTag key={m} mode={m} />)}</dd></div>
                </dl>
                <ul className="grid gap-1.5 text-small">
                  {t.freeOncePerFamily && <li className="flex gap-2"><Icon name="check" size={16} className="text-success" aria-hidden />{c.types.freeOnce}</li>}
                  {t.price > 0 && <li className="flex gap-2"><Icon name="check" size={16} className="text-success" aria-hidden />{c.types.indicative}</li>}
                  {t.requiresPrepayment && <li className="text-warning">{c.types.prepayWhy}</li>}
                </ul>
                <ButtonLink href={`${localHref(locale, `/book/${t.slug}`)}${keep ? `?${keep}` : ""}`} dots className="mt-auto self-start">{c.types.choose}</ButtonLink>
              </li>
            ))}
          </ul>
        )}
      <p className="text-body">{c.types.callback} <Link href={localHref(locale, "/book/callback")} className="underline underline-offset-4">{c.types.callbackLink}</Link></p>
    </div>
  );
}

// ---------------------------------------------------------------- Step navigation that the browser Back button understands
type Step = "topic" | "time" | "details" | "pay";
function pushStep(patch: Record<string, string | null>) {
  const u = new URL(window.location.href);
  for (const [k, v] of Object.entries(patch)) { if (v) u.searchParams.set(k, v); else u.searchParams.delete(k); }
  window.history.pushState(null, "", u);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
export const ss = {
  get<T>(k: string): T | null { try { return JSON.parse(sessionStorage.getItem(k) ?? "null") as T; } catch { return null; } },
  set(k: string, v: unknown) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  del(k: string) { try { sessionStorage.removeItem(k); } catch { /* ignore */ } },
};

type Contact = { name: string; phone: string; email: string; whatsapp: boolean; privacy: boolean };
type Pending = { bookingId: string; reference: string; confirmKey: string; price: number; invoiceRef: string | null; token?: string; holdExpiresAt: string | null };

// ---------------------------------------------------------------- /book/[type] flow (F-BKG-04/06, V5)
export function BookingFlow({ slug, topics, services }: { slug: string; topics: Topic[]; services: ServiceOpt[] }) {
  const { c, locale } = useBkg();
  const router = useRouter();
  const p = useUrlParams();
  const type = useType(slug);
  const online = useOnline();
  const t = type.data;
  const steps: Step[] = t && (t.price > 0 || t.requiresPrepayment) ? ["topic", "time", "details", "pay"] : ["topic", "time", "details"];
  const step = (steps.includes(p.get("step") as Step) ? p.get("step") : "topic") as Step;
  const family = p.get("family") ?? services.find((s) => s.slug === p.get("service"))?.family ?? "";
  const mode = (p.get("mode") ?? "") as Mode | "";
  const language = (LANGS.includes(p.get("lang") as Locale) ? p.get("lang") : locale) as Locale;
  const holdId = p.get("hold");
  const [hold, setHold] = useState<Hold | null>(null);
  const [expired, setExpired] = useState(false);
  const [prepay, setPrepay] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  // Refresh / deep link from the assistant: re-read the hold from the server (404/410 → time step).
  const holdQ = useQuery({ queryKey: ["bkg", "hold", holdId], queryFn: () => bk<Hold>(api.GET("/api/bookings/{id}/hold", { params: { path: { id: holdId! } } })), enabled: !!holdId && hold?.bookingId !== holdId, retry: false });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hold is also edited locally; server refresh overwrites it
    if (holdQ.data) setHold(holdQ.data);
    if (holdQ.isError && step !== "time" && step !== "topic") setExpired(true);
  }, [holdQ.data, holdQ.isError, step]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe: reads browser-only state after mount
  useEffect(() => { setPending(ss.get<Pending>("bkg.pending")); }, []);
  useEffect(() => { heading.current?.focus(); }, [step]);

  if (type.isPending) return <SkeletonList n={3} h="h-28" />;
  if (type.isError || !t) return (
    <StatePanel art={<IllusNoSlots />} title={c.common.notFound} body={c.types.lead}>
      <ButtonLink href={localHref(locale, "/book")}>{c.common.book}</ButtonLink>
    </StatePanel>
  );

  const idx = steps.indexOf(step);
  const go = (s: Step, extra: Record<string, string | null> = {}) => pushStep({ step: s, ...extra });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="grid gap-5">
        <nav aria-label={t.name[locale]}>
          <ol className="flex flex-wrap gap-2">
            {steps.map((s, i) => (
              <li key={s} aria-current={s === step ? "step" : undefined}
                className={cx("inline-flex items-center gap-2 px-3 py-1.5 text-small", s === step ? "bg-surface text-fg-heading ring-2 ring-inset ring-gold-400" : i < idx ? "bg-secondary text-on-navy" : "border border-navy-700-300 text-fg-subtle")}>
                <span className={cx("grid size-5 place-items-center rounded-full text-eyebrow", i < idx ? "m-tick" : "")}>{i < idx ? <Icon name="check" size={13} aria-hidden /> : i + 1}</span>{c.steps[s]}
              </li>
            ))}
          </ol>
        </nav>
        <OfflineBanner />
        <section className="border border-border bg-surface p-5 sm:p-7 m-rise" key={step}>
          <h2 ref={heading} tabIndex={-1} className="mb-5 text-h4 outline-none">{c.steps[step]}</h2>
          {step === "topic" && <TopicStep t={t} topics={topics} services={services} family={family} mode={mode} language={language} onNext={(v) => go("time", v)} />}
          {step === "time" && (
            <TimePicker type={t} holdId={hold?.bookingId ?? null} onHeld={(h) => { setHold(h); setExpired(false); setUrlParams({ hold: h.bookingId }); }}
              footer={<div className="mt-6 flex flex-wrap justify-between gap-3">
                <Button variant="ghost" onClick={() => history.back()}>{c.common.back}</Button>
                <Button disabled={!hold || !online} onClick={() => go("details")}>{c.common.continue}</Button>
              </div>} />
          )}
          {step === "details" && (hold ? (
            <DetailsStep t={t} hold={hold} family={family} mode={(mode || t.modes[0]) as Mode} language={language} prepay={prepay}
              onExpired={() => setExpired(true)}
              onPrepay={() => setPrepay(true)}
              onDone={(r) => {
                if (r.booking.status === "pending_payment") {
                  const pend: Pending = { bookingId: r.booking.id, reference: r.booking.reference, confirmKey: r.confirmKey, price: r.booking.price, invoiceRef: r.invoiceRef ?? null, token: r.devManageToken, holdExpiresAt: r.booking.holdExpiresAt };
                  ss.set("bkg.pending", pend); setPending(pend); go("pay");
                } else finish(r.booking.reference, r.confirmKey, r.devManageToken);
              }} />
          ) : holdQ.isFetching ? <SkeletonList n={2} /> : <StatePanel title={c.time.expired}><Button onClick={() => go("time")}>{c.details.pickAgain}</Button></StatePanel>)}
          {step === "pay" && (pending ? <PayStep p={pending} onPaid={() => { ss.del("bkg.pending"); finish(pending.reference, pending.confirmKey, pending.token); }} />
            : <StatePanel title={c.common.notFound}><Button onClick={() => go("time")}>{c.details.pickAgain}</Button></StatePanel>)}
        </section>
      </div>
      <SummaryBar t={t} hold={hold} mode={(mode || null) as Mode | null} online={online} />
      <Dialog open={expired} onClose={() => setExpired(false)} title={c.details.holdExpiredTitle} description={c.details.holdExpiredBody}
        footer={<Button onClick={() => { setExpired(false); setHold(null); go("time", { hold: null }); }}>{c.details.pickAgain}</Button>} />
    </div>
  );

  function finish(ref: string, confirmKey: string, token?: string) {
    ss.set(`bkg.ck.${ref}`, { confirmKey, token });
    ss.del("bkg.contact");
    router.replace(localHref(locale, `/book/confirmed/${ref}`));
  }
}

function SummaryBar({ t, hold, mode, online }: { t: ConsultationType; hold: Hold | null; mode: Mode | null; online: boolean }) {
  const { c, locale } = useBkg();
  return (
    <aside aria-label={c.confirmed.reference} className="sticky bottom-0 z-10 -mx-gutter border-t border-border bg-bg/95 px-gutter pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:top-24 lg:mx-0 lg:border lg:bg-surface lg:p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:grid">
        <div className="min-w-0 flex-1">
          <p className="truncate text-label">{t.name[locale]}</p>
          <p className="text-small text-fg-muted tabular-nums">{fill(c.common.min, { n: t.durationMin })}{mode && <> · {c.modeShort[mode]}</>}</p>
        </div>
        <PriceBadge price={t.price} />
        {hold && <p className="text-small tabular-nums lg:order-none"><Icon name="calendar" size={14} className="mr-1 inline" aria-hidden />{formatDay(hold.startsAt, locale)} · {formatTime(hold.startsAt, locale)}</p>}
        {hold?.holdExpiresAt && <HoldTimer expiresAt={hold.holdExpiresAt} online={online} />}
      </div>
      <div className="mt-4 hidden lg:block"><PolicyNote /></div>
    </aside>
  );
}

// ---------------------------------------------------------------- Step 1 · topic, mode, language
function TopicStep({ t, topics, services, family, mode, language, onNext }: {
  t: ConsultationType; topics: Topic[]; services: ServiceOpt[]; family: string; mode: Mode | ""; language: Locale; onNext: (v: Record<string, string | null>) => void;
}) {
  const { c } = useBkg();
  const p = useUrlParams();
  const [f, setF] = useState(family);
  const [svc, setSvc] = useState(p.get("service") ?? "");
  const [m, setM] = useState<Mode | "">(mode || (t.modes.length === 1 ? t.modes[0] : ""));
  const [lang, setLang] = useState<Locale>(language);
  const [tried, setTried] = useState(false);
  const list = t.familySlugs.length ? topics.filter((x) => t.familySlugs.includes(x.slug)) : topics;
  return (
    <form className="grid gap-6" onSubmit={(e) => { e.preventDefault(); setTried(true); if (f && m) onNext({ family: f, service: svc || null, mode: m, lang }); }}>
      <fieldset>
        <legend className="mb-3 text-label">{c.topic.family}</legend>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
          {list.map((x) => (
            <label key={x.slug} className={cx("flex min-h-11 cursor-pointer items-center gap-3 border px-4 py-3 text-small m-press", f === x.slug ? "border-navy-700 bg-navy-50" : "border-border hover:border-navy-300")}>
              <input type="radio" name="family" value={x.slug} checked={f === x.slug} onChange={() => { setF(x.slug); setSvc(""); }} className="accent-navy-700" />
              <span className="min-w-0">{x.name}</span>
            </label>
          ))}
        </div>
        {tried && !f && <p className="mt-2 text-small text-danger" role="alert">{c.topic.needFamily}</p>}
      </fieldset>
      {f && (
        <Field label={c.topic.service} optional={c.common.optional}>{(p) => (<Select id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid || undefined} value={svc} onChange={(e) => setSvc(e.target.value)}>
            <option value="">{c.topic.serviceAny}</option>
            {services.filter((s) => s.family === f).map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          </Select>)}</Field>
      )}
      <fieldset>
        <legend className="mb-3 text-label">{c.topic.mode}</legend>
        <div className="flex flex-wrap gap-2">
          {t.modes.map((x) => (
            <label key={x} className={cx("inline-flex min-h-11 cursor-pointer items-center gap-2 border px-4 text-small m-press", m === x ? "border-secondary bg-secondary text-on-navy" : "border-border hover:border-navy-300")}>
              <input type="radio" name="mode" className="sr-only" checked={m === x} onChange={() => setM(x)} /><ModeIcon mode={x} />{c.mode[x]}
            </label>
          ))}
        </div>
        {tried && !m && <p className="mt-2 text-small text-danger" role="alert">{c.topic.mode}</p>}
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-label">{c.topic.language}</legend>
        <div className="flex flex-wrap gap-2">
          {LANGS.map((l) => (
            <label key={l} className={cx("inline-flex min-h-11 cursor-pointer items-center border px-4 text-small", lang === l ? "border-navy-700 bg-navy-50 text-navy-700" : "border-border")}>
              <input type="radio" name="lang" className="sr-only" checked={lang === l} onChange={() => setLang(l)} />{LANG_NAME[l]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex justify-end"><Button type="submit" dots>{c.common.continue}</Button></div>
    </form>
  );
}

// ---------------------------------------------------------------- Step 2 · adviser + calendar + slots (+ hold). Reused by reschedule / on-behalf.
export function TimePicker({ type: t, holdId, onHeld, footer, fixedAdviser, staff }: {
  type: ConsultationType; holdId: string | null; onHeld: (h: Hold) => void; footer?: ReactNode; fixedAdviser?: string | null; staff?: boolean;
}) {
  const { c, locale } = useBkg();
  const toast = useToast();
  const [today] = useState(() => dayOf(Date.now()));
  const horizon = Math.min(t.horizonDays, 35);
  const to = addDays(today, horizon);
  const [adviser, setAdviser] = useState<string | null>(fixedAdviser ?? null);
  const advisers = useAdvisers(t.slug);
  const q = useSlots(t.slug, today, to, adviser);
  const [date, setDate] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [heldAt, setHeldAt] = useState<string | null>(null);
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [nearestSlots, setNearest] = useState<Slot[] | null>(null);
  const [limited, setLimited] = useState(false);
  const slots = (q.data?.slots ?? []).filter((s) => !taken.has(s.startsAt));
  const byDay = new Map<string, Slot[]>();
  for (const s of slots) byDay.set(dayOf(s.startsAt), [...(byDay.get(dayOf(s.startsAt)) ?? []), s]);
  const active = date ?? [...byDay.keys()][0] ?? today;
  const daySlots = byDay.get(active) ?? [];

  async function pick(s: Slot) {
    if (busy) return;
    setBusy(s.startsAt); setNearest(null); setLimited(false);
    try {
      const h = await holdSlot({ type: t.slug, starts_at: s.startsAt, adviser_id: adviser, release: holdId });
      setHeldAt(s.startsAt); onHeld(h);
    } catch (e) {
      if (e instanceof BkgError && e.errorType === "slot_taken") {
        setTaken((x) => new Set(x).add(s.startsAt));
        setNearest(((e.data?.nearest as Slot[]) ?? []).filter((n) => n.startsAt !== s.startsAt));
      } else if (e instanceof BkgError && e.errorType === "rate_limited") setLimited(true);
      else toast({ title: errorCopy(e, locale), tone: "danger" });
    } finally { setBusy(null); }
  }

  return (
    <div className="grid gap-5">
      {!fixedAdviser && (
        <fieldset>
          <legend className="mb-2 text-label">{c.time.adviser}</legend>
          <div className="flex flex-wrap gap-2">
            {[{ id: null as string | null, name: c.time.anyAdviser, photo: undefined as string | undefined }, ...(advisers.data ?? []).map((a) => ({ id: a.id as string | null, name: a.name, photo: a.photo }))].map((a) => (
              <label key={a.id ?? "any"} className={cx("inline-flex min-h-11 cursor-pointer items-center gap-2 border py-1 pr-4 pl-1 text-small", adviser === a.id ? "border-navy-700 bg-navy-50" : "border-border")}>
                <input type="radio" name="adviser" className="sr-only" checked={adviser === a.id} onChange={() => { setAdviser(a.id); setDate(null); }} />
                {a.id ? <Avatar name={a.name} src={a.photo} size="sm" /> : <span className="grid size-8 place-items-center bg-gold-400 text-on-gold"><Icon name="users" size={15} aria-hidden /></span>}
                {a.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {q.isPending ? <div className="grid gap-3"><div className="h-56 m-shimmer" /><div className="h-24 m-shimmer" /></div>
        : q.isError ? <StatePanel tone="danger" title={errorCopy(q.error, locale)}><Button variant="secondary" onClick={() => q.refetch()}>{c.common.retry}</Button></StatePanel>
        : !slots.length ? (
          <StatePanel art={<IllusNoSlots />} title={c.time.none} body={q.data.nextAvailable ? fill(c.time.nextAvailable, { date: formatDay(q.data.nextAvailable, locale, TIME_ZONE, true) }) : fill(c.time.noMoreHorizon, { n: horizon })}>
            {!staff && <ButtonLink href={localHref(locale, "/book/callback")}>{c.common.callUs}</ButtonLink>}
          </StatePanel>
        ) : (
          <>
            <DayGrid today={today} days={horizon} byDay={byDay} active={active} onPick={(d) => { setDate(d); setNearest(null); }} />
            <fieldset>
              <legend className="mb-2 flex w-full flex-wrap items-baseline justify-between gap-2 text-label">
                <span>{c.time.slots} · {formatDay(`${active}T10:00:00Z`, locale, TIME_ZONE, true)}</span>
                <span className="text-eyebrow font-normal text-fg-subtle">{q.isFetching ? c.common.loading : c.common.updated}</span>
              </legend>
              {daySlots.length ? (
                <div role="radiogroup" aria-label={c.time.slots} className="grid grid-cols-3 gap-2 sm:grid-cols-4 m-stagger">
                  {daySlots.map((s) => (
                    <button key={s.startsAt} type="button" role="radio" aria-checked={heldAt === s.startsAt} onClick={() => pick(s)} disabled={!!busy}
                      className={cx("min-h-11 border text-small tabular-nums m-press", heldAt === s.startsAt ? "border-secondary bg-secondary text-on-navy" : "border-border bg-surface hover:border-navy-300", busy === s.startsAt && "m-shimmer")}>
                      {formatTime(s.startsAt, locale)}
                    </button>
                  ))}
                  {[...taken].filter((x) => dayOf(x) === active).map((x) => (
                    <span key={x} role="radio" aria-checked={false} aria-disabled className="grid min-h-11 place-items-center border border-dashed border-border text-small text-fg-subtle line-through tabular-nums m-shake">
                      {formatTime(x, locale)} <span className="sr-only">{c.time.full}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="grid gap-2 bg-bg-subtle p-4 text-small">
                  <p>{c.time.noneDay}</p>
                  {q.data.waitlist && !staff && <WaitlistForm type={t.slug} date={active} />}
                </div>
              )}
              <div className="mt-2"><TzNote at={daySlots[0]?.startsAt} /></div>
            </fieldset>
            {nearestSlots && (
              <div role="alert" className="bg-warning-bg p-4 m-rise">
                <p className="text-small text-warning">{c.time.taken}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {nearestSlots.map((n) => <Button key={n.startsAt} size="sm" variant="outline" onClick={() => { setDate(dayOf(n.startsAt)); pick(n); }}>{formatDay(n.startsAt, locale)} · {formatTime(n.startsAt, locale)}</Button>)}
                </div>
              </div>
            )}
            {limited && <p role="alert" className="text-small text-danger">{c.time.rateLimited}</p>}
            {heldAt && <p role="status" className="text-small text-success">{fill(c.time.heldFor, { time: `${formatDay(heldAt, locale)} ${formatTime(heldAt, locale)}` })}</p>}
          </>
        )}
      {footer}
    </div>
  );
}

/** Day grid with roving focus (arrow keys move by day/week; Enter picks). Days without slots are disabled. */
function DayGrid({ today, days, byDay, active, onPick }: { today: string; days: number; byDay: Map<string, Slot[]>; active: string; onPick: (d: string) => void }) {
  const { c, locale } = useBkg();
  const ref = useRef<HTMLDivElement>(null);
  const list = Array.from({ length: days + 1 }, (_, i) => addDays(today, i));
  const lead = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday-first
  const wd = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale === "rw" ? "en-GB" : locale, { weekday: "narrow", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 1 + i))));
  function onKey(e: KeyboardEvent, d: string) {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = addDays(d, step);
    ref.current?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus();
  }
  return (
    <div>
      <p className="mb-2 text-label">{c.time.calendar}</p>
      <div ref={ref} role="grid" aria-label={c.time.calendar} className="grid grid-cols-7 gap-1.5">
        {wd.map((w, i) => <span key={i} role="columnheader" className="text-center text-eyebrow text-fg-subtle">{w}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`x${i}`} />)}
        {list.map((d) => {
          const n = byDay.get(d)?.length ?? 0;
          return (
            <button key={d} type="button" data-day={d} role="gridcell" aria-selected={d === active} disabled={!n} tabIndex={d === active ? 0 : -1}
              onKeyDown={(e) => onKey(e, d)} onClick={() => onPick(d)}
              aria-label={`${formatDay(`${d}T10:00:00Z`, locale, TIME_ZONE, true)}${n ? ` · ${n}` : ` · ${c.time.full}`}`}
              className={cx("relative grid aspect-square min-h-10 place-items-center text-small tabular-nums", d === active ? "bg-secondary text-on-navy" : n ? "bg-bg-subtle hover:bg-navy-50" : "text-fg-subtle/60")}>
              {+d.slice(8)}
              {n > 0 && d !== active && <span aria-hidden className="absolute bottom-1 size-1 rounded-full bg-navy-700" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WaitlistForm({ type, date }: { type: string; date: string }) {
  const { c, locale } = useBkg();
  const [v, setV] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "err">("idle");
  const [err, setErr] = useState("");
  if (state === "done") return <p role="status" className="text-success">{c.time.waitlistDone}</p>;
  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={async (e) => {
      e.preventDefault();
      if (!isPhone(v, true) && !isEmail(v)) { setErr(c.details.eContact); return; }
      setState("busy");
      try { await bk(api.POST("/api/bookings/waitlist", { body: { type, date, contact: v }, headers: idem() })); setState("done"); }
      catch (x) { setErr(errorCopy(x, locale)); setState("err"); }
    }}>
      <Field label={c.time.waitlistContact} error={err} className="min-w-0 flex-1">{(p) => (<Input id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid || undefined} value={v} onChange={(e) => setV(e.target.value)} autoComplete="tel" />)}</Field>
      <Button size="sm" type="submit" loading={state === "busy"}>{c.time.waitlist}</Button>
    </form>
  );
}

// ---------------------------------------------------------------- Step 3 · details + intake + consent + captcha
type ConfirmRes = { booking: Booking; confirmKey: string; invoiceRef?: string | null; leadId?: string | null; devManageToken?: string };
function DetailsStep({ t, hold, family, mode, language, prepay, onExpired, onPrepay, onDone }: {
  t: ConsultationType; hold: Hold; family: string; mode: Mode; language: Locale; prepay: boolean; onExpired: () => void; onPrepay: () => void; onDone: (r: ConfirmRes) => void;
}) {
  const { c, locale } = useBkg();
  const { user } = useSession();
  const p = useUrlParams();
  const online = useOnline();
  const signedIn = !!user?.roles.includes("client" as never);
  const [contact, setContact] = useState<Contact>({ name: user?.name ?? "", phone: user?.phone ?? "", email: user?.email ?? "", whatsapp: false, privacy: false });
  const [intake, setIntake] = useState<Record<string, string | boolean>>({});
  const [captcha, setCaptcha] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [block, setBlock] = useState<{ kind: string; data?: Record<string, unknown> } | null>(null);
  const [key] = useState(() => crypto.randomUUID());
  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe: reads browser-only state after mount
  useEffect(() => { const saved = ss.get<Contact>("bkg.contact"); if (saved && !signedIn) setContact({ ...saved, privacy: false }); }, [signedIn]);
  const set = (k: keyof Contact, v: string | boolean) => { setContact((x) => { const n = { ...x, [k]: v }; ss.set("bkg.contact", { ...n, privacy: false }); return n; }); };
  const abroad = viewerTz() !== TIME_ZONE;

  function validate() {
    const e: Record<string, string> = {};
    if (!contact.name.trim()) e.name = c.details.eName;
    if (!contact.phone.trim() && !contact.email.trim()) e.phone = c.details.eContact;
    if (contact.phone.trim() && !isPhone(contact.phone, true)) e.phone = c.details.ePhone;
    if (contact.email.trim() && !isEmail(contact.email)) e.email = c.details.eEmail;
    for (const q of t.intakeSchema) if (q.required && !intake[q.id]) e[`q_${q.id}`] = c.details.eIntake;
    if (!contact.privacy) e.privacy = c.details.ePrivacy;
    if (!signedIn && !captcha) e.captcha = c.details.eCaptcha;
    return e;
  }
  async function submit(withPrepay = prepay) {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) { document.getElementById("details-errors")?.focus(); return; }
    setBusy(true); setBlock(null);
    try {
      const r = await bk<ConfirmRes>(api.POST("/api/bookings/{id}/confirm", { params: { path: { id: hold.bookingId } }, headers: idem(`${key}:${withPrepay}`), body: {
        contact: { name: contact.name.trim(), phone: contact.phone.trim() || undefined, email: contact.email.trim() || undefined }, intake,
        consents: { privacy: contact.privacy, whatsapp: contact.whatsapp }, captcha, language, mode, family: family || null, service: p.get("service"),
        source: p.get("src") === "assistant" ? "assistant" : "web", prepay: withPrepay,
      } }));
      onDone(r);
    } catch (x) {
      if (!(x instanceof BkgError)) { setBlock({ kind: "error" }); return; }
      if (x.errorType === "hold_expired") onExpired();
      else if (x.errorType === "prepayment_required") { onPrepay(); setBlock({ kind: "prepayment_required" }); }
      else if (x.errorType === "validation") {
        const f = (x.data?.fields ?? {}) as Record<string, string>;
        setErrors(Object.fromEntries(Object.keys(f).map((k) => [k === "contact" ? "phone" : k, k === "privacy" ? c.details.ePrivacy : k === "email" ? c.details.eEmail : k === "name" ? c.details.eName : c.details.ePhone])));
      } else if (x.errorType === "captcha_failed") setErrors({ captcha: c.details.eCaptcha });
      else setBlock({ kind: x.errorType ?? "error", data: x.data ?? undefined });
    } finally { setBusy(false); }
  }
  const list = Object.entries(errors).map(([field, message]) => ({ field: field === "privacy" ? "privacy" : field.startsWith("q_") ? field : field, message }));
  const familyName = family;

  return (
    <form noValidate className="grid gap-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      {list.length > 0 && <div id="details-errors" tabIndex={-1}><ErrorSummary title={c.details.errors} errors={list} /></div>}
      {block && <BlockNotice block={block} family={familyName} onBack={() => pushStep({ step: "topic" })} onPrepay={() => submit(true)} />}
      {signedIn && <p className="bg-bg-tint p-3 text-small">{fill(c.details.signedIn, { name: user!.name })} <Link className="underline" href={localHref(locale, "/settings")}>{c.details.editProfile}</Link></p>}
      <Field id="name" label={c.details.name} error={errors.name}>{(p) => (<Input id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid || undefined} value={contact.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" readOnly={signedIn} />)}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="phone" label={c.details.phone} hint={abroad ? c.details.phoneHint : "+250 7xx xxx xxx"} error={errors.phone}>{(p) => (<Input id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid || undefined} type="tel" inputMode="tel" value={contact.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" />)}</Field>
        <Field id="email" label={c.details.email} error={errors.email} optional={c.common.optional}>{(p) => (<Input id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid || undefined} type="email" value={contact.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />)}</Field>
      </div>
      <p className="-mt-2 text-eyebrow text-fg-subtle">{c.details.contactRule}</p>
      {t.intakeSchema.length > 0 && (
        <fieldset className="grid gap-4 bg-bg-subtle p-4">
          <legend className="px-1 text-label">{c.details.intake}</legend>
          {t.intakeSchema.map((q) => {
            const label = q.label[locale] || q.label.en;
            const err = errors[`q_${q.id}`];
            if (q.type === "checkbox") return <Checkbox key={q.id} label={label} checked={!!intake[q.id]} onChange={(e) => setIntake((x) => ({ ...x, [q.id]: e.target.checked }))} />;
            if (q.type === "radio" || q.type === "select") return (
              <fieldset key={q.id} id={`q_${q.id}`}>
                <legend className="mb-2 text-small font-medium">{label}{!q.required && <span className="text-fg-subtle"> ({c.common.optional})</span>}</legend>
                <div className="flex flex-wrap gap-3">{q.options?.map((o) => <Radio key={o} name={q.id} label={o} checked={intake[q.id] === o} onChange={() => setIntake((x) => ({ ...x, [q.id]: o }))} />)}</div>
                {err && <p className="mt-1 text-small text-danger">{err}</p>}
              </fieldset>
            );
            return <Field key={q.id} id={`q_${q.id}`} label={label} error={err} optional={q.required ? undefined : c.common.optional}>{(p) => (<Textarea id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid || undefined} rows={2} value={String(intake[q.id] ?? "")} onChange={(e) => setIntake((x) => ({ ...x, [q.id]: e.target.value }))} />)}</Field>;
          })}
        </fieldset>
      )}
      <div className="grid gap-3">
        <div id="privacy">
          <Checkbox label={<>{c.details.privacy} <Link href={localHref(locale, "/legal/privacy")} className="underline" target="_blank">{c.details.privacyLink}</Link></>} checked={contact.privacy} onChange={(e) => set("privacy", e.target.checked)} aria-invalid={!!errors.privacy} />
          {errors.privacy && <p className="mt-1 text-small text-danger">{errors.privacy}</p>}
        </div>
        <Checkbox label={c.details.whatsapp} checked={contact.whatsapp} onChange={(e) => set("whatsapp", e.target.checked)} />
      </div>
      {!signedIn && <div id="captcha"><Captcha value={captcha} onChange={setCaptcha} error={errors.captcha} /></div>}
      {prepay && <p className="bg-warning-bg p-3 text-small text-warning">{c.details.prepayment}</p>}
      <div className="flex flex-wrap justify-between gap-3">
        <Button type="button" variant="ghost" onClick={() => history.back()}>{c.common.back}</Button>
        <Button type="submit" loading={busy} aria-busy={busy} disabled={!online} dots>{t.price > 0 || prepay ? c.details.submitPaid : c.details.submit}</Button>
      </div>
    </form>
  );
}

function BlockNotice({ block, family, onBack, onPrepay }: { block: { kind: string; data?: Record<string, unknown> }; family: string; onBack: () => void; onPrepay: () => void }) {
  const { c, locale } = useBkg();
  if (block.kind === "free_limit_upcoming") return (
    <div role="alert" className="border border-info/30 bg-info-bg p-4 text-small">
      <p>{fill(c.details.freeLimit, { date: block.data?.date ? formatDay(String(block.data.date), locale, TIME_ZONE, true) : "", masked: String(block.data?.masked ?? "") })}</p>
      <ButtonLink href={localHref(locale, "/book/consult-60")} size="sm" variant="outline" className="mt-3">{c.details.freeLimitCta}</ButtonLink>
    </div>
  );
  if (block.kind === "free_used_family") return (
    <div role="alert" className="border border-border bg-bg-tint p-5">
      <p className="text-label">{fill(c.details.freeUsedTitle, { family: String(block.data?.family ?? family) })}</p>
      <p className="mt-1 text-small text-fg-muted">{c.details.freeUsedBody}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <ButtonLink href={localHref(locale, "/book/consult-60")} size="sm">{c.details.freeUsedPaid}</ButtonLink>
        <Button size="sm" variant="outline" type="button" onClick={onBack}>{c.details.freeUsedBack}</Button>
      </div>
    </div>
  );
  if (block.kind === "prepayment_required") return (
    <div role="alert" className="bg-warning-bg p-4 text-small text-warning">
      <p>{c.details.prepayment}</p>
      <Button size="sm" className="mt-3" type="button" onClick={onPrepay}>{c.details.submitPaid}</Button>
    </div>
  );
  return <p role="alert" className="bg-danger-bg p-3 text-small text-danger">{errorCopy(new BkgError(500, block.kind, "", null), locale)}</p>;
}

// ---------------------------------------------------------------- Step 4 · pay (F-BKG-06): MoMo/Airtel/card, payKey idempotency, polling
function PayStep({ p, onPaid }: { p: Pending; onPaid: () => void }) {
  const { c, locale } = useBkg();
  const [method, setMethod] = useState<"momo" | "airtel" | "card">("momo");
  const [phone, setPhone] = useState("");
  const [attempt, setAttempt] = useState(1);
  const [state, setState] = useState<"idle" | "starting" | "waiting" | "failed" | "late">("idle");
  const [err, setErr] = useState("");
  const online = useOnline();
  const holdOver = p.holdExpiresAt ? Date.parse(p.holdExpiresAt) : 0;

  async function pay() {
    if (method !== "card" && !isPhone(phone)) { setErr(c.pay.ePhone); return; }
    setErr(""); setState("starting");
    try {
      const r = await bk<{ transactionId: string }>(api.POST("/api/bookings/{id}/pay", { params: { path: { id: p.bookingId } }, body: { method, phone: method === "card" ? undefined : phone }, headers: idem(payKey(p.reference, method, attempt)) }));
      setState("waiting");
      for (let i = 0; i < 20; i++) {
        await new Promise((res) => setTimeout(res, 1500));
        const s = await bk<{ status: "pending" | "failed" | "success" | "late_refunded" }>(api.GET("/api/bookings/pay/{tx}", { params: { path: { tx: r.transactionId } } }));
        if (s.status === "success") return onPaid();
        if (s.status === "late_refunded") return setState("late");
        if (s.status === "failed") { setAttempt((a) => a + 1); return setState("failed"); }
      }
      setState("failed"); setAttempt((a) => a + 1);
    } catch (x) { setErr(errorCopy(x, locale)); setState("failed"); setAttempt((a) => a + 1); }
  }
  if (state === "late") return <StatePanel title={c.confirmed.lateRefund} />;
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-bg-subtle p-4">
        <span className="text-small text-fg-muted">{p.invoiceRef ? fill(c.pay.invoice, { ref: p.invoiceRef }) : c.pay.title}</span>
        <PriceBadge price={p.price} className="text-h4" />
      </div>
      <fieldset disabled={state === "starting" || state === "waiting"}>
        <legend className="mb-2 text-label">{c.pay.method}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(["momo", "airtel", "card"] as const).map((m) => (
            <label key={m} className={cx("flex min-h-11 cursor-pointer items-center gap-2 border px-4 text-small", method === m ? "border-navy-700 bg-navy-50" : "border-border")}>
              <input type="radio" name="pm" checked={method === m} onChange={() => setMethod(m)} className="accent-navy-700" /><Icon name={m === "card" ? "card" : "wallet"} size={16} aria-hidden />{c.pay[m]}
            </label>
          ))}
        </div>
      </fieldset>
      {method !== "card" && <Field label={c.pay.phone} error={err} hint="07x xxx xxxx">{(p) => (<Input id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid || undefined} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={state === "waiting"} />)}</Field>}
      {state === "waiting" && (
        <p role="status" className="flex items-start gap-2 bg-info-bg p-3 text-small text-info">
          <Icon name="refresh" size={16} className="mt-0.5 shrink-0 motion-safe:animate-spin" aria-hidden />
          {/* eslint-disable-next-line react-hooks/purity -- re-rendered by the payment poll; live clock is intended */}
          {holdOver && holdOver - 120_000 < Date.now() ? c.pay.waitingHold : c.pay.waiting}
        </p>
      )}
      {state === "failed" && <p role="alert" className="bg-danger-bg p-3 text-small text-danger">{err || c.pay.failed} {c.pay.changeMethod}.</p>}
      <div className="flex justify-end"><Button onClick={pay} loading={state === "starting" || state === "waiting"} disabled={!online} dots>{state === "failed" ? c.common.retry : c.pay.pay}</Button></div>
    </div>
  );
}

// ---------------------------------------------------------------- /book/callback + CallbackSheet (F-BKG-05)
export function CallbackForm({ topics, onDone }: { topics: Topic[]; onDone?: (id: string) => void }) {
  const { c, locale } = useBkg();
  const { user } = useSession();
  const [v, setV] = useState({ name: user?.name ?? "", phone: user?.phone ?? "", email: "", topic: "", times: [] as string[], language: locale as Locale, consent: false });
  const [captcha, setCaptcha] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [key] = useState(() => crypto.randomUUID());
  const slots = [c.callback.weekdays, c.callback.saturday].flatMap((d) => [c.callback.morning, c.callback.afternoon, c.callback.evening].map((p) => `${d} · ${p}`));
  if (done) return <StatePanel title={c.callback.done} body={fill(c.callback.doneBody, { id: done })} />;
  return (
    <form noValidate className="grid gap-5" onSubmit={async (e) => {
      e.preventDefault();
      const er: Record<string, string> = {};
      if (!v.name.trim()) er.name = c.details.eName;
      if (!isPhone(v.phone, true)) er.phone = c.details.ePhone;
      if (v.email && !isEmail(v.email)) er.email = c.details.eEmail;
      if (!v.topic) er.topic = c.topic.needFamily;
      if (!v.consent) er.consent = c.details.ePrivacy;
      if (!user && !captcha) er.captcha = c.details.eCaptcha;
      setErrors(er);
      if (Object.keys(er).length) return;
      setBusy(true);
      try {
        const r = await bk<{ id: string }>(api.POST("/api/consultation-requests", { body: { name: v.name, phone: v.phone, email: v.email || undefined, topic: v.topic, preferred_times: v.times, language: v.language, consent: v.consent, captcha }, headers: idem(key) }));
        setDone(r.id); onDone?.(r.id);
      } catch (x) { setErrors({ form: errorCopy(x, locale) }); } finally { setBusy(false); }
    }}>
      {Object.keys(errors).length > 0 && <ErrorSummary title={c.details.errors} errors={Object.entries(errors).map(([field, message]) => ({ field, message }))} />}
      <Field id="name" label={c.details.name} error={errors.name}>{(p) => (<Input id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid || undefined} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} autoComplete="name" />)}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="phone" label={c.details.phone} error={errors.phone}>{(p) => (<Input id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid || undefined} type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} autoComplete="tel" />)}</Field>
        <Field id="email" label={c.details.email} optional={c.common.optional} error={errors.email}>{(p) => (<Input id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid || undefined} type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} autoComplete="email" />)}</Field>
      </div>
      <Field id="topic" label={c.callback.topic} error={errors.topic}>{(p) => (<Select id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid || undefined} value={v.topic} onChange={(e) => setV({ ...v, topic: e.target.value })}><option value="">—</option>{topics.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}</Select>)}</Field>
      <fieldset>
        <legend className="mb-2 text-label">{c.callback.times}</legend>
        <div className="flex flex-wrap gap-2">
          {slots.map((s) => {
            const on = v.times.includes(s);
            return <button key={s} type="button" aria-pressed={on} onClick={() => setV({ ...v, times: on ? v.times.filter((x) => x !== s) : [...v.times, s] })} className={cx("min-h-11 border px-4 text-small m-press", on ? "border-secondary bg-secondary text-on-navy" : "border-border")}>{s}</button>;
          })}
        </div>
      </fieldset>
      <Field label={c.topic.language}>{(p) => (<Select id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid || undefined} value={v.language} onChange={(e) => setV({ ...v, language: e.target.value as Locale })}>{LANGS.map((l) => <option key={l} value={l}>{LANG_NAME[l]}</option>)}</Select>)}</Field>
      <div id="consent"><Checkbox label={c.details.privacy} checked={v.consent} onChange={(e) => setV({ ...v, consent: e.target.checked })} /></div>
      {!user && <div id="captcha"><Captcha value={captcha} onChange={setCaptcha} error={errors.captcha} /></div>}
      <div className="flex justify-end"><Button type="submit" loading={busy} dots>{c.callback.submit}</Button></div>
    </form>
  );
}
export function CallbackSheet({ topics }: { topics: Topic[] }) {
  const { c } = useBkg();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>{c.common.callUs}</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={c.callback.title} description={c.callback.lead}>{open && <CallbackForm topics={topics} />}</Sheet>
    </>
  );
}
