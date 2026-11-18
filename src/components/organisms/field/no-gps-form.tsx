"use client";
// VI2 B: no GPS → reason (+ optional photo). Check-in is never blocked (spec); it's flagged no_gps for the manager.
import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Radio, Textarea } from "@/components/atoms/field";
import { useCopyB } from "@/lib/field/copy-b";
import type { GeoError } from "@/lib/field/geo";
import type { Captured } from "@/lib/field/image";
import { PhotoCapture } from "@/components/molecules/field/field";

const REASONS = ["indoors", "no_signal", "permission_off", "other"] as const;

export function NoGpsForm({ error, onSubmit, onRetry }: { error: GeoError; onSubmit: (b: Record<string, unknown>) => void; onRetry: () => void }) {
  const t = useCopyB().checkin;
  const [reason, setReason] = useState<string>(error === "denied" ? "permission_off" : error === "unavailable" ? "no_signal" : "");
  const [other, setOther] = useState("");
  const [photo, setPhoto] = useState<Captured | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function go() {
    if (!reason) return setErr(t.reasonRequired);
    if (reason === "other" && !other.trim()) return setErr(t.otherRequired);
    onSubmit({ reason: reason === "other" ? `other: ${other.trim()}` : reason, ...(photo && { photo: photo.dataUrl, captured_at: photo.capturedAt, file_time: photo.fileTime }) });
  }
  return (
    <section className="grid gap-4 border border-border bg-surface p-5">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center bg-navy-50 text-label text-navy-700">B</span>
        <p className="text-label-lg">{t.noGps}</p>
      </div>
      <p role="alert" className="text-small text-danger">{t.errors[error]}</p>
      {error === "denied" && <p className="bg-info-bg px-4 py-3 text-small text-info">{t.deniedHelp}</p>}
      <fieldset className="grid gap-3">
        <legend className="mb-2 text-label">{t.reasonLabel}</legend>
        {REASONS.map((r) => <Radio key={r} name="nogps" value={r} checked={reason === r} onChange={() => { setReason(r); setErr(null); }} label={t.reasons[r]} className="min-h-11 items-center" />)}
      </fieldset>
      {reason === "other" && (
        <label className="grid gap-1.5"><span className="text-label">{t.otherLabel}</span>
          <Textarea value={other} maxLength={300} onChange={(e) => setOther(e.target.value)} className="min-h-20" /></label>
      )}
      <PhotoCapture variant="button" label={t.optionalPhoto} value={photo} stamp={{ coords: null }} onCapture={setPhoto} />
      <p className="bg-warning-bg px-4 py-3 text-small">{t.noGpsNotice}</p>
      {err && <p role="alert" className="text-small font-medium text-danger">{err}</p>}
      <div className="flex flex-wrap gap-2 [&>*]:min-h-12 [&>*]:flex-1">
        <Button variant="outline" onClick={onRetry}>{t.retryGps}</Button>
        <Button onClick={go}>{t.arrive}</Button>
      </div>
    </section>
  );
}
