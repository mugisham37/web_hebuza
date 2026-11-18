"use client";
import { useState, type ReactNode } from "react";
import { Icon } from "@/components/atoms/icon";
import { Button } from "@/components/atoms/button";
import { Chips, setUrlParams, useUrlParams } from "@/components/molecules/site/library";

const PAGE = 6;

/** /knowledge search + category chips + pagination over server-rendered cards (state in ?q=&cat=&page=). */
export function KnowledgeBrowser({
  items,
  cards,
  cats,
  copy,
}: {
  items: { cat: string; haystack: string }[];
  cards: ReactNode[];
  cats: { v: string; label: string }[];
  copy: {
    search: string;
    all: string;
    noneT: string;
    noneB: string;
    clear: string;
    prev: string;
    next: string;
    page: string;
    gridT: string;
  };
}) {
  const p = useUrlParams();
  const q = p.get("q") ?? "";
  const cat = p.get("cat") ?? "all";
  const n = q.trim().toLowerCase();
  const hits = items
    .map((it, i) => ({ it, i }))
    .filter(
      ({ it }) =>
        (cat === "all" || it.cat === cat) && (!n || it.haystack.includes(n)),
    );
  const pages = Math.max(1, Math.ceil(hits.length / PAGE));
  const page = Math.min(Math.max(Number(p.get("page")) || 1, 1), pages);
  const shown = hits.slice((page - 1) * PAGE, page * PAGE);
  const clear = () => setUrlParams({ q: null, cat: null, page: null });

  return (
    <div className="grid gap-10">
      <div className="grid gap-4">
        <div className="relative max-w-2xl">
          <Icon
            name="search"
            size={22}
            className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-fg-subtle"
          />
          <input
            type="search"
            value={q}
            aria-label={copy.search}
            placeholder={copy.search}
            onChange={(e) =>
              setUrlParams({ q: e.target.value || null, page: null })
            }
            className="h-14 w-full border border-border-strong bg-white pr-5 pl-14 text-body shadow-sm placeholder:text-fg-subtle focus:border-navy-700 focus:outline-none"
          />
        </div>
        <Chips
          label={copy.gridT}
          value={cat}
          onChange={(v) =>
            setUrlParams({ cat: v === "all" ? null : v, page: null })
          }
          options={[{ v: "all", label: copy.all }, ...cats]}
        />
      </div>
      <section aria-labelledby="grid-t">
        <h2 id="grid-t" className="text-h2">
          {copy.gridT}
        </h2>
        <p role="status" className="sr-only">
          {hits.length}
        </p>
        {shown.length ? (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map(({ i }) => (
              <li key={i} className="grid">
                {cards[i]}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 grid justify-items-start gap-3 border border-dashed border-border-strong p-8">
            <p className="text-h3">{copy.noneT}</p>
            <p className="text-body text-fg-muted">{copy.noneB}</p>
            <Button variant="secondary" onClick={clear}>
              {copy.clear}
            </Button>
          </div>
        )}
        {pages > 1 && (
          <nav
            aria-label={copy.gridT}
            className="mt-10 flex flex-wrap items-center justify-center gap-2"
          >
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() =>
                setUrlParams({ page: page > 2 ? String(page - 1) : null })
              }
            >
              ← {copy.prev}
            </Button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((x) => (
              <button
                key={x}
                type="button"
                aria-current={x === page ? "page" : undefined}
                aria-label={copy.page.replace("{n}", String(x))}
                onClick={() => setUrlParams({ page: x > 1 ? String(x) : null })}
                className={
                  x === page
                    ? "size-9 bg-secondary text-small text-on-secondary"
                    : "size-9 border border-border-strong text-small"
                }
              >
                {x}
              </button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={page === pages}
              onClick={() => setUrlParams({ page: String(page + 1) })}
            >
              {copy.next} →
            </Button>
          </nav>
        )}
      </section>
    </div>
  );
}

/** /updates institution + "affects" filters and "load older" over server-rendered entries. */
export function UpdatesBrowser({
  items,
  cards,
  insts,
  affects,
  copy,
  step = 3,
}: {
  items: { inst: string; affects: string[] }[];
  cards: ReactNode[];
  insts: string[];
  affects: { v: string; label: string }[];
  copy: {
    inst: string;
    affects: string;
    all: string;
    more: string;
    noneT: string;
    noneB: string;
    clear: string;
  };
  step?: number;
}) {
  const p = useUrlParams();
  const inst = p.get("inst") ?? "all";
  const aff = p.get("affects") ?? "all";
  const [limit, setLimit] = useState(step);
  const hits = items
    .map((it, i) => ({ it, i }))
    .filter(
      ({ it }) =>
        (inst === "all" || it.inst === inst) &&
        (aff === "all" || it.affects.includes(aff)),
    );
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-label" aria-hidden>
            {copy.inst}:
          </span>
          <Chips
            size="sm"
            label={copy.inst}
            value={inst}
            onChange={(v) => setUrlParams({ inst: v === "all" ? null : v })}
            options={[
              { v: "all", label: copy.all },
              ...insts.map((v) => ({ v, label: v })),
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-label" aria-hidden>
            {copy.affects}:
          </span>
          <Chips
            size="sm"
            label={copy.affects}
            value={aff}
            onChange={(v) => setUrlParams({ affects: v === "all" ? null : v })}
            options={[{ v: "all", label: copy.all }, ...affects]}
          />
        </div>
      </div>
      {hits.length ? (
        <ul className="grid gap-4">
          {hits.slice(0, limit).map(({ i }) => (
            <li key={i}>{cards[i]}</li>
          ))}
        </ul>
      ) : (
        <div
          role="status"
          className="grid justify-items-start gap-3 border border-dashed border-border-strong p-8"
        >
          <p className="text-h3">{copy.noneT}</p>
          <p className="text-body text-fg-muted">{copy.noneB}</p>
          <Button
            variant="secondary"
            onClick={() => setUrlParams({ inst: null, affects: null })}
          >
            {copy.clear}
          </Button>
        </div>
      )}
      {hits.length > limit && (
        <Button
          variant="outline"
          className="justify-self-center"
          onClick={() => setLimit((l) => l + step)}
        >
          {copy.more}
        </Button>
      )}
    </div>
  );
}
