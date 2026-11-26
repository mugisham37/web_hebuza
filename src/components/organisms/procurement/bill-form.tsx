"use client";
// B2 Enter bill (board 07 BL2 + fixes: explicit VAT incl/excl toggle, live duplicate block, PO/contract/no-PO link, draft restore).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { formatDateTime } from "@/shared/format";
import { useUrlParams } from "@/lib/url-state";
import { newIdempotencyKey } from "@/lib/api/client";
import { uploadFile } from "@/lib/api/upload";
import { errorCopy } from "@/lib/api/error-copy";
import { dueDate } from "@/shared/procurement/rules";
import { checkDuplicate, useBillOptions, useCreateBill, type BillInput } from "@/lib/procurement/de";
import { fill } from "@/content/pages/procurement-common";
import { PageHead } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { Button } from "@/components/atoms/button";
import { ErrorSummary, Field, Input, Radio, Select, Textarea } from "@/components/atoms/field";
import { FileDrop } from "@/components/atoms/file-drop";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { Pill, useP } from "@/components/atoms/procurement";
import { PanelErr, ProcLink, VatLines, todayIso, useDraft, type DraftLine } from "@/components/molecules/procurement/procurement";
import { useDE } from "@/components/organisms/procurement/bills";

type Draft = { vendorId: string; invoiceNo: string; invoiceDate: string; dueOn: string; link: "po" | "contract" | "none" | ""; poNo: string; contractRef: string; just: string; mode: "excl" | "incl"; lines: DraftLine[]; file: { id: string; name: string } | null };
const blank = (): Draft => ({ vendorId: "", invoiceNo: "", invoiceDate: todayIso(), dueOn: "", link: "", poNo: "", contractRef: "", just: "", mode: "excl", lines: [{ id: "l1", description: "", qty: 1, unitPrice: 0, vatable: true }], file: null });

export function BillForm() {
  const c = useDE();
  const p = useP();
  const { locale } = useI18n();
  const { user } = useSession();
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const u = useUrlParams();
  const opts = useBillOptions();
  const create = useCreateBill();
  const [key] = useState(newIdempotencyKey);
  const draft = useDraft<Draft>(`bill-draft:${user?.id ?? "anon"}`, (() => {
    const b = blank();
    const po = u.get("po"), ct = u.get("contract");
    return po ? { ...b, link: "po", poNo: po } : ct ? { ...b, link: "contract", contractRef: ct } : b;
  })());
  const d = draft.value;
  const set = (patch: Partial<Draft>) => draft.save({ ...d, ...patch });
  const [dup, setDup] = useState<{ billNo: string; vendorName: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErr, setFormErr] = useState<string | null>(null);

  if (opts.isPending) return <div className="grid gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 m-shimmer" />)}</div>;
  if (opts.isError) return <PanelErr onRetry={() => opts.refetch()} />;
  const o = opts.data;
  const vendor = o.vendors.find((v) => v.id === d.vendorId);
  const pos = o.pos.filter((x) => !d.vendorId || x.vendorId === d.vendorId);
  const contracts = o.contracts.filter((x) => !d.vendorId || x.vendorId === d.vendorId);

  function pickVendor(id: string) {
    const v = o.vendors.find((x) => x.id === id);
    set({ vendorId: id, dueOn: v && d.invoiceDate ? dueDate(d.invoiceDate, v.terms) : d.dueOn, poNo: "", contractRef: "" });
    setDup(null);
  }
  function pickPo(no: string) {
    const po = o.pos.find((x) => x.no === no);
    set({ poNo: no, vendorId: po?.vendorId ?? d.vendorId, lines: po ? po.lines.map((l) => ({ id: l.id, description: l.description, qty: l.received, unitPrice: l.unitPrice, vatable: l.vatable })) : d.lines });
  }
  function pickContract(ref: string) {
    const ct = o.contracts.find((x) => x.ref === ref);
    const v = o.vendors.find((x) => x.id === ct?.vendorId);
    set({ contractRef: ref, vendorId: ct?.vendorId ?? d.vendorId, mode: "incl", dueOn: ct && v ? dueDate(d.invoiceDate, v.terms, ct.dueDay) : d.dueOn,
      lines: ct ? [{ id: "l1", description: ct.title, qty: 1, unitPrice: ct.amount, vatable: v?.vatRegistered ?? true }] : d.lines });
  }
  async function checkDup() {
    if (!d.vendorId || !d.invoiceNo.trim()) return setDup(null);
    try { const r = await checkDuplicate(d.vendorId, d.invoiceNo); setDup(r.duplicate && r.billNo ? { billNo: r.billNo, vendorName: r.vendorName ?? "" } : null); } catch { /* server re-checks on save */ }
  }
  async function save(submit: boolean) {
    const e: Record<string, string> = {};
    if (!d.file) e.file = c.form.errors.file;
    if (!d.vendorId) e.vendor = c.form.errors.supplier;
    if (!d.invoiceNo.trim()) e.invoiceNo = c.form.errors.invoiceNo;
    if (!d.invoiceDate) e.invoiceDate = c.form.errors.invoiceDate;
    if (submit && (!d.link || (d.link === "po" && !d.poNo) || (d.link === "contract" && !d.contractRef) || (d.link === "none" && d.just.trim().length < 10))) e.link = c.form.errors.link;
    if (!d.lines.some((l) => l.qty > 0 && l.unitPrice > 0) || d.lines.some((l) => !l.description.trim())) e.lines = c.form.errors.lines;
    setErrors(e);
    setFormErr(null);
    if (Object.keys(e).length || dup) return;
    const input: BillInput = {
      vendorId: d.vendorId, vendorInvoiceNo: d.invoiceNo, invoiceDate: d.invoiceDate, dueOn: d.dueOn, poNo: d.link === "po" ? d.poNo : undefined,
      contractRef: d.link === "contract" ? d.contractRef : undefined, noPoJustification: d.link === "none" ? d.just : undefined, vatMode: d.mode, lines: d.lines, file: d.file ?? undefined, submit,
    };
    try {
      const b = await create.mutateAsync({ ...input, idempotencyKey: key });
      draft.clear();
      const exc = b.status === "match_exception";
      toast({ title: fill(exc ? c.form.exception : submit ? c.form.done : c.form.draftDone, { no: b.no }), body: submit && !exc ? fill(c.form.next, { name: b.route === "executive" ? "Alice Mutoni" : "Patrick Niyonzima" }) : undefined, tone: exc ? "danger" : "success" });
      router.push(localHref(locale, `/procurement/bills/${b.no}${exc ? "?tab=match" : ""}`));
    } catch (x) { setFormErr(errorCopy(x, locale)); if (x && (x as { errorType?: string }).errorType === "duplicate_invoice") checkDup(); }
  }
  const sumErrors = Object.entries(errors).map(([field, message]) => ({ field, message }));
  return (
    <div className="grid gap-5">
      <PageHead title={c.form.title} sub={c.form.sub} back={<ProcLink href="/procurement/bills" className="text-small text-fg-muted underline-offset-4 hover:underline">← {c.bills.title}</ProcLink>} />
      {draft.restoredAt && (
        <p role="status" className="flex flex-wrap items-center gap-3 bg-info-bg px-4 py-2 text-small">
          {fill(c.form.restored, { when: formatDateTime(draft.restoredAt, locale) })}
          <button type="button" className="underline underline-offset-4" onClick={() => draft.clear()}>{c.form.discard}</button>
        </p>
      )}
      {sumErrors.length > 0 && <ErrorSummary title={c.form.errorTitle} errors={sumErrors} />}
      {formErr && <p role="alert" className="bg-danger-bg px-4 py-3 text-small text-danger">{formErr}</p>}
      <form className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]" onSubmit={(e) => { e.preventDefault(); save(true); }}>
        {/* invoice viewer side (desktop) */}
        <section className="grid content-start gap-3 border border-border bg-surface p-4 lg:sticky lg:top-20">
          <Field id="file" label={c.form.file} hint={c.form.fileHint} error={errors.file}>{() => (
            d.file ? (
              <div className="flex items-center justify-between gap-2 bg-bg-subtle px-3 py-3 text-small">
                <span className="flex min-w-0 items-center gap-2"><Icon name="fileCheck" size={16} aria-hidden /><span className="truncate">{d.file.name}</span></span>
                <button type="button" className="text-link underline underline-offset-4 hover:text-link-hover" onClick={() => set({ file: null })}>{p.common.edit}</button>
              </div>
            ) : <FileDrop accept="application/pdf,image/*" maxSizeMb={10} camera onFiles={(f) => f[0] && uploadFile(f[0], "bill").then((u) => set({ file: { id: u.id, name: u.name } }), (e) => toast({ title: String(e instanceof Error ? e.message : e), tone: "danger" }))} />
          )}</Field>
          <div aria-hidden className="grid h-40 place-items-center border border-dashed border-border-strong text-small text-fg-subtle">
            <span className="flex items-center gap-2"><Icon name="sparkle" size={14} />{c.form.ocr}</span>
          </div>
        </section>
        <section className="grid content-start gap-4">
          <Field id="vendor" label={c.form.supplier} error={errors.vendor}>{(a) => (
            <Select id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} value={d.vendorId} onChange={(e) => pickVendor(e.target.value)}>
              <option value="">{c.form.choose}</option>
              {o.vendors.map((v) => <option key={v.id} value={v.id} disabled={v.status === "blocked"}>{v.name} · {v.code}{v.status === "blocked" ? ` (${p.status.blocked})` : ""}</option>)}
            </Select>
          )}</Field>
          {vendor?.status === "blocked" && <p role="alert" className="text-small text-danger">{fill(c.form.blocked, { reason: vendor.blockReason ?? "" })}</p>}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="invoiceNo" label={c.form.invoiceNo} error={errors.invoiceNo}>{(a) => (
              <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid || !!dup} maxLength={40} value={d.invoiceNo} onChange={(e) => { set({ invoiceNo: e.target.value }); setDup(null); }} onBlur={checkDup} />
            )}</Field>
            <Field id="invoiceDate" label={c.form.invoiceDate} error={errors.invoiceDate}>{(a) => (
              <Input id={a.id} type="date" aria-invalid={a.invalid} value={d.invoiceDate} max={todayIso()} onChange={(e) => set({ invoiceDate: e.target.value, dueOn: vendor ? dueDate(e.target.value, vendor.terms) : d.dueOn })} />
            )}</Field>
            <Field id="dueOn" label={c.form.dueOn} hint={vendor ? fill(c.form.dueHint, { n: vendor.terms }) : undefined}>{(a) => (
              <Input id={a.id} type="date" aria-describedby={a.describedBy} value={d.dueOn} min={d.invoiceDate} onChange={(e) => set({ dueOn: e.target.value })} />
            )}</Field>
          </div>
          {dup && (
            <p role="alert" className="flex flex-wrap items-center gap-2 bg-danger-bg px-3 py-2 text-small text-danger m-shake">
              <Icon name="layers" size={14} aria-hidden />{fill(c.form.dup, { no: d.invoiceNo, name: dup.vendorName, bill: dup.billNo })}
              <ProcLink href={`/procurement/bills/${dup.billNo}`} className="font-medium underline underline-offset-4">{fill(c.form.openDup, { bill: dup.billNo })}</ProcLink>
            </p>
          )}
          <fieldset className="grid gap-2" aria-describedby={errors.link ? "link-err" : undefined}>
            <legend className="text-label">{c.form.link}</legend>
            {errors.link && <p id="link-err" className="text-small font-medium text-danger">{errors.link}</p>}
            <div className="flex flex-wrap gap-4">
              <Radio name="link" checked={d.link === "po"} onChange={() => set({ link: "po" })} label={c.form.linkPo} />
              <Radio name="link" checked={d.link === "contract"} onChange={() => set({ link: "contract" })} label={c.form.linkContract} />
              <Radio name="link" checked={d.link === "none"} onChange={() => set({ link: "none" })} label={c.form.linkNone} />
            </div>
            {d.link === "po" && (
              <Select aria-label={c.form.po} value={d.poNo} onChange={(e) => pickPo(e.target.value)} className="m-rise">
                <option value=""></option>
                {pos.map((x) => <option key={x.no} value={x.no}>{x.no} · {o.vendors.find((v) => v.id === x.vendorId)?.name}</option>)}
              </Select>
            )}
            {d.link === "contract" && (
              <Select aria-label={c.form.contract} value={d.contractRef} onChange={(e) => pickContract(e.target.value)} className="m-rise">
                <option value=""></option>
                {contracts.map((x) => <option key={x.ref} value={x.ref}>{x.ref} · {x.title}</option>)}
              </Select>
            )}
            {d.link === "none" && (
              <div className="grid gap-1 m-rise">
                <Textarea aria-label={c.form.justification} rows={3} maxLength={1000} value={d.just} onChange={(e) => set({ just: e.target.value })} placeholder={c.form.justification} />
                <p className="flex items-center gap-2 text-eyebrow text-fg-muted"><Pill tone="warning" icon="shield">{p.reasons.no_po}</Pill>{c.form.justHint}</p>
              </div>
            )}
          </fieldset>
          <div className="grid gap-2">
            <h2 className="text-label">{c.form.lines}</h2>
            {errors.lines && <p className="text-small font-medium text-danger">{errors.lines}</p>}
            <VatLines lines={d.lines} mode={d.mode} onMode={(m) => set({ mode: m })} onChange={(l) => set({ lines: l })} vatRegistered={vendor?.vatRegistered ?? true} />
          </div>
          <div className="sticky bottom-16 z-10 -mx-gutter flex flex-wrap justify-end gap-2 border-t border-border bg-surface/95 px-gutter py-3 backdrop-blur lg:bottom-0 lg:mx-0 lg:px-0">
            <Button type="button" variant="outline" disabled={!online || create.isPending} onClick={() => save(false)}>{c.form.saveDraft}</Button>
            <Button type="submit" variant="primary" dots loading={create.isPending} disabled={!online || !!dup || vendor?.status === "blocked"} className="m-press">{c.form.submit}</Button>
          </div>
        </section>
      </form>
    </div>
  );
}
