"use client";
import Image from "next/image";
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
import { Faces } from "@/components/atoms/brand";
import { LocaleSwitcher } from "@/components/organisms/layout/locale-switcher";
import { CONTACT, waLink } from "@/content/marketing";
import { FACES } from "@/content/families";
import { Marquee } from "@/components/molecules/site/marquee";
import { ServiceSearch, type SearchCopy, type Suggest } from "@/components/organisms/site/interactive";

export type NavFamily = { slug: string; name: string; short: string; icon: IconName; count: number; subAreas: { slug: string; name: string }[] };

/** The HEBUZA logo (vector, public/brand). `onDark` = white letters for navy backgrounds; the gold swoosh stays. */
export function Wordmark({ href, className, onDark }: { href: string; className?: string; onDark?: boolean }) {
  return (
    <Link href={href} aria-label="HEBUZA — home" className={cx("inline-flex shrink-0 items-center", className)}>
      <Image src={onDark ? "/brand/hebuza-white.svg" : "/brand/hebuza.svg"} alt="HEBUZA" width={1579} height={654} priority unoptimized className="h-11 w-auto lg:h-13" />
    </Link>
  );
}

/** F-CMS-07: CMS header/mobile nav (already resolved to the locale); empty → the built-in links. */
export type HeaderLink = { href: string; label: string };
export function SiteHeader({ families, total, search, copy, links = [], mobileLinks = [] }: {
  families: NavFamily[]; total: number; links?: HeaderLink[]; mobileLinks?: HeaderLink[]; search: Suggest[];
  copy: { search: string; searchUi: SearchCopy; ticker: string[]; utility: { tagline: string; service: string; copy: string; copied: string }; how: string; unsure: string; unsureBody: string; consult: string; whatsapp: string; all: string; count: string; viewAll: string };
}) {
  const { t, locale } = useI18n();
  const { user, status } = useSession();
  const path = stripLocale(usePathname());
  const [scrolled, setScrolled] = useState(false);
  const [mega, setMega] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [famOpen, setFamOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const L = (p: string) => (p.startsWith("/") ? localHref(locale, p) : p);
  const NAV: [Parameters<typeof t>[0], string][] = [["nav.pricing", "/pricing"], ["nav.knowledge", "/knowledge"], ["nav.about", "/about"], ["nav.contact", "/contact"]];
  const builtIn: [string, string][] = [["/how-it-works", copy.how], ...NAV.map(([k, p]) => [p, t(k)] as [string, string])];
  // The "Services ▾" menu already covers /services, so a plain Services link would be a duplicate.
  const desk: [string, string][] = (links.length ? links.map((x) => [x.href, x.label] as [string, string]) : builtIn).filter(([h]) => h !== "/services");
  const mob: [string, string][] = mobileLinks.length ? mobileLinks.map((x) => [x.href, x.label]) : desk;

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

  const active = (p: string) => path === p || path.startsWith(`${p}/`);
  const openMega = () => { clearTimeout(closeTimer.current); setMega(true); };
  const closeMega = () => { closeTimer.current = setTimeout(() => setMega(false), 160); };

  return (
    <header className="fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)]">
      {/* The page ramp mirrored: the first three sections below the hero go white → ramp-1 → ramp-2 → ramp-3, so the
          header runs ramp-3 → ramp-2 → ramp-1 → white into the hero. Each band fades into the next (no edges).
          Ribbon + search bar fold away on scroll; the nav stays pinned. */}
      <div inert={scrolled} aria-hidden={scrolled || undefined}
        className={cx("transition-[height] duration-(--duration-slow) ease-(--ease-out-expo)", scrolled ? "h-0 overflow-hidden" : "relative z-10 h-28 lg:h-30")}>{/* clip only while folded, so the search dropdown can hang over the page */}
        <div className="h-10 border-b border-navy-900/10 [background-image:linear-gradient(in_oklab_to_bottom,var(--color-ramp-3),var(--color-ramp-2))]">
          <Marquee items={copy.ticker} size="xs" seconds={90} fade="mask-fade-x" className="flex h-full items-center text-navy-900 [&_svg]:text-gold-600" />
        </div>
        {/* Brand bar: logo · search · phone · WhatsApp (roomy: 72 / 80px, lines above and below). */}
        <div className="h-18 border-b border-navy-900/10 [background-image:linear-gradient(in_oklab_to_bottom,var(--color-ramp-2),var(--color-ramp-1))] lg:h-20">
          <div className="mx-auto flex h-full w-[min(100%-2rem,82rem)] items-center gap-3 text-navy-900 lg:grid lg:grid-cols-[1fr_minmax(0,42rem)_1fr] lg:gap-8">
            <Wordmark href={L("/")} className="shrink-0 justify-self-start" />
            <div className="min-w-0 flex-1"><ServiceSearch items={search} placeholder={copy.search} copy={copy.searchUi} /></div>
            <div className="flex shrink-0 items-center gap-3 justify-self-end lg:gap-5">
            <a href={CONTACT.phoneHref} aria-label={CONTACT.phone} className="flex shrink-0 items-center gap-2 text-label font-semibold tabular hover:underline hover:underline-offset-4">
              <Icon name="phone" size={18} aria-hidden /><span className="hidden lg:inline">{CONTACT.phone}</span>
            </a>
            <a href={waLink("Muraho HEBUZA")} target="_blank" rel="noopener" aria-label={`${copy.whatsapp} — ${CONTACT.phone}`} title={copy.whatsapp}
              className="flex size-9 shrink-0 items-center justify-center bg-whatsapp text-ink-950 transition-[filter] hover:brightness-95 lg:size-10"><WhatsAppGlyph size={20} /></a>
            </div>
          </div>
        </div>
      </div>
      <div className={cx("transition-shadow duration-(--duration-slow)", scrolled ? "border-b border-border bg-white/95 shadow-md backdrop-blur-md" : "[background-image:linear-gradient(in_oklab_to_bottom,var(--color-ramp-1),var(--color-white))]")}>
        <nav aria-label="Main" className="relative mx-auto flex h-14 w-[min(100%-2rem,82rem)] items-center justify-between gap-4 lg:h-16">
          {scrolled ? <Wordmark href={L("/")} /> : <span className="lg:hidden" />}
          {scrolled ? (
            // Pinned bar: the links switch to the service categories (each opens its catalogue page).
            <ul aria-label={copy.all} className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex">
              {families.map((f) => {
                const href = `/services/c/${f.slug}`;
                return (
                  <li key={f.slug}>
                    <Link href={L(href)} title={f.name} aria-current={active(href) ? "page" : undefined}
                      className={cx("inline-flex h-10 items-center px-2.5 text-[0.8125rem] font-semibold tracking-[0.02em] whitespace-nowrap uppercase transition-colors hover:bg-navy-50", active(href) && "bg-navy-50 text-navy-700 shadow-[inset_0_-2px_0_var(--color-gold-400)]")}>
                      {f.short}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
          <ul className="hidden items-center gap-0.5 lg:-ml-3.5 lg:flex" onMouseLeave={closeMega}>
            <li onMouseEnter={openMega}>
              <button type="button" aria-expanded={mega} aria-controls="mega" onClick={() => setMega((m) => !m)}
                className={cx("inline-flex h-10 items-center gap-1 px-3.5 text-[0.9375rem] font-semibold tracking-[0.04em] uppercase transition-colors hover:bg-navy-50", (active("/services") || mega) && "bg-navy-50 text-navy-700 shadow-[inset_0_-2px_0_var(--color-gold-400)]")}>
                {t("nav.services")}<Icon name="chevronDown" size={16} className={cx("transition-transform", mega && "rotate-180")} />
              </button>
            </li>
            {desk.map(([p, label]) => (
              <li key={p}><Link href={L(p)} className={cx("inline-flex h-10 items-center px-3.5 text-[0.9375rem] font-semibold tracking-[0.04em] uppercase hover:bg-navy-50", active(p) && "bg-navy-50 text-navy-700 shadow-[inset_0_-2px_0_var(--color-gold-400)]")}>{label}</Link></li>
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
          </ul>)}
          <div className="flex items-center gap-2">
            <span className={cx("hidden", scrolled ? "xl:block" : "lg:block")}><LocaleSwitcher /></span>{/* pinned on small laptops: the categories need the room; languages are back at the top */}
            <Link href={L("/track")} className="hidden h-10 items-center border-[1.5px] border-secondary px-4 text-button text-secondary hover:bg-navy-50 md:inline-flex">{t("nav.track").split(" ")[0]}</Link>
            {status === "authenticated" && user
              ? <ButtonLink href={L(homeFor(user.roles))} dots>{t("nav.dashboard")}</ButtonLink>
              : <ButtonLink href={L("/login")} dots className="max-sm:px-4">{t("nav.login")}</ButtonLink>}
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
          {mob.map(([p, label]) => (
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

