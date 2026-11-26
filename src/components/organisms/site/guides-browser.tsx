"use client";
import { useMemo } from "react";
import { Icon } from "@/components/atoms/icon";
import { ButtonLink } from "@/components/atoms/button";
import { GuideResult } from "@/components/molecules/site/guide";
import {
  setUrlParams,
  useUrlParams,
} from "@/components/molecules/site/library";
import { buildIndex, searchServices } from "@/lib/site/service-search";
import { cx } from "@/shared/format";

export type GuideItem = {
  slug: string;
  href: string;
  cat: string;
  title: string;
  summary: string;
  text: string;
  minutes: string;
  popular?: boolean;
};
type Copy = {
  search: string;
  allTopics: string;
  results: string;
  resultsFor: string;
  noneTitle: string;
  noneBody: string;
  browse: string;
  prev: string;
  next: string;
  page: string;
  whatsapp: string;
};
const PER = 8;
const fill = (s: string, v: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

/**
 * Guides list: topic filter (left, with counts), instant search (accent/typo tolerant, same scorer as the service
 * search), highlighted matches, paging and an empty state. State lives in ?q=&cat=&page= so results are shareable.
 */
export function GuidesBrowser({
  items,
  cats,
  copy,
  waHref,
}: {
  items: GuideItem[];
  cats: { key: string; label: string }[];
  copy: Copy;
  waHref: string;
}) {
  const params = useUrlParams();
  const q = params.get("q") ?? "",
    cat = params.get("cat") ?? "",
    page = Math.max(1, Number(params.get("page")) || 1);
  const index = useMemo(
    () =>
      buildIndex(
        items.map((g) => ({
          slug: g.slug,
          path: g.href,
          name: g.title,
          family: g.cat,
          summary: `${g.summary} ${g.text}`,
          popular: g.popular ? 10 : 0,
        })),
      ),
    [items],
  );
  const bySlug = useMemo(() => new Map(items.map((g) => [g.slug, g])), [items]);
  const hits = useMemo(() => {
    const base = q.trim()
      ? searchServices(index, q, 200).map((h) => ({
          g: bySlug.get(h.item.slug)!,
          ranges: h.ranges,
        }))
      : items.map((g) => ({ g, ranges: [] as [number, number][] }));
    return base.filter((h) => !cat || h.g.cat === cat);
  }, [q, cat, index, bySlug, items]);
  const count = (k: string) =>
    k ? items.filter((g) => g.cat === k).length : items.length;
  const pages = Math.max(1, Math.ceil(hits.length / PER)),
    at = Math.min(page, pages);
  const shown = hits.slice((at - 1) * PER, at * PER);
  const label = (k: string) => cats.find((c) => c.key === k)?.label ?? k;

  return (
    <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
      <nav
        aria-label={copy.allTopics}
        className="lg:sticky lg:top-28 lg:self-start"
      >
        <ul className="no-scrollbar -mx-gutter flex gap-2 overflow-x-auto px-gutter lg:mx-0 lg:grid lg:gap-0 lg:overflow-visible lg:px-0">
          {[{ key: "", label: copy.allTopics }, ...cats].map((c) => (
            <li key={c.key || "all"} className="shrink-0">
              <button
                type="button"
                aria-pressed={cat === c.key}
                onClick={() => setUrlParams({ cat: c.key || null, page: null })}
                className={cx(
                  "flex h-10 w-full items-center justify-between gap-4 border px-3 text-small transition-colors lg:border-0 lg:border-l-2",
                  cat === c.key
                    ? "border-navy-700 bg-navy-700 text-white lg:bg-white lg:font-semibold lg:text-navy-900"
                    : "border-border bg-white text-ink-800 hover:text-navy-900 lg:bg-transparent",
                )}
              >
                {c.label}
                <span
                  className={cx(
                    "px-1.5 text-eyebrow tabular",
                    cat === c.key ? "bg-white/15 lg:bg-sky-100" : "bg-ink-100",
                  )}
                >
                  {count(c.key)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid content-start gap-6">
        <label className="relative block">
          <span className="sr-only">{copy.search}</span>
          <Icon
            name="search"
            size={20}
            className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-navy-700"
          />
          <input
            type="search"
            value={q}
            onChange={(e) =>
              setUrlParams({ q: e.target.value || null, page: null })
            }
            placeholder={copy.search}
            className="h-14 w-full border border-border-strong bg-white pr-5 pl-13 text-body text-ink-900 placeholder:text-fg-subtle focus:border-gold-400 focus:outline-none"
          />
        </label>
        <p aria-live="polite" className="text-small text-fg-muted">
          {q.trim() ? (
            <>
              <span className="text-h3 text-fg-heading">
                {fill(copy.resultsFor, { q })}
              </span>
              <br />
            </>
          ) : null}
          {fill(copy.results, { n: hits.length })}
          {cat ? ` · ${label(cat)}` : ""}
        </p>

        {shown.length ? (
          <ul className="grid gap-3">
            {shown.map(({ g, ranges }) => (
              <li key={g.slug}>
                <GuideResult
                  href={g.href}
                  cat={label(g.cat)}
                  title={g.title}
                  ranges={ranges}
                  summary={g.summary}
                  minutes={g.minutes}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid justify-items-center gap-4 border border-dashed border-border-strong bg-white px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center bg-sky-100 text-navy-700">
              <Icon name="search" size={22} />
            </span>
            <p className="text-h3">{copy.noneTitle}</p>
            <p className="max-w-md text-body text-fg-muted">
              {fill(copy.noneBody, { q })}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => setUrlParams({ q: null, cat: null, page: null })}
                className="inline-flex h-11 items-center border border-border-strong bg-white px-5 text-button text-ink-900 hover:bg-sky-50"
              >
                {copy.browse}
              </button>
              <ButtonLink href={waHref} dots>
                {copy.whatsapp}
              </ButtonLink>
            </div>
          </div>
        )}

        {pages > 1 && (
          <nav
            aria-label={fill(copy.page, { i: at, n: pages })}
            className="flex items-center justify-center gap-4 text-small"
          >
            <button
              type="button"
              disabled={at <= 1}
              onClick={() => setUrlParams({ page: String(at - 1) })}
              className="inline-flex h-10 items-center gap-1 px-3 text-navy-900 disabled:text-fg-disabled"
            >
              <Icon name="chevronLeft" size={16} />
              {copy.prev}
            </button>
            <span className="tabular text-fg-muted">
              {fill(copy.page, { i: at, n: pages })}
            </span>
            <button
              type="button"
              disabled={at >= pages}
              onClick={() => setUrlParams({ page: String(at + 1) })}
              className="inline-flex h-10 items-center gap-1 px-3 text-navy-900 disabled:text-fg-disabled"
            >
              {copy.next}
              <Icon name="chevronRight" size={16} />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
