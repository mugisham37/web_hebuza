"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { localHref, stripLocale } from "@/shared/i18n/config";
import { useSession } from "@/lib/auth/session";
import { homeFor } from "@/shared/auth/roles";
import { cx } from "@/shared/format";
import { ButtonLink } from "@/components/atoms/button";
import { Icon, WhatsAppGlyph, type IconName } from "@/components/atoms/icon";
import { Faces, Star } from "@/components/atoms/brand";
import { LocaleSwitcher } from "@/components/organisms/layout/locale-switcher";
import { CONTACT, waLink } from "@/content/marketing";
import { FACES } from "@/content/families";
import { Marquee } from "@/components/molecules/site/marquee";

export type NavFamily = { slug: string; name: string; icon: IconName; count: number; subAreas: { slug: string; name: string }[] };

export function Wordmark({ href, className }: { href: string; className?: string }) {
  return (
    <Link href={href} aria-label="HEBUZA — home" className={cx("inline-flex items-start gap-0.5 text-[1.45rem] leading-none font-bold tracking-[-0.04em]", className)}>
      HEBUZA<Star className="size-3 text-gold-600" />
    </Link>
  );
}

export function SiteHeader({ families, total, copy }: {
  families: NavFamily[]; total: number;
  copy: { utility: { tagline: string; service: string; copy: string; copied: string }; ribbon: string[]; how: string; unsure: string; unsureBody: string; consult: string; whatsapp: string; all: string; count: string; viewAll: string };
}) {
  const { t, locale } = useI18n();
  const { user, status } = useSession();
  const path = stripLocale(usePathname());
  const [scrolled, setScrolled] = useState(false);
  const [mega, setMega] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [famOpen, setFamOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const L = (p: string) => localHref(locale, p);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const [lastPath, setLastPath] = useState(path);
  if (path !== lastPath) { setLastPath(path); setMega(false); setSheet(false); }
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (setMega(false), setSheet(false));
    window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc);
  }, []);
  useEffect(() => { document.documentElement.style.overflow = sheet ? "hidden" : ""; }, [sheet]);

  const NAV: [Parameters<typeof t>[0], string][] = [["nav.pricing", "/pricing"], ["nav.knowledge", "/knowledge"], ["nav.about", "/about"], ["nav.contact", "/contact"]];
  const active = (p: string) => path === p || path.startsWith(`${p}/`);
  const openMega = () => { clearTimeout(closeTimer.current); setMega(true); };
  const closeMega = () => { closeTimer.current = setTimeout(() => setMega(false), 160); };

  return (
    <header className="fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)]">
      {/* G4 utility bar: desktop only, folds away once the page scrolls. */}
      <div aria-hidden={scrolled || undefined} inert={scrolled} className={cx("relative hidden overflow-hidden bg-[linear-gradient(in_oklab_to_right,var(--color-navy-700)_0,var(--color-navy-700)_28rem,var(--color-navy-500)_32rem,var(--color-navy-400)_35rem,var(--color-navy-300)_40rem,var(--color-navy-200)_48rem,var(--color-navy-100)_60rem)] text-navy-800 transition-[height] duration-(--duration-slow) ease-(--ease-out-expo) lg:block", scrolled ? "h-0" : "h-14")}>
        {/* One monochrome navy ramp (OKLab), anchored to the left edge: navy-700 behind the phone, lightening to navy-100 by 60rem.
            Words stay dark navy everywhere; they only appear where the ramp is light enough (≥ navy-400) to read. */}
        <Marquee items={[...copy.ribbon, ...copy.ribbon]} size="sm" seconds={120} fade="" className="absolute inset-0 flex items-center text-navy-800 [&_svg]:text-gold-600" />
        <div className="relative flex h-14 w-full items-center justify-start text-small">
          {/* Phone number sits on the dark (left) end of the ramp; words travel right→left and dissolve into it; a navy-700 shield (same colour as the ramp's end, so invisible as a shape)
              keeps one empty ribbon slot (~11rem, star to star) clear right of the phone number before words appear. Under the bottom white fade (z-10 < z-20). */}
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[36rem] bg-[linear-gradient(in_oklab_to_right,var(--color-navy-700)_30rem,transparent_35rem)]" />
          <a href={CONTACT.phoneHref} className="relative z-30 mr-auto flex h-full items-center gap-3 pr-6 pl-8 text-label-lg font-bold text-white hover:underline hover:underline-offset-4">
            <Icon name="phone" size={22} />{CONTACT.phone}
          </a>
        </div>
        {/* Bottom fade into the white page below, so the bar melts into the hero. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-20 bg-linear-to-b from-transparent from-50% to-white" />
      </div>
      <div className={cx("transition-[padding] duration-(--duration-slow) ease-(--ease-out-expo)", scrolled ? "pt-2" : "pt-3 lg:pt-4")}>
        <nav aria-label="Main" className={cx("mx-auto flex items-center justify-between gap-4 pr-2 pl-5 transition-all duration-(--duration-slow) ease-(--ease-out-expo)",
          scrolled ? "h-14 w-[min(100%-1.5rem,82rem)] border-b border-border bg-white/92 shadow-md backdrop-blur-md" : "h-16 w-[min(100%-2rem,82rem)] bg-transparent")}>
          <Wordmark href={L("/")} />
          <ul className="hidden items-center gap-0.5 lg:flex" onMouseLeave={closeMega}>
            <li onMouseEnter={openMega}>
              <button type="button" aria-expanded={mega} aria-controls="mega" onClick={() => setMega((m) => !m)}
                className={cx("inline-flex h-10 items-center gap-1 px-3.5 text-button transition-colors hover:bg-navy-50", (active("/services") || mega) && "bg-navy-50 text-navy-700 shadow-[inset_0_-2px_0_var(--color-gold-400)]")}>
                {t("nav.services")}<Icon name="chevronDown" size={16} className={cx("transition-transform", mega && "rotate-180")} />
              </button>
            </li>
            <li><Link href={L("/how-it-works")} className={cx("inline-flex h-10 items-center px-3.5 text-button hover:bg-navy-50", active("/how-it-works") && "bg-navy-50 text-navy-700 shadow-[inset_0_-2px_0_var(--color-gold-400)]")}>{copy.how}</Link></li>
            {NAV.map(([k, p]) => (
              <li key={p}><Link href={L(p)} className={cx("inline-flex h-10 items-center px-3.5 text-button hover:bg-navy-50", active(p) && "bg-navy-50 text-navy-700 shadow-[inset_0_-2px_0_var(--color-gold-400)]")}>{t(k)}</Link></li>
            ))}
            <div id="mega" hidden={!mega} onMouseEnter={openMega}
              className="absolute top-full left-1/2 mt-3 w-[min(100%-2rem,82rem)] -translate-x-1/2 animate-reveal border border-border bg-white p-6 shadow-lg">
              <div className="grid grid-cols-[1fr_1fr_1fr_18rem] gap-6">
                {families.map((f) => (
                  <div key={f.slug} className="grid content-start gap-2">
                    <Link href={L(`/services/c/${f.slug}`)} className="group flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center bg-secondary text-on-secondary"><Icon name={f.icon} size={17} /></span>
                      <span className="text-label group-hover:underline">{f.name}</span>
                    </Link>
                    <ul className="grid gap-1 pl-12">
                      {f.subAreas.slice(0, 4).map((s) => <li key={s.slug}><Link href={L(`/services/c/${f.slug}#sub-${s.slug}`)} className="text-small text-fg-muted hover:text-fg-heading">{s.name}</Link></li>)}
                      <li><Link href={L(`/services/c/${f.slug}`)} className="text-small font-medium">{copy.viewAll} · {f.count} →</Link></li>
                    </ul>
                  </div>
                )).reduce<React.ReactNode[]>((cols, el, i) => { const c = i % 3; (cols[c] ??= []); (cols[c] as React.ReactNode[]).push(el); return cols; }, []).map((col, i) => <div key={i} className="grid content-start gap-6">{col}</div>)}
                <div className="flex flex-col gap-3 border border-sky-100 bg-tint p-5 text-navy-700">
                  <p className="text-card-title text-fg-heading">{copy.unsure}</p>
                  <p className="text-small">{copy.unsureBody}</p>
                  <Faces srcs={FACES.slice(0, 3)} size={40} />
                  <ButtonLink href={L("/book")} size="sm" variant="primary" dots className="mt-auto justify-between">{copy.consult}</ButtonLink>
                  <a href={waLink("Muraho HEBUZA")} target="_blank" rel="noopener" className="inline-flex h-9 items-center justify-between gap-2 border border-secondary bg-white px-4 text-small font-medium text-secondary hover:bg-navy-50">{copy.whatsapp}<WhatsAppGlyph size={16} /></a>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                <p className="text-small text-fg-subtle">{copy.count.replace("{n}", String(total))}</p>
                <ButtonLink href={L("/services")} size="sm" dots>{copy.all}</ButtonLink>
              </div>
            </div>
          </ul>
          <div className="flex items-center gap-2">
            <span className="hidden lg:block"><LocaleSwitcher /></span>
            <a href={waLink("Muraho HEBUZA")} target="_blank" rel="noopener" aria-label={`${copy.whatsapp} — ${CONTACT.phone}`} title={copy.whatsapp}
              className="hidden size-10 items-center justify-center bg-whatsapp text-ink-950 transition-[filter] hover:brightness-95 sm:inline-flex"><WhatsAppGlyph size={20} /></a>
            <Link href={L("/track")} className="hidden h-10 items-center border-[1.5px] border-secondary px-4 text-button text-secondary hover:bg-navy-50 md:inline-flex">{t("nav.track").split(" ")[0]}</Link>
            {status === "authenticated" && user
              ? <ButtonLink href={L(homeFor(user.roles))} dots>{t("nav.dashboard")}</ButtonLink>
              : <ButtonLink href={L("/services")} dots className="max-sm:px-4">{t("nav.start")}</ButtonLink>}
            <button type="button" aria-label={t("common.menu")} aria-expanded={sheet} aria-controls="mobile-sheet" onClick={() => setSheet(true)}
              className="flex size-11 items-center justify-center text-navy-700 hover:bg-navy-50 lg:hidden"><Icon name="menu" size={24} /></button>
          </div>
        </nav>
      </div>

      {/* Mobile sheet (G2) */}
      <div id="mobile-sheet" hidden={!sheet} className="fixed inset-0 z-50 animate-reveal overflow-y-auto bg-bg px-gutter pt-[max(1rem,env(safe-area-inset-top))] pb-10 lg:hidden">
        <div className="flex h-14 items-center justify-between">
          <Wordmark href={L("/")} />
          <button type="button" aria-label={t("common.close")} onClick={() => setSheet(false)} className="flex size-11 items-center justify-center border border-border bg-white text-navy-700 hover:bg-navy-50"><Icon name="x" size={22} /></button>
        </div>
        <ul className="mt-6 divide-y divide-border border-y border-border">
          <li>
            <button type="button" aria-expanded={famOpen} onClick={() => setFamOpen((o) => !o)} className="flex w-full items-center justify-between py-4 text-h3">
              {t("nav.services")}<Icon name={famOpen ? "minus" : "plus"} size={22} />
            </button>
            {famOpen && (
              <ul className="grid gap-1 pb-4">
                {families.map((f) => <li key={f.slug}><Link href={L(`/services/c/${f.slug}`)} className="flex items-center justify-between py-2 text-label">{f.name}<span className="text-small text-fg-subtle">{f.count}</span></Link></li>)}
                <li><Link href={L("/services")} className="py-2 text-label underline">{copy.all} →</Link></li>
              </ul>
            )}
          </li>
          {([["/how-it-works", copy.how], ...NAV.map(([k, p]) => [p, t(k)])] as [string, string][]).map(([p, label]) => (
            <li key={p}><Link href={L(p)} className="block py-4 text-h3">{label}</Link></li>
          ))}
        </ul>
        <div className="mt-6 grid gap-3">
          <ButtonLink href={L("/services")} size="lg" variant="primary" dots className="justify-between">{t("nav.start")}</ButtonLink>
          <Link href={L("/track")} className="inline-flex h-14 items-center justify-center border-[1.5px] border-secondary text-label text-secondary">{t("nav.track")}</Link>
          <Link href={L("/login")} className="py-2 text-center text-label underline">{t("nav.login")}</Link>
        </div>
        <div className="mt-8 grid gap-3 bg-white p-5">
          <a href={CONTACT.phoneHref} className="flex items-center gap-3 text-label"><Icon name="phone" size={18} />{CONTACT.phone}</a>
          <a href={waLink("Muraho HEBUZA")} target="_blank" rel="noopener" className="flex items-center gap-3 text-label text-success"><WhatsAppGlyph size={18} />{copy.whatsapp}</a>
          <p className="flex items-center gap-3 text-label"><Icon name="mail" size={18} />{CONTACT.email}</p>
        </div>
        <div className="mt-6"><LocaleSwitcher /></div>
      </div>
    </header>
  );
}

