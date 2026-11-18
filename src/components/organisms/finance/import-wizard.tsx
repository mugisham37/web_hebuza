"use client";
// U10 Import wizard (board 07 RC2): Upload (provider, CSV, "Use sample statement", duplicate-file hash check) → Map columns
// (saved mapping per provider) → Review (row-level parse errors, "Skip invalid rows") → Results (counts + workbench link).
// Step in the URL (?step=&provider=); the parsed file lives in memory, so a reload returns to Upload.
import { useState } from "react";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx } from "@/shared/format";
import { api, newIdempotencyKey, unwrap } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { useFinAction, useMapping, useReconOverview, type ImportRow, type ImportRowIn, type Mapping } from "@/lib/finance/c";
import type { MatchState, Provider } from "@/shared/finance/types";
import { Icon } from "@/components/atoms/icon";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Checkbox, Field, Select } from "@/components/atoms/field";
import { FileDrop } from "@/components/atoms/file-drop";
import { Stepper } from "@/components/atoms/misc";
import { PageHead } from "@/components/atoms/agent";
import { Amount, MatchChip } from "@/components/atoms/finance";
import { ArtImportFailed, ArtReconciled } from "@/components/atoms/finance-art";
import { DesktopOnly, fill, useMoneyGuard, useR } from "@/components/molecules/finance/finance";
import { parseCsv } from "@/shared/finance/csv";
import { hdr } from "@/lib/finance/api";

const PROVIDERS: Provider[] = ["mtn_momo", "airtel_money", "card", "bank"];
const STEPS = ["upload", "map", "review", "results"] as const;
type StepKey = (typeof STEPS)[number];
const FIELDS: (keyof Mapping)[] = ["external_ref", "amount", "fee", "occurred_at"];
type Parsed = { fileName: string; hash: string; header: string[]; rows: string[][] };

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}
const guess = (header: string[], field: keyof Mapping) => {
  const re = { external_ref: /ref|transaction|id/i, amount: /amount|montant/i, fee: /fee|frais|charge/i, occurred_at: /date|time/i }[field];
  return header.find((h) => re.test(h)) ?? "";
};

export function ImportWizard() {
  const r = useR();
  const { locale } = useI18n();
  const url = useUrlParams();
  const guard = useMoneyGuard();
  const provider = (PROVIDERS.includes(url.get("provider") as Provider) ? url.get("provider") : "mtn_momo") as Provider;
  const want = (STEPS.includes(url.get("step") as StepKey) ? url.get("step") : "upload") as StepKey;
  const [file, setFile] = useState<Parsed | null>(null);
  const [result, setResult] = useState<ImportRow | null>(null);
  const step: StepKey = want === "results" ? (result ? "results" : "upload") : want !== "upload" && !file ? "upload" : want;
  const saved = useMapping(provider);
  const overview = useReconOverview(provider, "");
  const [mapping, setMapping] = useState<Partial<Mapping>>({});
  const [skip, setSkip] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [key, setKey] = useState(newIdempotencyKey);
  const go = (s: StepKey) => setUrlParams({ step: s === "upload" ? null : s, provider });

  const map: Mapping = Object.fromEntries(FIELDS.map((k) => [k, mapping[k] ?? (saved.data?.mapping?.[k] && file?.header.includes(saved.data.mapping[k]) ? saved.data.mapping[k] : file ? guess(file.header, k) : "")])) as Mapping;
  const duplicate = !!file && !!overview.data?.imports.some((i) => i.fileHash === file.hash);

  // Review: row-level validation against the mapping.
  const col = (k: keyof Mapping) => (file ? file.header.indexOf(map[k]) : -1);
  const payerCol = file ? file.header.findIndex((h) => /payer|msisdn|account/i.test(h)) : -1;
  const checked = (file?.rows ?? []).map((row, i) => {
    const ref = row[col("external_ref")] ?? "", amt = row[col("amount")] ?? "", fee = col("fee") >= 0 ? row[col("fee")] ?? "0" : "0", at = row[col("occurred_at")] ?? "";
    const t = Date.parse(at);
    const e = !ref ? "ref" : !/^\d+$/.test(amt) || !/^\d*$/.test(fee) ? "amount" : Number.isNaN(t) ? "date" : null;
    const out: ImportRowIn | null = e ? null : { externalRef: ref, amount: Number(amt), fee: Number(fee || 0), occurredAt: new Date(t).toISOString(), payer: payerCol >= 0 ? row[payerCol] : undefined };
    return { row: i + 2, e, out };
  });
  const valid = checked.filter((c) => c.out).map((c) => c.out!);
  const invalid = checked.filter((c) => c.e);
  const from = valid.reduce((m, x) => (!m || x.occurredAt < m ? x.occurredAt : m), "").slice(0, 10);
  const to = valid.reduce((m, x) => (x.occurredAt > m ? x.occurredAt : m), "").slice(0, 10);

  async function load(name: string, text: string) {
    setErr(null);
    const rows = parseCsv(text);
    if (rows.length < 2) return setErr(r.wizard.failedBody);
    setFile({ fileName: name, hash: await sha256(text), header: rows[0], rows: rows.slice(1) });
    setMapping({}); setSkip(false); setKey(newIdempotencyKey());
  }
  async function sample() {
    setBusy(true);
    try { const s = await unwrap<{ fileName: string; csv: string }>(api.GET("/api/finance/x/statements/sample")); setUrlParams({ provider: "mtn_momo" }); await load(s.fileName, s.csv); }
    catch (e) { setErr(errorCopy(e, locale)); }
    setBusy(false);
  }
  const run = useFinAction(() => unwrap<ImportRow>(api.POST("/api/finance/statements/import", { body: { provider, fileName: file!.fileName, fileHash: file!.hash, mapping: map, rows: valid }, headers: hdr({ idempotencyKey: key }) })));
  async function doImport() {
    setErr(null);
    try { setResult(await run.mutateAsync(undefined)); go("results"); }
    catch (e) { setErr(errorCopy(e, locale)); }
  }

  const idx = STEPS.indexOf(step);
  const mapOk = !!(map.external_ref && map.amount && map.occurred_at);
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <PageHead title={r.importTitle} sub={`${r.providers[provider]}`} back={
        <ButtonLink href={localHref(locale, "/finance/reconciliation")} variant="ghost" size="sm" className="-ml-3 mb-1"><Icon name="arrowRight" size={14} className="rotate-180" aria-hidden />{r.bench.back}</ButtonLink>
      } />
      <DesktopOnly text={r.wizard.phone} />
      <nav aria-label={r.wizard.stepsLabel}><Stepper steps={STEPS.map((s) => r.wizard.steps[s])} current={idx} /></nav>

      <section key={step} className="grid gap-5 border border-border bg-white p-4 sm:p-6 m-rise">
        {step === "upload" && (
          <>
            <Field label={r.wizard.provider}>
              {({ id }) => (
                <Select id={id} value={provider} onChange={(e) => { setUrlParams({ provider: e.target.value }); setFile(null); }}>
                  {PROVIDERS.map((p) => <option key={p} value={p}>{r.providers[p]}</option>)}
                </Select>
              )}
            </Field>
            <Field label={r.wizard.file} hint={r.wizard.fileHint}>
              {({ id }) => <FileDrop id={id} accept=".csv,text/csv" maxSizeMb={10} disabled={!guard.can} onFiles={async (fs) => { const x = fs[0]; if (x) await load(x.name, await x.text()); }} />}
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" loading={busy} disabled={!guard.can} onClick={sample} className="m-press"><Icon name="file" size={14} aria-hidden />{r.wizard.sample}</Button>
              <span className="text-eyebrow text-fg-subtle">{r.wizard.sampleHint}</span>
            </div>
            {file && <p className="flex items-center gap-2 bg-success-bg p-3 text-small text-success m-pop"><Icon name="fileCheck" size={16} aria-hidden />{fill(r.wizard.parsed, { file: file.fileName, n: file.rows.length })}</p>}
            {duplicate && <p role="alert" className="flex items-start gap-2 bg-warning-bg p-3 text-small text-warning"><Icon name="layers" size={16} aria-hidden className="mt-0.5 shrink-0" />{r.wizard.duplicate}</p>}
          </>
        )}

        {step === "map" && file && (
          <>
            <h2 className="text-card-title">{r.wizard.mapTitle}</h2>
            {saved.data?.mapping && <p className="text-small text-fg-muted">{fill(r.wizard.mapSaved, { provider: r.providers[provider] })}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map((k) => (
                <Field key={k} label={r.wizard.fields[k]} hint={k !== "fee" ? r.wizard.required : undefined}>
                  {({ id, describedBy }) => (
                    <Select id={id} aria-describedby={describedBy} value={map[k]} onChange={(e) => setMapping((m) => ({ ...m, [k]: e.target.value }))}>
                      <option value="">{r.wizard.noColumn}</option>
                      {file.header.map((h) => <option key={h} value={h}>{h}</option>)}
                    </Select>
                  )}
                </Field>
              ))}
            </div>
            <Preview header={file.header} rows={file.rows.slice(0, 5)} label={r.wizard.preview} />
          </>
        )}

        {step === "review" && file && (
          <>
            <h2 className="text-card-title">{r.wizard.reviewTitle}</h2>
            <p className="text-small text-fg-muted">{fill(r.wizard.period, { from, to })}</p>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 bg-success-bg px-3 py-1 text-small text-success"><Icon name="check" size={14} aria-hidden />{fill(r.wizard.valid, { n: valid.length })}</span>
              {!!invalid.length && <span className="inline-flex items-center gap-2 bg-danger-bg px-3 py-1 text-small text-danger"><Icon name="x" size={14} aria-hidden />{fill(r.wizard.invalid, { n: invalid.length })}</span>}
            </div>
            {!!invalid.length && (
              <>
                <ul className="grid max-h-48 gap-1 overflow-y-auto bg-danger-bg/50 p-3 text-small">
                  {invalid.slice(0, 50).map((c) => <li key={c.row}>{fill(r.wizard.rowErr, { row: c.row, msg: r.wizard.errs[c.e!] })}</li>)}
                </ul>
                <Checkbox label={<span>{r.wizard.skip} <span className="block text-eyebrow text-fg-subtle">{r.wizard.skipHint}</span></span>} checked={skip} onChange={(e) => setSkip(e.target.checked)} />
              </>
            )}
            {run.isPending && <p aria-live="polite" className="flex items-center gap-2 text-small text-fg-muted"><Icon name="refresh" size={14} aria-hidden className="animate-spin motion-reduce:animate-none" />{r.wizard.running}</p>}
          </>
        )}

        {step === "results" && result && (
          <div className="grid justify-items-center gap-4 text-center">
            <span className="text-success"><ArtReconciled /></span>
            <h2 className="text-h3">{r.wizard.resultsTitle}</h2>
            <p className="max-w-md text-small text-fg-muted">{r.wizard.resultsBody}</p>
            <ul className="flex flex-wrap justify-center gap-3 m-stagger">
              {(Object.keys(result.counts) as MatchState[]).filter((k) => result.counts[k]).map((k) => (
                <li key={k} className="grid min-w-24 justify-items-center gap-1 border border-border p-3">
                  <span className="text-h3 tabular m-pop">{result.counts[k]}</span><MatchChip state={k} />
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink href={localHref(locale, `/finance/reconciliation/${result.id}`)} dots className="m-press">{r.wizard.openWorkbench}</ButtonLink>
              <Button variant="outline" onClick={() => { setFile(null); setResult(null); go("upload"); }}>{r.wizard.another}</Button>
            </div>
          </div>
        )}

        {err && (
          <div role="alert" className="flex flex-wrap items-center gap-4 bg-danger-bg p-4">
            <span className="text-danger"><ArtImportFailed /></span>
            <div className="grid gap-1"><p className="text-label text-danger">{r.wizard.failed}</p><p className="text-small">{err}</p></div>
          </div>
        )}

        {step !== "results" && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            {step === "upload"
              ? <ButtonLink href={localHref(locale, "/finance/reconciliation")} variant="ghost">{r.wizard.cancel}</ButtonLink>
              : <Button variant="ghost" onClick={() => go(STEPS[idx - 1])}>{r.wizard.back}</Button>}
            {step === "review"
              ? <Button dots loading={run.isPending} disabled={!guard.can || !valid.length || (!!invalid.length && !skip)} onClick={doImport} className="m-press">{r.wizard.run}</Button>
              : <Button dots disabled={step === "upload" ? !file || duplicate : !mapOk} onClick={() => go(STEPS[idx + 1])} className="m-press">{r.wizard.next}</Button>}
          </div>
        )}
      </section>
    </div>
  );
}

function Preview({ header, rows, label }: { header: string[]; rows: string[][]; label: string }) {
  return (
    <div className="grid gap-2">
      <p className="text-label">{label}</p>
      <div role="region" aria-label={label} tabIndex={0} className="overflow-x-auto border border-border">
        <table className="w-full text-small">
          <thead className="bg-ink-100 text-ink-700"><tr>{header.map((h) => <th key={h} className="px-3 py-2 text-left text-eyebrow whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>{rows.map((row, i) => <tr key={i} className="border-t border-border">{row.map((c, j) => (
            <td key={j} className={cx("px-3 py-2 whitespace-nowrap tabular", /^\d+$/.test(c) && "text-right")}>{/^\d+$/.test(c) && j > 0 ? <Amount value={Number(c)} size="sm" /> : c}</td>
          ))}</tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
