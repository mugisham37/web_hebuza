"use client";
// SEO & tracking (U8 + U19, board RP3): tabs seo|analytics|conversions|redirects|health|nav|settings, all in ?tab=.
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { formatDateTime, formatRelative } from "@/shared/format";
import { errorCopy } from "@/lib/api/error-copy";
import { fill } from "@/content/pages/mkt-common";
import {
  useDeleteRedirect, useHealth, useNav, useNotFound, useRedirects, useRunSpeed, useSaveNav, useSaveRedirect, useSaveSettings, useSaveTracking, useSiteSettings, useTracking,
} from "@/lib/marketing/content";
import type { NavLocation, NavNode, SiteSettings } from "@/shared/marketing/types";
import { LOCALES } from "@/shared/marketing/types";
import { Button } from "@/components/atoms/button";
import { Checkbox, Input, Select, Switch, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { Panel, PanelError, SavedViewTabs, EmptyPanel } from "@/components/molecules/ops/ops";
import { PageHead, useM } from "@/components/atoms/marketing";
import { useCC } from "@/components/molecules/marketing/marketing";

const TABS = ["seo", "analytics", "conversions", "redirects", "health", "nav", "settings"] as const;
const Sk = () => <div className="h-40 m-shimmer" />;
const Lbl = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => <label className="grid gap-1.5"><span className="text-label">{label}</span>{hint && <span className="text-small text-fg-subtle">{hint}</span>}{children}</label>;

export function SeoView() {
  const c = useCC();
  const p = useUrlParams();
  const tab = (TABS as readonly string[]).includes(p.get("tab") ?? "") ? (p.get("tab") as (typeof TABS)[number]) : "seo";
  return (
    <div>
      <PageHead title={c.titles.seo} sub={c.subs.seo} />
      <SavedViewTabs views={TABS.map((k) => ({ key: k, label: c.seoPage.tabs[k] }))} active={tab} onChange={(k) => setUrlParams({ tab: k === "seo" ? null : k })} />
      <div className="mt-5">
        {(tab === "seo" || tab === "analytics" || tab === "conversions") && <Tracking tab={tab} />}
        {tab === "redirects" && <Redirects />}
        {tab === "health" && <Health />}
        {tab === "nav" && <NavEditor />}
        {tab === "settings" && <Settings />}
      </div>
    </div>
  );
}

function Tracking({ tab }: { tab: "seo" | "analytics" | "conversions" }) {
  const c = useCC().seoPage;
  const m = useM();
  const { locale } = useI18n();
  const toast = useToast();
  const q = useTracking();
  const save = useSaveTracking();
  const [d, setD] = useState<{ ga4Id?: string; gscToken?: string; adsIds?: string[]; pixelId?: string }>({});
  if (q.isPending) return <Sk />;
  if (q.isError) return <PanelError what={c.tabs[tab]} onRetry={() => q.refetch()} />;
  const t = { ...q.data, ...d };
  const ga4Bad = !!t.ga4Id && !/^G-[A-Z0-9]{6,12}$/.test(t.ga4Id);
  const adsBad = t.adsIds.some((x) => x && !/^AW-\d{6,12}$/.test(x));
  const submit = () => save.mutate({ ga4Id: t.ga4Id, gscToken: t.gscToken, adsIds: t.adsIds.filter(Boolean), pixelId: t.pixelId }, {
    onSuccess: () => { setD({}); toast({ title: c.saved, tone: "success" }); }, onError: (e) => toast({ title: errorCopy(e, locale), tone: "danger" }) });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {tab === "seo" && <>
        <Panel title={c.sitemap}>
          <p className="text-small text-fg-muted">{fill(c.lastGenerated, { t: formatRelative(q.data.sitemap.generatedAt, locale) })}</p>
          <ul className="mt-2 grid gap-1 text-small">{LOCALES.map((l) => <li key={l} className="flex justify-between"><span>{m.locale[l]}</span><span className="tabular">{fill(c.urls, { n: q.data.sitemap.urls[l] })}</span></li>)}</ul>
        </Panel>
        <Panel title={c.gsc}><div className="grid gap-3"><Input aria-label={c.gsc} value={t.gscToken} onChange={(e) => setD({ ...d, gscToken: e.target.value })} /><Button size="sm" onClick={submit} loading={save.isPending}>{m.common.save}</Button></div></Panel>
      </>}
      {tab === "analytics" && <>
        <Panel title={c.ga4}>
          <div className="grid gap-3">
            <Lbl label={c.ga4} hint={ga4Bad ? c.ga4Bad : t.ga4Id ? undefined : c.notConnected}><Input data-guide="marketing-ga4" aria-invalid={ga4Bad} value={t.ga4Id} placeholder="G-XXXXXXX" onChange={(e) => setD({ ...d, ga4Id: e.target.value.trim().toUpperCase() })} /></Lbl>
            <Lbl label={c.pixel}><Input value={t.pixelId} onChange={(e) => setD({ ...d, pixelId: e.target.value.replace(/\D/g, "") })} /></Lbl>
            <Switch label={c.pixelConsent} checked readOnly disabled />
            <p className="text-eyebrow text-fg-subtle">{c.pixelLocked}</p>
            <Button size="sm" disabled={ga4Bad} onClick={submit} loading={save.isPending}>{m.common.save}</Button>
          </div>
        </Panel>
        <Events events={q.data.events} />
      </>}
      {tab === "conversions" && <>
        <Panel title={c.ads}>
          <div className="grid gap-2">
            {(t.adsIds.length ? t.adsIds : [""]).map((x, i) => <Input key={i} aria-label={`${c.ads} ${i + 1}`} aria-invalid={!!x && !/^AW-\d{6,12}$/.test(x)} value={x} placeholder="AW-123456789" onChange={(e) => { const n = [...(t.adsIds.length ? t.adsIds : [""])]; n[i] = e.target.value.trim().toUpperCase(); setD({ ...d, adsIds: n }); }} />)}
            {adsBad && <p className="text-small text-danger">{c.adsBad}</p>}
            <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => setD({ ...d, adsIds: [...t.adsIds, ""] })}>{c.addAds}</Button><Button size="sm" disabled={adsBad} onClick={submit} loading={save.isPending}>{m.common.save}</Button></div>
          </div>
        </Panel>
        <Events events={q.data.events} />
      </>}
    </div>
  );
}
function Events({ events }: { events: { name: string; count: number; lastAt?: string }[] }) {
  const c = useCC().seoPage;
  const { locale } = useI18n();
  return (
    <Panel title={c.events}>
      <ul className="grid gap-2 text-small">{events.map((e) => <li key={e.name} className="flex items-center justify-between gap-2"><code>{e.name}</code><span className="tabular">{e.count}{e.lastAt && <span className="ml-2 text-fg-subtle">{formatRelative(e.lastAt, locale)}</span>}</span></li>)}</ul>
    </Panel>
  );
}

function Redirects() {
  const c = useCC().seoPage;
  const m = useM();
  const { locale } = useI18n();
  const toast = useToast();
  const q = useRedirects();
  const nf = useNotFound();
  const save = useSaveRedirect();
  const del = useDeleteRedirect();
  const [form, setForm] = useState({ from: "", to: "", code: 301 as 301 | 302 });
  const [err, setErr] = useState<string | null>(null);
  const items = q.data?.items ?? [];
  const loops = !!form.from && items.some((r) => r.from === form.to && r.to === form.from) || (!!form.from && form.from === form.to);
  const add = () => { setErr(null); save.mutate(form, { onSuccess: () => { setForm({ from: "", to: "", code: 301 }); toast({ title: m.common.save, tone: "success" }); }, onError: (e) => setErr(errorCopy(e, locale)) }); };
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Panel title={c.tabs.redirects}>
        <form data-guide="marketing-redirect-form" className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]" onSubmit={(e) => { e.preventDefault(); if (!loops) add(); }}>
          <Input aria-label={c.redirects.from} placeholder="/old-path" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value.trim() })} />
          <Input aria-label={c.redirects.to} placeholder="/new-path" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value.trim() })} />
          <Select aria-label={c.redirects.code} value={form.code} onChange={(e) => setForm({ ...form, code: Number(e.target.value) as 301 })} className="w-auto"><option value={301}>301</option><option value={302}>302</option></Select>
          <Button type="submit" disabled={!form.from.startsWith("/") || !form.to || loops} loading={save.isPending}>{c.redirects.add}</Button>
        </form>
        {(loops || err) && <p role="alert" className="mb-3 text-small text-danger m-shake">{loops ? c.redirects.loop : err}</p>}
        {q.isPending ? <Sk /> : q.isError ? <PanelError what={c.tabs.redirects} onRetry={() => q.refetch()} /> : !items.length ? <EmptyPanel compact title={c.redirects.empty} /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[34rem] text-left text-small">
            <thead><tr className="text-fg-subtle"><th scope="col" className="p-2">{c.redirects.from}</th><th scope="col" className="p-2">{c.redirects.to}</th><th scope="col" className="p-2">{c.redirects.code}</th><th scope="col" className="p-2">{c.redirects.hits}</th><th scope="col" className="p-2">{c.redirects.by}</th><th /></tr></thead>
            <tbody>{items.map((r) => <tr key={r.id} className="border-t border-border"><td className="p-2 font-mono">{r.from}</td><td className="p-2 font-mono">{r.to}</td><td className="p-2">{r.code}</td><td className="p-2 tabular">{r.hits}</td><td className="p-2">{r.createdBy} · {formatDateTime(r.createdAt, locale)}</td>
              <td className="p-2"><button type="button" aria-label={m.common.delete} onClick={() => del.mutate(r.id)}><Icon name="x" size={14} aria-hidden /></button></td></tr>)}</tbody>
          </table></div>
        )}
      </Panel>
      <Panel title={c.redirects.notFound}>
        {nf.isPending ? <Sk /> : nf.isError ? <PanelError what={c.redirects.notFound} onRetry={() => nf.refetch()} /> : !nf.data?.items.length ? <p className="text-small text-fg-muted">{c.redirects.nfEmpty}</p> : (
          <ul className="grid gap-2 text-small">{nf.data.items.map((h) => <li key={h.path} className="flex items-center justify-between gap-2"><span className="min-w-0 truncate font-mono" title={h.path}>{h.path}</span><span className="tabular text-fg-subtle">{h.hits}</span>
            <button type="button" className="underline" onClick={() => setForm({ ...form, from: h.path })}>{c.redirects.create}</button></li>)}</ul>
        )}
      </Panel>
    </div>
  );
}

function Health() {
  const c = useCC().seoPage;
  const { locale } = useI18n();
  const q = useHealth();
  const run = useRunSpeed();
  const [page, setPage] = useState(`/${locale}`);
  if (q.isPending) return <Sk />;
  if (q.isError) return <PanelError what={c.tabs.health} onRetry={() => q.refetch()} />;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title={c.health.broken}>
        {!q.data.broken.length ? <p className="text-small text-fg-muted">{c.health.none}</p> : (
          <ul className="grid gap-2 text-small">{q.data.broken.map((b) => <li key={b.url} className="grid gap-0.5 border border-border p-2"><span className="truncate font-mono" title={b.url}>{b.url}</span><span className="text-eyebrow text-fg-subtle">{b.status} · {c.health.found} {b.foundOn}</span></li>)}</ul>
        )}
      </Panel>
      <Panel title={c.health.speed} action={<form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run.mutate(page); }}><Input aria-label={c.health.page} value={page} onChange={(e) => setPage(e.target.value)} className="h-9 w-40" /><Button size="sm" type="submit" loading={run.isPending}>{c.health.run}</Button></form>}>
        {!q.data.speed.length ? <p className="text-small text-fg-muted"></p> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-small"><thead><tr className="text-fg-subtle"><th scope="col" className="p-1">{c.health.page}</th><th scope="col" className="p-1">{c.health.lcp}</th><th scope="col" className="p-1">{c.health.cls}</th><th scope="col" className="p-1">{c.health.inp}</th></tr></thead>
            <tbody>{q.data.speed.map((s) => <tr key={s.id} className="border-t border-border"><td className="p-1">{s.page}<span className="block text-eyebrow text-fg-subtle">{formatRelative(s.at, locale)}</span></td><td className="p-1 tabular">{(s.lcp / 1000).toFixed(1)} s</td><td className="p-1 tabular">{s.cls}</td><td className="p-1 tabular">{s.inp} ms</td></tr>)}</tbody></table></div>
        )}
      </Panel>
    </div>
  );
}

function NavEditor() {
  const c = useCC().seoPage;
  const m = useM();
  const { locale } = useI18n();
  const toast = useToast();
  const [loc, setLoc] = useState<NavLocation>("header");
  const q = useNav(loc);
  const save = useSaveNav(loc);
  const [items, setItems] = useState<NavNode[] | null>(null);
  const list = items ?? q.data?.items ?? [];
  const set = (i: number, n: NavNode) => setItems(list.map((x, k) => (k === i ? n : x)));
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= list.length) return; const n = [...list]; [n[i], n[j]] = [n[j], n[i]]; setItems(n); };
  return (
    <Panel title={c.tabs.nav} action={<Select aria-label={c.nav.location} value={loc} onChange={(e) => { setLoc(e.target.value as NavLocation); setItems(null); }} className="h-9 w-auto">{(["header", "mobile", "footer"] as const).map((l) => <option key={l} value={l}>{c.nav[l]}</option>)}</Select>}>
      {q.isPending ? <Sk /> : q.isError ? <PanelError what={c.tabs.nav} onRetry={() => q.refetch()} /> : (
        <div className="grid gap-3">
          <ol className="grid gap-2">{list.map((n, i) => (
            <li key={n.id} className="grid gap-2 border border-border p-3 sm:grid-cols-[repeat(3,1fr)_1fr_auto]" onKeyDown={(e) => { if (e.altKey && e.key === "ArrowUp") { e.preventDefault(); move(i, -1); } if (e.altKey && e.key === "ArrowDown") { e.preventDefault(); move(i, 1); } }}>
              {LOCALES.map((l) => <Input key={l} lang={l} aria-label={fill(c.nav.label, { l: l.toUpperCase() })} placeholder={l.toUpperCase()} value={n.label[l] ?? ""} onChange={(e) => set(i, { ...n, label: { ...n.label, [l]: e.target.value } })} />)}
              <Input aria-label={c.nav.href} value={n.href} onChange={(e) => set(i, { ...n, href: e.target.value })} />
              <span className="flex items-center gap-1">
                <button type="button" aria-label="↑" disabled={i === 0} onClick={() => move(i, -1)} className="size-8 rounded-full hover:bg-navy-50 disabled:opacity-30">↑</button>
                <button type="button" aria-label="↓" disabled={i === list.length - 1} onClick={() => move(i, 1)} className="size-8 rounded-full hover:bg-navy-50 disabled:opacity-30">↓</button>
                <button type="button" aria-label={m.common.delete} onClick={() => setItems(list.filter((_, k) => k !== i))} className="size-8 rounded-full hover:bg-navy-50">×</button>
              </span>
            </li>))}</ol>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setItems([...list, { id: `nv-${list.length + 1}-${list.map((x) => x.id).join("").length}`, href: "/", label: {} }])}>{c.nav.add}</Button>
            <Button size="sm" disabled={!items} loading={save.isPending} onClick={() => save.mutate(list, { onSuccess: () => { setItems(null); toast({ title: c.nav.saved, tone: "success" }); }, onError: (e) => toast({ title: errorCopy(e, locale), tone: "danger" }) })}>{m.common.save}</Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function Settings() {
  const c = useCC().seoPage;
  const m = useM();
  const { locale } = useI18n();
  const toast = useToast();
  const q = useSiteSettings();
  const save = useSaveSettings();
  const [d, setD] = useState<SiteSettings | null>(null);
  if (q.isPending) return <Sk />;
  if (q.isError) return <PanelError what={c.tabs.settings} onRetry={() => q.refetch()} />;
  const s = d ?? q.data;
  const up = (p: Partial<SiteSettings>) => setD({ ...s, ...p });
  const ann = s.announcement ?? { text: {}, dismissible: true };
  const s2 = c.settings;
  return (
    <form className="grid gap-4 lg:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(s, { onSuccess: () => { setD(null); toast({ title: s2.saved, tone: "success" }); }, onError: (x) => toast({ title: errorCopy(x, locale), tone: "danger" }) }); }}>
      <Panel title={c.tabs.settings}>
        <div className="grid gap-3">
          <Lbl label={s2.address}><Textarea rows={2} value={s.address} onChange={(e) => up({ address: e.target.value })} /></Lbl>
          <Lbl label={s2.phone}><Input type="tel" value={s.phone} onChange={(e) => up({ phone: e.target.value })} /></Lbl>
          <Lbl label={s2.email}><Input type="email" value={s.email} onChange={(e) => up({ email: e.target.value })} /></Lbl>
          <Lbl label={s2.whatsapp}><Input type="tel" value={s.whatsapp} onChange={(e) => up({ whatsapp: e.target.value })} /></Lbl>
          {LOCALES.map((l) => <Lbl key={l} label={fill(s2.hours, { l: l.toUpperCase() })}><Input lang={l} value={s.hours[l] ?? ""} onChange={(e) => up({ hours: { ...s.hours, [l]: e.target.value } })} /></Lbl>)}
        </div>
      </Panel>
      <div className="grid h-fit gap-4">
        <Panel title={s2.social}>
          <div className="grid gap-2">
            {s.social.map((x, i) => <div key={i} className="grid grid-cols-[8rem_1fr_auto] gap-2"><Input aria-label={s2.network} value={x.network} onChange={(e) => up({ social: s.social.map((y, k) => k === i ? { ...y, network: e.target.value } : y) })} /><Input aria-label={s2.url} type="url" value={x.url} onChange={(e) => up({ social: s.social.map((y, k) => k === i ? { ...y, url: e.target.value } : y) })} /><button type="button" aria-label={m.common.delete} onClick={() => up({ social: s.social.filter((_, k) => k !== i) })}>×</button></div>)}
            <Button size="sm" variant="secondary" type="button" onClick={() => up({ social: [...s.social, { network: "", url: "" }] })}>{m.common.add}</Button>
          </div>
        </Panel>
        <Panel title={fill(s2.announcement, { l: "" }).replace(/\s*\(\)/, "")}>
          <div className="grid gap-2">
            {LOCALES.map((l) => <Lbl key={l} label={fill(s2.announcement, { l: l.toUpperCase() })}><Input lang={l} value={ann.text[l] ?? ""} onChange={(e) => up({ announcement: { ...ann, text: { ...ann.text, [l]: e.target.value } } })} /></Lbl>)}
            <div className="grid grid-cols-2 gap-2"><Lbl label={s2.from}><Input type="date" value={ann.from?.slice(0, 10) ?? ""} onChange={(e) => up({ announcement: { ...ann, from: e.target.value || undefined } })} /></Lbl><Lbl label={s2.to}><Input type="date" value={ann.to?.slice(0, 10) ?? ""} onChange={(e) => up({ announcement: { ...ann, to: e.target.value || undefined } })} /></Lbl></div>
            <Checkbox label={s2.dismissible} checked={ann.dismissible} onChange={(e) => up({ announcement: { ...ann, dismissible: e.target.checked } })} />
          </div>
        </Panel>
        <Button type="submit" disabled={!d} loading={save.isPending}>{m.common.save}</Button>
      </div>
    </form>
  );
}
