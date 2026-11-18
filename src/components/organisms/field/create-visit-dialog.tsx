"use client";
// F-WRK-17 "Request field visit": SM (or assigned internal agent) creates a visit on a case → agent's day plan.
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { errorCopy } from "@/lib/api/error-copy";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Field, Input, Select, Textarea } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { fx } from "@/lib/field/api";
import { useFieldCopy } from "@/lib/field/copy";
import { copyF } from "@/lib/field/copy-f";
import type { FieldVisit, VisitPurpose } from "@/shared/field/types";
import { ctl } from "@/components/molecules/field/ctl";

const PURPOSES: VisitPurpose[] = ["pickup", "dropoff", "institution_submission", "site_visit", "meeting", "assisted_application"];
/** datetime-local value (wall clock) → ISO in Kigali (+02:00, no DST). */
const kigali = (v: string) => (v ? `${v}:00+02:00` : "");

export function CreateVisitDialog({ open, onClose, caseRef = "" }: { open: boolean; onClose: () => void; caseRef?: string }) {
  const { c, locale } = useFieldCopy();
  const t = copyF(locale).create;
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState({ caseRef, purpose: "pickup" as VisitPurpose, title: "", todo: "", institution: "", address: "", lat: "", lng: "", start: "", end: "", checklist: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function save() {
    const start = Date.parse(kigali(f.start));
    const lat = f.lat ? Number(f.lat) : null, lng = f.lng ? Number(f.lng) : null;
    if (!f.caseRef.trim() || !f.title.trim() || !f.address.trim() || !(start > Date.now()) || (f.end && Date.parse(kigali(f.end)) < start)
      || (lat !== null && !(Math.abs(lat) <= 90)) || (lng !== null && !(Math.abs(lng) <= 180))) return setErr(t.invalid);
    setBusy(true); setErr(null);
    try {
      const v = await fx<FieldVisit>("POST", `/api/staff/cases/${encodeURIComponent(f.caseRef.trim())}/visits`, {
        purpose: f.purpose, title: f.title.trim(), todo: f.todo.trim(), institution: f.institution.trim() || undefined, address: f.address.trim(), lat, lng,
        window_start: kigali(f.start), window_end: kigali(f.end || f.start), checklist: f.checklist.split("\n").map((s) => s.trim()).filter(Boolean), assignee: "ag-emmanuel",
      });
      toast({ tone: "success", title: t.created.replace("{ref}", v.ref) });
      await qc.invalidateQueries({ queryKey: ["field"] });
      onClose();
    } catch (e) { setErr(errorCopy(e, locale)); } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t.title} footer={<><Button variant="ghost" onClick={onClose}>{c.cancel}</Button><Button loading={busy} onClick={() => void save()}>{t.save}</Button></>}>
      <div className="grid gap-3">
        <Field label={t.caseRef}>{(a) => <Input {...ctl(a)} value={f.caseRef} onChange={set("caseRef")} />}</Field>
        <Field label={t.purpose}>{(a) => <Select {...ctl(a)} value={f.purpose} onChange={set("purpose")}>{PURPOSES.map((p) => <option key={p} value={p}>{c.purpose[p]}</option>)}</Select>}</Field>
        <Field label={t.vtitle}>{(a) => <Input {...ctl(a)} value={f.title} onChange={set("title")} />}</Field>
        <Field label={t.todo}>{(a) => <Textarea {...ctl(a)} rows={2} value={f.todo} onChange={set("todo")} />}</Field>
        <Field label={t.institution}>{(a) => <Input {...ctl(a)} value={f.institution} onChange={set("institution")} />}</Field>
        <Field label={t.address}>{(a) => <Input {...ctl(a)} value={f.address} onChange={set("address")} />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.lat}>{(a) => <Input {...ctl(a)} inputMode="decimal" value={f.lat} onChange={set("lat")} />}</Field>
          <Field label={t.lng}>{(a) => <Input {...ctl(a)} inputMode="decimal" value={f.lng} onChange={set("lng")} />}</Field>
          <Field label={t.start}>{(a) => <Input {...ctl(a)} type="datetime-local" value={f.start} onChange={set("start")} />}</Field>
          <Field label={t.end}>{(a) => <Input {...ctl(a)} type="datetime-local" value={f.end} onChange={set("end")} />}</Field>
        </div>
        <Field label={t.checklist}>{(a) => <Textarea {...ctl(a)} rows={3} value={f.checklist} onChange={set("checklist")} />}</Field>
        <Field label={t.assignee}>{(a) => <Select {...ctl(a)} disabled value="ag-emmanuel"><option value="ag-emmanuel">Emmanuel Mugabo · Musanze, Burera, Gakenke</option></Select>}</Field>
        {err && <p role="alert" className="text-small text-danger">{err}</p>}
      </div>
    </Dialog>
  );
}
