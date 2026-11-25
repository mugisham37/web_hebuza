"use client";
import { useMemo, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cx } from "@/shared/format";
import { EmptyState, ErrorState, Skeleton } from "@/components/atoms/feedback";
import { Button } from "@/components/atoms/button";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;   // enables sorting
  csv?: (row: T) => string | number;         // enables export of this column
  className?: string;
};

/** Sortable, paginated table with CSV export and all states. Server-paginated tables pass `page/pageCount/onPage`. */
export function DataTable<T>({ rows, columns, rowKey, loading, error, onRetry, pageSize = 20, exportName, onRowClick, empty,
  page: ctrlPage, pageCount: ctrlPageCount, onPage }: {
  rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; loading?: boolean; error?: unknown; onRetry?: () => void;
  pageSize?: number; exportName?: string; onRowClick?: (r: T) => void; empty?: ReactNode;
  page?: number; pageCount?: number; onPage?: (p: number) => void;
}) {
  const { t } = useI18n();
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [innerPage, setInnerPage] = useState(1);
  const serverPaged = onPage !== undefined;

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key);
    if (!col?.sortValue || !sort) return rows;
    return [...rows].sort((a, b) => (col.sortValue!(a) > col.sortValue!(b) ? sort.dir : -sort.dir));
  }, [rows, columns, sort]);

  const page = serverPaged ? ctrlPage ?? 1 : innerPage;
  const pageCount = serverPaged ? ctrlPageCount ?? 1 : Math.max(1, Math.ceil(sorted.length / pageSize));
  const visible = serverPaged ? sorted : sorted.slice((page - 1) * pageSize, page * pageSize);
  const goto = (p: number) => (serverPaged ? onPage!(p) : setInnerPage(p));

  function exportCsv() {
    const cols = columns.filter((c) => c.csv);
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [cols.map((c) => esc(c.header)).join(","), ...sorted.map((r) => cols.map((c) => esc(c.csv!(r))).join(","))].join("\n");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv" })), download: `${exportName}.csv` });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (error) return <ErrorState error={error} onRetry={onRetry} />;

  return (
    <div className="grid gap-3">
      {exportName && <div className="flex justify-end"><Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}>{t("common.export")} CSV</Button></div>}
      <div className="overflow-x-auto rounded-none border border-border bg-surface">
        <table className="w-full min-w-[40rem] text-left text-body">
          <thead className="border-b border-border bg-ink-100 text-small text-ink-700">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cx("px-4 py-3 font-medium", c.className)} aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
                  {c.sortValue ? (
                    <button type="button" className="inline-flex items-center gap-1 hover:text-navy-700" aria-label={t("table.sortBy", { column: c.header })}
                      onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }))}>
                      {c.header}<span aria-hidden>{sort?.key === c.key ? (sort.dir === 1 ? "↑" : "↓") : "↕"}</span>
                    </button>
                  ) : c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }, (_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">{columns.map((c) => <td key={c.key} className="px-4 py-3"><Skeleton className="h-4 w-3/4" /></td>)}</tr>
                ))
              : visible.map((r) => (
                  <tr key={rowKey(r)} onClick={onRowClick && (() => onRowClick(r))} className={cx("border-b border-border last:border-0", onRowClick && "cursor-pointer transition-colors hover:bg-navy-50")}>
                    {columns.map((c) => <td key={c.key} className={cx("px-4 py-3", c.className)}>{c.cell(r)}</td>)}
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && !rows.length && <div className="p-4">{empty ?? <EmptyState body={t("table.noResults")} />}</div>}
      </div>
      {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onPage={goto} />}
    </div>
  );
}

export function Pagination({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (p: number) => void }) {
  const { t } = useI18n();
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 text-small">
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>{t("table.previous")}</Button>
      <span aria-live="polite">{t("table.page", { page, pages: pageCount })}</span>
      <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>{t("table.next")}</Button>
    </nav>
  );
}
