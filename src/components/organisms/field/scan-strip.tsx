"use client";
// U5c scans: capture → auto-crop → crop sheet → enhance → page list (reorder by buttons, delete) → one scan.upload op.
// Pages are compressed JPEGs; the server assembles the PDF (no client PDF library).
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/atoms/button";
import { Sheet } from "@/components/atoms/dialog";
import { Input } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { useCopyB } from "@/lib/field/copy-b";
import { fill } from "@/lib/field/copy";
import { useSave } from "@/lib/field/b";
import { useEngine } from "@/lib/field/sync";
import { usePrefs } from "@/lib/field/prefs";
import { storageEstimate, quotaLevel } from "@/lib/field/store";
import { autoCropBox, processImage, type Captured } from "@/lib/field/image";
import type { FieldVisit } from "@/shared/field/types";
import { kb, LocalRef } from "@/components/atoms/field-agent";
import { CropSheet, type Box } from "@/components/organisms/field/crop-sheet";

type Page = Captured & { id: string; name: string };

export function useQuotaBlocked() {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => { void storageEstimate().then((e) => setBlocked(quotaLevel(e.used, e.quota) === "block")); }, []);
  return blocked;
}

export function ScanStrip({ visit }: { visit: FieldVisit }) {
  const t = useCopyB();
  const s = t.scan;
  const eng = useEngine();
  const { liteOn } = usePrefs();
  const save = useSave();
  const toast = useToast();
  const blocked = useQuotaBlocked();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [pages, setPages] = useState<Page[]>([]);
  const [crop, setCrop] = useState<{ file: File; auto: Box; size: { w: number; h: number }; capturedAt: number; replace?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scans = eng.ops.filter((o) => o.kind === "scan.upload" && o.visitId === visit.id);

  async function onFile(file: File | undefined, replace?: string) {
    if (!file) return;
    const capturedAt = Date.now();
    setBusy(true);
    try {
      const b = await autoCropBox(file);
      setCrop({ file, auto: { x: b.x, y: b.y, w: b.w, h: b.h }, size: { w: b.srcW, h: b.srcH }, capturedAt, replace });
    } catch { toast({ title: s.processing, tone: "danger" }); } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  async function apply(box: Box, enhance: boolean) {
    if (!crop) return;
    setBusy(true);
    const c = crop;
    setCrop(null);
    try {
      const p = await processImage(c.file, { lite: liteOn, capturedAt: c.capturedAt, fileTime: c.file.lastModified, crop: box, enhance });
      const page: Page = { ...p, id: c.replace ?? crypto.randomUUID(), name: c.file.name };
      setPages((xs) => (c.replace ? xs.map((x) => (x.id === c.replace ? page : x)) : [...xs, page]));
    } finally { setBusy(false); }
  }
  const swap = (i: number, j: number) => setPages((xs) => { const n = [...xs]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  async function done() {
    if (!label.trim()) return setErr(s.labelRequired);
    const op = await save({
      kind: "scan.upload", visitId: visit.id, localPrefix: "SC",
      body: { group_id: crypto.randomUUID(), label: label.trim(), pages: pages.map((p, i) => ({ page_index: i, data: p.dataUrl, bytes: p.bytes })) },
    });
    if (!op) return;
    toast({ title: s.saved, tone: "success" });
    setOpen(false); setPages([]); setLabel(""); setErr(null);
  }

  return (
    <section className="grid gap-3 border border-border bg-surface p-5">
      <Button size="lg" className="w-full justify-center" disabled={blocked} onClick={() => setOpen(true)}><Icon name="camera" size={20} aria-hidden />{t.work.scanDoc}</Button>
      {blocked && <p className="text-small text-danger">{s.blocked}</p>}
      <h3 className="mt-1 text-label">{t.work.scanned}</h3>
      {scans.length === 0 ? <p className="text-small text-fg-subtle">{t.work.noScans}</p> : (
        <ul className="grid divide-y divide-border">
          {scans.map((o) => {
            const b = o.body as { label: string; pages: unknown[] };
            return (
              <li key={o.opId} className="flex min-h-14 items-center gap-3 py-2">
                <span className="flex size-9 items-center justify-center bg-navy-50 text-navy-700"><Icon name="file" size={18} aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-label">{b.label}</span>
                  <span className="block text-small text-fg-subtle tabular">{fill(s.pages, { n: b.pages.length })} · {kb(o.bytes)} · {s.sync[o.state]}</span>
                </span>
                <LocalRef localRef={o.localRef ?? "SC-LOCAL"} serverRef={o.serverRef} />
              </li>
            );
          })}
        </ul>
      )}

      <Sheet side="bottom" open={open} onClose={() => setOpen(false)} title={s.title}
        footer={<Button size="lg" disabled={!pages.length || busy} onClick={() => void done()}>{fill(s.done, { n: pages.length })}</Button>}>
        <div className="grid gap-4">
          <label className="grid gap-1.5"><span className="text-label">{s.label}</span>
            <Input value={label} placeholder={s.labelPh} maxLength={80} aria-invalid={!!err || undefined} onChange={(e) => { setLabel(e.target.value); setErr(null); }} /></label>
          {err && <p role="alert" className="text-small font-medium text-danger">{err}</p>}
          <ol className="grid gap-2">
            {pages.map((p, i) => (
              <li key={p.id} className="m-pop flex items-center gap-3 border border-border p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
                {liteOn ? <Icon name="file" size={24} aria-hidden className="mx-2" /> : <img src={p.dataUrl} alt="" className="h-16 w-12 object-cover" />}
                <span className="min-w-0 flex-1 text-small">
                  <span className="block font-medium">{fill(s.page, { n: i + 1 })}</span>
                  <span className="block truncate text-fg-subtle tabular">{liteOn ? `${p.name} · ` : ""}{kb(p.bytes)}</span>
                </span>
                <span className="flex">
                  <button type="button" aria-label={fill(s.up, { n: i + 1 })} disabled={i === 0} onClick={() => swap(i, i - 1)} className="flex size-11 items-center justify-center hover:bg-ink-100 disabled:opacity-30"><Icon name="chevronDown" size={18} aria-hidden className="rotate-180" /></button>
                  <button type="button" aria-label={fill(s.down, { n: i + 1 })} disabled={i === pages.length - 1} onClick={() => swap(i, i + 1)} className="flex size-11 items-center justify-center hover:bg-ink-100 disabled:opacity-30"><Icon name="chevronDown" size={18} aria-hidden /></button>
                  <button type="button" aria-label={fill(s.del, { n: i + 1 })} onClick={() => setPages((xs) => xs.filter((x) => x.id !== p.id))} className="flex size-11 items-center justify-center rounded-full text-danger hover:bg-danger-bg"><Icon name="x" size={18} aria-hidden /></button>
                </span>
              </li>
            ))}
          </ol>
          <input ref={input} id={inputId} type="file" accept="image/*" capture="environment" className="peer sr-only" aria-label={pages.length ? s.addPage : s.firstPage} disabled={busy || blocked}
            onChange={(e) => void onFile(e.target.files?.[0])} />
          <label htmlFor={inputId} aria-disabled={busy || blocked || undefined}
            className="m-press flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-border-strong text-button hover:border-navy-400 peer-focus-visible:outline-2 peer-focus-visible:outline-focus aria-disabled:opacity-50">
            {busy ? <span aria-hidden className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Icon name="camera" size={26} aria-hidden />}
            {busy ? s.processing : pages.length ? s.addPage : s.firstPage}
          </label>
        </div>
      </Sheet>
      {crop && <CropSheet file={crop.file} auto={crop.auto} size={crop.size} onClose={() => setCrop(null)} onApply={(b, e) => void apply(b, e)} />}
    </section>
  );
}
