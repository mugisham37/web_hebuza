"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { localHref } from "@/shared/i18n/config";
import { cx, formatMoney } from "@/shared/format";
import { Icon } from "@/components/atoms/icon";
import { fill, type LBCopy } from "@/content/pages/lb";
import { setUrlParams, useUrlParams } from "@/lib/url-state";

type P = LBCopy["pricing"];

/** Monthly / Per-service toggle: keeps ?view= in the URL and scrolls to the matching section. */
export function PayToggle({ copy }: { copy: P["toggle"] }) {
  const view =
    useUrlParams().get("view") === "services" ? "services" : "monthly";
  const pick = (v: "monthly" | "services") => {
    setUrlParams({ view: v === "monthly" ? null : v });
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    document
      .getElementById(v === "monthly" ? "plans" : "fees")
      ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };
  return (
    <div
      role="group"
      aria-label={copy.label}
      className="inline-flex border border-white/25 p-1"
    >
      {(["monthly", "services"] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          onClick={() => pick(v)}
          className={cx(
            "h-11 whitespace-nowrap px-5 text-button transition-colors",
            view === v ? "bg-white text-navy-900" : "text-white hover:bg-white/10",
          )}
        >
          {v === "monthly" ? copy.monthly : copy.perService}
        </button>
      ))}
    </div>
  );
}

export type FeeRow = {
  slug: string;
  /** public slug for this locale (F-CAT-07) */
  path: string;
  name: string;
  family: string;
  area: string;
  standard: number | null;
  urgent: number | null;
  quote: boolean;
};

/** Service fee table: search + area filter + sticky header + "Show all". Filtering is client-side over the full catalogue (~48 rows). */
export function FeeTable({
  rows,
  areas,
  copy,
}: {
  rows: FeeRow[];
  areas: { slug: string; name: string }[];
  copy: P;
}) {
  const { locale } = useI18n();
  const [q, setQ] = useState("");
  const [area, setArea] = useState("all");
  const [all, setAll] = useState(false);
  const visible = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (area === "all" || r.family === area) &&
        (!n || `${r.name} ${r.area}`.toLowerCase().includes(n)),
    );
  }, [rows, q, area]);
  const LIMIT = 8;
  const shown = all ? visible : visible.slice(0, LIMIT);
  const money = (n: number | null, quote: boolean) =>
    quote ? copy.quote : n === null ? "—" : formatMoney(n, "RWF", locale);
  return (
    <div className="grid gap-4">
      <div className="relative">
        <Icon
          name="search"
          size={18}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fg-subtle"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={copy.search}
          aria-label={copy.search}
          className="h-12 w-full border border-border-strong bg-white pr-4 pl-11 text-body placeholder:text-fg-subtle focus:border-navy-700 focus:outline-none"
        />
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={copy.area}>
        {[{ slug: "all", name: copy.all }, ...areas].map((a) => (
          <button
            key={a.slug}
            type="button"
            aria-pressed={area === a.slug}
            onClick={() => setArea(a.slug)}
            className={cx(
              "h-9 border px-3.5 text-small",
              area === a.slug
                ? "border-secondary bg-secondary text-on-secondary"
                : "border-border-strong bg-white hover:bg-ink-50",
            )}
          >
            {a.name}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div
          role="status"
          className="grid justify-items-start gap-3 border border-dashed border-border-strong bg-white p-6"
        >
          <p className="text-body">{fill(copy.noResults, { q })}</p>
          <button
            type="button"
            onClick={() => {
              setQ("");
              setArea("all");
            }}
            className="text-small font-medium underline"
          >
            {copy.clear}
          </button>
        </div>
      ) : (
        <div
          className="max-h-[36rem] overflow-auto border border-border bg-white"
          tabIndex={0}
          role="region"
          aria-label={copy.feesTitle}
        >
          <table className="w-full min-w-[36rem] text-left text-small">
            <thead className="sticky top-0 z-10 bg-ink-100 text-label">
              <tr>
                <th scope="col" className="px-4 py-3">
                  {copy.service}
                </th>
                <th scope="col" className="px-3 py-3">
                  {copy.area}
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  {copy.standard}
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  {copy.urgent}
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">{copy.action}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((r) => (
                <tr key={r.slug} className="hover:bg-navy-50">
                  <th scope="row" className="px-4 py-3 font-medium">
                    <Link
                      href={localHref(locale, `/services/${r.path}`)}
                      className="hover:underline"
                    >
                      {r.name}
                    </Link>
                  </th>
                  <td className="px-3 py-3 text-fg-muted">{r.area}</td>
                  <td className="tabular px-3 py-3 text-right whitespace-nowrap">
                    {money(r.standard, r.quote)}
                  </td>
                  <td className="tabular px-3 py-3 text-right whitespace-nowrap">
                    {money(r.urgent, false)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={localHref(locale, `/apply/${r.slug}`)}
                      aria-label={fill(copy.applyFor, { name: r.name })}
                      className="inline-flex h-8 items-center bg-secondary px-3 text-eyebrow text-on-secondary hover:bg-secondary-hover"
                    >
                      {copy.apply}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {visible.length > LIMIT && (
        <div className="flex items-center gap-4">
          <p className="text-small text-fg-subtle" aria-live="polite">
            {fill(copy.showing, { n: shown.length, total: visible.length })}
          </p>
          <button
            type="button"
            onClick={() => setAll(!all)}
            aria-expanded={all}
            className="h-9 bg-ink-100 px-4 text-small font-medium hover:bg-ink-200"
          >
            {all ? copy.showLess : copy.showAll}
          </button>
        </div>
      )}
    </div>
  );
}
