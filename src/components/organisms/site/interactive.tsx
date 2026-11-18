"use client";
import { readAttribution } from "@/lib/marketing/use-attribution";
import { api, unwrap } from "@/lib/api/client";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
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
            className="h-12 min-w-0 flex-1 border border-white/25 bg-white/5 px-5 font-mono text-body tracking-wider text-white uppercase placeholder:text-navy-200 hover:border-white/45 focus:border-gold-400 focus:outline-none aria-invalid:border-danger" />
          <Button type="submit" variant="primary" dots>{copy.cta}</Button>
        </div>
        {err && <p id="track-err" role="alert" className="pl-5 text-small text-danger">{copy.invalid}</p>}
      </div>
    </form>
  );
}

type Suggest = { slug: string; name: string; family: string };

/** Hero/catalogue search with instant suggestions over the catalogue (F-CAT-02 lite; server search later). */
export function ServiceSearch({ items, placeholder, size = "lg" }: { items: Suggest[]; placeholder: string; size?: "lg" | "md" }) {
  const { locale } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (n.length < 2) return [];
    return items.filter((i) => i.name.toLowerCase().includes(n) || i.family.toLowerCase().includes(n)).slice(0, 6);
  }, [q, items]);
  const go = (path: string) => { setOpen(false); router.push(localHref(locale, path)); };
  return (
    <form role="search" className="relative w-full" onSubmit={(e) => { e.preventDefault(); if (results[active]) go(`/services/${results[active].slug}`); else go(`/services?q=${encodeURIComponent(q)}`); }}>
      <Icon name="search" size={20} className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-fg-subtle" />
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); } if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); } if (e.key === "Escape") setOpen(false); }}
        role="combobox" aria-expanded={open && results.length > 0} aria-controls="svc-suggest" aria-autocomplete="list" aria-label={placeholder}
        placeholder={placeholder} className={cx("w-full border border-border-strong bg-white pr-5 pl-13 text-body shadow-sm placeholder:text-fg-subtle focus:border-navy-700 focus:outline-none", size === "lg" ? "h-14" : "h-12")} />
      {open && results.length > 0 && (
        <ul id="svc-suggest" role="listbox" className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden border border-border bg-white p-1.5 shadow-lg">
          {results.map((r, i) => (
            <li key={r.slug} role="option" aria-selected={i === active}>
              <Link href={localHref(locale, `/services/${r.slug}`)} className={cx("flex items-center justify-between gap-3 px-4 py-3", i === active ? "bg-navy-50 text-navy-700" : "hover:bg-ink-50")}>
                <span className="text-body">{r.name}</span><span className="shrink-0 text-eyebrow text-fg-subtle">{r.family}</span>
              </Link>
            </li>
          ))}
        </ul>
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
