import { Suspense } from "react";
import { TermsGate } from "@/components/organisms/auth/terms-gate";
import type { Metadata, Viewport } from "next";
import { Archivo, Host_Grotesk, Inter } from "next/font/google";
import { locales } from "@/shared/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";
import { Providers } from "@/components/organisms/layout/providers";
import { WebVitals } from "@/components/organisms/layout/web-vitals";
import { ServiceWorker } from "@/components/organisms/layout/service-worker";
import { images } from "@/lib/assets";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

const hostGrotesk = Host_Grotesk({ variable: "--font-host-grotesk", subsets: ["latin", "latin-ext"], weight: ["400", "500", "700"], style: ["normal", "italic"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"], display: "swap" });
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], weight: "900", style: ["normal", "italic"], display: "swap", preload: false });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale, t } = await getI18n(params);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("meta.title"), template: `%s · ${t("meta.siteName")}` },
    description: t("meta.description"),
    applicationName: t("meta.siteName"),
    alternates: {
      canonical: `/${locale}`,
      languages: { ...Object.fromEntries(locales.map((l) => [l, `/${l}`])), "x-default": "/rw" },
    },
    icons: { icon: [{ url: images.brandMark, type: "image/svg+xml" }, { url: images.brandFavicon, sizes: "48x48", type: "image/png" }], apple: images.brandAppleIcon },
    openGraph: { type: "website", siteName: t("meta.siteName"), locale, images: images.brandOgImage },
    twitter: { card: "summary_large_image", images: images.brandOgImage },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale, dict } = await getI18n(params);
  return (
    <html lang={locale} className={`${hostGrotesk.variable} ${inter.variable} ${archivo.variable}`}>
      <body>
        <I18nProvider locale={locale} dict={dict}>
          {/* Shell chrome reads usePathname(), which suspends on [param] routes without generateStaticParams; this boundary lets those prerender. */}
          <Providers><Suspense>{children}</Suspense><Suspense><TermsGate /></Suspense></Providers>
        </I18nProvider>
        <WebVitals />
        <ServiceWorker />
      </body>
    </html>
  );
}
