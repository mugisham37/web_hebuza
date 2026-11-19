"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useState } from "react";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { formatDate } from "@/shared/format";
import { DataTable, type Column } from "@/components/atoms/data-table";
import { StatusPill } from "@/components/atoms/domain";
import { Badge } from "@/components/atoms/tag";
import { Button, ButtonLink } from "@/components/atoms/button";
import { EmptyState } from "@/components/atoms/feedback";
import { Input, Select } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { c2Copy } from "@/content/pages/c2";
import {
  bucket,
  toStatus,
  useRequests,
  type Bucket,
  type RequestSummary,
} from "@/components/molecules/client/requests-data";

const TABS: ("all" | Bucket)[] = ["all", "action", "active", "done", "closed"];

/** C07 list: status tabs + search by code/service + service filter (F-CLP-06). */
export function RequestsList() {
  const { locale } = useI18n();
  const c = c2Copy(locale).req;
  const router = useRouter();
  const q = useRequests();
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [term, setTerm] = useState("");
  const [svc, setSvc] = useState("");
  const needle = useDeferredValue(term.trim().toLowerCase());

  const rows = q.data ?? [];
  const services = [...new Set(rows.map((r) => r.service_name))].sort();
  const count = (b: (typeof TABS)[number]) =>
    b === "all"
      ? rows.length
      : rows.filter((r) => bucket(r.status) === b).length;
  const shown = rows.filter(
    (r) =>
      (tab === "all" || bucket(r.status) === tab) &&
      (!svc || r.service_name === svc) &&
      (!needle ||
        r.code.toLowerCase().includes(needle) ||
        (r.group_code ?? "").toLowerCase().includes(needle) ||
        r.service_name.toLowerCase().includes(needle)),
  );
  const filtered = !!(needle || svc || tab !== "all");
  const reset = () => {
    setTerm("");
    setSvc("");
    setTab("all");
  };

  const pay = (s: string) =>
    s === "paid" ? (
      <Badge tone="success">{c.paid}</Badge>
    ) : s === "pending" ? (
      <Badge tone="info">{c.pending}</Badge>
    ) : (
      <Badge tone="warning">{c.unpaid}</Badge>
    );
  const cols: Column<RequestSummary>[] = [
    {
      key: "code",
      header: c.cols.code,
      sortValue: (r) => `${r.group_code ?? ""}${r.code}`, // REQ-02: basket cases sort together under their RG code
      cell: (r) => (
        <span className="grid">
          <Link
            href={localHref(locale, `/requests/${r.code}`)}
            className="font-medium tabular underline-offset-4 hover:underline"
          >
            {r.code}
          </Link>
          {r.group_code && <span className="text-small text-fg-subtle tabular">{r.group_code}</span>}
        </span>
      ),
    },
    {
      key: "service",
      header: c.cols.service,
      sortValue: (r) => r.service_name,
      cell: (r) => r.service_name,
    },
    {
      key: "status",
      header: c.cols.status,
      cell: (r) => <StatusPill status={toStatus(r.status)} />,
    },
    {
      key: "payment",
      header: c.cols.payment,
      cell: (r) => pay(r.payment_status),
    },
    {
      key: "submitted",
      header: c.cols.submitted,
      sortValue: (r) => r.submitted_at,
      cell: (r) => (
        <time dateTime={r.submitted_at}>
          {formatDate(r.submitted_at, locale)}
        </time>
      ),
    },
  ];

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-fg-heading text-h3">{c.title}</h1>
          <p className="mt-1 text-body text-fg-muted">{c.sub}</p>
        </div>
        <ButtonLink href={localHref(locale, "/services")} dots>
          {c2Copy(locale).dash.start}
        </ButtonLink>
      </header>

      <div
        role="group"
        aria-label={c.cols.status}
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {TABS.map((b) => (
          <button
            key={b}
            type="button"
            aria-pressed={tab === b}
            onClick={() => setTab(b)}
            className="inline-flex h-9 shrink-0 items-center gap-2 border border-border px-4 text-small font-medium hover:border-navy-300 aria-pressed:border-secondary aria-pressed:bg-secondary aria-pressed:text-on-secondary"
          >
            {c.tabs[b]}
            <span className="tabular opacity-70">{count(b)}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <label className="relative block">
          <span className="sr-only">{c.search}</span>
          <Icon
            name="search"
            size={18}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle"
          />
          <Input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={c.search}
            className="pl-10"
          />
        </label>
        <label className="block">
          <span className="sr-only">{c.filterService}</span>
          <Select value={svc} onChange={(e) => setSvc(e.target.value)}>
            <option value="">{c.allServices}</option>
            {services.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </label>
      </div>

      <DataTable
        rows={shown}
        columns={cols}
        rowKey={(r) => r.code}
        loading={q.isPending}
        error={q.error}
        onRetry={() => q.refetch()}
        onRowClick={(r) =>
          router.push(localHref(locale, `/requests/${r.code}`))
        }
        empty={
          filtered ? (
            <EmptyState
              body={c.noResults}
              action={
                <Button variant="outline" size="sm" onClick={reset}>
                  {c.clear}
                </Button>
              }
            />
          ) : (
            <EmptyState
              body={c.empty}
              action={
                <ButtonLink href={localHref(locale, "/services")} size="sm">
                  {c2Copy(locale).dash.start}
                </ButtonLink>
              }
            />
          )
        }
      />
    </div>
  );
}
