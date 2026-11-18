"use client";
// U16 Accounting export wizard (board 12 RP3, Fix applied: PLACEHOLDER chart of accounts, balance computed server-side).
// period + format → account map → preview (debits = credits, else blocked) → step-up export (audited) → download + checksum.
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDate } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { newIdempotencyKey } from "@/lib/api/client";
import { ACCOUNTS, type Account } from "@/shared/finance/journal";
import { JOURNAL_FORMATS, journalExport, journalPreview, type JournalBody, type JournalFormat } from "@/lib/finance/a";
import { fill } from "@/content/pages/finance-common";
import { Icon } from "@/components/atoms/icon";
import { Button } from "@/components/atoms/button";
import { DateInput, ErrorSummary, Field, Input } from "@/components/atoms/field";
import { Stepper } from "@/components/atoms/misc";
import { PageHead, useNow } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { usePhone } from "@/components/atoms/step-up";
import { EmptyPanel, Panel, PanelError } from "@/components/molecules/ops/ops";
import { Amount, DemoValue, PeriodLabel } from "@/components/atoms/finance";
import { useStepUpAction } from "@/components/molecules/finance/finance";
import { useRp } from "@/components/organisms/finance/reports";

const STEPS = ["period", "map", "preview", "done"] as const;
type StepId = (typeof STEPS)[number];
const ACCS = Object.keys(ACCOUNTS) as Account[];
const CODE = /^[A-Za-z0-9.-]{1,12}$/;
type Done = { url?: string; name: string; checksum: string; rowCount?: number };

/** Balanced / unbalanced verdict card (board RP3 right column). */
export function BalanceCard({ debits, credits, balanced, count }: { debits: number; credits: number; balanced: boolean; count: number }) {
  const c = useRp().journal;
  return (
    <section aria-live="polite" className={cx("grid place-items-center gap-2 p-6 text-center m-rise", balanced ? "bg-success-bg" : "bg-danger-bg")}>
      <span className={cx("flex size-12 items-center justify-center rounded-full text-white", balanced ? "bg-success" : "bg-danger")}>
        <Icon name={balanced ? "check" : "x"} size={22} aria-hidden className={balanced ? "m-tick" : "m-shake"} />
      </span>
      <h2 className="text-h3">{balanced ? c.balanced : c.unbalanced}</h2>
      <p className="text-eyebrow text-fg-muted tabular">{fill(c.entries, { n: count })}</p>
      <dl className="mt-1 grid w-full max-w-xs gap-2 text-small">
        <div className="flex justify-between gap-3"><dt className="text-fg-muted">{c.debits}</dt><dd><Amount value={debits} size="md" /></dd></div>
        <div className="flex justify-between gap-3"><dt className="text-fg-muted">{c.credits}</dt><dd><Amount value={credits} size="md" /></dd></div>
      </dl>
    </section>
  );
}

export function AccountingExport() {
  const all = useRp();
  const c = all.journal;
  const { locale } = useI18n();
  const params = useUrlParams();
  const online = useOnline();
  const phone = usePhone();
  const now = useNow();
  const { run, dialog } = useStepUpAction();
  const today = now ? new Date(now).toISOString().slice(0, 10) : "";
  const step: StepId = (STEPS as readonly string[]).includes(params.get("step") ?? "") ? (params.get("step") as StepId) : "period";
  const from = params.get("from") ?? (today ? `${today.slice(0, 8)}01` : "");
  const to = params.get("to") ?? today;
  const format = ((JOURNAL_FORMATS as readonly string[]).includes(params.get("format") ?? "") ? params.get("format") : "generic_csv") as JournalFormat;
  // shortcut: account map lives in component state (resets on refresh), persist per user via /api/finance/settings when accounts mapping ships (lane F).
  const [map, setMap] = useState<Record<Account, string>>({ ...ACCOUNTS });
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [key] = useState(newIdempotencyKey);
  const [done, setDone] = useState<Done | null>(null);
  const [exporting, setExporting] = useState(false);
  const body: JournalBody = { from, to, format, map };
  const pv = useQuery({ queryKey: ["finance", "a", "journal", body], queryFn: () => journalPreview(body), enabled: step === "preview" && !!from && !!to, retry: false });
  const go = (s: StepId) => { setErrors([]); setUrlParams({ step: s === "period" ? null : s, from, to, format }); };
  const current = step === "done" && !done ? 2 : STEPS.indexOf(step);

  function next() {
    if (step === "period") {
      const e = !from || !to || from > to ? [{ field: "j-from", message: `${c.period}: ${from || "—"} – ${to || "—"}` }] : [];
      setErrors(e);
      if (!e.length) go("map");
    } else if (step === "map") {
      const e = ACCS.filter((a) => !CODE.test(map[a])).map((a) => ({ field: `j-${a}`, message: `${c.accounts[a]}: ${c.codeError}` }));
      setErrors(e);
      if (!e.length) go("preview");
      else requestAnimationFrame(() => document.getElementById("j-errors")?.focus());
    }
  }

  async function doExport() {
    setExporting(true);
    try {
      const r = await run(c.stepUp, (token) => journalExport(body, token, key));
      if (r) { setDone({ url: r.url, name: r.name, checksum: r.checksum, rowCount: r.rowCount }); go("done"); }
    } catch { /* mapped toast already shown by useStepUpAction */ }
    setExporting(false);
  }

  return (
    <div className="grid gap-5">
      <PageHead title={c.title} sub={c.sub}
        back={<Link href={localHref(locale, "/finance/reports")} className="mb-2 inline-flex items-center gap-1.5 text-small text-fg-muted hover:text-fg"><Icon name="arrowRight" size={14} aria-hidden className="rotate-180" />{all.back}</Link>} />

      {phone && (
        <div role="note" className="flex items-start gap-3 bg-bg-tint p-4">
          <Icon name="laptop" size={20} aria-hidden className="mt-0.5 text-navy-600" />
          <p className="text-small"><span className="font-medium">{c.phone}.</span> {c.phoneBody}</p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[14rem_1fr]">
        <div className="lg:hidden"><Stepper steps={[c.steps.period, c.steps.map, c.steps.preview]} current={Math.min(current, 2)} /></div>
        <ol aria-label={c.title} className="hidden content-start gap-1 lg:grid">
          {(["period", "map", "preview"] as const).map((s, i) => (
            <li key={s} aria-current={current === i ? "step" : undefined} className={cx("flex items-center gap-3 px-3 py-2.5 text-small", current === i && "bg-bg-tint font-medium")}>
              <span className={cx("flex size-7 items-center justify-center rounded-full text-eyebrow", i < current ? "bg-secondary text-on-navy" : i === current ? "bg-navy-700 text-white" : "bg-ink-100 text-fg-subtle")}>{i < current ? <Icon name="check" size={12} aria-hidden /> : i + 1}</span>
              {c.steps[s]}
            </li>
          ))}
        </ol>

        <div className="grid min-w-0 content-start gap-4">
          {errors.length > 0 && <div id="j-errors" tabIndex={-1}><ErrorSummary title={c.codeError} errors={errors} /></div>}

          {step === "period" && (
            <Panel title={c.steps.period} className="m-rise">
              <div className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id="j-from" label={all.from}>{(ids) => <DateInput id={ids.id} aria-describedby={ids.describedBy} value={from} max={to || undefined} onChange={(e) => setUrlParams({ from: e.target.value || null })} />}</Field>
                  <Field id="j-to" label={all.to}>{(ids) => <DateInput id={ids.id} aria-describedby={ids.describedBy} value={to} min={from || undefined} onChange={(e) => setUrlParams({ to: e.target.value || null })} />}</Field>
                </div>
                <fieldset className="grid gap-2">
                  <legend className="mb-1 text-label">{c.format}</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {JOURNAL_FORMATS.map((f) => (
                      <label key={f} className={cx("flex cursor-pointer items-start gap-3 border p-3", format === f ? "border-secondary bg-navy-50" : "border-border")}>
                        <input type="radio" name="j-format" checked={format === f} onChange={() => setUrlParams({ format: f })} className="mt-1 size-4 accent-navy-700" />
                        <span className="grid gap-0.5"><span className="text-small font-medium">{c.formats[f]}</span><span className="text-eyebrow text-fg-subtle">{c.formatHint[f]}</span></span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex justify-end"><Button onClick={next} className="m-press">{c.next}<Icon name="arrowRight" size={14} aria-hidden /></Button></div>
              </div>
            </Panel>
          )}

          {step === "map" && (
            <Panel title={c.steps.map} className="m-rise" action={<button type="button" onClick={() => setMap({ ...ACCOUNTS })} className="text-small underline underline-offset-4">{c.reset}</button>}>
              <p className="mb-4 flex items-start gap-2 bg-warning-bg px-3 py-2 text-small"><Icon name="sparkle" size={14} aria-hidden className="mt-0.5 text-warning" />{c.placeholder}</p>
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {ACCS.map((a) => {
                  const bad = errors.some((e) => e.field === `j-${a}`);
                  return (
                    <Field key={a} id={`j-${a}`} label={c.accounts[a]} error={bad ? c.codeError : undefined}>
                      {(ids) => <Input id={ids.id} aria-describedby={ids.describedBy} aria-invalid={ids.invalid || undefined} value={map[a]} maxLength={12} onChange={(e) => setMap({ ...map, [a]: e.target.value.trim() })} className="tabular" />}
                    </Field>
                  );
                })}
              </div>
              <div className="mt-5 flex flex-wrap justify-between gap-2">
                <Button variant="outline" onClick={() => go("period")}>{c.back}</Button>
                <Button onClick={next} className="m-press">{c.preview}<Icon name="arrowRight" size={14} aria-hidden /></Button>
              </div>
            </Panel>
          )}

          {(step === "preview" || (step === "done" && !done)) && (
            <div className="grid gap-4">
              <p className="flex flex-wrap items-center gap-2 text-small"><PeriodLabel from={from} to={to} /><span className="bg-ink-100 px-2.5 py-0.5 text-eyebrow">{c.formats[format]}</span></p>
              {pv.isError ? <PanelError what={c.failed} onRetry={() => pv.refetch()} />
                : !pv.data ? <p aria-live="polite" className="flex items-center gap-2 border border-border bg-white p-6 text-small text-fg-muted"><span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />{c.previewing}</p>
                : !pv.data.count ? <EmptyPanel title={c.noEntries} body={c.noEntriesBody} />
                : (
                  <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
                    <div className="grid min-w-0 content-start gap-4 m-stagger">
                      <Panel title={c.byAccount} padded={false}>
                        <div role="region" aria-label={c.byAccount} tabIndex={0} className="overflow-x-auto">
                          <table className="w-full min-w-[30rem] text-small">
                            <thead className="bg-ink-100 text-eyebrow text-fg-subtle"><tr><th scope="col" className="p-3 text-left font-medium">{c.account}</th><th scope="col" className="p-3 text-right font-medium">{c.debit}</th><th scope="col" className="p-3 text-right font-medium">{c.credit}</th></tr></thead>
                            <tbody>
                              {pv.data.byAccount.map((r) => (
                                <tr key={r.account} className="border-t border-border">
                                  <th scope="row" className="p-3 text-left font-normal"><span className="mr-2 bg-ink-100 px-1.5 py-0.5 text-eyebrow tabular"><DemoValue>{r.code}</DemoValue></span>{c.accounts[r.account]}</th>
                                  <td className="p-3 text-right">{r.debit ? <Amount value={r.debit} size="sm" /> : "—"}</td>
                                  <td className="p-3 text-right">{r.credit ? <Amount value={r.credit} size="sm" /> : "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Panel>
                      <Panel title={c.sample} padded={false}>
                        <div role="region" aria-label={c.sample} tabIndex={0} className="overflow-x-auto">
                          <table className="w-full min-w-[34rem] text-small">
                            <thead className="bg-ink-100 text-eyebrow text-fg-subtle"><tr><th scope="col" className="p-3 text-left font-medium">{c.date}</th><th scope="col" className="p-3 text-left font-medium">{c.ref}</th><th scope="col" className="p-3 text-left font-medium">{c.account}</th><th scope="col" className="p-3 text-right font-medium">{c.debit}</th><th scope="col" className="p-3 text-right font-medium">{c.credit}</th></tr></thead>
                            <tbody>
                              {pv.data.sample.map((r, i) => (
                                <tr key={i} className="border-t border-border">
                                  <td className="p-3 tabular text-fg-muted">{formatDate(r.date, locale)}</td><td className="p-3 tabular">{r.ref}</td>
                                  <td className="p-3"><span className="tabular text-fg-subtle">{r.code}</span> {c.accounts[r.account]}</td>
                                  <td className="p-3 text-right">{r.debit ? <Amount value={r.debit} size="sm" /> : "—"}</td><td className="p-3 text-right">{r.credit ? <Amount value={r.credit} size="sm" /> : "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Panel>
                    </div>
                    <div className="grid content-start gap-3">
                      <BalanceCard debits={pv.data.debits} credits={pv.data.credits} balanced={pv.data.balanced} count={pv.data.count} />
                      {!pv.data.balanced && <p role="alert" className="text-small text-danger">{c.unbalancedBody.split("{amount}")[0]}<UnbalancedGap debits={pv.data.debits} credits={pv.data.credits} />{c.unbalancedBody.split("{amount}")[1]}</p>}
                      {!online && <p className="text-small text-fg-muted">{c.offline}</p>}
                      <Button size="lg" onClick={doExport} loading={exporting} disabled={!pv.data.balanced || !online || phone} className="w-full justify-center m-press">
                        <Icon name="shield" size={16} aria-hidden />{c.export}
                      </Button>
                      <Button variant="outline" onClick={() => go("map")} className="w-full justify-center">{c.back}</Button>
                    </div>
                  </div>
                )}
            </div>
          )}

          {step === "done" && done && (
            <section className="grid place-items-center gap-3 border border-border bg-white px-6 py-10 text-center m-rise">
              <span className="flex size-14 items-center justify-center rounded-full bg-success text-white"><Icon name="fileCheck" size={24} aria-hidden className="m-tick" /></span>
              <h2 className="text-h3">{c.done}</h2>
              <p className="text-small text-fg-muted tabular">{fill(c.entries, { n: done.rowCount ?? 0 })} · {fill(c.checksum, { c: done.checksum })}</p>
              {done.url && <a href={done.url} download={done.name} className="inline-flex h-11 items-center gap-2 bg-secondary px-5 text-button text-on-navy hover:bg-secondary-hover m-press"><Icon name="upload" size={16} aria-hidden className="rotate-180" />{fill(c.download, { name: done.name })}</a>}
              <p className="text-eyebrow text-fg-subtle">{c.logged}</p>
              <button type="button" onClick={() => { setDone(null); go("period"); }} className="text-small underline underline-offset-4">{c.again}</button>
            </section>
          )}
        </div>
      </div>
      {dialog}
    </div>
  );
}

/** The unbalanced gap is computed server-side as debits/credits; shown as both figures to avoid client maths. */
function UnbalancedGap({ debits, credits }: { debits: number; credits: number }) {
  return <><Amount value={debits} size="sm" /> ≠ <Amount value={credits} size="sm" /></>;
}
