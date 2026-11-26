"use client";
import { useId, useRef, useState, useEffect } from "react";
import { cx, formatMoney, formatDate } from "@/shared/format";
import { Icon, type IconName } from "@/components/atoms/icon";
import { processImage, type Captured } from "@/lib/field/image";
import { usePrefs } from "@/lib/field/prefs";
import { useFieldCopy, fill } from "@/lib/field/copy";
import { kb, QuotaBar, duration, LocalRef, hhmm, useFieldBase } from "@/components/atoms/field-agent";
import { Button } from "@/components/atoms/button";
import { Checkbox, Field, Input } from "@/components/atoms/field";
import { copyC } from "@/lib/field/copy-c";
import { putDraft, getDraft, delDraft, useEngine, enqueue } from "@/lib/field/sync";
import { type L3, type Expense, type ExpenseCategory, type ExpenseState, type FieldVisit, type CustodyEvent, type CustodyStage } from "@/shared/field/types";
import { useCopyD } from "@/lib/field/copy-d";
import { storageEstimate, quotaLevel, expiryState } from "@/lib/field/store";
import { Badge } from "@/components/atoms/tag";
import { copyE } from "@/lib/field/copy-e";
import { type Tone } from "@/shared/domain/case-status";
import Link from "next/link";
import { useCopyA } from "@/lib/field/copy-a";
import { distanceM, formatDistance, mapsHref } from "@/lib/field/geo";
import { centreOf } from "@/lib/field/a";
import { ApiError } from "@/lib/api/client";
import { fx, receiptsOf } from "@/lib/field/api";
import { useOnline } from "@/lib/field/net";
import { useQuery } from "@tanstack/react-query";
import { Timeline } from "@/components/atoms/misc";
import { useToast } from "@/components/atoms/toast";

// PhotoCapture (plan §5.3): hidden <input capture=environment> (works offline, no permission dance, testable with
// setInputFiles), compressed + EXIF-free via processImage, optional timestamp band. Lite: no thumbnail.
const T = {
  en: { retake: "Retake", processing: "Processing photo…", failed: "Couldn't read that photo. Try again.", full: "Phone storage is almost full, photos are paused. Sync or remove a scan." },
  fr: { retake: "Reprendre", processing: "Traitement de la photo…", failed: "Photo illisible. Réessayez.", full: "Stockage presque plein, photos suspendues. Synchronisez ou retirez un scan." },
  rw: { retake: "Ongera ufotore", processing: "Ifoto iri gutunganywa…", failed: "Ntitwashoboye gusoma iyo foto. Ongera ugerageze.", full: "Ububiko bwenda kuzura, amafoto yahagaritswe. Ohereza cyangwa ukureho scan." },
};

export function PhotoCapture({ label, onCapture, value, stamp, enhance, disabled, blocked, variant = "card", className }: {
  /** Accessible name of the capture button (e2e: getByLabel("Take photo")). */
  label: string;
  onCapture: (p: Captured & { file: File }) => void;
  value?: Captured | null;
  /** Burn Kigali time (+ coords) into the photo (check-in evidence). */
  stamp?: { coords?: string | null } | null;
  enhance?: boolean;
  disabled?: boolean;
  /** Quota ≥ 95%: capture disabled with reason. */
  blocked?: boolean;
  variant?: "card" | "button";
  className?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const { locale } = useFieldCopy();
  const t = T[locale];
  const { liteOn } = usePrefs();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const capturedAt = Date.now(); // event handler, never render
    setBusy(true); setErr(null);
    try {
      const p = await processImage(file, { lite: liteOn, capturedAt, fileTime: file.lastModified, stamp: stamp ? { locale, coords: stamp.coords } : undefined, enhance });
      onCapture({ ...p, file });
    } catch { setErr(t.failed); } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  const off = disabled || blocked || busy;
  return (
    <div className={cx("grid gap-2", className)}>
      <input ref={input} id={id} type="file" accept="image/*" capture="environment" className="peer sr-only" aria-label={label} disabled={off}
        onChange={(e) => void onFile(e.target.files?.[0])} />
      {value && !liteOn && variant === "card" ? (
        <div className="m-pop relative overflow-hidden border border-border bg-surface peer-focus-visible:outline-2 peer-focus-visible:outline-focus">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data URL, next/image adds nothing */}
          <img src={value.dataUrl} alt="" className="aspect-[4/3] w-full object-cover" />
          <label htmlFor={id} className="absolute right-2 bottom-2 inline-flex h-10 cursor-pointer items-center gap-2 bg-white/95 px-3 text-small font-medium shadow-lg">
            <Icon name="camera" size={16} aria-hidden />{t.retake}
          </label>
          <span className="absolute top-2 left-2 bg-ink-950/70 px-2 py-0.5 text-eyebrow normal-case text-on-navy tabular">{kb(value.bytes)}</span>
        </div>
      ) : (
        <label htmlFor={id} aria-disabled={off || undefined}
          className={cx("m-press flex min-h-12 cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus items-center justify-center gap-2 px-5 text-button aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
            variant === "card" ? "min-h-28 flex-col border-2 border-dashed border-border-strong bg-surface text-fg hover:border-navy-300" : "bg-secondary text-on-navy")}>
          {busy ? <span aria-hidden className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Icon name="camera" size={variant === "card" ? 28 : 18} aria-hidden />}
          <span>{busy ? t.processing : value ? `${label} · ${kb(value.bytes)}` : label}</span>
        </label>
      )}
      {blocked && <p className="text-small text-danger">{t.full}</p>}
      {err && <p role="alert" className="text-small text-danger">{err}</p>}
    </div>
  );
}

// SignaturePad (plan §2.12): Pointer Events canvas (DPR-scaled, quadratic smoothing, vector strokes kept for re-render,
// autosaved to drafts on every stroke end) + accessible "type name instead" alternative (WCAG 2.5.7 / 2.1.1).
// Consent shows in the CLIENT's language, switchable independently of the UI locale.
export type SignatureResult = { method: "drawn" | "typed"; png?: string; typedName?: string; clientName: string; locale: L3; signedAt: string };
type Pt = [number, number]; // CSS px within the canvas

const LANGS: L3[] = ["rw", "en", "fr"];

/** Blank check: ≥ 2 strokes and bbox ≥ 15% of the width. */
export function isBlank(strokes: Pt[][], width: number) {
  const pts = strokes.flat();
  if (strokes.length < 2 || !pts.length) return true;
  const xs = pts.map((p) => p[0]);
  return Math.max(...xs) - Math.min(...xs) < width * 0.15;
}
if (process.env.NODE_ENV !== "production") {
  console.assert(isBlank([[[0, 0], [10, 0]]], 300) && !isBlank([[[0, 0], [100, 5]], [[20, 10], [30, 10]]], 300), "signature: blank check");
}

function paint(ctx: CanvasRenderingContext2D, strokes: Pt[][], w: number, h: number, white = false) {
  ctx.clearRect(0, 0, w, h);
  if (white) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); }
  ctx.strokeStyle = getComputedStyle(ctx.canvas).getPropertyValue("--color-ink-900") || "black"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const s of strokes) {
    if (!s.length) continue;
    ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]);
    for (let i = 1; i < s.length - 1; i++) { const mx = (s[i][0] + s[i + 1][0]) / 2, my = (s[i][1] + s[i + 1][1]) / 2; ctx.quadraticCurveTo(s[i][0], s[i][1], mx, my); }
    const l = s[s.length - 1]; ctx.lineTo(l[0], l[1]);
    if (s.length === 1) ctx.lineTo(l[0] + 0.1, l[1]);
    ctx.stroke();
  }
}

export function SignaturePad({ clientName, clientLanguage, consent, onSave, onCancel, draftKey }: {
  clientName: string; clientLanguage: L3; consent?: (l: L3, name: string) => string; onSave: (s: SignatureResult) => void; onCancel: () => void; draftKey?: string;
}) {
  const { locale } = useFieldCopy();
  const t = copyC(locale);
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const live = useRef<Pt[] | null>(null);
  const [strokes, setStrokes] = useState<Pt[][]>([]);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [lang, setLang] = useState<L3>(clientLanguage);
  const [name, setName] = useState(clientName);
  const [typed, setTyped] = useState(clientName);
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const consentText = (consent ?? ((l, n) => fill(copyC(l).consent[l], { name: n })))(lang, (mode === "type" ? typed : name) || "…");

  // Restore autosaved strokes (app killed mid-signature).
  useEffect(() => {
    if (!draftKey) return;
    void getDraft<{ strokes: Pt[][]; name: string }>(draftKey).then((d) => { if (d?.strokes?.length) { setStrokes(d.strokes); setName(d.name || clientName); } });
  }, [draftKey, clientName]);

  // DPR-scaled backing store; repaint on resize and whenever strokes change.
  useEffect(() => {
    const c = canvas.current, w = wrap.current;
    if (!c || !w || mode !== "draw") return;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1, r = w.getBoundingClientRect();
      c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
      const ctx = c.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(ctx, strokes, r.width, r.height);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(w);
    return () => ro.disconnect();
  }, [strokes, mode]);

  const pt = (e: React.PointerEvent): Pt => { const r = canvas.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => { e.currentTarget.setPointerCapture(e.pointerId); live.current = [pt(e)]; setErr(null); };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!live.current) return;
    live.current.push(pt(e));
    const r = e.currentTarget.getBoundingClientRect();
    paint(e.currentTarget.getContext("2d")!, [...strokes, live.current], r.width, r.height);
  };
  const up = () => {
    if (!live.current) return;
    const next = [...strokes, live.current];
    live.current = null;
    setStrokes(next);
    if (draftKey) void putDraft(draftKey, { strokes: next, name });
  };

  function save() {
    const signedAt = new Date().toISOString();
    if (mode === "type") {
      if (!typed.trim()) return setErr(t.needName);
      if (!agree) return setErr(t.needCheck);
      if (draftKey) void delDraft(draftKey);
      return onSave({ method: "typed", typedName: typed.trim(), clientName: typed.trim(), locale: lang, signedAt });
    }
    if (!name.trim()) return setErr(t.needName);
    const c = canvas.current!, r = c.getBoundingClientRect();
    if (isBlank(strokes, r.width)) return setErr(t.blank);
    // Export at 1× on white (PNG ≤ ~30 KB).
    const out = document.createElement("canvas");
    out.width = Math.round(r.width); out.height = Math.round(r.height);
    paint(out.getContext("2d")!, strokes, out.width, out.height, true);
    if (draftKey) void delDraft(draftKey);
    onSave({ method: "drawn", png: out.toDataURL("image/png"), clientName: name.trim(), locale: lang, signedAt });
  }
  const cancel = () => (strokes.length && mode === "draw" ? setConfirmDiscard(true) : onCancel());

  return (
    <div className="grid gap-4">
      <div role="tablist" aria-label={t.signTitle} className="flex gap-1 bg-ink-100 p-1">
        {(["draw", "type"] as const).map((m) => (
          <button key={m} role="tab" type="button" aria-selected={mode === m} onClick={() => { setMode(m); setErr(null); }}
            className={cx("h-10 flex-1 text-small font-medium", mode === m ? "bg-surface shadow-sm" : "text-fg-muted")}>{m === "draw" ? t.draw : t.type}</button>
        ))}
      </div>

      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="sr-only">{t.consentLang}</legend>
        <span aria-hidden className="text-eyebrow text-fg-subtle">{t.consentLang}</span>
        {LANGS.map((l) => (
          <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}
            className={cx("h-8 px-3 text-eyebrow uppercase", lang === l ? "bg-secondary text-on-navy" : "bg-ink-100")}>{l}</button>
        ))}
      </fieldset>

      {mode === "draw" ? (
        <>
          <Field label={t.clientName}>{({ id }) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />}</Field>
          <p lang={lang} className="bg-gold-50 border-l-3 border-primary px-4 py-3 text-small">{consentText}</p>
          <div ref={wrap} className="relative h-[min(45dvh,16rem)] w-full overflow-hidden border-2 border-border-strong bg-surface">
            <canvas ref={canvas} data-testid="signature-canvas" role="img" aria-label={t.canvasLabel}
              className="absolute inset-0 size-full touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
            <div aria-hidden className="pointer-events-none absolute inset-x-6 bottom-10 border-t border-dashed border-border-strong">
              <span lang={lang} className="mt-1 block text-eyebrow normal-case text-fg-subtle">{t.signAbove[lang]}</span>
            </div>
          </div>
          <p className="text-small text-fg-subtle sm:hidden">{t.sideways}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!strokes.length} onClick={() => setStrokes((s) => s.slice(0, -1))}>{t.undo}</Button>
            <Button variant="ghost" size="sm" disabled={!strokes.length} onClick={() => setStrokes([])}>{t.clear}</Button>
          </div>
        </>
      ) : (
        <>
          <Field label={t.clientName}>{({ id }) => <Input id={id} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />}</Field>
          <Checkbox lang={lang} checked={agree} onChange={(e) => setAgree(e.target.checked)} label={consentText} />
        </>
      )}

      {err && <p role="alert" className="m-shake text-small font-medium text-danger">{err}</p>}
      {confirmDiscard ? (
        <div role="alertdialog" aria-label={t.discard} className="flex flex-wrap items-center gap-2 bg-warning-bg p-3">
          <span className="flex-1 text-small font-medium">{t.discard}</span>
          <Button size="sm" variant="ghost" onClick={() => setConfirmDiscard(false)}>{t.keep}</Button>
          <Button size="sm" variant="danger" onClick={() => { if (draftKey) void delDraft(draftKey); onCancel(); }}>{t.discardYes}</Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 [&>*]:min-h-12 [&>*]:flex-1">
          <Button variant="outline" onClick={cancel}>{t.cancel}</Button>
          <Button onClick={save}>{t.saveSig}</Button>
        </div>
      )}
    </div>
  );
}

// StorageCard (plan §2.6): quota meter, persist status, expiry countdown, queued size.
export function useStorage() {
  const eng = useEngine();
  const [est, setEst] = useState<{ used: number; quota: number; persisted: boolean | null } | null>(null);
  const opsLen = eng.ops.length;
  useEffect(() => { void storageEstimate().then(setEst); }, [opsLen, eng.meta?.preparedAt]);
  return est;
}

export function StorageCard() {
  const d = useCopyD();
  const eng = useEngine();
  const est = useStorage();
  const level = est ? quotaLevel(est.used, est.quota) : "ok";
  const ex = expiryState(eng.meta, eng.now);
  const queued = eng.ops.filter((o) => o.state !== "sent").reduce((s, o) => s + o.bytes, 0);
  return (
    <section className="grid gap-3 bg-surface p-4 sm:p-5">
      <h2 className="text-fg-heading flex items-center gap-2 text-label-lg"><Icon name="layers" size={18} aria-hidden />{d.storage}</h2>
      {est && est.quota > 0 && <QuotaBar used={est.used} quota={est.quota} />}
      {level !== "ok" && <p role="status" className={level === "block" ? "text-small font-medium text-danger" : "text-small font-medium text-warning"}>{level === "block" ? d.quotaBlock : d.quotaWarn}</p>}
      <ul className="grid gap-1.5 text-small text-fg-muted">
        {queued > 0 && <li className="tabular">{fill(d.queued, { size: kb(queued) })}</li>}
        <li>{ex === "none" || ex === "expired" ? d.notPrepared : fill(d.expiresIn, { time: duration(eng.meta!.expiresAt! - eng.now) })}</li>
        {est?.persisted !== null && est && <li className="flex items-start gap-1.5"><Icon name={est.persisted ? "shield" : "zap"} size={14} aria-hidden className="mt-0.5 shrink-0" />{est.persisted ? d.persisted : d.notPersisted}</li>}
      </ul>
    </section>
  );
}

// ExpenseCard + ApprovalTrail (plan §5.3). Rejected claims show the claimed amount struck through, never negative (§2.1).
export const CAT_ICON: Record<ExpenseCategory, IconName> = { moto: "mapPin", transport: "globe", stationery: "file", meal: "sparkle", other: "wallet" };
const STATE_TONE: Record<ExpenseState, Tone> = { queued: "neutral", submitted: "neutral", sm_approved: "info", finance_approved: "success", paid: "accent", rejected: "danger", withdrawn: "neutral" };

export function ExpenseStatePill({ state }: { state: ExpenseState }) {
  const { locale } = useFieldCopy();
  return <Badge tone={STATE_TONE[state]}>{copyE(locale).exp.states[state]}</Badge>;
}

export function ExpenseCard({ x, onOpen }: { x: Expense; onOpen: () => void }) {
  const { locale } = useFieldCopy();
  const t = copyE(locale).exp;
  const struck = x.state === "rejected" || x.state === "withdrawn";
  return (
    <button type="button" onClick={onOpen} className="m-press flex w-full items-center gap-3 border border-border bg-surface px-4 py-3 text-left hover:border-border-strong">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-700"><Icon name={CAT_ICON[x.category]} size={18} aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label">{t.cats[x.category]}</span>
        <span className="flex flex-wrap items-center gap-1.5 text-small text-fg-subtle">
          {x.ref ? <span>{x.visitRef ?? x.ref}</span> : <LocalRef localRef={x.localRef} />}
          <span>· {formatDate(x.createdAt, locale, { weekday: "short", day: "numeric", month: "short" })}</span>
        </span>
      </span>
      <span className="grid justify-items-end gap-1">
        <ExpenseStatePill state={x.state} />
        <span className={cx("text-label tabular", struck && "text-fg-subtle line-through")}>{formatMoney(x.amount, "RWF", locale)}</span>
      </span>
    </button>
  );
}

/** Stepper submitted → SM → Finance → paid with names/times (board EX4). */
export function ApprovalTrail({ x }: { x: Expense }) {
  const { locale } = useFieldCopy();
  const t = copyE(locale).exp;
  const steps = (["submitted", "sm", "finance", "paid"] as const).map((step) => ({ step, rec: x.trail.find((r) => r.step === step) }));
  return (
    <ol className="grid gap-0">
      {steps.map(({ step, rec }, i) => {
        const rejected = rec?.decision === "rejected";
        const done = !!rec && !rejected;
        return (
          <li key={step} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 && <span aria-hidden className={cx("absolute top-7 left-3.5 h-[calc(100%-1.5rem)] w-px", done ? "bg-secondary" : "bg-border-strong")} />}
            <span className={cx("flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-eyebrow", done ? "border-secondary bg-secondary text-white" : rejected ? "border-danger bg-danger text-white" : "border-border-strong bg-surface")}>
              {done ? "✓" : rejected ? "×" : ""}
            </span>
            <span className="min-w-0">
              <span className="block text-label">{t.trail[step]}</span>
              {rec?.by && <span className="block text-small text-fg-muted">{rec.by}</span>}
              {rec?.at && <span className="block text-small text-fg-subtle tabular">{formatDate(rec.at, locale, { day: "numeric", month: "short" })} {hhmm(rec.at, locale)}</span>}
              {rec?.reason && <span className="mt-1 block bg-danger-bg px-2 py-1 text-small text-danger">{t.reason}: {rec.reason}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// DayMap (plan §5.5, D-5): schematic SVG, pins projected around the centre; no map library, no tiles.
// shortcut: schematic SVG map, upgrade to MapLibre + offline vector tiles if agents ask for street maps.
const W = 320, H = 240, CX = W / 2, CY = H / 2;

export function DayMap({ visits, fix }: { visits: FieldVisit[]; fix: { lat: number; lng: number } | null }) {
  const { locale } = useFieldCopy();
  const a = useCopyA();
  const { liteOn } = usePrefs();
  const base = useFieldBase();
  const centre = centreOf(visits, fix);
  const placed = visits.filter((v) => v.lat !== null && v.lng !== null && v.status !== "cancelled");
  const far = centre ? Math.max(5000, ...placed.map((v) => distanceM(centre, { lat: v.lat!, lng: v.lng! }))) : 5000;
  const scale = (Math.min(W, H) / 2 - 22) / far; // px per metre, 5 km ring always fits
  const proj = (v: FieldVisit) => {
    const dx = (v.lng! - centre!.lng) * 111_320 * Math.cos((centre!.lat * Math.PI) / 180);
    const dy = (v.lat! - centre!.lat) * 110_540;
    return { x: CX + dx * scale, y: CY - dy * scale };
  };
  const label = (v: FieldVisit, i: number) => fill(a.pins, { n: i + 1, time: hhmm(v.windowStart, locale), dist: fix && v.lat !== null ? formatDistance(distanceM(fix, { lat: v.lat, lng: v.lng! })) : a.distanceUnknown });

  // Lite: text-first, no drawing at all (F-PERF-04).
  if (liteOn || !centre) {
    return (
      <ol className="grid gap-2">
        {visits.map((v, i) => (
          <li key={v.id} className="flex items-center gap-3 bg-surface p-3 text-small">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-on-navy tabular">{i + 1}</span>
            <Link href={base(`/visits/${v.id}`)} className="min-w-0 flex-1 truncate underline-offset-4 hover:underline">{label(v, i)} · {v.address}</Link>
            <a href={mapsHref(v.lat, v.lng, v.address)} target="_blank" rel="noopener" className="shrink-0 font-medium text-link underline">{a.openMaps}</a>
          </li>
        ))}
      </ol>
    );
  }
  const pts = placed.map(proj);
  return (
    <figure className="m-rise grid gap-2">
      <div className="relative overflow-hidden border border-border bg-[linear-gradient(var(--color-ink-100)_1px,transparent_1px),linear-gradient(90deg,var(--color-ink-100)_1px,transparent_1px)] bg-[size:24px_24px] bg-surface">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={a.mapHint}>
          {[1000, 5000].map((r) => (
            <g key={r}>
              <circle cx={CX} cy={CY} r={r * scale} fill="none" stroke="var(--color-border-strong)" strokeDasharray="3 4" />
              <text x={CX + r * scale * 0.71 + 3} y={CY - r * scale * 0.71} fontSize="9" fill="var(--color-fg-subtle)">{fill(a.ring, { km: r / 1000 })}</text>
            </g>
          ))}
          {pts.length > 1 && <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="var(--color-navy-700)" strokeWidth="1.5" strokeDasharray="5 4" opacity=".6" />}
          {fix && (
            <g>
              <circle cx={CX} cy={CY} r="14" fill="var(--color-info)" opacity=".18" className="origin-center animate-ping motion-reduce:animate-none [transform-box:fill-box]" />
              <circle cx={CX} cy={CY} r="6" fill="var(--color-info)" stroke="white" strokeWidth="2" />
            </g>
          )}
          <g transform={`translate(${W - 22} 22)`} aria-hidden>
            <circle r="11" fill="white" stroke="var(--color-border)" /><path d="M0 -7 L4 4 L0 1 L-4 4Z" fill="var(--color-ink-900)" />
            <text y="-13" textAnchor="middle" fontSize="8" fill="var(--color-fg-subtle)">N</text>
          </g>
        </svg>
        {/* Pins are real buttons-as-links in visit order (keyboard reachable), positioned over the SVG. */}
        <ol className="contents">
          {placed.map((v, i) => {
            const p = pts[i];
            return (
              <li key={v.id}>
                <Link href={base(`/visits/${v.id}`)} aria-label={label(v, visits.indexOf(v))}
                  style={{ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` }}
                  className="absolute flex size-9 -translate-x-1/2 -translate-y-full items-center justify-center focus-visible:outline-2 focus-visible:outline-focus">
                  <svg viewBox="0 0 24 30" className="size-8 drop-shadow" aria-hidden>
                    <path d="M12 29s10-9.5 10-17A10 10 0 0 0 2 12c0 7.5 10 17 10 17Z" fill={v.priority === "high" ? "var(--color-danger)" : "var(--color-navy-700)"} />
                    <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="700" fill="white">{visits.indexOf(v) + 1}</text>
                  </svg>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
      <figcaption className="text-eyebrow normal-case text-fg-subtle">{a.mapHint}{fix ? ` · ${a.you}: ●` : ""}</figcaption>
    </figure>
  );
}

// OtpConfirm (plan §2.12, D-13): online-only client SMS code, 6 digits, 60 s resend countdown, paste allowed.
export function OtpConfirm({ visitId, phoneMasked, onVerified }: { visitId: string; phoneMasked: string; onVerified: (at: string) => void }) {
  const { locale } = useFieldCopy();
  const t = copyC(locale);
  const online = useOnline();
  const [sent, setSent] = useState(false);
  const [left, setLeft] = useState(0);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (left <= 0) return;
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  async function send() {
    setBusy(true); setErr(null);
    try { const r = await fx<{ resendInS: number }>("POST", `/api/x_field/visits/${visitId}/otp`); setSent(true); setLeft(r.resendInS ?? 60); }
    catch { setErr(t.sendFailed); } finally { setBusy(false); }
  }
  async function verify() {
    setBusy(true); setErr(null);
    try { await fx("POST", `/api/x_field/visits/${visitId}/otp/verify`, { code }); setOk(true); onVerified(new Date().toISOString()); }
    catch (e) { setErr(e instanceof ApiError && e.errorType === "invalid_code" ? t.invalid : t.sendFailed); } finally { setBusy(false); }
  }

  if (ok) return <p role="status" className="m-pop flex items-center gap-2 bg-success-bg px-4 py-3 text-small font-medium text-success"><Icon name="check" size={16} aria-hidden />{t.verified}</p>;
  if (!online) return <p className="flex items-center gap-2 bg-ink-100 px-4 py-3 text-small text-fg-muted"><Icon name="lock" size={16} aria-hidden />{t.smsOffline}</p>;
  return (
    <div className="grid gap-3">
      {sent && <p className="text-small text-fg-muted">{fill(t.sentTo, { phone: phoneMasked })}</p>}
      <Button variant={sent ? "outline" : "primary"} onClick={() => void send()} disabled={busy || left > 0} loading={busy && !sent}>
        {left > 0 ? fill(t.resendIn, { s: left }) : sent ? t.resend : `${t.sendCode} · ${phoneMasked}`}
      </Button>
      {sent && (
        <>
          <Field label={t.code} error={err ?? undefined}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} value={code} inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                className="text-center font-mono text-h3 tracking-[0.5em]" onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
            )}
          </Field>
          <Button onClick={() => void verify()} disabled={code.length !== 6 || busy} loading={busy}>{t.verify}</Button>
        </>
      )}
      {!sent && err && <p role="alert" className="text-small text-danger">{err}</p>}
    </div>
  );
}

// U7c CustodyChain (board 05 RC4, journey F5): collected → with agent → handed to office → returned / deposited.
// Built from local receipts + queued custody ops, merged with the server chain when online.
type Row = { key: string; stage: CustodyStage | "collected"; at: string; ref?: string; pending: boolean };

export function CustodyChain({ visit, onReturn }: { visit: FieldVisit; onReturn: () => void }) {
  const { locale } = useFieldCopy();
  const t = copyC(locale);
  const toast = useToast();
  const online = useOnline();
  const eng = useEngine();
  const [deposit, setDeposit] = useState(false);
  const [slip, setSlip] = useState<Captured | null>(null);
  const [subRef, setSubRef] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const server = useQuery({
    queryKey: ["field", "custody", visit.id],
    queryFn: () => fx<{ receiptRef: string; events: CustodyEvent[] }[]>("GET", `/api/x_field/visits/${visit.id}/custody`),
    enabled: online, networkMode: "offlineFirst",
  });

  const receipts = receiptsOf(eng.ops, visit.id);
  const collected = receipts.find((r) => r.direction === "collected");
  const rows: Row[] = [];
  for (const r of receipts) {
    if (r.direction === "collected") rows.push({ key: `c-${r.id}`, stage: "collected", at: r.signature.signedAt, ref: r.ref ?? r.localRef, pending: r.sync !== "sent" }, { key: `a-${r.id}`, stage: "with_agent", at: r.signature.signedAt, ref: r.ref ?? r.localRef, pending: r.sync !== "sent" });
    else rows.push({ key: `r-${r.id}`, stage: "returned_to_client", at: r.signature.signedAt, ref: r.ref ?? r.localRef, pending: r.sync !== "sent" });
  }
  for (const o of eng.ops.filter((o) => o.kind === "custody.handover" && o.visitId === visit.id)) {
    rows.push({ key: o.opId, stage: o.body.action === "deposit" ? "deposited" : "with_office", at: new Date(o.createdAt).toISOString(), ref: o.body.ref as string | undefined, pending: o.state !== "sent" });
  }
  // Server-only events (e.g. SM confirmed receipt in /ops/field, incidents) not already shown locally.
  for (const c of server.data ?? []) for (const e of c.events) {
    if (!rows.some((r) => r.stage === e.stage)) rows.push({ key: `s-${c.receiptRef}-${e.stage}-${e.at}`, stage: e.stage, at: e.at, ref: e.ref, pending: false });
  }
  rows.sort((a, b) => a.at.localeCompare(b.at));
  if (!rows.length) return null;

  const last = rows.at(-1)!.stage;
  const open = last === "with_agent" || last === "collected";
  const receiptRef = collected ? (collected.ref ?? collected.localRef) : undefined;

  async function handover() {
    try { await enqueue({ kind: "custody.handover", visitId: visit.id, body: { action: "handover", receipt_ref: receiptRef } }); toast({ title: t.handoverDone, tone: "success" }); }
    catch { toast({ title: t.saveFailed, tone: "danger" }); }
  }
  async function saveDeposit() {
    if (!slip || !subRef.trim()) return setErr(t.depositNeed);
    try {
      await enqueue({ kind: "custody.handover", visitId: visit.id, body: { action: "deposit", receipt_ref: receiptRef, evidence: slip.dataUrl, ref: subRef.trim() } });
      setDeposit(false); setSlip(null); setSubRef(""); setErr(null);
    } catch { setErr(t.saveFailed); }
  }

  return (
    <section aria-labelledby="cc-title" className="grid gap-4 bg-surface p-4 sm:p-6">
      <h2 id="cc-title" className="text-fg-heading text-card-title">{t.custodyTitle}</h2>
      <Timeline items={rows.map((r, i) => ({
        id: r.key, current: i === rows.length - 1,
        title: t.stage[r.stage],
        meta: <span className="inline-flex flex-wrap items-center gap-2 tabular">{hhmm(r.at, locale)}{r.ref && (r.ref.includes("LOCAL") ? <LocalRef localRef={r.ref} /> : <LocalRef localRef={r.ref} serverRef={r.ref} />)}{r.pending && <span className="text-fg-subtle">· {t.sync.queued}</span>}</span>,
      }))} />
      {open && !deposit && (
        <div className="flex flex-wrap gap-2 [&>*]:min-h-12 [&>*]:flex-1">
          <Button variant="secondary" onClick={() => void handover()}>{t.handover}</Button>
          <Button variant="outline" onClick={onReturn}>{t.returnToClient}</Button>
          <Button variant="outline" onClick={() => setDeposit(true)}>{t.deposit}</Button>
        </div>
      )}
      {deposit && (
        <div className="m-rise grid gap-3 border border-border p-3">
          <PhotoCapture label={t.depositPhoto} value={slip} stamp={{ coords: null }} onCapture={({ file, ...p }) => { void file; setSlip(p); setErr(null); }} />
          <Field label={t.depositRef} error={err ?? undefined}>{({ id }) => <Input id={id} value={subRef} onChange={(e) => setSubRef(e.target.value)} autoComplete="off" />}</Field>
          <div className="flex gap-2 [&>*]:min-h-12 [&>*]:flex-1">
            <Button variant="outline" onClick={() => setDeposit(false)}>{t.cancel}</Button>
            <Button onClick={() => void saveDeposit()}>{t.depositSave}</Button>
          </div>
        </div>
      )}
    </section>
  );
}
