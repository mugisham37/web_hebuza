"use client";
// F-WRK-16: marketing approves or rejects worker opt-ins for /about/team.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { useI18n } from "@/lib/i18n/provider";
import { formatDate } from "@/shared/format";
import { teamProfileCopy } from "@/content/pages/team-profile";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/field";
import { Badge } from "@/components/atoms/tag";
import { useToast } from "@/components/atoms/toast";
import { PageHead, SkeletonRows } from "@/components/atoms/agent";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";

type Row = { id: string; name: string; title: string; bio: string; status: string; at: string };

export function TeamQueue() {
  const { locale } = useI18n();
  const c = teamProfileCopy(locale);
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ["mkt", "team"], queryFn: () => unwrap<{ items: Row[] }>(api.GET("/api/marketing/team-profiles")).then((d) => d.items) });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: (v: { id: string; approve: boolean }) =>
      unwrap(api.POST("/api/marketing/team-profiles/{id}/decision", { params: { path: { id: v.id } }, body: { approve: v.approve, note: notes[v.id]?.trim() || undefined } })),
    onSuccess: () => { toast({ tone: "success", title: c.decided }); void qc.invalidateQueries({ queryKey: ["mkt", "team"] }); },
    onError: (e) => toast({ tone: "danger", title: errorCopy(e, locale) }),
  });
  return (
    <div className="grid gap-5">
      <PageHead title={c.queue} sub={c.body} />
      {q.isPending ? <SkeletonRows n={3} /> : q.isError ? <PanelError what={c.queue} onRetry={() => void q.refetch()} /> : !q.data.length ? <EmptyPanel title={c.empty} /> : (
        <ul className="grid gap-3">
          {q.data.map((r) => (
            <li key={r.id} className="grid gap-2 border border-border bg-surface p-4">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{r.name}</span><span className="text-fg-muted">{r.title}</span>
                <Badge tone={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "warning"}>{c.status[r.status] ?? r.status}</Badge>
                <span className="text-eyebrow text-fg-subtle tabular">{formatDate(r.at, locale)}</span>
              </p>
              <p className="text-small">{r.bio}</p>
              <Input aria-label={c.note} placeholder={c.note} maxLength={500} value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
              <div className="flex gap-2">
                <Button data-guide="marketing-team-approve" size="sm" disabled={r.status === "approved"} loading={m.isPending && m.variables?.id === r.id && m.variables.approve} onClick={() => m.mutate({ id: r.id, approve: true })}>{c.approve}</Button>
                <Button size="sm" variant="outline" disabled={r.status === "rejected"} loading={m.isPending && m.variables?.id === r.id && !m.variables.approve} onClick={() => m.mutate({ id: r.id, approve: false })}>{c.reject}</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
