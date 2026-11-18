"use client";
// OpsTable: the reusable ops list organism (lane A; reused by other lanes).
// Selection (checkbox, shift-range, select-all-matching), density 44/36px, sticky muted header, sortable columns,
// J/K focus + Enter open + X select, column visibility/order, inline expandable row, optional grouping,
// and a stacked-card rendering below 768px. All state is controlled by the caller where it belongs in the URL.
// shortcut: renders up to `pageSize` rows with "Show more" instead of true virtualisation; swap for a virtualiser past ~2,000 rows.
import { Fragment, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cx } from "@/shared/format";
import { Icon } from "@/components/atoms/icon";
import { Skeleton, EmptyState, ErrorState } from "@/components/atoms/feedback";
import { Button } from "@/components/atoms/button";
import { useShortcut } from "@/lib/ops/shortcuts";
import { opsCommon } from "@/content/pages/ops-common";
import { opsTableCopy } from "@/content/pages/ops-table";
import type { Density } from "@/components/molecules/ops/ops";

export type OpsColumn<T> = {
  key: string;
  /** Plain-text name (header, column picker, card labels, sort label). */
  label: string;
  /** Optional rich header; defaults to `label`. */
  header?: ReactNode;
  cell: (row: T) => ReactNode;
  /** Value to sort by; the column is sortable when present. */
  sort?: (row: T) => string | number;
  align?: "left" | "right";
  /** Visible in the stacked phone card (default true). */
  card?: boolean;
  /** Allow the cell to wrap (chips, long text). Default: no wrap. */
  wrap?: boolean;
  className?: string;
};
export type SortState = { key: string; dir: "asc" | "desc" } | null;

export type OpsTableProps<T> = {
  rows: T[];
  columns: OpsColumn<T>[];
  rowKey: (row: T) => string;
  /** Accessible name of the table region. */
  label: string;
  rowLabel?: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty?: ReactNode;
  // selection
  selected?: string[];
  onSelect?: (keys: string[]) => void;
  // density + columns
  density?: Density;
  visible?: string[];
  order?: string[];
  // sorting (controlled when onSort is given)
  sort?: SortState;
  onSort?: (s: SortState) => void;
  // keyboard focus
  focused?: string | null;
  onFocus?: (key: string) => void;
  onOpen?: (row: T) => void;
  /** Register J/K/X/Enter while mounted (one keyboard list per page). */
  shortcuts?: boolean;
  // expansion
  expanded?: string | null;
  onExpand?: (key: string | null) => void;
  renderExpanded?: (row: T) => ReactNode;
  // grouping
  groupBy?: (row: T) => string;
  groupHeader?: (group: string, rows: T[]) => ReactNode;
  /** What tapping a phone card does: open the row (default) or just focus it (e.g. to show a quick-look sheet). */
  cardAction?: "open" | "focus";
  /** Custom phone card (must not contain interactive elements: the card is a button); defaults to the card-enabled columns as label/value pairs. */
  renderCard?: (row: T) => ReactNode;
  /** Highlight a row (e.g. overdue expectation, claimed by someone else). */
  rowTone?: (row: T) => "danger" | "muted" | null;
  pageSize?: number;
  /** Rendered above the rows inside the region (e.g. the live "N new" banner). */
  banner?: ReactNode;
};

export function sortRows<T>(
  rows: T[],
  columns: OpsColumn<T>[],
  sort: SortState,
): T[] {
  const col = sort && columns.find((c) => c.key === sort.key);
  if (!col?.sort) return rows;
  const f = col.sort,
    d = sort?.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = f(a),
      y = f(b);
    return (x < y ? -1 : x > y ? 1 : 0) * d;
  });
}

export function OpsTable<T>(p: OpsTableProps<T>) {
  const { locale } = useI18n();
  const c = opsTableCopy(locale);
  const common = opsCommon(locale);
  const {
    rows,
    columns,
    rowKey,
    selected,
    onSelect,
    density = "comfortable",
    pageSize = 50,
  } = p;
  const label = p.rowLabel ?? rowKey;
  const [innerSort, setInnerSort] = useState<SortState>(null);
  const sort = p.onSort ? (p.sort ?? null) : innerSort;
  const setSort = p.onSort ?? setInnerSort;
  const [limit, setLimit] = useState(pageSize);
  const anchor = useRef<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [rowHasFocus, setRowHasFocus] = useState(false);

  const cols = (p.order ?? columns.map((x) => x.key))
    .filter((k) => !p.visible || p.visible.includes(k))
    .map((k) => columns.find((x) => x.key === k))
    .filter((x): x is OpsColumn<T> => !!x);
  const sorted = sortRows(rows, columns, sort);
  const shown = sorted.slice(0, limit);
  const keys = shown.map(rowKey);
  const sel = new Set(selected ?? []);
  const selectable = !!onSelect;
  const pageAll = keys.length > 0 && keys.every((k) => sel.has(k));
  const pageSome = keys.some((k) => sel.has(k));
  const allMatching = rows.length > 0 && rows.every((r) => sel.has(rowKey(r)));

  const toggle = (i: number, shift: boolean) => {
    if (!onSelect) return;
    const k = keys[i];
    const next = new Set(sel);
    if (shift && anchor.current !== null) {
      const [a, b] = [anchor.current, i].sort((x, y) => x - y);
      const on = !sel.has(k);
      keys.slice(a, b + 1).forEach((x) => (on ? next.add(x) : next.delete(x)));
    } else if (next.has(k)) next.delete(k);
    else next.add(k);
    anchor.current = i;
    onSelect([...next]);
  };
  const togglePage = () =>
    onSelect?.(
      pageAll
        ? [...sel].filter((k) => !keys.includes(k))
        : [...new Set([...sel, ...keys])],
    );

  const focusIndex = p.focused ? keys.indexOf(p.focused) : -1;
  const moveFocus = (d: 1 | -1) => {
    if (!keys.length || !p.onFocus) return;
    const i = Math.max(0, Math.min(keys.length - 1, focusIndex + d));
    p.onFocus(keys[i]);
    // Focus the row in whichever rendering is visible (table ≥768px, cards below).
    requestAnimationFrame(() => {
      const el = [
        ...(bodyRef.current?.querySelectorAll<HTMLElement>(
          `[data-row="${CSS.escape(keys[i])}"]`,
        ) ?? []),
      ].find((x) => x.offsetParent !== null);
      // Table rows take focus themselves; phone cards hand it to their first control (a focusable card wrapping buttons fails a11y).
      const target = el?.tagName === "TR" ? el : (el?.querySelector<HTMLElement>("a,button,input") ?? el);
      target?.focus();
      el?.scrollIntoView({ block: "nearest" });
    });
  };
  const on = !!p.shortcuts && !p.loading;
  useShortcut("j", common.shortcuts.next, () => moveFocus(1), "list", on);
  useShortcut("k", common.shortcuts.prev, () => moveFocus(-1), "list", on);
  useShortcut(
    "x",
    common.shortcuts.select,
    () => focusIndex >= 0 && toggle(focusIndex, false),
    "list",
    on && selectable,
  );
  useShortcut(
    "enter",
    common.shortcuts.open,
    () => focusIndex >= 0 && p.onOpen?.(shown[focusIndex]),
    "list",
    on && rowHasFocus && !!p.onOpen,
  );
  const onRowFocus = (e: React.FocusEvent) =>
    setRowHasFocus((e.target as HTMLElement).hasAttribute("data-row"));

  if (p.error)
    return (
      <ErrorState
        error={p.error}
        onRetry={p.onRetry}
        className="border border-border bg-surface"
      />
    );

  const groups: [string | null, T[]][] = p.groupBy
    ? [
        ...shown
          .reduce((m, r) => {
            const g = p.groupBy!(r);
            m.set(g, [...(m.get(g) ?? []), r]);
            return m;
          }, new Map<string, T[]>())
          .entries(),
      ]
    : [[null, shown]];
  const span = cols.length + (selectable ? 1 : 0) + (p.renderExpanded ? 1 : 0);
  const rowH = density === "compact" ? "h-9" : "h-11";
  const tone = (r: T) => p.rowTone?.(r);

  const checkbox = (r: T, i: number) => (
    <input
      type="checkbox"
      checked={sel.has(rowKey(r))}
      onChange={() => {}}
      onClick={(e) => {
        e.stopPropagation();
        toggle(i, e.shiftKey);
      }}
      aria-label={c.selectRow.replace("{label}", label(r))}
      className="size-4 accent-secondary"
    />
  );
  const expander = (r: T) => {
    const k = rowKey(r),
      open = p.expanded === k;
    return (
      <button
        type="button"
        aria-expanded={open}
        aria-label={(open ? c.collapse : c.expand).replace("{label}", label(r))}
        onClick={(e) => {
          e.stopPropagation();
          p.onExpand?.(open ? null : k);
        }}
        className="flex size-8 items-center justify-center text-fg-muted hover:bg-ink-100 hover:text-fg"
      >
        <Icon
          name="chevronDown"
          size={16}
          aria-hidden
          className={cx("transition-transform", open && "rotate-180")}
        />
      </button>
    );
  };
  const selectBanner = selectable && pageAll && rows.length > keys.length && (
    <p className="flex flex-wrap items-center justify-center gap-2 border-b border-border bg-bg-tint px-4 py-2 text-small">
      {allMatching
        ? c.allSelected.replace("{n}", String(rows.length))
        : c.pageSelected.replace("{n}", String(keys.length))}
      {!allMatching && (
        <button
          type="button"
          onClick={() => onSelect?.(rows.map(rowKey))}
          className="font-medium text-link underline underline-offset-4"
        >
          {common.selectAllMatching.replace("{n}", String(rows.length))}
        </button>
      )}
    </p>
  );

  return (
    <div
      ref={bodyRef}
      onFocus={onRowFocus}
      className="min-w-0 overflow-hidden border border-border bg-surface"
    >
      {p.banner}
      {selectBanner}
      {p.loading ? (
        <div className="grid gap-2 p-4" aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className={cx("w-full ", rowH)} />
          ))}
        </div>
      ) : !rows.length ? (
        <div className="p-4">{p.empty ?? <EmptyState />}</div>
      ) : (
        <>
          {/* ≥768px: table in a focusable scroll region with a sticky header */}
          <div
            role="region"
            aria-label={p.label}
            tabIndex={0}
            className="hidden max-h-[70vh] overflow-auto md:block"
          >
            <table className="w-full border-collapse text-small">
              <thead className="sticky top-0 z-10 bg-ink-100 text-left text-eyebrow text-fg-muted">
                <tr>
                  {selectable && (
                    <th scope="col" className="w-10 px-3">
                      <input
                        type="checkbox"
                        checked={pageAll}
                        ref={(el) => {
                          if (el) el.indeterminate = pageSome && !pageAll;
                        }}
                        onChange={togglePage}
                        aria-label={c.selectAll}
                        className="size-4 accent-secondary"
                      />
                    </th>
                  )}
                  {cols.map((col) => {
                    const active = sort?.key === col.key;
                    return (
                      <th
                        key={col.key}
                        scope="col"
                        aria-sort={
                          active
                            ? sort?.dir === "asc"
                              ? "ascending"
                              : "descending"
                            : undefined
                        }
                        className={cx(
                          "h-10 px-3 font-medium whitespace-nowrap",
                          col.align === "right" && "text-right",
                          col.className,
                        )}
                      >
                        {col.sort ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSort(
                                !active
                                  ? { key: col.key, dir: "asc" }
                                  : sort?.dir === "asc"
                                    ? { key: col.key, dir: "desc" }
                                    : null,
                              )
                            }
                            aria-label={c.sortBy.replace("{col}", col.label)}
                            className="inline-flex items-center gap-1 hover:text-fg"
                          >
                            {col.header ?? col.label}
                            <span aria-hidden className="w-3 text-fg">
                              {active ? (sort?.dir === "asc" ? "↑" : "↓") : ""}
                            </span>
                          </button>
                        ) : (
                          (col.header ?? col.label)
                        )}
                      </th>
                    );
                  })}
                  {p.renderExpanded && (
                    <th scope="col" className="w-10">
                      <span className="sr-only">
                        {c.expand.replace("{label}", "")}
                      </span>
                    </th>
                  )}
                </tr>
              </thead>
              {groups.map(([g, list]) => (
                <tbody key={g ?? "_"}>
                  {g !== null && (
                    <tr className="bg-bg-subtle">
                      <th
                        scope="colgroup"
                        colSpan={span}
                        className="px-3 py-2 text-left text-small font-medium"
                      >
                        {p.groupHeader?.(g, list) ?? g}
                      </th>
                    </tr>
                  )}
                  {list.map((r) => {
                    const k = rowKey(r),
                      i = keys.indexOf(k);
                    return (
                      <Fragment key={k}>
                        <tr
                          data-row={k}
                          tabIndex={-1}
                          onClick={() => {
                            p.onFocus?.(k);
                          }}
                          onDoubleClick={() => p.onOpen?.(r)}
                          className={cx(
                            "border-t border-border transition-colors outline-none focus-visible:bg-bg-tint",
                            rowH,
                            p.focused === k
                              ? "bg-bg-tint shadow-[inset_3px_0_0_var(--color-primary)]"
                              : sel.has(k)
                                ? "bg-bg-subtle"
                                : "hover:bg-bg-subtle/60",
                            tone(r) === "danger" && "bg-danger-bg/60",
                            tone(r) === "muted" && "text-fg-muted",
                          )}
                        >
                          {selectable && (
                            <td className="px-3">{checkbox(r, i)}</td>
                          )}
                          {cols.map((col) => (
                            <td
                              key={col.key}
                              className={cx(
                                "px-3 py-1.5 align-middle",
                                !col.wrap && "whitespace-nowrap", // cells keep their content on one line unless the column opts in
                                col.align === "right" && "text-right tabular",
                                col.className,
                              )}
                            >
                              {col.cell(r)}
                            </td>
                          ))}
                          {p.renderExpanded && (
                            <td className="pr-2">{expander(r)}</td>
                          )}
                        </tr>
                        {p.renderExpanded && p.expanded === k && (
                          <tr className="bg-bg-subtle/60">
                            <td colSpan={span} className="px-4 py-3">
                              {p.renderExpanded(r)}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              ))}
            </table>
          </div>

          {/* <768px: stacked cards */}
          <div className="grid gap-0 md:hidden">
            {groups.map(([g, list]) => (
              <section key={g ?? "_"} aria-label={g ?? p.label}>
                {g !== null && (
                  <h3 className="bg-bg-subtle px-4 py-2 text-small font-medium">
                    {p.groupHeader?.(g, list) ?? g}
                  </h3>
                )}
                <ul>
                  {list.map((r) => {
                    const k = rowKey(r),
                      i = keys.indexOf(k);
                    return (
                      <li
                        key={k}
                        data-row={k}
                        className={cx(
                          "grid grid-cols-[auto_1fr_auto] items-start gap-3 border-t border-border px-4 py-3 outline-none first:border-t-0",
                          p.focused === k && "bg-bg-tint",
                          tone(r) === "danger" && "bg-danger-bg/60",
                        )}
                      >
                        <span className="pt-0.5">
                          {selectable && checkbox(r, i)}
                        </span>
                        {p.renderCard ? (
                          <button
                            type="button"
                            onClick={() => {
                              p.onFocus?.(k);
                              if (p.cardAction !== "focus") p.onOpen?.(r);
                            }}
                            className="grid min-w-0 gap-1.5 text-left"
                          >
                            {p.renderCard(r)}
                          </button>
                        ) : (
                          // Default cards show live cells (links, buttons), so the card itself must not be a button (nested-interactive).
                          <dl className="grid min-w-0 gap-1 text-small">
                            {cols
                              .filter((col) => col.card !== false)
                              .map((col) => (
                                <div key={col.key} className="flex min-w-0 flex-wrap items-center gap-x-2">
                                  <dt className="text-eyebrow text-fg-subtle">{col.label}</dt>
                                  <dd className="min-w-0">{col.cell(r)}</dd>
                                </div>
                              ))}
                          </dl>
                        )}
                        {p.renderExpanded ? expander(r) : <span />}
                        {p.renderExpanded && p.expanded === k && (
                          <div className="col-span-3">
                            {p.renderExpanded(r)}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
          {rows.length > limit && (
            <div className="flex justify-center border-t border-border p-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLimit((l) => l + pageSize)}
              >
                {c.showMore.replace(
                  "{n}",
                  String(Math.min(pageSize, rows.length - limit)),
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
