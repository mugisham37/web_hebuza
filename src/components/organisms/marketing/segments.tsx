"use client";
// U12 Segments (board marketing/09 SG1): list + builder with AND/OR groups (depth 2), debounced live count, excluded by reason
// for the chosen channel, sample members (masked) and language split.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { formatRelative } from "@/shared/format";
import { useCmpMutation, useSegment, useSegmentPreview, useSegments } from "@/lib/marketing/campaigns";
import type { Channel, SegField, SegGroup, SegOp, SegRule, Segment } from "@/shared/marketing/types";
import { isGroup } from "@/shared/marketing/segment";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Field, Input, Select } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { Panel } from "@/components/molecules/ops/ops";
import { PageHead } from "@/components/atoms/marketing";
import { ConsentDots, ConsentExclusionCard, ListSkeleton, QueryState, fa, useC, useErr, useNum } from "@/components/molecules/marketing/marketing";
import { api, unwrap } from "@/lib/api/client";
import { hdr } from "@/lib/marketing/api";

export function SegmentsView() {
  const c = useC();
  const { locale } = useI18n();
  const q = useSegments();
  const n = useNum();
  const items = q.data?.items ?? [];
  return (
    <>
      <PageHead title={c.seg.title} sub={c.seg.sub} actions={<ButtonLink data-guide="marketing-new-segment" href={localHref(locale, "/marketing/segments/new")} size="sm"><Icon name="plus" size={16} aria-hidden />{c.seg.new}</ButtonLink>} />
      <QueryState q={q} what={c.seg.title} empty={!items.length && c.seg.empty}>
        <ul className="grid gap-2 m-stagger">
          {items.map((s, i) => (
            <li key={s.id} style={{ ["--i" as string]: i }}>
              <Link href={localHref(locale, `/marketing/segments/${s.id}`)} className="flex flex-wrap items-center gap-3 border border-border bg-white p-4 hover:border-navy-300">
                <span className="flex size-10 items-center justify-center rounded-full bg-navy-50 text-navy-700"><Icon name="users" size={18} aria-hidden /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-label-lg">{s.name}</span><span className="text-eyebrow text-fg-subtle">{s.id} · {c.seg.updated} {formatRelative(s.updatedAt, locale)}{s.createdByName ? ` · ${s.createdByName}` : ""}</span></span>
                <span className="text-right"><span className="block text-card-title tabular">{n(s.lastCount)}</span><span className="text-eyebrow text-fg-subtle">{c.seg.members}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </QueryState>
    </>
  );
}

const FIELDS: SegField[] = ["obligation", "company_size", "sector", "province", "district", "language", "service_used", "category_interest", "last_active_days", "ltv", "consent_email", "consent_whatsapp", "consent_sms"];
const NUMERIC = new Set<SegField>(["last_active_days", "ltv"]);
const OPS_FOR = (f: SegField): SegOp[] => (NUMERIC.has(f) ? ["gt", "gte", "lt", "lte"] : ["is", "is_not", "in"]);
const CHOICES: Partial<Record<SegField, string[]>> = {
  obligation: ["vat", "paye"], company_size: ["micro", "small", "medium", "large"], sector: ["retail", "agri", "hospitality", "transport", "services", "manufacturing", "ict"],
  province: ["Kigali", "North", "South", "East", "West"], language: ["rw", "en", "fr"], consent_email: ["in", "out", "unknown"], consent_whatsapp: ["in", "out", "unknown"], consent_sms: ["in", "out", "unknown"],
};
const EMPTY: SegGroup = { join: "and", rules: [{ field: "obligation", op: "is", value: "vat" }] };

/** 400 ms debounce so typing doesn't fire a preview per key. */
function useDebounced<T>(v: T, ms = 400) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

export function SegmentBuilder({ id }: { id: string }) {
  const q = useSegment(id);
  if (id !== "new" && q.isPending) return <ListSkeleton rows={4} />;
  if (id !== "new" && !q.data) return <QueryState q={q} what="Segment">{null}</QueryState>;
  return <Builder key={q.data?.version ?? 0} seg={q.data} />;
}

function Builder({ seg }: { seg?: Segment }) {
  const c = useC();
  const err = useErr();
  const toast = useToast();
  const router = useRouter();
  const { locale } = useI18n();
  const n = useNum();
  const [name, setName] = useState(seg?.name ?? "");
  const [def, setDef] = useState<SegGroup>(seg?.definition ?? EMPTY);
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const debounced = useDebounced(def);
  const p = useSegmentPreview(debounced, channel);
  const save = useCmpMutation(() => seg ? unwrap<Segment>(api.PATCH("/api/admin/crm/segments/{id}", { params: { path: { id: seg.id } }, body: { name, definition: def }, headers: hdr({ ifMatch: seg.version }) })) : unwrap<Segment>(api.POST("/api/admin/crm/segments", { body: { name, definition: def } })));
  const [ask, setAsk] = useState(false);
  const del = useCmpMutation(() => unwrap(api.DELETE("/api/admin/crm/segments/{id}", { params: { path: { id: seg?.id ?? "" } } })));
  const d = p.data;
  const totalLang = d ? d.languages.rw + d.languages.en + d.languages.fr || 1 : 1;
  return (
    <>
      <PageHead eyebrow={<Link href={localHref(locale, "/marketing/segments")} className="hover:underline">{c.seg.title}</Link>} title={seg?.name || c.seg.new} />
      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-4">
          <Field label={c.seg.name}>{(a) => <Input {...fa(a)} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
          <GroupEditor g={def} depth={0} onChange={setDef} />
          <div className="flex gap-2">
            <Button loading={save.isPending} disabled={!name.trim()} onClick={() => save.mutate(undefined, {
              onSuccess: (s) => { toast({ title: c.seg.saved, tone: "success" }); if (!seg) router.replace(localHref(locale, `/marketing/segments/${(s as Segment).id}`)); },
              onError: (e) => toast({ title: err(e), tone: "danger" }),
            })}>{c.seg.save}</Button>
            {seg && <Button variant={ask ? "danger" : "ghost"} loading={del.isPending} onBlur={() => setAsk(false)} onClick={() => ask ? del.mutate(undefined, {
              onSuccess: () => { toast({ title: c.seg.deleted, tone: "success" }); router.replace(localHref(locale, "/marketing/segments")); },
              onError: (e) => { setAsk(false); toast({ title: err(e), tone: "danger" }); },
            }) : setAsk(true)}>{ask ? c.seg.delConfirm : c.seg.del}</Button>}
          </div>
        </div>
        <aside data-guide="marketing-seg-preview" className="grid content-start gap-4">
          <Field label={c.seg.previewFor}>{(a) => (
            <Select {...fa(a)} value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
              {(["whatsapp", "email", "sms"] as Channel[]).map((x) => <option key={x} value={x}>{c.common.channel[x]}</option>)}
            </Select>
          )}</Field>
          {d ? <ConsentExclusionCard count={d.count} eligible={d.eligible} excluded={d.excluded} loading={p.isFetching} /> : <div className="h-36 m-shimmer" />}
          {d && (
            <Panel title={c.seg.languages}>
              <ul className="grid gap-2">{(["rw", "en", "fr"] as const).map((l) => (
                <li key={l} className="grid grid-cols-[6rem_1fr_3.5rem] items-center gap-2 text-small">
                  <span>{c.common.lang[l]}</span>
                  <span className="h-2 overflow-hidden bg-ink-100"><span className="block h-full bg-navy-700 m-grow" style={{ width: `${(d.languages[l] / totalLang) * 100}%` }} /></span>
                  <span className="text-right tabular">{n(d.languages[l])}</span>
                </li>
              ))}</ul>
            </Panel>
          )}
          {d && (
            <Panel title={c.seg.sample}>
              <ul className="grid gap-2">{d.sample.map((s) => (
                <li key={s.id} className="grid gap-0.5 text-small"><span className="flex justify-between gap-2"><span className="truncate">{s.name}</span><span className="tabular text-fg-subtle">{s.phone}</span></span><ConsentDots consent={s.consent} /></li>
              ))}</ul>
            </Panel>
          )}
        </aside>
      </div>
    </>
  );
}

function GroupEditor({ g, depth, onChange, onRemove }: { g: SegGroup; depth: number; onChange: (g: SegGroup) => void; onRemove?: () => void }) {
  const c = useC();
  const set = (i: number, r: SegRule | SegGroup) => onChange({ ...g, rules: g.rules.map((x, k) => (k === i ? r : x)) });
  const del = (i: number) => onChange({ ...g, rules: g.rules.filter((_, k) => k !== i) });
  return (
    <fieldset className="grid gap-3 border border-border bg-white p-4 m-collapse">
      <legend className="sr-only">{g.join === "and" ? c.seg.and : c.seg.or}</legend>
      <div className="flex flex-wrap items-center gap-2">
        <Select aria-label={c.seg.and} value={g.join} onChange={(e) => onChange({ ...g, join: e.target.value as "and" | "or" })} className="w-auto">
          <option value="and">{c.seg.and}</option><option value="or">{c.seg.or}</option>
        </Select>
        {onRemove && <Button size="sm" variant="ghost" onClick={onRemove}>{c.seg.remove}</Button>}
      </div>
      {g.rules.map((r, i) => isGroup(r)
        ? <GroupEditor key={i} g={r} depth={depth + 1} onChange={(x) => set(i, x)} onRemove={() => del(i)} />
        : <RuleRow key={i} r={r} onChange={(x) => set(i, x)} onRemove={() => del(i)} />)}
      <div className="flex flex-wrap gap-2">
        <Button data-guide="marketing-add-rule" size="sm" variant="secondary" onClick={() => onChange({ ...g, rules: [...g.rules, { field: "sector", op: "is", value: "retail" }] })}><Icon name="plus" size={14} aria-hidden />{c.seg.addRule}</Button>
        {depth < 1 && <Button size="sm" variant="outline" onClick={() => onChange({ ...g, rules: [...g.rules, { join: "or", rules: [{ field: "province", op: "is", value: "Kigali" }] }] })}>{c.seg.addGroup}</Button>}
      </div>
    </fieldset>
  );
}

function RuleRow({ r, onChange, onRemove }: { r: SegRule; onChange: (r: SegRule) => void; onRemove: () => void }) {
  const c = useC();
  const choices = CHOICES[r.field];
  const multi = r.op === "in";
  const arr = Array.isArray(r.value) ? (r.value as string[]) : [String(r.value ?? "")];
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_9rem_1fr_auto] sm:items-center">
      <Select aria-label={c.seg.fields[r.field]} value={r.field} onChange={(e) => { const f = e.target.value as SegField; onChange({ field: f, op: OPS_FOR(f)[0], value: NUMERIC.has(f) ? 90 : CHOICES[f]?.[0] ?? "" }); }}>
        {FIELDS.map((f) => <option key={f} value={f}>{c.seg.fields[f]}</option>)}
      </Select>
      <Select aria-label="operator" value={r.op} onChange={(e) => { const op = e.target.value as SegOp; onChange({ ...r, op, value: op === "in" ? arr : arr[0] }); }}>
        {OPS_FOR(r.field).map((o) => <option key={o} value={o}>{c.seg.ops[o]}</option>)}
      </Select>
      {NUMERIC.has(r.field) ? <Input aria-label={c.seg.value} type="number" min={0} value={String(r.value ?? 0)} onChange={(e) => onChange({ ...r, value: Number(e.target.value) })} />
        : choices ? (
          <Select aria-label={c.seg.value} multiple={multi} value={multi ? arr : arr[0]} onChange={(e) => onChange({ ...r, value: multi ? [...e.target.selectedOptions].map((o) => o.value) : e.target.value })} className={multi ? "h-24" : undefined}>
            {choices.map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
        ) : <Input aria-label={c.seg.value} value={arr.join(",")} onChange={(e) => onChange({ ...r, value: multi ? e.target.value.split(",").map((x) => x.trim()) : e.target.value })} />}
      <Button size="sm" variant="ghost" onClick={onRemove} aria-label={c.seg.remove}><Icon name="x" size={14} aria-hidden /></Button>
    </div>
  );
}
