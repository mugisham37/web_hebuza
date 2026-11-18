"use client";
// U12 field earnings, board EX3 (fixed: no co-worker card). Server figures only — no client maths beyond display.
import { useQuery } from "@tanstack/react-query";
import { formatDate, formatMoney } from "@/shared/format";
import { ButtonLink } from "@/components/atoms/button";
import { Skeleton, ErrorState } from "@/components/atoms/feedback";
import { useUrlParams } from "@/lib/url-state";
import { localHref } from "@/lib/i18n/provider";
import { fx, fieldKeys, useFieldMe } from "@/lib/field/api";
import { useOnline } from "@/lib/field/net";
import { useFieldCopy, fill } from "@/lib/field/copy";
import { copyE } from "@/lib/field/copy-e";
import { FIELD_POLICY } from "@/shared/policy";
import { FieldHeader, useNow, useWsRoot } from "@/components/atoms/field-agent";
import { ArtCloudDown, FieldEmpty } from "@/components/atoms/field-art";

type Earnings = {
  month: string; external: boolean;
  perVisit: { count: number; fee: number; total: number; wht: number };
  transport: { approved: number; pending: number; paid: number };
  shares: { caseRef: string; service: string; pool: number; amount: number; state: string }[];
  states: Record<"invoiced" | "collected" | "allocated" | "approved" | "paid", number>;
};

export function FieldEarnings() {
  const wsRoot = useWsRoot();
  const { locale } = useFieldCopy();
  const t = copyE(locale).earn;
  const online = useOnline();
  const me = useFieldMe();
  const now = useNow(60_000);
  const month = useUrlParams().get("month") ?? (now ? new Date(now).toISOString().slice(0, 7) : "");
  const q = useQuery({ queryKey: fieldKeys.earnings(month), queryFn: () => fx<Earnings>("GET", `/api/x_field/earnings?month=${month}`), enabled: online && !!month, networkMode: "offlineFirst" });
  const m = (n: number) => formatMoney(n, "RWF", locale);
  const d = q.data;
  const net = d ? d.perVisit.total - d.perVisit.wht + d.transport.approved + d.shares.reduce((s, x) => s + x.amount, 0) : 0;

  return (
    <div className="grid gap-4">
      <FieldHeader title={t.title} sub={month && formatDate(`${month}-15T12:00:00Z`, locale, { month: "long", year: "numeric" })} />
      {!online && <p role="status" className="bg-warning-bg px-4 py-3 text-small">{t.offline}</p>}
      {!d ? (
        online && q.isPending ? <div className="grid gap-3"><Skeleton className="h-28" /><Skeleton className="h-40" /></div>
          : q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} />
            : <FieldEmpty art={<ArtCloudDown />} title={t.none} />
      ) : (
        <>
          <section className="m-rise flex items-center gap-4 bg-bg-tint px-5 py-5">
            <svg aria-hidden viewBox="0 0 40 40" className="size-12 text-navy-700"><rect x="6" y="18" width="8" height="16" rx="2" fill="currentColor" /><rect x="18" y="8" width="8" height="26" rx="2" fill="currentColor" /></svg>
            <div><p className="text-small text-navy-700">{t.thisMonth}</p><p className="text-h2 tabular">{m(net)}</p></div>
          </section>
          <dl className="divide-y divide-border border border-border bg-surface">
            <Line label={fill(t.perVisit, { n: d.perVisit.count, fee: m(d.perVisit.fee) })} value={m(d.perVisit.total)} hint={d.perVisit.fee === FIELD_POLICY.perVisitFee ? t.feeNote : undefined} />
            {d.external && <Line label={t.wht} value={`− ${m(d.perVisit.wht)}`} />}
            <Line label={t.transport} value={m(d.transport.approved)} hint={d.external ? t.noWht : undefined} />
            {d.transport.pending > 0 && <Line label={t.pending} value={m(d.transport.pending)} muted />}
            {d.shares.map((s) => <Line key={s.caseRef} label={`${t.shares} · ${s.caseRef}`} value={m(s.amount)} hint={fill(t.share, { pct: FIELD_POLICY.fieldShareBps / 100, pool: m(s.pool) })} />)}
          </dl>
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(Object.keys(t.states) as (keyof Earnings["states"])[]).map((k) => (
              <div key={k} className="bg-surface px-3 py-3"><p className="text-eyebrow normal-case text-fg-subtle">{t.states[k]}</p><p className="text-label tabular">{m(d.states[k])}</p></div>
            ))}
          </section>
          <section className="flex items-center gap-3 border border-border bg-surface px-4 py-3">
            <span className="text-small text-fg-muted">{t.agent}</span>
            <span className="text-label">{me.data?.name}</span>
            {me.data?.districts.length ? <span className="text-small text-fg-subtle">{fill(t.region, { d: me.data.districts.join(", ") })}</span> : null}
          </section>
        </>
      )}
      <ButtonLink href={localHref(locale, `${wsRoot}/earnings?kind=field&month=${month}`)} size="lg">{t.detailed}</ButtonLink>
    </div>
  );
}

function Line({ label, value, hint, muted }: { label: string; value: string; hint?: string; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <dt className={muted ? "text-small text-fg-subtle" : "text-small"}>{label}{hint && <span className="block text-eyebrow normal-case text-fg-subtle">{hint}</span>}</dt>
      <dd className={muted ? "text-small tabular text-fg-subtle" : "text-label tabular"}>{value}</dd>
    </div>
  );
}
