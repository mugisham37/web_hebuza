import Link from "next/link";
import { cacheLife } from "next/cache";
import type { Locale } from "@/shared/i18n/config";
import { localHref } from "@/shared/i18n/config";
import { cx } from "@/shared/format";
import { CONTACT, getCopy, waLink } from "@/content/marketing";
import { FACES } from "@/content/families";
import { A11Y } from "@/content/pages/accessibility";
import type { FamilyVM } from "@/lib/catalogue";
import type { PublicSite } from "@/lib/marketing/cms/read";
import { ButtonLink } from "@/components/atoms/button";
import { Icon, WhatsAppGlyph } from "@/components/atoms/icon";
import { Faces } from "@/components/atoms/brand";
import { Reveal, RiseOnScroll } from "@/components/atoms/motion";
import { NewsletterForm } from "@/components/organisms/site/interactive";
import { CookieSettingsButton } from "@/components/organisms/site/cookie-consent";


export function CTACard({ locale, title, body, className, pad = "pb-10 md:pb-12" }: { locale: Locale; title?: string; body?: string; className?: string; /** vertical padding classes */ pad?: string }) {
  const c = getCopy(locale).cta;
  return (
    <section className={cx("px-gutter", pad, className)}>
      {/* Two columns: headline on the left; pitch and actions centred on the right (compact, no frame). */}
      <Reveal preset="card-in" className="container-page relative grid gap-8 overflow-hidden bg-tint p-7 text-navy-700 md:grid-cols-[1fr_1.1fr] md:gap-12 md:p-8 lg:px-16 lg:py-8">
        <h2 className="max-w-[15ch] self-center text-cta text-fg-heading">{title ?? c.title}</h2>
        <div className="grid content-center gap-5 self-center md:border-l md:border-navy-200 md:py-2 md:pl-10">
          <p className="max-w-md text-lead text-fg-muted">{body ?? c.body}</p>
          <div className="grid w-full max-w-md grid-cols-1 gap-2.5 sm:w-fit sm:grid-cols-2">
            <ButtonLink href={localHref(locale, "/services")} variant="primary" dots className="justify-center">{c.start}</ButtonLink>
            <a href={waLink("Muraho HEBUZA")} target="_blank" rel="noopener" className="group/btn inline-flex h-11 items-center justify-center gap-2.5 border-[1.5px] border-secondary bg-white px-5 text-button text-navy-700 hover:bg-navy-50"><WhatsAppGlyph size={18} />{c.whatsapp}</a>
            <a href={CONTACT.phoneHref} className="inline-flex h-11 items-center justify-center gap-2.5 sm:col-span-2 border-[1.5px] border-secondary bg-white px-5 text-button text-navy-700 hover:bg-navy-50"><Icon name="phone" size={16} />{c.call} {CONTACT.phone}</a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/** Landing1 footer: marquee notch → wordmark/star + statement + email + faces → columns → newsletter → giant wordmark with floating pills. */
export function SiteFooter({ locale, families, site }: { locale: Locale; families: Pick<FamilyVM, "slug" | "name">[]; site?: PublicSite }) {
  const f = getCopy(locale).footer;
  const m = getCopy(locale);
  const L = (p: string) => localHref(locale, p);
  const helpHrefs = ["/track", "/faq", "/contact", "/book"];
  // F-CMS-07: CMS footer nav and contact settings win when set; the built-in links are the defaults.
  const cmsLinks = (site?.nav.footer ?? []).map((n) => [n.label[locale] ?? n.label.en ?? n.id, n.href.startsWith("/") ? L(n.href) : n.href] as [string, string]);
  const email = site?.settings?.email || CONTACT.email;
  const phone = site?.settings?.phone || CONTACT.phone;
  const social = site?.settings?.social?.length ? site.settings.social : null;
  return (
    <footer className="theme-dark ramp-dark overflow-hidden bg-hero text-fg">{/* same deep navy as the home hero */}
      <div className="container-page px-gutter">
        <div className="grid gap-10 pt-16 pb-12 sm:grid-cols-2 md:pt-20 lg:grid-cols-4">
          <div>
            <p className="text-label">{f.company}</p>
            <p className="mt-3 max-w-xs text-small text-fg-muted">{f.about}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a href={`mailto:${email}`} className="text-label-lg text-fg-heading underline decoration-primary/60 underline-offset-[6px] transition-colors hover:decoration-primary">{email}</a>
              <Faces srcs={FACES.slice(0, 3)} size={36} />
            </div>
          </div>
          <FooterCol title={f.services} links={[...families.map((x) => [x.name, L(`/services/c/${x.slug}`)] as [string, string]), [`${m.services.all} →`, L("/services")]]} />
          <FooterCol title={f.help} links={cmsLinks.length ? cmsLinks : f.helpLinks.map((t, i) => [t, L(helpHrefs[i])] as [string, string])} />
          <div>
            <p className="text-label">{f.connect}</p>
            <ul className="mt-3 grid gap-2 text-small text-fg-muted">
              <li><a href={waLink("Muraho HEBUZA")} target="_blank" rel="noopener" className="hover:text-primary">WhatsApp {phone}</a></li>
              <li><a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-primary">{phone}</a></li>
              <li className="flex flex-wrap gap-3 pt-1">{social ? social.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noopener" className="border border-border-strong px-2.5 py-1 text-eyebrow hover:text-primary">{s.network}</a>)
                : ["Facebook", "LinkedIn", "Instagram", "X"].map((s) => <span key={s} className="border border-border-strong px-2.5 py-1 text-eyebrow">{s}</span>)}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border py-8"><NewsletterForm label={f.newsletter} placeholder={f.newsletterPlaceholder} done={f.subscribed} error={f.newsletterError} /></div>
      </div>
      {/* Wordmark + legal line share one block: a dark wash rises from the bottom (letters fade to a hint under it) and the
          copyright links sit on top of it, instead of a separate bar below. */}
      <div className="relative">
      <RiseOnScroll className="relative mx-auto mt-4 max-w-[96rem] overflow-hidden px-gutter">
        <p aria-hidden className="-mb-[0.16em] text-center font-display text-[clamp(5rem,22vw,22rem)] leading-[0.9] tracking-[-0.06em] text-white uppercase select-none">Hebuza</p>
        {f.pills.map((p, i) => (
          <span key={p} aria-hidden className={cx("absolute inline-flex h-10 animate-float items-center gap-2 px-5 text-label shadow-lg md:h-12",
            i === 0 ? "top-[38%] left-[16%] bg-primary text-on-gold" : i === 1 ? "top-[46%] left-[44%] bg-white text-ink-900 [animation-delay:-1.5s]" : "top-[36%] right-[10%] bg-sky-200 text-navy-900 [animation-delay:-3s]")}
            style={{ rotate: `${i === 1 ? 4 : -4}deg` }}>{p}<span className="opacity-50">•••</span></span>
        ))}
      </RiseOnScroll>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-3/4 bg-linear-to-t from-navy-950/90 via-navy-950/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-20 px-gutter py-5 text-center text-small text-white [&_a]:underline-offset-4 [&_a:hover]:underline [&_button:hover]:underline">
        © <CopyrightYear /> HEBUZA BUSINESS GROUP LTD ·{" "}
        <Link href={L("/legal/terms")} className="hover:text-fg-heading">Terms</Link> · <Link href={L("/legal/privacy")} className="hover:text-fg-heading">Privacy</Link> · <Link href={L("/legal/cookies")} className="hover:text-fg-heading">Cookies</Link> · <Link href={L("/accessibility")} className="hover:text-fg-heading">{A11Y[locale].eyebrow}</Link> · <CookieSettingsButton>{m.consent.settings}</CookieSettingsButton>
      </div>
      </div>
    </footer>
  );
}

/** Year is cached (Cache Components forbid raw new Date() in prerender); refreshes daily. */
export async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-label">{title}</p>
      <ul className="mt-3 grid gap-2">{links.map(([l, h]) => <li key={h + l}><Link href={h} className="text-small text-fg-muted transition-colors hover:text-primary">{l}</Link></li>)}</ul>
    </div>
  );
}

/** Page-level BreadcrumbList JSON-LD only (no visible trail on the public site). */
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  const ld = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.label, ...(it.href ? { item: it.href } : {}) })) };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />;
}

