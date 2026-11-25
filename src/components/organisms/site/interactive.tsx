"use client";
import { readAttribution } from "@/lib/marketing/use-attribution";
import { api, unwrap } from "@/lib/api/client";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { buildIndex, searchServices, type SearchItem } from "@/lib/site/service-search";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { localHref } from "@/shared/i18n/config";
import { cx, formatMoney } from "@/shared/format";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";

const CODE = /^HBZ-?[A-Z0-9]{6}$/;
export const normalizeCode = (v: string) => {
  const s = v.trim().toUpperCase().replace(/\s+/g, "");
  return s.startsWith("HBZ") && !s.includes("-") ? `HBZ-${s.slice(3)}` : s;
};

/** Track by HBZ code (F-REQ-05). Validates the pattern, then routes to /track/[code]. */
export function TrackForm({ copy }: { copy: { title: string; body: string; label: string; cta: string; invalid: string } }) {
  const { locale } = useI18n();
  const router = useRouter();
  const [v, setV] = useState("");
  const [err, setErr] = useState(false);
  function submit(e: FormEvent) {
    e.preventDefault();
    const code = normalizeCode(v);
    if (!CODE.test(code)) return setErr(true);
    router.push(localHref(locale, `/track/${code}`));
  }
  return (
    <form onSubmit={submit} noValidate className="theme-dark flex flex-col gap-4 bg-navy-700 px-5 py-5 text-white shadow-md md:flex-row md:items-center md:justify-between md:px-7">
      <div>
        <p className="text-label text-white">{copy.title}</p>
        <p className="text-small text-navy-200">{copy.body}</p>
      </div>
      <div className="flex flex-col gap-1.5 md:w-[26rem]">
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="track-code">{copy.label}</label>
          <input id="track-code" value={v} onChange={(e) => { setV(e.target.value); setErr(false); }} placeholder="HBZ-WMVX19" autoCapitalize="characters" spellCheck={false}
            aria-invalid={err} aria-describedby={err ? "track-err" : undefined}
            className="h-12 min-w-0 flex-1 border border-white/40 bg-(--color-ramp-1) px-5 font-mono text-body font-bold tracking-wider text-ink-950 uppercase placeholder:font-bold placeholder:text-ink-950 hover:border-white/70 focus:border-gold-400 focus:outline-none aria-invalid:border-danger" />
          <Button type="submit" variant="primary" dots>{copy.cta}</Button>
        </div>
        {err && <p id="track-err" role="alert" className="pl-5 text-small text-danger">{copy.invalid}</p>}
      </div>
    </form>
  );
}

export type Suggest = SearchItem;
export type SearchCopy = { popular: string; results: string; result: string; seeAll: string; none: string; noneHint: string; browse: string; hint: string };

/** Splits a name by highlight ranges into plain / <mark> parts. */
const Highlight = ({ text, ranges }: { text: string; ranges: [number, number][] }) => {
  const out: React.ReactNode[] = [];
  let at = 0;
  ranges.forEach(([a, b], i) => { if (a > at) out.push(text.slice(at, a)); out.push(<mark key={i} className="bg-gold-200 text-navy-900">{text.slice(a, b)}</mark>); at = b; });
  out.push(text.slice(at));
  return <>{out}</>;
};

/**
 * Header service search (services only): instant, typo/accent tolerant, ranked left-to-right on the service name
 * (lib/site/service-search). Empty focus shows popular services; results show category, sub-area and price; the
 * last row opens the full catalogue filtered by the query. "/" focuses it from anywhere. ARIA combobox + listbox.
 */
export function ServiceSearch({ items, placeholder, copy }: { items: Suggest[]; placeholder: string; copy: SearchCopy }) {
  const { locale } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const index = useMemo(() => buildIndex(items), [items]);
  const popular = useMemo(() => [...items].sort((a, b) => (b.popular ?? 0) - (a.popular ?? 0)).slice(0, 6).map((item) => ({ item, ranges: [] as [number, number][] })), [items]);
  const term = q.trim();
  const hits = useMemo(() => (term ? searchServices(index, term, 8) : popular), [index, term, popular]);
  const all = `/services?q=${encodeURIComponent(term)}`;
  // rows: the hits, then (with a query) the "see all" row
  const rows = term ? hits.length + 1 : hits.length;
  const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) { e.preventDefault(); input.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const go = (path: string) => { setOpen(false); input.current?.blur(); router.push(localHref(locale, path)); };
  const pick = (i: number) => (i < hits.length ? go(`/services/${hits[i].item.path}`) : go(all));
  const optId = (i: number) => `${id}-opt-${i}`;
  return (
    <form role="search" className="relative w-full" onSubmit={(e) => { e.preventDefault(); if (term || hits.length) pick(Math.min(active, rows - 1)); }}>
      <Icon name="search" size={17} aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-white" />
      <input ref={input} value={q} type="search" enterKeyHint="search" autoComplete="off" spellCheck={false}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % Math.max(rows, 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + Math.max(rows, 1)) % Math.max(rows, 1)); }
          else if (e.key === "Escape") { if (q) setQ(""); else { setOpen(false); input.current?.blur(); } }
        }}
        role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" aria-label={placeholder}
        aria-activedescendant={open && rows ? optId(active) : undefined} placeholder={placeholder}
        className="h-10 w-full border-2 border-gold-400 bg-(--color-ramp-8) pr-10 pl-10 text-small font-medium text-white shadow-[0_6px_18px_-8px_color-mix(in_oklab,var(--color-ramp-8)_70%,transparent)] transition-[border-color,box-shadow] placeholder:text-white hover:border-gold-300 focus:border-white focus:shadow-[0_0_0_3px_var(--color-gold-400)] focus:outline-none lg:h-11 [&::-webkit-search-cancel-button]:hidden" />
      {q ? (
        <button type="button" aria-label="Clear" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(""); setActive(0); input.current?.focus(); }}
          className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center text-white hover:bg-white/15"><Icon name="x" size={16} /></button>
      ) : (
        <kbd aria-hidden className="absolute top-1/2 right-2.5 hidden -translate-y-1/2 border border-white/40 px-1.5 text-eyebrow text-white lg:block">/</kbd>
      )}
      {open && (
        // Lives inside the fixed header (z-50), so it floats above the hero and everything else on the page.
        <div className="absolute inset-x-0 top-full z-60 mt-2 overflow-hidden border border-border bg-white text-fg shadow-[0_24px_48px_-12px_color-mix(in_oklab,var(--color-navy-900)_35%,transparent)] max-lg:fixed max-lg:inset-x-3 max-lg:top-[calc(7rem+env(safe-area-inset-top))]">
          <p className="flex items-center justify-between border-b border-border bg-bg-subtle px-4 py-2 text-eyebrow text-fg-subtle">
            <span>{!term ? copy.popular : hits.length === 1 ? copy.result : hits.length ? fill(copy.results, { n: hits.length }) : ""}</span>
            <span className="hidden lg:inline">{copy.hint}</span>
          </p>
          {term && !hits.length ? (
            <div className="grid gap-1 px-4 py-5">
              <p className="text-label text-fg-heading">{fill(copy.none, { q: term })}</p>
              <p className="text-small text-fg-muted">{copy.noneHint}</p>
            </div>
          ) : null}
          <ul id={`${id}-list`} role="listbox" aria-label={placeholder} className="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain p-1.5">
            {hits.map((h, i) => (
              <li key={h.item.slug} id={optId(i)} role="option" aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => pick(i)}
                className={cx("flex cursor-pointer items-center gap-3 px-3 py-2.5", i === active ? "bg-navy-50" : "hover:bg-ink-50")}>
                <Icon name="file" size={16} aria-hidden className="shrink-0 text-navy-600" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body text-fg-heading"><Highlight text={h.item.name} ranges={h.ranges} /></span>
                  <span className="block truncate text-eyebrow text-fg-subtle">{[h.item.family, h.item.area].filter(Boolean).join(" · ")}</span>
                </span>
                <Icon name="arrowRight" size={14} aria-hidden className={cx("shrink-0 transition-opacity", i === active ? "text-navy-700 opacity-100" : "opacity-0")} />
              </li>
            ))}
            {term && (
              <li id={optId(hits.length)} role="option" aria-selected={active === hits.length}
                onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setActive(hits.length)} onClick={() => pick(hits.length)}
                className={cx("mt-1 flex cursor-pointer items-center justify-between gap-3 border-t border-border px-3 py-3 text-label text-navy-700", active === hits.length ? "bg-navy-50" : "hover:bg-ink-50")}>
                {hits.length ? fill(copy.seeAll, { q: term }) : copy.browse}<Icon name="arrowRight" size={16} aria-hidden />
              </li>
            )}
          </ul>
        </div>
      )}
    </form>
  );
}

type FeeTier = { key: string; label: string; fee: number; governmentFee: number; days: number };

/** Standard/Urgent toggle + fee breakdown (F-CAT-05/06). Totals are display; the server re-prices on apply. */
export function FeeBreakdown({ tiers, slug, copy, compact }: {
  tiers: FeeTier[]; slug: string; compact?: boolean;
  copy: { standard: string; urgent: string; serviceFee: string; govFee: string; vat: string; included: string; total: string; ready: string; apply: string; trust: string };
}) {
  const { locale } = useI18n();
  const [i, setI] = useState(0);
  const t = tiers[i] ?? tiers[0];
  if (!t) return null;
  const row = (k: string, v: string, strong?: boolean) => (
    <div className={cx("flex items-baseline gap-2", strong ? "text-label-lg" : "text-body")}>
      <span className={strong ? "" : "text-fg-muted"}>{k}</span><span aria-hidden className="mb-1 flex-1 border-b border-dotted border-border-strong" /><span className="tabular">{v}</span>
    </div>
  );
  return (
    <div className="grid gap-4">
      {tiers.length > 1 && (
        <div role="radiogroup" aria-label={`${copy.standard} / ${copy.urgent}`} className="grid grid-cols-2 bg-ink-100 p-1">
          {tiers.map((x, idx) => (
            <button key={x.key} type="button" role="radio" aria-checked={idx === i} onClick={() => setI(idx)}
              className={cx("h-10 text-button transition-colors", idx === i ? "bg-secondary text-on-secondary" : "text-fg-muted hover:text-fg-heading")}>
              {x.key === "urgent" ? copy.urgent : copy.standard}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-2.5">
        {row(copy.serviceFee, formatMoney(t.fee, "RWF", locale))}
        {row(copy.govFee, t.governmentFee ? formatMoney(t.governmentFee, "RWF", locale) : "—")}
        {row(copy.vat, copy.included)}
        <div className="my-1 border-t border-border" />
        {row(copy.total, formatMoney(t.fee + t.governmentFee, "RWF", locale), true)}
      </div>
      <p className="flex items-center gap-2 text-small text-fg-muted"><Icon name="clock" size={16} />{copy.ready.replace("{days}", String(t.days))}</p>
      {!compact && (
        <>
          <Link href={localHref(locale, `/apply/${slug}?tier=${t.key}`)} className="group/btn inline-flex h-14 items-center justify-center gap-3 bg-primary text-label font-semibold text-on-gold transition-colors hover:bg-primary-hover active:bg-primary-active">
            {copy.apply}<span className="inline-flex gap-[3px]"><span className="btn-dot size-[6px] rounded-full bg-navy-900" /><span className="btn-dot size-[6px] rounded-full bg-navy-900/45" /><span className="btn-dot size-[6px] rounded-full bg-navy-900/20" /></span>
          </Link>
          <p className="flex items-center gap-2 text-small text-fg-subtle"><Icon name="lock" size={14} />{copy.trust}</p>
        </>
      )}
    </div>
  );
}

/** Footer newsletter (F-CRM-02): captured as an opted-in CRM lead (POST /api/leads). */
export function NewsletterForm({ label, placeholder, done, error }: { label: string; placeholder: string; done: string; error: string }) {
  const [v, setV] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  if (state === "sent") return <p role="status" className="text-body text-success">{done}</p>;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const contact = v.trim();
    // Email, or a phone number of 9+ digits.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) && (contact.replace(/\D/g, "").length < 9 || /[^\d\s+()-]/.test(contact))) return setState("error");
    setState("busy");
    try {
      const email = contact.includes("@");
      await unwrap(api.POST("/api/leads", { body: { ...(email ? { email: contact } : { phone: contact }), source: "landing_form", landing: location.pathname, attribution: readAttribution(), consent: { [email ? "email" : "sms"]: "in" } } }));
      setState("sent");
    } catch { setState("error"); }
  };
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
      <label htmlFor="nl" className="text-body text-fg">{label}</label>
      <div className="grid w-full max-w-md gap-2">
        <div className="flex items-center bg-white p-1.5 pl-5">
          <input id="nl" value={v} onChange={(e) => { setV(e.target.value); if (state === "error") setState("idle"); }} placeholder={placeholder}
            aria-invalid={state === "error" || undefined} aria-describedby={state === "error" ? "nl-err" : undefined}
            className="h-10 min-w-0 flex-1 bg-transparent text-body text-ink-900 placeholder:text-ink-500 focus:outline-none" />
          <button type="submit" aria-label="Subscribe" disabled={state === "busy"} className="flex size-10 items-center justify-center bg-navy-700 text-white transition-transform hover:bg-navy-600 hover:-rotate-45 disabled:opacity-60"><Icon name="arrowRight" size={18} /></button>
        </div>
        {state === "error" && <p id="nl-err" role="alert" className="pl-5 text-small text-danger">{error}</p>}
      </div>
    </form>
  );
}

/** G4 floating helper: back-to-top after two screens (WhatsApp lives in the site header). */
export function BackToTop({ top }: { top: string }) {
  const [far, setFar] = useState(false);
  useEffect(() => {
    const on = () => setFar(window.scrollY > window.innerHeight * 2);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <div className="floating-helper fixed right-4 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.75rem)] z-40 flex flex-col items-end gap-3 md:right-6 md:bottom-[8rem]">
      {far && (
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })} aria-label={top}
          className="flex size-12 animate-pop-in items-center justify-center border border-border bg-white text-navy-700 shadow-md transition-transform hover:-translate-y-0.5">
          <Icon name="arrowRight" size={20} className="-rotate-90" />
        </button>
      )}
    </div>
  );
}
