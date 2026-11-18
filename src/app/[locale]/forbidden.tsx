"use client";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { ButtonLink } from "@/components/atoms/button";

// forbidden() from the server DAL (403): signed in, but this role may not see the page.
const T = { en: ["You don't have access to this page", "Home"], fr: ["Vous n'avez pas accès à cette page", "Accueil"], rw: ["Nta burenganzira ufite kuri iyi paji", "Ahabanza"] } as const;

export default function Forbidden() {
  const { locale } = useI18n();
  const [h, cta] = T[locale];
  return (
    <main id="main" className="grid min-h-[60dvh] place-items-center gap-4 px-gutter text-center">
      <div className="grid justify-items-center gap-4"><h1 className="text-h2">{h}</h1><ButtonLink href={localHref(locale, "/")} variant="outline">{cta}</ButtonLink></div>
    </main>
  );
}
