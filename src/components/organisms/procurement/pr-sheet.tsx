"use client";
// PR0 raise sheet + My requests drawer (plan 12 §7 PR0, board 05 PR1/PR4). Lazy-loaded by pr-mount.tsx.
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { stripLocale } from "@/shared/i18n/config";
import { useSession } from "@/lib/auth/session";
import { workspaceForPath } from "@/shared/auth/roles";
import { setUrlParams } from "@/lib/url-state";
import { newIdempotencyKey } from "@/lib/api/client";
import { cx, formatDate, formatMoney, formatRelative } from "@/shared/format";
import { quotesRequired, totals, DEFAULT_LIMITS } from "@/shared/procurement/rules";
import { usePr, usePrContext, usePrs, useCreatePr, useSubmitPr, useVendorOptions, useWithdrawPr, type PrDetail } from "@/lib/procurement/c";
import type { Quote } from "@/shared/procurement/types";
import { fill } from "@/content/pages/procurement-common";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { DateInput, ErrorSummary, Field, Input, Select, Textarea, Checkbox } from "@/components/atoms/field";
import { FileDrop } from "@/components/atoms/file-drop";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { useOnline } from "@/components/atoms/hooks";
import { Amount, BudgetBar, DocNo, ProcPill, useP } from "@/components/atoms/procurement";
import { ProcLink, QuoteCompare, RoutePreview, useDraft } from "@/components/molecules/procurement/procurement";
import { PrStepper, useC, useErr } from "@/components/molecules/procurement/procurement";

type Draft = {
  title: string; lines: { id: string; description: string; qty: number; unitPrice: number }[]; budgetCategory: string; neededBy: string; justification: string;
  vendorId: string; vendorFreeText: string; quotes: Quote[]; chosenQuoteId?: string; chosenReason: string; waive: boolean; waiveReason: string;
};
const EMPTY: Draft = { title: "", lines: [{ id: "l1", description: "", qty: 1, unitPrice: 0 }], budgetCategory: "", neededBy: "", justification: "", vendorId: "",
  vendorFreeText: "", quotes: [], chosenReason: "", waive: false, waiveReason: "" };
const OTHER = "__other";

export function PurchaseRequestSheet({ onClose }: { onClose: () => void }) {
  const c = useC();
  const p = useP();
  const { locale } = useI18n();
  const { user } = useSession();
  const toast = useToast();
  const err = useErr();
  const online = useOnline();
  const path = stripLocale(usePathname());
  const ctx = usePrContext();
  const vendors = useVendorOptions();
  const create = useCreatePr();
  const draft = useDraft<Draft>(`pr-draft:${user?.id ?? "anon"}`, EMPTY);
  const d = draft.value;
  const set = (patch: Partial<Draft>) => draft.save({ ...d, ...patch });
  const [key] = useState(newIdempotencyKey);
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));

  const total = totals(d.lines.map((l) => { const n = Math.round(l.qty * l.unitPrice); return { net: n, vat: 0, total: n }; })).total;
  const budgets = ctx.data?.budgets ?? [];
  const budget = budgets.find((b) => b.code === d.budgetCategory);
  const need = ctx.data ? quotesRequired(total, { ...DEFAULT_LIMITS, quoteThreshold: ctx.data.quoteThreshold, quotesRequired: ctx.data.quotesRequired }) : 0;
  const missing = Math.max(0, need - d.quotes.length);
  const cheapest = d.quotes.length ? Math.min(...d.quotes.map((q) => q.amount || Infinity)) : 0;
  const chosen = d.quotes.find((q) => q.id === d.chosenQuoteId);
  const errOf = (f: string) => errors.find((e) => e.field === f)?.message;

  function validate() {
    const e: { field: string; message: string }[] = [];
    if (d.lines.some((l) => !l.description.trim() || !(l.qty > 0) || !(l.unitPrice > 0))) e.push({ field: "pr-lines", message: c.sheet.errLines });
    if (!d.budgetCategory) e.push({ field: "pr-category", message: c.sheet.errCategory });
    if (!d.neededBy || d.neededBy < today) e.push({ field: "pr-needed", message: c.sheet.errDate });
    if (d.justification.trim().length < 10) e.push({ field: "pr-just", message: c.sheet.errJust });
    if (missing && !(d.waive && d.waiveReason.trim())) e.push({ field: "pr-quotes", message: fill(c.sheet.errQuotes, { n: need }) });
    if (chosen && chosen.amount > cheapest && !d.chosenReason.trim()) e.push({ field: "pr-quotes", message: c.sheet.errReason });
    setErrors(e);
    return !e.length;
  }
  async function submit() {
    setFormErr(null);
    if (!validate()) return;
    try {
      const r = await create.mutateAsync({
        idempotencyKey: key, title: d.title, lines: d.lines, budgetCategory: d.budgetCategory, neededBy: d.neededBy, justification: d.justification,
        vendorId: d.vendorId && d.vendorId !== OTHER ? d.vendorId : undefined, vendorFreeText: d.vendorId === OTHER ? d.vendorFreeText : undefined,
        quotes: d.quotes, chosenQuoteId: d.chosenQuoteId, chosenReason: d.chosenReason || undefined, waiveReason: missing && d.waive ? d.waiveReason : undefined,
        workspace: workspaceForPath(path) ?? "procurement",
      });
      draft.clear();
      toast({ title: fill(c.sheet.submitted, { no: r.no, route: r.route === "executive" ? fill(p.route.executive, { name: "Alice Mutoni" }) : fill(p.route.financeName, { name: "Patrick Niyonzima" }) }), tone: "success" });
      onClose();
    } catch (e) { setFormErr(err(e, { n: need })); }
  }
  function addFiles(files: File[]) {
    set({ quotes: [...d.quotes, ...files.map((f, i) => ({ id: `q-${Date.now()}-${i}`, name: f.name, size: f.size, vendorName: "", amount: 0 }))] });
  }
  const setQuote = (id: string, patch: Partial<Quote>) => set({ quotes: d.quotes.map((q) => (q.id === id ? { ...q, ...patch } : q)) });

  return (
    <Dialog open onClose={onClose} side="right" title={c.sheet.title} description={c.sheet.sub} className="sm:max-w-2xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          {!online && <span className="mr-auto text-small text-fg-muted">{c.sheet.offline}</span>}
          <Button variant="secondary" onClick={() => { draft.save(d); toast({ title: c.sheet.saveDraft }); onClose(); }}>{c.sheet.saveDraft}</Button>
          <Button onClick={submit} loading={create.isPending} disabled={!online} dots className="m-press">{missing && !d.waive ? fill(c.sheet.addMore, { n: missing }) : c.sheet.submit}</Button>
        </div>
      }>
      <form className="grid gap-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {draft.restoredAt && (
          <p className="flex flex-wrap items-center gap-2 bg-info-bg px-3 py-2 text-small text-info">
            <Icon name="refresh" size={14} aria-hidden />{fill(c.sheet.restored, { time: formatRelative(draft.restoredAt, locale) })}
            <button type="button" className="ml-auto underline underline-offset-4" onClick={draft.clear}>{c.sheet.discard}</button>
          </p>
        )}
        {errors.length > 0 && <ErrorSummary title={c.sheet.errors} errors={errors} />}
        {formErr && <p role="alert" className="bg-danger-bg px-3 py-2 text-small text-danger">{formErr}</p>}
        <Field label={c.sheet.what} hint={c.sheet.whatHint} optional={c.sheet.supplierHint}>{(a) => <Input id={a.id} aria-describedby={a.describedBy} value={d.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} />}</Field>

        <fieldset id="pr-lines" className="grid gap-2">
          <legend className="mb-1 text-label">{c.sheet.lines}</legend>
          {errOf("pr-lines") && <p className="text-small font-medium text-danger">{errOf("pr-lines")}</p>}
          {d.lines.map((l, i) => (
            <div key={l.id} className="grid grid-cols-[1fr_5rem] gap-2 border border-border bg-surface p-3 sm:grid-cols-[1fr_5rem_9rem_auto] sm:items-end">
              <label className="grid gap-1 text-small sm:col-auto">{c.sheet.item}<Input value={l.description} maxLength={200} aria-invalid={!!errOf("pr-lines") && !l.description.trim()} onChange={(e) => set({ lines: d.lines.map((x, k) => (k === i ? { ...x, description: e.target.value } : x)) })} className="h-10" /></label>
              <label className="grid gap-1 text-small">{c.sheet.qty}<Input type="number" inputMode="decimal" min={0} value={l.qty || ""} onChange={(e) => set({ lines: d.lines.map((x, k) => (k === i ? { ...x, qty: Number(e.target.value) } : x)) })} className="h-10 text-right" /></label>
              <label className="col-span-2 grid gap-1 text-small sm:col-auto">{c.sheet.price}<Input type="number" inputMode="numeric" min={0} value={l.unitPrice || ""} onChange={(e) => set({ lines: d.lines.map((x, k) => (k === i ? { ...x, unitPrice: Math.round(Number(e.target.value)) } : x)) })} className="h-10 text-right" /></label>
              <div className="col-span-2 flex items-center justify-between gap-2 sm:col-auto sm:flex-col sm:items-end">
                <Amount value={Math.round(l.qty * l.unitPrice)} size="sm" className="font-medium" />
                <button type="button" aria-label={fill(c.sheet.removeLine, { n: i + 1 })} disabled={d.lines.length < 2} onClick={() => set({ lines: d.lines.filter((_, k) => k !== i) })} className="flex size-8 items-center justify-center text-fg-subtle hover:bg-ink-100 hover:text-fg disabled:opacity-30"><Icon name="x" size={14} aria-hidden /></button>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" size="sm" variant="secondary" className="m-press" onClick={() => set({ lines: [...d.lines, { id: `l${Date.now()}`, description: "", qty: 1, unitPrice: 0 }] })}><Icon name="plus" size={14} aria-hidden />{c.sheet.addLine}</Button>
            <p className="text-body">{c.sheet.total}: <Amount value={total} className="font-semibold" /></p>
          </div>
        </fieldset>

        <Field id="pr-category" label={c.sheet.category} error={errOf("pr-category")}>{(a) => (
          <div className="grid gap-2">
            <Select id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} value={d.budgetCategory} onChange={(e) => set({ budgetCategory: e.target.value })}>
              <option value="">{c.sheet.choose}</option>
              {budgets.map((b) => <option key={b.code} value={b.code}>{b.name} · {fill(c.sheet.used, { pct: Math.round(((b.committed + b.actual) * 100) / Math.max(1, b.annualBudget)) })}</option>)}
            </Select>
            {budget && <BudgetBar used={budget.committed + budget.actual} budget={budget.annualBudget} adding={total} name={budget.name} />}
          </div>
        )}</Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pr-needed" label={c.sheet.neededBy} error={errOf("pr-needed")}>{(a) => <DateInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} min={today} value={d.neededBy} onChange={(e) => set({ neededBy: e.target.value })} />}</Field>
          <Field label={c.sheet.supplier} optional={c.sheet.supplierHint}>{(a) => (
            <Select id={a.id} value={d.vendorId} onChange={(e) => set({ vendorId: e.target.value })}>
              <option value="">{c.sheet.choose}</option>
              {(vendors.data?.items ?? []).filter((v) => v.status === "active").map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              <option value={OTHER}>{c.sheet.notListed}</option>
            </Select>
          )}</Field>
        </div>
        {d.vendorId === OTHER && <Field label={c.sheet.supplierFree}>{(a) => <Input id={a.id} value={d.vendorFreeText} maxLength={120} onChange={(e) => set({ vendorFreeText: e.target.value })} />}</Field>}

        <Field id="pr-just" label={c.sheet.justification} hint={c.sheet.justificationHint} error={errOf("pr-just")}>{(a) => (
          <Textarea id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} rows={3} maxLength={1000} value={d.justification} onChange={(e) => set({ justification: e.target.value })} />
        )}</Field>

        <fieldset id="pr-quotes" className="grid gap-3">
          <legend className="mb-1 text-label">{c.sheet.quotes}</legend>
          <p className={cx("text-small m-tone", need ? "font-medium text-warning m-rise" : "text-fg-muted")}>
            {fill(p.quotes.rule, { n: ctx.data?.quotesRequired ?? 3, limit: formatMoney(ctx.data?.quoteThreshold ?? 500_000, "RWF", locale) })}
          </p>
          {errOf("pr-quotes") && <p className="text-small font-medium text-danger">{errOf("pr-quotes")}</p>}
          <FileDrop onFiles={addFiles} accept="application/pdf,image/jpeg,image/png" maxSizeMb={10} multiple />
          {d.quotes.map((q) => (
            <div key={q.id} className="grid gap-2 border border-border bg-surface p-3 sm:grid-cols-[1fr_1fr_9rem_auto] sm:items-end">
              <span className="flex min-w-0 items-center gap-2 text-small"><Icon name="file" size={14} aria-hidden /><span className="truncate" title={q.name}>{q.name}</span></span>
              <label className="grid gap-1 text-small">{c.sheet.quoteVendor}<Input value={q.vendorName} onChange={(e) => setQuote(q.id, { vendorName: e.target.value })} className="h-10" /></label>
              <label className="grid gap-1 text-small">{c.sheet.quoteAmount}<Input type="number" min={0} value={q.amount || ""} onChange={(e) => setQuote(q.id, { amount: Math.round(Number(e.target.value)) })} className="h-10 text-right" /></label>
              <button type="button" className="text-small text-danger underline underline-offset-4" onClick={() => set({ quotes: d.quotes.filter((x) => x.id !== q.id), chosenQuoteId: d.chosenQuoteId === q.id ? undefined : d.chosenQuoteId })}>{c.sheet.remove}</button>
            </div>
          ))}
          {d.quotes.length > 0 && d.quotes.every((q) => q.amount > 0 && q.vendorName) && (
            <QuoteCompare quotes={d.quotes} chosenId={d.chosenQuoteId} onChoose={(id) => set({ chosenQuoteId: id })} reason={d.chosenReason} onReason={(s) => set({ chosenReason: s })} required={need} />
          )}
          {missing > 0 && (
            <div className="grid gap-2 m-rise">
              <Checkbox label={c.sheet.waive} checked={d.waive} onChange={(e) => set({ waive: e.target.checked })} />
              {d.waive && <label className="grid gap-1 text-small">{c.sheet.waiveReason}<Textarea rows={2} value={d.waiveReason} onChange={(e) => set({ waiveReason: e.target.value })} /></label>}
            </div>
          )}
        </fieldset>

        {ctx.data && <RoutePreview amount={total} budget={budget} quotes={d.quotes.length} quotesNeeded={d.waive ? 0 : need} financeMax={ctx.data.financeMax} financeName="Patrick Niyonzima" />}
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------- My requests drawer (?pr=mine | ?pr=<no>)
export function MyRequestsDrawer({ no, onClose }: { no: string | null; onClose: () => void }) {
  const c = useC();
  const { locale } = useI18n();
  const list = usePrs(true, !no);
  const [tab, setTab] = useState<"active" | "history">("active");
  const ACTIVE = ["draft", "submitted", "info_requested", "approved", "ordered"];
  const rows = (list.data?.items ?? []).filter((r) => (tab === "active" ? ACTIVE.includes(r.status) && !r.delivered : !ACTIVE.includes(r.status) || r.delivered));
  return (
    <Dialog open onClose={onClose} side="right" title={c.mine.title}>
      {no ? <MyRequest no={no} /> : (
        <div className="grid gap-4">
          <div role="tablist" className="flex gap-1">
            {(["active", "history"] as const).map((t) => (
              <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={cx("h-9 px-4 text-small m-press", tab === t ? "bg-secondary text-on-secondary" : "bg-ink-100 text-fg-muted")}>{c.mine[t]}</button>
            ))}
            <Button size="sm" variant="secondary" className="ml-auto" onClick={() => setUrlParams({ pr: "new" })}><Icon name="plus" size={14} aria-hidden />{c.mine.raise}</Button>
          </div>
          {list.isPending ? <div className="grid gap-2">{[0, 1, 2].map((i) => <div key={i} className="h-20 m-shimmer" />)}</div>
            : list.isError ? <p role="alert" className="text-small text-danger">{c.errors.invalid_state}</p>
            : !rows.length ? <p className="py-10 text-center text-small text-fg-muted">{c.mine.none}</p> : (
            <ul className="grid gap-2 m-stagger">
              {rows.map((r, i) => (
                <li key={r.no} style={{ ["--i" as string]: i }}>
                  <button type="button" onClick={() => setUrlParams({ pr: r.no })} className="grid w-full gap-1 border border-border bg-surface p-3 text-left hover:border-navy-300 m-press">
                    <span className="flex items-center justify-between gap-2"><DocNo kind="PR" no={r.no} /><ProcPill state={r.status} machine="pr" /></span>
                    <span className="truncate text-small font-medium">{r.title}</span>
                    <span className="flex justify-between text-eyebrow text-fg-subtle"><span>{formatRelative(r.createdAt, locale)}</span><Amount value={r.estimatedTotal} size="sm" /></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Dialog>
  );
}

function MyRequest({ no }: { no: string }) {
  const c = useC();
  const p = useP();
  const { locale } = useI18n();
  const { user } = useSession();
  const toast = useToast();
  const err = useErr();
  const q = usePr(no);
  const resubmit = useSubmitPr();
  const withdraw = useWithdrawPr();
  const [reply, setReply] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [key] = useState(newIdempotencyKey);
  if (q.isPending) return <div className="h-60 m-shimmer" />;
  if (q.isError) return <p role="alert" className="text-small text-danger">{err(q.error)}</p>;
  const pr: PrDetail = q.data;
  const last = pr.decisions.at(-1);
  const proc = !!user?.roles.includes("staff:procurement");
  return (
    <div className="grid gap-4">
      <button type="button" onClick={() => setUrlParams({ pr: "mine" })} className="flex w-fit items-center gap-1 text-small text-fg-muted hover:text-fg"><Icon name="arrowRight" size={14} className="rotate-180" aria-hidden />{c.mine.back}</button>
      <header className="grid gap-1">
        <span className="flex items-center justify-between gap-2"><DocNo kind="PR" no={pr.no} copy /><ProcPill state={pr.status} machine="pr" /></span>
        <h3 className="text-card-title">{pr.title}</h3>
        <p className="text-small text-fg-muted">{pr.budget?.name} · {formatDate(pr.neededBy, locale)} · <Amount value={pr.estimatedTotal} size="sm" /></p>
      </header>
      {!["rejected", "withdrawn", "draft"].includes(pr.status) && <PrStepper pr={pr} />}
      {pr.status === "rejected" && last && <p className="bg-danger-bg px-3 py-2 text-small text-danger">{fill(c.mine.rejected, { name: last.by.name, reason: last.reason ?? "" })}</p>}
      {pr.status === "info_requested" && last && (
        <form className="grid gap-2 bg-warning-bg p-3 m-rise" onSubmit={async (e) => {
          e.preventDefault();
          try { await resubmit.mutateAsync({ no: pr.no, note: reply, idempotencyKey: key }); toast({ title: fill(c.mine.resubmitted, { no: pr.no }), tone: "success" }); setReply(""); }
          catch (x) { toast({ title: err(x), tone: "danger" }); }
        }}>
          <p className="text-small text-warning">{fill(c.mine.infoAsked, { name: last.by.name, note: last.reason ?? "" })}</p>
          <label className="grid gap-1 text-small">{c.mine.reply}<Textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} required /></label>
          <Button size="sm" type="submit" loading={resubmit.isPending} disabled={!reply.trim()} className="w-fit">{c.mine.resubmit}</Button>
        </form>
      )}
      <ul className="grid gap-1 border border-border bg-surface p-3 text-small">
        {pr.lines.map((l) => <li key={l.id} className="flex justify-between gap-2"><span>{l.qty} × {l.description}</span><Amount value={l.total} size="sm" /></li>)}
      </ul>
      {["draft", "submitted", "info_requested"].includes(pr.status) && (confirm ? (
        <div role="alertdialog" className="grid gap-2 border border-danger p-3 m-rise">
          <p className="text-small">{fill(c.mine.withdrawConfirm, { no: pr.no })}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setConfirm(false)}>{p.common.cancel}</Button>
            <Button size="sm" loading={withdraw.isPending} className="bg-danger" onClick={async () => {
              try { await withdraw.mutateAsync({ no: pr.no, idempotencyKey: key }); toast({ title: fill(c.mine.withdrawn, { no: pr.no }), tone: "success" }); setConfirm(false); }
              catch (x) { toast({ title: err(x), tone: "danger" }); }
            }}>{c.mine.withdraw}</Button>
          </div>
        </div>
      ) : <Button size="sm" variant="secondary" className="w-fit text-danger" onClick={() => setConfirm(true)}>{c.mine.withdraw}</Button>)}
      {proc && <ProcLink href={`/procurement/requests/${pr.no}`} className="text-small text-link underline underline-offset-4 hover:text-link-hover">{c.mine.openFull}</ProcLink>}
    </div>
  );
}
