"use client";
// U10 Unified inbox (board marketing/07 LD3): channel chips, thread list, conversation, composer with the WhatsApp
// 24-hour rule (free-form only inside 24 h; outside it, an approved template), right rail lead actions.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx, formatRelative, formatDateTime } from "@/shared/format";
import { errorCopy } from "@/lib/api/error-copy";
import { fill } from "@/content/pages/mkt-common";
import { useInbox, useReply, useThreadAction } from "@/lib/marketing/crm";
import { useTemplates } from "@/lib/marketing/campaigns";
import type { InboxThread, Locale } from "@/shared/marketing/types";
import { Button } from "@/components/atoms/button";
import { Select } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { useNow } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { ChannelIcon, PageHead, useM } from "@/components/atoms/marketing";
import { useC, useStaffMap } from "@/components/molecules/marketing/crm";

const CHANNELS = ["web", "whatsapp", "email", "sms"] as const;
const DAY = 24 * 3600_000;

export function InboxView() {
  const c = useC();
  const m = useM();
  const { locale } = useI18n();
  const params = useUrlParams();
  const channel = params.get("channel");
  const threadId = params.get("thread");
  const q = useInbox();
  const now = useNow();
  const all = useMemo(() => q.data?.items ?? [], [q.data]);
  const list = all.filter((t) => !channel || t.channel === channel);
  const active = all.find((t) => t.id === threadId) ?? null;
  return (
    <div className="grid gap-5">
      <PageHead title={c.inbox.title} sub={c.inbox.sub} />
      <div role="toolbar" aria-label={c.inbox.title} className="no-scrollbar -mx-gutter flex gap-1.5 overflow-x-auto px-gutter">
        {[null, ...CHANNELS].map((ch) => (
          <button key={ch ?? "all"} type="button" aria-pressed={channel === ch} onClick={() => setUrlParams({ channel: ch, thread: null })}
            className={cx("inline-flex h-9 shrink-0 items-center gap-1.5 px-3 text-small m-press", channel === ch ? "bg-secondary text-on-secondary" : "bg-bg-subtle")}>
            {ch ? <ChannelIcon channel={ch} label /> : c.inbox.all}
            <span className="tabular opacity-70">{ch ? all.filter((t) => t.channel === ch).length : all.length}</span>
          </button>
        ))}
      </div>
      {q.isError ? <PanelError what={c.inbox.title} onRetry={() => q.refetch()} />
        : q.isPending ? <div className="grid gap-3 lg:grid-cols-[20rem_1fr]"><div className="h-96 m-shimmer" /><div className="h-96 m-shimmer" /></div>
        : !all.length ? <EmptyPanel title={c.inbox.empty} />
        : (
        <div className="grid gap-4 lg:grid-cols-[20rem_1fr_16rem]">
          <ul data-guide="marketing-threads" className={cx("grid content-start gap-1.5", active && "max-lg:hidden")}>
            {!list.length && <li className="p-4 text-small text-fg-muted">{m.states.filteredEmpty}</li>}
            {list.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => setUrlParams({ thread: t.id })} aria-current={t.id === threadId ? "true" : undefined}
                  className={cx("grid w-full grid-cols-[1.5rem_1fr_auto] items-start gap-2 border p-3 text-left text-small", t.id === threadId ? "border-navy-700 bg-navy-50" : "border-border bg-white hover:bg-navy-50")}>
                  <ChannelIcon channel={t.channel} />
                  <span className="min-w-0"><span className={cx("block truncate", t.unread > 0 && "font-semibold")}>{t.contactName}</span>
                    <span className="block truncate text-eyebrow text-fg-subtle">{t.subject ? `${t.subject} · ` : ""}{t.preview}</span></span>
                  <span className="grid justify-items-end gap-1 text-eyebrow tabular text-fg-subtle">{now ? formatRelative(t.lastInboundAt, locale, now) : ""}
                    {t.unread > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-navy-700 text-[0.65rem] text-white m-pop">{t.unread}</span>}</span>
                </button>
              </li>
            ))}
          </ul>
          {active ? <>
            <Conversation t={active} now={now} />
            <LeadRail t={active} />
          </> : <div className="hidden place-items-center border border-dashed border-border-strong text-small text-fg-muted lg:col-span-2 lg:grid">{c.inbox.pick}</div>}
        </div>
      )}
    </div>
  );
}

function Conversation({ t, now }: { t: InboxThread; now: number | null }) {
  const c = useC();
  const m = useM();
  const { locale } = useI18n();
  const reply = useReply();
  const toast = useToast();
  const online = useOnline();
  const [body, setBody] = useState("");
  // Only Meta-approved WhatsApp templates may open a conversation outside the 24-hour window.
  const tq = useTemplates({ channel: "whatsapp", status: "active" });
  const waTemplates = tq.data?.items ?? [];
  const [picked, setTpl] = useState("");
  const tpl = picked || waTemplates[0]?.id || "";
  const outside = t.channel === "whatsapp" && !!now && now - Date.parse(t.lastInboundAt) > DAY;
  const send = async (v: { body?: string; template?: string }) => {
    try { await reply.mutateAsync({ id: t.id, ...v }); setBody(""); toast({ title: c.inbox.sent, tone: "success" }); }
    catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
  };
  return (
    <section aria-label={t.contactName} className="flex min-h-96 flex-col border border-border bg-white">
      <header className="flex items-center gap-2 border-b border-border p-3">
        <button type="button" className="lg:hidden" aria-label={m.common.back} onClick={() => setUrlParams({ thread: null })}><Icon name="arrowRight" size={18} className="rotate-180" aria-hidden /></button>
        <ChannelIcon channel={t.channel} /><h2 className="min-w-0 flex-1 truncate text-label">{t.contactName}</h2>
        {t.subject && <span className="truncate text-eyebrow text-fg-subtle">{t.subject}</span>}
      </header>
      <ol className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {t.messages.map((x) => (
          <li key={x.id} className={cx("max-w-[80%] px-3 py-2 text-small m-rise", x.dir === "out" ? "self-end bg-secondary text-on-secondary" : "self-start bg-bg-subtle")}>
            {x.body}<span className="mt-1 block text-[0.68rem] opacity-60">{formatDateTime(x.at, locale)}{x.template && ` · ${x.template}`}</span>
          </li>
        ))}
      </ol>
      <div className="border-t border-border p-3">
        {outside ? (
          <div className="grid gap-2">
            <p role="status" className="flex items-center gap-2 bg-warning-bg p-2.5 text-small text-warning"><Icon name="clock" size={15} aria-hidden />{c.inbox.window}</p>
            <div className="flex gap-2">
              <Select aria-label={c.inbox.template} value={tpl} onChange={(e) => setTpl(e.target.value)} className="flex-1">
                {waTemplates.map((x) => <option key={x.id} value={x.id}>{x.name} · {m.locale[x.language]}</option>)}
              </Select>
              <Button disabled={!online || !tpl} loading={reply.isPending} onClick={() => send({ template: tpl })}>{c.inbox.sendTemplate}</Button>
            </div>
          </div>
        ) : (
          <form data-guide="marketing-reply" className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (body.trim()) send({ body }); }}>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder={c.inbox.reply} aria-label={c.inbox.reply}
              className="min-w-0 flex-1 border border-border-strong p-2.5 text-small focus-visible:outline-2 focus-visible:outline-focus" />
            <Button type="submit" disabled={!online || !body.trim()} loading={reply.isPending}>{c.inbox.send}</Button>
          </form>
        )}
      </div>
    </section>
  );
}

function LeadRail({ t }: { t: InboxThread }) {
  const c = useC();
  const { locale } = useI18n();
  const act = useThreadAction();
  const staff = useStaffMap();
  const toast = useToast();
  const [tag, setTag] = useState("");
  return (
    <aside data-guide="marketing-lead-actions" aria-label={c.inbox.actions} className="grid content-start gap-3 border border-border bg-white p-3">
      <h2 className="text-label">{c.inbox.actions}</h2>
      {t.leadId ? (
        <Link href={localHref(locale, `/marketing/leads?lead=${t.leadId}`)} className="inline-flex h-9 items-center justify-center bg-ink-100 px-4 text-small font-medium m-press">{fill(c.inbox.openLead, { id: t.leadId })}</Link>
      ) : (
        <Button size="sm" loading={act.isPending} onClick={async () => {
          try { const r = await act.mutateAsync({ id: t.id, action: "lead" }); toast({ title: fill(c.inbox.leadCreated, { id: r.lead?.id ?? "" }), tone: "success" }); }
          catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
        }}>{c.inbox.createLead}</Button>
      )}
      <label className="grid gap-1 text-small">{c.inbox.assign}
        <Select value={t.assigneeId ?? ""} onChange={(e) => e.target.value && act.mutate({ id: t.id, action: "assign", value: e.target.value })}>
          <option value=""></option>{staff.list.filter((s) => s.role === "marketing").map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </label>
      <form className="grid gap-1 text-small" onSubmit={(e) => { e.preventDefault(); if (tag.trim()) { act.mutate({ id: t.id, action: "tag", value: tag.trim() }); setTag(""); } }}>
        <label htmlFor={`tag-${t.id}`}>{c.inbox.tag}</label>
        <input id={`tag-${t.id}`} value={tag} onChange={(e) => setTag(e.target.value)} className="h-9 border border-border-strong px-2" />
      </form>
      {t.tags.length > 0 && <p className="flex flex-wrap gap-1">{t.tags.map((x) => <span key={x} className="bg-ink-100 px-2 py-0.5 text-eyebrow">{x}</span>)}</p>}
    </aside>
  );
}
