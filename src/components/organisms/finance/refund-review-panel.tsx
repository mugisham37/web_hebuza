"use client";
// Ops touch point (plan §13.2): the service manager's refund review on /ops/cases/[ref]?panel=refund.
// SM recommends an amount (+ note) or rejects; finance sees it as the first chain step. Finance-only links hidden for SM.
// Mounted by the integrator: <RefundReviewPanel caseRef={ref} />.
import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { formatMoney, formatRelative } from "@/shared/format";
import { localHref } from "@/shared/i18n/config";
import { newIdempotencyKey } from "@/lib/api/client";
import { useSession } from "@/lib/auth/session";
import { useRefunds, useRefundReview, type RefundRow } from "@/lib/finance/d";
import { Amount, DocNumber, FinStatus } from "@/components/atoms/finance";
import { Panel, PanelError } from "@/components/molecules/ops/ops";
import { useOnline } from "@/components/atoms/hooks";
import { Button } from "@/components/atoms/button";
import { Field, Input, Textarea } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { Reason, errorCopy, fill, useRF } from "@/components/molecules/finance/refunds";
import { errType } from "@/components/atoms/hooks";

export function RefundReviewPanel({ caseRef }: { caseRef: string }) {
  const c = useRF();
  const q = useRefunds({ caseRef });
  return (
    <Panel title={c.panel.title}>
      {q.isPending ? <div className="h-24 m-shimmer" /> : q.isError ? <PanelError what={c.panel.what} onRetry={() => q.refetch()} /> : !q.data.items.length ? (
        <p className="text-small text-fg-muted">{c.panel.none}</p>
      ) : (
        <ul className="grid gap-3 m-stagger">{q.data.items.map((r, i) => <li key={r.no} style={{ ["--i" as string]: i }}><Item r={r} /></li>)}</ul>
      )}
    </Panel>
  );
}

function Item({ r }: { r: RefundRow }) {
  const c = useRF();
  const { locale } = useI18n();
  const { user } = useSession();
  const toast = useToast();
  const online = useOnline();
  const m = useRefundReview();
  const [key, setKey] = useState(newIdempotencyKey);
  const [amount, setAmount] = useState(String(r.requested));
  const [note, setNote] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const roles = user ? user.roles : [];
  const isSm = roles.includes("staff:service_manager");
  const finance = roles.some((x) => x.startsWith("staff:finance"));
  const open = isSm && (r.status === "requested" || r.status === "under_review");

  async function decide(decision: "recommend" | "reject") {
    if (!note.trim()) return setErr({ note: c.panel.needNote });
    setErr({});
    try {
      await m.mutateAsync({ no: r.no, rev: r.rev, idempotencyKey: key, decision, amount: Number(amount.replace(/[^\d]/g, "")), note });
      setKey(newIdempotencyKey());
      toast({ title: decision === "recommend" ? c.panel.sent : c.panel.rejected, tone: "success" });
    } catch (e) {
      const t = errType(e);
      setErr(t === "exceeds_refundable" ? { amount: c.adjustDlg.tooMuch } : { form: errorCopy(e, locale) });
    }
  }

  return (
    <article className="grid gap-3 border border-border p-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">{finance ? <DocNumber no={r.no} href={localHref(locale, `/finance/refunds/${r.no}`)} /> : <DocNumber no={r.no} />}<FinStatus status={r.status} kind="refund" /></span>
        <span className="text-eyebrow text-fg-subtle">{formatRelative(r.at, locale)}</span>
      </header>
      <dl className="grid grid-cols-2 gap-2 text-small">
        <div><dt className="text-eyebrow text-fg-subtle">{c.cols.reason}</dt><dd>{c.reasons[r.reason] ?? r.reason}</dd></div>
        <div><dt className="text-eyebrow text-fg-subtle">{c.request.requested}</dt><dd><Amount value={r.requested} className="font-semibold" /></dd></div>
        {r.note && <div className="col-span-2"><dt className="text-eyebrow text-fg-subtle">{c.request.note}</dt><dd>{r.note}</dd></div>}
        {r.recommended != null && <div className="col-span-2"><dt className="text-eyebrow text-fg-subtle">{c.sm.title}</dt><dd><Amount value={r.recommended} /></dd></div>}
      </dl>
      {open && (
        <form className="grid gap-3 bg-bg-subtle p-3" onSubmit={(e) => { e.preventDefault(); decide("recommend"); }}>
          {err.form && <p role="alert" className="text-small text-danger">{err.form}</p>}
          <Field label={c.panel.amount} error={err.amount}>{(a) => <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular" />}</Field>
          <Field label={c.panel.note} hint={c.panel.noteHint} error={err.note}>{(a) => <Textarea id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" loading={m.isPending} disabled={!online} className="m-press">{fill(c.panel.recommend, { amount: formatMoney(Number(amount.replace(/[^\d]/g, "")) || 0, "RWF", locale) })}</Button>
            <Button type="button" size="sm" variant="outline" disabled={!online || m.isPending} onClick={() => decide("reject")} className="m-press">{c.panel.reject}</Button>
          </div>
          {!online && <Reason>{c.offline}</Reason>}
        </form>
      )}
      {finance && <Link href={localHref(locale, `/finance/refunds/${r.no}`)} className="w-fit text-small underline underline-offset-4">{c.panel.open}</Link>}
    </article>
  );
}
