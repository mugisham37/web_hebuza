"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import type * as C from "@/lib/client/types";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { formatRelative, cx } from "@/shared/format";
import { EmptyState, ErrorState, Skeleton } from "@/components/atoms/feedback";
import { ButtonLink } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { c2Copy, fill } from "@/content/pages/c2";

/** C08 inbox: one row per request conversation; opens the request's Messages tab. */
export function Inbox() {
  const { locale } = useI18n();
  const c = c2Copy(locale).msg;
  const q = useQuery({
    queryKey: ["c2", "inbox"],
    queryFn: () =>
      unwrap<C.ConversationListResponse>(
        api.GET("/api/chat/conversations", {
          params: { query: { kind: "application" } },
        }),
      ),
    refetchInterval: 15_000,
  });
  const convs = q.data?.conversations ?? [];

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-fg-heading text-h3">{c.title}</h1>
        <p className="mt-1 text-body text-fg-muted">{c.sub}</p>
      </header>
      {q.isPending ? (
        <div className="grid gap-2" aria-busy>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 " />
          ))}
        </div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !convs.length ? (
        <EmptyState
          title={c.empty}
          body={c.emptyBody}
          action={
            <ButtonLink size="sm" href={localHref(locale, "/services")}>
              {c2Copy(locale).dash.start}
            </ButtonLink>
          }
        />
      ) : (
        <ul className="overflow-hidden border border-border bg-surface">
          {convs.map((cv) => (
            <li
              key={cv.conversation_id}
              className="border-b border-border last:border-0"
            >
              <Link
                href={localHref(
                  locale,
                  cv.code ? `/requests/${cv.code}?tab=messages` : "/messages",
                )}
                className="flex items-start gap-4 px-4 py-4 hover:bg-navy-50 sm:px-6"
              >
                <span
                  aria-hidden
                  className="grid size-10 shrink-0 place-items-center bg-bg-tint text-sky-700"
                >
                  <Icon name="message" size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span
                      className={cx(
                        "truncate text-label",
                        cv.unread > 0 && "font-semibold",
                      )}
                    >
                      {cv.title ?? cv.code}
                    </span>
                    {cv.last_message_at && (
                      <time
                        className="text-small text-fg-subtle"
                        dateTime={cv.last_message_at}
                      >
                        {formatRelative(cv.last_message_at, locale)}
                      </time>
                    )}
                  </span>
                  <span className="block text-small text-fg-subtle tabular">
                    {cv.code}
                  </span>
                  {cv.last_message_preview && (
                    <span className="mt-1 line-clamp-1 block text-body text-fg-muted">
                      {cv.last_message_preview}
                    </span>
                  )}
                </span>
                {cv.unread > 0 && (
                  <span className="bg-secondary px-2 py-0.5 text-small text-on-secondary tabular">
                    {fill(c.unread, { n: cv.unread })}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
