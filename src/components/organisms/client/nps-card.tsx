"use client";
// F-FBK-02: NPS 0–10 prompt, shown only while the server says a survey is due; "Not now" hides it for this visit.
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/provider";
import { cx } from "@/shared/format";
import { npsCopy } from "@/content/pages/client-nps";
import { Button } from "@/components/atoms/button";
import { Field, Textarea } from "@/components/atoms/field";

export function NpsCard() {
  const { locale } = useI18n();
  const c = npsCopy(locale);
  const q = useQuery({ queryKey: ["c", "nps"], queryFn: () => unwrap<{ due: boolean }>(api.GET("/api/me/nps")) });
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [hidden, setHidden] = useState(false);
  const send = useMutation({
    mutationFn: () => unwrap(api.POST("/api/me/nps", { body: { score: score!, comment: comment.trim() || undefined } })),
  });
  if (hidden || !q.data?.due) return null;
  if (send.isSuccess) return <p role="status" className="border border-border bg-surface p-4 text-small">{c.thanks}</p>;
  return (
    <section aria-labelledby="nps-q" className="grid gap-3 border border-border bg-surface p-4">
      <h2 id="nps-q" className="text-card-title">{c.q}</h2>
      <div role="radiogroup" aria-labelledby="nps-q" className="flex flex-wrap gap-1">
        {Array.from({ length: 11 }, (_, n) => (
          <button key={n} type="button" role="radio" aria-checked={score === n} onClick={() => setScore(n)}
            className={cx("h-10 w-10 border text-small tabular", score === n ? "border-secondary bg-navy-50 font-medium" : "border-border")}>
            {n}
          </button>
        ))}
      </div>
      <p className="flex justify-between text-eyebrow text-fg-subtle"><span>{c.low}</span><span>{c.high}</span></p>
      {score !== null && (
        <Field label={c.comment}>{(a) => <Textarea id={a.id} aria-describedby={a.describedBy} rows={2} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />}</Field>
      )}
      {send.isError && <p role="alert" className="text-small text-danger">{c.error}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={score === null} loading={send.isPending} onClick={() => send.mutate()}>{c.send}</Button>
        <Button size="sm" variant="ghost" onClick={() => setHidden(true)}>{c.later}</Button>
      </div>
    </section>
  );
}
