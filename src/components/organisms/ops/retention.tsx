"use client";
// DOC-09: SM retention queue (nightly flags) → shred or keep with a reason; step-up confirmed.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/provider";
import { formatDate } from "@/shared/format";
import { opsRetention, type RetentionCopy } from "@/content/pages/ops-retention";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/field";
import { Badge } from "@/components/atoms/tag";
import { EmptyState, ErrorState, Skeleton } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { useStepUp, StepUpCancelled } from "@/components/atoms/step-up";
import { hdr } from "@/lib/ops/c";

type Flag = { id: string; label: string; retentionClass: keyof RetentionCopy["classes"]; caseCode: string | null; anchorAt: string; decision: "shred" | "keep" | null; shreddedAt: string | null; reason: string | null };

export function RetentionQueue() {
  const { locale } = useI18n();
  const c = opsRetention(locale);
  const [tab, setTab] = useState<"open" | "decided">("open");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const qc = useQueryClient();
  const toast = useToast();
  const stepUp = useStepUp();
  const q = useQuery({ queryKey: ["ops", "retention", tab], queryFn: () => unwrap<{ items: Flag[] }>(api.GET("/api/admin/documents/retention", { params: { query: { state: tab } } })) });
  const decide = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "shred" | "keep" }) => {
      const token = await stepUp.request(c.shred);
      return unwrap(api.POST("/api/admin/documents/retention/{id}/decision", { params: { path: { id } }, body: { decision, reason: reasons[id]?.trim() || undefined }, headers: hdr({ stepUp: token, audit: decision }) }));
    },
    onSuccess: () => { toast({ title: c.done, tone: "success" }); void qc.invalidateQueries({ queryKey: ["ops", "retention"] }); },
    onError: (e) => { if (!(e instanceof StepUpCancelled)) toast({ title: c.failed, tone: "danger" }); },
  });
  return (
    <div className="grid gap-5">
      {stepUp.dialog}
      <div><h1 className="text-h2">{c.title}</h1><p className="text-body text-fg-muted">{c.lede}</p></div>
      <div role="tablist" aria-label={c.title} className="flex gap-1">
        {(["open", "decided"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={tab === t ? "h-9 bg-secondary px-3 text-small text-on-secondary" : "h-9 border border-border bg-white px-3 text-small hover:bg-navy-50"}>{c.tabs[t]}</button>
        ))}
      </div>
      {q.isPending ? <Skeleton className="h-40" /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !q.data.items.length ? <EmptyState title={c.empty} /> : (
        <div className="overflow-x-auto border border-border bg-white">
          <table className="w-full min-w-[44rem] text-small">
            <thead className="bg-navy-50 text-left"><tr>{(["doc", "cls", "case", "since", "decision"] as const).map((k) => <th key={k} scope="col" className="px-4 py-2 font-medium">{c.cols[k]}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">
              {q.data.items.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-3">{f.label}</td>
                  <td className="px-4 py-3">{c.classes[f.retentionClass] ?? f.retentionClass}</td>
                  <td className="px-4 py-3 font-mono">{f.caseCode ?? ""}</td>
                  <td className="px-4 py-3 tabular">{formatDate(f.anchorAt, locale)}</td>
                  <td className="px-4 py-3">
                    {f.decision ? <Badge tone={f.decision === "shred" ? "danger" : undefined}>{f.decision === "shred" ? c.shredded : c.kept}{f.reason ? ` · ${f.reason}` : ""}</Badge> : (
                      <span className="flex flex-wrap items-center gap-2">
                        <Input aria-label={c.reason} placeholder={c.reason} value={reasons[f.id] ?? ""} onChange={(e) => setReasons((r) => ({ ...r, [f.id]: e.target.value }))} className="h-9 w-44" />
                        <Button size="sm" variant="outline" disabled={!(reasons[f.id] ?? "").trim()} onClick={() => decide.mutate({ id: f.id, decision: "keep" })}>{c.keep}</Button>
                        <Button size="sm" variant="danger" onClick={() => decide.mutate({ id: f.id, decision: "shred" })}>{c.shred}</Button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
