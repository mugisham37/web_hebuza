"use client";
import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { api, unwrap } from "@/lib/api/client";
import type { Locale } from "@/shared/i18n/config";

const T = {
  rw: { title: "Guhagarika ubutumwa bwamamaza", body: "Ntuzongera kubona ubutumwa bwamamaza bwa HEBUZA.", go: "Hagarika", done: "Byakozwe. Ntuzongera kububona.", bad: "Iyi link ntikora cyangwa yararangiye." },
  en: { title: "Unsubscribe from marketing messages", body: "You will no longer receive HEBUZA marketing messages.", go: "Unsubscribe", done: "Done. You won't receive them again.", bad: "This link is invalid or has expired." },
  fr: { title: "Se désabonner des messages marketing", body: "Vous ne recevrez plus les messages marketing de HEBUZA.", go: "Se désabonner", done: "C'est fait. Vous ne les recevrez plus.", bad: "Ce lien est invalide ou a expiré." },
} satisfies Record<Locale, Record<string, string>>;

/** Confirm-then-post (a GET never unsubscribes: link scanners prefetch emails). */
export function UnsubscribeView({ locale, token }: { locale: Locale; token: string }) {
  const t = T[locale];
  const [state, setState] = useState<"idle" | "busy" | "done" | "bad">(token ? "idle" : "bad");
  const go = async () => {
    setState("busy");
    await unwrap(api.POST("/api/marketing/unsubscribe", { body: { token } })).then(() => setState("done"), () => setState("bad"));
  };
  return (
    <section className="grid min-h-[60dvh] place-items-center px-gutter py-16 text-center">
      <div className="grid max-w-xl justify-items-center gap-5">
        <h1 className="text-h2 text-balance text-fg-heading">{t.title}</h1>
        <p role="status" className="text-fg-muted">{state === "done" ? t.done : state === "bad" ? t.bad : t.body}</p>
        {(state === "idle" || state === "busy") && <Button size="lg" loading={state === "busy"} onClick={go}>{t.go}</Button>}
      </div>
    </section>
  );
}
