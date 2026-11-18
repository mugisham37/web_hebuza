"use client";
// FAQs (U4): table with locales/status/AI chip, quick-edit drawer (question + answer), and the assistant's unanswered tab (Stage 11 hook).
import { useState } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { errorCopy } from "@/lib/api/error-copy";
import { patchEntry, putVariant, useEntries, useEntry } from "@/lib/marketing/content";
import type { Locale, RichDoc } from "@/shared/marketing/types";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Input, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { SavedViewTabs, PanelError, EmptyPanel } from "@/components/molecules/ops/ops";
import { KbChip, LocaleCoverage, PageHead, WorkflowChip, useM } from "@/components/atoms/marketing";
import { ArtPages, CreateDialog, Empty, newBlock, useCC } from "@/components/molecules/marketing/marketing";

export function FaqsView() {
  const c = useCC();
  const m = useM();
  const p = useUrlParams();
  const tab = p.get("tab") === "unanswered" ? "unanswered" : "all";
  const list = useEntries({ type: "faq" });
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const rows = list.data?.items ?? [];
  return (
    <div>
      <PageHead title={c.titles.faqs} sub={c.subs.faqs} actions={<Button onClick={() => setCreating(true)}><Icon name="plus" size={16} aria-hidden />{c.faq.new}</Button>} />
      <SavedViewTabs views={[{ key: "all", label: c.faq.tabs.all, count: rows.length }, { key: "unanswered", label: c.faq.tabs.unanswered }]} active={tab} onChange={(k) => setUrlParams({ tab: k === "all" ? null : k })} />
      <div className="mt-4">
        {tab === "unanswered" ? (
          // Stage 11 hook: the assistant will feed GET /api/admin/aia/unanswered here.
          <EmptyPanel title={c.faq.tabs.unanswered} body={c.faq.unansweredEmpty} />
        ) : list.isPending ? <div className="grid gap-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 m-shimmer" />)}</div>
          : list.isError ? <PanelError what={c.titles.faqs} onRetry={() => list.refetch()} />
          : !rows.length ? <Empty art={<ArtPages />} title={m.states.empty} action={<Button onClick={() => setCreating(true)}>{c.faq.new}</Button>} />
          : (
          <div className="overflow-x-auto border border-border bg-white">
            <table className="w-full min-w-[40rem] text-left text-small">
              <thead className="bg-ink-100 text-ink-700"><tr><th scope="col" className="p-3">{c.faq.question}</th><th scope="col" className="p-3">{c.cols.locales}</th><th scope="col" className="p-3">{c.cols.status}</th><th scope="col" className="p-3">{c.cols.ai}</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-navy-50">
                  <th scope="row" className="max-w-md p-3 font-normal"><button type="button" className="truncate text-left underline-offset-4 hover:underline" title={r.title} onClick={() => setOpen(r.id)}>{r.title}</button></th>
                  <td className="p-3"><LocaleCoverage coverage={r.coverage} /></td>
                  <td className="p-3"><WorkflowChip status={r.status} at={r.scheduledAt} /></td>
                  <td className="p-3"><KbChip state={r.kb} /></td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
      </div>
      {open && <FaqDrawer id={open} onClose={() => setOpen(null)} />}
      <CreateDialog type="faq" open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function FaqDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const c = useCC();
  const m = useM();
  const { locale } = useI18n();
  const toast = useToast();
  const q = useEntry(id);
  const [lang, setLang] = useState<Locale>(locale);
  const [draft, setDraft] = useState<{ q?: string; a?: string }>({});
  const e = q.data;
  const v = e?.variants[lang];
  const ansBlock = e?.blocks.find((b) => b.type === "rich_text");
  const answer = draft.a ?? ((v && ansBlock ? ((v.body[ansBlock.id]?.doc as RichDoc | undefined)?.content ?? []) : []).map((n) => n.type === "paragraph" ? (n.content ?? []).map((x) => x.text).join("") : "").join("\n\n"));
  async function save() {
    if (!e || !v) return;
    try {
      let blocks = e.blocks, bid = ansBlock?.id;
      if (!bid) { const b = newBlock("rich_text"); bid = b.id; blocks = [...e.blocks, b]; await patchEntry(e.id, { blocks }, e.version); }
      await putVariant(e.id, lang, { ...v, title: draft.q ?? v.title, body: { ...v.body, [bid]: { doc: { type: "doc", content: answer.split(/\n{2,}/).map((t) => ({ type: "paragraph", content: [{ text: t }] })) } } } }, v.version);
      toast({ title: m.common.save, tone: "success" }); setDraft({}); q.refetch();
    } catch (x) { toast({ title: errorCopy(x, locale), tone: "danger" }); }
  }
  return (
    <Dialog open onClose={onClose} side="right" title={v?.title ?? c.faq.question}
      footer={<div className="flex flex-wrap justify-between gap-2"><Link className="inline-flex h-11 items-center text-small underline" href={localHref(locale, `/marketing/content/${id}?locale=${lang}`)}>{c.faq.full}</Link><Button disabled={!v} onClick={save}>{m.common.save}</Button></div>}>
      {q.isPending ? <div className="h-40 m-shimmer" /> : q.isError ? <PanelError what={c.faq.question} onRetry={() => q.refetch()} /> : (
        <div className="grid gap-4">
          <div role="tablist" className="flex gap-1">{(["rw", "en", "fr"] as Locale[]).map((l) => <button key={l} role="tab" aria-selected={l === lang} type="button" onClick={() => { setLang(l); setDraft({}); }} className={l === lang ? "h-8 bg-navy-700 px-3 text-small text-white" : "h-8 px-3 text-small hover:bg-ink-100"}>{l.toUpperCase()}</button>)}</div>
          {!v ? <p className="text-small text-fg-muted">{c.editor.missingVariant}</p> : <>
            <label className="grid gap-1.5"><span className="text-label">{c.faq.question}</span><Input value={draft.q ?? v.title} onChange={(x) => setDraft({ ...draft, q: x.target.value })} /></label>
            <label className="grid gap-1.5"><span className="text-label">{c.faq.answer}</span><Textarea rows={8} value={answer} onChange={(x) => setDraft({ ...draft, a: x.target.value })} /></label>
          </>}
        </div>
      )}
    </Dialog>
  );
}
