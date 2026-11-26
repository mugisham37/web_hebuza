"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api, unwrap } from "@/lib/api/client";
import { qk } from "@/lib/query/client";
import { localHref } from "@/shared/i18n/config";
import { cx, formatDateTime, formatRelative } from "@/shared/format";
import { Button, ButtonLink } from "@/components/atoms/button";
import { EmptyState, ErrorState } from "@/components/atoms/feedback";
import { Segmented } from "@/components/atoms/inputs";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Badge } from "@/components/atoms/tag";
import { fill } from "@/content/pages/c4";
import { notifCopy } from "@/content/pages/notification-types";
import { ListSkeleton, PageHead, useC4 } from "@/components/molecules/client/client";

type List = components["schemas"]["NotificationListResponse"];
type N = List["notifications"][number];
const ICON: Record<string, IconName> = {
  payment: "wallet",
  document: "fileCheck",
  message: "message",
  request: "file",
  action: "upload",
  booking: "calendar",
};

/** C12 Notification centre (F-NTF): all/unread, mark one or all read, link to channel settings. */
export function NotificationsView() {
  const { c, locale } = useC4();
  const n = c.notif;
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const q = useQuery({
    queryKey: qk.notifications,
    queryFn: () => unwrap<List>(api.GET("/api/notifications")),
  });
  const mark = useMutation({
    mutationFn: (ids?: string[]) =>
      unwrap(
        api.POST("/api/notifications/read", { body: { ids: ids ?? null } }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  });

  const items = (q.data?.notifications ?? []).filter(
    (x) => tab === "all" || !x.read_at,
  );
  const unread = q.data?.unread_count ?? 0;
  const today = new Date().toDateString();
  const groups = [
    {
      label: n.today,
      items: items.filter(
        (x) => new Date(x.created_at).toDateString() === today,
      ),
    },
    {
      label: n.earlier,
      items: items.filter(
        (x) => new Date(x.created_at).toDateString() !== today,
      ),
    },
  ].filter((g) => g.items.length);

  return (
    <>
      <PageHead
        title={n.title}
        lede={n.lede}
        action={
          <div className="flex flex-wrap gap-2">
            <ButtonLink
              href={localHref(locale, "/settings/notifications")}
              variant="outline"
              size="sm"
            >
              {n.prefs}
            </ButtonLink>
            <Button
              data-guide="client-notif-markall"
              size="sm"
              onClick={() => mark.mutate(undefined)}
              disabled={!unread}
              loading={mark.isPending && !mark.variables}
            >
              {n.markAll}
            </Button>
          </div>
        }
      />
      <Segmented
        label={n.title}
        value={tab}
        onChange={setTab}
        options={[
          { value: "all", label: n.all },
          { value: "unread", label: `${n.unread} (${unread})` },
        ]}
        className="mb-6"
      />
      {q.isPending ? (
        <ListSkeleton rows={4} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !groups.length ? (
        <EmptyState title={n.caughtUp} body={n.caughtUpBody} />
      ) : (
        groups.map((g) => (
          <section key={g.label} className="mb-8">
            <h2 className="mb-3 text-label text-fg-subtle">{g.label}</h2>
            <ul className="grid gap-3">
              {g.items.map((x) => (
                item(x)
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );

  function item(raw: N) {
    // Typed booking/AI notes (plan 11 §8.3) render in the reader's language; others keep the server text.
    const copy = notifCopy(locale, raw.type, raw.vars);
    const x = copy ? { ...raw, title: copy.title, body: copy.body } : raw;
    const onRead = () => mark.mutate([x.id]);
    const isNew = !x.read_at;
    return (
      <li
        key={x.id}
        className={cx(
          "flex flex-wrap items-start gap-4 p-4 sm:p-5",
          isNew ? "bg-surface shadow-sm" : "bg-bg-subtle",
        )}
      >
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center bg-bg-tint text-sky-700"
        >
          <Icon name={ICON[x.kind] ?? "sparkle"} />
        </span>
        <div className="min-w-0 flex-1 basis-48">
          <p className="flex flex-wrap items-center gap-2 text-label">
            {x.title}
            {isNew && <Badge tone="accent">{n.newBadge}</Badge>}
          </p>
          {x.body && <p className="mt-1 text-body text-fg-muted">{x.body}</p>}
          <Preview x={x} />
          <time
            dateTime={x.created_at}
            title={formatDateTime(x.created_at, locale)}
            className="mt-1 block text-small text-fg-subtle"
          >
            {formatRelative(x.created_at, locale)}
          </time>
        </div>
        <div data-guide="client-notif-actions" className="flex gap-2">
          {x.href && (
            <Link
              href={localHref(locale, x.href)}
              onClick={isNew ? onRead : undefined}
              className="inline-flex h-9 items-center bg-secondary px-4 text-small font-medium text-on-secondary hover:bg-secondary-hover"
            >
              {n.open}
            </Link>
          )}
          {isNew && (
            <Button size="sm" variant="ghost" onClick={onRead}>
              {n.markRead}
            </Button>
          )}
        </div>
      </li>
    );
  }
}

type Channel = "sms" | "whatsapp" | "email";
/** How the notification looked on its delivery channel. `channel` is a proposed field (not in schema.d.ts yet). */
function Preview({ x }: { x: N & { channel?: string } }) {
  const { c } = useC4();
  const n = c.notif;
  const ch = x.channel as Channel | undefined;
  if (!ch || !(ch in n.channels)) return null;
  const text = [x.title, x.body].filter(Boolean).join(". ");
  return (
    <details className="group mt-2">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-small font-medium text-link [&::-webkit-details-marker]:hidden">
        {n.preview} · {fill(n.sentVia, { ch: n.channels[ch] })}
        <Icon name="chevronDown" size={16} aria-hidden className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 max-w-sm">
        {ch === "email" ? (
          <div className="border border-border bg-surface text-small">
            <p className="border-b border-border px-4 py-2 text-fg-subtle">{n.emailFrom}</p>
            <p className="px-4 pt-3 text-label">{x.title}</p>
            {x.body && <p className="px-4 pt-1 pb-3 text-fg-muted">{x.body}</p>}
          </div>
        ) : (
          <div className="bg-bg-subtle p-3">
            <p className="mb-1 text-small text-fg-subtle">HEBUZA</p>
            <p
              className={cx(
                "w-fit px-3 py-2 text-small",
                ch === "whatsapp" ? "bg-success-bg" : "bg-surface",
              )}
            >
              {text}
            </p>
          </div>
        )}
      </div>
    </details>
  );
}
