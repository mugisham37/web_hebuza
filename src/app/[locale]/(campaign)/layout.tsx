import { getI18n } from "@/lib/i18n/server";
import { localHref } from "@/shared/i18n/config";
import { CONTACT, getCopy, waLink } from "@/content/marketing";
import { Wordmark } from "@/components/organisms/site/site-header";
import { Icon, WhatsAppGlyph } from "@/components/atoms/icon";
import { PreviewBanner } from "@/components/molecules/site/preview-banner";
import { ConsentGatedTags } from "@/components/organisms/site/tracking";
import { CookieConsent, CookieSettingsButton } from "@/components/organisms/site/cookie-consent";
import Link from "next/link";

/** Campaign landings: logo + phone + WhatsApp only, so the page has one job (MARKETING-SITE §19). */
export default async function CampaignLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await getI18n(params);
  const m = getCopy(locale);
  return (
    <>
      <PreviewBanner locale={locale} />
      <header className="sticky top-0 z-40 border-b border-border bg-white/92 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-3 px-gutter">
          <Wordmark href={localHref(locale, "/")} />
          <div className="flex items-center gap-2">
            <a
              href={CONTACT.phoneHref}
              className="hidden h-10 items-center gap-2 border border-border-strong px-4 text-button text-ink-900 hover:bg-ink-50 sm:inline-flex"
            >
              <Icon name="phone" size={16} />
              {CONTACT.phone}
            </a>
            <a
              href={waLink("Muraho HEBUZA")}
              target="_blank"
              rel="noopener"
              className="inline-flex h-10 items-center gap-2 bg-success px-4 text-button text-white"
            >
              <WhatsAppGlyph size={18} />
              WhatsApp
            </a>
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="theme-dark bg-grad-night-fade px-gutter py-8 text-small text-fg-muted">
        <div className="container-page flex flex-wrap items-center justify-between gap-3">
          <p>© HEBUZA · {m.footer.about}</p>
          <p className="flex flex-wrap gap-2">
            <Link
              href={localHref(locale, "/legal/privacy")}
              className="hover:text-white"
            >
              Privacy
            </Link>{" "}
            ·
            <Link
              href={localHref(locale, "/legal/cookies")}
              className="hover:text-white"
            >
              Cookies
            </Link>{" "}
            ·<CookieSettingsButton>{m.consent.settings}</CookieSettingsButton>
          </p>
        </div>
      </footer>
      <CookieConsent copy={m.consent} />
      <ConsentGatedTags />
    </>
  );
}
