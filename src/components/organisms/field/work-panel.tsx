"use client";
// U5b work (board 04 VI3/VI4): checklist, notes, scans, assisted application (online only), payment, custody.
import { useState } from "react";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { localHref } from "@/lib/i18n/provider";
import { cx } from "@/shared/format";
import { useCopyB } from "@/lib/field/copy-b";
import { useFieldCopy } from "@/lib/field/copy";
import { useSave } from "@/lib/field/b";
import { useOnline } from "@/lib/field/net";
import type { FieldVisit } from "@/shared/field/types";
import { ActionBar, CustodyChip, NeedsConnection } from "@/components/atoms/field-agent";
import { OtpConfirm } from "@/components/molecules/field/field";
import { SignaturePad } from "@/components/molecules/field/field";
import { PaymentCard } from "@/components/organisms/field/payment-card";
import { Checklist } from "@/components/organisms/field/checklist";
import { ScanStrip } from "@/components/organisms/field/scan-strip";

const MAX = 2000;

export function WorkPanel({ visit, onNext, onCheckin }: { visit: FieldVisit; onNext: () => void; onCheckin: () => void }) {
  const t = useCopyB().work;
  const save = useSave();
  const toast = useToast();
  const [note, setNote] = useState("");

  if (!visit.checkin) {
    return (
      <section className="grid justify-items-center gap-3 border border-border bg-surface p-8 text-center">
        <p className="text-body">{t.checkinFirst}</p>
        <Button onClick={onCheckin}>{t.goCheckin}</Button>
      </section>
    );
  }
  async function addNote() {
    if (!note.trim()) return;
    if (await save({ kind: "visit.note", visitId: visit.id, body: { base_version: visit.version, notes_append: note.trim() } })) {
      setNote("");
      toast({ title: t.noteSaved, tone: "success" });
    }
  }
  return (
    <div className="grid gap-4">
      <Checklist visit={visit} />
      <section className="grid gap-3 border border-border bg-surface p-5">
        <label className="grid gap-1.5">
          <span className="text-label">{t.notes}</span>
          <span className="text-small text-fg-subtle">{t.notesHint}</span>
          <Textarea value={note} maxLength={MAX} onChange={(e) => setNote(e.target.value)} className="bg-bg-tint" />
        </label>
        <div className="flex items-center justify-between gap-2">
          <span className={cx("text-small tabular", note.length > MAX * 0.9 ? "text-warning" : "text-fg-subtle")}>{note.length} / {MAX}</span>
          <Button size="sm" variant="secondary" disabled={!note.trim()} onClick={() => void addNote()}>{t.addNote}</Button>
        </div>
        {!!visit.notes?.length && (
          <details className="text-small"><summary className="cursor-pointer text-fg-muted">{t.savedNotes} ({visit.notes.length})</summary>
            <ul className="mt-2 grid gap-1.5">{visit.notes.map((n, i) => <li key={i} className="bg-bg-subtle px-3 py-2">{n}</li>)}</ul>
          </details>
        )}
      </section>
      <ScanStrip visit={visit} />
      {(visit.purpose === "assisted_application" || visit.evidenceRequired.includes("otp")) && <AssistedCard visit={visit} />}
      <PaymentCard visit={visit} />
      {visit.custodyOpen > 0 && <CustodyChip count={visit.custodyOpen} since={visit.checkin.at} />}
      <ActionBar><Button size="lg" onClick={onNext}>{visit.collectsDocs ? t.nextReceipt : t.nextCheckout}</Button></ActionBar>
    </div>
  );
}

/** U5d: the wizard itself is Stage 2's; this stage adds the entry point and records the client's confirmation. */
function AssistedCard({ visit }: { visit: FieldVisit }) {
  const t = useCopyB().work;
  const { locale } = useFieldCopy();
  const online = useOnline();
  const save = useSave();
  const [mode, setMode] = useState<"otp" | "sign" | null>(null);
  const [done, setDone] = useState<string | null>(visit.notes?.find((n) => n === t.confirmedOtp || n === t.confirmedSig) ?? null);
  const confirm = async (text: string) => {
    setMode(null);
    if (await save({ kind: "visit.note", visitId: visit.id, body: { base_version: visit.version, notes_append: text, assisted_confirmed: true } })) setDone(text);
  };
  return (
    <section className="grid gap-3 border border-border bg-surface p-5">
      <h2 className="flex items-center gap-2 text-label-lg"><Icon name="users" size={20} aria-hidden className="text-navy-700" />{t.assisted}</h2>
      {!online ? <p className="bg-warning-bg px-4 py-3 text-small">{t.assistedOffline}</p> : <p className="text-small text-fg-muted">{t.assistedBody}</p>}
      <NeedsConnection online={online}>
        {/* shortcut: links to the services catalogue with ?assisted; Stage 2 owns the wizard's assisted mode and return link. */}
        <ButtonLink href={localHref(locale, `/services?assisted=${visit.id}`)} variant="outline" aria-disabled={!online || undefined} tabIndex={online ? undefined : -1}>{t.openWizard}</ButtonLink>
      </NeedsConnection>
      <p className="text-eyebrow normal-case text-fg-subtle">{t.wizardNote}</p>
      {done ? (
        <p className="m-pop flex items-center gap-2 bg-success-bg px-4 py-3 text-small font-medium text-success"><Icon name="check" size={16} aria-hidden />{done}</p>
      ) : (
        <>
          <p className="text-label">{t.askConfirm}</p>
          <div className="flex flex-wrap gap-2 [&>*]:min-h-12 [&>*]:flex-1">
            <Button variant={mode === "otp" ? "primary" : "secondary"} disabled={!online} onClick={() => setMode("otp")}>{t.otp}</Button>
            <Button variant={mode === "sign" ? "primary" : "secondary"} onClick={() => setMode("sign")}>{t.sign}</Button>
          </div>
          {mode === "otp" && online && <OtpConfirm visitId={visit.id} phoneMasked={visit.client.phoneMasked} onVerified={() => void confirm(t.confirmedOtp)} />}
          {mode === "sign" && <SignaturePad clientName={visit.client.name} clientLanguage={visit.client.language} onSave={() => void confirm(t.confirmedSig)} onCancel={() => setMode(null)} draftKey={`assisted:${visit.id}`} />}
        </>
      )}
    </section>
  );
}
