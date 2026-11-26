"use client";
import { useWs } from "@/lib/agent/ws";
// U8 Calendar (board 09: CA1 week, CA2 month + agenda, CA3 event drawer + ICS sync, PC1 phone agenda).
// URL: ?view=week|month|agenda&date=YYYY-MM-DD&event=<id>. No view → week on desktop, day pills on phone.
import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { localHref, type Locale } from "@/shared/i18n/config";
import { cx, formatDate } from "@/shared/format";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { useShortcut } from "@/lib/ops/shortcuts";
import { Icon } from "@/components/atoms/icon";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Input, Select, Textarea } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { Segmented } from "@/components/atoms/inputs";
import { PanelError, EmptyPanel } from "@/components/molecules/ops/ops";
import {
  EventDot,
  EVENT_BG,
  PageHead,
  SkeletonRows,
  useNow,
  type EventKind,
} from "@/components/atoms/agent";
import { useMyCases } from "@/lib/agent/api";
import {
  agentCalendar,
  type CalendarCopy,
} from "@/content/pages/agent-calendar";
import { fill } from "@/content/pages/agent-common";
import {
  addDays,
  layoutDay,
  monthGridStart,
  parseYmd,
  weekStart,
  ymd,
  useCalendar,
  useIcs,
  useObligation,
  useRegenerateIcs,
  usePhone,
  type CalEvent,
} from "@/lib/agent/f";

type View = "week" | "month" | "agenda";
const VIEWS: View[] = ["week", "month", "agenda"];
const KINDS: EventKind[] = ["deadline", "appointment", "field", "obligation"];
const H0 = 8,
  H1 = 18,
  ROW = 48; // 08:00–18:00, px per hour
const time = (t: number, l: Locale) =>
  formatDate(t, l, { hour: "2-digit", minute: "2-digit", hour12: false });
const dayLabel = (d: string, l: Locale, o: Intl.DateTimeFormatOptions) =>
  formatDate(parseYmd(d), l, o);

export function CalendarView() {
  const c = agentCalendar(useI18n().locale);
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const params = useUrlParams();
  const now = useNow();
  const [ics, setIcs] = useState(false);
  const raw = params.get("view");
  const view = VIEWS.includes(raw as View) ? (raw as View) : null;
  const today = now === null ? null : ymd(new Date(now));
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get("date") ?? "")
    ? params.get("date")!
    : today;
  const eventId = params.get("event");
  const v = view ?? "week";
  const [start, end] =
    date === null
      ? ["", ""]
      : v === "month"
        ? [monthGridStart(date), addDays(monthGridStart(date), 41)]
        : v === "agenda"
          ? [date, addDays(date, 13)]
          : [weekStart(date), addDays(weekStart(date), 6)];
  const q = useCalendar(start, end, date !== null);
  const step = (n: number) => {
    if (!date) return;
    const d = parseYmd(date);
    if (v === "month") d.setMonth(d.getMonth() + n, 1);
    else d.setDate(d.getDate() + n * (v === "week" ? 7 : 14));
    setUrlParams({ date: ymd(d) });
  };
  useShortcut("arrowleft", c.keys.prev, () => step(-1), "list");
  useShortcut("arrowright", c.keys.next, () => step(1), "list");
  useShortcut("t", c.keys.today, () => setUrlParams({ date: null }), "list");
  const open = (e: CalEvent) => setUrlParams({ event: e.id });
  const events = q.data ?? [];
  const inRange = eventId ? events.find((e) => e.id === eventId) : undefined;
  // Deep links (?event= from Today) may point outside the visible range: fall back to the unbounded list.
  const all = useCalendar("", "", !!eventId && q.isSuccess && !inRange);
  const selected = (eventId && (inRange ?? all.data?.find((e) => e.id === eventId))) || null;
  const period =
    date === null
      ? ""
      : v === "month"
        ? dayLabel(date, locale, { month: "long", year: "numeric" })
        : `${dayLabel(start, locale, { day: "numeric", month: "short" })} – ${dayLabel(end, locale, { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="pb-24 lg:pb-8">
      <PageHead
        title={c.title}
        actions={
          <Button variant="primary" data-guide="agent-cal-sync" onClick={() => setIcs(true)}>
            <Icon name="calendar" size={16} aria-hidden />
            <span className="max-sm:hidden">{c.sync}</span>
            <span className="sm:hidden">{c.syncShort}</span>
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented<View>
          label={c.view}
          value={v}
          onChange={(x) => setUrlParams({ view: x })}
          options={VIEWS.map((x) => ({ value: x, label: c.views[x] }))}
          className={cx(!view && "max-lg:hidden")}
        />
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label={c.prev}
            onClick={() => step(-1)}
          >
            <Icon
              name="chevronDown"
              size={18}
              aria-hidden
              className="rotate-90"
            />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={c.next}
            onClick={() => step(1)}
          >
            <Icon
              name="chevronDown"
              size={18}
              aria-hidden
              className="-rotate-90"
            />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setUrlParams({ date: null })}
            aria-keyshortcuts="t"
          >
            {c.today}
          </Button>
        </div>
        <p className="text-label-lg"aria-live="polite">
          {period}
        </p>
      </div>
      <ul aria-label={c.legend} className="mb-4 flex flex-wrap gap-x-4 gap-y-1">
        {KINDS.map((k) => (
          <li key={k}>
            <EventDot kind={k} label />
          </li>
        ))}
      </ul>
      {date === null || q.isPending ? (
        <SkeletonRows n={6} />
      ) : q.isError ? (
        <PanelError what={c.loadErr} onRetry={() => q.refetch()} />
      ) : (
        <div className="m-rise"key={`${v}-${start}`}>
          {!events.length && v !== "month" && (
            <EmptyPanel title={c.empty} body={c.emptyBody} />
          )}
          {v === "week" && events.length > 0 && (
            <>
              <div className={cx(!view && "max-lg:hidden")}>
                <WeekGrid
                  c={c}
                  start={start}
                  events={events}
                  now={now}
                  today={today}
                  onOpen={open}
                />
              </div>
              {!view && (
                <div className="lg:hidden">
                  <DayPills
                    c={c}
                    start={start}
                    date={date}
                    today={today}
                    events={events}
                    onOpen={open}
                    now={now}
                  />
                </div>
              )}
            </>
          )}
          {v === "month" && (
            <Month
              c={c}
              start={start}
              date={date}
              today={today}
              events={events}
              onOpen={open}
              now={now}
            />
          )}
          {v === "agenda" && events.length > 0 && (
            <Agenda c={c} events={events} onOpen={open} now={now} />
          )}
        </div>
      )}
      <EventDrawer
        c={c}
        e={selected}
        onClose={() => setUrlParams({ event: null })}
      />
      <IcsDialog c={c} open={ics} onClose={() => setIcs(false)} />
    </div>
  );
}

// ---------------------------------------------------------------- CA1 week
function WeekGrid({
  c,
  start,
  events,
  now,
  today,
  onOpen,
}: {
  c: CalendarCopy;
  start: string;
  events: CalEvent[];
  now: number | null;
  today: string | null;
  onOpen: (e: CalEvent) => void;
}) {
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const hours = Array.from({ length: H1 - H0 }, (_, i) => H0 + i);
  const nowTop =
    now === null
      ? null
      : (new Date(now).getHours() + new Date(now).getMinutes() / 60 - H0) * ROW;
  const cols = "grid-cols-[3.5rem_repeat(7,minmax(6.5rem,1fr))]";
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={c.grid}
      className="overflow-x-auto border border-border bg-white"
    >
      <div className="min-w-[49rem]">
        <div className={cx("grid border-b border-border", cols)}>
          <span />
          {days.map((d) => (
            <div
              key={d}
              className={cx(
                "px-2 py-2 text-center text-small",
                d === today && "bg-tint font-medium text-navy-800",
              )}
              aria-current={d === today ? "date" : undefined}
            >
              {dayLabel(d, locale, { weekday: "short" })}
              <span className="block text-label tabular">
                {dayLabel(d, locale, { day: "numeric", month: "short" })}
              </span>
            </div>
          ))}
        </div>
        <div className={cx("grid border-b border-border", cols)}>
          <span className="self-center px-1 text-[0.6875rem] text-fg-subtle">
            {c.allDay}
          </span>
          {days.map((d) => (
            <ul
              key={d}
              className={cx(
                "grid min-h-10 content-start gap-1 border-l border-border p-1",
                d === today && "bg-tint/40",
              )}
            >
              {events
                .filter((e) => e.day === d && e.allDay)
                .map((e) => (
                  <li key={e.id}>
                    <Chip e={e} now={now} onOpen={onOpen} />
                  </li>
                ))}
            </ul>
          ))}
        </div>
        <div className={cx("relative grid", cols)}>
          <div>
            {hours.map((h) => (
              <div
                key={h}
                style={{ height: ROW }}
                className="pr-2 text-right text-[0.6875rem] text-fg-subtle tabular"
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {days.map((d) => {
            const placed = layoutDay(
              events.filter((e) => e.day === d && !e.allDay),
            );
            const past = today !== null && d < today;
            return (
              <div
                key={d}
                className={cx(
                  "relative border-l border-border",
                  d === today && "bg-tint/40",
                  past && "bg-bg-subtle/60",
                )}
                style={{ height: (H1 - H0) * ROW }}
              >
                {hours.map((h) => (
                  <span
                    key={h}
                    aria-hidden
                    className="absolute inset-x-0 border-t border-border/60"
                    style={{ top: (h - H0) * ROW }}
                  />
                ))}
                {placed.map(({ e, col, cols: n }) => {
                  const s = new Date(e.at!);
                  const top = Math.max(
                    0,
                    Math.min(
                      (H1 - H0) * ROW - 24,
                      (s.getHours() + s.getMinutes() / 60 - H0) * ROW,
                    ),
                  );
                  const height = Math.max(
                    24,
                    ((e.end! - e.at!) / 3600_000) * ROW - 2,
                  );
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => onOpen(e)}
                      style={{
                        top,
                        height,
                        left: `calc(${(col / n) * 100}% + 2px)`,
                        width: `calc(${100 / n}% - 4px)`,
                      }}
                      className={cx(
                        "absolute overflow-hidden border px-1.5 py-1 text-left text-[0.6875rem] leading-tight m-press",
                        EVENT_BG[e.kind],
                        now !== null && e.end! < now && "!border-border !bg-ink-100 !text-fg-muted",
                      )}
                    >
                      <span className="flex items-center gap-1 font-medium">
                        <EventDot kind={e.kind} />
                        <span className="truncate">{e.title}</span>
                      </span>
                      <span className="block truncate tabular">
                        {time(e.at!, locale)}
                        {e.location ? ` · ${e.location}` : ""}
                      </span>
                    </button>
                  );
                })}
                {d === today &&
                  nowTop !== null &&
                  nowTop >= 0 &&
                  nowTop <= (H1 - H0) * ROW && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-danger"
                      style={{ top: nowTop }}
                    >
                      <span className="absolute -top-1.5 -left-1 size-2.5 rounded-full bg-danger" />
                    </span>
                  )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Chip({
  e,
  now,
  onOpen,
}: {
  e: CalEvent;
  now: number | null;
  onOpen: (e: CalEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(e)}
      className={cx(
        "flex w-full items-center gap-1 border px-1.5 py-0.5 text-left text-[0.6875rem] m-press",
        EVENT_BG[e.kind],
        now !== null && e.at !== null && e.at < now && "!border-border !bg-ink-100 !text-fg-muted",
      )}
    >
      <EventDot kind={e.kind} />
      <span className="min-w-0 truncate font-medium tabular">
        {e.ref ?? e.title}
      </span>
      {/* All-day deadlines carry no meaningful clock time (it's the SLA instant), so none is shown. */}
    </button>
  );
}

// ---------------------------------------------------------------- agenda rows (CA2 side list, agenda view, PC1)
function Row({
  e,
  now,
  onOpen,
}: {
  e: CalEvent;
  now: number | null;
  onOpen: (e: CalEvent) => void;
}) {
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const c = agentCalendar(locale);
  const past = now !== null && (e.end ?? e.at ?? 0) < now;
  return (
    <button
      type="button"
      onClick={() => onOpen(e)}
      className={cx(
        "flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-navy-50 m-press",
        past && "text-fg-muted",
      )}
    >
      <EventDot kind={e.kind} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label">
          {e.title}
          {e.client ? `, ${e.client}` : ""}
        </span>
        <span className="block text-small text-fg-subtle tabular">
          {e.at === null
            ? c.allDay
            : e.allDay
              ? time(e.at, locale)
              : `${time(e.at, locale)} – ${time(e.end!, locale)}`}
          {e.ref ? ` · ${e.ref}` : ""}
          {e.state === "done" || e.state === "skipped"
            ? ` · ${c.drawer.states[e.state]}`
            : ""}
        </span>
      </span>
      <Icon
        name="chevronDown"
        size={16}
        aria-hidden
        className="-rotate-90 text-fg-subtle"
      />
    </button>
  );
}
function DayList({
  c,
  day,
  events,
  now,
  onOpen,
}: {
  c: CalendarCopy;
  day: string;
  events: CalEvent[];
  now: number | null;
  onOpen: (e: CalEvent) => void;
}) {
  const list = events.filter((e) => e.day === day);
  if (!list.length)
    return <p className="px-3 py-4 text-small text-fg-subtle">{c.emptyDay}</p>;
  return (
    <ul className="grid divide-y divide-border m-stagger">
      {list.map((e, i) => (
        <li key={e.id} style={{ ["--i" as string]: i }}>
          <Row e={e} now={now} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}

function Agenda({
  c,
  events,
  now,
  onOpen,
}: {
  c: CalendarCopy;
  events: CalEvent[];
  now: number | null;
  onOpen: (e: CalEvent) => void;
}) {
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const days = [...new Set(events.map((e) => e.day))].sort();
  return (
    <div className="grid gap-4">
      {days.map((d) => (
        <section
          key={d}
          aria-labelledby={`ag-${d}`}
          className="border border-border bg-white p-2"
        >
          <h2 id={`ag-${d}`} className="px-3 pt-2 text-label">
            {dayLabel(d, locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h2>
          <DayList c={c} day={d} events={events} now={now} onOpen={onOpen} />
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- PC1 phone
function DayPills({
  c,
  start,
  date,
  today,
  events,
  now,
  onOpen,
}: {
  c: CalendarCopy;
  start: string;
  date: string;
  today: string | null;
  events: CalEvent[];
  now: number | null;
  onOpen: (e: CalEvent) => void;
}) {
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid gap-3">
      <div
        role="tablist"
        aria-label={fill(c.week, {
          d: dayLabel(start, locale, { day: "numeric", month: "short" }),
        })}
        className="grid grid-cols-7 gap-1"
      >
        {days.map((d) => {
          const n = events.filter((e) => e.day === d).length;
          return (
            <button
              key={d}
              role="tab"
              type="button"
              aria-selected={d === date}
              onClick={() => setUrlParams({ date: d })}
              className={cx(
                "grid justify-items-center gap-0.5 border py-2 text-small m-press",
                d === date
                  ? "border-navy-700 bg-tint text-navy-800"
                  : "border-border bg-white",
                d === today && d !== date && "font-semibold",
              )}
            >
              <span className="text-[0.6875rem]">
                {dayLabel(d, locale, { weekday: "short" })}
              </span>
              <span className="text-label tabular">
                {parseYmd(d).getDate()}
              </span>
              <span
                aria-hidden
                className={cx(
                  "size-1 rounded-full",
                  n ? "bg-navy-700" : "bg-transparent",
                )}
              />
              <span className="sr-only">{fill(c.events, { n })}</span>
            </button>
          );
        })}
      </div>
      <section
        role="tabpanel"
        aria-label={dayLabel(date, locale, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
        className="border border-border bg-white p-1"
      >
        <h2 className="px-3 pt-2 text-label">
          {dayLabel(date, locale, {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </h2>
        <DayList c={c} day={date} events={events} now={now} onOpen={onOpen} />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- CA2 month
function Month({
  c,
  start,
  date,
  today,
  events,
  now,
  onOpen,
}: {
  c: CalendarCopy;
  start: string;
  date: string;
  today: string | null;
  events: CalEvent[];
  now: number | null;
  onOpen: (e: CalEvent) => void;
}) {
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const month = parseYmd(date).getMonth();
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div
        role="grid"
        aria-label={c.monthGrid}
        className="border border-border bg-white p-2"
      >
        <div role="row"className="grid grid-cols-7">
          {cells.slice(0, 7).map((d) => (
            <span
              role="columnheader"
              key={d}
              className="py-1 text-center text-[0.6875rem] text-fg-subtle uppercase"
            >
              {dayLabel(d, locale, { weekday: "short" })}
            </span>
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5].map((w) => (
          <div role="row"key={w} className="grid grid-cols-7">
            {cells.slice(w * 7, w * 7 + 7).map((d) => {
              const evs = events.filter((e) => e.day === d);
              const kinds = [...new Set(evs.map((e) => e.kind))];
              return (
                <div role="gridcell" key={d} aria-selected={d === date}>
                  <button
                    type="button"
                    onClick={() => setUrlParams({ date: d })}
                    aria-label={`${dayLabel(d, locale, { weekday: "long", day: "numeric", month: "long" })}, ${fill(c.events, { n: evs.length })}`}
                    className={cx(
                      "grid h-14 w-full content-start justify-items-center gap-1 pt-1.5 text-small m-press sm:h-16",
                      parseYmd(d).getMonth() !== month && "text-fg-subtle",
                      d === date
                        ? "bg-secondary text-on-navy"
                        : d === today
                          ? "bg-tint"
                          : "hover:bg-navy-50",
                    )}
                  >
                    <span className="tabular">{parseYmd(d).getDate()}</span>
                    <span className="flex items-center gap-0.5">
                      {kinds.slice(0, 3).map((k) => (
                        <EventDot key={k} kind={k} />
                      ))}
                      {evs.length > 3 && (
                        <span className="text-[0.625rem] tabular">
                          +{evs.length - 3}
                        </span>
                      )}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <section
        aria-labelledby="sel-day"
        className="border border-border bg-white p-2"
      >
        <h2 id="sel-day"className="px-3 pt-2 text-label">
          {fill(c.agendaFor, {
            d: dayLabel(date, locale, {
              weekday: "short",
              day: "numeric",
              month: "short",
            }),
          })}
        </h2>
        <DayList c={c} day={date} events={events} now={now} onOpen={onOpen} />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- CA3 event drawer + obligation actions
function EventDrawer({
  c,
  e,
  onClose,
}: {
  c: CalendarCopy;
  e: CalEvent | null;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const { wsHref } = useWs();
  const phone = usePhone();
  const toast = useToast();
  const ob = useObligation();
  const cases = useMyCases();
  const [mode, setMode] = useState<null | "done" | "link" | "skip">(null);
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | undefined>();
  const close = () => {
    setMode(null);
    setNote("");
    setErr(undefined);
    onClose();
  };
  if (!e) return <Dialog open={false} onClose={close} title={c.drawer.title} />;
  const id = e.id;
  const settled =
    e.state === "done" || e.state === "skipped" || e.state === "linked";
  const run = () => {
    if (!mode) return;
    if (mode === "skip" && !note.trim()) return setErr(c.drawer.reasonReq);
    const pick = code || e.ref || "";
    const body =
      mode === "done"
        ? { note: note || null }
        : mode === "skip"
          ? { reason: note }
          : { code: pick };
    ob.mutate(
      { id, action: mode, body },
      {
        onSuccess: () => {
          toast({
            title:
              mode === "link"
                ? fill(c.drawer.ok.link, { r: pick })
                : c.drawer.ok[mode],
            tone: "success",
          });
          setMode(null);
          setNote("");
        },
        onError: () => toast({ title: c.drawer.failed, tone: "danger" }),
      },
    );
  };
  return (
    <Dialog
      open
      onClose={close}
      side={phone ? "bottom" : "right"}
      title={c.drawer.title}
    >
      <div className="grid gap-4">
        <span
          className={cx(
            "inline-flex h-6 w-fit items-center gap-1.5 border px-2.5 text-eyebrow font-medium",
            EVENT_BG[e.kind],
          )}
        >
          <EventDot kind={e.kind} label />
        </span>
        <h3 className="text-card-title">
          {e.title}
          {e.client ? `, ${e.client}` : ""}
        </h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-small">
          <dt>
            <Icon name="calendar" size={16} aria-hidden />
            <span className="sr-only">{c.drawer.when}</span>
          </dt>
          <dd>
            {e.at === null
              ? `${dayLabel(e.day, locale, { dateStyle: "full" })} · ${c.allDay}`
              : e.allDay
                ? formatDate(e.at, locale, {
                    dateStyle: "full",
                    timeStyle: "short",
                  })
                : `${formatDate(e.at, locale, { dateStyle: "full", timeStyle: "short" })} – ${time(e.end!, locale)}`}
          </dd>
          {e.location && (
            <>
              <dt>
                <Icon name="mapPin" size={16} aria-hidden />
                <span className="sr-only">{c.drawer.where}</span>
              </dt>
              <dd>{e.location}</dd>
            </>
          )}
          {e.ref && (
            <>
              <dt>
                <Icon name="briefcase" size={16} aria-hidden />
                <span className="sr-only">{c.drawer.case}</span>
              </dt>
              <dd className="tabular">
                {e.ref} · {e.service}
              </dd>
            </>
          )}
          {e.joinUrl && (
            <>
              <dt>
                <Icon name="globe" size={16} aria-hidden />
              </dt>
              <dd>
                <a
                  href={e.joinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-navy-700 underline"
                >
                  {c.drawer.join}
                </a>
              </dd>
            </>
          )}
          {settled && (
            <>
              <dt>
                <Icon name="check" size={16} aria-hidden />
                <span className="sr-only">{c.drawer.state}</span>
              </dt>
              <dd className="font-medium text-success">
                {fill(c.drawer.states[e.state] ?? e.state, { r: e.ref ?? "" })}
              </dd>
            </>
          )}
        </dl>
        {e.ref && (
          <Link
            href={localHref(locale, wsHref(`/agent/cases/${e.ref}`))}
            className="inline-flex w-fit items-center gap-1.5 text-label text-navy-700 underline underline-offset-4"
          >
            {c.drawer.openCase}
            <Icon name="arrowUpRight" size={14} aria-hidden />
          </Link>
        )}
        {e.kind === "obligation" && !settled && (
          <section
            className="grid gap-3 bg-bg-subtle p-3"
            aria-label={c.drawer.obligation}
          >
            <p className="text-label">{c.drawer.obligation}</p>
            <div className="flex flex-wrap gap-2">
              {(["done", "link", "skip"] as const).map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={
                    mode === m
                      ? "primary"
                      : m === "done"
                        ? "secondary"
                        : "outline"
                  }
                  aria-pressed={mode === m}
                  onClick={() => (
                    setMode(mode === m ? null : m),
                    setErr(undefined)
                  )}
                >
                  {c.drawer[m]}
                </Button>
              ))}
            </div>
            {mode && (
              <form
                className="grid gap-3 m-rise"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  run();
                }}
              >
                {mode === "link" ? (
                  <Field label={c.drawer.linkPick}>
                    {(f) => (
                      <Select
                        id={f.id}
                        value={code || e.ref || ""}
                        onChange={(x) => setCode(x.target.value)}
                      >
                        {(cases.data ?? []).map((k) => (
                          <option key={k.ref} value={k.ref}>
                            {k.ref} · {k.client}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                ) : (
                  <Field
                    label={
                      mode === "skip" ? c.drawer.skipReason : c.drawer.doneNote
                    }
                    error={err}
                  >
                    {(f) =>
                      mode === "skip" ? (
                        <Textarea
                          id={f.id}
                          aria-invalid={f.invalid}
                          aria-describedby={f.describedBy}
                          value={note}
                          onChange={(x) => setNote(x.target.value)}
                        />
                      ) : (
                        <Input
                          id={f.id}
                          value={note}
                          onChange={(x) => setNote(x.target.value)}
                        />
                      )
                    }
                  </Field>
                )}
                <div className="flex gap-2">
                  <Button type="submit" size="sm" loading={ob.isPending}>
                    {c.drawer.confirm}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setMode(null)}
                  >
                    {c.drawer.cancel}
                  </Button>
                </div>
              </form>
            )}
          </section>
        )}
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------- ICS sync
function IcsDialog({
  c,
  open,
  onClose,
}: {
  c: CalendarCopy;
  open: boolean;
  onClose: () => void;
}) {
  const q = useIcs(open);
  const regen = useRegenerateIcs();
  const toast = useToast();
  const phone = usePhone();
  const [confirm, setConfirm] = useState(false);
  const url = q.data?.url ?? "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: c.ics.copied, tone: "success" });
    } catch {
      toast({ title: c.ics.copyFailed, tone: "danger" });
    }
  };
  return (
    <Dialog
      open={open}
      onClose={() => (setConfirm(false), onClose())}
      side={phone ? "bottom" : undefined}
      title={c.ics.title}
      description={c.ics.body}
    >
      <div className="grid gap-4">
        {q.isPending ? (
          <SkeletonRows n={1} />
        ) : q.isError ? (
          <PanelError what={c.ics.url} onRetry={() => q.refetch()} />
        ) : (
          <Field label={c.ics.url} hint={c.ics.warn}>
            {(f) => (
              <div className="flex gap-2">
                <Input
                  id={f.id}
                  aria-describedby={f.describedBy}
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 tabular"
                />
                <Button variant="primary" onClick={copy}>
                  {c.ics.copy}
                </Button>
              </div>
            )}
          </Field>
        )}
        {confirm ? (
          <div
            role="alert"
            className="grid gap-3 border border-warning/40 bg-warning-bg p-3 m-rise"
          >
            <p className="flex items-start gap-2 text-small">
              <Icon
                name="shield"
                size={16}
                aria-hidden
                className="mt-0.5 text-warning"
              />
              {c.ics.regenWarn}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="danger"
                loading={regen.isPending}
                onClick={() =>
                  regen.mutate(undefined, {
                    onSuccess: () => {
                      setConfirm(false);
                      toast({ title: c.ics.regenDone, tone: "success" });
                    },
                  })
                }
              >
                {c.ics.regenConfirm}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirm(false)}
              >
                {c.drawer.cancel}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-fit"
            onClick={() => setConfirm(true)}
            disabled={!url}
          >
            <Icon name="refresh" size={14} aria-hidden />
            {c.ics.regen}
          </Button>
        )}
      </div>
    </Dialog>
  );
}
