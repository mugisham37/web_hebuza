"use client";
// U9 outbox (plan §7.9, board 06 SY1/SY2/SY4): ordered queue, needs-attention group, sent today, item detail sheet (?item=),
// conflict review (U10) inside the same sheet. Signed receipts are never discardable.
import Link from "next/link";
import { useState } from "react";
import { cx, formatDateTime, formatRelative } from "@/shared/format";
import { Button } from "@/components/atoms/button";
import { Dialog, Sheet } from "@/components/atoms/dialog";
import { Icon, type IconName } from "@/components/atoms/icon";
import { useFieldCopy, fill } from "@/lib/field/copy";
import { useCopyD } from "@/lib/field/copy-d";
import { useEngine, syncNow, retry, discard } from "@/lib/field/sync";
import { useOnline } from "@/lib/field/net";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import type { Op, OpKind } from "@/shared/field/types";
import { FieldHeader, LocalRef, NeedsConnection, kb, useFieldBase, useNow } from "@/components/atoms/field-agent";
import { ArtTray, FieldEmpty } from "@/components/atoms/field-art";
import { StorageCard } from "@/components/molecules/field/field";
import { ConflictReview } from "@/components/organisms/field/conflict-review";

const KIND_ICON: Record<OpKind, IconName> = {
  "visit.accept": "check", "visit.checkin": "mapPin", "visit.checklist": "fileCheck", "visit.note": "message", "scan.upload": "file",
  "receipt.create": "shield", "custody.handover": "lock", "incident.create": "zap", "visit.checkout": "arrowUpRight", "expense.create": "wallet",
  "cash.record": "card", "cash.deposit": "building",
};
const ATTN = new Set(["conflict", "rejected", "blocked"]);

export function OutboxView() {
  const d = useCopyD();
  const { c } = useFieldCopy();
  const eng = useEngine();
  const online = useOnline();
  const now = useNow();
  const itemId = useUrlParams().get("item");
  const [sentOpen, setSentOpen] = useState(false);

  const live = eng.ops.filter((o) => o.state !== "sent");
  const attention = live.filter((o) => ATTN.has(o.state));
  const waiting = live.filter((o) => !ATTN.has(o.state));
  const dayAgo = now - 86_400_000;
  const sent = eng.ops.filter((o) => o.state === "sent" && (o.sentAt ?? o.createdAt) >= dayAgo).reverse();
  const item = eng.ops.find((o) => o.opId === itemId) ?? null;
  const total = live.reduce((s, o) => s + o.bytes, 0);
  const pct = eng.syncing?.total ? Math.round((eng.syncing.done / eng.syncing.total) * 100) : 0;

  return (
    <div className="grid gap-4">
      <FieldHeader title={d.outboxTitle} sub={<>{online ? d.sentenceOnline : d.sentence}{live.length > 0 && <span className="block tabular">{fill(d.total, { n: live.length, size: kb(total) })}</span>}</>}
        action={<NeedsConnection online={online}><Button onClick={() => void syncNow()} disabled={!online || !!eng.syncing || !live.length} loading={!!eng.syncing}><Icon name="refresh" size={16} aria-hidden />{d.syncNow}</Button></NeedsConnection>} />

      {eng.syncing && (
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={fill(c.syncing, { done: eng.syncing.done, total: eng.syncing.total })} className="h-2 overflow-hidden bg-ink-100">
          <span className="block h-full bg-navy-700 transition-[width] duration-(--dur-3)" style={{ width: `${Math.max(4, pct)}%` }} />
        </div>
      )}

      {!live.length && !sent.length ? (
        <FieldEmpty art={<ArtTray />} title={d.emptyTitle} body={d.emptyBody} />
      ) : (
        <>
          {attention.length > 0 && <Group title={d.attention} tone="attn" ops={attention} all={eng.ops} />}
          {waiting.length > 0 && <Group title={d.waiting} ops={waiting} all={eng.ops} numbered />}
          {!live.length && <FieldEmpty art={<ArtTray />} title={d.emptyTitle} body={d.emptyBody} />}
          {sent.length > 0 && (
            <section className="grid gap-2">
              <button type="button" aria-expanded={sentOpen} onClick={() => setSentOpen((o) => !o)} className="flex min-h-11 items-center gap-2 text-label">
                <Icon name="chevronDown" size={18} aria-hidden className={cx("transition-transform", sentOpen && "rotate-180")} />{d.sentToday}<span className="bg-ink-100 px-2 text-eyebrow tabular">{sent.length}</span>
              </button>
              <div className="m-collapse" data-closed={sentOpen ? undefined : ""}>
                <div><ol className="grid gap-2">{sent.map((o) => <Row key={o.opId} op={o} all={eng.ops} />)}</ol></div>
              </div>
            </section>
          )}
        </>
      )}
      <StorageCard />

      <Sheet open={!!item} onClose={() => setUrlParams({ item: null })} side="bottom" title={item ? (item.state === "conflict" ? d.conflictTitle : d.kinds[item.kind]) : ""}>
        {item && (item.state === "conflict" && eng.conflicts[item.opId]
          ? <ConflictReview opId={item.opId} payload={eng.conflicts[item.opId]} onDone={() => setUrlParams({ item: null })} />
          : <Detail op={item} all={eng.ops} />)}
      </Sheet>
    </div>
  );
}

function Group({ title, ops, all, numbered, tone }: { title: string; ops: Op[]; all: Op[]; numbered?: boolean; tone?: "attn" }) {
  return (
    <section className="grid gap-2">
      <h2 className={cx("text-label", tone === "attn" && "text-warning")}>{title} <span className="tabular">({ops.length})</span></h2>
      <ol className="m-stagger grid gap-2">{ops.map((o, i) => <Row key={o.opId} op={o} all={all} n={numbered ? i + 1 : undefined} />)}</ol>
    </section>
  );
}

/** Visit ref for a row label (from the cached bundle), never PII. */
function useVisitRef(visitId?: string) {
  const eng = useEngine();
  return visitId ? eng.bundle?.visits.find((v) => v.id === visitId)?.ref : undefined;
}

function Row({ op, n }: { op: Op; all?: Op[]; n?: number }) {
  const d = useCopyD();
  const { c } = useFieldCopy();
  const base = useFieldBase();
  const online = useOnline();
  const ref = useVisitRef(op.visitId);
  const [confirm, setConfirm] = useState(false);
  const tone = op.state === "conflict" ? "bg-warning-bg text-warning" : op.state === "rejected" || op.state === "failed" ? "bg-danger-bg text-danger" : op.state === "sent" ? "bg-success-bg text-success" : op.state === "sending" ? "bg-info-bg text-info" : "bg-ink-100 text-fg";
  const why = op.state === "conflict" || op.state === "rejected" || op.state === "blocked" ? d.why[op.state] : null;
  const canDiscard = op.kind !== "receipt.create" && op.state !== "sent" && op.state !== "sending";
  return (
    <li style={{ "--i": n ?? 0 } as React.CSSProperties} className={cx("grid gap-2 border bg-surface p-3 sm:p-4", op.state === "conflict" ? "border-warning/40" : "border-border")}>
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center bg-navy-50 text-navy-700">
          {n ? <span className="text-small font-semibold tabular">{n}</span> : <Icon name={KIND_ICON[op.kind]} size={16} />}
        </span>
        <div className="grid min-w-0 flex-1 gap-1">
          <p className="flex flex-wrap items-center gap-2 text-label">
            <Icon name={KIND_ICON[op.kind]} size={14} aria-hidden className="text-fg-subtle" />{d.kinds[op.kind]}
            {ref && <span className="text-small font-normal text-fg-subtle">{ref}</span>}
          </p>
          <p className="flex flex-wrap items-center gap-2 text-small text-fg-muted">
            {op.localRef && <LocalRef localRef={op.localRef} serverRef={op.serverRef} />}
            <span className="tabular">{kb(op.bytes)}</span>
            <span className={cx("inline-flex h-6 items-center gap-1 px-2 text-eyebrow font-medium normal-case", tone)}>
              {op.state === "sending" && <span aria-hidden className="size-2.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />}
              {op.state === "sent" && <Icon name="check" size={12} aria-hidden />}{d.state[op.state]}
            </span>
          </p>
          {why && <p className="text-small text-fg-muted">{why}</p>}
        </div>
      </div>
      {op.state !== "sent" && (
        <div className="flex flex-wrap justify-end gap-1.5">
          {op.state === "failed" && <Button size="sm" variant="secondary" disabled={!online} onClick={() => void retry(op.opId)}>{d.retry}</Button>}
          {op.state === "conflict" && <Button size="sm" onClick={() => setUrlParams({ item: op.opId })}>{d.review}</Button>}
          {op.state === "rejected" && (op.kind === "expense.create"
            ? <Link href={`${base("/expenses/new")}?edit=${op.opId}`} className="inline-flex h-9 items-center bg-secondary px-4 text-small font-medium text-on-navy hover:bg-secondary-hover">{d.edit}</Link>
            : <Button size="sm" onClick={() => setUrlParams({ item: op.opId })}>{d.edit}</Button>)}
          <Button size="sm" variant="ghost" onClick={() => setUrlParams({ item: op.opId })}>{d.details}</Button>
          {canDiscard && <Button size="sm" variant="ghost" className="text-danger" onClick={() => setConfirm(true)}>{d.discard}</Button>}
        </div>
      )}
      <Dialog open={confirm} onClose={() => setConfirm(false)} title={d.discardTitle} description={d.discardBody}
        footer={<><Button variant="ghost" onClick={() => setConfirm(false)}>{c.cancel}</Button><Button variant="danger" onClick={() => { setConfirm(false); void discard(op.opId); }}>{d.discard}</Button></>} />
    </li>
  );
}

function Detail({ op, all }: { op: Op; all: Op[] }) {
  const d = useCopyD();
  const { locale } = useFieldCopy();
  const online = useOnline();
  const deps = op.dependsOn.map((id) => all.find((o) => o.opId === id)).filter(Boolean) as Op[];
  const rows: [string, React.ReactNode][] = [
    [d.detail.id, <code key="id" className="break-all text-eyebrow normal-case">{op.opId}</code>],
    [d.detail.created, `${formatDateTime(op.createdAt, locale)} (${formatRelative(op.createdAt, locale)})`],
    [d.detail.attempts, op.attempts],
    [d.detail.error, op.error ?? "—"],
    [d.detail.size, kb(op.bytes)],
    [d.detail.deps, deps.length ? deps.map((x) => `${d.kinds[x.kind]} · ${d.state[x.state]}`).join(", ") : d.detail.none],
  ];
  return (
    <div className="grid gap-4">
      <dl className="grid gap-3">
        {rows.map(([k, v]) => <div key={k} className="grid gap-0.5"><dt className="text-eyebrow normal-case text-fg-subtle">{k}</dt><dd className="text-small">{v}</dd></div>)}
      </dl>
      {op.state === "rejected" && <p className="bg-danger-bg px-4 py-3 text-small text-danger">{d.why.rejected}</p>}
      {op.kind === "receipt.create" && <p className="text-small text-fg-subtle">{d.receiptKeep}</p>}
      {op.state === "failed" && (
        <div className="flex flex-wrap gap-2">
          <Button disabled={!online} onClick={() => void retry(op.opId)}>{d.retry}</Button>
          <Button variant="ghost" onClick={() => setUrlParams({ item: null })}>{d.retryLater}</Button>
        </div>
      )}
    </div>
  );
}
