"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { localHref } from "@/shared/i18n/config";
import { cx, formatNumber } from "@/shared/format";
import { Icon } from "@/components/atoms/icon";
import { ButtonLink } from "@/components/atoms/button";
import { waLink } from "@/content/marketing";
import { matches } from "@/components/molecules/site/search";

export type BrowserFamily = { slug: string; name: string; short: string; count: number };
export type BrowserService = { slug: string; family: string; name: string; haystack: string; price: number | null; days: number; popular: number; planCovered: boolean; html: number };

type Copy = { search: string; quick: string[]; all: string; showing: string; clear: string; sortPopular: string; sortPrice: string; sortFast: string; covered: string; noResultsTitle: string; noResultsBody: string; popularInstead: string; viewArea: string; more: string; whatsapp: string; consult: string; filters: string; area: string; price: string; any: string; upTo: string; turnaround: string; within: string; show: string };

/**
 * Text search runs on the API (F-CAT-06: pg_trgm over every locale, GET /api/services?q=, debounced); facet filters
 * stay client-side over the full list. If the search call fails, local fuzzy matching keeps the box usable.
 * Cards are server-rendered once and passed as `cards[i]`; we only reorder/hide them, keeping JS tiny.
 * State syncs to the URL (?q=&family=&sort=&plan=1) without useSearchParams (no Suspense needed).
 */
export function CatalogueBrowser({ families, services, cards, copy }: { families: BrowserFamily[]; services: BrowserService[]; cards: React.ReactNode[]; copy: Copy }) {
  const { locale } = useI18n();
  const params = useUrlParams();
  const q = params.get("q") ?? "";
  const fam = params.get("family") ?? "all";
  const sort = (params.get("sort") as "popular" | "price" | "fast" | null) ?? "popular";
  const plan = params.get("plan") === "1";
  const max = Number(params.get("max")) || 0;
  const days = Number(params.get("days")) || 0;
  const sheet = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const set = (patch: Record<string, string | null>) => setUrlParams(patch);
  const setQ = (v: string) => set({ q: v || null });
  const setFam = (v: string) => set({ family: v === "all" ? null : v });
  const setSort = (v: string) => set({ sort: v === "popular" ? null : v });
  const setPlan = (v: boolean) => set({ plan: v ? "1" : null });
  const setMax = (v: number) => set({ max: v ? String(v) : null });
  const setDays = (v: number) => set({ days: v ? String(v) : null });
  const rwf = (n: number) => formatNumber(n, locale);
  const [hits, setHits] = useState<{ q: string; slugs: string[] | null } | null>(null);
  useEffect(() => {
    const term = q.trim();
    if (!term) return;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/services?q=${encodeURIComponent(term)}`, { signal: ctl.signal })
        .then((r) => (r.ok ? (r.json() as Promise<{ data: { services: { slug: string }[] } }>) : Promise.reject(r)))
        .then((r) => setHits({ q: term, slugs: r.data.services.map((x) => x.slug) }))
        .catch((e: unknown) => { if (!ctl.signal.aborted) setHits({ q: term, slugs: null }); void e; });
    }, 250);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);
  const server = q.trim() && hits?.q === q.trim() ? hits.slugs : null;

  const visible = useMemo(() => {
    let list = services.filter((s) => (fam === "all" || s.family === fam) && (!plan || s.planCovered) && (!max || (s.price !== null && s.price <= max)) && (!days || s.days <= days) && (!q.trim() || (server ? server.includes(s.slug) : matches(s.haystack, q))));
    list = [...list].sort((a, b) => sort === "price" ? (a.price ?? 1e12) - (b.price ?? 1e12) : sort === "fast" ? a.days - b.days : b.popular - a.popular);
    return list;
  }, [q, fam, sort, plan, max, days, services, server]);

  const groups = families.map((f) => ({ f, items: visible.filter((s) => s.family === f.slug) })).filter((g) => g.items.length);
  const filtered = !!(q || fam !== "all" || plan || max || days || sort !== "popular");
  const active = [fam !== "all", plan, max, days].filter(Boolean).length;
  const LIMIT = 6;

  return (
    <div>
      <div className="grid gap-4">
        <div className="relative">
          <Icon name="search" size={22} className="pointer-events-none absolute top-1/2 left-6 -translate-y-1/2 text-white/60" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={copy.search} aria-label={copy.search}
            className="h-16 w-full border border-white/20 bg-transparent pr-6 pl-15 text-lead text-white placeholder:text-white/50 focus:border-gold-400 focus:outline-none" />
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {copy.quick.map((t) => <button key={t} type="button" aria-pressed={q === t} onClick={() => setQ(t)} className="h-9 shrink-0 bg-white/10 px-4 text-small text-white hover:bg-white/20 aria-pressed:bg-white aria-pressed:text-navy-900">{t}</button>)}
        </div>
      </div>

      <div className="sticky top-[4.5rem] z-20 -mx-gutter mt-8 bg-bg/90 px-gutter py-3 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0 md:backdrop-blur-none">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 md:hidden">
            <button type="button" onClick={() => sheet.current?.showModal()} className="inline-flex h-10 items-center gap-2 bg-secondary px-4 text-button text-on-secondary hover:bg-secondary-hover">
              <Icon name="layers" size={16} />{copy.filters}{active > 0 && <span className="bg-primary px-1.5 text-eyebrow text-on-gold">{active}</span>}
            </button>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" className="h-10 min-w-0 flex-1 px-4 text-small border border-white/20 bg-transparent text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 [&_option]:bg-ink-950 [&_option]:text-white">
              <option value="popular">{copy.sortPopular}</option><option value="price">{copy.sortPrice}</option><option value="fast">{copy.sortFast}</option>
            </select>
          </div>
          <div role="group" aria-label="Areas" className="no-scrollbar hidden gap-2 overflow-x-auto md:flex">
            {[{ slug: "all", short: copy.all, count: services.length }, ...families].map((f) => (
              <button key={f.slug} type="button" aria-pressed={fam === f.slug} onClick={() => setFam(f.slug)}
                className={cx("inline-flex h-10 shrink-0 items-center gap-2 border px-4 text-button transition-colors", fam === f.slug ? "border-white bg-white text-navy-900" : "border-white/20 bg-transparent text-white hover:border-white/50")}>
                {f.short}<span className={cx("px-1.5 text-eyebrow", fam === f.slug ? "bg-navy-900/10" : "bg-white/10 text-white/70")}>{f.count}</span>
              </button>
            ))}
          </div>
          <div className="hidden shrink-0 flex-wrap items-center gap-2 md:flex">
            <select value={max} onChange={(e) => setMax(+e.target.value)} aria-label={copy.price} className="h-10 px-4 text-small border border-white/20 bg-transparent text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 [&_option]:bg-ink-950 [&_option]:text-white">
              <option value={0}>{copy.price}: {copy.any}</option>{PRICE_BANDS.map((b) => <option key={b} value={b}>{copy.upTo.replace("{n}", rwf(b))}</option>)}
            </select>
            <select value={days} onChange={(e) => setDays(+e.target.value)} aria-label={copy.turnaround} className="h-10 px-4 text-small border border-white/20 bg-transparent text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 [&_option]:bg-ink-950 [&_option]:text-white">
              <option value={0}>{copy.turnaround}: {copy.any}</option>{DAY_BANDS.map((d) => <option key={d} value={d}>{copy.within.replace("{n}", String(d))}</option>)}
            </select>
            <label className="flex h-10 cursor-pointer items-center gap-2 border border-white/20 px-4 text-small text-white focus-within:ring-2 focus-within:ring-gold-400">
              <input type="checkbox" checked={plan} onChange={(e) => setPlan(e.target.checked)} className="size-4 accent-gold-400 focus:outline-none" />{copy.covered}
            </label>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" className="h-10 px-4 text-small border border-white/20 bg-transparent text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 [&_option]:bg-ink-950 [&_option]:text-white">
              <option value="popular">{copy.sortPopular}</option><option value="price">{copy.sortPrice}</option><option value="fast">{copy.sortFast}</option>
            </select>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-3 text-small text-white/65" aria-live="polite">
          {copy.showing.replace("{n}", String(visible.length))}
          {filtered && <button type="button" onClick={() => set({ q: null, family: null, sort: null, plan: null, max: null, days: null })} className="underline">{copy.clear}</button>}
        </p>
      </div>

      {/* S4 phone filter sheet: filters apply live; the footer button just closes it. */}
      <dialog ref={sheet} aria-labelledby="filters-title" className="mt-auto mb-0 max-h-[85dvh] w-full max-w-none bg-bg p-0 text-fg backdrop:bg-ink-950/60 md:hidden">
        <div className="flex items-center justify-between px-gutter pt-5 pb-3">
          <h2 id="filters-title" className="text-h3">{copy.filters}</h2>
          <button type="button" onClick={() => sheet.current?.close()} aria-label="Close" className="flex size-10 items-center justify-center hover:bg-white/10"><Icon name="x" size={18} /></button>
        </div>
        <div className="grid gap-6 px-gutter pb-28">
          <Chips legend={copy.area} value={fam} onChange={setFam} options={[{ v: "all", label: copy.all }, ...families.map((f) => ({ v: f.slug, label: `${f.short} · ${f.count}` }))]} />
          <Chips legend={copy.price} value={String(max)} onChange={(v) => setMax(+v)} options={[{ v: "0", label: copy.any }, ...PRICE_BANDS.map((b) => ({ v: String(b), label: copy.upTo.replace("{n}", rwf(b)) }))]} />
          <Chips legend={copy.turnaround} value={String(days)} onChange={(v) => setDays(+v)} options={[{ v: "0", label: copy.any }, ...DAY_BANDS.map((d) => ({ v: String(d), label: copy.within.replace("{n}", String(d)) }))]} />
          <label className="flex items-center justify-between gap-3 bg-white/10 px-4 py-3 text-label">{copy.covered}
            <input type="checkbox" role="switch" checked={plan} onChange={(e) => setPlan(e.target.checked)} className="size-5 accent-gold-400" />
          </label>
        </div>
        <div className="fixed inset-x-0 bottom-0 flex gap-2 border-t border-border bg-bg px-gutter pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {active > 0 && <button type="button" onClick={() => set({ family: null, plan: null, max: null, days: null })} className="h-12 px-4 text-button underline">{copy.clear}</button>}
          <button type="button" onClick={() => sheet.current?.close()} className="h-12 flex-1 bg-secondary text-button text-on-secondary hover:bg-secondary-hover">{copy.show.replace("{n}", String(visible.length))}</button>
        </div>
      </dialog>

      {visible.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-4 border-2 border-dashed border-white/25 px-6 py-14 text-center text-white">
          <span className="flex size-14 items-center justify-center rounded-full bg-white/10"><Icon name="search" size={24} /></span>
          <h3 className="text-h3">{copy.noResultsTitle.replace("{q}", q)}</h3>
          <p className="max-w-md text-body text-white/70">{copy.noResultsBody}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <a href={waLink(`HEBUZA: ${q}`)} target="_blank" rel="noopener" className="inline-flex h-11 items-center border-[1.5px] border-white/60 px-5 text-button text-white hover:bg-white/10">{copy.whatsapp}</a>
            <ButtonLink href={localHref(locale, "/book")} dots>{copy.consult}</ButtonLink>
          </div>
          <p className="mt-2 flex flex-wrap justify-center gap-2 text-small text-white/65">{copy.popularInstead}
            {[...services].sort((a, b) => b.popular - a.popular).slice(0, 3).map((s) => <Link key={s.slug} href={localHref(locale, `/services/${s.slug}`)} className="bg-white/10 px-3 py-1 text-white hover:bg-white/20">{s.name}</Link>)}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-14">
          {groups.map(({ f, items }) => {
            const open = expanded[f.slug] || filtered;
            const shown = open ? items : items.slice(0, LIMIT);
            return (
              <section key={f.slug} aria-labelledby={`g-${f.slug}`}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h2 id={`g-${f.slug}`} className="flex items-center gap-3 text-h3 text-white">{f.name}<span className="text-body text-primary">{items.length}</span></h2>
                  <Link href={localHref(locale, `/services/c/${f.slug}`)} className="text-small font-medium text-navy-200 underline-offset-4 hover:underline">{copy.viewArea} →</Link>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">{shown.map((s) => <div key={s.slug} className="flex min-w-0 [&>*]:min-w-0 [&>*]:flex-1">{cards[s.html]}</div>)}</div>
                {!open && items.length > LIMIT && (
                  <div className="mt-6 flex justify-center">
                    <button type="button" onClick={() => setExpanded((e) => ({ ...e, [f.slug]: true }))} className="inline-flex h-11 items-center gap-2 bg-white/10 px-5 text-button text-white hover:bg-white/20">
                      {copy.more.replace("{n}", String(items.length - LIMIT))}<Icon name="chevronDown" size={16} />
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PRICE_BANDS = [20000, 50000, 100000];
const DAY_BANDS = [3, 7, 14];

function Chips({ legend, value, onChange, options }: { legend: string; value: string; onChange: (v: string) => void; options: { v: string; label: string }[] }) {
  return (
    <fieldset>
      <legend className="mb-3 text-eyebrow text-white/65 uppercase">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.v} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)}
            className={cx("h-10 border px-4 text-small", value === o.v ? "border-white bg-white text-navy-900" : "border-white/20 text-white")}>{o.label}</button>
        ))}
      </div>
    </fieldset>
  );
}
