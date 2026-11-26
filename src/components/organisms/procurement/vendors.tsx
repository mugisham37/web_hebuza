"use client";
// S2 supplier list + S4 add/edit sheet (board 03 SU1/SU3, fix: TIN masked in lists). ?sheet=new opens the add sheet.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { formatDate } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { newIdempotencyKey } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { useProcSettings } from "@/lib/procurement/api";
import { validTin } from "@/shared/procurement/rules";
import { checkDuplicate, useCreateVendor, useUpdateVendor, useVendors, type VendorInput, type VendorRow } from "@/lib/procurement/ab";
import type { BankKind, Vendor, VendorType } from "@/shared/procurement/types";
import { fill } from "@/content/pages/procurement-common";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { EmptyPanel } from "@/components/molecules/ops/ops";
import { PageHead } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Checkbox, Field, Input, Select } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { Amount, LockChip, ProcPill, VendorTypeIcon, useP } from "@/components/atoms/procurement";
import { DuplicateVendorHint } from "@/components/molecules/procurement/procurement";
import { QueryFail, TextField, useAB } from "@/components/molecules/procurement/procurement";
import { isForbidden } from "@/components/atoms/hooks";

const TYPES: VendorType[] = ["landlord", "supplier", "service_provider", "government_body"];

export function VendorsView() {
  const c = useAB().vendors;
  const p = useP();
  const { locale } = useI18n();
  const router = useRouter();
  const u = useUrlParams();
  const online = useOnline();
  const f = { q: u.get("q"), type: u.get("type"), status: u.get("status"), category: u.get("category"), bank: u.get("bank") };
  const q = useVendors(f);
  const budgets = useProcSettings().data?.budgets ?? [];
  const [focused, setFocused] = useState<string | null>(null);
  if (q.isError && isForbidden(q.error)) return <QueryFail error={q.error} onRetry={() => q.refetch()} notFound="" />;
  const rows = q.data?.items ?? [];
  const cols: OpsColumn<VendorRow>[] = [
    { key: "name", label: c.cols.name, wrap: true, sort: (r) => r.legalName, cell: (r) => (
      <span className="flex min-w-0 items-center gap-2"><VendorTypeIcon type={r.type} /><span className="min-w-0"><span className="block max-w-[16rem] truncate font-medium" title={r.legalName}>{r.legalName}</span><span className="text-eyebrow text-fg-subtle tabular">{r.code}</span></span></span>
    ) },
    { key: "type", label: c.cols.type, cell: (r) => <span className="text-small">{p.vendorType[r.type]}</span> },
    { key: "tin", label: c.cols.tin, card: false, cell: (r) => <span className="tabular text-small text-fg-muted">{r.tinMasked}</span> },
    { key: "cat", label: c.cols.categories, wrap: true, card: false, cell: (r) => <span className="text-small text-fg-muted">{r.categories.map((k) => budgets.find((b) => b.code === k)?.name ?? k).join(", ")}</span> },
    { key: "status", label: c.cols.status, wrap: true, cell: (r) => <span className="flex flex-wrap gap-1"><ProcPill state={r.status} machine="vendor" />{r.locked && <LockChip until={r.lockUntil ?? null} compact />}</span> },
    { key: "bills", label: c.cols.openBills, align: "right", sort: (r) => r.openBills, cell: (r) => <span className="tabular">{r.openBills}</span> },
    { key: "balance", label: c.cols.balance, align: "right", sort: (r) => r.balance, cell: (r) => <Amount value={r.balance} className="font-semibold" /> },
    { key: "last", label: c.cols.lastPayment, sort: (r) => r.lastPaymentAt ?? "", cell: (r) => <span className="text-small text-fg-muted">{r.lastPaymentAt ? formatDate(r.lastPaymentAt, locale) : ""}</span> },
  ];
  const sel = (key: keyof typeof f, label: string, opts: [string, string][]) => (
    <label className="grid gap-1 text-eyebrow text-fg-subtle">{label}
      <Select value={f[key] ?? ""} onChange={(e) => setUrlParams({ [key]: e.target.value || null })} className="h-10 text-small">
        <option value="">{c.f.any}</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
    </label>
  );
  const empty = (
    <div className="p-4">
      {f.q || f.type || f.status || f.category || f.bank ? <EmptyPanel title={fill(p.empty.search, { q: f.q ?? "" })} />
        : <EmptyPanel title={p.empty.suppliers} action={<Button onClick={() => setUrlParams({ sheet: "new" })}>{c.add}</Button>} />}
    </div>
  );
  return (
    <div className="grid gap-5">
      <PageHead title={c.title} sub={c.sub} actions={<Button data-guide="procurement-add-supplier" variant="primary" dots disabled={!online} onClick={() => setUrlParams({ sheet: "new" })} className="m-press"><Icon name="plus" size={16} aria-hidden />{c.add}</Button>} />
      <div className="flex flex-wrap items-end gap-3 m-rise">
        <label className="relative w-full max-w-xs">
          <span className="sr-only">{p.common.search}</span>
          <Icon name="search" size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
          <Input type="search" defaultValue={f.q ?? ""} placeholder={p.common.search} onChange={(e) => setUrlParams({ q: e.target.value || null })} className="h-10 pl-9 text-small" />
        </label>
        {sel("type", c.f.type, TYPES.map((t) => [t, p.vendorType[t]]))}
        {sel("status", c.f.status, (["active", "inactive", "blocked"] as const).map((s) => [s, p.status[s]]))}
        {sel("category", c.f.category, budgets.map((b) => [b.code, b.name]))}
        {sel("bank", c.f.bank, (["verified", "unverified"] as const).map((s) => [s, p.status[s]]))}
        {q.data && <span className="ml-auto text-small text-fg-muted tabular" aria-live="polite">{fill(c.count, { n: rows.length })}</span>}
      </div>
      <div className="border border-border bg-surface m-rise">
        <OpsTable rows={rows} columns={cols} rowKey={(r) => r.id} rowLabel={(r) => `${r.code} · ${r.legalName}`} label={c.title} loading={q.isPending}
          error={q.isError ? q.error : undefined} onRetry={() => q.refetch()} empty={empty} focused={focused} onFocus={setFocused} shortcuts pageSize={20}
          rowTone={(r) => (r.status === "blocked" ? "danger" : r.status === "inactive" ? "muted" : null)} onOpen={(r) => router.push(localHref(locale, `/procurement/suppliers/${r.id}`))} />
      </div>
      {u.get("sheet") === "new" && <VendorForm onClose={() => setUrlParams({ sheet: null })} onDone={(id) => router.push(localHref(locale, `/procurement/suppliers/${id}`))} />}
    </div>
  );
}

type Draft = VendorInput & { bankNo: string; bankKind: BankKind; bankLabel: string };
const blank = (): Draft => ({
  legalName: "", tradingName: "", type: "supplier", tin: "", rdbNumber: "", categories: [], contacts: [{ name: "", role: "", phone: "", email: "" }], address: "",
  paymentTermsDays: 30, vatRegistered: true, rating: undefined, bankNo: "", bankKind: "bank", bankLabel: "",
});
/** S4 add/edit. Edit never touches bank details (that is the bank-change flow, F-SUP-02). */
export function VendorForm({ vendor, onClose, onDone }: { vendor?: Vendor; onClose: () => void; onDone?: (id: string) => void }) {
  const c = useAB().vendors;
  const p = useP();
  const { locale } = useI18n();
  const toast = useToast();
  const budgets = useProcSettings().data?.budgets ?? [];
  const create = useCreateVendor();
  const update = useUpdateVendor();
  const [key] = useState(newIdempotencyKey);
  const [v, setV] = useState<Draft>(() => vendor ? { ...blank(), legalName: vendor.legalName, tradingName: vendor.tradingName, type: vendor.type, rdbNumber: vendor.rdbNumber, categories: vendor.categories, address: vendor.address, paymentTermsDays: vendor.paymentTermsDays, vatRegistered: vendor.vatRegistered, rating: vendor.rating, contacts: vendor.contacts.length ? vendor.contacts : blank().contacts } : blank());
  const [err, setErr] = useState<Record<string, string>>({});
  const [dups, setDups] = useState<{ id: string; code: string; name: string; why: "tin" | "name" }[]>([]);
  const [tinChecked, setTinChecked] = useState<boolean | null>(null);
  const set = (patch: Partial<Draft>) => setV((x) => ({ ...x, ...patch }));
  const dupCheck = async () => {
    if (!v.legalName && !v.tin) return;
    try { setDups((await checkDuplicate(v.tin, v.legalName, vendor?.id)).matches); } catch { /* hint only, never blocks saving */ }
  };
  async function submit() {
    const e: Record<string, string> = {};
    if (!v.legalName.trim()) e.legalName = c.form.required;
    if (!vendor || v.tin) { if (!validTin(v.tin)) e.tin = c.form.tinBad; }
    if (v.contacts.some((x) => x.email && !/^\S+@\S+\.\S+$/.test(x.email))) e.contacts = c.form.email;
    setErr(e);
    if (Object.keys(e).length) return;
    const input: Partial<VendorInput> = {
      legalName: v.legalName, tradingName: v.tradingName, type: v.type, rdbNumber: v.rdbNumber, categories: v.categories, contacts: v.contacts, address: v.address,
      paymentTermsDays: Number(v.paymentTermsDays) || 30, vatRegistered: v.vatRegistered, rating: v.rating, ...(v.tin && { tin: v.tin }),
    };
    try {
      if (vendor) {
        await update.mutateAsync({ id: vendor.id, ...input, idempotencyKey: key });
        toast({ title: fill(c.form.saved, { code: vendor.code }), tone: "success" });
        onClose();
      } else {
        const r = await create.mutateAsync({ ...(input as VendorInput), bank: v.bankNo ? { kind: v.bankKind, label: v.bankLabel || c.bankKinds[v.bankKind], number: v.bankNo } : undefined, idempotencyKey: key });
        toast({ title: `${fill(c.form.saved, { code: r.vendor.code })}${v.bankNo ? ` · ${c.form.bankNote}` : ""}`, tone: "success" });
        onClose(); onDone?.(r.vendor.id);
      }
    } catch (x) { setErr({ form: errorCopy(x, locale) }); }
  }
  const busy = create.isPending || update.isPending;
  return (
    <Dialog open onClose={onClose} side="right" title={vendor ? c.edit : c.add} footer={<Button onClick={submit} loading={busy} dots className="m-press">{p.common.save}</Button>}>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {err.form && <p role="alert" className="bg-danger-bg px-3 py-2 text-small text-danger">{err.form}</p>}
        <TextField label={c.form.legalName} value={v.legalName} maxLength={120} error={err.legalName} onChange={(x) => set({ legalName: x })} onBlur={dupCheck} />
        <TextField label={c.form.tradingName} optional={c.form.optional} value={v.tradingName ?? ""} maxLength={120} onChange={(x) => set({ tradingName: x })} />
        <Field label={c.form.type}>{(a) => (
          <Select id={a.id} value={v.type} onChange={(e) => set({ type: e.target.value as VendorType })}>{TYPES.map((t) => <option key={t} value={t}>{p.vendorType[t]}</option>)}</Select>
        )}</Field>
        <div className="grid gap-1">
          <div className="flex items-end gap-2">
            <div className="flex-1"><TextField label={c.form.tin} hint={vendor ? `${vendor.tinMasked} · ${c.form.tinHint}` : c.form.tinHint} inputMode="numeric" value={v.tin} error={err.tin}
              onChange={(x) => { set({ tin: x.replace(/[^\d\s]/g, "") }); setTinChecked(null); }} onBlur={dupCheck} optional={vendor ? c.form.optional : undefined} /></div>
            <Button type="button" size="sm" variant="secondary" className="mb-1" onClick={() => { setTinChecked(validTin(v.tin)); dupCheck(); }}>{c.form.tinCheck}</Button>
          </div>
          {tinChecked !== null && <p role="status" className={tinChecked ? "text-small text-success" : "text-small text-danger"}>{tinChecked ? c.form.tinOk : c.form.tinBad}</p>}
        </div>
        <DuplicateVendorHint matches={dups} />
        <TextField label={c.form.rdb} optional={c.form.optional} value={v.rdbNumber ?? ""} onChange={(x) => set({ rdbNumber: x })} />
        <fieldset className="grid gap-1.5">
          <legend className="mb-1 text-label">{c.form.categories}</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {budgets.map((b) => <Checkbox key={b.code} label={b.name} checked={v.categories.includes(b.code)} onChange={(e) => set({ categories: e.target.checked ? [...v.categories, b.code] : v.categories.filter((k) => k !== b.code) })} />)}
          </div>
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-label">{c.form.contacts}</legend>
          {err.contacts && <p className="text-small text-danger">{err.contacts}</p>}
          {v.contacts.map((ct, i) => (
            <div key={i} className="grid gap-2 border border-border p-3 sm:grid-cols-2">
              {(["name", "role", "phone", "email"] as const).map((k) => (
                <label key={k} className="grid gap-1 text-small">{c.form[k === "name" ? "contactName" : k === "role" ? "contactRole" : k]}
                  <Input type={k === "email" ? "email" : k === "phone" ? "tel" : "text"} value={ct[k] ?? ""} onChange={(e) => set({ contacts: v.contacts.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)) })} className="h-10" />
                </label>
              ))}
              {v.contacts.length > 1 && <button type="button" className="w-fit text-small text-danger underline" onClick={() => set({ contacts: v.contacts.filter((_, j) => j !== i) })}>{p.common.cancel}</button>}
            </div>
          ))}
          <Button type="button" size="sm" variant="secondary" className="w-fit" onClick={() => set({ contacts: [...v.contacts, { name: "", role: "", phone: "", email: "" }] })}><Icon name="plus" size={14} aria-hidden />{c.form.addContact}</Button>
        </fieldset>
        <TextField label={c.form.address} optional={c.form.optional} value={v.address ?? ""} onChange={(x) => set({ address: x })} />
        <TextField label={c.form.terms} type="number" min={0} max={180} value={v.paymentTermsDays} onChange={(x) => set({ paymentTermsDays: Number(x) })} />
        <Checkbox label={c.form.vat} checked={v.vatRegistered} onChange={(e) => set({ vatRegistered: e.target.checked })} />
        <div className="grid gap-1"><span className="text-label">{c.form.rating}</span><StarRatingInput value={v.rating} onChange={(r) => set({ rating: r })} /></div>
        {!vendor && (
          <fieldset className="grid gap-3 bg-bg-subtle p-3">
            <legend className="text-label">{c.form.bank} <span className="text-small text-fg-subtle">({c.form.optional})</span></legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-small">{c.form.bankKind}
                <Select value={v.bankKind} onChange={(e) => set({ bankKind: e.target.value as BankKind })}>{(["bank", "momo", "airtel"] as const).map((k) => <option key={k} value={k}>{c.bankKinds[k]}</option>)}</Select>
              </label>
              {v.bankKind === "bank" && <label className="grid gap-1 text-small">{c.form.bankLabel}<Input value={v.bankLabel} onChange={(e) => set({ bankLabel: e.target.value })} /></label>}
            </div>
            <label className="grid gap-1 text-small">{c.form.bankNo}<Input autoComplete="off" inputMode="numeric" value={v.bankNo} onChange={(e) => set({ bankNo: e.target.value })} /></label>
            <p className="text-eyebrow text-fg-muted">{c.form.bankNote}</p>
          </fieldset>
        )}
      </form>
    </Dialog>
  );
}
function StarRatingInput({ value, onChange }: { value?: number; onChange: (n: number) => void }) {
  return (
    <div role="radiogroup" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} / 5`} onClick={() => onChange(n)}
          className={`text-xl m-press ${value && n <= value ? "text-warning" : "text-border-strong"}`}>★</button>
      ))}
    </div>
  );
}
