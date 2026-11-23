"use client";
// Light, dismissible nudge for clients who signed up with Google and have no phone yet: links to Settings (profile phone).
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { unwrap } from "@/lib/api/client";
import { api } from "@/lib/api/client";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { authCopy } from "@/content/pages/client-auth";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";

const KEY = "hebuza.phoneSuggest.dismissed"; // per-device; shortcut: no server snooze, add one if it nags across devices

export function PhoneSuggest() {
  const { locale, t } = useI18n();
  const { user } = useSession();
  const c = authCopy(locale).google.phone;
  const [gone, setGone] = useState(() => {
    try {
      return typeof window === "undefined" || !!localStorage.getItem(KEY);
    } catch {
      return true;
    }
  });
  const eligible = !gone && !!user && !user.phone && user.roles.includes("client");
  const ids = useQuery({
    queryKey: ["me", "identities"],
    queryFn: () => unwrap<{ identities: { provider: string }[] }>(api.GET("/api/me/identities")),
    enabled: eligible,
  });
  if (!eligible || !ids.data?.identities.some((i) => i.provider === "google")) return null;
  const dismiss = () => {
    setGone(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  };
  return (
    <aside
      aria-labelledby="phone-suggest-title"
      className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 w-[calc(100%-2rem)] max-w-sm border border-border bg-surface p-5 shadow-lg motion-safe:animate-reveal"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("common.close")}
        className="absolute top-2 right-2 inline-flex size-9 items-center justify-center text-fg-muted hover:bg-navy-50 hover:text-fg-heading"
      >
        <Icon name="x" size={16} aria-hidden />
      </button>
      <h2 id="phone-suggest-title" className="pr-8 text-label-lg text-fg-heading">
        {c.title}
      </h2>
      <p className="mt-1 text-small text-fg-muted">{c.body}</p>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={dismiss}>
          {c.later}
        </Button>
        <Link href={localHref(locale, "/settings")} onClick={dismiss} className="inline-flex items-center px-3 text-button text-link underline underline-offset-4">
          {c.add}
        </Link>
      </div>
    </aside>
  );
}
