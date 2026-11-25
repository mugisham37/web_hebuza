"use client";
// ContentEditor (U3 CP2–CP4, U5 LP2–LP4, U6 KN2/KN3/KN5): one editor for page, landing, guide, update, FAQ, team.
// Panes: structure 16 rem · canvas · settings 22 rem (≥1280); settings stack under the canvas below that; <768 px review-only.
// Structure (blocks) is per entry, text is per variant. Autosave 10 s with If-Match; offline edits queue in localStorage.
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx, formatDateTime, formatRelative } from "@/shared/format";
import { ApiError } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { fill } from "@/content/pages/mkt-common";
import { useMktShell, useStaff } from "@/lib/marketing/api";
import {
  lockEntry, patchEntry, previewToken, putVariant, unlockEntry, useComments, useEntry, useLandingPerf, useMedia, useVersions, useWorkflow,
  type EntryDetail,
  useVerifyCredential,
} from "@/lib/marketing/content";
import type { BlockShape, BlockText, BlockType, CmsVariant, Locale, PublishBlocker, RichDoc, SeoFields } from "@/shared/marketing/types";
import { LOCALES } from "@/shared/marketing/types";
import { MKT_POLICY } from "@/shared/policy";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Checkbox, Input, Select, Switch, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { Panel, PanelError } from "@/components/molecules/ops/ops";
import { useOnline } from "@/components/atoms/hooks";
import { useNow } from "@/components/atoms/agent";
import { CharCounter, KbChip, LocaleCoverage, StaffName, WorkflowChip, useM } from "@/components/atoms/marketing";
import { BlockRenderer } from "@/components/molecules/site/site";
import { approverRule, coverageOf, editorBase, localBlockers, moneyIn, newBlock, publicPath, useCC } from "@/components/molecules/marketing/marketing";

type Panel = "settings" | "seo" | "ai" | "history" | "comments" | "performance";
const PALETTE: Record<string, BlockType[]> = {
  page: ["heading", "rich_text", "image", "gallery", "video", "callout", "cta", "service_cards", "faq_list", "steps", "table", "quote", "form", "stats", "contact", "divider"],
  home: ["home.hero", "home.tracker", "home.institutions", "home.services", "home.how", "home.guides", "home.cta"],
  landing_page: ["home.hero", "rich_text", "service_cards", "testimonial", "form", "faq_list", "cta", "image", "stats"],
  guide: ["heading", "rich_text", "requirements", "steps", "tip", "image", "callout", "service_cards", "table", "video"],
  regulatory_update: ["heading", "rich_text", "callout", "table", "cta"],
  faq: ["rich_text"],
  team_member: ["rich_text", "image"],
};
const paletteFor = (e: EntryDetail) => (e.key === "home" ? PALETTE.home : PALETTE[e.type === "article" ? "guide" : e.type] ?? PALETTE.page);

// ---------------------------------------------------------------- rich text <-> plain (allow-listed: paragraphs + bullet lists)
// shortcut: textarea with blank-line paragraphs and "- " bullets stands in for the contenteditable editor (D-11), upgrade if marks are needed.
const docToText = (d?: RichDoc) => (d?.content ?? []).map((n) => n.type === "paragraph" ? (n.content ?? []).map((i) => i.text).join("") : n.items.map((it) => `- ${it.map((i) => i.text).join("")}`).join("\n")).join("\n\n");
function textToDoc(s: string): RichDoc {
  return { type: "doc", content: s.split(/\n{2,}/).filter((p) => p.trim()).map((p) => {
    const lines = p.split("\n");
    return lines.every((l) => l.startsWith("- ")) ? { type: "bullet_list" as const, items: lines.map((l) => [{ text: l.slice(2) }]) } : { type: "paragraph" as const, content: [{ text: p }] };
  }) };
}
const textOf = (b: BlockShape, t?: BlockText) => {
  if (!t) return "";
  if (b.type === "rich_text") return docToText(t.doc as RichDoc);
  if (b.type.startsWith("home.")) return Object.values((t.copy as Record<string, string>) ?? {}).join("");
  return JSON.stringify(t).replace(/"[a-zA-Z]+":/g, "").replace(/[{}[\]",|]/g, "").trim();
};

const OUTBOX = (id: string, l: Locale) => `posiba.mkt.outbox.${id}.${l}`;
const read = <T,>(k: string): T | null => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; } };

export function ContentEditor({ id }: { id: string }) {
  const c = useCC();
  const m = useM();
  const { locale: ui } = useI18n();
  const toast = useToast();
  const online = useOnline();
  const now = useNow();
  const p = useUrlParams();
  const q = useEntry(id);
  const shell = useMktShell();
  const staff = useStaff().data?.items ?? [];
  const media = useMedia().data?.items ?? [];
  const wf = useWorkflow(id);
  const me = shell.data?.me ?? null;
  const lang = (p.get("locale") as Locale) || ui;
  const panel = (p.get("panel") as Panel) || "settings";
  const view = p.get("view") === "phone" ? "phone" : p.get("view") === "live" ? "live" : "desktop";
  const compare = p.get("compare") === "1";

  const entry = q.data;
  const [blocks, setBlocks] = useState<BlockShape[] | null>(null);
  const [variant, setVariant] = useState<CmsVariant | null>(null);
  const [extra, setExtra] = useState<Partial<EntryDetail>>({});
  const [dirty, setDirty] = useState({ blocks: false, variant: false });
  const [save, setSave] = useState<{ state: "idle" | "saving" | "saved" | "offline" | "failed"; at?: string }>({ state: "idle" });
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | "palette" | "submit" | "changes" | "publish" | "schedule" | "archive" | "conflict">(null);
  const [lock, setLock] = useState<{ holder: string; since: string } | null>(null);
  const [takeover, setTakeover] = useState(false);
  const loaded = useRef<string>("");

  // hydrate local draft from the server entry (and any offline outbox copy) once per entry+locale
  useEffect(() => {
    if (!entry || loaded.current === `${entry.id}:${lang}:${entry.version}:${entry.variants[lang]?.version ?? 0}`) return;
    loaded.current = `${entry.id}:${lang}:${entry.version}:${entry.variants[lang]?.version ?? 0}`;
    const queued = read<{ blocks?: BlockShape[]; variant?: CmsVariant }>(OUTBOX(entry.id, lang));
    setBlocks(queued?.blocks ?? entry.blocks);
    setVariant(queued?.variant ?? entry.variants[lang] ?? null);
    setExtra({});
    setDirty({ blocks: !!queued?.blocks, variant: !!queued?.variant });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset local draft when the loaded entry/version changes
    if (queued) setSave({ state: "offline" });
  }, [entry, lang]);

  // soft lock + 60 s heartbeat
  useEffect(() => {
    if (!me || me.role !== "marketing") return;
    let alive = true;
    const beat = () => lockEntry(id).then((l) => alive && setLock(l)).catch(() => {});
    beat();
    const t = setInterval(beat, 60_000);
    return () => { alive = false; clearInterval(t); unlockEntry(id).catch(() => {}); };
  }, [id, me]);

  const canEdit = me?.role === "marketing" && (!lock || lock.holder === me.name || takeover);
  const isMember = me?.role === "marketing";

  async function flush() {
    if (!entry || !blocks || (!dirty.blocks && !dirty.variant && !Object.keys(extra).length)) return;
    if (!navigator.onLine) {
      try { localStorage.setItem(OUTBOX(entry.id, lang), JSON.stringify({ blocks: dirty.blocks ? blocks : undefined, variant: dirty.variant ? variant : undefined })); } catch { /* storage full: keep in memory */ }
      setSave({ state: "offline" });
      return;
    }
    setSave({ state: "saving" });
    try {
      if (dirty.blocks || Object.keys(extra).length) await patchEntry(entry.id, { blocks, ...extra }, entry.version);
      if (dirty.variant && variant) await putVariant(entry.id, lang, variant, variant.version);
      try { localStorage.removeItem(OUTBOX(entry.id, lang)); } catch { /* ignore */ }
      setDirty({ blocks: false, variant: false });
      setExtra({});
      setSave({ state: "saved", at: new Date().toISOString() });
      q.refetch();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setDialog("conflict");
      setSave({ state: "failed" });
    }
  }
  const flushRef = useRef(flush);
  useEffect(() => { flushRef.current = flush; });
  useEffect(() => { const t = setInterval(() => flushRef.current(), 10_000); return () => clearInterval(t); }, []);
  useEffect(() => { if (online) flushRef.current(); }, [online]);

  if (q.isPending) return <EditorSkeleton />;
  if (q.isError) return (q.error instanceof ApiError && q.error.isNotFound) ? <NotFound /> : <PanelError what={c.titles.editor} onRetry={() => q.refetch()} />;
  if (!entry || !blocks) return <EditorSkeleton />;

  const v = variant;
  const status = v?.status ?? "draft";
  const blockers: PublishBlocker[] = [...entry.blockers.filter((b) => b.language === lang), ...(v ? localBlockers({ ...entry, blocks, variants: { ...entry.variants, [lang]: v } }, lang, media) : [])]
    .filter((b, i, a) => a.findIndex((x) => x.code === b.code && x.blockId === b.blockId) === i);
  const errors = blockers.filter((b) => b.severity === "error");
  const rule = approverRule({ ...entry, ...extra }, me, v?.authorId);
  const path = v ? publicPath(entry.type, lang, v.slug, entry.key) : null;
  const L = (x: string) => localHref(ui, x);
  const editV = (patch: Partial<CmsVariant>) => { if (!canEdit || !v) return; setVariant({ ...v, ...patch }); setDirty((d) => ({ ...d, variant: true })); setSave({ state: "idle" }); };
  const editBody = (bid: string, t: BlockText) => v && editV({ body: { ...v.body, [bid]: t } });
  const editBlocks = (next: BlockShape[]) => { if (!canEdit) return; setBlocks(next); setDirty((d) => ({ ...d, blocks: true })); setSave({ state: "idle" }); };
  const editEntry = (patch: Partial<EntryDetail>) => { if (!canEdit) return; setExtra((x) => ({ ...x, ...patch })); setSave({ state: "idle" }); };
  const meta = { ...entry.meta, ...(extra.meta ?? {}) };
  const ent = { ...entry, ...extra, meta, blocks };

  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= blocks.length) return; const n = [...blocks]; [n[i], n[j]] = [n[j], n[i]]; editBlocks(n); };
  const remove = (i: number) => {
    const b = blocks[i];
    if (b.type === "home.hero") return toast({ title: c.editor.heroLocked, tone: "danger" });
    const prev = blocks;
    editBlocks(blocks.filter((_, k) => k !== i));
    toast({ title: c.editor.removed, action: { label: m.common.undo, onClick: () => editBlocks(prev) } });
  };
  // Duplicate copies the current language's text only; other variants show the block empty until translated.
  const duplicate = (i: number) => { const b = blocks[i]; if (b.type === "home.hero") return toast({ title: c.editor.heroLocked, tone: "danger" }); const d = { ...newBlock(b.type), props: { ...b.props }, hidden: b.hidden }; editBlocks([...blocks.slice(0, i + 1), d, ...blocks.slice(i + 1)]); if (v?.body[b.id]) editBody(d.id, structuredClone(v.body[b.id])); setSelected(d.id); };
  const add = (t: BlockType) => { const b = newBlock(t); const at = selected ? blocks.findIndex((x) => x.id === selected) + 1 : blocks.length; editBlocks([...blocks.slice(0, at), b, ...blocks.slice(at)]); setSelected(b.id); setDialog(null); };
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await flush(); await fn(); toast({ title: ok, tone: "success" }); q.refetch(); setDialog(null); }
    catch (e) { toast({ title: errorCopy(e, ui), tone: "danger" }); }
  };
  async function copyPreview() {
    try { const t = await previewToken(entry!.id, lang); await navigator.clipboard?.writeText(new URL(t.url, location.origin).toString()); toast({ title: c.editor.previewCopied, tone: "success" }); }
    catch (e) { toast({ title: errorCopy(e, ui), tone: "danger" }); }
  }

  const sel = blocks.find((b) => b.id === selected) ?? null;
  const panels: { id: Panel; label: string }[] = [
    { id: "settings", label: c.panel.settings }, { id: "seo", label: c.panel.seo }, { id: "ai", label: c.panel.ai },
    { id: "history", label: c.panel.history }, { id: "comments", label: c.panel.comments },
    ...(entry.type === "landing_page" ? [{ id: "performance" as Panel, label: c.landing.perf }] : []),
  ];

  return (
    <div className="grid gap-4">
      {/* ---- top bar */}
      <div className="sticky top-0 z-20 -mx-gutter grid gap-3 border-b border-border bg-bg/95 px-gutter py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={L(editorBase(entry.type))} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-ink-100" aria-label={c.editor.back}><Icon name="arrowRight" size={16} className="rotate-180" aria-hidden /></Link>
          <h1 className="min-w-0 flex-1 truncate text-card-title" title={v?.title}>{v?.title || entry.key}</h1>
          <WorkflowChip status={status} at={v?.scheduledAt} />
          <SaveStatus state={save.state} at={save.at} now={now} />
          {lock && me && lock.holder !== me.name && <span className="inline-flex items-center gap-1.5 bg-warning-bg px-2.5 py-1 text-eyebrow text-warning"><Icon name="user" size={12} aria-hidden />{fill(c.editor.presence, { who: lock.holder })}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label={m.shell.language} className="flex bg-ink-100 p-1">
            {LOCALES.map((l) => (
              <button key={l} role="tab" aria-selected={l === lang} type="button" onClick={async () => { await flush(); setUrlParams({ locale: l }); }}
                className={cx("inline-flex h-8 items-center gap-1.5 px-3 text-small uppercase", l === lang ? "bg-white font-medium shadow-sm" : "text-fg-muted")}>
                {l}<span aria-hidden className={cx("size-1.5 rounded-full", coverageOf(entry)[l] === "ok" ? "bg-success" : coverageOf(entry)[l] === "missing" ? "bg-border-strong" : "bg-info")} />
                <span className="sr-only">{m.locale[coverageOf(entry)[l]]}</span>
              </button>
            ))}
          </div>
          <button type="button" aria-pressed={compare} onClick={() => setUrlParams({ compare: compare ? null : "1" })} className="hidden h-9 items-center px-3 text-small hover:bg-ink-100 lg:inline-flex">{c.editor.compare}</button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" onClick={copyPreview}><Icon name="file" size={14} aria-hidden />{c.editor.previewLink}</Button>
            {path && status === "published" && <a href={path} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 px-3 text-small hover:bg-ink-100">{c.editor.viewSite}<Icon name="arrowUpRight" size={14} aria-hidden /></a>}
            <WorkflowActions entryStatus={status} isMember={isMember} rule={rule} online={online} errors={errors.length} onOpen={setDialog}
              onApprove={() => act(() => wf.approve.mutateAsync({ langs: [lang] }), c.workflow.approved)}
              onUnschedule={() => act(() => wf.unschedule.mutateAsync(), c.workflow.unschedule)}
              onUnpublish={() => act(() => wf.unpublish.mutateAsync(), c.workflow.unpublish)} />
          </div>
        </div>
      </div>

      {!online && <p role="status" className="bg-secondary px-4 py-3 text-small text-on-secondary">{c.workflow.offlineOff}</p>}
      {lock && me && lock.holder !== me.name && !takeover && (
        <p role="status" className="flex flex-wrap items-center gap-3 bg-warning-bg px-4 py-3 text-small text-warning">{fill(c.editor.readOnlyBanner, { who: lock.holder })}
          <button type="button" className="underline underline-offset-4" onClick={() => setTakeover(true)}>{c.editor.editAnyway}</button></p>
      )}
      {!isMember && <p role="status" className="bg-info-bg px-4 py-3 text-small">{c.editor.readOnlyRole}</p>}
      {status === "in_review" && v?.reviewerId && <p role="status" className="bg-info-bg px-4 py-3 text-small text-info">{fill(c.workflow.underReview, { who: staff.find((s) => s.id === v.reviewerId)?.name ?? v.reviewerId })}</p>}
      {v?.needsReview && <p role="status" className="flex flex-wrap items-center gap-3 bg-info-bg px-4 py-3 text-small text-info"><Icon name="sparkle" size={16} aria-hidden />{c.editor.needsReview}
        {canEdit && <button type="button" className="underline underline-offset-4" onClick={() => editV({ needsReview: false })}>{c.editor.markReviewed}</button>}</p>}
      <p className="bg-bg-subtle px-4 py-3 text-small text-fg-muted md:hidden">{c.editor.reviewOnly}</p>

      {!v ? (
        <MissingVariant lang={lang} canEdit={!!canEdit} onCopy={() => act(() => wf.translate.mutateAsync({ from: "en", to: lang }), c.editor.copyFrom)}
          onBlank={() => { setVariant({ language: lang, slug: "", title: "", body: {}, seo: { title: "", description: "", robots: entry.type === "landing_page" ? "noindex" : "index" }, status: "draft", version: 0, authorId: me?.id ?? "", updatedAt: new Date().toISOString(), updatedBy: me?.name ?? "" }); setDirty((d) => ({ ...d, variant: true })); }} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)_22rem]">
          {/* ---- structure */}
          <aside className="hidden min-w-0 md:block">
            <Panel title={c.editor.structure} action={canEdit && <Button size="sm" variant="secondary" onClick={() => setDialog("palette")}><Icon name="plus" size={14} aria-hidden />{c.editor.addBlock}</Button>}>
              <ol className="grid gap-1" aria-label={c.editor.structure}>
                {blocks.map((b, i) => (
                  <li key={b.id}>
                    <div className={cx("group flex items-center gap-1 px-2 py-1.5 text-small", selected === b.id ? "bg-navy-50 text-navy-700" : "hover:bg-navy-50", b.hidden && "opacity-60")}
                      onKeyDown={(e) => { if (e.altKey && e.key === "ArrowUp") { e.preventDefault(); move(i, -1); } if (e.altKey && e.key === "ArrowDown") { e.preventDefault(); move(i, 1); } }}>
                      <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={() => setSelected(b.id)} aria-current={selected === b.id}>
                        {i + 1}. {c.blocks[b.type] ?? b.type}{b.hidden && <span className="ml-1 text-eyebrow text-fg-subtle">({c.editor.hidden})</span>}
                      </button>
                      {canEdit && <>
                        <IconBtn label={c.editor.moveUp} onClick={() => move(i, -1)} disabled={i === 0} glyph="↑" />
                        <IconBtn label={c.editor.moveDown} onClick={() => move(i, 1)} disabled={i === blocks.length - 1} glyph="↓" />
                        <IconBtn label={b.hidden ? c.editor.show : c.editor.hide} onClick={() => b.type === "home.hero" ? toast({ title: c.editor.heroLocked, tone: "danger" }) : editBlocks(blocks.map((x) => x.id === b.id ? { ...x, hidden: !x.hidden } : x))} glyph={b.hidden ? "◌" : "◉"} />
                        <IconBtn label={c.editor.duplicate} onClick={() => duplicate(i)} glyph="⧉" />
                        <IconBtn label={c.editor.remove} onClick={() => remove(i)} glyph="×" />
                      </>}
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-eyebrow text-fg-subtle">{c.editor.slashHint}</p>
            </Panel>
          </aside>

          {/* ---- canvas */}
          <section aria-label={c.editor.canvas} className="min-w-0">
            <div className="mb-2 flex items-center gap-1" role="group" aria-label={c.editor.canvas}>
              {(["desktop", "phone", "live"] as const).map((x) => <button key={x} type="button" aria-pressed={view === x} onClick={() => setUrlParams({ view: x === "desktop" ? null : x })} className={cx("h-8 px-3 text-small", view === x ? "bg-secondary text-on-secondary" : "hover:bg-ink-100")}>{c.editor[x]}</button>)}
            </div>
            {compare ? (
              <div className="grid gap-3 lg:grid-cols-3">
                {LOCALES.map((l) => { const vv = l === lang ? v : entry.variants[l]; return (
                  <div key={l} lang={l} className="border border-border bg-white p-4">
                    <p className="mb-2 text-eyebrow uppercase text-fg-subtle">{m.locale[l]}{vv && vv.version < (v.version ?? 0) && ` · ${m.locale.outdated}`}</p>
                    {vv ? <Canvas blocks={blocks} v={vv} selected={null} onSelect={() => {}} /> : <p className="text-small text-fg-muted">{c.editor.missingVariant}</p>}
                  </div>); })}
              </div>
            ) : view === "live" ? (
              <div className="border border-border bg-bg-subtle p-5 md:p-8" lang={lang}>
                <h2 className="mb-6 text-h2">{v.title}</h2>
                <BlockRenderer blocks={blocks} variant={v} assetUrl={(id) => { const a = media.find((x) => x.id === id); return a && { url: a.url, alt: a.alt?.[lang] }; }}
                  slot={(b) => (["form", "service_cards", "faq_list", "contact", "testimonial"].includes(b.type) || b.type.startsWith("home.")) ? <p className="border border-dashed border-border-strong p-4 text-small text-fg-muted">{c.blocks[b.type] ?? b.type} · {c.editor.liveIsland}</p> : undefined} />
              </div>
            ) : (
              <div className={cx("mx-auto border border-border bg-white p-5 transition-[max-width] duration-300 md:p-8", view === "phone" ? "max-w-[390px]" : "max-w-none")} lang={lang}>
                <Canvas blocks={blocks} v={v} selected={selected} onSelect={setSelected} />
              </div>
            )}
          </section>

          {/* ---- settings panel */}
          <aside className="min-w-0">
            <div role="tablist" aria-label={c.panel.settings} className="no-scrollbar mb-3 flex gap-1 overflow-x-auto border-b border-border">
              {panels.map((x) => <button key={x.id} role="tab" type="button" aria-selected={panel === x.id} onClick={() => setUrlParams({ panel: x.id === "settings" ? null : x.id })} className={cx("-mb-px h-10 shrink-0 border-b-2 px-3 text-small", panel === x.id ? "border-navy-700 font-medium" : "border-transparent text-fg-muted")}>{x.label}</button>)}
            </div>
            <div className="grid gap-4">
              {panel === "settings" && (sel
                ? <BlockSettings b={sel} t={v.body[sel.id]} canEdit={!!canEdit} media={media} onText={(t) => editBody(sel.id, t)} onProps={(pr) => editBlocks(blocks.map((x) => x.id === sel.id ? { ...x, props: { ...x.props, ...pr } } : x))} onSlash={() => setDialog("palette")} onClose={() => setSelected(null)} />
                : <PageSettings e={ent} v={v} canEdit={!!canEdit} onV={editV} onE={editEntry} />)}
              {panel === "seo" && <SeoPanel v={v} blockers={blockers} canEdit={!!canEdit} onSeo={(s) => editV({ seo: { ...v.seo, ...s } })} path={path} />}
              {panel === "ai" && <AiPanel e={ent} kb={entry.kb} canEdit={!!canEdit} sm={me?.role === "service_manager"} onE={editEntry} />}
              {panel === "history" && <HistoryPanel id={entry.id} lang={lang} current={v} blocks={blocks} canEdit={!!canEdit} onRestore={(ver) => act(() => wf.restore.mutateAsync({ version: ver, lang }), c.history.restored)} />}
              {panel === "comments" && <CommentsPanel id={entry.id} lang={lang} blocks={blocks} selected={selected} />}
              {panel === "performance" && <PerformancePanel id={entry.id} />}
            </div>
          </aside>
        </div>
      )}

      {/* ---- dialogs */}
      <Dialog open={dialog === "palette"} onClose={() => setDialog(null)} title={c.editor.addBlock}>
        <ul className="grid grid-cols-2 gap-2">
          {paletteFor(entry).map((t) => <li key={t}><button type="button" onClick={() => add(t)} className="flex h-12 w-full items-center border border-border px-3 text-left text-small hover:border-navy-300 m-press">{c.blocks[t] ?? t}</button></li>)}
        </ul>
      </Dialog>
      <SubmitDialog open={dialog === "submit"} onClose={() => setDialog(null)} staff={staff} needsSm={entry.type === "regulatory_update" || !!ent.serviceFacts} meId={me?.id}
        onSubmit={(reviewerId) => act(() => wf.submit.mutateAsync({ reviewerId, langs: [lang] }), c.workflow.submitted)} />
      <ReasonDlg open={dialog === "changes"} onClose={() => setDialog(null)} title={c.workflow.requestChanges} label={c.workflow.changesReason}
        onConfirm={(comment) => act(() => wf.requestChanges.mutateAsync({ comment }), c.workflow.changesSent)} />
      <PublishDialog open={dialog === "publish"} onClose={() => setDialog(null)} entry={entry} lang={lang} blockers={blockers}
        onPublish={(langs, fallback) => act(async () => { await wf.publish.mutateAsync({ langs, fallback }); }, c.workflow.published)} onSchedule={() => setDialog("schedule")} />
      <ScheduleDialog open={dialog === "schedule"} onClose={() => setDialog(null)} now={now}
        onSchedule={(at) => act(() => wf.schedule.mutateAsync({ at, langs: [lang] }), fill(c.workflow.scheduled, { t: formatDateTime(at, ui) }))} />
      <ArchiveDialog open={dialog === "archive"} onClose={() => setDialog(null)} onArchive={(to) => act(() => wf.archive.mutateAsync({ redirectTo: to }), c.workflow.archive)} />
      <Dialog open={dialog === "conflict"} onClose={() => setDialog(null)} title={c.conflict.title} description={c.conflict.body}
        footer={<div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => { try { localStorage.removeItem(OUTBOX(entry.id, lang)); } catch { /* ignore */ } loaded.current = ""; setDirty({ blocks: false, variant: false }); setDialog(null); q.refetch(); }}>{c.conflict.theirs}</Button>
          <Button onClick={async () => { const fresh = (await q.refetch()).data; if (fresh && v) { try { await putVariant(fresh.id, lang, v, fresh.variants[lang]?.version ?? 0); if (dirty.blocks) await patchEntry(fresh.id, { blocks }, fresh.version); setDirty({ blocks: false, variant: false }); setDialog(null); loaded.current = ""; q.refetch(); } catch (e) { toast({ title: errorCopy(e, ui), tone: "danger" }); } } }}>{c.conflict.mine}</Button>
        </div>}>
        <div className="grid gap-3 sm:grid-cols-2 text-small">
          <div className="bg-info-bg p-3"><p className="mb-1 font-medium">{c.conflict.yours}</p><p className="line-clamp-6">{v?.title}</p></div>
          <div className="bg-bg-subtle p-3"><p className="mb-1 font-medium">{c.conflict.their}</p><p className="line-clamp-6">{entry.variants[lang]?.title}</p></div>
        </div>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------- pieces
function IconBtn({ label, onClick, disabled, glyph }: { label: string; onClick: () => void; disabled?: boolean; glyph: string }) {
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="inline-flex size-7 items-center justify-center rounded-full text-fg-muted hover:bg-white hover:text-fg disabled:opacity-30">{glyph}</button>;
}
function Lbl({ label, hint, children, aside }: { label: string; hint?: string; children: ReactNode; aside?: ReactNode }) {
  return <label className="grid gap-1.5"><span className="flex items-center justify-between gap-2 text-label">{label}{aside}</span>{hint && <span className="text-small text-fg-subtle">{hint}</span>}{children}</label>;
}
function SaveStatus({ state, at, now }: { state: string; at?: string; now: number | null }) {
  const c = useCC();
  const { locale } = useI18n();
  const txt = state === "saving" ? c.editor.saving : state === "offline" ? c.editor.offline : state === "failed" ? c.editor.failed : state === "saved" && at ? fill(c.editor.saved, { t: formatRelative(at, locale, now ?? undefined) }) : "";
  return <span role="status" aria-live="polite" className={cx("text-eyebrow", state === "failed" ? "text-danger" : "text-fg-subtle")}>{txt}</span>;
}
function EditorSkeleton() {
  return <div className="grid gap-4" aria-busy><div className="h-24 m-shimmer" /><div className="grid gap-4 xl:grid-cols-[16rem_1fr_22rem]"><div className="h-80 m-shimmer" /><div className="h-[28rem] m-shimmer" /><div className="h-80 m-shimmer" /></div></div>;
}
function NotFound() {
  const m = useM();
  const { locale } = useI18n();
  return <div className="grid place-items-center gap-3 py-16 text-center"><p className="text-h3">404</p><Link className="underline" href={localHref(locale, "/marketing/content")}>{m.common.back}</Link></div>;
}
function MissingVariant({ lang, canEdit, onCopy, onBlank }: { lang: Locale; canEdit: boolean; onCopy: () => void; onBlank: () => void }) {
  const c = useCC();
  const m = useM();
  return (
    <div className="grid place-items-center gap-3 border border-dashed border-border-strong bg-white px-6 py-14 text-center m-rise">
      <p className="text-h3">{c.editor.missingVariant} · {m.locale[lang]}</p>
      <p className="max-w-sm text-small text-fg-muted">{c.editor.copyNote}</p>
      {canEdit && <div className="flex flex-wrap justify-center gap-2"><Button onClick={onCopy}>{c.editor.copyFrom}</Button><Button variant="secondary" onClick={onBlank}>{c.editor.startBlank}</Button></div>}
    </div>
  );
}

function WorkflowActions({ entryStatus, isMember, rule, online, errors, onOpen, onApprove, onUnschedule, onUnpublish }: {
  entryStatus: string; isMember: boolean; rule: ReturnType<typeof approverRule>; online: boolean; errors: number;
  onOpen: (d: "submit" | "changes" | "publish" | "archive") => void; onApprove: () => void; onUnschedule: () => void; onUnpublish: () => void;
}) {
  const c = useCC();
  const why = !online ? c.workflow.offlineOff : rule.reason ? c.workflow[rule.reason] : undefined;
  return (
    <>
      {isMember && entryStatus === "draft" && <Button size="sm" disabled={!online || errors > 0} title={errors ? c.publish.blocked : undefined} onClick={() => onOpen("submit")}>{c.workflow.submit}</Button>}
      {entryStatus === "in_review" && <>
        <Button size="sm" variant="secondary" disabled={!online} onClick={() => onOpen("changes")}>{c.workflow.requestChanges}</Button>
        <span title={why}><Button size="sm" disabled={!online || !rule.can} onClick={onApprove}>{c.workflow.approve}</Button></span>
        {!rule.can && why && <span className="max-w-56 text-eyebrow text-fg-subtle">{why}</span>}
      </>}
      {entryStatus === "approved" && <Button size="sm" variant="primary" disabled={!online} onClick={() => onOpen("publish")}>{c.workflow.publish}</Button>}
      {entryStatus === "scheduled" && <Button size="sm" variant="secondary" disabled={!online} onClick={onUnschedule}>{c.workflow.unschedule}</Button>}
      {isMember && (entryStatus === "published" || entryStatus === "stale") && <>
        <Button size="sm" variant="secondary" disabled={!online} onClick={onUnpublish}>{c.workflow.unpublish}</Button>
        <Button size="sm" variant="ghost" disabled={!online} onClick={() => onOpen("archive")}>{c.workflow.archive}</Button>
      </>}
    </>
  );
}

/** Canvas: selectable editing view of each block; `view=live` uses the public BlockRenderer. */
function Canvas({ blocks, v, selected, onSelect }: { blocks: BlockShape[]; v: CmsVariant; selected: string | null; onSelect: (id: string) => void }) {
  const c = useCC();
  return (
    <div className="grid gap-5">
      <h2 className="text-h2">{v.title}</h2>
      {v.excerpt && <p className="text-lead text-fg-muted">{v.excerpt}</p>}
      {blocks.map((b) => {
        const t = v.body[b.id] ?? {};
        const money = moneyIn(textOf(b, t));
        return (
          <button key={b.id} type="button" onClick={() => onSelect(b.id)} aria-label={c.blocks[b.type] ?? b.type}
            className={cx("relative block w-full p-3 text-left outline-offset-4 transition-shadow", selected === b.id ? "outline-2 outline-focus" : "hover:outline-1 hover:outline-border-strong", b.hidden && "opacity-40")}>
            <span className="mb-1 block text-eyebrow uppercase text-fg-subtle">{c.blocks[b.type] ?? b.type}</span>
            <BlockPreview b={b} t={t} />
            {money && <span className="mt-2 flex items-center gap-1.5 bg-warning-bg px-2 py-1 text-eyebrow text-warning"><Icon name="zap" size={12} aria-hidden />{c.editor.factWarning}</span>}
          </button>
        );
      })}
    </div>
  );
}
function BlockPreview({ b, t }: { b: BlockShape; t: BlockText }) {
  const s = (k: string) => (typeof t[k] === "string" ? (t[k] as string) : "");
  const items = (t.items as unknown[]) ?? [];
  switch (b.type) {
    case "heading": return b.props?.level === 3 ? <span className="block text-h3">{s("text")}</span> : <span className="block text-h2">{s("text")}</span>;
    case "rich_text": return <span className="block whitespace-pre-line text-body">{docToText(t.doc as RichDoc)}</span>;
    case "callout": case "tip": return <span className={cx("block p-4 text-body", b.type === "tip" ? "border-l-3 border-gold-400 bg-gold-50 text-fg" : b.props?.tone === "warn" ? "bg-warning-bg" : "bg-info-bg")}>{s("text")}</span>;
    case "quote": return <span className="block border-l-4 border-navy-700 pl-4 text-lead italic">“{s("text")}”{s("cite") && <span className="mt-1 block text-small not-italic text-fg-subtle">— {s("cite")}</span>}</span>;
    case "cta": return <span className="inline-flex h-11 items-center bg-primary px-5 text-button text-on-gold">{s("label") || "…"}</span>;
    case "steps": return <ol className="grid gap-2">{(items as { title: string; body?: string }[]).map((x, i) => <li key={i} className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gold-400 text-small text-on-gold">{i + 1}</span><span>{x.title}{x.body && <span className="block text-small text-fg-muted">{x.body}</span>}</span></li>)}</ol>;
    case "requirements": return <ul className="grid gap-1">{(items as string[]).map((x, i) => <li key={i} className="flex gap-2"><Icon name="fileCheck" size={18} className="text-link" aria-hidden />{x}</li>)}</ul>;
    case "stats": return <span className="grid grid-cols-2 gap-3 sm:grid-cols-4">{(items as { value: string; label: string }[]).map((x, i) => <span key={i}><span className="block text-h3">{x.value}</span><span className="text-small text-fg-muted">{x.label}</span></span>)}</span>;
    case "table": return <span className="block overflow-x-auto text-small">{[(t.head as string[]) ?? [], ...((t.rows as string[][]) ?? [])].map((r, i) => <span key={i} className={cx("grid grid-flow-col gap-2 border-b border-border py-1", i === 0 && "font-medium")}>{r.map((x, j) => <span key={j}>{x}</span>)}</span>)}</span>;
    case "image": return <span className="block aspect-[16/9] bg-bg-subtle text-center text-small leading-[8rem] text-fg-subtle">{String(b.props?.assetId ?? "—")}{s("caption") && ` · ${s("caption")}`}</span>;
    case "video": return <span className="block aspect-video bg-ink-900 p-4 text-small text-white">▶ {s("title")} · {String(b.props?.videoId ?? "")}</span>;
    case "divider": return <hr className="border-border" />;
    default:
      if (b.type.startsWith("home.")) { const cp = (t.copy as Record<string, string>) ?? {}; return <span className="block"><span className="block text-h3">{cp.headline}</span>{cp.sub && <span className="block text-body text-fg-muted">{cp.sub}</span>}{cp.cta && <span className="mt-2 inline-flex h-9 items-center bg-primary px-4 text-small text-on-gold">{cp.cta}</span>}</span>; }
      return <span className="block text-small text-fg-subtle">{JSON.stringify(b.props ?? {})}</span>;
  }
}

function BlockSettings({ b, t = {}, canEdit, media, onText, onProps, onSlash, onClose }: {
  b: BlockShape; t?: BlockText; canEdit: boolean; media: { id: string; key: string; mime: string }[];
  onText: (t: BlockText) => void; onProps: (p: Record<string, unknown>) => void; onSlash: () => void; onClose: () => void;
}) {
  const c = useCC();
  const f = c.fields;
  const s = (k: string) => (typeof t[k] === "string" ? (t[k] as string) : "");
  const dis = !canEdit;
  const lines = (k = "items") => ((t[k] as unknown[]) ?? []);
  const body: ReactNode = (() => {
    switch (b.type) {
      case "heading": return <><Lbl label={f.text}><Input disabled={dis} value={s("text")} onChange={(e) => onText({ ...t, text: e.target.value })} /></Lbl>
        <Lbl label={f.level}><Select disabled={dis} value={String(b.props?.level ?? 2)} onChange={(e) => onProps({ level: Number(e.target.value) })}><option value="2">H2</option><option value="3">H3</option></Select></Lbl></>;
      case "rich_text": return <Lbl label={f.text} hint={c.editor.slashHint}><Textarea disabled={dis} rows={10} value={docToText(t.doc as RichDoc)} onChange={(e) => { if (e.target.value === "/") return onSlash(); onText({ ...t, doc: textToDoc(e.target.value) }); }} /></Lbl>;
      case "callout": case "tip": return <><Lbl label={f.text}><Textarea disabled={dis} value={s("text")} onChange={(e) => onText({ ...t, text: e.target.value })} /></Lbl>
        {b.type === "callout" && <Lbl label={f.tone}><Select disabled={dis} value={String(b.props?.tone ?? "info")} onChange={(e) => onProps({ tone: e.target.value })}><option value="info">{f.info}</option><option value="warn">{f.warn}</option></Select></Lbl>}</>;
      case "quote": return <><Lbl label={f.text}><Textarea disabled={dis} value={s("text")} onChange={(e) => onText({ ...t, text: e.target.value })} /></Lbl><Lbl label={f.cite}><Input disabled={dis} value={s("cite")} onChange={(e) => onText({ ...t, cite: e.target.value })} /></Lbl></>;
      case "cta": return <><Lbl label={f.label}><Input disabled={dis} value={s("label")} onChange={(e) => onText({ ...t, label: e.target.value })} /></Lbl>
        <Lbl label={f.href}><Input disabled={dis} value={String(b.props?.href ?? "")} onChange={(e) => onProps({ href: e.target.value })} /></Lbl>
        <Lbl label={f.variant}><Select disabled={dis} value={String(b.props?.variant ?? "primary")} onChange={(e) => onProps({ variant: e.target.value })}><option value="primary">{f.primary}</option><option value="secondary">{f.secondary}</option></Select></Lbl></>;
      case "steps": return <Lbl label={f.lines} hint={f.linesBody}><Textarea disabled={dis} rows={8} value={(lines() as { title: string; body?: string }[]).map((x) => x.body ? `${x.title} | ${x.body}` : x.title).join("\n")}
        onChange={(e) => onText({ ...t, items: e.target.value.split("\n").filter(Boolean).map((l) => { const [title, ...rest] = l.split("|"); return { title: title.trim(), body: rest.join("|").trim() || undefined }; }) })} /></Lbl>;
      case "requirements": return <Lbl label={f.lines}><Textarea disabled={dis} rows={8} value={(lines() as string[]).join("\n")} onChange={(e) => onText({ ...t, items: e.target.value.split("\n").filter(Boolean) })} /></Lbl>;
      case "stats": return <Lbl label={f.stats}><Textarea disabled={dis} rows={5} value={(lines() as { value: string; label: string }[]).map((x) => `${x.value} | ${x.label}`).join("\n")} onChange={(e) => onText({ ...t, items: e.target.value.split("\n").filter(Boolean).map((l) => { const [value, label = ""] = l.split("|"); return { value: value.trim(), label: label.trim() }; }) })} /></Lbl>;
      case "table": return <Lbl label={f.table}><Textarea disabled={dis} rows={8} value={[(t.head as string[]) ?? [], ...((t.rows as string[][]) ?? [])].filter((r) => r.length).map((r) => r.join(" | ")).join("\n")}
        onChange={(e) => { const rows = e.target.value.split("\n").filter(Boolean).map((l) => l.split("|").map((x) => x.trim())); onText({ ...t, head: rows[0] ?? [], rows: rows.slice(1) }); }} /></Lbl>;
      case "image": return <><Lbl label={f.asset}><Select disabled={dis} value={String(b.props?.assetId ?? "")} onChange={(e) => onProps({ assetId: e.target.value })}><option value="">{f.pick}</option>{media.filter((x) => x.mime.startsWith("image/")).map((x) => <option key={x.id} value={x.id}>{x.key}</option>)}</Select></Lbl>
        <Lbl label={f.caption}><Input disabled={dis} value={s("caption")} onChange={(e) => onText({ ...t, caption: e.target.value })} /></Lbl></>;
      case "gallery": return <Lbl label={f.asset}><select multiple disabled={dis} className="min-h-32 border border-border-strong p-2" value={(b.props?.assetIds as string[]) ?? []} onChange={(e) => onProps({ assetIds: [...e.target.selectedOptions].map((o) => o.value) })}>{media.filter((x) => x.mime.startsWith("image/")).map((x) => <option key={x.id} value={x.id}>{x.key}</option>)}</select></Lbl>;
      case "video": return <><Lbl label={f.videoId}><Input disabled={dis} value={String(b.props?.videoId ?? "")} onChange={(e) => onProps({ provider: "youtube", videoId: e.target.value.replace(/[^\w-]/g, "").slice(0, 20) })} /></Lbl><Lbl label={f.videoTitle}><Input disabled={dis} value={s("title")} onChange={(e) => onText({ ...t, title: e.target.value })} /></Lbl></>;
      case "service_cards": return <Lbl label={f.services}><Input disabled={dis} value={((b.props?.serviceSlugs as string[]) ?? []).join(", ")} onChange={(e) => onProps({ serviceSlugs: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></Lbl>;
      case "faq_list": return <Lbl label={f.faqIds}><Input disabled={dis} value={((b.props?.faqIds as string[]) ?? []).join(", ")} onChange={(e) => onProps({ faqIds: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></Lbl>;
      case "form": return <Lbl label={f.form}><Select disabled={dis} value={String(b.props?.form ?? "lead")} onChange={(e) => onProps({ form: e.target.value })}><option value="lead">{f.lead}</option><option value="booking">{f.booking}</option></Select></Lbl>;
      default:
        if (b.type.startsWith("home.")) {
          const cp = (t.copy as Record<string, string>) ?? {};
          return <>{b.type === "home.hero" && <p className="bg-bg-subtle px-3 py-2 text-small">{c.editor.heroLocked}</p>}
            {(["headline", "sub", "cta"] as const).map((k) => <Lbl key={k} label={f[k]}><Input disabled={dis} value={cp[k] ?? ""} onChange={(e) => onText({ ...t, copy: { ...cp, [k]: e.target.value } })} /></Lbl>)}</>;
        }
        return <p className="text-small text-fg-muted">{f.none}</p>;
    }
  })();
  return (
    <Panel title={c.blocks[b.type] ?? b.type} action={<button type="button" onClick={onClose} className="text-small underline underline-offset-4">{c.panel.settings}</button>}>
      <div className="grid gap-4">{body}</div>
    </Panel>
  );
}

function PageSettings({ e, v, canEdit, onV, onE }: { e: EntryDetail; v: CmsVariant; canEdit: boolean; onV: (p: Partial<CmsVariant>) => void; onE: (p: Partial<EntryDetail>) => void }) {
  const c = useCC();
  const { locale } = useI18n();
  const dis = !canEdit;
  const reg = e.meta.regulatory;
  const land = e.meta.landing;
  const setReg = (p: Partial<NonNullable<typeof reg>>) => onE({ meta: { ...e.meta, regulatory: { authority: "", effectiveAt: "", sourceUrl: "", affects: [], ...reg, ...p } } });
  const setLand = (p: Partial<NonNullable<typeof land>>) => onE({ meta: { ...e.meta, landing: { form: { email: true, consent: [], thankYou: {} }, ...land, ...p } } });
  const slugOk = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.slug) || (!v.slug && (e.key === "home" || e.type === "faq"));
  return (
    <Panel title={c.panel.settings}>
      <div className="grid gap-4">
        <Lbl label={c.editor.titleField}><Input disabled={dis} value={v.title} onChange={(x) => onV({ title: x.target.value })} /></Lbl>
        {e.key !== "home" && e.type !== "faq" && (
          <Lbl label={c.editor.slug} hint={publicPath(e.type, v.language, v.slug || "…", e.key) ?? undefined}>
            <Input disabled={dis} aria-invalid={!slugOk} value={v.slug} onChange={(x) => onV({ slug: x.target.value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-") })} />
          </Lbl>
        )}
        <Lbl label={c.editor.excerpt}><Textarea disabled={dis} rows={3} value={v.excerpt ?? ""} onChange={(x) => onV({ excerpt: x.target.value })} /></Lbl>
        {e.type === "regulatory_update" && <>
          <Lbl label={c.reg.authority}><Select disabled={dis} value={reg?.authority ?? ""} onChange={(x) => setReg({ authority: x.target.value })}><option value="">—</option>{["RRA", "RDB", "BNR", "RSSB", "RURA", "MINICOM"].map((a) => <option key={a}>{a}</option>)}</Select></Lbl>
          <Lbl label={c.reg.effective}><Input type="date" disabled={dis} value={reg?.effectiveAt?.slice(0, 10) ?? ""} onChange={(x) => setReg({ effectiveAt: x.target.value })} /></Lbl>
          <Lbl label={c.reg.source}><Input type="url" disabled={dis} placeholder="https://" aria-invalid={!!reg?.sourceUrl && !reg.sourceUrl.startsWith("https://")} value={reg?.sourceUrl ?? ""} onChange={(x) => setReg({ sourceUrl: x.target.value })} /></Lbl>
          <Lbl label={c.reg.deadline}><Input type="date" disabled={dis} value={reg?.deadline?.slice(0, 10) ?? ""} onChange={(x) => setReg({ deadline: x.target.value || undefined })} /></Lbl>
          <fieldset className="grid gap-2"><legend className="text-label">{c.reg.affects}</legend>
            {(["companies", "individuals"] as const).map((a) => <Checkbox key={a} disabled={dis} label={c.reg[a]} checked={reg?.affects.includes(a) ?? false} onChange={(x) => setReg({ affects: x.target.checked ? [...(reg?.affects ?? []), a] : (reg?.affects ?? []).filter((y) => y !== a) })} />)}</fieldset>
          <Lbl label={c.reg.urgency}><Select disabled={dis} value={reg?.urgency ?? ""} onChange={(x) => setReg({ urgency: (x.target.value || undefined) as "high" })}><option value="">—</option><option value="high">{c.reg.high}</option><option value="medium">{c.reg.medium}</option><option value="low">{c.reg.low}</option></Select></Lbl>
          <Lbl label={c.reg.services}><Input disabled={dis} value={e.serviceSlugs.join(", ")} onChange={(x) => onE({ serviceSlugs: x.target.value.split(",").map((y) => y.trim()).filter(Boolean) })} /></Lbl>
          <NotifyCard entryId={e.id} published={v.status === "published"} />
          {v.status === "published" && <div className="grid gap-1 text-small" role="status">
            <p className="text-label">{c.regLink.calendar}</p>
            <p className="text-fg-muted">{reg?.calendarRules?.length ? reg.calendarRules.join(", ") : c.regLink.none}</p>
            {reg?.campaignId && <Link href={localHref(locale, `/marketing/campaigns/${reg.campaignId}`)} className="text-link underline">{c.regLink.campaign} · {reg.campaignId}</Link>}
          </div>}
        </>}
        {e.type === "landing_page" && <>
          <Lbl label={c.landing.campaignTag}><Input disabled={dis} value={land?.campaignTag ?? ""} onChange={(x) => setLand({ campaignTag: x.target.value })} /></Lbl>
          <Switch disabled={dis} label={c.landing.noindex} checked={v.seo.robots === "noindex"} onChange={(x) => onV({ seo: { ...v.seo, robots: x.target.checked ? "noindex" : "index" } })} />
          <fieldset className="grid gap-2 border border-border p-3"><legend className="px-1 text-label">{c.landing.form}</legend>
            <Checkbox disabled={dis} label={c.landing.email} checked={land?.form.email ?? true} onChange={(x) => setLand({ form: { ...(land?.form ?? { consent: [], thankYou: {} }), email: x.target.checked } })} />
            <Lbl label={c.landing.service}><Input disabled={dis} value={land?.form.servicePreselect ?? ""} onChange={(x) => setLand({ form: { email: true, consent: [], thankYou: {}, ...land?.form, servicePreselect: x.target.value || undefined } })} /></Lbl>
            <p className="text-small text-fg-muted">{c.landing.consents}</p>
            {(["email", "whatsapp", "sms"] as const).map((ch) => <Checkbox key={ch} disabled={dis} label={ch} checked={land?.form.consent.includes(ch) ?? false} onChange={(x) => { const cur = land?.form.consent ?? []; setLand({ form: { email: true, thankYou: {}, ...land?.form, consent: x.target.checked ? [...cur, ch] : cur.filter((y) => y !== ch) } }); }} />)}
            <Lbl label={c.landing.thankYou}><Textarea disabled={dis} rows={2} value={land?.form.thankYou[v.language] ?? ""} onChange={(x) => setLand({ form: { email: true, consent: [], ...land?.form, thankYou: { ...land?.form.thankYou, [v.language]: x.target.value } } })} /></Lbl>
          </fieldset>
          <UtmBuilder path={publicPath(e.type, v.language, v.slug) ?? ""} slug={v.slug} />
        </>}
        {e.type === "team_member" && <CredentialCard entryId={e.id} cred={e.meta.team?.credential} verified={!!e.meta.team?.verified} />}
        {(e.type === "guide" || e.type === "article") && <Lbl label={c.cols.category}><Input disabled={dis} value={e.meta.guide?.category ?? ""} onChange={(x) => onE({ meta: { ...e.meta, guide: { readMinutes: e.meta.guide?.readMinutes ?? 5, ...e.meta.guide, category: x.target.value } } })} /></Lbl>}
      </div>
    </Panel>
  );
}

function CredentialCard({ entryId, cred, verified }: { entryId: string; cred?: { title: string; issuer: string; documentId?: string; verifiedBy?: string; verifiedAt?: string }; verified: boolean }) {
  const c = useCC();
  const toast = useToast();
  const save = useVerifyCredential(entryId);
  const [f, setF] = useState({ title: cred?.title ?? "", issuer: cred?.issuer ?? "", documentId: cred?.documentId ?? "" });
  const send = (ok: boolean) => save.mutate({ verified: ok, title: f.title, issuer: f.issuer, documentId: f.documentId || undefined }, {
    onSuccess: () => toast({ tone: "success", title: c.cred.saved }),
    onError: () => toast({ tone: "danger", title: c.cred.sm }),
  });
  return (
    <fieldset className="grid gap-2 border border-border p-3"><legend className="px-1 text-label">{c.cred.title}</legend>
      <Lbl label={c.cred.title}><Input value={f.title} maxLength={160} onChange={(x) => setF({ ...f, title: x.target.value })} /></Lbl>
      <Lbl label={c.cred.issuer}><Input value={f.issuer} maxLength={160} onChange={(x) => setF({ ...f, issuer: x.target.value })} /></Lbl>
      <Lbl label={c.cred.doc}><Input value={f.documentId} maxLength={64} onChange={(x) => setF({ ...f, documentId: x.target.value })} /></Lbl>
      {verified && cred?.verifiedAt && <p className="text-small text-success">{c.cred.by.replace("{by}", cred.verifiedBy ?? "").replace("{at}", cred.verifiedAt.slice(0, 10))}</p>}
      <p className="text-small text-fg-muted">{c.cred.sm}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={save.isPending || !f.title.trim() || !f.issuer.trim()} onClick={() => send(true)}>{c.cred.verify}</Button>
        {verified && <Button type="button" size="sm" variant="secondary" disabled={save.isPending} onClick={() => send(false)}>{c.cred.unverify}</Button>}
      </div>
    </fieldset>
  );
}

function NotifyCard({ entryId, published }: { entryId: string; published: boolean }) {
  const c = useCC();
  const { locale } = useI18n();
  return (
    <div className="grid gap-2 bg-info-bg p-3">
      <p className="text-label">{c.reg.notify}</p>
      <p className="text-small text-fg-muted">{c.reg.notifyHint}</p>
      {published && <Link href={localHref(locale, `/marketing/campaigns/new?segment=SG-REG-SUBS&channel=email&from=${entryId}`)} className="inline-flex h-9 w-fit items-center bg-primary px-4 text-small text-on-gold m-press">{c.reg.notify}</Link>}
    </div>
  );
}

const utmValue = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function UtmBuilder({ path, slug }: { path: string; slug: string }) {
  const c = useCC();
  const m = useM();
  const toast = useToast();
  const [u, setU] = useState({ source: "google", medium: "cpc", campaign: slug });
  const ok = u.source && u.medium && u.campaign;
  const url = ok ? `https://hebuza.rw${path}?utm_source=${utmValue(u.source)}&utm_medium=${utmValue(u.medium)}&utm_campaign=${utmValue(u.campaign)}` : "";
  return (
    <fieldset className="grid gap-2 border border-border p-3"><legend className="px-1 text-label">{c.landing.utm}</legend>
      <p className="text-eyebrow text-fg-subtle">{c.landing.utmHint}</p>
      {(["source", "medium", "campaign"] as const).map((k) => <Lbl key={k} label={k === "campaign" ? c.landing.name : c.landing[k]}><Input value={u[k]} onChange={(e) => setU({ ...u, [k]: e.target.value })} /></Lbl>)}
      <p className="break-all bg-bg-subtle p-2 text-eyebrow tabular">{url || "—"}</p>
      <Button size="sm" variant="secondary" disabled={!ok} onClick={async () => { try { await navigator.clipboard.writeText(url); toast({ title: m.common.copied, tone: "success" }); } catch { /* clipboard blocked */ } }}>{c.landing.copy}</Button>
    </fieldset>
  );
}

function SeoPanel({ v, blockers, canEdit, onSeo, path }: { v: CmsVariant; blockers: PublishBlocker[]; canEdit: boolean; onSeo: (s: Partial<SeoFields>) => void; path: string | null }) {
  const c = useCC();
  const s = v.seo;
  const dis = !canEdit;
  const has = (code: string) => blockers.some((b) => b.code === code);
  const checks: [string, boolean][] = [
    ["title", !!s.title && s.title.length <= 60], ["description", !!s.description && s.description.length <= 160],
    ["keyword", !s.focusKeyword || s.title.toLowerCase().includes(s.focusKeyword.toLowerCase())], ["thin", !has("thin")], ["alt", !has("alt")], ["slug", !has("slug")],
  ];
  return (
    <Panel title={c.panel.seo}>
      <div className="grid gap-4">
        <Lbl label={c.seo.title} aside={<CharCounter value={s.title} max={60} />}><Input disabled={dis} value={s.title} onChange={(e) => onSeo({ title: e.target.value })} /></Lbl>
        <Lbl label={c.seo.description} aside={<CharCounter value={s.description} max={160} />}><Textarea disabled={dis} rows={3} value={s.description} onChange={(e) => onSeo({ description: e.target.value })} /></Lbl>
        <Lbl label={c.seo.keyword}><Input disabled={dis} value={s.focusKeyword ?? ""} onChange={(e) => onSeo({ focusKeyword: e.target.value })} /></Lbl>
        <Lbl label={c.seo.canonical}><Input disabled={dis} value={s.canonical ?? ""} onChange={(e) => onSeo({ canonical: e.target.value || undefined })} /></Lbl>
        <Lbl label={c.seo.ogTitle}><Input disabled={dis} value={s.ogTitle ?? ""} onChange={(e) => onSeo({ ogTitle: e.target.value || undefined })} /></Lbl>
        <Lbl label={c.seo.ogDescription}><Input disabled={dis} value={s.ogDescription ?? ""} onChange={(e) => onSeo({ ogDescription: e.target.value || undefined })} /></Lbl>
        <Lbl label={c.seo.robots}><Select disabled={dis} value={s.robots} onChange={(e) => onSeo({ robots: e.target.value as "index" })}><option value="index">{c.seo.index}</option><option value="noindex">{c.seo.noindex}</option></Select></Lbl>
        <div className="border border-border p-3">
          <p className="mb-2 text-eyebrow uppercase text-fg-subtle">{c.seo.snippet}</p>
          <p className="truncate text-small text-success">hebuza.rw{path ?? ""}</p>
          <p className="truncate text-card-title text-info">{s.title || v.title}</p>
          <p className="line-clamp-2 text-small text-fg-muted">{s.description}</p>
        </div>
        <div><p className="mb-2 text-label">{c.seo.checklist}</p>
          <ul className="grid gap-1.5">{checks.map(([k, ok]) => <li key={k} className="flex items-center gap-2 text-small"><Icon name={ok ? "check" : "x"} size={14} className={ok ? "text-success" : "text-danger"} aria-hidden /><span className="sr-only">{ok ? "✓" : "✗"}</span>{c.seo.checks[k]}</li>)}</ul></div>
      </div>
    </Panel>
  );
}

function AiPanel({ e, kb, canEdit, sm, onE }: { e: EntryDetail; kb: EntryDetail["kb"]; canEdit: boolean; sm: boolean; onE: (p: Partial<EntryDetail>) => void }) {
  const c = useCC();
  const facts = e.type === "regulatory_update" || e.serviceFacts;
  const mayToggle = facts ? sm : canEdit || sm;
  const max = new Date(Date.parse(e.createdAt) + MKT_POLICY.reviewByMaxMonths * 30.5 * 864e5).toISOString().slice(0, 10);
  return (
    <Panel title={c.panel.ai}>
      <div className="grid gap-4">
        <p className="flex items-center gap-2 text-small">{c.ai.kb}: <KbChip state={kb} /></p>
        <Switch label={c.ai.approved} disabled={!mayToggle} checked={e.aiApproved} onChange={(x) => onE({ aiApproved: x.target.checked })} />
        <p className="text-small text-fg-muted">{facts && !sm ? c.ai.factsOnly : c.ai.approvedHint}</p>
        <Checkbox label={c.ai.serviceFacts} disabled={!canEdit} checked={e.serviceFacts} onChange={(x) => onE({ serviceFacts: x.target.checked })} />
        <Lbl label={c.ai.reviewBy} hint={c.ai.reviewHint}><Input type="date" max={max} disabled={!canEdit} value={e.reviewBy?.slice(0, 10) ?? ""} onChange={(x) => onE({ reviewBy: x.target.value || undefined })} /></Lbl>
      </div>
    </Panel>
  );
}

function HistoryPanel({ id, lang, current, blocks, canEdit, onRestore }: { id: string; lang: Locale; current: CmsVariant; blocks: BlockShape[]; canEdit: boolean; onRestore: (v: number) => void }) {
  const c = useCC();
  const m = useM();
  const { locale } = useI18n();
  const q = useVersions(id);
  const [open, setOpen] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<number | null>(null);
  const items = (q.data?.items ?? []).filter((x) => x.language === lang);
  if (q.isPending) return <div className="h-40 m-shimmer" />;
  if (q.isError) return <PanelError what={c.panel.history} onRetry={() => q.refetch()} />;
  return (
    <Panel title={c.panel.history}>
      {!items.length ? <p className="text-small text-fg-muted">{c.history.empty}</p> : (
        <ol className="grid gap-2">
          {items.map((x) => {
            const diff = [...new Set([...blocks.map((b) => b.id), ...x.snapshot.blocks.map((b) => b.id)])].map((bid) => {
              const a = JSON.stringify(x.snapshot.variant.body[bid] ?? null), b = JSON.stringify(current.body[bid] ?? null);
              const kind = !x.snapshot.blocks.some((y) => y.id === bid) ? "added" : !blocks.some((y) => y.id === bid) ? "removed" : a !== b ? "changed" : null;
              return kind && { bid, kind, before: a, after: b };
            }).filter(Boolean) as { bid: string; kind: "added" | "removed" | "changed"; before: string; after: string }[];
            return (
              <li key={x.version} className="border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button type="button" aria-expanded={open === x.version} onClick={() => setOpen(open === x.version ? null : x.version)} className="text-left text-small">
                    <span className="font-medium">v{x.version}</span> · {x.summary}
                    <span className="block text-eyebrow text-fg-subtle">{fill(c.history.by, { who: x.by, t: formatDateTime(x.at, locale) })}</span>
                  </button>
                  {canEdit && <Button size="sm" variant="secondary" onClick={() => setConfirm(x.version)}>{fill(c.history.restore, { v: x.version })}</Button>}
                </div>
                {open === x.version && (
                  <div className="mt-2 grid gap-1 m-rise">
                    <p className="text-eyebrow uppercase text-fg-subtle">{c.history.diff}</p>
                    {!diff.length ? <p className="text-small text-fg-muted">—</p> : diff.map((d) => (
                      <p key={d.bid} className="text-small"><span className={cx("mr-2 px-1.5 text-eyebrow", d.kind === "added" ? "bg-success-bg text-success" : d.kind === "removed" ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning")}>{c.history[d.kind]}</span>
                        <span className="line-through opacity-60">{d.kind !== "added" && d.before.slice(0, 80)}</span> {d.kind !== "removed" && d.after.slice(0, 80)}</p>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <Dialog open={confirm != null} onClose={() => setConfirm(null)} title={fill(c.history.restore, { v: confirm ?? "" })} description={fill(c.history.restoreConfirm, { v: confirm ?? "" })}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setConfirm(null)}>{m.common.cancel}</Button><Button onClick={() => { if (confirm != null) onRestore(confirm); setConfirm(null); }}>{c.workflow.restore}</Button></div>} />
    </Panel>
  );
}

function CommentsPanel({ id, lang, blocks, selected }: { id: string; lang: Locale; blocks: BlockShape[]; selected: string | null }) {
  const c = useCC();
  const { locale } = useI18n();
  const toast = useToast();
  const q = useComments(id);
  const wf = useWorkflow(id);
  const [body, setBody] = useState("");
  const name = (bid?: string) => { const b = blocks.find((x) => x.id === bid); return b ? c.blocks[b.type] ?? b.type : c.comments.whole; };
  return (
    <Panel title={c.panel.comments}>
      <form className="mb-3 grid gap-2" onSubmit={async (e) => { e.preventDefault(); if (!body.trim()) return; try { await wf.comment.mutateAsync({ body: body.trim(), blockId: selected ?? undefined, language: lang }); setBody(""); } catch (x) { toast({ title: errorCopy(x, locale), tone: "danger" }); } }}>
        <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={c.comments.placeholder} aria-label={c.comments.placeholder} />
        <span className="flex items-center justify-between text-eyebrow text-fg-subtle">{fill(c.comments.onBlock, { b: name(selected ?? undefined) })}<Button size="sm" type="submit" disabled={!body.trim()} loading={wf.comment.isPending}>{c.comments.post}</Button></span>
      </form>
      {q.isPending ? <div className="h-20 m-shimmer" /> : q.isError ? <PanelError what={c.panel.comments} onRetry={() => q.refetch()} /> : !q.data?.items.length ? <p className="text-small text-fg-muted">{c.comments.empty}</p> : (
        <ul className="grid gap-2">{q.data.items.map((x) => (
          <li key={x.id} className={cx("border border-border p-3 text-small", x.resolved && "opacity-60")}>
            <p className="flex justify-between gap-2 text-eyebrow text-fg-subtle"><span>{x.by} · {name(x.blockId)}</span><span>{formatRelative(x.at, locale)}</span></p>
            <p className="mt-1 whitespace-pre-line">{x.body}</p>
            <button type="button" className="mt-1 text-eyebrow underline underline-offset-4" onClick={() => wf.resolve.mutate({ cid: x.id, resolved: !x.resolved })}>{x.resolved ? c.comments.reopen : c.comments.resolve}</button>
          </li>))}</ul>
      )}
    </Panel>
  );
}

function PerformancePanel({ id }: { id: string }) {
  const c = useCC();
  const { locale } = useI18n();
  const p = useUrlParams();
  const q = useLandingPerf(id, p.get("range") ?? "30d");
  if (q.isPending) return <div className="h-48 m-shimmer" />;
  if (q.isError) return <PanelError what={c.landing.perf} onRetry={() => q.refetch()} />;
  const d = q.data;
  const conv = d.visits ? `${((d.submissions / d.visits) * 100).toFixed(1)}%` : "—";
  return (
    <Panel title={c.landing.perf}>
      <dl className="grid grid-cols-2 gap-3">
        {([[c.landing.visits, d.visits], [c.landing.starts, d.starts], [c.landing.submissions, d.submissions], [c.landing.conversion, conv]] as [string, string | number][]).map(([k, val]) => (
          <div key={k} className="bg-bg-subtle p-3"><dt className="text-eyebrow text-fg-subtle">{k}</dt><dd className="text-h3 tabular m-tick">{val}</dd></div>))}
      </dl>
      <p className="mt-4 text-label">{c.landing.events}</p>
      <ul className="mt-1 grid gap-1 text-small">{d.events.map((x) => <li key={x.name} className="flex items-center gap-2"><Icon name={x.wired ? "check" : "clock"} size={14} className={x.wired ? "text-success" : "text-fg-subtle"} aria-hidden /><code>{x.name}</code> · {x.wired ? c.landing.wired : c.landing.notWired}</li>)}</ul>
      <p className="mt-4 text-label">{c.landing.bySource}</p>
      {!d.bySource.length ? <p className="text-small text-fg-muted">—</p> : <ul className="grid gap-1 text-small">{d.bySource.map((s) => <li key={s.source} className="flex justify-between"><span>{s.source}</span><span className="tabular">{s.visits} · {s.leads}</span></li>)}</ul>}
      <p className="mt-4 text-label">{c.landing.leads}</p>
      {!d.leads.length ? <p className="text-small text-fg-muted">{c.landing.noLeads}</p> : <ul className="grid gap-1 text-small">{d.leads.map((l) => <li key={l.id}><Link className="underline" href={localHref(locale, `/marketing/leads?lead=${l.id}`)}>{l.id}</Link> · {l.name}</li>)}</ul>}
    </Panel>
  );
}

// ---------------------------------------------------------------- dialogs
function SubmitDialog({ open, onClose, staff, needsSm, meId, onSubmit }: { open: boolean; onClose: () => void; staff: { id: string; name: string; role: string; color: string }[]; needsSm: boolean; meId?: string; onSubmit: (id: string) => void }) {
  const c = useCC();
  const m = useM();
  const options = staff.filter((s) => s.id !== meId && (needsSm ? s.role === "service_manager" : s.role !== "executive"));
  const [who, setWho] = useState("");
  const pick = who || options[0]?.id || "";
  return (
    <Dialog open={open} onClose={onClose} title={c.workflow.submitTitle}
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>{m.common.cancel}</Button><Button disabled={!pick} onClick={() => onSubmit(pick)}>{c.workflow.submit}</Button></div>}>
      <fieldset className="grid gap-2"><legend className="mb-1 text-label">{c.workflow.reviewer}</legend>
        {options.map((s) => <label key={s.id} className="flex items-center gap-3 border border-border p-3"><input type="radio" name="rev" checked={pick === s.id} onChange={() => setWho(s.id)} className="accent-navy-700" /><StaffName staff={s as never} /></label>)}
      </fieldset>
    </Dialog>
  );
}
function ReasonDlg({ open, onClose, title, label, onConfirm }: { open: boolean; onClose: () => void; title: string; label: string; onConfirm: (s: string) => void }) {
  const m = useM();
  const [txt, setTxt] = useState("");
  return (
    <Dialog open={open} onClose={onClose} title={title}
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>{m.common.cancel}</Button><Button disabled={!txt.trim()} onClick={() => { onConfirm(txt.trim()); setTxt(""); }}>{m.common.confirm}</Button></div>}>
      <Lbl label={label}><Textarea autoFocus value={txt} onChange={(e) => setTxt(e.target.value)} /></Lbl>
    </Dialog>
  );
}
function PublishDialog({ open, onClose, entry, lang, blockers, onPublish, onSchedule }: { open: boolean; onClose: () => void; entry: EntryDetail; lang: Locale; blockers: PublishBlocker[]; onPublish: (langs: Locale[], fallback: boolean) => void; onSchedule: () => void }) {
  const c = useCC();
  const m = useM();
  const [fallback, setFallback] = useState(false);
  const missing = LOCALES.filter((l) => !entry.variants[l]);
  const ready = LOCALES.filter((l) => entry.variants[l]);
  const errs = blockers.filter((b) => b.severity === "error" && b.code !== "missing_variant");
  const warns = blockers.filter((b) => b.severity === "warning");
  const blocked = errs.length > 0 || (missing.length > 0 && !fallback);
  return (
    <Dialog open={open} onClose={onClose} title={c.publish.title}
      footer={<div className="flex flex-wrap justify-end gap-2"><Button variant="secondary" onClick={onClose}>{m.common.cancel}</Button><Button variant="outline" disabled={blocked} onClick={onSchedule}>{c.workflow.schedule}</Button><Button disabled={blocked} onClick={() => onPublish(ready.length ? ready : [lang], fallback)}>{c.workflow.publishNow}</Button></div>}>
      <div className={cx("grid gap-4", blocked && errs.length > 0 && "m-shake")}>
        <p className="flex items-center gap-2 text-small">{c.publish.languages}: <LocaleCoverage coverage={coverageOf(entry)} size="pills" /></p>
        {errs.length > 0 && <div><p className="text-label text-danger">{c.publish.blockers}</p><ul className="mt-1 grid gap-1 text-small">{errs.map((b, i) => <li key={i}>• {b.language.toUpperCase()} · {c.publish.codes[b.code] ?? b.code}</li>)}</ul></div>}
        {warns.length > 0 && <div><p className="text-label text-warning">{c.publish.warnings}</p><ul className="mt-1 grid gap-1 text-small">{warns.map((b, i) => <li key={i}>• {b.language.toUpperCase()} · {c.publish.codes[b.code] ?? b.code}</li>)}</ul></div>}
        {!errs.length && !warns.length && !missing.length && <p className="text-small text-success">{c.publish.none}</p>}
        {missing.length > 0 && <div className="grid gap-2 bg-bg-subtle p-3"><p className="text-small">{fill(c.publish.missing, { langs: missing.map((l) => m.locale[l]).join(", ") })}</p>
          <Switch label={c.publish.fallback} checked={fallback} onChange={(e) => setFallback(e.target.checked)} /><p className="text-eyebrow text-fg-subtle">{c.publish.fallbackHint}</p></div>}
      </div>
    </Dialog>
  );
}
function ScheduleDialog({ open, onClose, now, onSchedule }: { open: boolean; onClose: () => void; now: number | null; onSchedule: (iso: string) => void }) {
  const c = useCC();
  const m = useM();
  const [val, setVal] = useState("");
  // the input is Kigali wall time (UTC+2, no DST): store UTC ISO
  const at = val ? new Date(`${val}:00+02:00`).toISOString() : "";
  const ok = !!at && now != null && Date.parse(at) >= now + MKT_POLICY.minScheduleMinutes * 60_000;
  return (
    <Dialog open={open} onClose={onClose} title={c.schedule.title}
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>{m.common.cancel}</Button><Button disabled={!ok} onClick={() => onSchedule(at)}>{c.schedule.go}</Button></div>}>
      <Lbl label={c.schedule.at} hint={c.schedule.min}><Input type="datetime-local" value={val} onChange={(e) => setVal(e.target.value)} aria-invalid={!!val && !ok} /></Lbl>
    </Dialog>
  );
}
function ArchiveDialog({ open, onClose, onArchive }: { open: boolean; onClose: () => void; onArchive: (to: string) => void }) {
  const c = useCC();
  const m = useM();
  const [to, setTo] = useState("/");
  return (
    <Dialog open={open} onClose={onClose} title={c.archive.title} description={c.archive.body}
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>{m.common.cancel}</Button><Button disabled={!to.startsWith("/")} onClick={() => onArchive(to)}>{c.archive.go}</Button></div>}>
      <Lbl label={c.archive.target}><Input value={to} onChange={(e) => setTo(e.target.value)} /></Lbl>
    </Dialog>
  );
}
