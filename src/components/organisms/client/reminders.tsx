"use client";
// CLP-12: reminders hub (documents asked for, payments, quotes, expiring documents) with snooze / done.
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { formatDate } from "@/shared/format";
import { remindersCopy } from "@/content/pages/client-reminders";
import { fill } from "@/content/pages/c4";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/tag";
import { EmptyState, ErrorState, Skeleton } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";

type Item = { id: string; kind: "document" | "payment" | "quote" | "expiry"; ref: string; title: string; due: string | null; state: "open" | "snoozed" | "done" };
const href = (i: Item) => (i.kind === "expiry" ? "/documents" : i.kind === "payment" ? `/pay/${i.ref}` : `/requests/${i.ref}`);

export function Reminders() {
  const { locale } = useI18n();
  const c = remindersCopy(locale);
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<Item["state"]>("open");
  const q = useQuery({ queryKey: ["c2", "reminders"], queryFn: () => unwrap<{ items: Item[] }>(api.GET("/api/me/reminders")) });
  const set = useMutation({
    mutationFn: ({ id, state }: { id: string; state: Item["state"] }) =>
      unwrap(api.PUT("/api/me/reminders/{id}", { params: { path: { id } }, body: { state, ...(state === "snoozed" && { days: 3 }) } })),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["c2", "reminders"] }),
    onError: () => toast({ title: c.failed, tone: "danger" }),
  });
  const items = q.data?.items.filter((i) => i.state === tab) ?? [];
  return (
    <div className="grid gap-5">
      <div><h1 className="text-h2">{c.title}</h1><p className="text-body text-fg-muted">{c.lede}</p></div>
      <div data-guide="client-reminders-tabs" role="tablist" aria-label={c.title} className="flex flex-wrap gap-1">
        {(["open", "snoozed", "done"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={tab === t ? "h-9 bg-secondary px-3 text-small text-on-secondary" : "h-9 border border-border bg-white px-3 text-small hover:bg-navy-50"}>
            {c.tabs[t]} ({q.data?.items.filter((i) => i.state === t).length ?? 0})
          </button>
        ))}
      </div>
      {q.isPending ? <Skeleton className="h-40" /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !items.length ? <EmptyState title={c.empty} /> : (
        <ul className="divide-y divide-border border border-border bg-white">
          {items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1 basis-56">
                <Badge>{c.kinds[i.kind]}</Badge>{" "}
                <Link href={localHref(locale, href(i))} className="underline-offset-4 hover:underline">{i.title}</Link>
                {i.due && <span className="block text-small text-fg-subtle">{fill(c.due, { date: formatDate(i.due, locale) })}</span>}
              </span>
              {i.state === "open" ? (
                <span className="flex gap-2">
                  <Button data-guide="client-reminders-snooze" size="sm" variant="ghost" onClick={() => set.mutate({ id: i.id, state: "snoozed" })}>{c.snooze}</Button>
                  <Button data-guide="client-reminders-done" size="sm" variant="outline" onClick={() => set.mutate({ id: i.id, state: "done" })}>{c.done}</Button>
                </span>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => set.mutate({ id: i.id, state: "open" })}>{c.reopen}</Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
