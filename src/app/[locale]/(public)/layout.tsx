import { ViewTransition } from "react";
import { getI18n } from "@/lib/i18n/server";
import { getFamilies, getServices } from "@/lib/catalogue";
import { getSite } from "@/lib/marketing/cms/read";
import { getCopy } from "@/content/marketing";
import { SiteHeader } from "@/components/organisms/site/site-header";
import { SiteFooter } from "@/components/organisms/site/sections";
import { ZigzagBand } from "@/components/atoms/brand";
import { BackToTop } from "@/components/organisms/site/interactive";
import { LazyAssistantLauncher } from "@/components/organisms/booking/launcher-lazy";
import { PreviewBanner } from "@/components/molecules/site/preview-banner";
import { ConsentGatedTags } from "@/components/organisms/site/tracking";
import { CookieConsent } from "@/components/organisms/site/cookie-consent";

export default async function PublicLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale, t } = await getI18n(params);
  const [families, services, site] = await Promise.all([getFamilies(locale), getServices(locale), getSite()]);
  const m = getCopy(locale);
  const famName = new Map(families.map((f) => [f.slug, f.name]));
  const search = services.filter((s) => !s.paused).map((s) => ({
    slug: s.slug, path: s.slugs[locale], name: s.name, family: famName.get(s.family) ?? "", area: s.subArea?.name ?? null, summary: s.summary, popular: s.popular,
  }));
  const total = families.reduce((n, f) => n + f.count, 0);
  return (
    <>
      <PreviewBanner locale={locale} />
      <a href="#main" className="sr-only-focusable bg-secondary px-4 py-2 text-on-secondary">{t("common.skipToContent")}</a>
      <SiteHeader
        total={total}
        search={search}
        links={site.nav.header.map((n) => ({ href: n.href, label: n.label[locale] ?? n.label.en ?? n.id }))}
        mobileLinks={site.nav.mobile.map((n) => ({ href: n.href, label: n.label[locale] ?? n.label.en ?? n.id }))}
        families={families.map((f) => ({ slug: f.slug, name: f.name, short: f.short, icon: f.icon, count: f.count, subAreas: f.subAreas }))}
        copy={{ search: m.hero.search, searchUi: m.hero.searchUi, utility: m.utility, how: m.common.howItWorks, unsure: m.catalogue.unsure, unsureBody: m.catalogue.unsureBody, consult: m.hero.secondary, whatsapp: m.cta.whatsapp, all: m.services.all, count: `{n} ${m.services.countLabel}`, viewAll: m.catalogue.viewArea }}
      />
      <main id="main" className="min-h-dvh"><ViewTransition>{children}</ViewTransition></main>
      <ZigzagBand from="var(--color-white)" to="var(--color-hero)" />
      <SiteFooter locale={locale} families={families} site={site} />
      <BackToTop top={m.utility.top} />
      <LazyAssistantLauncher />
      <CookieConsent copy={m.consent} />
      <ConsentGatedTags />
    </>
  );
}
