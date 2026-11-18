"use client";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { ButtonLink } from "@/components/atoms/button";

// unauthorized() from the server DAL (401): no session for a server-rendered page.
const T = { en: ["Please sign in", "Sign in"], fr: ["Veuillez vous connecter", "Se connecter"], rw: ["Banza winjire", "Injira"] } as const;

export default function Unauthorized() {
  const { locale } = useI18n();
  const [h, cta] = T[locale];
  return (
    <main id="main" className="grid min-h-[60dvh] place-items-center gap-4 px-gutter text-center">
      <div className="grid justify-items-center gap-4"><h1 className="text-h2">{h}</h1><ButtonLink href={localHref(locale, "/login")}>{cta}</ButtonLink></div>
    </main>
  );
}
