"use client";
import Image from "next/image";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Star } from "@/components/atoms/brand";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { images } from "@/lib/assets";
import { Wordmark } from "@/components/organisms/site/site-header";
import { LocaleSwitcher } from "@/components/organisms/layout/locale-switcher";

/** Split auth layout: form column + brand image (hidden on phones to save data). */
export function AuthShell({ children, year }: { children: ReactNode; year: ReactNode }) {
  const { locale, t } = useI18n();
  const [before, after = ""] = t("footer.rights", { year: "\u0000" }).split("\u0000"); // year is a cached server node
  const team = /\/team(\/|$)/.test(usePathname()); // staff flows get the navy "HEBUZA Team" panel (board 03 AU1/AU2)
  return (
    <div className="grid min-h-dvh bg-bg lg:grid-cols-2">
      <div className="flex flex-col px-gutter py-6">
        <div className="flex items-center justify-between">
          <Wordmark href={localHref(locale, "/")} />
          <LocaleSwitcher />
        </div>
        <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</main>
        <p className="text-small text-fg-subtle">{before}{year}{after}</p>
      </div>
      {team ? (
        <div className="relative hidden flex-col justify-between overflow-hidden theme-dark bg-grad-navy-depth p-12 text-white lg:flex">
          <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(var(--color-white)_1px,transparent_1px),linear-gradient(90deg,var(--color-white)_1px,transparent_1px)] [background-size:44px_44px]" />
          <Star className="relative size-14 text-gold-400" />
          <div className="relative grid gap-4">
            <p className="text-[clamp(2.5rem,4vw,3.75rem)] leading-none font-medium tracking-[-0.04em]">HEBUZA <span className="bg-gold-400 px-3 text-on-gold">Team</span></p>
            <p className="max-w-sm text-lead text-navy-100">{locale === "fr" ? "Ensemble pour un Rwanda plus fort." : locale === "rw" ? "Hamwe twubaka u Rwanda rukomeye." : "Together for a stronger Rwanda."}</p>
          </div>
        </div>
      ) : (
      <div className="relative hidden overflow-hidden lg:block">
        <Image src={images.studioPortraitOrange} alt="" fill sizes="50vw" className="object-cover" priority={false} />
        <div className="absolute inset-x-8 bottom-8 theme-dark border-t-3 border-gold-400 bg-navy-900/85 p-6 text-white backdrop-blur">
          <p className="text-h3">{t("meta.description")}</p>
        </div>
      </div>
      )}
    </div>
  );
}
