"use client";
// U8 cash (F-WRK-21): only rendered when cash is enabled for the service. Amount + provisional receipt + client signature
// → cash.record op; later "Mark deposited" with slip photo + bank ref → cash.deposit. Never "paid" until finance confirms.
import { useState } from "react";
import { formatMoney } from "@/shared/format";
import { Sheet } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Field, Input } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { enqueue, useEngine } from "@/lib/field/sync";
import { useFieldCopy, fill } from "@/lib/field/copy";
import { copyE } from "@/lib/field/copy-e";
import type { FieldVisit, Op } from "@/shared/field/types";
import type { Captured } from "@/lib/field/image";
import { SignaturePad, type SignatureResult } from "@/components/molecules/field/field";
import { PhotoCapture } from "@/components/molecules/field/field";
import { LocalRef } from "@/components/atoms/field-agent";
import { ctl } from "@/components/molecules/field/ctl";

export function CashSheet({ visit, open, onClose }: { visit: FieldVisit; open: boolean; onClose: () => void }) {
  const { c, locale } = useFieldCopy();
  const t = copyE(locale).cash;
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("INV-");
  const [sig, setSig] = useState<SignatureResult | null>(null);
  const [signing, setSigning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const n = Number(amount);
    if (!Number.isInteger(n) || n <= 0 || invoiceNo.trim().length < 5) return setErr(copyE(locale).exp.errors);
    if (!sig) return setErr(t.needSig);
    setBusy(true);
    try {
      const op = await enqueue({ kind: "cash.record", visitId: visit.id, localPrefix: "PR", body: { amount: n, invoice_no: invoiceNo.trim(), signature: sig } });
      toast({ title: fill(t.recorded, { ref: op.localRef ?? "" }), tone: "success" });
      setAmount(""); setSig(null); setErr(null); onClose();
    } catch { setErr(c.quotaFull); } finally { setBusy(false); }
  }

  return (
    <Sheet open={open} onClose={onClose} side="bottom" title={t.title} description={t.note}
      footer={!signing && <Button loading={busy} onClick={() => void save()}>{t.save}</Button>}>
      {signing ? (
        <SignaturePad clientName={visit.client.name} clientLanguage={visit.client.language}
          onSave={(s) => { setSig(s); setSigning(false); }} onCancel={() => setSigning(false)} draftKey={`cash-sig:${visit.id}`} />
      ) : (
        <div className="mx-auto grid max-w-md gap-4">
          <Field label={t.amount}>{(a) => <Input {...ctl(a)} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />}</Field>
          <Field label={t.invoice}>{(a) => <Input {...ctl(a)} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />}</Field>
          <p className="flex items-center gap-2 text-small text-fg-muted">{t.provisional}: <LocalRef localRef="PR-LOCAL-····" /></p>
          {sig ? <p className="m-pop bg-success-bg px-4 py-3 text-small text-success">✓ {t.signed} · {sig.clientName}</p>
            : <Button variant="secondary" onClick={() => setSigning(true)}>{t.sign}</Button>}
          {err && <p role="alert" className="text-small text-danger">{err}</p>}
          <p className="bg-warning-bg px-4 py-3 text-small font-medium">{t.note}</p>
        </div>
      )}
    </Sheet>
  );
}

/** Cash recorded on this visit, with "Mark deposited" (slip photo + bank ref). */
export function CashList({ visit }: { visit: FieldVisit }) {
  const { locale } = useFieldCopy();
  const t = copyE(locale).cash;
  const eng = useEngine();
  const records = eng.ops.filter((o) => o.kind === "cash.record" && o.visitId === visit.id);
  const deposited = new Set(eng.ops.filter((o) => o.kind === "cash.deposit").map((o) => String(o.body.cash_ref)));
  const [depositing, setDepositing] = useState<Op | null>(null);
  if (!records.length) return null;
  return (
    <div className="grid gap-2">
      <p className="text-label">{t.list}</p>
      {records.map((o) => (
        <div key={o.opId} className="flex flex-wrap items-center gap-2 border border-border bg-surface px-4 py-3">
          <span className="tabular font-medium">{formatMoney(Number(o.body.amount), "RWF", locale)}</span>
          <LocalRef localRef={o.localRef!} serverRef={o.serverRef} />
          <span className="bg-warning-bg px-2 py-0.5 text-eyebrow normal-case text-warning">{t.note}</span>
          {deposited.has(o.localRef!) ? <span className="ml-auto text-small text-fg-muted">{t.deposited}</span>
            : <Button size="sm" variant="outline" className="ml-auto" onClick={() => setDepositing(o)}>{t.deposit}</Button>}
        </div>
      ))}
      {depositing && <DepositSheet op={depositing} visitId={visit.id} onClose={() => setDepositing(null)} />}
    </div>
  );
}

function DepositSheet({ op, visitId, onClose }: { op: Op; visitId: string; onClose: () => void }) {
  const { c, locale } = useFieldCopy();
  const t = copyE(locale).cash;
  const toast = useToast();
  const [slip, setSlip] = useState<Captured | null>(null);
  const [ref, setRef] = useState("");
  const [err, setErr] = useState<string | null>(null);
  async function save() {
    if (!slip || ref.trim().length < 3) return setErr(t.needSlip);
    try {
      // cash_ref is the local PR ref; the engine's idMap rewrites it to the server number once cash.record syncs.
      await enqueue({ kind: "cash.deposit", visitId, dependsOn: [op.opId], body: { cash_ref: op.localRef, deposit_ref: ref.trim(), slip: slip.dataUrl } });
      toast({ title: t.deposited, tone: "success" });
      onClose();
    } catch { setErr(c.quotaFull); }
  }
  return (
    <Sheet open onClose={onClose} side="bottom" title={t.deposit} footer={<Button onClick={() => void save()}>{t.depositSave}</Button>}>
      <div className="mx-auto grid max-w-md gap-4">
        <PhotoCapture label={t.slip} value={slip} onCapture={setSlip} />
        <Field label={t.bankRef}>{(a) => <Input {...ctl(a)} value={ref} onChange={(e) => setRef(e.target.value)} />}</Field>
        {err && <p role="alert" className="text-small text-danger">{err}</p>}
      </div>
    </Sheet>
  );
}
