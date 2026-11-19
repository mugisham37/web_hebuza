"use client";
// F-CAT-05/07/08/09: public facts on the service record (engagement type, turnaround, delivery, eligibility,
// deliverables, per-locale SEO, related services). Lives in the builder's Details step; saved with its own button.
import { useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/atoms/field";
import { Button } from "@/components/atoms/button";
import { useToast } from "@/components/atoms/toast";
import { useSaveServiceFacts, type ServiceDetail } from "@/lib/ops/e";
import type { CatalogueCopy } from "@/content/pages/ops-catalogue";

type Lang = "rw" | "en" | "fr";
type L3 = { rw: string; en: string; fr: string };
const lines = (xs: L3[], l: Lang) => xs.map((x) => x[l]).join("\n");
/** Edit one locale of an L3 list by line; other locales keep their value at the same index. */
const setLines = (xs: L3[], l: Lang, text: string) =>
  text.split("\n").map((t, i) => ({ ...(xs[i] ?? { rw: "", en: "", fr: "" }), [l]: t })).filter((x) => x.rw.trim() || x.en.trim() || x.fr.trim());
const num = (v: string) => (v.trim() === "" ? null : Math.max(0, Math.min(365, Math.round(Number(v)) || 0)));

export function ServiceFacts({ slug, service, lang, c }: { slug: string; service: ServiceDetail; lang: Lang; c: CatalogueCopy["facts"] }) {
  const toast = useToast();
  const save = useSaveServiceFacts(slug);
  const [f, setF] = useState(() => ({
    engagement_type: service.engagement_type,
    delivery_mode: service.delivery_mode ?? "",
    turnaround_days_min: service.turnaround_days_min ?? null,
    turnaround_days_max: service.turnaround_days_max ?? null,
    eligibility: (service.eligibility ?? []) as L3[],
    deliverables: (service.deliverables ?? []) as L3[],
    seo: (service.seo ?? {}) as Partial<Record<Lang, { title?: string; description?: string; og_image?: string }>>,
    related: (service.related_slugs ?? []).join(", "),
    fee: (service.fee_explainer ?? { rw: "", en: "", fr: "" }) as L3,
    markets: (service.markets ?? ["RW"]).join(", "),
  }));
  const seo = f.seo[lang] ?? {};
  const setSeo = (k: "title" | "description" | "og_image", v: string) => setF((x) => ({ ...x, seo: { ...x.seo, [lang]: { ...x.seo[lang], [k]: v } } }));
  const rangeBad = f.turnaround_days_min != null && f.turnaround_days_max != null && f.turnaround_days_min > f.turnaround_days_max;
  const submit = () =>
    save.mutate(
      {
        engagement_type: f.engagement_type, delivery_mode: f.delivery_mode || null,
        turnaround_days_min: f.turnaround_days_min, turnaround_days_max: f.turnaround_days_max,
        eligibility: f.eligibility, deliverables: f.deliverables, seo: f.seo,
        related_slugs: f.related.split(",").map((x) => x.trim()).filter(Boolean),
        fee_explainer: f.fee.rw.trim() || f.fee.en.trim() || f.fee.fr.trim() ? f.fee : null,
        markets: f.markets.split(",").map((x) => x.trim().toUpperCase()).filter((x) => /^[A-Z]{2}$/.test(x)),
      },
      { onSuccess: () => toast({ title: c.saved, tone: "success" }), onError: () => toast({ title: c.failed, tone: "danger" }) },
    );
  return (
    <section aria-labelledby="facts-h" className="grid content-start gap-4 border-t border-border pt-6">
      <div>
        <h2 id="facts-h" className="text-card-title">{c.title}</h2>
        <p className="mt-1 text-small text-fg-subtle">{c.hint}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={c.engagement}>{(a) => (
          <Select id={a.id} value={f.engagement_type} onChange={(e) => setF((x) => ({ ...x, engagement_type: e.target.value }))}>
            <option value="application">{c.application}</option><option value="consultation">{c.consultation}</option>
          </Select>
        )}</Field>
        <Field label={c.mode}>{(a) => (
          <Select id={a.id} value={f.delivery_mode} onChange={(e) => setF((x) => ({ ...x, delivery_mode: e.target.value }))}>
            <option value="">{c.none}</option><option value="online">{c.online}</option><option value="in_person">{c.in_person}</option><option value="hybrid">{c.hybrid}</option>
          </Select>
        )}</Field>
        <Field label={c.min}>{(a) => <Input id={a.id} type="number" min={0} max={365} inputMode="numeric" value={f.turnaround_days_min ?? ""} onChange={(e) => setF((x) => ({ ...x, turnaround_days_min: num(e.target.value) }))} />}</Field>
        <Field label={c.max} error={rangeBad ? `${c.min} > ${c.max}` : undefined}>{(a) => <Input id={a.id} aria-describedby={a.describedBy} type="number" min={0} max={365} inputMode="numeric" value={f.turnaround_days_max ?? ""} onChange={(e) => setF((x) => ({ ...x, turnaround_days_max: num(e.target.value) }))} />}</Field>
      </div>
      <Field label={`${c.eligibility} (${lang})`}>{(a) => <Textarea id={a.id} rows={4} value={lines(f.eligibility, lang)} onChange={(e) => setF((x) => ({ ...x, eligibility: setLines(x.eligibility, lang, e.target.value) }))} />}</Field>
      <Field label={`${c.deliverables} (${lang})`}>{(a) => <Textarea id={a.id} rows={4} value={lines(f.deliverables, lang)} onChange={(e) => setF((x) => ({ ...x, deliverables: setLines(x.deliverables, lang, e.target.value) }))} />}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`${c.seoTitle} (${lang})`} hint={`${(seo.title ?? "").length}/70`}>{(a) => <Input id={a.id} aria-describedby={a.describedBy} maxLength={70} value={seo.title ?? ""} onChange={(e) => setSeo("title", e.target.value)} />}</Field>
        <Field label={`${c.og} (${lang})`}>{(a) => <Input id={a.id} type="url" maxLength={500} value={seo.og_image ?? ""} onChange={(e) => setSeo("og_image", e.target.value)} />}</Field>
      </div>
      <Field label={`${c.seoDesc} (${lang})`} hint={`${(seo.description ?? "").length}/170`}>{(a) => <Textarea id={a.id} aria-describedby={a.describedBy} rows={2} maxLength={170} value={seo.description ?? ""} onChange={(e) => setSeo("description", e.target.value)} />}</Field>
      <Field label={`${c.feeExplainer} (${lang})`}>{(a) => <Textarea id={a.id} rows={2} maxLength={2000} value={f.fee[lang]} onChange={(e) => setF((x) => ({ ...x, fee: { ...x.fee, [lang]: e.target.value } }))} />}</Field>
      <Field label={c.markets}>{(a) => <Input id={a.id} value={f.markets} onChange={(e) => setF((x) => ({ ...x, markets: e.target.value }))} />}</Field>
      <Field label={c.related}>{(a) => <Input id={a.id} value={f.related} onChange={(e) => setF((x) => ({ ...x, related: e.target.value }))} />}</Field>
      <div><Button type="button" onClick={submit} disabled={save.isPending || rangeBad}>{c.save}</Button></div>
    </section>
  );
}
