"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { localHref } from "@/shared/i18n/config";
import { cx, formatDate, formatDateTime } from "@/shared/format";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Field, Textarea } from "@/components/atoms/field";
import { EmptyState, ErrorState } from "@/components/atoms/feedback";
import { Badge } from "@/components/atoms/tag";
import { Icon } from "@/components/atoms/icon";
import { api, ApiError, unwrap } from "@/lib/api/client";
import { fill } from "@/content/pages/c4";
import {
  ListSkeleton,
  PageHead,
  Panel,
  useC4,
} from "@/components/molecules/client/client";

type Status = "open" | "waiting" | "resolved";
type Ticket = {
  ref: string;
  subject: string;
  status: Status;
  createdAt: string;
  messages: { id: string; from: "me" | "support"; body: string; at: string }[];
  rating: { score: number; comment: string } | null;
};
const TONE = { open: "info", waiting: "warning", resolved: "success" } as const;

/** C14 ticket detail: thread, reply box, status, and a 1–5 rating once resolved. */
export function TicketView() {
  const { c, locale } = useC4();
  const h = c.help;
  const d = h.detail;
  const { id } = useParams<{ id: string }>();
  const key = ["c4", "ticket", id];
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: key,
    queryFn: () =>
      unwrap<Ticket>(api.GET("/api/support/tickets/{ref}", { params: { path: { ref: id } } })),
  });
  const onSaved = (t: Ticket) => {
    qc.setQueryData(key, t);
    qc.invalidateQueries({ queryKey: ["c4", "tickets"] });
  };
  const back = (
    <ButtonLink href={localHref(locale, "/help")} variant="outline" size="sm">
      {d.back}
    </ButtonLink>
  );

  if (q.isPending) return <ListSkeleton rows={4} />;
  if (q.isError)
    return q.error instanceof ApiError && q.error.status === 404 ? (
      <EmptyState title={d.notFound} body="" action={back} />
    ) : (
      <ErrorState error={q.error} onRetry={() => q.refetch()} />
    );
  const t = q.data;

  return (
    <>
      <PageHead
        title={t.subject}
        lede={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-small">{t.ref}</span>
            <Badge tone={TONE[t.status]}>{h.ticketStatus[t.status]}</Badge>
            <span className="text-small">
              {fill(d.opened, { d: formatDate(t.createdAt, locale) })}
            </span>
          </span>
        }
        action={back}
      />
      <div className="grid max-w-3xl gap-6">
        <ol className="grid gap-4" aria-label={h.tickets}>
          {t.messages.map((m) => {
            const me = m.from === "me";
            return (
              <li
                key={m.id}
                className={cx(
                  "max-w-[85%] p-4",
                  me
                    ? "justify-self-end bg-navy-700 text-white"
                    : "justify-self-start bg-surface shadow-sm",
                )}
              >
                <p className="text-small font-medium">
                  {me ? d.you : d.support}
                </p>
                <p className="mt-1 text-body whitespace-pre-wrap">{m.body}</p>
                <time
                  dateTime={m.at}
                  className={cx("mt-2 block text-small", me ? "text-navy-100" : "text-fg-subtle")}
                >
                  {formatDateTime(m.at, locale)}
                </time>
              </li>
            );
          })}
        </ol>
        {t.status === "resolved" ? (
          <>
            <p className="bg-bg-tint px-4 py-3 text-body">
              {d.closedNote}
            </p>
            <Rating t={t} onSaved={onSaved} />
          </>
        ) : (
          <Reply t={t} onSaved={onSaved} />
        )}
      </div>
    </>
  );
}

function Reply({ t, onSaved }: { t: Ticket; onSaved: (t: Ticket) => void }) {
  const { c } = useC4();
  const d = c.help.detail;
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const send = useMutation({
    mutationFn: (body: string) =>
      unwrap<Ticket>(api.POST("/api/support/tickets/{ref}/messages", { params: { path: { ref: t.ref } }, body: { body } })),
    onSuccess: (x) => {
      setText("");
      onSaved(x);
    },
  });
  return (
    <form
      noValidate
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const v = text.trim();
        setErr(v ? "" : c.required);
        if (v) send.mutate(v);
      }}
    >
      <Field id="tk-reply" label={d.reply} error={err}>
        {({ id, describedBy, invalid }) => (
          <Textarea id={id}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
          />
        )}
      </Field>
      {send.isError && (
        <p role="alert" className="text-small font-medium text-danger">
          {c.generic}
        </p>
      )}
      <div>
        <Button type="submit" dots loading={send.isPending}>
          {d.send}
        </Button>
      </div>
    </form>
  );
}

function Rating({ t, onSaved }: { t: Ticket; onSaved: (t: Ticket) => void }) {
  const { c } = useC4();
  const d = c.help.detail;
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState("");
  const rate = useMutation({
    mutationFn: () =>
      unwrap<Ticket>(api.POST("/api/support/tickets/{ref}/rating", { params: { path: { ref: t.ref } },
        body: { score, comment: comment.trim() },
      })),
    onSuccess: onSaved,
  });
  const stars = (n: number) => (
    <span aria-hidden className="flex gap-1 text-gold-600">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cx("text-2xl", i > n && "opacity-25")}>
          ★
        </span>
      ))}
    </span>
  );

  if (t.rating)
    return (
      <Panel icon="check" title={d.thanks}>
        <p className="sr-only">{fill(d.star, { n: t.rating.score })}</p>
        {stars(t.rating.score)}
        {t.rating.comment && (
          <p className="mt-2 text-body text-fg-muted">{t.rating.comment}</p>
        )}
      </Panel>
    );
  return (
    <Panel icon="sparkle" title={d.rateTitle} body={d.rateLede}>
      <form
        noValidate
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setErr(score ? "" : d.pickStars);
          if (score) rate.mutate();
        }}
      >
        <fieldset aria-describedby={err ? "rate-err" : undefined}>
          <legend className="sr-only">{d.rateTitle}</legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <label
                key={n}
                className="cursor-pointer p-1 text-3xl text-gold-600 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus"
              >
                <input
                  type="radio"
                  name="score"
                  value={n}
                  checked={score === n}
                  onChange={() => setScore(n)}
                  className="sr-only"
                  aria-label={fill(d.star, { n })}
                />
                <span aria-hidden className={cx(n > score && "opacity-25")}>
                  ★
                </span>
              </label>
            ))}
          </div>
          {err && (
            <p
              id="rate-err"
              role="alert"
              className="mt-1 text-small font-medium text-danger"
            >
              {err}
            </p>
          )}
        </fieldset>
        <Field label={d.comment}>
          {({ id }) => (
            <Textarea
              id={id}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          )}
        </Field>
        {rate.isError && (
          <p role="alert" className="text-small font-medium text-danger">
            {c.generic}
          </p>
        )}
        <div>
          <Button type="submit" dots loading={rate.isPending}>
            <Icon name="check" aria-hidden />
            {d.submitRating}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
