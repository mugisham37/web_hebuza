"use client";
// U7 `/finance/invoices/new?client=&case=` (board 05 IN5, fixed: amounts are entered ex-VAT per line, VAT computed by kind).
// Standalone / retainer (series plan) / extra disbursement on a case. Save draft, or Save & issue through IssueDialog.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams } from "@/lib/url-state";
import { newIdempotencyKey, api } from "@/lib/api/client";
import { docTotals } from "@/lib/finance/money";
import { useBAction, useInvoiceForm, type NewInvoiceBody } from "@/lib/finance/b";
import type { DocLine } from "@/shared/finance/types";
import type { Locale } from "@/shared/i18n/config";
import { financeInvoices } from "@/content/pages/finance-invoices";
import { financeQuotes } from "@/content/pages/finance-quotes";
import { fill } from "@/content/pages/finance-common";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { DateInput, ErrorSummary, Field, Select } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { PanelError } from "@/components/molecules/ops/ops";
import { usePhone } from "@/components/atoms/step-up";
import { PageHead, SkeletonRows } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { LineEditor, TotalsPanel } from "@/components/molecules/finance/finance";
import { BackLink, useBError } from "@/components/molecules/finance/finance";
import { IssueDialog } from "@/components/organisms/finance/invoice-detail";

const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export function NewInvoiceView() {
  const { locale } = useI18n();
  const c = financeInvoices(locale);
  const form = useInvoiceForm();
  const phone = usePhone();
  const head = <PageHead back={<BackLink href="/finance/invoices">{c.back}</BackLink>} title={c.new.title} sub={c.new.sub} />;
  if (form.isPending) return <div className="grid gap-4">{head}<SkeletonRows n={5} /></div>;
  if (form.isError) return <div className="grid gap-4">{head}<PanelError what={c.new.title} onRetry={() => form.refetch()} /></div>;
  if (phone) return <div className="grid gap-4">{head}<p role="status" className="flex items-start gap-2 bg-bg-subtle p-4 text-small"><Icon name="laptop" size={18} aria-hidden className="shrink-0" />{c.phone.readOnly}</p></div>;
  return <div className="grid gap-5">{head}<Form data={form.data} /></div>;
}

function Form({ data }: { data: NonNullable<ReturnType<typeof useInvoiceForm>["data"]> }) {
  const { locale } = useI18n();
  const c = financeInvoices(locale);
  const cq = financeQuotes(locale);
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const p = useUrlParams();
  const presetCase = data.cases.find((x) => x.ref === p.get("case"));
  const [clientId, setClient] = useState(presetCase?.clientId ?? p.get("client") ?? "");
  const [caseRef, setCase] = useState(presetCase?.ref ?? "");
  const [series, setSeries] = useState<"standard" | "plan">("standard");
  const [dueAt, setDue] = useState(addDays(data.today, data.termsDays));
  const [lang, setLang] = useState<Locale>(locale);
  const [lines, setLines] = useState<DocLine[]>([{ kind: "service_fee", label: "", qty: 1, unit: 0 }]);
  const [tried, setTried] = useState(false);
  const [issueFor, setIssueFor] = useState<{ key: string; rev: number } | null>(null);
  const [key] = useState(newIdempotencyKey);
  const act = useBAction<{ key: string }>();
  const { onError, dialog } = useBError(() => null, () => {});
  const totals = docTotals(lines); // preview; the server recomputes
  const lbl = (l: DocLine) => (typeof l.label === "string" ? l.label : (l.label.en ?? ""));
  const errors = [
    !clientId && { field: "inv-client", message: c.new.errors.client },
    dueAt < data.today && { field: "inv-due", message: c.new.errors.due },
    (!lines.length || lines.some((l) => !lbl(l).trim()) || totals.total <= 0) && { field: "inv-lines", message: c.new.errors.lines },
  ].filter((x): x is { field: string; message: string } => !!x);
  const cases = data.cases.filter((x) => x.clientId === clientId);
  const err = (f: string) => (tried ? errors.find((e) => e.field === f)?.message : undefined);

  const save = (issue: boolean) => {
    setTried(true);
    if (errors.length) return;
    const body: NewInvoiceBody = { clientId, caseRef: caseRef || undefined, series, lines, dueAt, lang };
    act.mutate({ req: (h) => api.POST("/api/finance/invoices", { body, headers: h }), key }, {
      onSuccess: (r) => {
        toast({ title: c.new.created, tone: "success" });
        if (issue) setIssueFor({ key: r.key, rev: 1 });
        else router.push(localHref(locale, `/finance/invoices/${r.key}`));
      },
      onError,
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid min-w-0 gap-5 m-stagger">
        {tried && <ErrorSummary title={c.new.errors.title} errors={errors} />}
        <section style={{ ["--i" as string]: 0 }} className="grid gap-4 border border-border bg-white p-4 sm:p-5 md:grid-cols-2">
          <Field id="inv-client" label={c.new.client} error={err("inv-client")}>
            {({ id, invalid }) => (
              <Select id={id} aria-invalid={invalid} value={clientId} onChange={(e) => { setClient(e.target.value); setCase(""); }} className="h-11">
                <option value="">{c.new.pickClient}</option>{data.clients.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </Select>
            )}
          </Field>
          <Field label={c.new.case} hint={c.new.caseHint}>
            {({ id, describedBy }) => (
              <Select id={id} aria-describedby={describedBy} value={caseRef} disabled={!clientId} onChange={(e) => setCase(e.target.value)} className="h-11">
                <option value="">{c.new.noCase}</option>{cases.map((x) => <option key={x.ref} value={x.ref}>{x.ref} · {x.service}</option>)}
              </Select>
            )}
          </Field>
          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-label">{c.new.series}</legend>
            <div role="radiogroup" aria-label={c.new.series} className="flex w-fit flex-wrap bg-ink-100 p-1">
              {(["standard", "plan"] as const).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={series === k} onClick={() => setSeries(k)}
                  className={`h-9 px-4 text-small m-press ${series === k ? "bg-secondary text-on-navy" : "text-fg-muted hover:text-fg"}`}>{k === "plan" ? c.new.seriesPlan : c.new.seriesStandard}</button>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="inv-due" label={c.new.due} hint={fill(c.new.dueHint, { n: data.termsDays })} error={err("inv-due")}>
              {({ id, describedBy, invalid }) => <DateInput id={id} min={data.today} aria-describedby={describedBy} aria-invalid={invalid} value={dueAt} onChange={(e) => setDue(e.target.value)} className="h-11" />}
            </Field>
            <Field label={c.new.language}>
              {({ id }) => <Select id={id} value={lang} onChange={(e) => setLang(e.target.value as Locale)} className="h-11">{(["en", "rw", "fr"] as const).map((l) => <option key={l} value={l}>{cq.langs[l]}</option>)}</Select>}
            </Field>
          </div>
          {series === "plan" && <p className="flex items-center gap-2 bg-bg-tint p-3 text-small text-navy-800 md:col-span-2 m-rise"><Icon name="refresh" size={16} aria-hidden />{fill(c.new.recurringNote, { n: data.termsDays })}</p>}
        </section>
        <section id="inv-lines" tabIndex={-1} style={{ ["--i" as string]: 1 }} className="grid gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-card-title">{c.new.lines}</h2><p className="text-small text-fg-subtle">{c.new.linesHint}</p></div>
          {err("inv-lines") && <p className="text-small font-medium text-danger">{err("inv-lines")}</p>}
          <LineEditor lines={lines} onChange={setLines} />
        </section>
      </div>
      <aside className="grid content-start gap-4">
        <TotalsPanel totals={totals} />
        {!online && <p role="status" className="bg-bg-subtle p-3 text-small">{c.offline}</p>}
        <Button dots onClick={() => save(true)} disabled={!online} loading={act.isPending} className="m-press">{c.new.saveIssue}</Button>
        <Button variant="outline" onClick={() => save(false)} disabled={!online} loading={act.isPending}>{c.new.saveDraft}</Button>
        <Button variant="ghost" onClick={() => router.push(localHref(locale, "/finance/invoices"))}>{c.new.cancel}</Button>
      </aside>
      {issueFor && <IssueDialog invKey={issueFor.key} rev={issueFor.rev} series="INV"
        onClose={() => router.push(localHref(locale, `/finance/invoices/${issueFor.key}`))}
        onIssued={(no) => router.push(localHref(locale, `/finance/invoices/${no}`))} />}
      {dialog}
    </div>
  );
}
