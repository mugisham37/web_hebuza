"use client";
// U7a/U7b ReceiptBuilder (board 05 RC1/RC2): items editor → client signs (drawn / typed / SMS code) → receipt.create op.
// Works offline (SMS code is online-only). The form survives reload via the encrypted drafts store.
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { cx } from "@/shared/format";
import { Button } from "@/components/atoms/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/atoms/field";
import { Sheet } from "@/components/atoms/dialog";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { useFieldCopy, fill } from "@/lib/field/copy";
import { copyC } from "@/lib/field/copy-c";
import { enqueue, putDraft, getDraft, delDraft } from "@/lib/field/sync";
import { useFieldMe } from "@/lib/field/api";
import { useOnline } from "@/lib/field/net";
import type { FieldVisit, ReceiptItem, L3 } from "@/shared/field/types";
import type { Captured } from "@/lib/field/image";
import { PhotoCapture } from "@/components/molecules/field/field";
import { hhmm } from "@/components/atoms/field-agent";
import { OtpConfirm } from "@/components/molecules/field/field";
import type { SignatureResult } from "@/components/molecules/field/field";

const SignaturePad = dynamic(() => import("@/components/molecules/field/field").then((m) => m.SignaturePad), { ssr: false });
const KINDS = ["statutes", "id_copy", "certificate", "contract", "form", "other"] as const;
type Draft = { direction: "collected" | "returned"; items: ReceiptItem[]; notes: string; photo: Captured | null };

export function ReceiptBuilder({ visit, direction: initialDir = "collected", supersedes, onSaved, onCancel }: {
  visit: FieldVisit; direction?: "collected" | "returned"; supersedes?: { id: string; ref: string } | null; onSaved: () => void; onCancel?: () => void;
}) {
  const { locale, c } = useFieldCopy();
  const t = copyC(locale);
  const toast = useToast();
  const me = useFieldMe();
  const online = useOnline();
  const draftKey = `receipt:${visit.id}`;
  const [d, setD] = useState<Draft>(() => ({
    direction: initialDir, notes: "", photo: null,
    items: visit.checklist.filter((x) => x.required).map((x) => ({ label: x.label_i18n[locale], docKind: "other", original: true, pages: 1 })),
  }));
  const [restored, setRestored] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sign, setSign] = useState<false | "pad" | "sms">(false);
  const [now, setNow] = useState(0);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe: reads browser-only state after mount
  useEffect(() => { void getDraft<Draft>(draftKey).then((x) => { if (x && !supersedes) setD(x); setRestored(true); }); setNow(Date.now()); }, [draftKey, supersedes]);
  useEffect(() => { if (restored) void putDraft(draftKey, d); }, [d, draftKey, restored]);

  const setItem = (i: number, p: Partial<ReceiptItem>) => setD((x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, ...p } : it)) }));
  const items = d.items.filter((i) => i.label.trim());

  function ask() {
    if (!items.length) return setErr(t.noItems);
    setErr(null); setSign("pad");
  }

  async function save(s: { method: "drawn" | "typed" | "otp"; png?: string; typedName?: string; clientName: string; locale: L3; signedAt: string }) {
    try {
      await enqueue({
        kind: "receipt.create", visitId: visit.id, localPrefix: "CR",
        body: {
          direction: d.direction, items, client_name: s.clientName, signature_method: s.method, signature_png: s.png, typed_name: s.typedName,
          otp_verified: s.method === "otp" || undefined, signed_at: s.signedAt, locale_shown: s.locale,
          consent_text_id: `custody.${d.direction}.v1`, condition_notes: d.notes.trim() || undefined, items_photo: d.photo?.dataUrl, supersedes_id: supersedes?.id,
        },
      });
      await delDraft(draftKey);
      setSign(false);
      toast({ title: t.complete, tone: "success" });
      onSaved();
    } catch { setErr(t.saveFailed); setSign(false); }
  }

  return (
    <section aria-labelledby="rb-title" className="m-rise grid gap-5 bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="rb-title" className="flex-1 text-card-title">{t.newReceipt}</h2>
        {supersedes && <span className="bg-warning-bg px-2.5 py-1 text-eyebrow normal-case">{fill(t.corrects, { ref: supersedes.ref })}</span>}
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-label">{t.direction}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["collected", "returned"] as const).map((dir) => (
            <label key={dir} className={cx("flex min-h-12 cursor-pointer items-center gap-2 border px-3 text-small font-medium", d.direction === dir ? "border-secondary bg-navy-50" : "border-border")}>
              <input type="radio" name="rb-dir" className="size-5 accent-navy-700" checked={d.direction === dir} onChange={() => setD((x) => ({ ...x, direction: dir }))} />
              {dir === "collected" ? t.collected : t.returned}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-label">{t.items} <span className="text-fg-subtle tabular">({items.length})</span></legend>
        <ol className="grid gap-3">
          {d.items.map((it, i) => (
            <li key={i} className="grid gap-3 border border-border p-3 sm:grid-cols-[1fr_10rem]">
              <Field label={`${t.itemLabel} ${i + 1}`}>{({ id }) => <Input id={id} value={it.label} onChange={(e) => setItem(i, { label: e.target.value })} />}</Field>
              <Field label={t.docKind}>{({ id }) => (
                <Select id={id} value={it.docKind} onChange={(e) => setItem(i, { docKind: e.target.value })}>
                  {KINDS.map((k) => <option key={k} value={k}>{t.kinds[k]}</option>)}
                </Select>
              )}</Field>
              <div className="flex flex-wrap items-end gap-4 sm:col-span-2">
                <Checkbox label={it.original ? t.original : `${t.original} (${t.copy})`} checked={it.original} onChange={(e) => setItem(i, { original: e.target.checked })} />
                <Field label={t.pages} className="w-24">{({ id }) => <Input id={id} type="number" inputMode="numeric" min={1} max={500} value={it.pages} onChange={(e) => setItem(i, { pages: Math.max(1, Number(e.target.value) || 1) })} />}</Field>
                <Button variant="ghost" size="sm" className="ml-auto" aria-label={fill(t.removeItem, { n: i + 1 })} onClick={() => setD((x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }))}>
                  <Icon name="x" size={16} aria-hidden />{c.remove}
                </Button>
              </div>
            </li>
          ))}
        </ol>
        <Button variant="outline" onClick={() => setD((x) => ({ ...x, items: [...x.items, { label: "", docKind: "other", original: true, pages: 1 }] }))}>
          <Icon name="plus" size={16} aria-hidden />{t.addItem}
        </Button>
      </fieldset>

      <Field label={t.condition} hint={t.conditionHint}>{({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} maxLength={1000} value={d.notes} onChange={(e) => setD((x) => ({ ...x, notes: e.target.value }))} />}</Field>

      <dl className="grid grid-cols-3 gap-2 bg-ink-100 p-3 text-small">
        <div><dt className="text-eyebrow text-fg-subtle">{t.place}</dt><dd className="font-medium">{visit.institution ?? visit.address}</dd></div>
        <div><dt className="text-eyebrow text-fg-subtle">{t.time}</dt><dd className="font-medium tabular">{now ? hhmm(new Date(now).toISOString(), locale) : "—"}</dd></div>
        <div><dt className="text-eyebrow text-fg-subtle">{t.agent}</dt><dd className="font-medium">{me.data?.name ?? "—"}</dd></div>
      </dl>

      <PhotoCapture label={t.itemsPhoto} value={d.photo} onCapture={({ file, ...p }) => { void file; setD((x) => ({ ...x, photo: p })); }} />

      {err && <p role="alert" className="text-small font-medium text-danger">{err}</p>}
      <div className="flex flex-wrap gap-2 [&>*]:min-h-12 [&>*]:flex-1">
        {onCancel && <Button variant="outline" onClick={onCancel}>{t.cancel}</Button>}
        <Button size="lg" onClick={ask}>{t.askSign}</Button>
      </div>

      <Sheet open={!!sign} onClose={() => setSign(false)} side="bottom" title={t.signTitle} className="h-dvh max-h-dvh">
        <div className="mb-4 flex gap-1 bg-ink-100 p-1" role="group" aria-label={t.signTitle}>
          <button type="button" aria-pressed={sign === "pad"} onClick={() => setSign("pad")} className={cx("h-10 flex-1 text-small font-medium", sign === "pad" ? "bg-surface shadow-sm" : "text-fg-muted")}>{t.draw} / {t.type}</button>
          <button type="button" aria-pressed={sign === "sms"} onClick={() => setSign("sms")} className={cx("h-10 flex-1 text-small font-medium", sign === "sms" ? "bg-surface shadow-sm" : "text-fg-muted")}>
            {t.sms}{!online && <span className="sr-only"> — {t.smsOffline}</span>}
          </button>
        </div>
        {sign === "pad" && (
          <SignaturePad clientName={visit.client.name} clientLanguage={visit.client.language} draftKey={`sig:${visit.id}`}
            consent={d.direction === "returned" ? (l, n) => fill(copyC(l).consentReturn[l], { name: n }) : undefined}
            onSave={(s: SignatureResult) => void save(s)} onCancel={() => setSign(false)} />
        )}
        {sign === "sms" && (
          <OtpConfirm visitId={visit.id} phoneMasked={visit.client.phoneMasked}
            onVerified={(at) => void save({ method: "otp", clientName: visit.client.name, locale: visit.client.language, signedAt: at })} />
        )}
      </Sheet>
    </section>
  );
}
