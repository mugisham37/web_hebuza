"use client";
// G1 GRN sheet + G2 receipts list / received-not-invoiced (plan 12 §7, board 06 GR1/GR2/PGR1).
import { uploadFile } from "@/lib/api/upload";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { api, newIdempotencyKey, unwrap } from "@/lib/api/client";

import { cx, formatDate, formatDateTime } from "@/shared/format";
import { usePo, usePos, useReceipts, useReceive, type PoDetail, type ReceiptRow } from "@/lib/procurement/c";
import type { Condition } from "@/shared/procurement/types";
import { fill } from "@/content/pages/procurement-common";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { EmptyPanel, SavedViewTabs } from "@/components/molecules/ops/ops";
import { PageHead } from "@/components/atoms/agent";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/atoms/field";
import { FileDrop } from "@/components/atoms/file-drop";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { useOnline } from "@/components/atoms/hooks";
import { AgeBadge, Amount, DocNo, Pill, useP } from "@/components/atoms/procurement";
import { PanelErr, ProcNoAccess } from "@/components/molecules/procurement/procurement";
import { useC, useErr } from "@/components/molecules/procurement/procurement";
import { isForbidden } from "@/components/atoms/hooks";
import { hdr } from "@/lib/finance/api";

export function ReceiptsView() {
  const c = useC();
  const p = useP();
  const { locale } = useI18n();
  const { user } = useSession();
  const toast = useToast();
  const u = useUrlParams();
  const tab = u.get("tab") === "ni" ? "ni" : "all";
  const search = (u.get("q") ?? "").toLowerCase();
  const all = useReceipts(false);
  const ni = useReceipts(true);
  const q = tab === "ni" ? ni : all;
  const [focused, setFocused] = useState<string | null>(null);
  const [correct, setCorrect] = useState<ReceiptRow | null>(null);
  if (q.isError && isForbidden(q.error)) return <ProcNoAccess />;
  const rows = (q.data?.items ?? []).filter((r) => !search || [r.no, r.poNo, r.vendorName].some((x) => x.toLowerCase().includes(search)));

  function chase(r: ReceiptRow) {
    const text = fill(c.grn.chaseText, { name: r.vendorName, po: r.poNo, items: r.lineText, date: formatDate(r.receivedAt, locale), me: user?.name ?? "" });
    unwrap(api.POST("/api/procurement/receipts/{no}/chase", { params: { path: { no: r.no } }, body: { text }, headers: hdr({ idempotencyKey: newIdempotencyKey() }) }))
      .then(() => { toast({ title: c.grn.chaseSent, tone: "success" }); })
      .catch(() => navigator.clipboard?.writeText(text).then(() => toast({ title: c.grn.chaseCopied, tone: "success" }), () => toast({ title: text }))); // no supplier email → copy instead
  }
  const cols: OpsColumn<ReceiptRow>[] = [
    { key: "no", label: c.grn.cols.no, sort: (r) => r.no, cell: (r) => <span className="grid"><DocNo kind="GRN" no={r.no} />{r.reverses && <span className="text-eyebrow text-fg-subtle">{fill(c.grn.reverses, { no: r.reverses })}</span>}</span> },
    { key: "po", label: c.grn.cols.po, cell: (r) => <DocNo kind="PO" no={r.poNo} href={`/procurement/orders/${r.poNo}`} /> },
    { key: "supplier", label: c.grn.cols.supplier, wrap: true, sort: (r) => r.vendorName, cell: (r) => <span className="font-medium">{r.vendorName}</span> },
    { key: "items", label: c.grn.cols.items, wrap: true, card: false, cell: (r) => <span className="text-small text-fg-muted">{r.lineText}</span> },
    { key: "by", label: c.grn.cols.by, cell: (r) => <span className="text-small">{r.receivedBy.name}{r.service && <Pill tone="neutral" icon="fileCheck" className="ml-1">{c.grn.service.split(" (")[0]}</Pill>}</span> },
    { key: "at", label: c.grn.cols.at, sort: (r) => r.receivedAt, cell: (r) => <span className="text-small text-fg-muted tabular">{formatDateTime(r.receivedAt, locale)}</span> },
    ...(tab === "ni" ? [{ key: "age", label: c.grn.cols.age, sort: (r: ReceiptRow) => r.ageDays, cell: (r: ReceiptRow) => <AgeBadge days={r.ageDays} /> }] : []),
    { key: "value", label: c.grn.cols.value, align: "right", sort: (r) => r.value, cell: (r) => <Amount value={r.value} className="font-medium" /> },
    { key: "act", label: p.shell.actions, card: false, cell: (r) => tab === "ni"
      ? <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); chase(r); }}><Icon name="mail" size={14} aria-hidden />{c.grn.chase}</Button>
      : !r.reverses && !r.reversed && !r.invoiced ? <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setCorrect(r); }}>{c.grn.correct}</Button>
      : r.reversed ? <Pill tone="neutral" icon="refresh">{c.grn.reversed}</Pill> : null },
  ];
  return (
    <div className="grid gap-5">
      <PageHead title={c.grn.title} sub={c.grn.sub} actions={<Button variant="primary" onClick={() => setUrlParams({ sheet: "grn" })} dots className="m-press"><Icon name="plus" size={16} aria-hidden />{c.grn.record}</Button>} />
      <SavedViewTabs active={tab} onChange={(k) => setUrlParams({ tab: k === "all" ? null : k })}
        views={[{ key: "all", label: c.grn.all, count: all.data?.items.length }, { key: "ni", label: c.grn.ni, count: ni.data?.items.length }]} />
      <div className="border border-border bg-surface m-rise">
        {q.isError ? <PanelErr onRetry={() => q.refetch()} /> : (
          <OpsTable rows={rows} columns={cols} rowKey={(r) => r.no} rowLabel={(r) => `${r.no} · ${r.vendorName}`} label={tab === "ni" ? c.grn.ni : c.grn.all} loading={q.isPending}
            focused={focused} onFocus={setFocused} shortcuts rowTone={(r) => (r.reversed ? "muted" : null)}
            empty={<div className="p-4"><EmptyPanel title={tab === "ni" ? c.grn.noneNi : c.grn.none} /></div>} />
        )}
      </div>
      {u.get("sheet") === "grn" && <GrnSheet poNo={u.get("po")} onClose={() => setUrlParams({ sheet: null, po: null })} />}
      {correct && <GrnSheet poNo={correct.poNo} reverses={correct} onClose={() => setCorrect(null)} />}
    </div>
  );
}

/** Record a GRN against a PO (or a reversing correction of an earlier GRN). Steppers never exceed what's outstanding. */
export function GrnSheet({ poNo, reverses, onClose }: { poNo: string | null; reverses?: ReceiptRow; onClose: () => void }) {
  const c = useC();
  const p = useP();
  const { user } = useSession();
  const toast = useToast();
  const err = useErr();
  const online = useOnline();
  const pos = usePos(!poNo);
  const [pick, setPick] = useState(poNo ?? "");
  const one = usePo(pick);
  const po: PoDetail | undefined = pick ? one.data : undefined;
  const receive = useReceive();
  const [key] = useState(newIdempotencyKey);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [cond, setCond] = useState<Record<string, Condition>>({});
  const [cnote, setCnote] = useState<Record<string, string>>({});
  const [by, setBy] = useState<"me" | "requester">("me");
  const [at, setAt] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16));
  const [photo, setPhoto] = useState<File | null>(null);
  const [service, setService] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const open = (pos.data?.items ?? []).filter((x) => ["issued", "partially_received"].includes(x.status));
  const maxOf = (lineId: string) => {
    const l = po?.lines.find((x) => x.id === lineId);
    if (!l) return 0;
    return reverses ? reverses.lines.find((x) => x.lineId === lineId)?.qty ?? 0 : l.qty - l.received;
  };

  async function save() {
    setError(null);
    if (!po) return;
    const lines = po.lines.map((l) => ({ lineId: l.id, qty: (qty[l.id] ?? 0) * (reverses ? -1 : 1), condition: cond[l.id] ?? "good", note: cnote[l.id] })).filter((l) => l.qty !== 0);
    if (!lines.length) return setError(c.grn.errQty);
    if (!reverses && !service && !photo) return setError(c.grn.errPhoto);
    try {
      const r = await receive.mutateAsync({
        no: po.no, idempotencyKey: key, lines, receivedById: by === "requester" ? po.pr?.requester.id : user?.id, receivedAt: new Date(at).toISOString(),
        evidence: photo ? { name: photo.name, uploadId: (await uploadFile(photo, "grn-evidence")).id } : undefined, notes: notes || undefined, service, reverses: reverses?.no,
      });
      toast({ title: fill(c.grn.saved, { no: r.grn.no, po: po.no, state: p.status[r.po.status] ?? r.po.status }), tone: "success" });
      onClose();
    } catch (x) { setError(err(x)); }
  }
  return (
    <Dialog open onClose={onClose} side="right" title={reverses ? fill(c.grn.correction, { no: reverses.no }) : c.grn.sheet} description={reverses ? c.grn.correctionHint : undefined}
      footer={<Button onClick={save} loading={receive.isPending} disabled={!po || !online} dots className="m-press">{c.grn.save}</Button>}>
      <form className="grid gap-5" onSubmit={(e) => { e.preventDefault(); save(); }}>
        {error && <p role="alert" className="bg-danger-bg px-3 py-2 text-small text-danger m-shake">{error}</p>}
        {!poNo && (
          <Field label={c.grn.pickPo}>{(a) => (
            <Select id={a.id} value={pick} onChange={(e) => { setPick(e.target.value); setQty({}); }}>
              <option value="">{c.grn.choosePo}</option>
              {open.map((x) => <option key={x.no} value={x.no}>{x.no} · {x.vendorName}</option>)}
            </Select>
          )}</Field>
        )}
        {pick && one.isPending && <div className="h-40 m-shimmer" />}
        {po && (
          <>
            <ul className="grid gap-2">
              {po.lines.map((l) => {
                const max = maxOf(l.id), v = qty[l.id] ?? 0;
                return (
                  <li key={l.id} className="grid gap-2 border border-border bg-surface p-3">
                    <p className="text-small font-medium">{fill(c.grn.line, { desc: l.description, n: max })}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center border border-border-strong">
                        <button type="button" aria-label={`${c.grn.dec} ${l.description}`} disabled={v <= 0} onClick={() => setQty({ ...qty, [l.id]: v - 1 })} className="flex size-10 items-center justify-center disabled:opacity-30"><Icon name="minus" size={14} aria-hidden /></button>
                        <Input aria-label={`${c.grn.qty} ${l.description}`} type="number" min={0} max={max} value={v} onChange={(e) => setQty({ ...qty, [l.id]: Math.max(0, Math.min(max, Number(e.target.value) || 0)) })} className="h-10 w-16 border-0 text-center" />
                        <button type="button" aria-label={`${c.grn.inc} ${l.description}`} disabled={v >= max} onClick={() => setQty({ ...qty, [l.id]: v + 1 })} className="flex size-10 items-center justify-center disabled:opacity-30"><Icon name="plus" size={14} aria-hidden /></button>
                      </span>
                      {!reverses && v < max && v > 0 && <button type="button" className="text-small underline underline-offset-4" onClick={() => setQty({ ...qty, [l.id]: max })}>= {max}</button>}
                      {!reverses && (
                        <div role="radiogroup" aria-label={c.grn.condition} className="flex flex-wrap gap-1">
                          {(["good", "damaged", "rejected"] as const).map((k) => (
                            <button key={k} type="button" role="radio" aria-checked={(cond[l.id] ?? "good") === k} onClick={() => setCond({ ...cond, [l.id]: k })}
                              className={cx("h-8 px-3 text-small m-press", (cond[l.id] ?? "good") === k ? (k === "good" ? "bg-success-bg text-success" : "bg-danger-bg text-danger") : "bg-ink-100 text-fg-muted")}>{c.grn.conditions[k]}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {(cond[l.id] ?? "good") !== "good" && <Input aria-label={c.grn.conditionNote} placeholder={c.grn.conditionNote} value={cnote[l.id] ?? ""} onChange={(e) => setCnote({ ...cnote, [l.id]: e.target.value })} className="h-10" />}
                  </li>
                );
              })}
            </ul>
            {!reverses && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={c.grn.by}>{(a) => (
                    <Select id={a.id} value={by} onChange={(e) => setBy(e.target.value as "me" | "requester")}>
                      <option value="me">{fill(c.grn.me, { name: user?.name ?? "" })}</option>
                      {po.pr && po.pr.requester.id !== user?.id && <option value="requester">{fill(c.grn.requester, { name: po.pr.requester.name })}</option>}
                    </Select>
                  )}</Field>
                  <Field label={c.grn.at}>{(a) => <Input id={a.id} type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />}</Field>
                </div>
                <Checkbox label={c.grn.service} checked={service} onChange={(e) => setService(e.target.checked)} />
                <Field label={c.grn.photo} hint={c.grn.photoHint} optional={service ? p.common.none : undefined}>{() => (
                  <div className="grid gap-2">
                    <FileDrop onFiles={(f) => setPhoto(f[0] ?? null)} accept="image/*,application/pdf" maxSizeMb={10} camera />
                    {photo && <p className="flex items-center gap-2 text-small"><Icon name="camera" size={14} aria-hidden />{photo.name}<button type="button" className="text-danger underline" onClick={() => setPhoto(null)}>{p.common.cancel}</button></p>}
                  </div>
                )}</Field>
              </>
            )}
            <Field label={c.grn.notes} optional={p.common.none}>{(a) => <Textarea id={a.id} rows={2} maxLength={250} value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
          </>
        )}
      </form>
    </Dialog>
  );
}
