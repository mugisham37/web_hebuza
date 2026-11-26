"use client";
import { api, unwrap } from "@/lib/api/client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDate, formatMoney } from "@/shared/format";
import { DataTable, type Column } from "@/components/atoms/data-table";
import { EmptyState } from "@/components/atoms/feedback";
import { Field, Input, Select } from "@/components/atoms/field";
import { Button } from "@/components/atoms/button";
import { localHref } from "@/shared/i18n/config";
import { Badge } from "@/components/atoms/tag";
import { fill } from "@/content/pages/c4";
import { PageHead, useC4 } from "@/components/molecules/client/client";

type Kind = "request" | "payment" | "document" | "account";
export type Activity = {
  id: string;
  at: string;
  kind: Kind;
  title: string;
  ref?: string | null;
  amount?: number | null;
  /** Set on completed requests that can be re-applied for (proposed field). */
  slug?: string | null;
};
const TONE = {
  request: "info",
  payment: "success",
  document: "accent",
  account: "neutral",
} as const;

/** REQ-13: start a draft prefilled from a past request (answers + personal details), then open the wizard on it. */
async function requestAgain(a: Activity, locale: Parameters<typeof localHref>[0]) {
  const go = (slug: string) => window.location.assign(localHref(locale, `/apply/${slug}`));
  if (!a.ref) return go(a.slug!);
  try {
    const d = await unwrap<{ service_slug: string; tier: string; service_data: Record<string, unknown>; personal_info: Record<string, unknown> }>(
      api.POST("/api/applications/{code}/clone", { params: { path: { code: a.ref } } }));
    const p = d.personal_info as Record<string, string | boolean | undefined>;
    const draft = {
      step: 1, elig: [], tier: d.tier, data: d.service_data, docs: {}, terms: [false, false], idem: crypto.randomUUID(), savedAt: Date.now(),
      person: { fullName: String(p.fullName ?? ""), nationalId: String(p.nationalId ?? ""), dob: String(p.dob ?? ""), phone: String(p.phone ?? "").replace(/^\+250/, ""), email: String(p.email ?? ""), whatsapp: !!p.whatsapp },
    };
    try { localStorage.setItem(`hebuza.apply.${d.service_slug}`, JSON.stringify(draft)); } catch {} // private mode: the wizard just starts empty
    go(d.service_slug);
  } catch {
    go(a.slug!);
  }
}

/** C12 Service history: activity log with type/year/search filters and CSV export (DataTable). */
export function HistoryView() {
  const { c, locale } = useC4();
  const h = c.history;
  const thisYear = new Date().getFullYear();
  const [kind, setKind] = useState<"" | Kind>("");
  const [year, setYear] = useState(String(thisYear));
  const [q, setQ] = useState("");
  const query = useQuery({
    queryKey: ["c4", "activity", year],
    queryFn: () => unwrap<{ items: Activity[] }>(api.GET("/api/me/activity", { params: { query: { year } } })),
  });

  const all = query.data?.items ?? [];
  const s = q.trim().toLowerCase();
  const rows = all.filter(
      (a) =>
        (!kind || a.kind === kind) &&
        (!s || `${a.title} ${a.ref ?? ""}`.toLowerCase().includes(s)),
  );
  const filtered = !!kind || !!q.trim();

  const columns: Column<Activity>[] = [
    {
      key: "at",
      header: h.cols.date,
      cell: (a) => (
        <span className="whitespace-nowrap">{formatDate(a.at, locale)}</span>
      ),
      sortValue: (a) => a.at,
      csv: (a) => a.at,
    },
    {
      key: "what",
      header: h.cols.what,
      cell: (a) => (
        <span className="flex flex-wrap items-center gap-2">
          <Badge tone={TONE[a.kind]}>{h.types[a.kind]}</Badge>
          {a.title}
          {a.kind === "request" && a.slug && (
            <Button
              data-guide="client-history-again"
              variant="outline"
              size="sm"
              aria-label={`${h.again}: ${a.title}`}
              onClick={() => void requestAgain(a, locale)}
            >
              {h.again}
            </Button>
          )}
        </span>
      ),
      csv: (a) => `${h.types[a.kind]}: ${a.title}`,
    },
    {
      key: "ref",
      header: h.cols.ref,
      cell: (a) => <span className="font-mono text-small">{a.ref ?? ""}</span>,
      csv: (a) => a.ref ?? "",
    },
    {
      key: "amount",
      header: h.cols.amount,
      cell: (a) => (a.amount ? formatMoney(a.amount, "RWF", locale) : ""),
      sortValue: (a) => a.amount ?? 0,
      csv: (a) => a.amount ?? "",
      className: "text-right tabular-nums",
    },
  ];

  return (
    <>
      <PageHead title={h.title} lede={h.lede} />
      <div data-guide="client-history-filters" className="mb-6 grid gap-4 sm:grid-cols-[1fr_auto_auto]">
        <Field label={h.search}>
          {({ id }) => (
            <Input
              id={id}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          )}
        </Field>
        <Field label={h.type}>
          {({ id }) => (
            <Select
              id={id}
              value={kind}
              onChange={(e) => setKind(e.target.value as "" | Kind)}
            >
              <option value="">{h.all}</option>
              {(Object.keys(h.types) as Kind[]).map((k) => (
                <option key={k} value={k}>
                  {h.types[k]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={h.year}>
          {({ id }) => (
            <Select
              id={id}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              {[0, 1, 2].map((d) => (
                <option key={d}>{thisYear - d}</option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      {query.isSuccess && all.length > 0 && (
        <p
          role="status"
          className="mb-4 bg-bg-tint px-4 py-3 text-body"
        >
          {fill(h.summary, { n: all.length })}
        </p>
      )}
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(a) => a.id}
        loading={query.isPending}
        error={query.error}
        onRetry={() => query.refetch()}
        exportName={`history-${year}`}
        empty={
          filtered ? (
            <EmptyState
              title={h.noMatch}
              body=""
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setKind("");
                    setQ("");
                  }}
                >
                  {h.clear}
                </Button>
              }
            />
          ) : (
            <EmptyState title={h.emptyTitle} body={h.emptyBody} />
          )
        }
      />
    </>
  );
}
