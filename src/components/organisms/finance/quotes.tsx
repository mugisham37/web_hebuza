"use client";
// U5 Quotes list `/finance/quotes?state=&q=&page=&new=1&case=` (board 04 QT1). Tabs with counts, search, OpsTable (cards < 768,
// J/K/Enter), ≤ 48 h expiry chip, "New quote" from a case (dialog; `?new=1` from the palette, `?case=` from ops).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { newIdempotencyKey, api } from "@/lib/api/client";
import { useShortcut } from "@/lib/ops/shortcuts";
import { useBAction, useQuoteCases, useQuotes, type QuoteRow } from "@/lib/finance/b";
import { financeQuotes } from "@/content/pages/finance-quotes";
import { fill } from "@/content/pages/finance-common";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Select } from "@/components/atoms/field";
import { Pagination } from "@/components/atoms/data-table";
import { useToast } from "@/components/atoms/toast";
import { FilterBar, SavedViewTabs, EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { PageHead, SkeletonRows } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { Amount, DocNumber, FinStatus } from "@/components/atoms/finance";
import { ArtNothingWaiting } from "@/components/atoms/finance-art";
import { ExpiryChip, useBError } from "@/components/molecules/finance/finance";

const TABS = ["all", "draft", "pending_approval", "sent", "accepted", "changes_requested", "expired", "declined"];

export function QuotesView() {
  const { locale } = useI18n();
  const c = financeQuotes(locale);
  const router = useRouter();
  const p = useUrlParams();
  const state = p.get("state") ?? "all";
  const search = p.get("q") ?? "";
  const pg = Number(p.get("page") ?? 1) || 1;
  const qs = new URLSearchParams({ ...(state !== "all" && { state }), ...(search && { q: search }), page: String(pg) }).toString();
  const q = useQuotes(qs);
  const [focused, setFocused] = useState<string | null>(null);
  const online = useOnline();
  const newOpen = p.get("new") === "1" || !!p.get("case");
  const open = (r: QuoteRow) => router.push(localHref(locale, `/finance/quotes/${r.no}`));
  useShortcut("n q", c.newQuote, () => setUrlParams({ new: "1" }), "list");

  const cols: OpsColumn<QuoteRow>[] = [
    { key: "no", label: c.cols.no, cell: (r) => <DocNumber no={r.no} />, sort: (r) => r.no },
    { key: "client", label: c.cols.client, cell: (r) => <span className="font-medium">{r.clientName}</span>, wrap: true, sort: (r) => r.clientName },
    { key: "case", label: c.cols.case, cell: (r) => <span className="tabular text-fg-muted">{r.caseRef}</span> },
    { key: "service", label: c.cols.service, cell: (r) => r.service, wrap: true, card: false },
    { key: "total", label: c.cols.total, align: "right", cell: (r) => <Amount value={r.totals.total} />, sort: (r) => r.totals.total },
    { key: "valid", label: c.cols.valid, cell: (r) => (["sent", "draft", "pending_approval", "changes_requested"].includes(r.status) ? <ExpiryChip validUntil={r.validUntil} label={c.expiresIn} /> : <span className="text-fg-subtle tabular">{r.validUntil}</span>), sort: (r) => r.validUntil },
    { key: "version", label: c.cols.version, cell: (r) => <span className="bg-ink-100 px-2 py-0.5 text-eyebrow tabular">{fill(c.version, { n: r.version })}</span>, card: false },
    { key: "state", label: c.cols.state, cell: (r) => <FinStatus status={r.status} kind="quote" /> },
    { key: "by", label: c.cols.by, cell: (r) => r.preparedBy.name, card: false },
  ];

  const counts = q.data?.counts ?? {};
  return (
    <div className="grid gap-5">
      <PageHead title={c.title} sub={c.sub} actions={
        <Button data-guide="finance-new-quote" onClick={() => setUrlParams({ new: "1" })} disabled={!online} title={online ? undefined : c.blockers.offline} dots className="m-press">
          <Icon name="plus" size={16} aria-hidden />{c.newQuote}
        </Button>
      } />
      <SavedViewTabs active={state} onChange={(k) => setUrlParams({ state: k === "all" ? null : k, page: null })}
        views={TABS.map((k) => ({ key: k, label: c.views[k], count: q.data ? (counts[k] ?? 0) : undefined }))} />
      <FilterBar search={search} onSearch={(v) => setUrlParams({ q: v || null, page: null })} placeholder={c.search}
        chips={search ? [{ key: "q", label: `“${search}”`, onRemove: () => setUrlParams({ q: null }) }] : []} />
      {q.isError && !q.data ? (
        <PanelError what={c.tableLabel} onRetry={() => q.refetch()} />
      ) : q.isPending ? (
        <SkeletonRows n={6} />
      ) : (
        <div className="grid gap-3 m-rise">
          <OpsTable label={c.tableLabel} rows={q.data.items} columns={cols} rowKey={(r) => r.no} rowLabel={(r) => `${r.no} ${r.clientName}`}
            focused={focused} onFocus={setFocused} onOpen={open} shortcuts
            rowTone={(r) => (r.status === "expired" || r.status === "declined" ? "muted" : null)}
            empty={
              <EmptyPanel title={c.empty.title} body={search || state !== "all" ? c.empty.filtered : c.empty.body}
                action={<div className="grid place-items-center gap-3"><ArtNothingWaiting /><Button size="sm" variant="outline" onClick={() => setUrlParams({ new: "1" })}>{c.newQuote}</Button></div>} />
            } />
          {q.data.meta.pages > 1 && <Pagination page={pg} pageCount={q.data.meta.pages} onPage={(n) => setUrlParams({ page: String(n) })} />}
        </div>
      )}
      {newOpen && <NewQuoteDialog preset={p.get("case") ?? ""} onClose={() => setUrlParams({ new: null, case: null })} />}
    </div>
  );
}

/** Pick a case → POST draft → open the builder. Key created when the dialog opens. */
export function NewQuoteDialog({ preset, onClose, inline }: { preset: string; onClose: () => void; inline?: boolean }) {
  const { locale } = useI18n();
  const c = financeQuotes(locale);
  const router = useRouter();
  const toast = useToast();
  const cases = useQuoteCases();
  const [ref, setRef] = useState(preset);
  const [err, setErr] = useState<string | undefined>();
  const [key] = useState(newIdempotencyKey);
  const act = useBAction<{ no: string }>();
  const online = useOnline();
  const { onError, dialog } = useBError(() => null, () => cases.refetch());
  const pick = cases.data?.items.find((x) => x.ref === ref);
  const create = () => {
    if (!ref) return setErr(c.newDialog.pick);
    act.mutate({ req: (h) => api.POST("/api/finance/quotations", { body: { caseRef: ref }, headers: h }), key }, {
      onSuccess: (d) => { toast({ title: fill(c.revise.done, { n: 1 }), tone: "success" }); router.push(localHref(locale, `/finance/quotes/${d.no}`)); },
      onError,
    });
  };
  const body = cases.isPending ? <SkeletonRows n={2} /> : cases.isError ? <PanelError what={c.newDialog.case} onRetry={() => cases.refetch()} /> : !cases.data.items.length ? <p className="text-small text-fg-muted">{c.newDialog.none}</p> : (
    <div className="grid gap-4">
      <Field label={c.newDialog.case} hint={c.newDialog.hint} error={err}>
        {({ id, describedBy, invalid }) => (
          <Select id={id} aria-describedby={describedBy} aria-invalid={invalid} value={ref} onChange={(e) => { setRef(e.target.value); setErr(undefined); }}>
            <option value="">{c.newDialog.pick}</option>
            {cases.data.items.map((x) => <option key={x.ref} value={x.ref}>{x.ref} · {x.clientName} · {x.service}</option>)}
          </Select>
        )}
      </Field>
      {pick && (
        <dl className="grid grid-cols-2 gap-3 bg-bg-tint p-3 text-small m-rise">
          <div><dt className="text-eyebrow text-navy-800">{c.cols.client}</dt><dd>{pick.clientName}</dd></div>
          <div><dt className="text-eyebrow text-navy-800">{c.cols.service}</dt><dd>{pick.service}</dd></div>
        </dl>
      )}
    </div>
  );
  const footer = <>
    {!inline && <Button variant="outline" onClick={onClose}>{c.send.cancel}</Button>}
    <Button onClick={create} loading={act.isPending} disabled={!online} className="m-press">{c.newDialog.create}</Button>
  </>;
  if (inline) return <section className="grid max-w-xl gap-4 border border-border bg-white p-5 m-rise">{body}<div className="flex justify-end gap-2">{footer}</div>{dialog}</section>;
  return <Dialog open onClose={onClose} title={c.newDialog.title} footer={footer}>{body}{dialog}</Dialog>;
}
