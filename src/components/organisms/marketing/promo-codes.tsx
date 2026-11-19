"use client";
// F-CRM-20 promo codes: % or fixed RWF off service fees, optional dates, use cap and service list.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/provider";
import { Button } from "@/components/atoms/button";
import { Input, Select, Switch } from "@/components/atoms/field";
import { ErrorState, Skeleton } from "@/components/atoms/feedback";
import { Badge } from "@/components/atoms/tag";
import { useToast } from "@/components/atoms/toast";

type Promo = { code: string; kind: "percent" | "amount"; value: number; from?: string; to?: string; maxUses?: number; uses: number; active: boolean; services?: string[] };
const COPY = {
  en: { title: "Promo codes", lede: "Finance applies a code when creating an invoice; it discounts service fees only.", code: "Code", kind: "Type", percent: "% off", amount: "RWF off", value: "Value", from: "From", to: "Until", max: "Max uses", services: "Only these services (slugs, optional)", active: "Active", uses: "{n} used", save: "Save code", saved: "Code saved", failed: "Could not save the code", empty: "No promo codes yet." },
  fr: { title: "Codes promo", lede: "La finance applique un code à la création d'une facture ; il ne réduit que les frais de service.", code: "Code", kind: "Type", percent: "% de remise", amount: "RWF de remise", value: "Valeur", from: "Du", to: "Au", max: "Utilisations max", services: "Services concernés (slugs, facultatif)", active: "Actif", uses: "{n} utilisé(s)", save: "Enregistrer", saved: "Code enregistré", failed: "Échec de l'enregistrement", empty: "Aucun code promo." },
  rw: { title: "Kode za poromosiyo", lede: "Imari ishyira kode igihe ikora fagitire; igabanya amafaranga ya serivisi gusa.", code: "Kode", kind: "Ubwoko", percent: "% igabanywa", amount: "RWF igabanywa", value: "Agaciro", from: "Kuva", to: "Kugeza", max: "Inshuro ntarengwa", services: "Serivisi gusa (slugs, si ngombwa)", active: "Irakora", uses: "Yakoreshejwe {n}", save: "Bika kode", saved: "Kode yabitswe", failed: "Ntibyabitswe", empty: "Nta kode zirahari." },
} as const;
const blank = { code: "", kind: "percent" as const, value: 10, from: "", to: "", maxUses: "", services: "", active: true };

export function PromoCodes() {
  const { locale } = useI18n();
  const c = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["mkt", "promos"], queryFn: () => unwrap<{ items: Promo[] }>(api.GET("/api/admin/mkt/promos")) });
  const [f, setF] = useState<{ code: string; kind: "percent" | "amount"; value: number; from: string; to: string; maxUses: string; services: string; active: boolean }>(blank);
  const save = useMutation({
    mutationFn: () => unwrap<Promo>(api.PUT("/api/admin/mkt/promos/{code}", { params: { path: { code: f.code.toUpperCase() } }, body: {
      code: f.code.toUpperCase(), kind: f.kind, value: f.value, active: f.active,
      ...(f.from && { from: f.from }), ...(f.to && { to: f.to }), ...(f.maxUses && { maxUses: Number(f.maxUses) }),
      ...(f.services.trim() && { services: f.services.split(",").map((x) => x.trim()).filter(Boolean) }),
    } })),
    onSuccess: () => { toast({ tone: "success", title: c.saved }); setF(blank); void qc.invalidateQueries({ queryKey: ["mkt", "promos"] }); },
    onError: () => toast({ tone: "danger", title: c.failed }),
  });
  const edit = (p: Promo) => setF({ code: p.code, kind: p.kind, value: p.value, from: p.from ?? "", to: p.to ?? "", maxUses: p.maxUses ? String(p.maxUses) : "", services: (p.services ?? []).join(", "), active: p.active });
  return (
    <section aria-labelledby="promo-h" className="grid max-w-4xl gap-6">
      <div><h1 id="promo-h" className="text-h2">{c.title}</h1><p className="mt-1 text-body text-fg-muted">{c.lede}</p></div>
      {q.isPending ? <Skeleton className="h-24" /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !q.data.items.length ? <p className="text-small text-fg-muted">{c.empty}</p> : (
        <ul className="grid gap-2">{q.data.items.map((p) => (
          <li key={p.code}><button type="button" onClick={() => edit(p)} className="flex w-full flex-wrap items-center gap-3 border border-border p-3 text-left hover:bg-bg-subtle">
            <span className="font-mono text-label">{p.code}</span><span className="text-small">{p.kind === "percent" ? `${p.value}%` : `${p.value} RWF`}</span>
            <Badge tone={p.active ? "success" : "neutral"}>{p.active ? c.active : "—"}</Badge><span className="text-small text-fg-muted">{c.uses.replace("{n}", String(p.uses))}{p.maxUses ? ` / ${p.maxUses}` : ""}</span>
          </button></li>))}</ul>
      )}
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid gap-3 border border-border p-4 sm:grid-cols-3">
        <label className="grid gap-1 text-small">{c.code}<Input required pattern="[A-Za-z0-9-]{3,32}" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} /></label>
        <label className="grid gap-1 text-small">{c.kind}<Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as "percent" | "amount" })}><option value="percent">{c.percent}</option><option value="amount">{c.amount}</option></Select></label>
        <label className="grid gap-1 text-small">{c.value}<Input type="number" min={1} max={f.kind === "percent" ? 100 : undefined} value={f.value} onChange={(e) => setF({ ...f, value: Number(e.target.value) })} /></label>
        <label className="grid gap-1 text-small">{c.from}<Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></label>
        <label className="grid gap-1 text-small">{c.to}<Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></label>
        <label className="grid gap-1 text-small">{c.max}<Input type="number" min={1} value={f.maxUses} onChange={(e) => setF({ ...f, maxUses: e.target.value })} /></label>
        <label className="grid gap-1 text-small sm:col-span-2">{c.services}<Input value={f.services} onChange={(e) => setF({ ...f, services: e.target.value })} /></label>
        <div className="flex items-end gap-3"><Switch label={c.active} checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /><Button type="submit" disabled={save.isPending}>{c.save}</Button></div>
      </form>
    </section>
  );
}
