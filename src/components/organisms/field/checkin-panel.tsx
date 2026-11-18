"use client";
// U5a check-in (board 04 VI1/VI2). Location is read once, in the tap handler — never tracked.
import { useRef, useState } from "react";
import { Button } from "@/components/atoms/button";
import { Sheet } from "@/components/atoms/dialog";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { useCopyB } from "@/lib/field/copy-b";
import { fill, useFieldCopy } from "@/lib/field/copy";
import { useSave } from "@/lib/field/b";
import { discard, replaceBody, useEngine } from "@/lib/field/sync";
import { pendingCount } from "@/lib/field/queue";
import { usePrefs } from "@/lib/field/prefs";
import { getFix, distanceM, checkinVerdict, checkinFlags, formatCoords, formatDistance, FIELD_RADIUS_M, LOW_ACCURACY_M, type GeoError } from "@/lib/field/geo";
import type { Captured } from "@/lib/field/image";
import type { FieldVisit, Fix } from "@/shared/field/types";
import { ActionBar, GeoChip, FieldFlagChip, hhmm } from "@/components/atoms/field-agent";
import { PhotoCapture } from "@/components/molecules/field/field";
import { NoGpsForm } from "@/components/organisms/field/no-gps-form";

type Phase = { k: "idle" } | { k: "locating"; acc: number | null } | { k: "photo"; fix: NonNullable<Fix>; dist: number | null } | { k: "nogps"; error: GeoError };

export function CheckinPanel({ visit, onNext }: { visit: FieldVisit; onNext: () => void }) {
  const t = useCopyB().checkin;
  const { c, locale } = useFieldCopy();
  const eng = useEngine();
  const { battery } = usePrefs();
  const save = useSave();
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>({ k: "idle" });
  const [explain, setExplain] = useState(false);
  const busy = useRef(false);
  const op = eng.ops.find((o) => o.visitId === visit.id && o.kind === "visit.checkin" && o.error !== "superseded");
  const pending = pendingCount(eng.ops);

  async function submit(body: Record<string, unknown>) {
    if (busy.current) return;
    busy.current = true;
    try {
      if (op && op.state !== "queued" && op.state !== "blocked" && op.state !== "rejected") { toast({ title: t.already }); return; }
      if (op) await discard(op.opId); // one check-in per visit: replace the still-queued one
      const ok = await save({ kind: "visit.checkin", visitId: visit.id, body: { base_version: visit.version, at: new Date().toISOString(), ...body } });
      if (ok) setPhase({ k: "idle" });
    } finally { busy.current = false; }
  }

  async function locate() {
    if (busy.current) return;
    busy.current = true;
    setPhase({ k: "locating", acc: null });
    const { fix, error } = await getFix({ battery, onProgress: (acc) => setPhase({ k: "locating", acc }) });
    busy.current = false;
    if (!fix) return setPhase({ k: "nogps", error: error ?? "timeout" });
    const dist = visit.lat !== null && visit.lng !== null ? distanceM(fix, { lat: visit.lat, lng: visit.lng }) : null;
    if (checkinVerdict({ distanceM: dist, accuracyM: fix.accuracyM, hasPhoto: false }) === "verified") {
      return submit({ lat: fix.lat, lng: fix.lng, accuracy: fix.accuracyM, distance_m: dist, flags: [] });
    }
    setPhase({ k: "photo", fix, dist });
  }

  function arrive() {
    let seen = false;
    try { seen = localStorage.getItem("field.geoExplained") === "1"; } catch {}
    if (seen) void locate(); else setExplain(true);
  }

  // ---- recorded
  if (visit.checkin) {
    const ci = visit.checkin;
    const dist = ci.distanceM ?? null;
    const queued = op && (op.state === "queued" || op.state === "blocked");
    return (
      <section className="grid gap-4">
        <div className="m-pop grid gap-3 border border-border bg-surface p-5">
          <p className="flex items-center gap-2 text-label-lg text-success">
            <span className="flex size-7 items-center justify-center bg-success text-white">
              <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><path className="m-tick" pathLength={24} d="M20 6 9 17l-5-5" /></svg>
            </span>{t.recorded}
          </p>
          <p className="flex items-center gap-2 text-body tabular"><Icon name="clock" size={18} aria-hidden />{hhmm(ci.at, locale)}</p>
          {ci.fix ? (
            <p className="flex items-start gap-2 text-body tabular"><Icon name="mapPin" size={18} aria-hidden className="mt-0.5" />
              <span>{formatCoords(ci.fix.lat, ci.fix.lng)} · ±{ci.fix.accuracyM} m{dist !== null && <span className="block text-small text-fg-muted">({fill(t.fromPin, { d: formatDistance(dist) })}{dist <= FIELD_RADIUS_M ? " ✓" : ""})</span>}</span>
            </p>
          ) : <p className="text-small text-fg-muted">{t.noGps}{ci.reason && ` · ${t.reasons[ci.reason as keyof typeof t.reasons] ?? ci.reason}`}</p>}
          {ci.flags.length > 0 && <div className="flex flex-wrap gap-1.5">{ci.flags.map((f) => <FieldFlagChip key={f} flag={f} />)}</div>}
          {ci.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL
            ci.photoUrl.startsWith("data:") ? <img src={ci.photoUrl} alt={t.photoAdded} className="aspect-[4/3] w-40 object-cover" /> : <p className="text-small text-fg-muted">{t.photoAdded}</p>
          ) : queued && (
            <PhotoCapture variant="button" label={t.addPhoto} stamp={{ coords: ci.fix ? formatCoords(ci.fix.lat, ci.fix.lng) : null }}
              onCapture={(p) => void replaceBody(op.opId, { photo: p.dataUrl, captured_at: p.capturedAt, file_time: p.fileTime })} />
          )}
          <p className="flex items-center gap-1.5 text-small text-fg-muted"><Icon name="check" size={14} aria-hidden className="text-success" />{fill(t.saved, { n: pending })}</p>
        </div>
        <ActionBar><Button size="lg" onClick={onNext}>{c.continue}</Button></ActionBar>
      </section>
    );
  }

  // ---- far / low accuracy → timestamped photo (VI2 A)
  if (phase.k === "photo") {
    const far = phase.dist !== null && phase.dist > FIELD_RADIUS_M;
    const base = { lat: phase.fix.lat, lng: phase.fix.lng, accuracy: phase.fix.accuracyM, distance_m: phase.dist };
    return (
      <section className="grid gap-4 border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center bg-navy-50 text-label text-navy-700">A</span>
          <p className="text-label-lg">{far ? fill(t.farTitle, { d: formatDistance(phase.dist!) }) : fill(t.lowTitle, { a: phase.fix.accuracyM })}</p>
        </div>
        <GeoChip distanceM={phase.dist} accuracyM={phase.fix.accuracyM} verdict={far ? "far" : "low"} />
        <p className="text-h3">{t.takePhoto}</p>
        <PhotoCapture label={t.photoLabel} stamp={{ coords: formatCoords(phase.fix.lat, phase.fix.lng) }}
          onCapture={(p: Captured) => void submit({ ...base, photo: p.dataUrl, captured_at: p.capturedAt, file_time: p.fileTime, flags: checkinFlags({ distanceM: phase.dist, accuracyM: phase.fix.accuracyM, noGps: false, hasPhoto: true }) })} />
        <p className="bg-warning-bg px-4 py-3 text-small">{fill(t.farNotice, { d: formatDistance(phase.dist ?? 0) })}</p>
        <Button variant="outline" size="lg" onClick={() => void submit({ ...base, flags: checkinFlags({ distanceM: phase.dist, accuracyM: phase.fix.accuracyM, noGps: false, hasPhoto: false }) })}>{t.withoutPhoto}</Button>
      </section>
    );
  }

  if (phase.k === "nogps") {
    return <NoGpsForm error={phase.error} onRetry={() => void locate()} onSubmit={(b) => void submit({ lat: null, lng: null, accuracy: null, distance_m: null, flags: ["no_gps"], ...b })} />;
  }

  // ---- idle / locating (VI1)
  const locating = phase.k === "locating";
  return (
    <section className="grid justify-items-center gap-4 border border-border bg-surface px-5 py-8 text-center">
      <span aria-hidden className="relative flex size-24 items-center justify-center bg-navy-50 text-navy-700">
        {locating && <span className="absolute inset-0 animate-ping bg-navy-100 motion-reduce:animate-none" />}
        <Icon name="mapPin" size={44} />
      </span>
      <h2 className="text-h3">{t.title}</h2>
      <p className="max-w-xs text-body text-fg-muted">{fill(t.body, { r: FIELD_RADIUS_M })}</p>
      <p aria-live="polite" className="min-h-5 text-small font-medium tabular">{locating && (phase.acc !== null ? fill(t.locatingAcc, { a: phase.acc }) : t.locating)}</p>
      <Button size="xl" className="min-h-14 w-full max-w-sm justify-center" loading={locating} disabled={locating} onClick={arrive}>
        <Icon name="mapPin" size={20} aria-hidden />{t.arrive}
      </Button>
      <p className="text-eyebrow normal-case text-fg-subtle">±{LOW_ACCURACY_M} m · {FIELD_RADIUS_M} m</p>
      <Sheet side="bottom" open={explain} onClose={() => setExplain(false)} title={t.explainTitle}
        footer={<Button size="lg" onClick={() => { try { localStorage.setItem("field.geoExplained", "1"); } catch {} setExplain(false); void locate(); }}>{t.explainOk}</Button>}>
        <p className="flex items-start gap-3 text-body"><Icon name="shield" size={22} aria-hidden className="shrink-0 text-navy-700" />{t.explainBody}</p>
      </Sheet>
    </section>
  );
}
