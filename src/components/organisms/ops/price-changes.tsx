"use client";
// F-CAT-10: pricing saves become pending changes; a finance user other than the proposer approves or rejects here
// (also linked from /finance/approvals). Approved changes apply at their effective date.
import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/tag";
import { Input } from "@/components/atoms/field";
import { Skeleton, ErrorState } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { useSession } from "@/lib/auth/session";
import { useDecidePrice, usePriceChanges } from "@/lib/ops/e";
import type { CatalogueCopy } from "@/content/pages/ops-catalogue";

export function PriceChanges({ slug, c }: { slug: string; c: CatalogueCopy["prices"] }) {
  const q = usePriceChanges(slug);
  const decide = useDecidePrice(slug);
  const toast = useToast();
  const { user } = useSession();
  const [reason, setReason] = useState<Record<string, string>>({});
  const finance = !!user?.roles.includes("staff:finance");
  if (q.isPending) return <Skeleton className="h-20" />;
  if (q.error) return <ErrorState onRetry={() => q.refetch()} />;
  const open = q.data.items.filter((x) => x.status === "pending" || x.status === "approved");
  const act = (id: string, approve: boolean) =>
    decide.mutate({ id, approve, reason: reason[id] }, {
      onSuccess: () => { toast({ tone: "success", title: c.done }); void q.refetch(); },
      onError: () => toast({ tone: "danger", title: c.failed }),
    });
  return (
    <section aria-labelledby="pc-h" className="grid gap-3 border border-border p-4">
      <h3 id="pc-h" className="text-card-title">{c.title}</h3>
      {!open.length ? <p className="text-small text-fg-muted">{c.empty}</p> : open.map((x) => (
        <div key={x.id} className="grid gap-2 border-t border-border pt-3 first:border-0 first:pt-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={x.status === "pending" ? "warning" : "success"}>{x.status === "pending" ? c.pending : c.approved.replace("{at}", x.effective_at.slice(0, 10))}</Badge>
            <span className="text-small text-fg-muted">{x.kind === "tier" ? x.tier : "pricing"} · {c.by.replace("{by}", x.proposed_by_name ?? x.proposed_by)}</span>
          </div>
          <pre className="overflow-x-auto bg-bg-subtle p-2 text-small">{JSON.stringify(x.body, null, 1)}</pre>
          {x.status === "pending" && finance && (user?.id === x.proposed_by ? <p className="text-small text-fg-muted">{c.own}</p> : (
            <div className="flex flex-wrap items-center gap-2">
              <Input aria-label={c.reason} placeholder={c.reason} value={reason[x.id] ?? ""} onChange={(e) => setReason((r) => ({ ...r, [x.id]: e.target.value }))} className="max-w-xs" />
              <Button type="button" size="sm" disabled={decide.isPending} onClick={() => act(x.id, true)}>{c.approve}</Button>
              <Button type="button" size="sm" variant="secondary" disabled={decide.isPending || !reason[x.id]?.trim()} onClick={() => act(x.id, false)}>{c.reject}</Button>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
