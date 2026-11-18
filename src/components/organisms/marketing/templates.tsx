"use client";
// U15 Templates (NTF consumer): marketing templates per channel × language, editor with {{variable}} check + sample preview,
// Submit to Meta (WhatsApp) → pending; rejected banner with provider reason + Edit & resubmit. Mock: simulate Meta decision.
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { formatRelative } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { useCmpMutation, useTemplates } from "@/lib/marketing/campaigns";
import type { MsgTemplate } from "@/shared/marketing/types";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Input, Select, Textarea } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { ChannelIcon, PageHead, TemplateStatusChip, useM } from "@/components/atoms/marketing";
import { QueryState, fa, fill, useC, useErr } from "@/components/molecules/marketing/marketing";
import { api, unwrap } from "@/lib/api/client";

const KNOWN_VARS = ["first_name", "org", "link"];
const SAMPLE: Record<string, string> = { first_name: "Aline", org: "Kigali Fresh Foods Ltd", link: "hbz.rw/c/ab12" }; // mock sample data

export function TemplatesView() {
  const c = useC();
  const mc = useM();
  const { locale } = useI18n();
  const p = useUrlParams();
  const channel = p.get("channel") ?? "";
  const status = p.get("status") ?? "";
  const q = useTemplates({ category: "marketing", channel: channel || undefined, status: status || undefined });
  const [edit, setEdit] = useState<MsgTemplate | null>(null);
  const items = q.data?.items ?? [];
  return (
    <>
      <PageHead title={c.tpl.title} sub={c.tpl.sub} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Select aria-label={c.list.channel} className="w-auto" value={channel} onChange={(e) => setUrlParams({ channel: e.target.value || null })}>
          <option value="">{mc.common.all}</option>{(["whatsapp", "email", "sms"] as const).map((x) => <option key={x} value={x}>{c.common.channel[x]}</option>)}
        </Select>
        <Select aria-label={c.list.status} className="w-auto" value={status} onChange={(e) => setUrlParams({ status: e.target.value || null })}>
          <option value="">{mc.common.all}</option>{(["active", "draft", "pending_provider_approval", "rejected"] as const).map((x) => <option key={x} value={x}>{mc.template[x]}</option>)}
        </Select>
      </div>
      <QueryState q={q} what={c.tpl.title} empty={!items.length && c.tpl.empty}>
        <ul className="grid gap-2 m-stagger">
          {items.map((t, i) => (
            <li key={t.id} style={{ ["--i" as string]: i }}>
              <button type="button" onClick={() => setEdit(t)} className="grid w-full gap-2 border border-border bg-white p-4 text-left hover:border-navy-300 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <span className="min-w-0"><span className="block truncate text-label-lg">{t.name}</span><span className="flex flex-wrap items-center gap-2 text-eyebrow text-fg-subtle"><ChannelIcon channel={t.channel} label /> · {c.common.lang[t.language]} · v{t.version} · {formatRelative(t.updatedAt, locale)}</span>
                  {t.status === "rejected" && t.providerReason && <span className="mt-1 block text-small text-danger">{fill(c.tpl.rejected, { r: t.providerReason })}</span>}</span>
                <TemplateStatusChip status={t.status} />
                <span className="text-small text-link">{t.status === "rejected" ? c.tpl.editResubmit : c.tpl.edit}</span>
              </button>
            </li>
          ))}
        </ul>
      </QueryState>
      {edit && <Editor key={edit.id} t={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function Editor({ t, onClose }: { t: MsgTemplate; onClose: () => void }) {
  const c = useC();
  const mc = useM();
  const err = useErr();
  const toast = useToast();
  const [body, setBody] = useState(t.body);
  const [subject, setSubject] = useState(t.subject ?? "");
  const vars = [...body.matchAll(/{{(\w+)}}/g)].map((m) => m[1]);
  const bad = vars.find((v) => !KNOWN_VARS.includes(v));
  const save = useCmpMutation(() => unwrap<MsgTemplate>(api.PATCH("/api/admin/notification-templates/{id}", { params: { path: { id: t.id } }, body: { body, subject: t.channel === "email" ? subject : undefined } })));
  const submit = useCmpMutation(() => unwrap<MsgTemplate>(api.POST("/api/admin/notification-templates/{id}/submit-provider", { params: { path: { id: t.id } } })));
  const sim = useCmpMutation((decision: "approve" | "reject") => unwrap(api.POST("/api/admin/notification-templates/{id}/simulate", { params: { path: { id: t.id } }, body: { decision } })));
  const onErr = (e: unknown) => toast({ title: err(e), tone: "danger" });
  const preview = body.replace(/{{(\w+)}}/g, (_, v: string) => SAMPLE[v] ?? `{{${v}}}`);
  const wa = t.channel === "whatsapp";
  return (
    <Dialog open onClose={onClose} side="right" title={t.name} description={`${c.common.channel[t.channel]} · ${c.common.lang[t.language]}`}
      footer={<>
        <Button variant="ghost" onClick={onClose}>{mc.common.close}</Button>
        <Button variant="secondary" disabled={!!bad} loading={save.isPending} onClick={() => save.mutate(undefined, { onSuccess: () => toast({ title: mc.common.save, tone: "success" }), onError: onErr })}>{mc.common.save}</Button>
        {wa && <Button disabled={!!bad || t.status === "pending_provider_approval"} loading={submit.isPending} onClick={() => save.mutate(undefined, { onSuccess: () => submit.mutate(undefined, { onSuccess: () => { toast({ title: c.tpl.submitted, tone: "success" }); onClose(); }, onError: onErr }), onError: onErr })}>{c.tpl.submitMeta}</Button>}
      </>}>
      <div className="grid gap-4">
        <TemplateStatusChip status={t.status} />
        {t.status === "rejected" && t.providerReason && <p role="alert" className="bg-danger-bg p-3 text-small text-danger">{fill(c.tpl.rejected, { r: t.providerReason })}</p>}
        {t.channel === "email" && <Field label={c.tpl.subject}>{(a) => <Input {...fa(a)} value={subject} onChange={(e) => setSubject(e.target.value)} />}</Field>}
        <Field label={c.tpl.body} error={bad ? fill(c.tpl.badVar, { v: bad }) : undefined}>{(a) => <Textarea {...fa(a)} rows={5} lang={t.language} value={body} onChange={(e) => setBody(e.target.value)} />}</Field>
        <p className="text-eyebrow text-fg-subtle">{c.tpl.vars}: {vars.length ? vars.map((v) => `{{${v}}}`).join(", ") : mc.common.none}</p>
        <div><p className="mb-1 text-label">{c.tpl.sampleData}</p><p lang={t.language} className="bg-success-bg/60 p-4 text-small">{preview}</p></div>
      </div>
    </Dialog>
  );
}
