"use client";
// F-WRK-16: worker opt-in to the public team page (marketing approves before it is shown).
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { useI18n } from "@/lib/i18n/provider";
import { teamProfileCopy } from "@/content/pages/team-profile";
import { Button } from "@/components/atoms/button";
import { Checkbox, Field, Input, Textarea } from "@/components/atoms/field";
import { Badge } from "@/components/atoms/tag";
import { useToast } from "@/components/atoms/toast";
import { Skeleton } from "@/components/atoms/feedback";
import { PanelError } from "@/components/molecules/ops/ops";

type Mine = { optIn: boolean; title: string; bio: string; status: string | null; note: string | null };

export function TeamProfileCard({ className }: { className?: string }) {
  const { locale } = useI18n();
  const c = teamProfileCopy(locale);
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ["me", "team-profile"], queryFn: () => unwrap<Mine>(api.GET("/api/me/team-profile")) });
  const [f, setF] = useState({ optIn: false, title: "", bio: "" });
  const [seen, setSeen] = useState<Mine | undefined>();
  if (q.data && q.data !== seen) { setSeen(q.data); setF({ optIn: q.data.optIn, title: q.data.title, bio: q.data.bio }); }
  const m = useMutation({
    mutationFn: () => unwrap<Mine>(api.PUT("/api/me/team-profile", { body: { optIn: f.optIn, title: f.title.trim(), bio: f.bio.trim() } })),
    onSuccess: (d) => { qc.setQueryData(["me", "team-profile"], d); toast({ tone: "success", title: c.saved }); },
    onError: (e) => toast({ tone: "danger", title: errorCopy(e, locale) }),
  });
  return (
    <section className={className}>
      <h3 className="mb-2 text-label-lg">{c.title}</h3>
      <p className="mb-4 text-small text-fg-muted">{c.body}</p>
      {q.isPending ? <Skeleton className="h-20 w-full" /> : q.isError ? <PanelError what={c.title} onRetry={() => void q.refetch()} /> : (
        <div className="grid gap-3">
          {q.data.status && q.data.optIn && (
            <p className="flex flex-wrap items-center gap-2 text-small">
              <Badge tone={q.data.status === "approved" ? "success" : q.data.status === "rejected" ? "danger" : "warning"}>{c.status[q.data.status]}</Badge>
              {q.data.note && <span className="text-fg-muted">{q.data.note}</span>}
            </p>
          )}
          <Checkbox label={c.optIn} checked={f.optIn} onChange={(e) => setF({ ...f, optIn: e.target.checked })} />
          {f.optIn && (
            <>
              <Field label={c.jobTitle}>{(a) => <Input id={a.id} aria-describedby={a.describedBy} maxLength={80} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}</Field>
              <Field label={c.bio}>{(a) => <Textarea id={a.id} aria-describedby={a.describedBy} rows={3} maxLength={600} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />}</Field>
            </>
          )}
          <Button size="sm" className="justify-self-start" disabled={f.optIn && (!f.title.trim() || !f.bio.trim())} loading={m.isPending} onClick={() => m.mutate()}>{c.save}</Button>
        </div>
      )}
    </section>
  );
}
