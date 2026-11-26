"use client";
// U2 day plan (plan §7.3, board 02 FH1/FH2/FH4/FH5): list + schematic map, offers on top, prepare status,
// local-first (encrypted bundle + queued ops), every state from §3.3.
import { useState } from "react";
import { cx, formatDate, formatRelative } from "@/shared/format";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { Skeleton } from "@/components/atoms/feedback";
import { errorCopy } from "@/lib/api/error-copy";
import { useFieldCopy, fill } from "@/lib/field/copy";
import { useCopyA } from "@/lib/field/copy-a";
import { useDayPlan, useFieldMe } from "@/lib/field/api";
import { useEngine } from "@/lib/field/sync";
import { usePrefs } from "@/lib/field/prefs";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { expiryState } from "@/lib/field/store";
import { distanceM, getFix } from "@/lib/field/geo";
import { sortVisits, travel } from "@/lib/field/a";
import type { FieldVisit } from "@/shared/field/types";
import { FieldHeader, useFieldBase, useNow, duration, hhmm } from "@/components/atoms/field-agent";
import { ArtClipboard, ArtCloudDown, FieldEmpty } from "@/components/atoms/field-art";
import { VisitRow } from "@/components/organisms/field/visit-row";
import { FieldOfferCard } from "@/components/organisms/field/field-offer-card";
import { DayMap } from "@/components/molecules/field/field";

type Pt = { lat: number; lng: number };

export function DayPlan() {
  const { c, locale } = useFieldCopy();
  const a = useCopyA();
  const base = useFieldBase();
  const params = useUrlParams();
  const view = params.get("view") === "map" ? "map" : "list";
  const day = params.get("day") === "tomorrow" ? "tomorrow" : "today";
  const plan = useDayPlan(day);
  const me = useFieldMe();
  const eng = useEngine();
  const prefs = usePrefs();
  const now = useNow();
  const [fix, setFix] = useState<Pt | null>(null);
  const [locating, setLocating] = useState(false);

  const locate = async () => {
    setLocating(true);
    const r = await getFix({ battery: prefs.battery }); // one-shot, on tap only — never tracking
    if (r.fix) setFix({ lat: r.fix.lat, lng: r.fix.lng });
    setLocating(false);
  };
  const dist = (v: FieldVisit) => (fix && v.lat !== null && v.lng !== null ? distanceM(fix, { lat: v.lat, lng: v.lng }) : null);

  const all = plan.visits ?? [];
  const offers = all.filter((v) => v.status === "offered" || v.local.accepted);
  const rest = sortVisits(all.filter((v) => !offers.includes(v) && v.status !== "declined"), fix);
  const active = rest.filter((v) => v.status !== "cancelled");
  const est = travel(active, fix);
  const ex = expiryState(eng.meta, eng.now);

  const header = (
    <FieldHeader
      title={day === "today" ? a.title : a.titleTomorrow}
      sub={<>{me.data?.firstName && <span className="block">{fill(a.hello, { name: me.data.firstName })}</span>}
        <span className="tabular">{formatDate(`${plan.date}T12:00:00+02:00`, locale, { weekday: "long", day: "numeric", month: "long" })}</span>
        {all.length > 0 && <span className="block tabular">{est.meters ? fill(a.summary, { n: active.length, time: duration(est.ms) }) : fill(a.summaryNoDist, { n: active.length })}</span>}</>}
      action={plan.online && (
        <Button variant="outline" size="icon" aria-label={a.refresh} onClick={() => void plan.refetch()} disabled={plan.isFetching}>
          <Icon name="refresh" size={18} aria-hidden className={cx(plan.isFetching && "animate-spin motion-reduce:animate-none")} />
        </Button>
      )}
    />
  );

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented label={a.today} options={[["today", a.today], ["tomorrow", a.tomorrow]]} value={day} onChange={(d) => setUrlParams({ day: d === "today" ? null : d })} />
      <Segmented label={a.map} options={[["list", a.list], ["map", a.map]]} value={view} onChange={(v) => setUrlParams({ view: v === "list" ? null : v })} />
      <Button variant="ghost" size="sm" onClick={locate} loading={locating} className="ml-auto">
        {!locating && <Icon name="mapPin" size={16} aria-hidden />}{locating ? a.locating : a.useLocation}
      </Button>
    </div>
  );

  const prepCard = (
    <div className={cx("flex flex-wrap items-center gap-3 px-4 py-3 text-small", ex === "none" ? "bg-info-bg" : ex === "expired" ? "bg-danger-bg text-danger" : ex === "expiring" || ex === "stale" ? "bg-warning-bg" : "bg-surface")}>
      <Icon name={ex === "none" ? "upload" : ex === "expired" ? "x" : "shield"} size={18} aria-hidden />
      <span className="min-w-0 flex-1">
        {ex === "none" ? <><b className="font-medium">{a.prep.none}</b><span className="block text-fg-muted">{a.prep.noneBody}</span></>
          : ex === "expired" ? <b className="font-medium">{a.prep.expired}</b>
            : <><b className="font-medium">{fill(a.prep.ready, { time: hhmm(new Date(eng.meta!.preparedAt!).toISOString(), locale) })}</b>
              <span className="block text-fg-muted">{fill(a.prep.expires, { left: duration(eng.meta!.expiresAt! - eng.now) })}</span></>}
      </span>
      <ButtonLink href={base("/prepare")} data-guide="field-prepare" size="sm" variant={ex === "fresh" ? "ghost" : "primary"}>{ex === "fresh" || ex === "stale" || ex === "expiring" ? a.prep.redo : a.prep.cta}</ButtonLink>
    </div>
  );

  let body: React.ReactNode;
  if (plan.isLoading) {
    body = <div className="grid gap-3" aria-busy>{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  } else if (!plan.visits && !plan.online) {
    body = <FieldEmpty art={<ArtCloudDown />} title={a.notPreparedTitle} body={a.notPreparedBody} />;
  } else if (!plan.visits) {
    body = (
      <div role="alert" className="grid justify-items-center gap-3 bg-danger-bg px-6 py-10 text-center text-danger">
        <p className="text-label-lg">{errorCopy(plan.error, locale)}</p>
        <Button variant="secondary" onClick={() => void plan.refetch()}>{c.retry}</Button>
      </div>
    );
  } else if (!all.length || (!active.length && !offers.length && !rest.length)) {
    body = (
      <FieldEmpty art={<ArtClipboard />} title={a.emptyTitle} body={a.emptyBody}
        action={<>{plan.online && <Button onClick={() => void plan.refetch()}>{a.refresh}</Button>}
          {day === "today" && <Button variant="outline" onClick={() => setUrlParams({ day: "tomorrow" })}>{a.seeTomorrow}</Button>}</>} />
    );
  } else {
    body = (
      <div className="grid gap-5">
        {offers.length > 0 && (
          <section aria-labelledby="fo" className="grid gap-3">
            <h2 id="fo" className="text-label-lg">{a.offers}</h2>
            {offers.map((v) => <FieldOfferCard key={v.id} v={v} distanceM={dist(v)} accepted={v.local.accepted} />)}
          </section>
        )}
        {view === "map"
          ? <DayMap visits={rest} fix={fix} />
          : <ul className="m-stagger grid gap-3">{rest.map((v, i) => <VisitRow key={v.id} v={v} distanceM={dist(v)} now={now} index={i} />)}</ul>}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {header}
      {prepCard}
      {controls}
      {plan.source === "cache" && plan.visits && (
        <p className="text-eyebrow normal-case text-fg-subtle">{a.snapshot} · {eng.meta?.preparedAt ? fill(a.updated, { time: formatRelative(eng.meta.preparedAt, locale, eng.now || undefined) }) : ""}</p>
      )}
      {plan.source === "network" && plan.dataUpdatedAt > 0 && now - plan.dataUpdatedAt > 5 * 60_000 && (
        <p className="text-eyebrow normal-case text-fg-subtle">{fill(a.updated, { time: formatRelative(plan.dataUpdatedAt, locale, now) })}</p>
      )}
      {body}
    </div>
  );
}

function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex bg-ink-100 p-1">
      {options.map(([k, l]) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)}
          className={cx("h-10 min-w-20 px-4 text-small font-medium transition-colors", value === k ? "bg-secondary text-on-navy" : "text-fg-muted hover:text-fg")}>{l}</button>
      ))}
    </div>
  );
}
