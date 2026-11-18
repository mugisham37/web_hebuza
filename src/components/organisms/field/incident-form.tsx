"use client";
// U7d IncidentForm (board 05 RC5): damaged / lost / client refused / other → incident.create op (SM + client notified on sync).
import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Field, Radio, Textarea } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { useFieldCopy, fill } from "@/lib/field/copy";
import { copyC } from "@/lib/field/copy-c";
import { enqueue } from "@/lib/field/sync";
import type { Captured } from "@/lib/field/image";
import { PhotoCapture } from "@/components/molecules/field/field";

const TYPES = ["damaged", "lost", "client_refused", "other"] as const;

export function IncidentForm({ visitId, onDone, onCancel }: { visitId: string; onDone: () => void; onCancel: () => void }) {
  const { locale } = useFieldCopy();
  const t = copyC(locale);
  const toast = useToast();
  const [type, setType] = useState<(typeof TYPES)[number]>("damaged");
  const [desc, setDesc] = useState("");
  const [photo, setPhoto] = useState<Captured | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const d = desc.trim();
    if (d.length < 10) return setErr(t.descShort);
    setBusy(true);
    try {
      await enqueue({ kind: "incident.create", visitId, body: { type, description: d, photo: photo?.dataUrl } });
      toast({ title: t.incidentSaved, body: t.incidentNotice, tone: "success" });
      onDone();
    } catch { setErr(t.saveFailed); } finally { setBusy(false); }
  }

  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-label">{t.incidentType}</legend>
        {TYPES.map((k) => <Radio key={k} name="incident-type" label={t.incidentTypes[k]} checked={type === k} onChange={() => setType(k)} />)}
      </fieldset>
      <Field label={t.description} hint={fill(t.descHint, { n: desc.length })} error={err ?? undefined}>
        {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} maxLength={1000} value={desc} onChange={(e) => { setDesc(e.target.value); setErr(null); }} />}
      </Field>
      <PhotoCapture label={t.incidentPhoto} value={photo} onCapture={({ file, ...p }) => { void file; setPhoto(p); }} />
      <p className="bg-info-bg px-4 py-3 text-small text-info">{t.incidentNotice}</p>
      <div className="flex flex-wrap gap-2 [&>*]:min-h-12 [&>*]:flex-1">
        <Button variant="outline" onClick={onCancel}>{t.cancel}</Button>
        <Button variant="danger" onClick={() => void save()} loading={busy} disabled={busy}>{t.incidentSave}</Button>
      </div>
    </div>
  );
}
