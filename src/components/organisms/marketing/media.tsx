"use client";
// Media library (U7, board MD1–3): grid + filters in URL, side panel (?asset=), upload with client checks, re-encode, per-file rows + retry.
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx, formatRelative } from "@/shared/format";
import { errorCopy } from "@/lib/api/error-copy";
import { fill } from "@/content/pages/mkt-common";
import { useDeleteMedia, useMedia, usePatchMedia, useUploadMedia } from "@/lib/marketing/content";
import type { Locale, MediaAsset } from "@/shared/marketing/types";
import { LOCALES } from "@/shared/marketing/types";
import { MKT_POLICY } from "@/shared/policy";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { Dialog } from "@/components/atoms/dialog";
import { PanelError } from "@/components/molecules/ops/ops";
import { PageHead, useM } from "@/components/atoms/marketing";
import { ArtMedia, Empty, useCC } from "@/components/molecules/marketing/marketing";

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
type Row = { name: string; state: "processing" | "done" | "error"; error?: string; file: File };

export function MediaView() {
  const c = useCC();
  const m = useM();
  const { locale } = useI18n();
  const toast = useToast();
  const p = useUrlParams();
  const q = useMedia();
  const up = useUploadMedia();
  const [rows, setRows] = useState<Row[]>([]);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const filter = p.get("type") ?? "all";
  const missing = p.get("missingAlt") as Locale | null;
  const sel = (q.data?.items ?? []).find((a) => a.id === p.get("asset"));

  const items = (q.data?.items ?? []).filter((a) =>
    (filter === "all" || (filter === "image" ? a.mime.startsWith("image/") : filter === "pdf" ? a.mime === "application/pdf" : filter === "unused" ? !a.usage.length : true))
    && (!missing || (a.mime.startsWith("image/") && !a.alt[missing]?.trim())));

  async function uploadOne(file: File, replace?: string) {
    const setR = (r: Partial<Row>) => setRows((xs) => xs.map((x) => (x.file === file ? { ...x, ...r } : x)));
    const max = (file.type === "application/pdf" ? MKT_POLICY.maxPdfMb : MKT_POLICY.maxImageMb) * 1024 * 1024;
    if (!ACCEPT.includes(file.type)) return setR({ state: "error", error: fill(c.media.badType, { name: file.name }) });
    if (file.size > max) return setR({ state: "error", error: fill(c.media.tooBig, { name: file.name }) });
    try {
      // The server re-encodes (EXIF/GPS stripped, WebP 480/960/1600) and stores the variants.
      await up.mutateAsync({ file, replaceId: replace });
      setR({ state: "done" });
    } catch (e) { setR({ state: "error", error: errorCopy(e, locale) }); }
  }
  function take(files: FileList | null, replace?: string) {
    if (!files?.length) return;
    const list = [...files];
    setRows((xs) => [...list.map((f) => ({ name: f.name, state: "processing" as const, file: f })), ...xs].slice(0, 12));
    list.forEach((f) => uploadOne(f, replace));
    if (replace) toast({ title: c.media.replaced, tone: "success" });
  }
  const done = rows.filter((r) => r.state === "done").length;

  return (
    <div>
      <PageHead title={c.titles.media} sub={c.subs.media} />
      <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); take(e.dataTransfer.files); }}
        className="mb-4 grid cursor-pointer place-items-center gap-1 border-2 border-dashed border-border-strong bg-white px-4 py-8 text-center hover:border-navy-300 focus-within:outline-2 focus-within:outline-focus">
        <Icon name="upload" size={22} aria-hidden className="text-link" />
        <span className="text-label">{c.media.drop}</span>
        <span className="text-small text-fg-subtle">{c.media.limits}</span>
        <input type="file" multiple accept={ACCEPT.join(",")} className="sr-only" onChange={(e) => { take(e.target.files); e.target.value = ""; }} />
      </label>
      {rows.length > 0 && (
        <div className="mb-4 border border-border bg-white p-3" aria-live="polite">
          <p className="mb-2 text-small font-medium">{fill(c.media.partial, { ok: done, n: rows.length })}</p>
          <ul className="grid gap-1 text-small">{rows.map((r, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <Icon name={r.state === "done" ? "check" : r.state === "error" ? "x" : "clock"} size={14} className={r.state === "done" ? "text-success" : r.state === "error" ? "text-danger" : "text-fg-subtle"} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{r.name}</span>
              {r.state === "processing" && <span className="text-fg-subtle">{c.media.processing}</span>}
              {r.state === "done" && <span className="text-eyebrow text-success">{c.media.stripped} · {c.media.resized} · {c.media.altReq}</span>}
              {r.state === "error" && <><span className="text-danger">{r.error}</span><button type="button" className="underline" onClick={() => { setRows((xs) => xs.map((x) => x === r ? { ...x, state: "processing", error: undefined } : x)); uploadOne(r.file); }}>{c.media.retry}</button></>}
            </li>))}</ul>
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-1" role="toolbar">
        {["all", "image", "pdf", "unused"].map((k) => <button key={k} type="button" aria-pressed={filter === k && !missing} onClick={() => setUrlParams({ type: k === "all" ? null : k, missingAlt: null })} className={cx("h-9 px-3 text-small", filter === k && !missing ? "bg-secondary text-on-secondary" : "bg-white hover:bg-ink-100")}>{c.media.filters[k]}</button>)}
        {LOCALES.map((l) => <button key={l} type="button" aria-pressed={missing === l} onClick={() => setUrlParams({ missingAlt: missing === l ? null : l, type: null })} className={cx("h-9 px-3 text-small", missing === l ? "bg-secondary text-on-secondary" : "bg-white hover:bg-ink-100")}>{fill(c.media.filters.missingAlt, { l: l.toUpperCase() })}</button>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div>
          {q.isPending ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="aspect-square m-shimmer" />)}</div>
            : q.isError ? <PanelError what={c.titles.media} onRetry={() => q.refetch()} />
            : !items.length ? ((q.data?.items.length ?? 0) ? <Empty art={<ArtMedia />} title={m.states.filteredEmpty} action={<Button variant="secondary" onClick={() => setUrlParams({ type: null, missingAlt: null })}>{m.states.clear}</Button>} /> : <Empty art={<ArtMedia />} title={c.media.empty} />)
            : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 m-stagger">
              {items.map((a, i) => {
                const noAlt = a.mime.startsWith("image/") && LOCALES.some((l) => !a.alt[l]?.trim());
                return (
                  <li key={a.id} style={{ ["--i" as string]: i }}>
                    <button type="button" onClick={() => setUrlParams({ asset: a.id })} aria-pressed={sel?.id === a.id} className={cx("group block w-full overflow-hidden border bg-white text-left m-press", sel?.id === a.id ? "border-navy-700 ring-2 ring-gold-400" : "border-border hover:border-navy-300")}>
                      <span className="block aspect-square bg-bg-subtle">{a.mime.startsWith("image/") ? <img src={a.url} alt={a.alt[locale] ?? ""} className="size-full object-cover" style={a.focal ? { objectPosition: `${a.focal.x * 100}% ${a.focal.y * 100}%` } : undefined} /> : <span className="flex size-full items-center justify-center"><Icon name="file" size={32} aria-hidden /></span>}</span>
                      <span className="block truncate px-2 pt-2 text-small" title={a.key}>{a.key}</span>
                      <span className="flex flex-wrap gap-1 px-2 pb-2 text-eyebrow text-fg-subtle">{a.usage.length ? fill(c.media.inUse, { n: a.usage.length }) : c.media.unused}{noAlt && <span className="bg-warning-bg px-1 text-warning">{c.media.missingAlt}</span>}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {sel && <AssetPanel a={sel} onReplace={() => setReplaceId(sel.id)} />}
      </div>
      <Dialog open={!!replaceId} onClose={() => setReplaceId(null)} title={c.media.replace}>
        <input type="file" accept={ACCEPT.join(",")} aria-label={c.media.replace} onChange={(e) => { if (replaceId) take(e.target.files, replaceId); setReplaceId(null); }} />
      </Dialog>
    </div>
  );
}

function AssetPanel({ a, onReplace }: { a: MediaAsset; onReplace: () => void }) {
  const c = useCC();
  const m = useM();
  const { locale } = useI18n();
  const toast = useToast();
  const save = usePatchMedia();
  const del = useDeleteMedia();
  const [alt, setAlt] = useState(a.alt);
  const [tab, setTab] = useState<Locale>(locale);
  const [focal, setFocal] = useState(a.focal);
  const [credit, setCredit] = useState(a.credit ?? "");
  const img = a.mime.startsWith("image/");
  return (
    <aside key={a.id} className="grid h-fit gap-4 border border-border bg-white p-4 lg:sticky lg:top-20 m-rise" aria-label={c.media.details}>
      <div className="flex items-start justify-between gap-2"><p className="min-w-0 truncate text-label-lg" title={a.key}>{a.key}</p><button type="button" aria-label={m.common.close} onClick={() => setUrlParams({ asset: null })}><Icon name="x" size={16} aria-hidden /></button></div>
      {img && (
        <div>
          <p className="mb-1 text-label">{c.media.focal}</p>
          <button type="button" className="relative block w-full overflow-hidden" aria-label={c.media.focalHint}
            onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setFocal({ x: +((e.clientX - r.left) / r.width).toFixed(2), y: +((e.clientY - r.top) / r.height).toFixed(2) }); }}>
            <img src={a.url} alt="" className="w-full" />
            {focal && <span aria-hidden className="absolute size-5 -translate-1/2 rounded-full border-2 border-white bg-gold-400 shadow" style={{ left: `${focal.x * 100}%`, top: `${focal.y * 100}%` }} />}
          </button>
          <p className="mt-1 text-eyebrow text-fg-subtle">{c.media.focalHint}</p>
        </div>
      )}
      <p className="text-eyebrow text-fg-subtle">{fill(c.media.uploadedBy, { who: a.uploadedBy, t: formatRelative(a.uploadedAt, locale) })} · {fill(c.media.bytes, { kb: Math.round(a.bytes / 1024) })}{a.width ? ` · ${a.width}×${a.height}` : ""}</p>
      {img && (
        <div>
          <div role="tablist" className="mb-2 flex gap-1">{LOCALES.map((l) => <button key={l} role="tab" type="button" aria-selected={tab === l} onClick={() => setTab(l)} className={cx("h-8 px-3 text-small", tab === l ? "bg-secondary text-on-secondary" : "hover:bg-ink-100", !alt[l]?.trim() && "ring-1 ring-warning")}>{l.toUpperCase()}</button>)}</div>
          <label className="grid gap-1.5"><span className="text-label">{c.media.alt} ({m.locale[tab]})</span><Input lang={tab} value={alt[tab] ?? ""} onChange={(e) => setAlt({ ...alt, [tab]: e.target.value })} /></label>
        </div>
      )}
      <label className="grid gap-1.5"><span className="text-label">{c.media.credit}</span><Input value={credit} onChange={(e) => setCredit(e.target.value)} /></label>
      <div>
        <p className="text-label">{c.media.usage}</p>
        {!a.usage.length ? <p className="text-small text-fg-muted">{c.media.unused}</p> : <ul className="text-small">{a.usage.map((u) => <li key={u.entryId}>• {u.title}</li>)}</ul>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" loading={save.isPending} onClick={() => save.mutate({ id: a.id, alt, focal, credit }, { onSuccess: () => toast({ title: m.common.save, tone: "success" }), onError: (e) => toast({ title: errorCopy(e, locale), tone: "danger" }) })}>{m.common.save}</Button>
        <Button size="sm" variant="secondary" onClick={onReplace}>{c.media.replace}</Button>
        <span title={a.usage.length ? fill(c.media.inUse, { n: a.usage.length }) : undefined}>
          <Button size="sm" variant="ghost" disabled={!!a.usage.length} onClick={() => del.mutate(a.id, { onSuccess: () => { setUrlParams({ asset: null }); toast({ title: c.media.deleted }); }, onError: (e) => toast({ title: errorCopy(e, locale), tone: "danger" }) })}>{c.media.delete}</Button>
        </span>
      </div>
    </aside>
  );
}
