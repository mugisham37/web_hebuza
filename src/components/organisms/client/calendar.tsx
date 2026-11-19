"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { components } from "@/lib/api/schema";
import { api, unwrap } from "@/lib/api/client";
import { localHref } from "@/shared/i18n/config";
import { formatDate } from "@/shared/format";
import { Button, ButtonLink } from "@/components/atoms/button";
import { EmptyState, ErrorState } from "@/components/atoms/feedback";
import { Badge } from "@/components/atoms/tag";
import { ListSkeleton, PageHead, useC4 } from "@/components/molecules/client/client";
import { calendarCopy } from "@/content/pages/client-calendar";

type Res = components["schemas"]["ClientCalendarResponse"];
const TONE = { upcoming: "info", in_progress: "warning", done: "success", missed: "danger", waived: "neutral" } as const;

/** F-CAL-04 client compliance calendar: deadlines list, private ICS subscription link, "ask HEBUZA". */
export function ClientCalendar() {
  const { locale } = useC4();
  const k = calendarCopy(locale);
  const [copied, setCopied] = useState(false);
  const q = useQuery({ queryKey: ["c4", "obligations"], queryFn: () => unwrap<Res>(api.GET("/api/me/obligations")) });
  const label = (l: Record<string, string>) => l[locale] ?? l.en ?? Object.values(l)[0] ?? "";
  return (
    <>
      <PageHead title={k.title} lede={k.lede} />
      {q.isPending ? (
        <ListSkeleton rows={4} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <div className="grid gap-8">
          {q.data.items.length === 0 ? (
            <EmptyState title={k.empty} body={k.emptyBody} />
          ) : (
            <ul className="grid gap-2">
              {q.data.items.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 border border-border p-4">
                  <div className="min-w-0">
                    <p className="text-body font-medium break-words">{label(o.label)}</p>
                    <p className="text-small text-fg-subtle">
                      {k.due} <time dateTime={o.due_date}>{formatDate(o.due_date, locale)}</time>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={TONE[o.status as keyof typeof TONE] ?? "neutral"}>{k.status[o.status] ?? o.status}</Badge>
                    <ButtonLink size="sm" variant="outline" href={localHref(locale, `/messages?topic=${encodeURIComponent(label(o.label))}`)}>
                      {k.ask}
                    </ButtonLink>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <section aria-labelledby="ics-h" className="grid gap-2">
            <h2 id="ics-h" className="text-h4">{k.subscribe}</h2>
            <p className="text-small text-fg-subtle">{k.subscribeHint}</p>
            <div className="flex flex-wrap items-center gap-2">
              <input readOnly aria-label={k.subscribe} value={q.data.ics_url} className="min-w-0 flex-1 border border-border bg-bg px-3 py-2 text-small" onFocus={(e) => e.currentTarget.select()} />
              <Button size="sm" onClick={() => void navigator.clipboard.writeText(q.data.ics_url).then(() => setCopied(true))}>{copied ? k.copied : k.copy}</Button>
            </div>
            <p aria-live="polite" className="sr-only">{copied ? k.copied : ""}</p>
          </section>
        </div>
      )}
    </>
  );
}
