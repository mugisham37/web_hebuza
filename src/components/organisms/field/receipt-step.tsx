"use client";
// ?step=receipt body (U7, board 05): this visit's receipts (local ref → CR number on sync, PDF + hash), builder,
// correction by superseding receipt (signed receipts are immutable), custody chain, incident report.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/atoms/button";
import { Sheet } from "@/components/atoms/dialog";
import { Icon } from "@/components/atoms/icon";
import { useFieldCopy, fill } from "@/lib/field/copy";
import { copyC } from "@/lib/field/copy-c";
import { useEngine } from "@/lib/field/sync";
import { fx, receiptsOf } from "@/lib/field/api";
import { useOnline } from "@/lib/field/net";
import type { CustodyReceipt, FieldVisit } from "@/shared/field/types";
import { CustodyChip, LocalRef, hhmm, ActionBar } from "@/components/atoms/field-agent";
import { ReceiptBuilder } from "@/components/organisms/field/receipt-builder";
import { CustodyChain } from "@/components/molecules/field/field";
import { IncidentForm } from "@/components/organisms/field/incident-form";

type Builder = null | { direction: "collected" | "returned"; supersedes?: { id: string; ref: string } };

export function ReceiptStep({ visit, onDone }: { visit: FieldVisit; onDone: () => void }) {
  const { locale } = useFieldCopy();
  const t = copyC(locale);
  const eng = useEngine();
  const online = useOnline();
  const receipts = receiptsOf(eng.ops, visit.id);
  const [builder, setBuilder] = useState<Builder>(receipts.length ? null : { direction: "collected" });
  const [saved, setSaved] = useState(false);
  const [incident, setIncident] = useState(false);
  const synced = receipts.some((r) => r.sync === "sent");
  const server = useQuery({
    queryKey: ["field", "receipts", visit.id],
    queryFn: () => fx<CustodyReceipt[]>("GET", `/api/x_field/visits/${visit.id}/receipts`),
    enabled: online && synced, networkMode: "offlineFirst",
  });
  const superseded = new Set(receipts.map((r) => r.supersedesId).filter(Boolean));

  return (
    <div className="grid gap-5">
      {saved && (
        <p role="status" className="m-pop flex items-start gap-3 bg-success-bg px-4 py-3 text-small font-medium text-success">
          <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><path className="m-tick" pathLength={24} d="M20 6 9 17l-5-5" /></svg>
          {t.complete}
        </p>
      )}
      <CustodyChip count={visit.custodyOpen} since={receipts.find((r) => r.direction === "collected")?.signature.signedAt} />

      <section aria-labelledby="rs-list" className="grid gap-3">
        <h2 id="rs-list" className="text-label-lg">{t.receipts}</h2>
        {!receipts.length && !builder && <p className="text-small text-fg-muted">{t.noneYet}</p>}
        <ul className="grid gap-3">
          {receipts.map((r) => {
            const s = server.data?.find((x) => x.localRef === r.localRef || x.ref === r.ref);
            const replaced = superseded.has(r.id);
            return (
              <li key={r.id} className="m-rise grid gap-2 border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <LocalRef localRef={r.localRef} serverRef={r.ref} />
                  <span className="text-small font-medium">{r.direction === "collected" ? t.collected : t.returned}</span>
                  <span className="ml-auto text-eyebrow normal-case text-fg-subtle">{t.sync[r.sync]}</span>
                </div>
                <p className="text-small text-fg-muted">
                  {r.items.map((i) => `${i.label}${i.original ? ` (${t.original})` : ""} ×${i.pages}`).join(" · ")}
                </p>
                <p className="text-eyebrow normal-case text-fg-subtle tabular">{r.clientName} · {t.method[r.signature.method]} · {hhmm(r.signature.signedAt, locale)}</p>
                {r.supersedesId && <p className="text-eyebrow normal-case text-warning">{fill(t.corrects, { ref: receipts.find((x) => x.id === r.supersedesId)?.ref ?? receipts.find((x) => x.id === r.supersedesId)?.localRef ?? "" })}</p>}
                {s?.pdfUrl && (
                  <p className="flex flex-wrap items-center gap-2 text-small">
                    <Icon name="fileCheck" size={16} aria-hidden className="text-success" />{t.pdfReady}
                    <a href={s.pdfUrl} target="_blank" rel="noopener" className="underline underline-offset-4">{t.openPdf}</a>
                    {s.sha256 && <code title={s.sha256} className="bg-ink-100 px-1.5 text-eyebrow normal-case">{fill(t.hash, { h: s.sha256.slice(0, 12) })}</code>}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 text-eyebrow normal-case text-fg-subtle"><Icon name="lock" size={12} aria-hidden />{t.immutable}</span>
                  {!replaced && (
                    <Button size="sm" variant="outline" className="ml-auto" onClick={() => { setSaved(false); setBuilder({ direction: r.direction, supersedes: { id: r.id, ref: r.ref ?? r.localRef } }); }}>{t.correct}</Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {!builder && <Button variant="outline" onClick={() => { setSaved(false); setBuilder({ direction: "collected" }); }}><Icon name="plus" size={16} aria-hidden />{t.newReceipt}</Button>}
      </section>

      {builder && (
        <ReceiptBuilder key={`${builder.direction}-${builder.supersedes?.id ?? "new"}`} visit={visit} direction={builder.direction} supersedes={builder.supersedes}
          onSaved={() => { setBuilder(null); setSaved(true); }} onCancel={receipts.length ? () => setBuilder(null) : undefined} />
      )}

      <CustodyChain visit={visit} onReturn={() => setBuilder({ direction: "returned" })} />

      <Button variant="ghost" className="justify-self-start text-danger" onClick={() => setIncident(true)}><Icon name="shield" size={16} aria-hidden />{t.incident}</Button>
      <Sheet open={incident} onClose={() => setIncident(false)} side="bottom" title={t.incidentTitle}>
        {incident && <IncidentForm visitId={visit.id} onDone={() => setIncident(false)} onCancel={() => setIncident(false)} />}
      </Sheet>

      <ActionBar><Button size="lg" onClick={onDone}>{t.next}</Button></ActionBar>
    </div>
  );
}
