"use client";
// U11 expenses list, board EX2: tabs by state, month switcher, computed total (never typed), local + server merged.
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDate, formatMoney } from "@/shared/format";
import { errorCopy } from "@/lib/api/error-copy";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Sheet } from "@/components/atoms/dialog";
import { Skeleton, ErrorState } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { fx, fieldKeys, localExpenses, useFieldMe } from "@/lib/field/api";
import { useEngine } from "@/lib/field/sync";
import { useOnline } from "@/lib/field/net";
import { expenseTotal, EXPENSE_PENDING, EXPENSE_APPROVED } from "@/shared/field/rules";
import { useFieldCopy, fill } from "@/lib/field/copy";
import { copyE } from "@/lib/field/copy-e";
import { FIELD_POLICY } from "@/shared/policy";
import type { Expense, ExpenseState } from "@/shared/field/types";
import { FieldHeader, LocalRef, useFieldBase, useNow } from "@/components/atoms/field-agent";
import { ArtTray, FieldEmpty } from "@/components/atoms/field-art";
import { ExpenseCard, ApprovalTrail, ExpenseStatePill } from "@/components/molecules/field/field";

const TABS = ["all", "pending", "approved", "paid", "rejected"] as const;
type TabId = (typeof TABS)[number];
const IN: Record<TabId, (s: ExpenseState) => boolean> = {
  all: () => true, pending: (s) => EXPENSE_PENDING.includes(s), approved: (s) => EXPENSE_APPROVED.includes(s) && s !== "paid",
  paid: (s) => s === "paid", rejected: (s) => s === "rejected" || s === "withdrawn",
};
const shiftMonth = (m: string, d: number) => { const [y, mo] = m.split("-").map(Number); const x = new Date(Date.UTC(y, mo - 1 + d, 1)); return x.toISOString().slice(0, 7); };

type Row = Expense & { opId?: string; sync?: string };

export function ExpenseList() {
  const { c, locale } = useFieldCopy();
  const t = copyE(locale).exp;
  const base = useFieldBase();
  const online = useOnline();
  const eng = useEngine();
  const me = useFieldMe();
  const now = useNow(60_000);
  const params = useUrlParams();
  const tab = (TABS as readonly string[]).includes(params.get("state") ?? "") ? (params.get("state") as TabId) : "all";
  const month = params.get("month") ?? (now ? new Date(now).toISOString().slice(0, 7) : "");
  const [open, setOpen] = useState<Row | null>(null);
  // shortcut: offline shows the last server list held in memory only, persist it to the encrypted store if agents ask.
  const q = useQuery({ queryKey: fieldKeys.expenses(), queryFn: () => fx<Expense[]>("GET", "/api/x_field/expenses"), enabled: online, networkMode: "offlineFirst" });

  const local: Row[] = localExpenses(eng.ops, { id: me.data?.id ?? "", name: me.data?.name ?? "" });
  const all: Row[] = [...local, ...(q.data ?? [])].filter((x) => !month || x.createdAt.startsWith(month));
  const rows = all.filter((x) => IN[tab](x.state));
  const total = expenseTotal(all);
  const cap = eng.bundle?.settings.motoCap ?? FIELD_POLICY.motoCap;

  return (
    <div className="grid gap-4">
      <FieldHeader title={t.title} action={<ButtonLink href={base("/expenses/new")} size="sm">{t.newBtn}</ButtonLink>} />
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" aria-label={t.prev} onClick={() => setUrlParams({ month: shiftMonth(month, -1) })}>‹</Button>
        <p className="text-label">{month && formatDate(`${month}-15T12:00:00Z`, locale, { month: "long", year: "numeric" })}</p>
        <Button variant="ghost" size="icon" aria-label={t.next} onClick={() => setUrlParams({ month: shiftMonth(month, 1) })}>›</Button>
      </div>
      <div role="tablist" aria-label={t.title} className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((id) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setUrlParams({ state: id === "all" ? null : id })}
            className={tab === id ? "h-10 shrink-0 bg-secondary px-4 text-small font-medium text-on-navy" : "h-10 shrink-0 bg-ink-100 px-4 text-small font-medium text-fg hover:bg-ink-200"}>
            {t.tabs[id]} <span className="tabular opacity-70">{all.filter((x) => IN[id](x.state)).length}</span>
          </button>
        ))}
      </div>
      {!online && <p className="text-small text-fg-subtle">{t.onPhone}</p>}

      {online && q.isPending && !local.length ? (
        <div className="grid gap-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : q.isError && !local.length ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : rows.length === 0 ? (
        <FieldEmpty art={<ArtTray />} title={t.empty} body={t.emptyBody} action={<ButtonLink href={base("/expenses/new")}>{t.newBtn}</ButtonLink>} />
      ) : (
        <ul className="m-stagger grid gap-2">
          {rows.map((x, i) => <li key={x.opId ?? x.id} style={{ ["--i" as string]: i }}><ExpenseCard x={x} onOpen={() => setOpen(x)} /></li>)}
        </ul>
      )}

      <div className="bg-bg-tint px-5 py-4 text-center">
        <p className="text-small text-navy-700">{t.monthTotal}</p>
        <p className="text-h2 tabular">{formatMoney(total, "RWF", locale)}</p>
        <p className="mt-1 text-eyebrow normal-case text-fg-muted">{fill(t.capNote, { cap: formatMoney(cap, "RWF", locale) })}</p>
      </div>
      {open && <ExpenseDetail x={open} onClose={() => setOpen(null)} online={online} editHref={open.opId && open.sync === "rejected" ? base(`/expenses/new?edit=${open.opId}`) : null} needsConnection={c.needsConnection} />}
    </div>
  );
}

function ExpenseDetail({ x, onClose, online, editHref, needsConnection }: { x: Row; onClose: () => void; online: boolean; editHref: string | null; needsConnection: string }) {
  const { c, locale } = useFieldCopy();
  const t = copyE(locale).exp;
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function withdraw() {
    setBusy(true);
    try {
      await fx("POST", `/api/x_field/expenses/${x.id}/withdraw`);
      await qc.invalidateQueries({ queryKey: fieldKeys.expenses() });
      toast({ title: t.withdrawn, tone: "success" });
      onClose();
    } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); } finally { setBusy(false); }
  }
  return (
    <Sheet open onClose={onClose} side="bottom" title={t.cats[x.category]} description={x.note}
      footer={<>
        {editHref && <ButtonLink href={editHref} variant="secondary">{t.edit}</ButtonLink>}
        {x.state === "submitted" && <Button variant="outline" disabled={!online} loading={busy} onClick={() => void withdraw()} title={online ? undefined : needsConnection}>{t.withdraw}</Button>}
      </>}>
      <div className="mx-auto grid max-w-md gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className={x.state === "rejected" || x.state === "withdrawn" ? "text-h2 tabular text-fg-subtle line-through" : "text-h2 tabular"}>{formatMoney(x.amount, "RWF", locale)}</p>
          <ExpenseStatePill state={x.state} />
          {x.ref ? <span className="font-mono text-small">{x.ref}</span> : <LocalRef localRef={x.localRef} />}
        </div>
        {x.visitRef && <p className="text-small text-fg-muted">{x.visitRef}</p>}
        {x.receiptUrl?.startsWith("data:") && (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL
          <img src={x.receiptUrl} alt={t.receipt} className="max-h-48 w-auto border border-border" />
        )}
        {x.noReceiptReason && <p className="text-small">{fill(t.noReceiptShown, { r: x.noReceiptReason })}</p>}
        {x.flags.includes("over_cap") && <Badgeish text={t.cats.moto + " · " + c.flags.over_cap} />}
        <ApprovalTrail x={x} />
        {x.payoutBatch && <Link href={`/${locale}/agent/earnings?kind=field`} className="text-small font-medium underline">{fill(t.paidIn, { b: x.payoutBatch })}</Link>}
      </div>
    </Sheet>
  );
}
const Badgeish = ({ text }: { text: string }) => <p className="w-fit bg-warning-bg px-3 py-1 text-small text-warning">{text}</p>;
