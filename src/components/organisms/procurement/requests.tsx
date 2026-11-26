"use client";
// PR2 board/list + PR3 detail for procurement (plan 12 §7, board 05 v3). No drag: each card has a status menu (keyboard path).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { newIdempotencyKey } from "@/lib/api/client";
import { cx, formatDate, formatRelative } from "@/shared/format";
import { quotesRequired } from "@/shared/procurement/rules";
import { usePr, usePrNote, usePrs, type PrDetail } from "@/lib/procurement/c";
import type { PrStatus } from "@/shared/procurement/types";
import { fill } from "@/content/pages/procurement-common";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { EmptyPanel, MenuButton } from "@/components/molecules/ops/ops";
import { usePhone } from "@/components/atoms/step-up";
import { PageHead } from "@/components/atoms/agent";
import { Avatar } from "@/components/atoms/misc";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Input, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { Amount, BudgetBar, DocNo, Pill, ProcPill, useP } from "@/components/atoms/procurement";
import { PanelErr, ProcLink, ProcNoAccess, QuoteCompare, SegregationStrip, VatLines } from "@/components/molecules/procurement/procurement";
import { PrStepper, PrTimeline, isNotFound, useC, useErr } from "@/components/molecules/procurement/procurement";
import { isForbidden } from "@/components/atoms/hooks";

const COLS: PrStatus[] = ["submitted", "info_requested", "approved", "ordered", "rejected", "withdrawn"];
const COLLAPSED: PrStatus[] = ["rejected", "withdrawn"];

export function RequestsView() {
  const c = useC();
  const p = useP();
  const { locale } = useI18n();
  const router = useRouter();
  const u = useUrlParams();
  const phone = usePhone();
  const view = u.get("view") ?? (phone ? "list" : "board");
  const search = (u.get("q") ?? "").toLowerCase();
  const q = usePrs(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [focused, setFocused] = useState<string | null>(null);
  const L = (s: string) => localHref(locale, s);
  if (q.isError && isForbidden(q.error)) return <ProcNoAccess />;
  const rows = (q.data?.items ?? []).filter((r) => r.status !== "draft" && (!search || [r.no, r.title, r.requester.name].some((x) => x.toLowerCase().includes(search))));

  const cols: OpsColumn<PrDetail>[] = [
    { key: "no", label: c.board.cols.no, sort: (r) => r.no, cell: (r) => <DocNo kind="PR" no={r.no} /> },
    { key: "title", label: c.board.cols.title, wrap: true, sort: (r) => r.title, cell: (r) => <span className="font-medium">{r.title}</span> },
    { key: "req", label: c.board.cols.requester, cell: (r) => <span className="flex items-center gap-2"><Avatar name={r.requester.name} size="sm" />{r.requester.name}</span> },
    { key: "amount", label: c.board.cols.amount, align: "right", sort: (r) => r.estimatedTotal, cell: (r) => <Amount value={r.estimatedTotal} className="font-semibold" /> },
    { key: "cat", label: c.board.cols.category, card: false, cell: (r) => <span className="text-small">{r.budget?.name ?? r.budgetCategory}</span> },
    { key: "route", label: c.board.cols.route, wrap: true, cell: (r) => <RouteChip pr={r} /> },
    { key: "age", label: c.board.cols.age, sort: (r) => r.createdAt, cell: (r) => <span className="text-small text-fg-muted">{formatRelative(r.submittedAt ?? r.createdAt, locale)}</span> },
    { key: "state", label: c.board.cols.state, cell: (r) => <ProcPill state={r.status} machine="pr" /> },
  ];

  return (
    <div className="grid gap-5">
      <PageHead title={c.board.title} sub={c.board.sub} actions={<Button data-guide="procurement-request-purchase" variant="primary" onClick={() => setUrlParams({ pr: "new" })} dots className="m-press"><Icon name="plus" size={16} aria-hidden />{p.shell.requestPurchase}</Button>} />
      <div className="flex flex-wrap items-center justify-between gap-3 m-rise">
        <label className="relative w-full max-w-sm">
          <span className="sr-only">{c.board.search}</span>
          <Icon name="search" size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
          <Input type="search" defaultValue={u.get("q") ?? ""} placeholder={c.board.search} onChange={(e) => setUrlParams({ q: e.target.value || null })} className="h-10 pl-9 text-small" />
        </label>
        <div role="radiogroup" aria-label={c.board.board} className="inline-flex border border-border bg-surface p-0.5 text-small">
          {(["board", "list"] as const).map((v) => (
            <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setUrlParams({ view: v })} className={cx("h-8 px-3 m-press", view === v ? "bg-secondary text-on-secondary" : "text-fg-muted")}>{c.board[v]}</button>
          ))}
        </div>
      </div>
      {q.isError ? <PanelErr onRetry={() => q.refetch()} /> : view === "list" ? (
        <div className="border border-border bg-surface m-rise">
          <OpsTable rows={rows} columns={cols} rowKey={(r) => r.no} rowLabel={(r) => `${r.no} · ${r.title}`} label={c.board.title} loading={q.isPending} focused={focused} onFocus={setFocused} shortcuts
            empty={<div className="p-4"><EmptyPanel title={search ? fill(p.empty.search, { q: search }) : p.empty.requests} /></div>} onOpen={(r) => router.push(L(`/procurement/requests/${r.no}`))} />
        </div>
      ) : q.isPending ? (
        <div className="flex gap-3 overflow-x-auto">{COLS.slice(0, 4).map((k) => <div key={k} className="h-80 w-72 shrink-0 m-shimmer" />)}</div>
      ) : !rows.length ? <EmptyPanel title={p.empty.requests} /> : (
        <div className="-mx-gutter flex gap-3 overflow-x-auto px-gutter pb-2 sm:mx-0 sm:px-0">
          {COLS.map((k) => {
            const items = rows.filter((r) => r.status === k);
            const shut = COLLAPSED.includes(k) && !open.has(k);
            return (
              <section key={k} aria-label={p.status[k]} className={cx("flex shrink-0 flex-col gap-2 bg-ink-100 p-2", shut ? "w-44" : "w-72")}>
                <h2 className="flex items-center justify-between px-2 pt-1 text-small font-medium">{p.status[k]}<span className="bg-surface px-2 text-eyebrow tabular">{items.length}</span></h2>
                {shut ? (
                  <button type="button" onClick={() => setOpen((s) => new Set(s).add(k))} className="border border-dashed border-border-strong px-3 py-4 text-small text-fg-muted">{fill(c.board.collapsed, { n: items.length })} · {c.board.show}</button>
                ) : (
                  <ul className="grid gap-2 m-stagger">
                    {items.map((r, i) => (
                      <li key={r.no} style={{ ["--i" as string]: i }} className="m-rise">
                        <PrCard pr={r} onOpen={() => router.push(L(`/procurement/requests/${r.no}`))} onPo={() => router.push(L(`/procurement/orders?from=${r.no}`))} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RouteChip({ pr }: { pr: PrDetail }) {
  const p = useP();
  return pr.route === "executive"
    ? <Pill tone="warning" icon="shield">{pr.routeReasons.map((x) => p.reasons[x]).join(" · ") || p.seg.executive}</Pill>
    : <Pill tone="accent" icon="shield">{p.seg.finance}</Pill>;
}

function PrCard({ pr, onOpen, onPo }: { pr: PrDetail; onOpen: () => void; onPo: () => void }) {
  const c = useC();
  const { locale } = useI18n();
  const b = pr.budget;
  return (
    <article className="grid gap-2 border border-border bg-surface p-3 shadow-sm hover:border-navy-300 hover:shadow-md">
      <header className="flex items-center justify-between gap-2">
        <DocNo kind="PR" no={pr.no} href={`/procurement/requests/${pr.no}`} />
        <MenuButton label={<span className="sr-only">{fill(c.board.more, { no: pr.no })}</span>} icon="menu" align="right">
          {(close) => (
            <div className="grid">
              <button type="button" className="px-3 py-2 text-left text-small hover:bg-navy-50" onClick={() => { close(); onOpen(); }}>{c.board.open}</button>
              {pr.status === "approved" && <button type="button" className="px-3 py-2 text-left text-small font-medium hover:bg-navy-50" onClick={() => { close(); onPo(); }}>{c.board.createPo}</button>}
            </div>
          )}
        </MenuButton>
      </header>
      <p className="line-clamp-2 text-small font-medium" title={pr.title}>{pr.title}</p>
      <div className="flex items-center justify-between gap-2"><Amount value={pr.estimatedTotal} className="font-semibold" /><RouteChip pr={pr} /></div>
      {b && <BudgetBar compact used={b.committed + b.actual - (["approved", "ordered"].includes(pr.status) ? pr.estimatedTotal : 0)} adding={pr.estimatedTotal} budget={b.annualBudget} name={b.name} />}
      <footer className="flex items-center justify-between gap-2 text-eyebrow text-fg-subtle">
        <span className="flex min-w-0 items-center gap-1.5"><Avatar name={pr.requester.name} size="sm" /><span className="truncate">{pr.requester.name}</span></span>
        <span className="tabular">{formatRelative(pr.submittedAt ?? pr.createdAt, locale)}</span>
      </footer>
      {pr.status === "approved" && <Button size="sm" onClick={onPo} className="m-press">{c.board.createPo}</Button>}
    </article>
  );
}

// ---------------------------------------------------------------- PR3 detail (procurement): read-only decisions, Create PO, notes
export function RequestDetail({ no }: { no: string }) {
  const c = useC();
  const p = useP();
  const { locale } = useI18n();
  const toast = useToast();
  const err = useErr();
  const q = usePr(no);
  const note = usePrNote();
  const [text, setText] = useState("");
  const [key, setKey] = useState(newIdempotencyKey);
  if (q.isPending) return <div className="grid gap-4"><div className="h-24 m-shimmer" /><div className="h-72 m-shimmer" /></div>;
  if (q.isError) return isNotFound(q.error)
    ? <EmptyPanel title={fill(c.detail.notFound, { no })} action={<ProcLink href="/procurement/requests" className="underline">{c.detail.back}</ProcLink>} />
    : isForbidden(q.error) ? <ProcNoAccess /> : <PanelErr onRetry={() => q.refetch()} />;
  const pr = q.data;
  const b = pr.budget;
  const approver = pr.decisions.find((d) => d.step === "approve");
  const need = quotesRequired(pr.estimatedTotal);
  return (
    <div className="grid gap-6">
      <PageHead back={<ProcLink href="/procurement/requests" className="mb-2 inline-flex items-center gap-1 text-small text-fg-muted hover:text-fg"><Icon name="arrowRight" size={14} className="rotate-180" aria-hidden />{c.detail.back}</ProcLink>}
        title={<span className="flex flex-wrap items-center gap-3"><DocNo kind="PR" no={pr.no} copy />{pr.title}</span>}
        sub={<span className="flex flex-wrap items-center gap-2"><ProcPill state={pr.status} machine="pr" />{c.detail.requester}: {pr.requester.name} · {formatDate(pr.createdAt, locale)}</span>}
        actions={pr.status === "approved" ? <ButtonLink href={localHref(locale, `/procurement/orders?from=${pr.no}`)} dots className="m-press">{c.board.createPo}</ButtonLink>
          : pr.poNo ? <ButtonLink variant="secondary" href={localHref(locale, `/procurement/orders/${pr.poNo}`)}>{pr.poNo}</ButtonLink> : null} />
      {pr.status === "withdrawn" && <p role="status" className="bg-ink-100 px-4 py-3 text-small">{c.detail.withdrawnBanner}</p>}
      {!["rejected", "withdrawn"].includes(pr.status) && <PrStepper pr={pr} />}
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-6">
          <section className="grid gap-3"><h2 className="text-card-title">{c.detail.lines}</h2><VatLines readOnly lines={pr.lines} mode="excl" vatRegistered={false} /></section>
          <section className="grid gap-2 border border-border bg-surface p-4 text-small">
            <dl className="grid gap-3 sm:grid-cols-3">
              <div><dt className="text-eyebrow text-fg-subtle">{c.detail.neededBy}</dt><dd>{formatDate(pr.neededBy, locale)}</dd></div>
              <div><dt className="text-eyebrow text-fg-subtle">{c.detail.supplier}</dt><dd>{pr.vendorName || p.common.none}</dd></div>
              <div><dt className="text-eyebrow text-fg-subtle">{c.board.cols.category}</dt><dd>{b?.name ?? pr.budgetCategory}</dd></div>
            </dl>
            <p className="text-eyebrow text-fg-subtle">{c.detail.justification}</p><p className="whitespace-pre-wrap">{pr.justification}</p>
          </section>
          <section className="grid gap-3">
            <h2 className="text-card-title">{c.detail.quotes}</h2>
            {pr.quotes.length ? <QuoteCompare readOnly quotes={pr.quotes} chosenId={pr.chosenQuoteId} reason={pr.chosenReason} required={need} /> : <p className="text-small text-fg-muted">{c.detail.noQuotes}</p>}
          </section>
          <section className="grid gap-3"><h2 className="text-card-title">{c.detail.timeline}</h2><PrTimeline pr={pr} /></section>
        </div>
        <aside className="grid content-start gap-4">
          {b && (
            <section className="grid gap-2 border border-border bg-surface p-4">
              <h2 className="text-card-title">{c.detail.budget}</h2>
              <BudgetBar used={b.committed + b.actual - (["approved", "ordered"].includes(pr.status) ? pr.estimatedTotal : 0)} adding={pr.estimatedTotal} budget={b.annualBudget} name={b.name} />
            </section>
          )}
          <section className="grid gap-2">
            <h2 className="text-card-title">{c.detail.chain}</h2>
            <SegregationStrip steps={[
              { role: "requested", who: pr.requester, at: pr.submittedAt, state: pr.submittedAt ? "done" : "pending" },
              { role: "approved", who: approver?.by, at: approver?.at, state: approver ? "done" : "pending", waitingFor: pr.route === "executive" ? "Alice Mutoni" : p.seg.finance },
            ]} />
            <RouteChip pr={pr} />
          </section>
          <form className="grid gap-2 border border-border bg-surface p-4" onSubmit={async (e) => {
            e.preventDefault();
            try { await note.mutateAsync({ no: pr.no, note: text, idempotencyKey: key }); setText(""); setKey(newIdempotencyKey()); toast({ title: c.detail.added, tone: "success" }); }
            catch (x) { toast({ title: err(x), tone: "danger" }); }
          }}>
            <label className="grid gap-1 text-small font-medium">{c.detail.ask}<Textarea rows={3} value={text} placeholder={c.detail.notePh} maxLength={1000} onChange={(e) => setText(e.target.value)} /></label>
            <Button size="sm" type="submit" loading={note.isPending} disabled={!text.trim()} className="w-fit">{c.detail.note}</Button>
          </form>
        </aside>
      </div>
    </div>
  );
}
