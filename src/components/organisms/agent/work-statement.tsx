"use client";
// Stage 8 lane E: /work/earnings/statements/[month] (board 09 EA2, XK6). Lines via the shared StatementLines.
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { formatMoney } from "@/shared/format";
import { PageHead, SkeletonRows } from "@/components/atoms/agent";
import { EmptyPanel, Panel, PanelError } from "@/components/molecules/ops/ops";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { ApiError } from "@/lib/api/client";
import { useStatementFile, useWorkStatement } from "@/lib/work/e";
import type { Statement } from "@/lib/work/api";
import { fill } from "@/content/pages/work-common";
import { POLICY } from "@/shared/policy";
import { StatementLines } from "@/components/molecules/agent/agent";
import { useW } from "@/components/atoms/work";
import { useWE } from "@/components/organisms/agent/work-earnings";

const monthLabel = (m: string, locale: string) =>
  new Intl.DateTimeFormat(locale === "rw" ? "en-GB" : locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));

export function StatementSheet({ month }: { month: string }) {
  const { x, locale } = useWE();
  const s = useWorkStatement(month);
  const file = useStatementFile();
  const toast = useToast();
  const back = (
    <Link href={localHref(locale, "/work/earnings?tab=statements")} className="mb-2 inline-flex items-center gap-1 text-small text-fg-muted hover:text-fg">
      <Icon name="arrowRight"size={14} aria-hidden className="rotate-180" /> {x.st.back}
    </Link>
  );
  const notFound = s.error instanceof ApiError && s.error.isNotFound;
  if (notFound)
    return (
      <div className="pb-24 lg:pb-8">
        <PageHead title={monthLabel(month, locale)} back={back} />
        <EmptyPanel title={x.st.notFound} body={x.st.notFoundBody} />
      </div>
    );
  const d = s.data;
  const gen = d?.status === "generating";
  const dl = (format: "pdf" | "csv") =>
    d && file.mutate({ month, format, name: d.number }, { onError: () => toast({ title: x.st.failed, tone: "danger" }) });
  return (
    <div className="pb-24 lg:pb-8">
      <PageHead
        back={back}
        title={d ? fill(x.st.number, { n: d.number }) : monthLabel(month, locale)}
        sub={fill(x.st.period, { m: monthLabel(month, locale) })}
        actions={
          <>
            <Button size="sm" disabled={!d || gen} loading={file.isPending && file.variables?.format === "pdf"} onClick={() => dl("pdf")}>
              <Icon name="file" size={16} aria-hidden /> {x.st.pdf}
            </Button>
            <Button size="sm" variant="outline" disabled={!d || gen} loading={file.isPending && file.variables?.format === "csv"} onClick={() => dl("csv")}>
              {x.st.csv}
            </Button>
          </>
        }
      />
      {s.isError ? (
        <PanelError what={x.st.title} onRetry={() => s.refetch()} />
      ) : !d ? (
        <SkeletonRows n={6} />
      ) : gen ? (
        <div role="status"className="grid gap-3 border border-border bg-white p-6">
          <p className="flex items-center gap-2 text-label">
            <span aria-hidden className="size-2 rounded-full bg-warning m-shimmer" /> {x.st.generating}
          </p>
          <p className="text-small text-fg-muted">{x.st.genBody}</p>
          <SkeletonRows n={4} />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] m-rise">
          <div className="grid content-start gap-4">
            <StatementLines s={d} />
            <p className="flex items-center gap-2 text-small text-fg-muted">
              <Icon name="fileCheck" size={14} aria-hidden /> {x.st.wht}
            </p>
            <Panel title={x.st.bar}>
              <StatementBar s={d} />
            </Panel>
          </div>
          <Panel title={x.st.jobs} padded={false}>
            <div className="p-2 sm:p-3">
              <JobsTable s={d} />
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

/** Stacked bar gross → net with the deductions; the numbers are also in a visually hidden table. */
export function StatementBar({ s }: { s: Pick<Statement, "gross" | "adjustments" | "wht" | "licence" | "net"> }) {
  const w = useW();
  const { locale } = useI18n();
  const parts = [
    { k: w.statement.net, v: s.net, cls: "bg-navy-700" },
    { k: fill(w.statement.wht, { p: POLICY.whtBps / 100 }), v: s.wht, cls: "bg-navy-100" },
    { k: w.statement.licence, v: Math.min(s.licence, Math.max(0, s.gross + s.adjustments - s.wht)), cls: "bg-warning" },
    { k: w.statement.adjustments, v: Math.abs(Math.min(0, s.adjustments)), cls: "bg-danger/70" },
  ].filter((p) => p.v > 0);
  const total = parts.reduce((a, p) => a + p.v, 0) || 1;
  const m = (n: number) => formatMoney(n, "RWF", locale);
  return (
    <figure>
      <div aria-hidden className="flex h-4 overflow-hidden bg-ink-100">
        {parts.map((p) => (
          <span key={p.k} className={`${p.cls} h-full transition-[width] duration-(--dur-3)`} style={{ width: `${(p.v / total) * 100}%` }} />
        ))}
      </div>
      <ul aria-hidden className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-small">
        {parts.map((p) => (
          <li key={p.k} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${p.cls}`} />
            {p.k} <span className="tabular text-fg-muted">{m(p.v)}</span>
          </li>
        ))}
      </ul>
      <table className="sr-only">
        <tbody>
          {parts.map((p) => (
            <tr key={p.k}>
              <th scope="row">{p.k}</th>
              <td>{m(p.v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function JobsTable({ s }: { s: Statement }) {
  const { x, locale } = useWE();
  const m = (n: number) => formatMoney(n, "RWF", locale);
  type J = Statement["jobs"][number];
  const cols: OpsColumn<J>[] = [
    { key: "ref", label: x.st.cols.ref, cell: (r) => <span className="font-mono text-small">{r.ref}</span>, sort: (r) => r.ref },
    { key: "service", label: x.st.cols.service, cell: (r) => r.service },
    { key: "eligible", label: x.st.cols.eligible, cell: (r) => <span className="tabular">{m(r.eligible)}</span>, align: "right", sort: (r) => r.eligible },
    { key: "rate", label: x.st.cols.rate, cell: (r) => r.rate },
    { key: "share", label: x.st.cols.share, cell: (r) => <span className="tabular font-medium">{m(r.share)}</span>, align: "right", sort: (r) => r.share },
  ];
  return <OpsTable rows={s.jobs} columns={cols} rowKey={(r) => r.ref} label={x.st.jobs} empty={<EmptyPanel compact title={x.st.empty} />} />;
}
