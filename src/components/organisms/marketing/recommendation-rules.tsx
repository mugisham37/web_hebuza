"use client";
// F-CRM-11 editor: "customer used X → suggest Y". `*` = everyone. Saved as one ordered list.
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/provider";
import { Button } from "@/components/atoms/button";
import { Input, Switch } from "@/components/atoms/field";
import { ErrorState, Skeleton } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";

type Rule = { id: string; ifUsed: string; recommend: string[]; active: boolean };
const COPY = {
  en: { title: "Recommendation rules", lede: "Suggest the next service on the customer page. Use * for every customer.", ifUsed: "If the customer used (service slug or *)", rec: "Suggest (slugs, comma separated)", active: "Active", add: "Add rule", remove: "Remove", save: "Save rules", saved: "Rules saved", failed: "Could not save the rules", empty: "No rules yet." },
  fr: { title: "Règles de recommandation", lede: "Suggérez le service suivant sur la fiche client. * = tous les clients.", ifUsed: "Si le client a utilisé (slug ou *)", rec: "Suggérer (slugs, séparés par des virgules)", active: "Active", add: "Ajouter une règle", remove: "Supprimer", save: "Enregistrer", saved: "Règles enregistrées", failed: "Échec de l'enregistrement", empty: "Aucune règle." },
  rw: { title: "Amategeko yo gusaba serivisi", lede: "Garagaza serivisi ikurikira ku rupapuro rw'umukiriya. * = abakiriya bose.", ifUsed: "Niba umukiriya yakoresheje (slug cyangwa *)", rec: "Gusaba (slugs, zitandukanyijwe n'akitso)", active: "Birakora", add: "Ongeraho itegeko", remove: "Kuraho", save: "Bika", saved: "Amategeko yabitswe", failed: "Ntibyabitswe", empty: "Nta mategeko arahari." },
} as const;

export function RecommendationRules() {
  const { locale } = useI18n();
  const c = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const toast = useToast();
  const q = useQuery({ queryKey: ["mkt", "rec-rules"], queryFn: () => unwrap<{ items: Rule[] }>(api.GET("/api/admin/mkt/recommendation-rules")) });
  const [edit, setRows] = useState<(Rule & { recText: string })[] | null>(null);
  const rows = edit ?? q.data?.items.map((r) => ({ ...r, recText: r.recommend.join(", ") })) ?? null;
  const save = useMutation({
    mutationFn: (items: Rule[]) => unwrap<{ items: Rule[] }>(api.PUT("/api/admin/mkt/recommendation-rules", { body: { items } })),
    onSuccess: () => toast({ tone: "success", title: c.saved }),
    onError: () => toast({ tone: "danger", title: c.failed }),
  });
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!rows) return <Skeleton className="h-40" />;
  const set = (i: number, p: Partial<(typeof rows)[number]>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  return (
    <section aria-labelledby="rr-h" className="grid max-w-3xl gap-4">
      <div><h1 id="rr-h" className="text-h2">{c.title}</h1><p className="mt-1 text-body text-fg-muted">{c.lede}</p></div>
      {!rows.length && <p className="text-small text-fg-muted">{c.empty}</p>}
      <ul className="grid gap-3">
        {rows.map((r, i) => (
          <li key={r.id} className="grid gap-3 border border-border p-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
            <label className="grid gap-1 text-small">{c.ifUsed}<Input value={r.ifUsed} onChange={(e) => set(i, { ifUsed: e.target.value.trim().toLowerCase() })} /></label>
            <label className="grid gap-1 text-small">{c.rec}<Input value={r.recText} onChange={(e) => set(i, { recText: e.target.value })} /></label>
            <div className="flex items-center gap-3">
              <Switch label={c.active} checked={r.active} onChange={(e) => set(i, { active: e.target.checked })} />
              <Button type="button" size="sm" variant="secondary" onClick={() => setRows(rows.filter((_, j) => j !== i))}>{c.remove}</Button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => setRows([...rows, { id: `r-${Date.now().toString(36)}`, ifUsed: "*", recommend: [], recText: "", active: true }])}>{c.add}</Button>
        <Button type="button" disabled={save.isPending} onClick={() => save.mutate(rows.map(({ recText, ...r }) => ({ ...r, recommend: recText.split(",").map((x) => x.trim()).filter(Boolean) })).filter((r) => r.ifUsed && r.recommend.length))}>{c.save}</Button>
      </div>
    </section>
  );
}
