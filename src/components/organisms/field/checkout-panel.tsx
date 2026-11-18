"use client";
// U5e check-out (board 04 VI6): outcome, notes, location again (verdict not enforced), proof for client absent,
// reschedule time, open-required-items guard, evidence summary → one visit.checkout op.
import { useState } from "react";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Input, Textarea } from "@/components/atoms/field";
import { Icon, type IconName } from "@/components/atoms/icon";
import { cx } from "@/shared/format";
import { useCopyB } from "@/lib/field/copy-b";
import { useFieldCopy, fill } from "@/lib/field/copy";
import { useSave, kigaliLocalToIso } from "@/lib/field/b";
import { useEngine } from "@/lib/field/sync";
import { pendingCount } from "@/lib/field/queue";
import { usePrefs } from "@/lib/field/prefs";
import { getFix } from "@/lib/field/geo";
import type { Captured } from "@/lib/field/image";
import type { FieldVisit, Fix, Outcome } from "@/shared/field/types";
import { ActionBar, OutcomeChip, useFieldBase } from "@/components/atoms/field-agent";
import { PhotoCapture } from "@/components/molecules/field/field";

const OUTCOMES: [Outcome, IconName, string][] = [
  ["completed", "check", "bg-success text-white"], ["partially_done", "clock", "bg-warning text-white"],
  ["client_absent", "user", "bg-danger text-white"], ["rescheduled", "calendar", "bg-info text-white"],
];

export function CheckoutPanel({ visit }: { visit: FieldVisit }) {
  const t = useCopyB().checkout;
  const { c } = useFieldCopy();
  const eng = useEngine();
  const { battery, liteOn } = usePrefs();
  const save = useSave();
  const base = useFieldBase();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [notes, setNotes] = useState("");
  const [when, setWhen] = useState("");
  const [fix, setFix] = useState<Fix>(null);
  const [locating, setLocating] = useState(false);
  const [photo, setPhoto] = useState<Captured | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const openRequired = visit.checklist.filter((x) => x.required && !x.done).length;

  if (visit.checkout) {
    return (
      <section className="m-pop grid justify-items-center gap-3 border border-border bg-surface px-5 py-8 text-center">
        <span className="flex size-14 items-center justify-center bg-success text-white">
          <svg aria-hidden viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><path className="m-tick" pathLength={24} d="M20 6 9 17l-5-5" /></svg>
        </span>
        <p className="text-h3">{t.done}</p>
        <OutcomeChip outcome={visit.checkout.outcome} />
        <p className="bg-success-bg px-4 py-2 text-small font-medium text-success">{fill(t.saved, { n: pendingCount(eng.ops) })}</p>
        <ButtonLink href={base()} size="lg">{t.backToday}</ButtonLink>
      </section>
    );
  }

  async function locate() {
    setLocating(true);
    const r = await getFix({ battery });
    setLocating(false);
    if (r.fix) setFix(r.fix);
  }
  async function submit(o: Outcome) {
    if (busy) return;
    setBusy(true);
    try {
      await save({
        kind: "visit.checkout", visitId: visit.id,
        body: {
          base_version: visit.version, at: new Date().toISOString(), outcome: o, notes: notes.trim() || undefined,
          ...(fix && { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracyM }),
          ...(photo && { photo: photo.dataUrl, captured_at: photo.capturedAt, file_time: photo.fileTime }),
          ...(o === "rescheduled" && { reschedule_to: kigaliLocalToIso(when) }),
        },
      });
    } finally { setBusy(false); }
  }
  function check() {
    if (!outcome) return setErr(t.pickOutcome);
    if (outcome === "client_absent" && !fix && !photo) return setErr(t.proofRequired);
    if (outcome === "rescheduled" && (!when || Date.parse(kigaliLocalToIso(when)) <= Date.now())) return setErr(t.futureRequired);
    if (outcome === "completed" && openRequired) return setConfirmOpen(true);
    void submit(outcome);
  }

  const scans = eng.ops.filter((o) => o.visitId === visit.id && o.kind === "scan.upload");
  const receipts = eng.ops.filter((o) => o.visitId === visit.id && o.kind === "receipt.create");
  const evidence: { icon: IconName; label: string; src?: string }[] = [
    ...(visit.checkin?.photoUrl ? [{ icon: "camera" as const, label: c.evidence.photo, src: visit.checkin.photoUrl }] : []),
    ...scans.map((o) => ({ icon: "file" as const, label: String((o.body as { label?: string }).label ?? c.evidence.scan), src: ((o.body as { pages?: { data: string }[] }).pages ?? [])[0]?.data })),
    ...receipts.map(() => ({ icon: "fileCheck" as const, label: c.evidence.signature })),
  ];

  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-h3">{t.title}</legend>
        {OUTCOMES.map(([o, icon, tone]) => (
          <label key={o} className={cx("m-press flex min-h-16 cursor-pointer items-center gap-3 border-2 bg-surface px-4 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
            outcome === o ? "border-secondary bg-navy-50" : "border-transparent")}>
            <input type="radio" name="outcome" value={o} checked={outcome === o} onChange={() => { setOutcome(o); setErr(null); }} className="size-5 accent-navy-700" />
            <span aria-hidden className={cx("flex size-8 items-center justify-center", tone)}><Icon name={icon} size={16} /></span>
            <span className="grid"><span className="text-label">{t.outcomes[o][0]}</span><span className="text-small text-fg-subtle">{t.outcomes[o][1]}</span></span>
          </label>
        ))}
      </fieldset>

      {outcome === "rescheduled" && (
        <label className="grid gap-1.5 border border-border bg-surface p-5"><span className="text-label">{t.newTime}</span>
          <Input type="datetime-local" value={when} onChange={(e) => { setWhen(e.target.value); setErr(null); }} /></label>
      )}

      <section className="grid gap-3 border border-border bg-surface p-5">
        {outcome === "client_absent" && <p className="bg-info-bg px-4 py-3 text-small text-info">{t.absentNote}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" loading={locating} disabled={locating} onClick={() => void locate()}><Icon name="mapPin" size={16} aria-hidden />{t.getFix}</Button>
          {fix && <span className="m-pop text-small font-medium text-success">{fill(t.fixOk, { a: fix.accuracyM })}</span>}
        </div>
        {outcome === "client_absent" && <PhotoCapture variant="button" label={t.proofPhoto} value={photo} stamp={{ coords: null }} onCapture={(p) => { setPhoto(p); setErr(null); }} />}
        <label className="grid gap-1.5"><span className="text-label">{t.notes}</span>
          <Textarea value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} className="min-h-20" /></label>
      </section>

      <section className="border border-border bg-surface p-5">
        <h2 className="mb-3 text-label-lg">{t.evidence}</h2>
        {evidence.length === 0 ? <p className="text-small text-fg-subtle">{t.noEvidence}</p> : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {evidence.map((e, i) => (
              <li key={i} className="grid gap-1 text-center">
                {e.src?.startsWith("data:") && !liteOn
                  // eslint-disable-next-line @next/next/no-img-element -- local data URL
                  ? <img src={e.src} alt={e.label} className="aspect-square w-full border border-border object-cover" />
                  : <span className="flex aspect-square items-center justify-center border border-border bg-bg-subtle"><Icon name={e.icon} size={26} aria-hidden /></span>}
                <span className="truncate text-eyebrow normal-case text-fg-subtle">{e.label}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {err && <p role="alert" className="text-small font-medium text-danger">{err}</p>}
      <ActionBar><Button size="lg" loading={busy} disabled={busy} onClick={check}>{t.checkout}</Button></ActionBar>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title={fill(t.openTitle, { n: openRequired })} description={t.openBody}
        footer={<>
          <Button variant="outline" onClick={() => { setConfirmOpen(false); void submit("completed"); }}>{t.keep}</Button>
          <Button onClick={() => { setConfirmOpen(false); setOutcome("partially_done"); void submit("partially_done"); }}>{t.markPartial}</Button>
        </>} />
    </div>
  );
}
