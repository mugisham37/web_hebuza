"use client";
import Image from "next/image";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { stripLocale } from "@/shared/i18n/config";
import { images } from "@/lib/assets";
import { useAuthRole } from "@/components/molecules/auth/auth";
import { RoleHero } from "@/components/molecules/auth/role-hero";
import { RolePicker } from "@/components/molecules/auth/role-picker";
import { Wordmark } from "@/components/organisms/site/site-header";
import { LocaleSwitcher } from "@/components/organisms/layout/locale-switcher";

/** Role-themed sign-in card: gradient panel (left / top strip on phones) + form panel. data-role scopes the accent vars. */
export function AuthShell({ children, year }: { children: ReactNode; year: ReactNode }) {
  const { locale, t } = useI18n();
  const { role, copy } = useAuthRole();
  const path = stripLocale(usePathname());
  const mode = path === "/login" ? "picker" : path === "/signup" ? "steps" : "hero";
  const [before, after = ""] = t("footer.rights", { year: "\u0000" }).split("\u0000"); // year is a cached server node
  return (
    <div data-role={role} className="min-h-dvh bg-navy-950 lg:flex lg:items-center lg:justify-center lg:p-8">
      <div className="flex min-h-dvh w-full flex-col bg-bg lg:grid lg:min-h-[44rem] lg:max-w-6xl lg:grid-cols-2 lg:shadow-2xl">
        <aside className="relative flex min-w-0 flex-col gap-5 overflow-hidden bg-grad-role px-gutter py-4 text-white lg:gap-10 lg:p-10">
          {role === "client" && (
            <Image src={images.studioPortraitOrange} alt="" fill sizes="50vw" className="hidden object-cover opacity-[0.07] mix-blend-luminosity lg:block" />
          )}
          <div className="theme-dark relative flex items-center justify-between bg-transparent">
            <Wordmark href={localHref(locale, "/")} className="text-white" />
            <LocaleSwitcher tone="dark" />
          </div>
          <div className="relative flex min-w-0 flex-col gap-5 lg:flex-1 lg:justify-end lg:gap-10">
            <div className="hidden lg:block"><RoleHero /></div>
            {mode !== "picker" && <div className="lg:hidden"><RoleHero compact /></div>}
            {mode === "picker" && <RolePicker />}
            {mode === "steps" && (
              <section className="hidden lg:block" aria-label={copy.steps.title}>
                <ol className="grid gap-3">
                  {copy.steps.items.map((s, i) => (
                    <li key={s} className="flex items-center gap-4 border border-white/20 bg-white/10 p-4 text-label">
                      <span className="flex size-8 shrink-0 items-center justify-center bg-white text-role-accent tabular">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col px-gutter py-8 lg:px-12">
          <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">{children}</main>
          <p className="mx-auto mt-8 w-full max-w-md text-small text-fg-subtle">{before}{year}{after}</p>
        </div>
      </div>
    </div>
  );
}
